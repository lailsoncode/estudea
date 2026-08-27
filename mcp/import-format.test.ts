import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretTaggedLesson } from './import-format.js';

test('converte tags em JSON estruturado sem gravar', () => {
  const result = interpretTaggedLesson(`
[TÍTULO]
Introdução à organização de arquivos

[DESCRIÇÃO]
Compreender pastas, arquivos e boas práticas de organização.

[CONTEÚDO]
Arquivos armazenam informações e pastas ajudam a agrupá-los de maneira lógica e recuperável.

[LINK_ARQUIVO]
https://example.com/guia.pdf

[ATIVIDADE]
Ativa: Sim
Enunciado: Organize uma pasta de projeto e descreva os critérios usados.
Tipo de Entrega: texto
Material de Apoio: https://example.com/modelo.zip
Questionário Próprio: Sim

[QUESTÕES]
Pergunta 1: Por que usamos pastas?
Tipo: aberta
Destino: Aula
Gabarito Recomendado: Para agrupar arquivos relacionados.
Palavras-chave de aprovação: organização, arquivos

---

Pergunta 2: Qual nome facilita a busca?
Tipo: multipla_escolha
Destino: Atividade
Opções:
- relatorio-final.pdf
- arquivo1.pdf
- novo.pdf
- teste.pdf
Resposta Correta: relatorio-final.pdf

[ARENA_QUESTÕES]
Pergunta 1: Qual item pode conter outros arquivos?
Tipo: multipla_escolha
Opções:
- Pasta
- Mouse
- Tela
- Teclado
Resposta Correta: Pasta
`);

  assert.equal(result.aula.titulo, 'Introdução à organização de arquivos');
  assert.equal(result.aula.arquivo_url, 'https://example.com/guia.pdf');
  assert.equal(result.aula.questoes[0].tipo, 'aberta');
  assert.equal(result.aula.questoes[0].gabarito_recomendado, 'Para agrupar arquivos relacionados.');
  assert.deepEqual(result.aula.questoes[0].palavras_chave_aprovacao, ['organização', 'arquivos']);
  assert.equal(result.aula.atividades[0].tipo_entrega, 'quiz');
  assert.equal(result.aula.atividades[0].questoes[0].respostas_corretas[0], 'a');
  assert.equal(result.aula.arena?.questoes[0].opcoes[0].id, 'a');
  assert.equal(result.validacao.valida, true);
  assert.equal(result.alertas_importacao.some((warning) => warning.includes('convertida para tipo quiz')), true);
  assert.equal(result.validacao.alertas.some((warning) => warning.includes('menos de cinco')), true);
});

test('mantém respostas não reconhecidas visíveis para correção', () => {
  const result = interpretTaggedLesson(`
[TÍTULO]
Aula de teste
[CONTEÚDO]
Conteúdo didático suficientemente detalhado para uma validação segura.
[QUESTÕES]
Pergunta 1: Qual alternativa está correta?
Tipo: multipla_escolha
Opções:
- Primeira
- Segunda
Resposta Correta: Terceira
`);

  assert.equal(result.validacao.valida, false);
  assert.equal(result.alertas_importacao.some((warning) => warning.includes('Terceira')), true);
  assert.equal(result.validacao.erros.some((error) => error.includes('ID inexistente')), true);
});

test('não mistura várias aulas presentes no mesmo texto', () => {
  const result = interpretTaggedLesson(`
[TÍTULO]
Primeira aula
[CONTEÚDO]
Conteúdo completo e detalhado da primeira aula para validação.
[TÍTULO]
Segunda aula
[CONTEÚDO]
Conteúdo completo e detalhado da segunda aula para validação.
`);

  assert.equal(result.aula.titulo, 'Primeira aula');
  assert.equal(result.aula.conteudo.includes('segunda'), false);
  assert.equal(result.alertas_importacao.some((warning) => warning.includes('várias aulas')), true);
});
