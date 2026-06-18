-- Migration: Link detached quiz questions and submissions to their custom activities
-- Date: 2026-06-23

BEGIN;

-- 1. Aula 01: Acolhimento e Diagnóstico (1ad1b1d1-7be8-4edc-b017-e3586c3ccc75)
-- Link standard questions to activity '16fe64c9-6b96-4324-88b9-a019a5b510ee'
UPDATE public.questoes
SET atividade_id = '16fe64c9-6b96-4324-88b9-a019a5b510ee'
WHERE aula_id = '1ad1b1d1-7be8-4edc-b017-e3586c3ccc75'
  AND para_arena = false
  AND atividade_id IS NULL;

-- 2. Aula 01 Alternative (a2a72285-7f00-4924-bccf-152d5088a93d)
-- Link standard questions to activity '64b995ca-f15a-4cba-bd68-70b558dd15a4'
UPDATE public.questoes
SET atividade_id = '64b995ca-f15a-4cba-bd68-70b558dd15a4'
WHERE aula_id = 'a2a72285-7f00-4924-bccf-152d5088a93d'
  AND para_arena = false
  AND atividade_id IS NULL;

-- 3. Aula 03 - Hardware na Prática (f7d5a8b3-4391-42e2-bff1-045d060057db)
-- Link standard questions to activity 'a25d6502-5f98-4082-9fbf-17e448554a7c'
UPDATE public.questoes
SET atividade_id = 'a25d6502-5f98-4082-9fbf-17e448554a7c'
WHERE aula_id = 'f7d5a8b3-4391-42e2-bff1-045d060057db'
  AND para_arena = false
  AND atividade_id IS NULL;

-- Link lesson 3 submissions (where response is a quiz JSON) to activity 'a25d6502-5f98-4082-9fbf-17e448554a7c'
UPDATE public.entregas_atividades
SET atividade_id = 'a25d6502-5f98-4082-9fbf-17e448554a7c'
WHERE aula_id = 'f7d5a8b3-4391-42e2-bff1-045d060057db'
  AND atividade_id IS NULL
  AND resposta LIKE '{"respostas":%';

COMMIT;
