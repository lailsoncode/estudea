import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/20260827020000_harden_mcp_lesson_release.sql',
  import.meta.url,
);

test('migration de liberação exige revisão e revalida na mesma transação', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /p_revision_id timestamptz/);
  assert.match(sql, /FOR UPDATE OF a/);
  assert.match(sql, /concurrent_lesson_release/);
  assert.match(sql, /lesson_invalid_for_release/);
  assert.match(sql, /idempotent_replay/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.mcp_release_lesson_to_class\(uuid, uuid, timestamptz, boolean, text\)/);
});
