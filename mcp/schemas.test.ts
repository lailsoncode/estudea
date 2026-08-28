import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CreateLessonInputSchema,
  LessonPatchSchema,
  QuestionSchema,
  ReleaseLessonInputSchema,
  UpdateLessonInputSchema,
  UpdateModuleInputSchema,
  WithdrawLessonInputSchema,
} from './schemas.js';
import { assertLessonPublishable, questionForMcp } from './estudea.js';
import { normalizeQuestionForPersistence, validateLessonPayload } from './lesson-validation.js';

const moduleId = '123e4567-e89b-42d3-a456-426614174000';
const lessonId = '123e4567-e89b-42d3-a456-426614174001';
const classId = '123e4567-e89b-42d3-a456-426614174002';
const revisionWithOffset = '2026-08-27T20:57:47.350730+00:00';

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

test('rejeita gabarito duplicado, excessivo ou divergente do formato legado', () => {
  const options = [
    { id: 'a', texto: 'A' },
    { id: 'b', texto: 'B' },
    { id: 'c', texto: 'C' },
    { id: 'd', texto: 'D' },
    { id: 'e', texto: 'E' },
  ];
  const duplicate = QuestionSchema.safeParse({
    enunciado: 'Selecione duas respostas.',
    tipo: 'multipla_selecao',
    opcoes: options,
    respostas_corretas: ['a', 'a'],
  });
  const excessive = QuestionSchema.safeParse({
    enunciado: 'Selecione as respostas corretas.',
    tipo: 'multipla_selecao',
    opcoes: options,
    respostas_corretas: ['a', 'b', 'c', 'd'],
  });
  const divergent = QuestionSchema.safeParse({
    enunciado: 'Qual é a resposta correta?',
    tipo: 'multipla_escolha',
    opcoes: options,
    respostas_corretas: ['a'],
    resposta_correta: 'B',
  });

  assert.equal(duplicate.success, false);
  assert.equal(excessive.success, false);
  assert.equal(divergent.success, false);
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

test('valida atividades, URLs e materiais duplicados', () => {
  const result = validateLessonPayload({
    titulo: 'Aula de atividades',
    tipo: 'video',
    video_url: 'https://example.com/video',
    atividades: [
      { enunciado: 'Responda ao quiz.', tipo_entrega: 'quiz', questoes: [] },
      { enunciado: 'Envie o resultado.', tipo_entrega: 'arquivo', material_url: 'ftp://example.com/modelo' },
    ],
    materiais: [
      { titulo: 'Guia um', url: 'https://example.com/guia' },
      { titulo: 'Guia dois', url: 'https://example.com/guia' },
    ],
  });

  assert.equal(result.valida, false);
  assert.equal(result.erros.some((error) => error.includes('pelo menos uma questão')), true);
  assert.equal(result.erros.some((error) => error.includes('material_url')), true);
  assert.equal(result.alertas.some((warning) => warning.includes('repete o material 1')), true);
  assert.equal(result.alertas.some((warning) => warning.includes('qual arquivo')), true);
});

test('calcula distribuição por contexto sem produzir Questão NaN', () => {
  const singleChoice = (prefix: string, answer: 'a' | 'b', index: number) => ({
    enunciado: `${prefix} ${index + 1}?`,
    tipo: 'multipla_escolha',
    opcoes: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
    respostas_corretas: [answer],
  });
  const result = validateLessonPayload({
    titulo: 'Aula com distribuições',
    tipo: 'video',
    video_url: 'https://example.com/video',
    questoes: Array.from({ length: 5 }, (_, index) => singleChoice('Quiz', 'a', index)),
    arena: {
      habilitada: true,
      questoes: Array.from({ length: 5 }, (_, index) => singleChoice('Arena', 'b', index)),
    },
  });

  assert.equal(result.alertas.some((warning) => warning.startsWith('Quiz da aula:') && warning.includes('posição A')), true);
  assert.equal(result.alertas.some((warning) => warning.startsWith('Arena:') && warning.includes('posição B')), true);
  assert.equal(result.alertas.some((warning) => warning.includes('NaN')), false);
});

test('patch parcial não materializa defaults nem apaga campos omitidos', () => {
  const arenaPatch = LessonPatchSchema.parse({ arena: { habilitada: true } });
  const materialPatch = LessonPatchSchema.parse({ materiais: [] });

  assert.deepEqual(arenaPatch, { arena: { habilitada: true } });
  assert.deepEqual(materialPatch, { materiais: [] });
});

test('aceita revision_id com Z ou offset do Supabase', () => {
  const lessonUpdate = UpdateLessonInputSchema.safeParse({
    aula_id: lessonId,
    revision_id: revisionWithOffset,
    alteracoes: { titulo: 'Título revisado' },
  });
  const moduleUpdate = UpdateModuleInputSchema.safeParse({
    modulo_id: moduleId,
    revision_id: '2026-08-27T17:57:47.350730-03:00',
    alteracoes: { titulo: 'Módulo revisado' },
  });

  assert.equal(lessonUpdate.success, true);
  assert.equal(moduleUpdate.success, true);
});

test('bloqueia publicação quando o rascunho está inválido', () => {
  assert.throws(() => assertLessonPublishable({
    titulo: 'Aula inválida',
    tipo: 'texto',
    conteudo: 'Curto',
  }), /não passou na validação/);
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
    revision_id: revisionWithOffset,
    confirmado: true,
  });
  const missingRevision = ReleaseLessonInputSchema.safeParse({
    aula_id: lessonId,
    turma_id: classId,
    confirmado: true,
  });

  assert.equal(unconfirmed.success, false);
  assert.equal(confirmed.success, true);
  assert.equal(missingRevision.success, false);
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
