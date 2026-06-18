-- Migration: Fix lesson 3 submission activity_id by correctly parsing JSON response
-- Date: 2026-06-23

BEGIN;

UPDATE public.entregas_atividades
SET atividade_id = 'a25d6502-5f98-4082-9fbf-17e448554a7c'
WHERE aula_id = 'f7d5a8b3-4391-42e2-bff1-045d060057db'
  AND atividade_id IS NULL
  AND (resposta::jsonb ? 'respostas');

COMMIT;
