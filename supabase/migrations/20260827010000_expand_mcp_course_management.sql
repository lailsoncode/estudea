-- Expands the Estudea MCP from lesson creation to safe course management.
-- Existing lesson/question columns remain compatible with the current web UI.

ALTER TABLE public.modulos
  ADD COLUMN IF NOT EXISTS carga_horaria text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

ALTER TABLE public.aulas
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz,
  ADD COLUMN IF NOT EXISTS embaralhar_opcoes boolean NOT NULL DEFAULT true;

ALTER TABLE public.questoes
  ADD COLUMN IF NOT EXISTS opcoes_estruturadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS respostas_corretas text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS contexto text NOT NULL DEFAULT 'aula';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questoes_contexto_check'
      AND conrelid = 'public.questoes'::regclass
  ) THEN
    ALTER TABLE public.questoes
      ADD CONSTRAINT questoes_contexto_check
      CHECK (contexto IN ('aula', 'atividade', 'arena'));
  END IF;
END $$;

UPDATE public.questoes q
SET contexto = CASE
  WHEN q.atividade_id IS NOT NULL THEN 'atividade'
  WHEN COALESCE(q.para_arena, false) THEN 'arena'
  ELSE 'aula'
END
WHERE q.contexto = 'aula'
  AND (q.atividade_id IS NOT NULL OR COALESCE(q.para_arena, false));

UPDATE public.questoes q
SET opcoes_estruturadas = COALESCE((
  SELECT jsonb_agg(jsonb_build_object(
    'id', chr(96 + option_data.position::integer),
    'texto', option_data.option_text
  ) ORDER BY option_data.position)
  FROM unnest(q.opcoes) WITH ORDINALITY AS option_data(option_text, position)
), '[]'::jsonb)
WHERE q.opcoes_estruturadas = '[]'::jsonb
  AND cardinality(q.opcoes) > 0;

UPDATE public.questoes q
SET respostas_corretas = ARRAY(
  SELECT COALESCE((
    SELECT option_data->>'id'
    FROM jsonb_array_elements(q.opcoes_estruturadas) option_data
    WHERE lower(option_data->>'texto') = lower(btrim(answer_text))
    LIMIT 1
  ), btrim(answer_text))
  FROM unnest(string_to_array(q.resposta_correta, ';')) answer_text
  WHERE btrim(answer_text) <> ''
)
WHERE cardinality(q.respostas_corretas) = 0
  AND btrim(COALESCE(q.resposta_correta, '')) <> '';

CREATE TABLE IF NOT EXISTS public.aula_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  url text NOT NULL,
  tipo text NOT NULL DEFAULT 'arquivo'
    CHECK (tipo IN ('imagem', 'arquivo', 'video', 'link', 'referencia')),
  uso text NOT NULL DEFAULT 'consulta'
    CHECK (uso IN ('atividade_pratica', 'consulta', 'leitura', 'download', 'referencia')),
  obrigatorio boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aula_arena_config (
  aula_id uuid PRIMARY KEY REFERENCES public.aulas(id) ON DELETE CASCADE,
  habilitada boolean NOT NULL DEFAULT false,
  embaralhar_questoes boolean NOT NULL DEFAULT true,
  embaralhar_opcoes boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aula_registros_ministrados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  conteudo_da_aula text NOT NULL,
  atividades_realizadas text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aula_id, professor_id)
);

CREATE INDEX IF NOT EXISTS aula_materiais_aula_id_idx ON public.aula_materiais(aula_id);
CREATE INDEX IF NOT EXISTS aula_registros_aula_id_idx ON public.aula_registros_ministrados(aula_id);
CREATE INDEX IF NOT EXISTS modulos_curso_ativos_ordem_idx
  ON public.modulos(curso_id, ordem) WHERE arquivado_em IS NULL;
CREATE INDEX IF NOT EXISTS aulas_modulo_ativas_ordem_idx
  ON public.aulas(modulo_id, ordem) WHERE arquivado_em IS NULL;

CREATE OR REPLACE FUNCTION public.mcp_set_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mcp_modulos_updated_at ON public.modulos;
CREATE TRIGGER trg_mcp_modulos_updated_at
  BEFORE UPDATE ON public.modulos
  FOR EACH ROW EXECUTE FUNCTION public.mcp_set_content_updated_at();

DROP TRIGGER IF EXISTS trg_mcp_aulas_updated_at ON public.aulas;
CREATE TRIGGER trg_mcp_aulas_updated_at
  BEFORE UPDATE ON public.aulas
  FOR EACH ROW EXECUTE FUNCTION public.mcp_set_content_updated_at();

DROP TRIGGER IF EXISTS trg_mcp_aula_materiais_updated_at ON public.aula_materiais;
CREATE TRIGGER trg_mcp_aula_materiais_updated_at
  BEFORE UPDATE ON public.aula_materiais
  FOR EACH ROW EXECUTE FUNCTION public.mcp_set_content_updated_at();

