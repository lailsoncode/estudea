-- Migration: Allow nullable atividade_id in entregas_atividades and add aula_id to support standard quiz review
-- Date: 2026-06-22

-- 1. Make columns and constraints nullable/modified
ALTER TABLE public.entregas_atividades
  ALTER COLUMN atividade_id DROP NOT NULL;

-- 2. Add aula_id referencing public.aulas
ALTER TABLE public.entregas_atividades
  ADD COLUMN aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE;

-- 3. Drop existing unique constraint if any
ALTER TABLE public.entregas_atividades
  DROP CONSTRAINT IF EXISTS entregas_atividades_aluno_id_atividade_id_key;

-- 4. Create new unique indexes to enforce one submission per student per activity, and one per student per lesson quiz
CREATE UNIQUE INDEX IF NOT EXISTS entregas_atividades_aluno_id_atividade_id_idx 
  ON public.entregas_atividades(aluno_id, atividade_id) 
  WHERE atividade_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS entregas_atividades_aluno_id_aula_id_idx 
  ON public.entregas_atividades(aluno_id, aula_id) 
  WHERE atividade_id IS NULL;
