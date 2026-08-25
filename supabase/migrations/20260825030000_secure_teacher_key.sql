-- Secure dynamic teacher key validation
-- Removes hardcoded key fallbacks and validates strictly against configuracoes_sistema

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
    -- Retrieve the active key configured dynamically in the system
    SELECT UPPER(valor) INTO v_configured_key
    FROM public.configuracoes_sistema
    WHERE chave = 'chave_docente_cadastro';

    -- Validate strictly against active configured key
    IF v_codigo_docente IS NOT NULL 
       AND v_configured_key IS NOT NULL 
       AND v_codigo_docente = v_configured_key THEN
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
