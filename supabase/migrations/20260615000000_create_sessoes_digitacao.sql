-- Migration: Create sessoes_digitacao table and auto-update media_digitacao trigger
-- Date: 2026-06-15

-- 1. Create sessoes_digitacao table
CREATE TABLE IF NOT EXISTS public.sessoes_digitacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  licao_id INTEGER NOT NULL CHECK (licao_id BETWEEN 1 AND 10),
  wpm INTEGER NOT NULL DEFAULT 0,
  acuracia NUMERIC(5,2) NOT NULL DEFAULT 0,
  duracao_segundos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.sessoes_digitacao ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Students can manage their own sessoes_digitacao" ON public.sessoes_digitacao;
CREATE POLICY "Students can manage their own sessoes_digitacao" ON public.sessoes_digitacao
  FOR ALL TO authenticated USING (aluno_id = auth.uid()) WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Admins/Teachers can view all sessoes_digitacao" ON public.sessoes_digitacao;
CREATE POLICY "Admins/Teachers can view all sessoes_digitacao" ON public.sessoes_digitacao
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

-- 2. Trigger function: update media_digitacao as avg of last 5 sessions
CREATE OR REPLACE FUNCTION public.update_media_digitacao_from_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_media INTEGER;
BEGIN
  SELECT ROUND(AVG(wpm))
  INTO v_media
  FROM (
    SELECT wpm
    FROM public.sessoes_digitacao
    WHERE aluno_id = NEW.aluno_id
    ORDER BY created_at DESC
    LIMIT 5
  ) AS ultimas_sessoes;

  UPDATE public.profiles
  SET media_digitacao = COALESCE(v_media, 0)
  WHERE id = NEW.aluno_id;

  RETURN NEW;
END;
$$;

-- Bind trigger
DROP TRIGGER IF EXISTS trigger_update_media_digitacao ON public.sessoes_digitacao;
CREATE TRIGGER trigger_update_media_digitacao
  AFTER INSERT
  ON public.sessoes_digitacao
  FOR EACH ROW
  EXECUTE FUNCTION update_media_digitacao_from_sessions();
