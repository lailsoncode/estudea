import { useMemo, useState, type ReactNode } from 'react';
import {
  parseLessonMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
  type TableAlign,
} from '../../utils/lessonMarkdown';

type LessonMarkdownSize = 'md' | 'sm';

interface LessonMarkdownProps {
  source: string | null | undefined;
  size?: LessonMarkdownSize;
  className?: string;
  emptyFallback?: ReactNode;
}

const SIZE_STYLES: Record<LessonMarkdownSize, {
  base: string;
  paragraph: string;
  headings: Record<1 | 2 | 3 | 4 | 5 | 6, string>;
  code: string;
  table: string;
}> = {
  md: {
    base: 'text-body-md',
    paragraph: 'my-3',
    headings: {
      1: 'text-xl pt-6 pb-2',
      2: 'text-lg pt-6 pb-2 border-b border-outline-variant/40',
      3: 'text-body-lg pt-4',
      4: 'text-body-md pt-3',
      5: 'text-sm pt-2',
      6: 'text-sm pt-2 text-on-surface-variant',
    },
    code: 'text-[13px]',
    table: 'text-sm',
  },
  sm: {
    base: 'text-xs',
    paragraph: 'my-1.5',
    headings: {
      1: 'text-base pt-4 pb-1.5',
      2: 'text-base pt-4 pb-1.5 border-b border-outline-variant/60',
      3: 'text-sm pt-3',
      4: 'text-xs pt-2',
      5: 'text-xs pt-2',
      6: 'text-xs pt-2 text-on-surface-variant',
    },
    code: 'text-[11px]',
    table: 'text-xs',
  },
};

const alignClass = (align: TableAlign) => {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
};

const renderInline = (nodes: MarkdownInline[], keyPrefix = 'i'): ReactNode[] =>
  nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case 'text':
        return node.value;
      case 'strong':
        return <strong key={key} className="font-extrabold text-on-surface">{renderInline(node.children, key)}</strong>;
      case 'emphasis':
        return <em key={key} className="italic">{renderInline(node.children, key)}</em>;
      case 'strike':
        return <del key={key} className="opacity-70">{renderInline(node.children, key)}</del>;
      case 'code':
        return (
          <code
            key={key}
            className="rounded border border-outline-variant/30 bg-surface-container-high/80 px-1.5 py-0.5 font-mono text-[0.85em] text-primary break-words"
          >
            {node.value}
          </code>
        );
      case 'link':
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 break-words hover:decoration-primary"
          >
            {renderInline(node.children, key)}
          </a>
        );
      case 'image':
        return (
          <img
            key={key}
            src={node.src}
            alt={node.alt}
            loading="lazy"
            className="my-2 inline-block max-h-[480px] max-w-full rounded-xl border border-outline-variant/40"
          />
        );
      default:
        return null;
    }
  });

const CodeBlock = ({ lang, value, sizeClass }: { lang: string; value: string; sizeClass: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-outline-variant/50 bg-slate-950 text-left shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-1.5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {lang || 'código'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className={`overflow-x-auto p-4 font-mono leading-relaxed text-slate-100 ${sizeClass}`}>
        <code>{value}</code>
      </pre>
    </div>
  );
};

const renderBlocks = (
  blocks: MarkdownBlock[],
  size: LessonMarkdownSize,
  keyPrefix = 'b',
  compact = false,
): ReactNode[] => {
  const styles = SIZE_STYLES[size];

  return blocks.map((block, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (block.type) {
      case 'heading': {
        const className = `font-heading font-extrabold text-on-surface ${styles.headings[block.level]}`;
        const children = renderInline(block.children, key);
        // A página já usa h1–h2; o conteúdo da aula começa em h3.
        if (block.level === 1) return <h3 key={key} className={className}>{children}</h3>;
        if (block.level === 2) return <h4 key={key} className={className}>{children}</h4>;
        if (block.level === 3) return <h5 key={key} className={className}>{children}</h5>;
        return <h6 key={key} className={className}>{children}</h6>;
      }
      case 'paragraph':
        return (
          <p key={key} className={`${compact ? 'my-0' : styles.paragraph} leading-relaxed break-words`}>
            {renderInline(block.children, key)}
          </p>
        );
      case 'code':
        return <CodeBlock key={key} lang={block.lang} value={block.value} sizeClass={styles.code} />;
      case 'blockquote':
        return (
          <blockquote
            key={key}
            className="my-4 rounded-r-xl border-l-4 border-primary/60 bg-primary/5 px-4 py-2 text-on-surface"
          >
            {renderBlocks(block.children, size, key)}
          </blockquote>
        );
      case 'list': {
        const items = block.items.map((item, itemIndex) => {
          const itemKey = `${key}-${itemIndex}`;
          const content = renderBlocks(item.children, size, itemKey, true);
          if (item.checked === null) {
            return <li key={itemKey} className="pl-1">{content}</li>;
          }
          return (
            <li key={itemKey} className="flex list-none items-start gap-2 -ml-5">
              <input
                type="checkbox"
                checked={item.checked}
                readOnly
                disabled
                className="mt-1 h-3.5 w-3.5 shrink-0 accent-primary"
                aria-label={item.checked ? 'Concluído' : 'Pendente'}
              />
              <div className="min-w-0 flex-1">{content}</div>
            </li>
          );
        });
        const listClass = `${compact ? 'my-1' : 'my-3'} space-y-1 pl-6 marker:text-primary`;
        return block.ordered ? (
          <ol key={key} start={block.start} className={`list-decimal ${listClass}`}>{items}</ol>
        ) : (
          <ul key={key} className={`list-disc ${listClass}`}>{items}</ul>
        );
      }
      case 'table':
        return (
          <div key={key} className="my-4 overflow-x-auto rounded-xl border border-outline-variant/50">
            <table className={`w-full border-collapse ${styles.table}`}>
              <thead className="bg-surface-container-low">
                <tr>
                  {block.header.map((cell, cellIndex) => (
                    <th
                      key={`${key}-h-${cellIndex}`}
                      className={`border-b border-outline-variant/50 px-3 py-2 font-bold text-on-surface ${alignClass(block.align[cellIndex] ?? null)}`}
                    >
                      {renderInline(cell, `${key}-h-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`${key}-r-${rowIndex}`} className="even:bg-surface-container-low/40">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${key}-r-${rowIndex}-${cellIndex}`}
                        className={`border-t border-outline-variant/30 px-3 py-2 align-top ${alignClass(block.align[cellIndex] ?? null)}`}
                      >
                        {renderInline(cell, `${key}-r-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'hr':
        return <hr key={key} className="my-6 border-outline-variant/50" />;
      default:
        return null;
    }
  });
};

/**
 * Renderiza o conteúdo de aulas e atividades escrito em Markdown
 * (títulos, listas, código, links, imagens, tabelas, citações).
 */
export const LessonMarkdown = ({ source, size = 'md', className = '', emptyFallback = null }: LessonMarkdownProps) => {
  const blocks = useMemo(() => parseLessonMarkdown(source), [source]);

  if (blocks.length === 0) {
    return <>{emptyFallback}</>;
  }

  return (
    <div className={`max-w-none font-sans leading-relaxed ${SIZE_STYLES[size].base} ${className}`}>
      {renderBlocks(blocks, size)}
    </div>
  );
};
