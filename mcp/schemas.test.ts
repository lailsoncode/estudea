import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CreateLessonInputSchema,
  QuestionSchema,
  ReleaseLessonInputSchema,
  UpdateLessonInputSchema,
  WithdrawLessonInputSchema,
} from './schemas.js';
import { questionForMcp } from './estudea.js';
import { normalizeQuestionForPersistence, validateLessonPayload } from './lesson-validation.js';

const moduleId = '123e4567-e89b-42d3-a456-426614174000';
const lessonId = '123e4567-e89b-42d3-a456-426614174001';
const classId = '123e4567-e89b-42d3-a456-426614174002';

test('aceita uma aula textual completa', () => {
  const result = CreateLessonInputSchema.safeParse({
    modulo_id: moduleId,
    idempotency_key: 'lesson-request-001',
    aula: {
      titulo: 'Introdução ao Windows 11',
      descricao: 'Conhecer a interface principal.',
      conteudo: 'Nesta aula vamos conhecer a área de trabalho e o menu Iniciar.',
      tipo: 'texto',
      atividades: [{
        enunciado: 'Organize três atalhos na área de trabalho e descreva o processo.',
        tipo_entrega: 'texto',
      }],
      questoes: [{
        enunciado: 'Qual elemento abre a lista de aplicativos?',
        tipo: 'multipla_escolha',
        opcoes: ['Menu Iniciar', 'Lixeira', 'Relógio'],
        resposta_correta: 'Menu Iniciar',
      }],
    },
  });

  assert.equal(result.success, true);
});

test('rejeita resposta que não existe nas opções', () => {
  const result = QuestionSchema.safeParse({
    enunciado: 'Qual é a resposta?',
    tipo: 'multipla_escolha',
    opcoes: ['A', 'B'],
    resposta_correta: 'C',
  });

  assert.equal(result.success, false);
});

test('aceita opções estruturadas e múltipla seleção com IDs', () => {
  const result = QuestionSchema.safeParse({
    enunciado: 'Quais formatos preservam transparência?',
    tipo: 'multipla_selecao',
    opcoes: [
      { id: 'a', texto: 'PNG' },
      { id: 'b', texto: 'JPEG' },
      { id: 'c', texto: 'WebP' },
    ],
    respostas_corretas: ['a', 'c'],
  });

  assert.equal(result.success, true);
});

test('rejeita múltipla seleção quando todas as opções estão corretas', () => {
  const result = QuestionSchema.safeParse({
    enunciado: 'Selecione as opções corretas.',
    tipo: 'multipla_selecao',
    opcoes: [
      { id: 'a', texto: 'A' },
      { id: 'b', texto: 'B' },
    ],
    respostas_corretas: ['a', 'b'],
  });

  assert.equal(result.success, false);
});

test('preserva campos semânticos de questão aberta no formato legado', () => {
  const normalized = normalizeQuestionForPersistence({
    enunciado: 'Explique o conceito de variável.',
    tipo: 'aberta',
    gabarito_recomendado: 'Uma variável associa um nome a um valor.',
    palavras_chave_aprovacao: ['nome', 'valor'],
  }, 'aula');
  const restored = questionForMcp(normalized);

  assert.deepEqual(normalized.opcoes, ['Uma variável associa um nome a um valor.', 'nome, valor']);
  assert.deepEqual(normalized.opcoes_estruturadas, []);
  assert.equal(restored.gabarito_recomendado, 'Uma variável associa um nome a um valor.');
  assert.deepEqual(restored.palavras_chave_aprovacao, ['nome', 'valor']);
  assert.deepEqual(restored.opcoes, []);
});

test('aplica regras específicas às questões da Arena', () => {
  const result = validateLessonPayload({
    titulo: 'Aula com Arena',
    tipo: 'video',
    video_url: 'https://example.com/video',
    arena: {
      habilitada: true,
      questoes: [{
        enunciado: 'A'.repeat(121),
        tipo: 'multipla_selecao',
        opcoes: [
          { id: 'a', texto: 'A' },
          { id: 'b', texto: 'B' },
          { id: 'c', texto: 'C' },
          { id: 'd', texto: 'D' },
          { id: 'e', texto: 'E' },
        ],
        respostas_corretas: ['a', 'b'],
      }],
    },
  });

  assert.equal(result.valida, false);
  assert.equal(result.erros.some((error) => error.includes('120 caracteres')), true);
  assert.equal(result.erros.some((error) => error.includes('somente múltipla escolha')), true);
});

test('rejeita mais de quatro alternativas na múltipla escolha da Arena', () => {
  const result = validateLessonPayload({
    titulo: 'Aula com Arena',
    tipo: 'video',
    video_url: 'https://example.com/video',
    arena: {
      habilitada: true,
      questoes: [{
        enunciado: 'Qual alternativa está correta?',
        tipo: 'multipla_escolha',
        opcoes: ['A', 'B', 'C', 'D', 'E'],
        resposta_correta: 'A',
      }],
    },
  });

  assert.equal(result.valida, false);
  assert.equal(result.erros.some((error) => error.includes('no máximo quatro')), true);
});

test('validador relata duplicidade e sequência longa de verdadeiro/falso sem gravar', () => {
  const vf = (enunciado: string) => ({
    enunciado,
    tipo: 'verdadeiro_falso',
    opcoes: [{ id: 'v', texto: 'Verdadeiro' }, { id: 'f', texto: 'Falso' }],
    respostas_corretas: ['v'],
  });
  const result = validateLessonPayload({
    titulo: 'Aula de teste',
    tipo: 'video',
    video_url: 'https://example.com/aula',
    questoes: [vf('Pergunta repetida'), vf('Pergunta repetida')],
    arena: { habilitada: true, questoes: [vf('Arena 1'), vf('Arena 2'), vf('Arena 3')] },
  });

  assert.equal(result.valida, false);
  assert.equal(result.erros.some((error) => error.includes('idêntico')), true);
  assert.equal(result.alertas.some((warning) => warning.includes('consecutivas')), true);
});

test('exige confirmação literal para liberar uma aula', () => {
  const unconfirmed = ReleaseLessonInputSchema.safeParse({
    aula_id: lessonId,
    turma_id: classId,
    confirmado: false,
  });
  const confirmed = ReleaseLessonInputSchema.safeParse({
    aula_id: lessonId,
    turma_id: classId,
    confirmado: true,
  });

  assert.equal(unconfirmed.success, false);
  assert.equal(confirmed.success, true);
});

test('exige revision_id para atualizar e confirmação para retirar', () => {
  const update = UpdateLessonInputSchema.safeParse({
    aula_id: lessonId,
    alteracoes: { titulo: 'Título revisado' },
  });
  const withdraw = WithdrawLessonInputSchema.safeParse({
    aula_id: lessonId,
    turma_id: classId,
    confirmado: false,
  });

  assert.equal(update.success, false);
  assert.equal(withdraw.success, false);
});
