import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInline, parseLessonMarkdown } from '../src/utils/lessonMarkdown.js';

test('mantém compatibilidade: cada linha vira parágrafo e ##Título sem espaço é título', () => {
  const blocks = parseLessonMarkdown('##Introdução\nPrimeira linha\nSegunda linha\n#hashtag');
  assert.deepEqual(blocks.map((block) => block.type), ['heading', 'paragraph', 'paragraph', 'paragraph']);
  assert.equal(blocks[0].type === 'heading' && blocks[0].level, 2);
  assert.deepEqual(blocks[3], { type: 'paragraph', children: [{ type: 'text', value: '#hashtag' }] });
});

test('reconhece títulos de 1 a 6 níveis', () => {
  const blocks = parseLessonMarkdown('# Um\n## Dois\n### Três\n#### Quatro');
  assert.deepEqual(blocks.map((block) => block.type === 'heading' && block.level), [1, 2, 3, 4]);
});

test('bloco de código cercado preserva recuo, linhas em branco e linguagem', () => {
  const source = 'Veja:\n```python\ndef soma(a, b):\n\n    return a + b\n```\nFim';
  const blocks = parseLessonMarkdown(source);
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks[1], { type: 'code', lang: 'python', value: 'def soma(a, b):\n\n    return a + b' });
});

test('recuo de quatro espaços não vira bloco de código', () => {
  const blocks = parseLessonMarkdown('    texto recuado');
  assert.deepEqual(blocks, [{ type: 'paragraph', children: [{ type: 'text', value: 'texto recuado' }] }]);
});

test('listas ordenadas, não ordenadas, aninhadas e de tarefas', () => {
  const blocks = parseLessonMarkdown('1. Abra o terminal\n2. Digite:\n   - `ls`\n   - `cd`\n3. Pronto\n\n- [x] feito\n- [ ] pendente');
  assert.equal(blocks.length, 2);
  const [ordered, tasks] = blocks;
  assert.ok(ordered.type === 'list' && ordered.ordered);
  assert.equal(ordered.items.length, 3);
  const nested = ordered.items[1].children[1];
  assert.ok(nested.type === 'list' && !nested.ordered && nested.items.length === 2);
  assert.ok(tasks.type === 'list');
  assert.deepEqual(tasks.items.map((item) => item.checked), [true, false]);
});

test('linha em branco entre itens não quebra a lista numerada', () => {
  const blocks = parseLessonMarkdown('1. Um\n\n2. Dois\n\n3. Três');
  assert.equal(blocks.length, 1);
  assert.ok(blocks[0].type === 'list' && blocks[0].items.length === 3);
});

test('tabela com alinhamento e pipe dentro de código', () => {
  const blocks = parseLessonMarkdown('| Comando | Uso |\n|:--|:-:|\n| `a \\| b` | pipe |\n| ls | listar |');
  assert.equal(blocks.length, 1);
  const table = blocks[0];
  assert.ok(table.type === 'table');
  assert.deepEqual(table.align, ['left', 'center']);
  assert.equal(table.rows.length, 2);
  assert.deepEqual(table.rows[0][0], [{ type: 'code', value: 'a | b' }]);
});

test('citação, separador e "---" não viram lista', () => {
  const blocks = parseLessonMarkdown('> **Dica:** salve sempre\n---\n***');
  assert.deepEqual(blocks.map((block) => block.type), ['blockquote', 'hr', 'hr']);
});

test('inline: negrito, itálico, tachado, código, link e imagem', () => {
  const nodes = parseInline('**forte** *ênfase* ~~velho~~ `code` [site](https://exemplo.com) ![logo](https://exemplo.com/a.png)');
  assert.deepEqual(nodes.filter((node) => node.type !== 'text').map((node) => node.type), [
    'strong', 'emphasis', 'strike', 'code', 'link', 'image',
  ]);
});

test('URLs soltas viram link sem levar a pontuação final', () => {
  const nodes = parseInline('Acesse https://estudea.com.br/aula.');
  assert.deepEqual(nodes, [
    { type: 'text', value: 'Acesse ' },
    { type: 'link', href: 'https://estudea.com.br/aula', children: [{ type: 'text', value: 'https://estudea.com.br/aula' }] },
    { type: 'text', value: '.' },
  ]);
});

test('bloqueia javascript: em links e imagens sem deixar resíduo', () => {
  const nodes = parseInline('[clique](javascript:alert(1)) ![x](javascript:alert(1))');
  assert.deepEqual(nodes, [{ type: 'text', value: 'clique x' }]);
});

test('link com parênteses balanceados na URL', () => {
  const nodes = parseInline('[Bash](https://pt.wikipedia.org/wiki/Bash_(Unix)).');
  assert.deepEqual(nodes, [
    { type: 'link', href: 'https://pt.wikipedia.org/wiki/Bash_(Unix)', children: [{ type: 'text', value: 'Bash' }] },
    { type: 'text', value: '.' },
  ]);
});

test('snake_case e asteriscos escapados não viram ênfase', () => {
  assert.deepEqual(parseInline('use minha_variavel_global'), [{ type: 'text', value: 'use minha_variavel_global' }]);
  assert.deepEqual(parseInline('2 \\* 3 \\* 4'), [{ type: 'text', value: '2 * 3 * 4' }]);
});

test('código inline não interpreta formatação interna', () => {
  assert.deepEqual(parseInline('`**não negrito**`'), [{ type: 'code', value: '**não negrito**' }]);
});
