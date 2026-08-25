-- Customizable System Settings & Teacher Key Migration

-- 1. Create table configuracoes_sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  descricao text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- 2. Insert default teacher registration key
INSERT INTO public.configuracoes_sistema (chave, valor, descricao)
VALUES ('chave_docente_cadastro', 'SENAC-DOCENTE-2026', 'Chave institucional para auto-cadastro de novos professores')
ON CONFLICT (chave) DO NOTHING;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Configuracoes are viewable by authenticated users" ON public.configuracoes_sistema;
CREATE POLICY "Configuracoes are viewable by authenticated users" ON public.configuracoes_sistema
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Configuracoes can be managed only by admins" ON public.configuracoes_sistema;
CREATE POLICY "Configuracoes can be managed only by admins" ON public.configuracoes_sistema
  FOR ALL TO authenticated
  USING (public.current_profile_role() = 'admin')
  WITH CHECK (public.current_profile_role() = 'admin');

-- 4. Update handle_new_user trigger to read dynamically from configuracoes_sistema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma_id uuid;
  v_codigo_acesso text;
  v_codigo_docente text;
  v_tipo_cadastro text;
  v_role text;
  v_configured_key text;
BEGIN
  v_tipo_cadastro := COALESCE(NULLIF(BTRIM(new.raw_user_meta_data->>'tipo_cadastro'), ''), 'student');
  v_codigo_docente := UPPER(COALESCE(NULLIF(BTRIM(new.raw_user_meta_data->>'codigo_docente'), ''), ''));

  -- Check if user is registering as teacher
  IF v_tipo_cadastro = 'teacher' THEN
    -- Retrieve the active key configured in the system
    SELECT UPPER(valor) INTO v_configured_key
    FROM public.configuracoes_sistema
    WHERE chave = 'chave_docente_cadastro';

    -- Validate against custom configured key or fallback keys
    IF v_codigo_docente = v_configured_key
       OR v_codigo_docente IN ('SENAC-DOCENTE-2026', 'SENAC-PROFESSOR-2026', 'ESTUDEA-DOCENTE', 'DOCENTE-SENAC', 'PROF-SENAC') THEN
      v_role := 'teacher';
      v_turma_id := NULL;
    ELSE
      RAISE EXCEPTION 'invalid_teacher_code' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    -- Default / Student registration flow
    v_role := COALESCE(NULLIF(new.raw_app_meta_data->>'role', ''), 'student');
    IF v_role NOT IN ('student', 'teacher', 'admin') THEN
      v_role := 'student';
    END IF;

    IF v_role = 'student' THEN
      v_codigo_acesso := NULLIF(BTRIM(new.raw_user_meta_data->>'codigo_acesso'), '');

      IF v_codigo_acesso IS NULL THEN
        RAISE EXCEPTION 'invalid_class_code' USING ERRCODE = 'P0001';
      END IF;

      SELECT id INTO v_turma_id
      FROM public.turmas
      WHERE codigo_acesso = v_codigo_acesso
      LIMIT 1;

      IF v_turma_id IS NULL THEN
        RAISE EXCEPTION 'invalid_class_code' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, nome, email, role, turma_id, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name'),
    new.email,
    v_role,
    v_turma_id,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    turma_id = EXCLUDED.turma_id,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();

  RETURN new;
END;
$$;
