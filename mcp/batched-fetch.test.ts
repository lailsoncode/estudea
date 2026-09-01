import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAllBatches } from '../src/utils/batchedFetch.js';

test('divide as aulas para não ultrapassar o limite de 1.000 linhas do Supabase', async () => {
  const lessonIds = Array.from({ length: 53 }, (_, index) => `lesson-${index + 1}`);
  const requestedBatches: string[][] = [];

  const rows = await fetchAllBatches(lessonIds, async (batch) => {
    requestedBatches.push(batch);
    return {
      data: batch.flatMap((lessonId) =>
        Array.from({ length: 30 }, (_, index) => ({ lessonId, question: index + 1 })),
      ),
      error: null,
    };
  });

  assert.equal(rows.length, 1590);
  assert.deepEqual(requestedBatches.map((batch) => batch.length), [10, 10, 10, 10, 10, 3]);
  assert.equal(Math.max(...requestedBatches.map((batch) => batch.length * 30)), 300);
  assert.equal(rows.filter((row) => row.lessonId === 'lesson-53').length, 30);
});

test('propaga erros de qualquer lote da RPC', async () => {
  const expectedError = new Error('rpc_failed');

  await assert.rejects(
    fetchAllBatches(['lesson-1'], async () => ({ data: null, error: expectedError })),
    expectedError,
  );
});
