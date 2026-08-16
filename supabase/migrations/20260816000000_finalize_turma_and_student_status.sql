-- Migration: Add status and finalization fields to turmas and profiles
-- Date: 2026-08-16

-- 1. Add status and finalization metadata to turmas table
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('em_andamento', 'concluida', 'arquivada')) DEFAULT 'em_andamento';
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS finalizada_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS observacao_encerramento TEXT;

-- 2. Add final academic situation to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS situacao_final TEXT CHECK (situacao_final IN ('cursando', 'aprovado', 'reprovado', 'desistente')) DEFAULT 'cursando';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nota_final NUMERIC(5,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS observacao_conclusao TEXT;

-- 3. Ensure existing turmas have 'em_andamento' as default status
UPDATE public.turmas SET status = 'em_andamento' WHERE status IS NULL;

-- 4. Ensure existing students have 'cursando' as default academic situation
UPDATE public.profiles SET situacao_final = 'cursando' WHERE situacao_final IS NULL AND role = 'student';
