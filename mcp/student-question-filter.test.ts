import assert from 'node:assert/strict';
import test from 'node:test';
import {
  answersForQuestions,
  getActivityQuizQuestions,
  getArenaQuestions,
  getStandardQuizQuestions,
} from '../src/utils/lessonQuestionFilters.js';

const questions = [
  { id: 'quiz-1', atividade_id: null, para_arena: false },
  { id: 'quiz-2', atividade_id: null, para_arena: false, contexto: 'aula' },
  { id: 'arena-1', atividade_id: null, para_arena: true },
  { id: 'arena-context', atividade_id: null, para_arena: false, contexto: 'arena' },
  { id: 'activity-1', atividade_id: 'activity-a', para_arena: false },
  { id: 'activity-2', atividade_id: 'activity-b', para_arena: false },
];

test('separa quiz comum, Arena e quizzes de atividade', () => {
  assert.deepEqual(getStandardQuizQuestions(questions).map(({ id }) => id), ['quiz-1', 'quiz-2']);
  assert.deepEqual(getArenaQuestions(questions).map(({ id }) => id), ['arena-1', 'arena-context']);
  assert.deepEqual(getActivityQuizQuestions(questions, 'activity-a').map(({ id }) => id), ['activity-1']);
});

test('envia somente respostas pertencentes ao contexto selecionado', () => {
  const standard = getStandardQuizQuestions(questions);
  const payload = answersForQuestions(standard, {
    'quiz-1': 'A',
    'quiz-2': 'B',
    'arena-1': 'C',
    'activity-1': 'D',
  });

  assert.deepEqual(payload, { 'quiz-1': 'A', 'quiz-2': 'B' });
});

test('regressão: uma aula com 20 questões comuns e 10 da Arena exibe e envia somente 20', () => {
  const standard = Array.from({ length: 20 }, (_, index) => ({
    id: `standard-${index + 1}`,
    atividade_id: null,
    para_arena: false,
  }));
  const arena = Array.from({ length: 10 }, (_, index) => ({
    id: `arena-${index + 1}`,
    atividade_id: null,
    para_arena: true,
  }));
  const allQuestions = [...standard, ...arena];
  const visibleQuestions = getStandardQuizQuestions(allQuestions);
  const allAnswers = Object.fromEntries(allQuestions.map(({ id }) => [id, 'A']));

  assert.equal(visibleQuestions.length, 20);
  assert.equal(Object.keys(answersForQuestions(visibleQuestions, allAnswers)).length, 20);
});
