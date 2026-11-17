/**
 * Parser de Markdown usado no conteúdo das aulas e nas instruções das atividades.
 *
 * Gera uma árvore de dados (sem HTML), renderizada pelo componente LessonMarkdown.
 * Como nada vira HTML bruto, o conteúdo não abre brecha para XSS.
 *
 * Compatibilidade com o renderizador antigo:
 * - cada linha de texto continua sendo um parágrafo próprio;
 * - "##Título" (sem espaço) continua sendo título;
 * - recuo com quatro espaços NÃO vira bloco de código (só cercas ``` ou ~~~).
 */

export type MarkdownInline =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: MarkdownInline[] }
  | { type: 'emphasis'; children: MarkdownInline[] }
  | { type: 'strike'; children: MarkdownInline[] }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; children: MarkdownInline[] }
  | { type: 'image'; src: string; alt: string };

export type TableAlign = 'left' | 'center' | 'right' | null;

export interface MarkdownListItem {
  checked: boolean | null;
  children: MarkdownBlock[];
}

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: MarkdownInline[] }
  | { type: 'paragraph'; children: MarkdownInline[] }
  | { type: 'code'; lang: string; value: string }
  | { type: 'blockquote'; children: MarkdownBlock[] }
  | { type: 'list'; ordered: boolean; start: number; items: MarkdownListItem[] }
  | { type: 'table'; align: TableAlign[]; header: MarkdownInline[][]; rows: MarkdownInline[][][] }
  | { type: 'hr' };

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;
const SAFE_IMAGE = /^https?:\/\//i;

export const isSafeLink = (href: string) => SAFE_LINK.test(href.trim());
export const isSafeImage = (src: string) => SAFE_IMAGE.test(src.trim());

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

const INLINE_PATTERN = new RegExp(
  [
    /``(.+?)``/.source, // 1: código com crase dupla
    /`([^`]+)`/.source, // 2: código
    // URLs de link e imagem aceitam parênteses balanceados, ex.: wiki/Bash_(Unix)
    /!\[([^\]]*)\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))+)>?(?:\s+"[^"]*")?\s*\)/.source, // 3,4: imagem
    /\[((?:[^\][]|\[[^\]]*\])+)\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))+)>?(?:\s+"[^"]*")?\s*\)/.source, // 5,6: link
    /<((?:https?:\/\/|mailto:)[^>\s]+)>/.source, // 7: autolink entre < >
    /((?:https?:\/\/)[^\s<]*[^\s<.,:;!?)\]'"*_~])/.source, // 8: URL solta
    /\*\*(?=\S)([\s\S]*?\S)\*\*/.source, // 9: negrito
    /(?<![\w])__(?=\S)([\s\S]*?\S)__(?![\w])/.source, // 10: negrito com _
    /~~(?=\S)([\s\S]*?\S)~~/.source, // 11: tachado
    /\*(?=[^\s*])([\s\S]*?[^\s*])\*/.source, // 12: itálico
    /(?<![\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?![\w])/.source, // 13: itálico com _
  ].join('|'),
  'g',
);

const pushText = (nodes: MarkdownInline[], value: string) => {
  if (!value) return;
  const last = nodes[nodes.length - 1];
  if (last?.type === 'text') {
    last.value += value;
  } else {
    nodes.push({ type: 'text', value });
  }
};

export const parseInline = (source: string, allowLinks = true): MarkdownInline[] => {
  const nodes: MarkdownInline[] = [];
  if (!source) return nodes;

  // Protege caracteres escapados (\*) para que não abram formatação.
  const placeholders: string[] = [];
  const text = source.replace(/\\([\\`*_{}[\]()#+\-.!|~>])/g, (_match, char: string) => {
    placeholders.push(char);
    return `\uE000${placeholders.length - 1}\uE000`;
  });
  const restore = (value: string) =>
    value.replace(/\uE000(\d+)\uE000/g, (_match, index: string) => placeholders[Number(index)] ?? '');

  const pattern = new RegExp(INLINE_PATTERN.source, 'g');
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const [whole] = match;
    const linkLike = match[5] !== undefined || match[7] !== undefined || match[8] !== undefined;

    if (!allowLinks && linkLike) {
      // Dentro do texto de um link não criamos outro link: mantém como texto.
      continue;
    }

    pushText(nodes, restore(text.slice(cursor, match.index)));
    cursor = match.index + whole.length;

    if (match[1] !== undefined || match[2] !== undefined) {
      nodes.push({ type: 'code', value: restore(match[1] ?? match[2]) });
    } else if (match[3] !== undefined) {
      const src = restore(match[4]);
      if (isSafeImage(src)) {
        nodes.push({ type: 'image', src, alt: restore(match[3]) });
      } else {
        pushText(nodes, restore(match[3]));
      }
    } else if (match[5] !== undefined) {
      const href = restore(match[6]);
      const children = parseInline(restore(match[5]), false);
      if (isSafeLink(href)) {
        nodes.push({ type: 'link', href, children });
      } else {
        children.forEach((child) => (child.type === 'text' ? pushText(nodes, child.value) : nodes.push(child)));
      }
    } else if (match[7] !== undefined || match[8] !== undefined) {
      const href = restore(match[7] ?? match[8]);
      nodes.push({ type: 'link', href, children: [{ type: 'text', value: href.replace(/^mailto:/i, '') }] });
    } else if (match[9] !== undefined || match[10] !== undefined) {
      nodes.push({ type: 'strong', children: parseInline(restore(match[9] ?? match[10]), allowLinks) });
    } else if (match[11] !== undefined) {
      nodes.push({ type: 'strike', children: parseInline(restore(match[11]), allowLinks) });
    } else if (match[12] !== undefined || match[13] !== undefined) {
      nodes.push({ type: 'emphasis', children: parseInline(restore(match[12] ?? match[13]), allowLinks) });
    }
  }

  pushText(nodes, restore(text.slice(cursor)));
  return nodes;
};

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

