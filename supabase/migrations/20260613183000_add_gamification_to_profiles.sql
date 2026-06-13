-- Migration: Add gamification features (streaks/ofensivas) to profiles table
-- Date: 2026-06-13

-- 1. Add gamification columns to public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS ofensiva_atual INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maior_ofensiva INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_acesso_data TIMESTAMP WITH TIME ZONE;

-- Comment columns for documentation
COMMENT ON COLUMN public.profiles.ofensiva_atual IS 'Contador de dias seguidos que o aluno acessou a plataforma.';
COMMENT ON COLUMN public.profiles.maior_ofensiva IS 'Recorde histórico de ofensiva (dias seguidos) do aluno.';
COMMENT ON COLUMN public.profiles.ultimo_acesso_data IS 'Data e hora do último acesso registrado para atualização de ofensiva.';

-- 2. Create the function to update user streaks
CREATE OR REPLACE FUNCTION public.atualizar_ofensiva_aluno(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_ultimo_acesso DATE;
  v_hoje DATE;
  v_ofensiva_atual INTEGER;
  v_maior_ofensiva INTEGER;
BEGIN
  -- Obter os dados atuais do perfil do aluno
  SELECT 
    (ultimo_acesso_data AT TIME ZONE 'America/Sao_Paulo')::date,
    COALESCE(ofensiva_atual, 0),
    COALESCE(maior_ofensiva, 0)
  INTO 
    v_ultimo_acesso,
    v_ofensiva_atual,
    v_maior_ofensiva
  FROM public.profiles
  WHERE id = p_user_id;

  -- Obter a data de hoje no fuso horário do Brasil
  v_hoje := (now() AT TIME ZONE 'America/Sao_Paulo')::date;

  -- Verificar a lógica de sequência (ofensiva)
  IF v_ultimo_acesso IS NULL THEN
    -- Primeiro acesso registrado: inicia a ofensiva em 1
    v_ofensiva_atual := 1;
  ELSIF v_ultimo_acesso = v_hoje THEN
    -- Acesso no mesmo dia: não altera a contagem da ofensiva
    -- Mantém o valor atual
    NULL;
  ELSIF v_ultimo_acesso = v_hoje - 1 THEN
    -- Acesso no dia seguinte: incrementa a ofensiva
    v_ofensiva_atual := v_ofensiva_atual + 1;
  ELSE
    -- Quebra de sequência (acesso anterior a ontem): reinicia em 1
    v_ofensiva_atual := 1;
  END IF;

  -- Atualizar a maior ofensiva se a atual a superou
  IF v_ofensiva_atual > v_maior_ofensiva THEN
    v_maior_ofensiva := v_ofensiva_atual;
  END IF;

  -- Atualizar a tabela de perfis
  UPDATE public.profiles
  SET 
    ofensiva_atual = v_ofensiva_atual,
    maior_ofensiva = v_maior_ofensiva,
    ultimo_acesso_data = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