DROP TRIGGER IF EXISTS trg_mcp_aula_arena_updated_at ON public.aula_arena_config;
CREATE TRIGGER trg_mcp_aula_arena_updated_at
  BEFORE UPDATE ON public.aula_arena_config
  FOR EACH ROW EXECUTE FUNCTION public.mcp_set_content_updated_at();

DROP TRIGGER IF EXISTS trg_mcp_aula_registros_updated_at ON public.aula_registros_ministrados;
CREATE TRIGGER trg_mcp_aula_registros_updated_at
  BEFORE UPDATE ON public.aula_registros_ministrados
  FOR EACH ROW EXECUTE FUNCTION public.mcp_set_content_updated_at();

ALTER TABLE public.aula_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_arena_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_registros_ministrados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lesson materials are viewable by enrolled students and staff" ON public.aula_materiais;
CREATE POLICY "Lesson materials are viewable by enrolled students and staff"
  ON public.aula_materiais FOR SELECT TO authenticated
  USING (
    public.is_admin_or_teacher()
    OR EXISTS (
      SELECT 1
      FROM public.aulas a
      JOIN public.modulos m ON m.id = a.modulo_id
      JOIN public.turmas t ON t.curso_id = m.curso_id
      JOIN public.profiles p ON p.turma_id = t.id
      WHERE a.id = aula_materiais.aula_id AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Lesson materials can be managed by staff" ON public.aula_materiais;
CREATE POLICY "Lesson materials can be managed by staff"
  ON public.aula_materiais FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

DROP POLICY IF EXISTS "Arena config can be managed by staff" ON public.aula_arena_config;
CREATE POLICY "Arena config can be managed by staff"
  ON public.aula_arena_config FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

DROP POLICY IF EXISTS "Staff can view taught lesson records" ON public.aula_registros_ministrados;
CREATE POLICY "Staff can view taught lesson records"
  ON public.aula_registros_ministrados FOR SELECT TO authenticated
  USING (public.current_profile_role() = 'admin' OR professor_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage own taught lesson records" ON public.aula_registros_ministrados;
CREATE POLICY "Staff can manage own taught lesson records"
  ON public.aula_registros_ministrados FOR ALL TO authenticated
  USING (public.current_profile_role() = 'admin' OR professor_id = auth.uid())
  WITH CHECK (public.current_profile_role() = 'admin' OR professor_id = auth.uid());

REVOKE ALL ON TABLE public.aula_materiais, public.aula_arena_config, public.aula_registros_ministrados FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.aula_materiais, public.aula_arena_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.aula_registros_ministrados TO authenticated;

CREATE OR REPLACE FUNCTION public.mcp_create_module(
  p_curso_id uuid,
  p_titulo text,
  p_ordem integer DEFAULT NULL,
  p_carga_horaria text DEFAULT NULL,
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
  v_owner uuid;
  v_module public.modulos%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs
    WHERE actor_id = v_actor_id AND idempotency_key = p_idempotency_key AND tool_name = 'criar_modulo' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT criado_por INTO v_owner FROM public.cursos WHERE id = p_curso_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'course_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_role = 'teacher' AND v_owner IS NOT NULL AND v_owner <> v_actor_id THEN
    RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501';
  END IF;
  p_titulo := btrim(COALESCE(p_titulo, ''));
  IF length(p_titulo) < 3 OR length(p_titulo) > 200 THEN RAISE EXCEPTION 'invalid_module_title' USING ERRCODE = '22023'; END IF;
  IF p_ordem IS NULL THEN
    SELECT COALESCE(max(ordem), 0) + 1 INTO p_ordem FROM public.modulos WHERE curso_id = p_curso_id AND arquivado_em IS NULL;
  END IF;
  IF p_ordem < 1 THEN RAISE EXCEPTION 'invalid_module_order' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.modulos WHERE curso_id = p_curso_id AND ordem = p_ordem AND arquivado_em IS NULL) THEN
    RAISE EXCEPTION 'module_order_already_exists' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.modulos(curso_id, titulo, ordem, carga_horaria)
  VALUES (p_curso_id, p_titulo, p_ordem, NULLIF(btrim(p_carga_horaria), '')) RETURNING * INTO v_module;
  v_result := jsonb_build_object('modulo_id', v_module.id, 'curso_id', p_curso_id, 'titulo', v_module.titulo,
    'ordem', v_module.ordem, 'carga_horaria', v_module.carga_horaria, 'revision_id', v_module.updated_at);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'criar_modulo', 'modulo', v_module.id, p_idempotency_key,
    jsonb_build_object('curso_id', p_curso_id, 'titulo', p_titulo), v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_update_module(
  p_modulo_id uuid,
  p_revision_id timestamptz,
  p_alteracoes jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role(); v_owner uuid;
  v_module public.modulos%ROWTYPE; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'atualizar_modulo' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT m.* INTO v_module FROM public.modulos m WHERE m.id = p_modulo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'module_not_found' USING ERRCODE = 'P0002'; END IF;
  SELECT c.criado_por INTO v_owner FROM public.cursos c WHERE c.id = v_module.curso_id;
  IF v_role = 'teacher' AND v_owner IS NOT NULL AND v_owner <> v_actor_id THEN RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501'; END IF;
  IF v_module.updated_at <> p_revision_id THEN RAISE EXCEPTION 'concurrent_module_update' USING ERRCODE = '40001'; END IF;
  UPDATE public.modulos SET
    titulo = CASE WHEN p_alteracoes ? 'titulo' THEN btrim(p_alteracoes->>'titulo') ELSE titulo END,
    ordem = CASE WHEN p_alteracoes ? 'ordem' THEN (p_alteracoes->>'ordem')::integer ELSE ordem END,
    carga_horaria = CASE WHEN p_alteracoes ? 'carga_horaria' THEN NULLIF(btrim(p_alteracoes->>'carga_horaria'), '') ELSE carga_horaria END
  WHERE id = p_modulo_id RETURNING * INTO v_module;
  IF length(v_module.titulo) < 3 OR v_module.ordem < 1 THEN RAISE EXCEPTION 'invalid_module_update' USING ERRCODE = '22023'; END IF;
  v_result := jsonb_build_object('modulo_id', v_module.id, 'titulo', v_module.titulo, 'ordem', v_module.ordem,
    'carga_horaria', v_module.carga_horaria, 'revision_id', v_module.updated_at);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'atualizar_modulo', 'modulo', p_modulo_id, p_idempotency_key, p_alteracoes, v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_reorder_modules(
  p_curso_id uuid, p_modulos jsonb, p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role(); v_owner uuid;
  v_item jsonb; v_count integer; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(p_modulos) <> 'array' OR jsonb_array_length(p_modulos) = 0 THEN RAISE EXCEPTION 'invalid_modules_order' USING ERRCODE = '22023'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'reordenar_modulos' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT criado_por INTO v_owner FROM public.cursos WHERE id = p_curso_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'course_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_role = 'teacher' AND v_owner IS NOT NULL AND v_owner <> v_actor_id THEN RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_modulos) GROUP BY value->>'ordem' HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate_module_order' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_count FROM public.modulos m
  JOIN jsonb_array_elements(p_modulos) item ON m.id = (item.value->>'id')::uuid
  WHERE m.curso_id = p_curso_id;
  IF v_count <> jsonb_array_length(p_modulos) THEN RAISE EXCEPTION 'module_not_in_course' USING ERRCODE = '22023'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_modulos) LOOP
    UPDATE public.modulos SET ordem = (v_item->>'ordem')::integer WHERE id = (v_item->>'id')::uuid;
  END LOOP;
  v_result := jsonb_build_object('curso_id', p_curso_id, 'quantidade', v_count, 'reordenado', true);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'reordenar_modulos', 'curso', p_curso_id, p_idempotency_key,
    jsonb_build_object('quantidade', v_count), v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_archive_module(
  p_modulo_id uuid, p_confirmado boolean, p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role(); v_owner uuid; v_course_id uuid; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT COALESCE(p_confirmado, false) THEN RAISE EXCEPTION 'explicit_confirmation_required' USING ERRCODE = '22023'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'arquivar_modulo' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT m.curso_id, c.criado_por INTO v_course_id, v_owner FROM public.modulos m JOIN public.cursos c ON c.id = m.curso_id WHERE m.id = p_modulo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'module_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_role = 'teacher' AND v_owner IS NOT NULL AND v_owner <> v_actor_id THEN RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.aulas a JOIN public.turma_aulas_liberadas tal ON tal.aula_id = a.id WHERE a.modulo_id = p_modulo_id) THEN
    RAISE EXCEPTION 'module_has_released_lessons' USING ERRCODE = '22023';
  END IF;
  UPDATE public.aulas SET arquivado_em = COALESCE(arquivado_em, now()) WHERE modulo_id = p_modulo_id;
  UPDATE public.modulos SET arquivado_em = COALESCE(arquivado_em, now()) WHERE id = p_modulo_id;
  v_result := jsonb_build_object('modulo_id', p_modulo_id, 'curso_id', v_course_id, 'arquivado', true);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'arquivar_modulo', 'modulo', p_modulo_id, p_idempotency_key, '{}'::jsonb, v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_update_lesson_draft(
  p_aula_id uuid,
  p_revision_id timestamptz,
  p_aula jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role();
  v_owner uuid; v_course_id uuid; v_module_id uuid; v_current_revision timestamptz;
  v_activity_id uuid; v_activity jsonb; v_question jsonb; v_material jsonb;
  v_options text[]; v_answers text[]; v_question_count integer := 0; v_arena_count integer := 0;
  v_activity_count integer := 0; v_material_count integer := 0; v_result jsonb;
  v_description text; v_content text; v_title text; v_tipo text; v_new_revision timestamptz;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_aula IS NULL OR jsonb_typeof(p_aula) <> 'object' THEN RAISE EXCEPTION 'invalid_lesson_payload' USING ERRCODE = '22023'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'atualizar_aula_rascunho' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT a.updated_at, a.modulo_id, m.curso_id, c.criado_por
    INTO v_current_revision, v_module_id, v_course_id, v_owner
  FROM public.aulas a JOIN public.modulos m ON m.id = a.modulo_id JOIN public.cursos c ON c.id = m.curso_id
  WHERE a.id = p_aula_id AND a.arquivado_em IS NULL AND m.arquivado_em IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'lesson_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_role = 'teacher' AND v_owner IS NOT NULL AND v_owner <> v_actor_id THEN RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501'; END IF;
  IF v_current_revision <> p_revision_id THEN RAISE EXCEPTION 'concurrent_lesson_update' USING ERRCODE = '40001'; END IF;
  IF EXISTS (SELECT 1 FROM public.turma_aulas_liberadas WHERE aula_id = p_aula_id) THEN
    RAISE EXCEPTION 'released_lesson_cannot_be_edited' USING ERRCODE = '22023';
  END IF;
  v_title := btrim(COALESCE(p_aula->>'titulo', ''));
  v_description := btrim(COALESCE(p_aula->>'descricao', ''));
  v_content := btrim(COALESCE(p_aula->>'conteudo', ''));
  v_tipo := COALESCE(NULLIF(btrim(p_aula->>'tipo'), ''), 'texto');
  IF length(v_title) < 3 OR length(v_title) > 200 THEN RAISE EXCEPTION 'invalid_lesson_title' USING ERRCODE = '22023'; END IF;
  IF v_tipo NOT IN ('video', 'texto', 'quiz', 'arquivo') THEN RAISE EXCEPTION 'invalid_lesson_type' USING ERRCODE = '22023'; END IF;
  IF jsonb_typeof(COALESCE(p_aula->'questoes', '[]')) <> 'array'
    OR jsonb_typeof(COALESCE(p_aula->'atividades', '[]')) <> 'array'
    OR jsonb_typeof(COALESCE(p_aula->'materiais', '[]')) <> 'array' THEN
    RAISE EXCEPTION 'invalid_lesson_collections' USING ERRCODE = '22023';
  END IF;
  UPDATE public.aulas SET
    titulo = v_title, conteudo = v_description || '===DESCRIPTION_END===' || v_content, tipo = v_tipo,
    duracao = COALESCE(NULLIF(btrim(p_aula->>'duracao'), ''), duracao),
    numero_aula = COALESCE((p_aula->>'numero_aula')::integer, numero_aula),
    ordem = COALESCE((p_aula->>'ordem')::integer, ordem),
    video_url = NULLIF(btrim(p_aula->>'video_url'), ''), arquivo_url = NULLIF(btrim(p_aula->>'arquivo_url'), ''),
    pontos = COALESCE((p_aula->>'pontos')::integer, 100), nota_aprovacao = COALESCE((p_aula->>'nota_aprovacao')::integer, 70),
    obrigatorio = COALESCE((p_aula->>'obrigatorio')::boolean, true),
    embaralhar_questoes = COALESCE((p_aula->>'embaralhar_questoes')::boolean, true),
    embaralhar_opcoes = COALESCE((p_aula->>'embaralhar_opcoes')::boolean, true),
    permite_arena = COALESCE((p_aula->'arena'->>'habilitada')::boolean, (p_aula->>'permite_arena')::boolean, false),
    tempo_limite = (p_aula->>'tempo_limite')::integer
  WHERE id = p_aula_id RETURNING updated_at INTO v_new_revision;

  DELETE FROM public.questoes WHERE aula_id = p_aula_id;
  DELETE FROM public.atividades WHERE aula_id = p_aula_id;
  DELETE FROM public.aula_materiais WHERE aula_id = p_aula_id;
  DELETE FROM public.aula_arena_config WHERE aula_id = p_aula_id;

  FOR v_question IN SELECT value FROM jsonb_array_elements(COALESCE(p_aula->'questoes', '[]')) LOOP
    v_options := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_question->'opcoes', '[]')));
    v_answers := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_question->'respostas_corretas', '[]')));
    INSERT INTO public.questoes(aula_id, enunciado, opcoes, resposta_correta, ordem, tipo, para_arena,
      atividade_id, opcoes_estruturadas, respostas_corretas, contexto)
    VALUES (p_aula_id, btrim(v_question->>'enunciado'), v_options, COALESCE(v_question->>'resposta_correta', ''),
      COALESCE((v_question->>'ordem')::integer, v_question_count + 1), COALESCE(v_question->>'tipo', 'multipla_escolha'),
      COALESCE((v_question->>'para_arena')::boolean, false), NULL,
      COALESCE(v_question->'opcoes_estruturadas', '[]'), v_answers, 'aula');
    v_question_count := v_question_count + 1;
  END LOOP;

  FOR v_activity IN SELECT value FROM jsonb_array_elements(COALESCE(p_aula->'atividades', '[]')) LOOP
    INSERT INTO public.atividades(aula_id, enunciado, tipo_entrega, pontua, permite_refazer, material_url)
    VALUES (p_aula_id, btrim(v_activity->>'enunciado'), v_activity->>'tipo_entrega',
      COALESCE((v_activity->>'pontua')::boolean, true), COALESCE((v_activity->>'permite_refazer')::boolean, true),
      NULLIF(btrim(v_activity->>'material_url'), '')) RETURNING id INTO v_activity_id;
    v_activity_count := v_activity_count + 1;
    FOR v_question IN SELECT value FROM jsonb_array_elements(COALESCE(v_activity->'questoes', '[]')) LOOP
      v_options := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_question->'opcoes', '[]')));
      v_answers := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_question->'respostas_corretas', '[]')));
      INSERT INTO public.questoes(aula_id, enunciado, opcoes, resposta_correta, ordem, tipo, para_arena,
        atividade_id, opcoes_estruturadas, respostas_corretas, contexto)
      VALUES (p_aula_id, btrim(v_question->>'enunciado'), v_options, COALESCE(v_question->>'resposta_correta', ''),
        COALESCE((v_question->>'ordem')::integer, v_question_count + 1), COALESCE(v_question->>'tipo', 'multipla_escolha'),
        false, v_activity_id, COALESCE(v_question->'opcoes_estruturadas', '[]'), v_answers, 'atividade');
      v_question_count := v_question_count + 1;
    END LOOP;
  END LOOP;

  IF jsonb_typeof(p_aula->'arena') = 'object' THEN
    INSERT INTO public.aula_arena_config(aula_id, habilitada, embaralhar_questoes, embaralhar_opcoes)
    VALUES (p_aula_id, COALESCE((p_aula->'arena'->>'habilitada')::boolean, false),
      COALESCE((p_aula->'arena'->>'embaralhar_questoes')::boolean, true),
      COALESCE((p_aula->'arena'->>'embaralhar_opcoes')::boolean, true));
    FOR v_question IN SELECT value FROM jsonb_array_elements(COALESCE(p_aula->'arena'->'questoes', '[]')) LOOP
      v_options := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_question->'opcoes', '[]')));
      v_answers := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_question->'respostas_corretas', '[]')));
      INSERT INTO public.questoes(aula_id, enunciado, opcoes, resposta_correta, ordem, tipo, para_arena,
        atividade_id, opcoes_estruturadas, respostas_corretas, contexto)
      VALUES (p_aula_id, btrim(v_question->>'enunciado'), v_options, COALESCE(v_question->>'resposta_correta', ''),
        COALESCE((v_question->>'ordem')::integer, v_arena_count + 1), COALESCE(v_question->>'tipo', 'multipla_escolha'),
        true, NULL, COALESCE(v_question->'opcoes_estruturadas', '[]'), v_answers, 'arena');
      v_arena_count := v_arena_count + 1;
    END LOOP;
  END IF;

  FOR v_material IN SELECT value FROM jsonb_array_elements(COALESCE(p_aula->'materiais', '[]')) LOOP
    INSERT INTO public.aula_materiais(aula_id, titulo, url, tipo, uso, obrigatorio)
    VALUES (p_aula_id, btrim(v_material->>'titulo'), btrim(v_material->>'url'),
      COALESCE(v_material->>'tipo', 'arquivo'), COALESCE(v_material->>'uso', 'consulta'),
      COALESCE((v_material->>'obrigatorio')::boolean, false));
    v_material_count := v_material_count + 1;
  END LOOP;

  v_result := jsonb_build_object('aula_id', p_aula_id, 'curso_id', v_course_id, 'modulo_id', v_module_id,
    'titulo', v_title, 'atividades', v_activity_count, 'questoes_estudea', v_question_count,
    'questoes_arena', v_arena_count, 'materiais', v_material_count, 'revision_id', v_new_revision, 'liberada', false);
  IF COALESCE(current_setting('app.mcp_creating_lesson', true), '') <> 'true' THEN
    INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
    VALUES (v_actor_id, 'atualizar_aula_rascunho', 'aula', p_aula_id, p_idempotency_key,
      jsonb_build_object('titulo', v_title, 'atividades', v_activity_count, 'questoes', v_question_count + v_arena_count), v_result);
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_create_lesson_bundle(
  p_modulo_id uuid, p_aula jsonb, p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role(); v_course_id uuid; v_owner uuid;
  v_aula_id uuid; v_revision timestamptz; v_number integer; v_order integer; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'criar_aula_rascunho' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT m.curso_id, c.criado_por INTO v_course_id, v_owner FROM public.modulos m
  JOIN public.cursos c ON c.id = m.curso_id WHERE m.id = p_modulo_id AND m.arquivado_em IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'module_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_role = 'teacher' AND v_owner IS NOT NULL AND v_owner <> v_actor_id THEN RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(max(numero_aula), 0) + 1, COALESCE(max(ordem), 0) + 1 INTO v_number, v_order
  FROM public.aulas WHERE modulo_id = p_modulo_id AND arquivado_em IS NULL;
  v_number := COALESCE((p_aula->>'numero_aula')::integer, v_number);
  v_order := COALESCE((p_aula->>'ordem')::integer, v_order);
  IF v_number < 1 OR v_order < 1 THEN RAISE EXCEPTION 'invalid_lesson_order' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.aulas(modulo_id, titulo, conteudo, tipo, numero_aula, ordem, duracao)
  VALUES (p_modulo_id, btrim(COALESCE(p_aula->>'titulo', 'Aula em criação')), '',
    COALESCE(p_aula->>'tipo', 'texto'), v_number, v_order, COALESCE(NULLIF(btrim(p_aula->>'duracao'), ''), 'Leitura'))
  RETURNING id, updated_at INTO v_aula_id, v_revision;
  PERFORM set_config('app.mcp_creating_lesson', 'true', true);
  SELECT public.mcp_update_lesson_draft(v_aula_id, v_revision,
    p_aula || jsonb_build_object('numero_aula', v_number, 'ordem', v_order), NULL) INTO v_result;
  PERFORM set_config('app.mcp_creating_lesson', 'false', true);
  v_result := v_result || jsonb_build_object('numero_aula', v_number, 'ordem', v_order);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'criar_aula_rascunho', 'aula', v_aula_id, p_idempotency_key,
    jsonb_build_object('modulo_id', p_modulo_id, 'titulo', p_aula->>'titulo'), v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_reorder_lessons(
  p_modulo_id uuid, p_aulas jsonb, p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role(); v_owner uuid;
  v_item jsonb; v_count integer; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(p_aulas) <> 'array' OR jsonb_array_length(p_aulas) = 0 THEN RAISE EXCEPTION 'invalid_lessons_order' USING ERRCODE = '22023'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'reordenar_aulas' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT c.criado_por INTO v_owner FROM public.modulos m JOIN public.cursos c ON c.id = m.curso_id WHERE m.id = p_modulo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'module_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_role = 'teacher' AND v_owner IS NOT NULL AND v_owner <> v_actor_id THEN RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_aulas) GROUP BY value->>'ordem' HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate_lesson_order' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_count FROM public.aulas a JOIN jsonb_array_elements(p_aulas) item ON a.id = (item.value->>'id')::uuid
  WHERE a.modulo_id = p_modulo_id;
  IF v_count <> jsonb_array_length(p_aulas) THEN RAISE EXCEPTION 'lesson_not_in_module' USING ERRCODE = '22023'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_aulas) LOOP
    UPDATE public.aulas SET ordem = (v_item->>'ordem')::integer,
      numero_aula = CASE WHEN v_item ? 'numero_aula' THEN (v_item->>'numero_aula')::integer ELSE numero_aula END
    WHERE id = (v_item->>'id')::uuid;
  END LOOP;
  v_result := jsonb_build_object('modulo_id', p_modulo_id, 'quantidade', v_count, 'reordenado', true);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'reordenar_aulas', 'modulo', p_modulo_id, p_idempotency_key,
    jsonb_build_object('quantidade', v_count), v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_archive_lesson(
  p_aula_id uuid, p_confirmado boolean, p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role(); v_owner uuid; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT COALESCE(p_confirmado, false) THEN RAISE EXCEPTION 'explicit_confirmation_required' USING ERRCODE = '22023'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'arquivar_aula' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT c.criado_por INTO v_owner FROM public.aulas a JOIN public.modulos m ON m.id = a.modulo_id
  JOIN public.cursos c ON c.id = m.curso_id WHERE a.id = p_aula_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lesson_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_role = 'teacher' AND v_owner IS NOT NULL AND v_owner <> v_actor_id THEN RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.turma_aulas_liberadas WHERE aula_id = p_aula_id) THEN
    RAISE EXCEPTION 'released_lesson_cannot_be_archived' USING ERRCODE = '22023';
  END IF;
  UPDATE public.aulas SET arquivado_em = COALESCE(arquivado_em, now()) WHERE id = p_aula_id;
  v_result := jsonb_build_object('aula_id', p_aula_id, 'arquivada', true);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'arquivar_aula', 'aula', p_aula_id, p_idempotency_key, '{}'::jsonb, v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_create_lessons_batch(
  p_modulo_id uuid, p_aulas jsonb, p_idempotency_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_item jsonb; v_index integer := 0; v_created jsonb := '[]'; v_lesson jsonb; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR public.current_profile_role() NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'batch_idempotency_key_required' USING ERRCODE = '22023'; END IF;
  SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
    AND idempotency_key = p_idempotency_key AND tool_name = 'criar_aulas_em_lote' LIMIT 1;
  IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  IF jsonb_typeof(p_aulas) <> 'array' OR jsonb_array_length(p_aulas) = 0 OR jsonb_array_length(p_aulas) > 100 THEN
    RAISE EXCEPTION 'invalid_lesson_batch' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_aulas) WHERE value ? 'ordem' GROUP BY value->>'ordem' HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate_lesson_order_in_batch' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_aulas) WHERE value ? 'numero_aula' GROUP BY value->>'numero_aula' HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate_lesson_number_in_batch' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_aulas) GROUP BY lower(btrim(value->>'titulo')) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate_lesson_title_in_batch' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_aulas) item
    JOIN public.aulas a ON a.modulo_id = p_modulo_id AND a.arquivado_em IS NULL
    WHERE lower(btrim(a.titulo)) = lower(btrim(item.value->>'titulo'))
      OR (item.value ? 'ordem' AND a.ordem = (item.value->>'ordem')::integer)
      OR (item.value ? 'numero_aula' AND a.numero_aula = (item.value->>'numero_aula')::integer)
  ) THEN
    RAISE EXCEPTION 'lesson_batch_conflicts_with_existing' USING ERRCODE = '23505';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_aulas) LOOP
    v_index := v_index + 1;
    SELECT public.mcp_create_lesson_bundle(p_modulo_id, v_item, p_idempotency_key || ':' || v_index::text) INTO v_lesson;
    v_created := v_created || jsonb_build_array(v_lesson);
  END LOOP;
  v_result := jsonb_build_object('modulo_id', p_modulo_id, 'quantidade', v_index, 'aulas', v_created, 'liberadas', 0);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'criar_aulas_em_lote', 'modulo', p_modulo_id, p_idempotency_key,
    jsonb_build_object('quantidade', v_index), v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_register_taught_lesson(
  p_aula_id uuid, p_conteudo_da_aula text, p_atividades_realizadas text, p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role(); v_owner uuid; v_record public.aula_registros_ministrados%ROWTYPE; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'registrar_aula_ministrada' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT c.criado_por INTO v_owner FROM public.aulas a JOIN public.modulos m ON m.id = a.modulo_id
  JOIN public.cursos c ON c.id = m.curso_id WHERE a.id = p_aula_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lesson_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_role = 'teacher' AND v_owner IS NOT NULL AND v_owner <> v_actor_id THEN RAISE EXCEPTION 'course_not_owned_by_teacher' USING ERRCODE = '42501'; END IF;
  IF length(btrim(COALESCE(p_conteudo_da_aula, ''))) < 3 OR length(btrim(COALESCE(p_atividades_realizadas, ''))) < 3 THEN
    RAISE EXCEPTION 'invalid_taught_lesson_record' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.aula_registros_ministrados(aula_id, professor_id, conteudo_da_aula, atividades_realizadas)
  VALUES (p_aula_id, v_actor_id, btrim(p_conteudo_da_aula), btrim(p_atividades_realizadas))
  ON CONFLICT (aula_id, professor_id) DO UPDATE SET conteudo_da_aula = EXCLUDED.conteudo_da_aula,
    atividades_realizadas = EXCLUDED.atividades_realizadas RETURNING * INTO v_record;
  v_result := jsonb_build_object('registro_id', v_record.id, 'aula_id', p_aula_id, 'revision_id', v_record.updated_at);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'registrar_aula_ministrada', 'aula', p_aula_id, p_idempotency_key,
    jsonb_build_object('registro_id', v_record.id), v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_release_lesson_to_class(
  p_aula_id uuid, p_turma_id uuid, p_confirmado boolean, p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role();
  v_lesson_course uuid; v_class_course uuid; v_already_released boolean; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT COALESCE(p_confirmado, false) THEN RAISE EXCEPTION 'explicit_confirmation_required' USING ERRCODE = '22023'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'liberar_aula_para_turma' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT m.curso_id INTO v_lesson_course FROM public.aulas a JOIN public.modulos m ON m.id = a.modulo_id
  WHERE a.id = p_aula_id AND a.arquivado_em IS NULL AND m.arquivado_em IS NULL;
  SELECT curso_id INTO v_class_course FROM public.turmas WHERE id = p_turma_id;
  IF v_lesson_course IS NULL OR v_class_course IS NULL THEN RAISE EXCEPTION 'lesson_or_class_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_lesson_course <> v_class_course THEN RAISE EXCEPTION 'lesson_does_not_belong_to_class_course' USING ERRCODE = '22023'; END IF;
  IF v_role = 'teacher' AND NOT public.is_turma_instructor(p_turma_id, v_actor_id) THEN
    RAISE EXCEPTION 'teacher_is_not_class_instructor' USING ERRCODE = '42501';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.turma_aulas_liberadas WHERE aula_id = p_aula_id AND turma_id = p_turma_id)
    INTO v_already_released;
  INSERT INTO public.turma_aulas_liberadas(aula_id, turma_id) VALUES (p_aula_id, p_turma_id)
  ON CONFLICT (turma_id, aula_id) DO NOTHING;
  v_result := jsonb_build_object('aula_id', p_aula_id, 'turma_id', p_turma_id, 'liberada', true,
    'ja_estava_liberada', v_already_released);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'liberar_aula_para_turma', 'aula', p_aula_id, p_idempotency_key,
    jsonb_build_object('turma_id', p_turma_id), v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_withdraw_lesson_from_class(
  p_aula_id uuid, p_turma_id uuid, p_confirmado boolean, p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid(); v_role text := public.current_profile_role(); v_lesson_course uuid; v_class_course uuid;
  v_removed_count integer; v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR v_role NOT IN ('admin', 'teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT COALESCE(p_confirmado, false) THEN RAISE EXCEPTION 'explicit_confirmation_required' USING ERRCODE = '22023'; END IF;
  p_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_result FROM public.mcp_audit_logs WHERE actor_id = v_actor_id
      AND idempotency_key = p_idempotency_key AND tool_name = 'retirar_aula_da_turma' LIMIT 1;
    IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay', true); END IF;
  END IF;
  SELECT m.curso_id INTO v_lesson_course FROM public.aulas a JOIN public.modulos m ON m.id = a.modulo_id WHERE a.id = p_aula_id;
  SELECT curso_id INTO v_class_course FROM public.turmas WHERE id = p_turma_id;
  IF v_lesson_course IS NULL OR v_class_course IS NULL THEN RAISE EXCEPTION 'lesson_or_class_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_lesson_course <> v_class_course THEN RAISE EXCEPTION 'lesson_does_not_belong_to_class_course' USING ERRCODE = '22023'; END IF;
  IF v_role = 'teacher' AND NOT public.is_turma_instructor(p_turma_id, v_actor_id) THEN
    RAISE EXCEPTION 'teacher_is_not_class_instructor' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.turma_aulas_liberadas WHERE aula_id = p_aula_id AND turma_id = p_turma_id;
  GET DIAGNOSTICS v_removed_count = ROW_COUNT;
  v_result := jsonb_build_object('aula_id', p_aula_id, 'turma_id', p_turma_id, 'liberada', false, 'foi_retirada', v_removed_count > 0);
  INSERT INTO public.mcp_audit_logs(actor_id, tool_name, target_type, target_id, idempotency_key, request_summary, result)
  VALUES (v_actor_id, 'retirar_aula_da_turma', 'aula', p_aula_id, p_idempotency_key,
    jsonb_build_object('turma_id', p_turma_id), v_result);
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_create_module(uuid, text, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_update_module(uuid, timestamptz, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_reorder_modules(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_archive_module(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_update_lesson_draft(uuid, timestamptz, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_create_lesson_bundle(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_reorder_lessons(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_archive_lesson(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_create_lessons_batch(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_register_taught_lesson(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_release_lesson_to_class(uuid, uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_withdraw_lesson_from_class(uuid, uuid, boolean, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.mcp_create_module(uuid, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_update_module(uuid, timestamptz, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_reorder_modules(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_archive_module(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_update_lesson_draft(uuid, timestamptz, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_create_lesson_bundle(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_reorder_lessons(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_archive_lesson(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_create_lessons_batch(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_register_taught_lesson(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_release_lesson_to_class(uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_withdraw_lesson_from_class(uuid, uuid, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.mcp_update_lesson_draft(uuid, timestamptz, jsonb, text)
  IS 'Atomically replaces a validated unreleased lesson bundle with optimistic concurrency.';
COMMENT ON FUNCTION public.mcp_create_lessons_batch(uuid, jsonb, text)
  IS 'Creates an all-or-nothing batch of unreleased lessons with per-lesson results.';
