-- Add avaliacao column to progresso_alunos table
ALTER TABLE public.progresso_alunos 
ADD COLUMN IF NOT EXISTS avaliacao integer CHECK (avaliacao >= 1 AND avaliacao <= 5);
