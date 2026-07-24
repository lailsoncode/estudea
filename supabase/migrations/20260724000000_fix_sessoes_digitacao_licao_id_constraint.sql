-- Migration: Fix licao_id check constraint in sessoes_digitacao to support all lessons (1-17+)
-- Date: 2026-07-24

ALTER TABLE public.sessoes_digitacao
  DROP CONSTRAINT IF EXISTS sessoes_digitacao_licao_id_check;

ALTER TABLE public.sessoes_digitacao
  ADD CONSTRAINT sessoes_digitacao_licao_id_check CHECK (licao_id >= 1);
