-- Migration: Create sessoes_mouse table for mouse training analytics
-- Date: 2026-08-25

CREATE TABLE IF NOT EXISTS public.sessoes_mouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  modulo_id INTEGER NOT NULL CHECK (modulo_id >= 1),
  acuracia NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  tempo_reacao_ms INTEGER NOT NULL DEFAULT 0,
  pontuacao INTEGER NOT NULL DEFAULT 0,
  duracao_segundos INTEGER NOT NULL DEFAULT 0,
  concluido BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.sessoes_mouse ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Students can manage their own sessoes_mouse" ON public.sessoes_mouse;
CREATE POLICY "Students can manage their own sessoes_mouse" ON public.sessoes_mouse
  FOR ALL TO authenticated USING (aluno_id = auth.uid()) WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Admins/Teachers can view all sessoes_mouse" ON public.sessoes_mouse;
CREATE POLICY "Admins/Teachers can view all sessoes_mouse" ON public.sessoes_mouse
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );
