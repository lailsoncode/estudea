-- Initial MCP support for creating complete lessons from ChatGPT Work.
-- All functions run as the authenticated caller so the existing RLS boundary is preserved.

-- The UI already supports "arquivo" as an activity delivery type. Keep the database
-- constraint aligned before accepting the same value through MCP.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'atividades_tipo_entrega_check'
      AND conrelid = 'public.atividades'::regclass
  ) THEN
    ALTER TABLE public.atividades DROP CONSTRAINT atividades_tipo_entrega_check;
  END IF;

  ALTER TABLE public.atividades
    ADD CONSTRAINT atividades_tipo_entrega_check
    CHECK (tipo_entrega IN ('texto', 'imagem', 'quiz', 'multipla', 'arquivo'));
END $$;

CREATE TABLE IF NOT EXISTS public.mcp_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  tool_name text NOT NULL,
  target_type text,
  target_id uuid,
  idempotency_key text,
  request_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS mcp_audit_logs_actor_idempotency_idx
  ON public.mcp_audit_logs(actor_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS mcp_audit_logs_actor_created_at_idx
  ON public.mcp_audit_logs(actor_id, created_at DESC);

ALTER TABLE public.mcp_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "MCP actors can view own audit logs" ON public.mcp_audit_logs;
CREATE POLICY "MCP actors can view own audit logs"
  ON public.mcp_audit_logs
  FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.current_profile_role() = 'admin');

DROP POLICY IF EXISTS "MCP actors can insert own audit logs" ON public.mcp_audit_logs;
CREATE POLICY "MCP actors can insert own audit logs"
  ON public.mcp_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.is_admin_or_teacher());

