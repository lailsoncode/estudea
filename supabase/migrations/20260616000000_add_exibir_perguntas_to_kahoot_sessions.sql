-- Migration: Add exibir_perguntas to kahoot_sessions
-- Date: 2026-06-16

ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS exibir_perguntas BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.kahoot_sessions.exibir_perguntas IS 'Define se as perguntas e respostas/alternativas devem aparecer na tela dos alunos.';
