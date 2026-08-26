import assert from 'node:assert/strict';
import test from 'node:test';
import { CreateLessonInputSchema, QuestionSchema, ReleaseLessonInputSchema } from './schemas.js';

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