REVOKE ALL ON TABLE public.mcp_audit_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.mcp_audit_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.mcp_create_lesson_bundle(
  p_modulo_id uuid,
  p_aula jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text := public.current_profile_role();
  v_course_id uuid;
  v_course_owner uuid;
  v_aula_id uuid;
  v_atividade_id uuid;
  v_title text;
  v_description text;
  v_content text;
  v_stored_content text;
  v_tipo text;
  v_numero integer;
  v_ordem integer;
  v_question jsonb;
  v_activity jsonb;
  v_question_type text;
  v_options text[];
  v_result jsonb;
  v_activity_count integer := 0;
  v_question_count integer := 0;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF v_actor_role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_aula IS NULL OR jsonb_typeof(p_aula) <> 'object' THEN
    RAISE EXCEPTION 'invalid_lesson_payload' USING ERRCODE = '22023';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    p_idempotency_key := NULLIF(BTRIM(p_idempotency_key), '');
    IF length(p_idempotency_key) > 200 THEN
      RAISE EXCEPTION 'idempotency_key_too_long' USING ERRCODE = '22023';
    END IF;

    SELECT audit.result
      INTO v_result
    FROM public.mcp_audit_logs audit
    WHERE audit.actor_id = v_actor_id
      AND audit.idempotency_key = p_idempotency_key
      AND audit.tool_name = 'criar_aula_rascunho'
    LIMIT 1;

    IF FOUND THEN
      RETURN v_result || jsonb_build_object('idempotent_replay', true);
    END IF;
  END IF;

  SELECT c.id, c.criado_por
    INTO v_course_id, v_course_owner
  FROM public.modulos m
  JOIN public.cursos c ON c.id = m.curso_id
  WHERE m.id = p_modulo_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'module_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_actor_role = 'teacher'
     AND v_course_owner IS NOT NULL
     AND v_course_owner <> v_actor_id THEN
    RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501';
  END IF;

  v_title := BTRIM(COALESCE(p_aula->>'titulo', ''));
  v_description := BTRIM(COALESCE(p_aula->>'descricao', ''));
  v_content := BTRIM(COALESCE(p_aula->>'conteudo', ''));
  v_tipo := COALESCE(NULLIF(BTRIM(p_aula->>'tipo'), ''), 'texto');

  IF length(v_title) < 3 OR length(v_title) > 200 THEN
    RAISE EXCEPTION 'invalid_lesson_title' USING ERRCODE = '22023';
  END IF;

  IF length(v_description) > 5000 OR length(v_content) > 100000 THEN
    RAISE EXCEPTION 'lesson_content_too_long' USING ERRCODE = '22023';
  END IF;

  IF v_tipo NOT IN ('video', 'texto', 'quiz', 'arquivo') THEN
    RAISE EXCEPTION 'invalid_lesson_type' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(COALESCE(p_aula->'atividades', '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(p_aula->'questoes', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'invalid_lesson_collections' USING ERRCODE = '22023';
  END IF;

  SELECT
    COALESCE(MAX(a.numero_aula), 0) + 1,
    COALESCE(MAX(a.ordem), 0) + 1
  INTO v_numero, v_ordem
  FROM public.aulas a
  WHERE a.modulo_id = p_modulo_id;

  IF p_aula ? 'numero_aula' THEN
    v_numero := (p_aula->>'numero_aula')::integer;
  END IF;
  IF p_aula ? 'ordem' THEN
    v_ordem := (p_aula->>'ordem')::integer;
  END IF;

  IF v_numero < 1 OR v_ordem < 1 THEN
    RAISE EXCEPTION 'invalid_lesson_order' USING ERRCODE = '22023';
  END IF;

  v_stored_content := v_description || '===DESCRIPTION_END===' || v_content;

  INSERT INTO public.aulas (
    modulo_id,
    titulo,
    conteudo,
    tipo,
    numero_aula,
    ordem,
    video_url,
    arquivo_url,
    pontos,
    nota_aprovacao,
    obrigatorio,
    embaralhar_questoes,
    permite_arena,
    tempo_limite,
    duracao
  ) VALUES (
    p_modulo_id,
    v_title,
    v_stored_content,
    v_tipo,
    v_numero,
    v_ordem,
    NULLIF(BTRIM(p_aula->>'video_url'), ''),
    NULLIF(BTRIM(p_aula->>'arquivo_url'), ''),
    COALESCE((p_aula->>'pontos')::integer, 100),
    COALESCE((p_aula->>'nota_aprovacao')::integer, 70),
    COALESCE((p_aula->>'obrigatorio')::boolean, true),
    COALESCE((p_aula->>'embaralhar_questoes')::boolean, true),
    COALESCE((p_aula->>'permite_arena')::boolean, true),
    (p_aula->>'tempo_limite')::integer,
    COALESCE(
      NULLIF(BTRIM(p_aula->>'duracao'), ''),
      CASE v_tipo
        WHEN 'video' THEN 'Vídeo'
        WHEN 'quiz' THEN 'Quiz'
        WHEN 'arquivo' THEN 'Material'
        ELSE 'Leitura'
      END
    )
  )
  RETURNING id INTO v_aula_id;

  FOR v_question IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_aula->'questoes', '[]'::jsonb))
  LOOP
    v_question_type := COALESCE(NULLIF(v_question->>'tipo', ''), 'multipla_escolha');
    v_options := ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(v_question->'opcoes', '[]'::jsonb))
    );

    IF BTRIM(COALESCE(v_question->>'enunciado', '')) = ''
       OR v_question_type NOT IN ('multipla_escolha', 'verdadeiro_falso', 'aberta', 'multipla_selecao') THEN
      RAISE EXCEPTION 'invalid_question' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.questoes (
      aula_id, enunciado, opcoes, resposta_correta, ordem, tipo, para_arena, atividade_id
    ) VALUES (
      v_aula_id,
      BTRIM(v_question->>'enunciado'),
      v_options,
      COALESCE(v_question->>'resposta_correta', ''),
      v_question_count + 1,
      v_question_type,
      COALESCE((v_question->>'para_arena')::boolean, false),
      NULL
    );
    v_question_count := v_question_count + 1;
  END LOOP;

  FOR v_activity IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_aula->'atividades', '[]'::jsonb))
  LOOP
    IF BTRIM(COALESCE(v_activity->>'enunciado', '')) = ''
       OR COALESCE(v_activity->>'tipo_entrega', '') NOT IN ('texto', 'imagem', 'quiz', 'multipla', 'arquivo') THEN
      RAISE EXCEPTION 'invalid_activity' USING ERRCODE = '22023';
    END IF;

    IF jsonb_typeof(COALESCE(v_activity->'questoes', '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'invalid_activity_questions' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.atividades (
      aula_id, enunciado, tipo_entrega, pontua, permite_refazer, material_url
    ) VALUES (
      v_aula_id,
      BTRIM(v_activity->>'enunciado'),
      v_activity->>'tipo_entrega',
      COALESCE((v_activity->>'pontua')::boolean, true),
      COALESCE((v_activity->>'permite_refazer')::boolean, true),
      NULLIF(BTRIM(v_activity->>'material_url'), '')
    )
    RETURNING id INTO v_atividade_id;

    v_activity_count := v_activity_count + 1;

    FOR v_question IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_activity->'questoes', '[]'::jsonb))
    LOOP
      v_question_type := COALESCE(NULLIF(v_question->>'tipo', ''), 'multipla_escolha');
      v_options := ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(v_question->'opcoes', '[]'::jsonb))
      );

      IF BTRIM(COALESCE(v_question->>'enunciado', '')) = ''
         OR v_question_type NOT IN ('multipla_escolha', 'verdadeiro_falso', 'aberta', 'multipla_selecao') THEN
        RAISE EXCEPTION 'invalid_activity_question' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.questoes (
        aula_id, enunciado, opcoes, resposta_correta, ordem, tipo, para_arena, atividade_id
      ) VALUES (
        v_aula_id,
        BTRIM(v_question->>'enunciado'),
        v_options,
        COALESCE(v_question->>'resposta_correta', ''),
        v_question_count + 1,
        v_question_type,
        false,
        v_atividade_id
      );
      v_question_count := v_question_count + 1;
    END LOOP;
  END LOOP;

  v_result := jsonb_build_object(
    'aula_id', v_aula_id,
    'curso_id', v_course_id,
    'modulo_id', p_modulo_id,
    'titulo', v_title,
    'numero_aula', v_numero,
    'ordem', v_ordem,
    'atividades_criadas', v_activity_count,
    'questoes_criadas', v_question_count,
    'liberada', false
  );

  INSERT INTO public.mcp_audit_logs (
    actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result
  ) VALUES (
    v_actor_id,
    'criar_aula_rascunho',
    'aula',
    v_aula_id,
    p_idempotency_key,
    jsonb_build_object(
      'modulo_id', p_modulo_id,
      'titulo', v_title,
      'atividades', v_activity_count,
      'questoes', v_question_count
    ),
    v_result
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_release_lesson_to_class(
  p_aula_id uuid,
  p_turma_id uuid,
  p_confirmado boolean,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text := public.current_profile_role();
  v_lesson_course_id uuid;
  v_class_course_id uuid;
  v_already_released boolean;
  v_result jsonb;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF v_actor_role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT COALESCE(p_confirmado, false) THEN
    RAISE EXCEPTION 'explicit_confirmation_required' USING ERRCODE = '22023';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    p_idempotency_key := NULLIF(BTRIM(p_idempotency_key), '');
    IF length(p_idempotency_key) > 200 THEN
      RAISE EXCEPTION 'idempotency_key_too_long' USING ERRCODE = '22023';
    END IF;

    SELECT audit.result
      INTO v_result
    FROM public.mcp_audit_logs audit
    WHERE audit.actor_id = v_actor_id
      AND audit.idempotency_key = p_idempotency_key
      AND audit.tool_name = 'liberar_aula_para_turma'
    LIMIT 1;

    IF FOUND THEN
      RETURN v_result || jsonb_build_object('idempotent_replay', true);
    END IF;
  END IF;

  SELECT m.curso_id
    INTO v_lesson_course_id
  FROM public.aulas a
  JOIN public.modulos m ON m.id = a.modulo_id
  WHERE a.id = p_aula_id;

  SELECT t.curso_id
    INTO v_class_course_id
  FROM public.turmas t
  WHERE t.id = p_turma_id;

  IF v_lesson_course_id IS NULL OR v_class_course_id IS NULL THEN
    RAISE EXCEPTION 'lesson_or_class_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_lesson_course_id <> v_class_course_id THEN
    RAISE EXCEPTION 'lesson_does_not_belong_to_class_course' USING ERRCODE = '22023';
  END IF;

  IF v_actor_role = 'teacher'
     AND NOT public.is_turma_instructor(p_turma_id, v_actor_id) THEN
    RAISE EXCEPTION 'teacher_is_not_class_instructor' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.turma_aulas_liberadas tal
    WHERE tal.turma_id = p_turma_id
      AND tal.aula_id = p_aula_id
  ) INTO v_already_released;

  INSERT INTO public.turma_aulas_liberadas (turma_id, aula_id)
  VALUES (p_turma_id, p_aula_id)
  ON CONFLICT (turma_id, aula_id) DO NOTHING;

  v_result := jsonb_build_object(
    'aula_id', p_aula_id,
    'turma_id', p_turma_id,
    'liberada', true,
    'ja_estava_liberada', v_already_released
  );

  INSERT INTO public.mcp_audit_logs (
    actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result
  ) VALUES (
    v_actor_id,
    'liberar_aula_para_turma',
    'aula',
    p_aula_id,
    p_idempotency_key,
    jsonb_build_object('turma_id', p_turma_id),
    v_result
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_create_lesson_bundle(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_release_lesson_to_class(uuid, uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_create_lesson_bundle(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_release_lesson_to_class(uuid, uuid, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.mcp_create_lesson_bundle(uuid, jsonb, text)
  IS 'Creates one complete, unreleased lesson with activities and questions atomically for MCP clients.';

COMMENT ON FUNCTION public.mcp_release_lesson_to_class(uuid, uuid, boolean, text)
  IS 'Releases a lesson to one class after explicit confirmation, with ownership checks and MCP auditing.';
