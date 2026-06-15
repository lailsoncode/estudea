-- Migration: Prevent cascade deletion of arena rankings when kahoot sessions are deleted
-- Date: 2026-06-22

-- 1. Drop the existing foreign key constraint
ALTER TABLE public.arena_ranking
  DROP CONSTRAINT IF EXISTS arena_ranking_session_id_fkey;

-- 2. Make session_id column nullable
ALTER TABLE public.arena_ranking
  ALTER COLUMN session_id DROP NOT NULL;

-- 3. Add the new foreign key constraint with ON DELETE SET NULL
ALTER TABLE public.arena_ranking
  ADD CONSTRAINT arena_ranking_session_id_fkey
  FOREIGN KEY (session_id)
  REFERENCES public.kahoot_sessions(id)
  ON DELETE SET NULL;