const indentOf = (line: string) => {
  let width = 0;
  for (const char of line) {
    if (char === ' ') width += 1;
    else if (char === '\t') width += 4 - (width % 4);
    else break;
  }
  return width;
};

const removeIndent = (line: string, amount: number) => {
  let removed = 0;
  let index = 0;
  while (index < line.length && removed < amount) {
    const char = line[index];
    if (char === ' ') removed += 1;
    else if (char === '\t') removed += 4 - (removed % 4);
    else break;
    index += 1;
  }
  return line.slice(index);
};

const isBlank = (line: string | undefined) => line === undefined || line.trim() === '';

const FENCE = /^\s*(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/;
const HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const LIST_MARKER = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const matchHeading = (line: string) => {
  const match = /^\s{0,3}(#{1,6})(\s*)(.*)$/.exec(line);
  if (!match) return null;
  const [, hashes, spacing, rawText] = match;
  // "#hashtag" continua sendo texto; "##Título" vira título (como no renderizador antigo).
  if (!spacing && hashes.length === 1) return null;
  const text = rawText.replace(/\s+#+\s*$/, '').trim();
  if (!text) return null;
  return { level: hashes.length as 1 | 2 | 3 | 4 | 5 | 6, text };
};

const matchListMarker = (line: string) => {
  const match = LIST_MARKER.exec(line);
  if (!match) return null;
  const [, spaces, marker, text] = match;
  // Linhas como "---" ou "***" são separadores, não listas.
  if (HR.test(line)) return null;
  const ordered = /\d/.test(marker);
  const indent = indentOf(spaces);
  return {
    indent,
    ordered,
    start: ordered ? Number.parseInt(marker, 10) : 1,
    text,
    contentIndent: indent + marker.length + 1,
  };
};

const splitTableRow = (line: string) => {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  const cells: string[] = [];
  let current = '';
  let inCode = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === '\\' && row[index + 1] === '|') {
      current += '|';
      index += 1;
    } else if (char === '`') {
      inCode = !inCode;
      current += char;
    } else if (char === '|' && !inCode) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
};

const isTableStart = (lines: string[], index: number) => {
  const header = lines[index];
  const separator = lines[index + 1];
  if (!header?.includes('|') || separator === undefined || !TABLE_SEPARATOR.test(separator)) return false;
  return splitTableRow(header).length === splitTableRow(separator).length;
};

const parseAlign = (cell: string): TableAlign => {
  const value = cell.trim();
  const left = value.startsWith(':');
  const right = value.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
};

const parseLines = (lines: string[]): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlank(line)) {
      index += 1;
      continue;
    }

    // Bloco de código cercado
    const fence = FENCE.exec(line);
    if (fence) {
      const [, marker, lang] = fence;
      const baseIndent = indentOf(line);
      const closing = new RegExp(`^\\s*${marker[0] === '`' ? '`' : '~'}{${marker.length},}\\s*$`);
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !closing.test(lines[index])) {
        codeLines.push(removeIndent(lines[index], baseIndent));
        index += 1;
      }
      index += 1; // pula a cerca de fechamento (ou o fim do texto)
      blocks.push({ type: 'code', lang: lang.toLowerCase(), value: codeLines.join('\n') });
      continue;
    }

    const heading = matchHeading(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading.level, children: parseInline(heading.text) });
      index += 1;
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    if (/^\s{0,3}>/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^\s{0,3}>/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'blockquote', children: parseLines(quoteLines) });
      continue;
    }

    if (isTableStart(lines, index)) {
      const header = splitTableRow(lines[index]);
      const align = splitTableRow(lines[index + 1]).map(parseAlign);
      index += 2;
      const rows: MarkdownInline[][][] = [];
      while (index < lines.length && !isBlank(lines[index]) && lines[index].includes('|')) {
        const cells = splitTableRow(lines[index]);
        const normalized = header.map((_cell, cellIndex) => cells[cellIndex] ?? '');
        rows.push(normalized.map((cell) => parseInline(cell)));
        index += 1;
      }
      blocks.push({ type: 'table', align, header: header.map((cell) => parseInline(cell)), rows });
      continue;
    }

    const marker = matchListMarker(line);
    if (marker) {
      const items: MarkdownListItem[] = [];
      const baseIndent = marker.indent;

      while (index < lines.length) {
        const current = matchListMarker(lines[index]);
        if (!current || current.ordered !== marker.ordered || current.indent < baseIndent || current.indent > baseIndent + 1) {
          break;
        }

        let firstLine = current.text;
        let checked: boolean | null = null;
        const task = /^\[([ xX])\]\s+(.*)$/.exec(firstLine);
        if (task) {
          checked = task[1].toLowerCase() === 'x';
          firstLine = task[2];
        }

        const itemLines = [firstLine];
        index += 1;

        // Linhas com recuo maior que o marcador pertencem ao item (sublistas, código etc.).
        while (index < lines.length) {
          const next = lines[index];
          if (isBlank(next)) {
            let lookahead = index + 1;
            while (lookahead < lines.length && isBlank(lines[lookahead])) lookahead += 1;
            if (lookahead < lines.length && indentOf(lines[lookahead]) > baseIndent + 1) {
              itemLines.push('');
              index += 1;
              continue;
            }
            break;
          }
          if (indentOf(next) > baseIndent + 1) {
            itemLines.push(removeIndent(next, Math.min(indentOf(next), current.contentIndent)));
            index += 1;
            continue;
          }
          break;
        }

        items.push({ checked, children: parseLines(itemLines) });

        // Uma linha em branco entre itens da mesma lista não encerra a lista.
        let lookahead = index;
        while (lookahead < lines.length && isBlank(lines[lookahead])) lookahead += 1;
        const following = lookahead < lines.length ? matchListMarker(lines[lookahead]) : null;
        if (lookahead !== index && following && following.ordered === marker.ordered && following.indent >= baseIndent && following.indent <= baseIndent + 1) {
          index = lookahead;
        }
      }

      blocks.push({ type: 'list', ordered: marker.ordered, start: marker.start, items });
      continue;
    }

    // Parágrafo: cada linha é um parágrafo próprio, como no renderizador antigo.
    blocks.push({ type: 'paragraph', children: parseInline(line.trim()) });
    index += 1;
  }

  return blocks;
};

export const parseLessonMarkdown = (source: string | null | undefined): MarkdownBlock[] => {
  if (!source) return [];
  const normalized = source.replace(/\r\n?/g, '\n');
  return parseLines(normalized.split('\n'));
};

export const markdownToPlainText = (nodes: MarkdownInline[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
        case 'code':
          return node.value;
        case 'image':
          return node.alt;
        default:
          return markdownToPlainText(node.children);
      }
    })
    .join('');
