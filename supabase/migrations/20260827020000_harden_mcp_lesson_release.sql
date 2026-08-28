-- Closes the MCP draft/review/release cycle.
-- Publishing now requires the exact lesson revision and validates persisted content
-- inside the same transaction that grants access to the class.

REVOKE ALL ON FUNCTION public.mcp_release_lesson_to_class(uuid, uuid, boolean, text)
  FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.mcp_release_lesson_to_class(uuid, uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.mcp_release_lesson_to_class(
  p_aula_id uuid,
  p_turma_id uuid,
  p_revision_id timestamptz,
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
  v_role text := public.current_profile_role();
  v_lesson_course uuid;
  v_class_course uuid;
  v_current_revision timestamptz;
  v_title text;
  v_content text;
  v_tipo text;
  v_video_url text;
  v_file_url text;
  v_audit_target uuid;
  v_audit_class uuid;
  v_audit_tool text;
  v_already_released boolean;
  v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT COALESCE(p_confirmado, false) THEN
    RAISE EXCEPTION 'explicit_confirmation_required' USING ERRCODE = '22023';
  END IF;
  IF p_revision_id IS NULL THEN
    RAISE EXCEPTION 'lesson_revision_required' USING ERRCODE = '22023';
  END IF;

  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_actor_id::text || ':' || p_idempotency_key, 0));
    SELECT audit.tool_name, audit.target_id, (audit.result->>'turma_id')::uuid, audit.result
      INTO v_audit_tool, v_audit_target, v_audit_class, v_result
    FROM public.mcp_audit_logs audit
    WHERE audit.actor_id = v_actor_id
      AND audit.idempotency_key = p_idempotency_key
    LIMIT 1;
    IF FOUND THEN
      IF v_audit_tool IS DISTINCT FROM 'liberar_aula_para_turma'
        OR v_audit_target IS DISTINCT FROM p_aula_id
        OR v_audit_class IS DISTINCT FROM p_turma_id THEN
        RAISE EXCEPTION 'idempotency_key_conflict' USING ERRCODE = '22023';
      END IF;
      RETURN v_result || jsonb_build_object('idempotent_replay', true);
    END IF;
  END IF;

  SELECT m.curso_id, a.updated_at, a.titulo, a.conteudo, a.tipo, a.video_url, a.arquivo_url
    INTO v_lesson_course, v_current_revision, v_title, v_content, v_tipo, v_video_url, v_file_url
  FROM public.aulas a
  JOIN public.modulos m ON m.id = a.modulo_id
  WHERE a.id = p_aula_id
    AND a.arquivado_em IS NULL
    AND m.arquivado_em IS NULL
  FOR UPDATE OF a;

  SELECT curso_id INTO v_class_course FROM public.turmas WHERE id = p_turma_id;
  IF v_lesson_course IS NULL OR v_class_course IS NULL THEN
    RAISE EXCEPTION 'lesson_or_class_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_current_revision IS DISTINCT FROM p_revision_id THEN
    RAISE EXCEPTION 'concurrent_lesson_release' USING ERRCODE = '40001';
  END IF;
  IF v_lesson_course <> v_class_course THEN
    RAISE EXCEPTION 'lesson_does_not_belong_to_class_course' USING ERRCODE = '22023';
  END IF;
  IF v_role = 'teacher' AND NOT public.is_turma_instructor(p_turma_id, v_actor_id) THEN
    RAISE EXCEPTION 'teacher_is_not_class_instructor' USING ERRCODE = '42501';
  END IF;

  -- Validate the persisted lesson, not the payload previously seen by the client.
  v_content := btrim(CASE
    WHEN position('===DESCRIPTION_END===' IN COALESCE(v_content, '')) > 0
      THEN split_part(v_content, '===DESCRIPTION_END===', 2)
    ELSE COALESCE(v_content, '')
  END);
  IF length(btrim(COALESCE(v_title, ''))) < 3
    OR length(btrim(COALESCE(v_title, ''))) > 200
    OR COALESCE(v_tipo, '') NOT IN ('video', 'texto', 'quiz', 'arquivo')
    OR (v_tipo = 'texto' AND length(v_content) < 20)
    OR (v_tipo = 'video' AND COALESCE(v_video_url, '') !~* '^https?://[^[:space:]]+$')
    OR (v_tipo = 'arquivo' AND COALESCE(v_file_url, '') !~* '^https?://[^[:space:]]+$') THEN
    RAISE EXCEPTION 'lesson_invalid_for_release' USING ERRCODE = '22023';
  END IF;

  IF v_tipo = 'quiz' AND NOT EXISTS (
    SELECT 1 FROM public.questoes q
    WHERE q.aula_id = p_aula_id
      AND q.contexto = 'aula'
      AND q.atividade_id IS NULL
      AND NOT COALESCE(q.para_arena, false)
  ) THEN
    RAISE EXCEPTION 'lesson_invalid_for_release' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.atividades activity
    WHERE activity.aula_id = p_aula_id
      AND (
        length(btrim(COALESCE(activity.enunciado, ''))) < 3
        OR activity.tipo_entrega NOT IN ('texto', 'imagem', 'quiz', 'multipla', 'arquivo')
        OR (activity.material_url IS NOT NULL AND activity.material_url !~* '^https?://[^[:space:]]+$')
        OR (activity.tipo_entrega = 'quiz' AND NOT EXISTS (
          SELECT 1 FROM public.questoes q WHERE q.atividade_id = activity.id
        ))
        OR (activity.tipo_entrega <> 'quiz' AND EXISTS (
          SELECT 1 FROM public.questoes q WHERE q.atividade_id = activity.id
        ))
      )
  ) THEN
    RAISE EXCEPTION 'lesson_invalid_for_release' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.aula_materiais material
    WHERE material.aula_id = p_aula_id
      AND (
        length(btrim(COALESCE(material.titulo, ''))) < 2
        OR COALESCE(material.url, '') !~* '^https?://[^[:space:]]+$'
      )
  ) THEN
    RAISE EXCEPTION 'lesson_invalid_for_release' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.questoes q
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN jsonb_typeof(q.opcoes_estruturadas) = 'array'
          THEN jsonb_array_length(q.opcoes_estruturadas)
        ELSE 0
      END AS option_count,
      CASE
        WHEN jsonb_typeof(q.opcoes_estruturadas) = 'array'
          THEN q.opcoes_estruturadas
        ELSE '[]'::jsonb
      END AS structured_options
    ) options
    WHERE q.aula_id = p_aula_id
      AND (
        length(btrim(COALESCE(q.enunciado, ''))) < 3
        OR COALESCE(q.tipo, '') NOT IN ('multipla_escolha', 'verdadeiro_falso', 'aberta', 'multipla_selecao')
        OR (q.tipo <> 'aberta' AND (
          options.option_count < 2
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(options.structured_options) option_data
            WHERE length(btrim(COALESCE(option_data->>'id', ''))) = 0
              OR length(btrim(COALESCE(option_data->>'texto', ''))) = 0
          )
          OR options.option_count <> (
            SELECT count(DISTINCT lower(btrim(option_data->>'id')))
            FROM jsonb_array_elements(options.structured_options) option_data
          )
          OR options.option_count <> (
            SELECT count(DISTINCT lower(btrim(option_data->>'texto')))
            FROM jsonb_array_elements(options.structured_options) option_data
          )
          OR cardinality(q.respostas_corretas) = 0
          OR EXISTS (
            SELECT 1
            FROM unnest(q.respostas_corretas) answer_id
            WHERE NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(options.structured_options) option_data
              WHERE lower(option_data->>'id') = lower(answer_id)
            )
          )
          OR cardinality(q.respostas_corretas) <> (
            SELECT count(DISTINCT lower(answer_id)) FROM unnest(q.respostas_corretas) answer_id
          )
        ))
        OR (q.tipo IN ('multipla_escolha', 'verdadeiro_falso') AND cardinality(q.respostas_corretas) <> 1)
        OR (q.tipo = 'multipla_selecao' AND (
          cardinality(q.respostas_corretas) NOT BETWEEN 2 AND 3
          OR cardinality(q.respostas_corretas) >= options.option_count
        ))
        OR (q.tipo = 'verdadeiro_falso' AND (
          options.option_count <> 2
          OR NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(options.structured_options) option_data
            WHERE lower(option_data->>'texto') = 'verdadeiro'
          )
          OR NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(options.structured_options) option_data
            WHERE lower(option_data->>'texto') = 'falso'
          )
        ))
        OR (q.contexto = 'arena' AND (
          length(btrim(COALESCE(q.enunciado, ''))) > 120
          OR q.tipo NOT IN ('multipla_escolha', 'verdadeiro_falso')
          OR (q.tipo = 'multipla_escolha' AND options.option_count > 4)
        ))
      )
  ) THEN
    RAISE EXCEPTION 'lesson_invalid_for_release' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.turma_aulas_liberadas
    WHERE aula_id = p_aula_id AND turma_id = p_turma_id
  ) INTO v_already_released;

  INSERT INTO public.turma_aulas_liberadas(aula_id, turma_id)
  VALUES (p_aula_id, p_turma_id)
  ON CONFLICT (turma_id, aula_id) DO NOTHING;

  v_result := jsonb_build_object(
    'aula_id', p_aula_id,
    'turma_id', p_turma_id,
    'revision_id', v_current_revision,
    'liberada', true,
    'ja_estava_liberada', v_already_released
  );
  INSERT INTO public.mcp_audit_logs(
    actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result
  ) VALUES (
    v_actor_id, 'liberar_aula_para_turma', 'aula', p_aula_id, p_idempotency_key,
    jsonb_build_object('turma_id', p_turma_id, 'revision_id', p_revision_id), v_result
  );
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_release_lesson_to_class(uuid, uuid, timestamptz, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_release_lesson_to_class(uuid, uuid, timestamptz, boolean, text)
  TO authenticated;

COMMENT ON FUNCTION public.mcp_release_lesson_to_class(uuid, uuid, timestamptz, boolean, text)
  IS 'Revalida e libera atomicamente uma aula para uma turma usando revisão otimista, confirmação, idempotência e auditoria.';
