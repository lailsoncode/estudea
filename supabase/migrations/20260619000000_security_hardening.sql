-- Security hardening: roles, RLS boundaries, safe signup, and quiz helpers.

-- Schema compatibility for fields already used by the application.
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS permite_arena boolean DEFAULT true;
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS pontua boolean DEFAULT true;
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS permite_refazer boolean DEFAULT true;
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS para_arena boolean DEFAULT false;
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS atividade_id uuid REFERENCES public.atividades(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'questoes_tipo_check'
      AND conrelid = 'public.questoes'::regclass
  ) THEN
    ALTER TABLE public.questoes DROP CONSTRAINT questoes_tipo_check;
  END IF;

  ALTER TABLE public.questoes
    ADD CONSTRAINT questoes_tipo_check
    CHECK (tipo IN ('multipla_escolha', 'verdadeiro_falso', 'aberta', 'multipla_selecao'));
END $$;

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
    CHECK (tipo_entrega IN ('texto', 'imagem', 'quiz', 'multipla'));
END $$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() IN ('admin', 'teacher');
$$;

REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_teacher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_teacher() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma_id uuid;
  v_codigo_acesso text;
  v_role text;
BEGIN
  -- Public signups can only become students. Elevated roles must be set in
  -- app_metadata by a trusted/admin process, never by user_metadata.
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

  INSERT INTO public.profiles (id, nome, email, role, turma_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name'),
    new.email,
    v_role,
    v_turma_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    turma_id = EXCLUDED.turma_id,
    updated_at = now();

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_unsafe_self_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.is_admin_or_teacher()
  THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.turma_id IS DISTINCT FROM OLD.turma_id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.progresso_geral IS DISTINCT FROM OLD.progresso_geral
       OR NEW.frequencia IS DISTINCT FROM OLD.frequencia
       OR NEW.autonomia_digital IS DISTINCT FROM OLD.autonomia_digital
       OR NEW.status_risco IS DISTINCT FROM OLD.status_risco
       OR NEW.media_digitacao IS DISTINCT FROM OLD.media_digitacao
       OR NEW.tempo_resolucao IS DISTINCT FROM OLD.tempo_resolucao
       OR NEW.ofensiva_atual IS DISTINCT FROM OLD.ofensiva_atual
       OR NEW.maior_ofensiva IS DISTINCT FROM OLD.maior_ofensiva
       OR NEW.ultimo_acesso_data IS DISTINCT FROM OLD.ultimo_acesso_data
       OR NEW.anotacoes IS DISTINCT FROM OLD.anotacoes
    THEN
      RAISE EXCEPTION 'unsafe_profile_update' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_unsafe_self_profile_update ON public.profiles;
CREATE TRIGGER prevent_unsafe_self_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unsafe_self_profile_update();

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins/Teachers can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and teachers can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own safe profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Admins and teachers can manage all profiles" ON public.profiles;

CREATE POLICY "Profiles can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins and teachers can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin_or_teacher());

CREATE POLICY "Users can update own safe profile fields" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins and teachers can manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

-- Classes
DROP POLICY IF EXISTS "Turmas are viewable by authenticated users." ON public.turmas;
DROP POLICY IF EXISTS "Turmas can be verified by anonymous users via code." ON public.turmas;
DROP POLICY IF EXISTS "Turmas can be managed by admin users." ON public.turmas;
DROP POLICY IF EXISTS "Turmas are viewable by own students and staff" ON public.turmas;
DROP POLICY IF EXISTS "Turmas can be managed by staff" ON public.turmas;

CREATE POLICY "Turmas are viewable by own students and staff" ON public.turmas
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_teacher()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.turma_id = turmas.id
    )
  );

CREATE POLICY "Turmas can be managed by staff" ON public.turmas
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

-- Courses, modules, lessons and activities.
DROP POLICY IF EXISTS "Cursos are viewable by authenticated users." ON public.cursos;
DROP POLICY IF EXISTS "Cursos can be managed by admin users." ON public.cursos;
DROP POLICY IF EXISTS "Cursos are viewable by enrolled students and staff" ON public.cursos;
DROP POLICY IF EXISTS "Cursos can be managed by staff" ON public.cursos;

CREATE POLICY "Cursos are viewable by enrolled students and staff" ON public.cursos
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_teacher()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.turmas t ON t.id = p.turma_id
      WHERE p.id = auth.uid()
        AND t.curso_id = cursos.id
    )
  );

CREATE POLICY "Cursos can be managed by staff" ON public.cursos
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

DROP POLICY IF EXISTS "Modulos are viewable by authenticated users." ON public.modulos;
DROP POLICY IF EXISTS "Modulos can be managed by admin users." ON public.modulos;
DROP POLICY IF EXISTS "Modulos are viewable by enrolled students and staff" ON public.modulos;
DROP POLICY IF EXISTS "Modulos can be managed by staff" ON public.modulos;

CREATE POLICY "Modulos are viewable by enrolled students and staff" ON public.modulos
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_teacher()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.turmas t ON t.id = p.turma_id
      WHERE p.id = auth.uid()
        AND t.curso_id = modulos.curso_id
    )
  );

CREATE POLICY "Modulos can be managed by staff" ON public.modulos
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

DROP POLICY IF EXISTS "Aulas are viewable by authenticated users." ON public.aulas;
DROP POLICY IF EXISTS "Aulas can be managed by admin users." ON public.aulas;
DROP POLICY IF EXISTS "Aulas are viewable by enrolled students and staff" ON public.aulas;
DROP POLICY IF EXISTS "Aulas can be managed by staff" ON public.aulas;

CREATE POLICY "Aulas are viewable by enrolled students and staff" ON public.aulas
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_teacher()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.turmas t ON t.id = p.turma_id
      JOIN public.modulos m ON m.curso_id = t.curso_id
      WHERE p.id = auth.uid()
        AND m.id = aulas.modulo_id
    )
  );

CREATE POLICY "Aulas can be managed by staff" ON public.aulas
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

DROP POLICY IF EXISTS "Atividades are viewable by authenticated users." ON public.atividades;
DROP POLICY IF EXISTS "Atividades can be managed by admin users." ON public.atividades;
DROP POLICY IF EXISTS "Atividades are viewable by enrolled students and staff" ON public.atividades;
DROP POLICY IF EXISTS "Atividades can be managed by staff" ON public.atividades;

CREATE POLICY "Atividades are viewable by enrolled students and staff" ON public.atividades
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_teacher()
    OR EXISTS (
      SELECT 1
      FROM public.aulas a
      JOIN public.modulos m ON m.id = a.modulo_id
      JOIN public.turmas t ON t.curso_id = m.curso_id
      JOIN public.profiles p ON p.turma_id = t.id
      WHERE p.id = auth.uid()
        AND a.id = atividades.aula_id
    )
  );

CREATE POLICY "Atividades can be managed by staff" ON public.atividades
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

-- Questions are staff-only through the table. Students use RPCs that hide answers.
DROP POLICY IF EXISTS "Questoes are viewable by authenticated users." ON public.questoes;
DROP POLICY IF EXISTS "Questoes can be managed by admin users." ON public.questoes;
DROP POLICY IF EXISTS "Questoes can be managed by staff" ON public.questoes;

CREATE POLICY "Questoes can be managed by staff" ON public.questoes
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

-- Releases
DROP POLICY IF EXISTS "Turma aulas liberadas are viewable by authenticated users." ON public.turma_aulas_liberadas;
DROP POLICY IF EXISTS "Turma aulas liberadas can be managed by admin users." ON public.turma_aulas_liberadas;
DROP POLICY IF EXISTS "Turma aulas liberadas are viewable by own students and staff" ON public.turma_aulas_liberadas;
DROP POLICY IF EXISTS "Turma aulas liberadas can be managed by staff" ON public.turma_aulas_liberadas;

CREATE POLICY "Turma aulas liberadas are viewable by own students and staff" ON public.turma_aulas_liberadas
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_teacher()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.turma_id = turma_aulas_liberadas.turma_id
    )
  );

CREATE POLICY "Turma aulas liberadas can be managed by staff" ON public.turma_aulas_liberadas
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

-- Progress and submissions
DROP POLICY IF EXISTS "Progresso is viewable by authenticated users." ON public.progresso_alunos;
DROP POLICY IF EXISTS "Students can manage their own progresso." ON public.progresso_alunos;
DROP POLICY IF EXISTS "Admins can manage all progresso." ON public.progresso_alunos;
DROP POLICY IF EXISTS "Students can manage own progresso" ON public.progresso_alunos;
DROP POLICY IF EXISTS "Staff can manage all progresso" ON public.progresso_alunos;

CREATE POLICY "Students can manage own progresso" ON public.progresso_alunos
  FOR ALL TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "Staff can manage all progresso" ON public.progresso_alunos
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

DROP POLICY IF EXISTS "Entregas are viewable by authenticated users." ON public.entregas_atividades;
DROP POLICY IF EXISTS "Students can insert their own entregas." ON public.entregas_atividades;
DROP POLICY IF EXISTS "Students can update their own entregas." ON public.entregas_atividades;
DROP POLICY IF EXISTS "Admins can manage all entregas." ON public.entregas_atividades;
DROP POLICY IF EXISTS "Students can manage own entregas" ON public.entregas_atividades;
DROP POLICY IF EXISTS "Staff can manage all entregas" ON public.entregas_atividades;

CREATE POLICY "Students can manage own entregas" ON public.entregas_atividades
  FOR ALL TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "Staff can manage all entregas" ON public.entregas_atividades
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

-- Keep existing staff/student chat model but make teacher authorization profile-based.
DROP POLICY IF EXISTS "Admins/Teachers can manage chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Staff can manage chat_messages" ON public.chat_messages;

CREATE POLICY "Staff can manage chat_messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

CREATE OR REPLACE FUNCTION public.get_classmates_progress()
RETURNS TABLE (
  id uuid,
  nome text,
  avatar_url text,
  ofensiva_atual integer,
  maior_ofensiva integer,
  aulas_concluidas integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT turma_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
  SELECT
    p.id,
    p.nome,
    p.avatar_url,
    COALESCE(p.ofensiva_atual, 0),
    COALESCE(p.maior_ofensiva, 0),
    COUNT(pa.aula_id)::integer AS aulas_concluidas
  FROM public.profiles p
  JOIN me ON me.turma_id = p.turma_id
  LEFT JOIN public.progresso_alunos pa ON pa.aluno_id = p.id
  WHERE p.role = 'student'
  GROUP BY p.id, p.nome, p.avatar_url, p.ofensiva_atual, p.maior_ofensiva
  ORDER BY aulas_concluidas DESC, COALESCE(p.maior_ofensiva, 0) DESC, p.nome ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_accessible_questions(p_aula_ids uuid[])
RETURNS TABLE (
  id uuid,
  aula_id uuid,
  enunciado text,
  opcoes text[],
  resposta_correta text,
  ordem integer,
  created_at timestamptz,
  tipo text,
  para_arena boolean,
  atividade_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.id,
    q.aula_id,
    q.enunciado,
    CASE
      WHEN NOT public.is_admin_or_teacher() AND q.tipo = 'aberta' THEN ARRAY[]::text[]
      ELSE q.opcoes
    END AS opcoes,
    CASE
      WHEN public.is_admin_or_teacher() THEN q.resposta_correta
      ELSE ''
    END AS resposta_correta,
    q.ordem,
    q.created_at,
    q.tipo,
    COALESCE(q.para_arena, false) AS para_arena,
    q.atividade_id
  FROM public.questoes q
  JOIN public.aulas a ON a.id = q.aula_id
  LEFT JOIN public.modulos m ON m.id = a.modulo_id
  WHERE q.aula_id = ANY(p_aula_ids)
    AND (
      public.is_admin_or_teacher()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.turmas t ON t.id = p.turma_id
        WHERE p.id = auth.uid()
          AND t.curso_id = m.curso_id
      )
    )
  ORDER BY q.aula_id, q.ordem;
$$;

CREATE OR REPLACE FUNCTION public.grade_quiz_answers(
  p_aula_id uuid,
  p_respostas jsonb,
  p_atividade_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q record;
  v_total integer := 0;
  v_correct integer := 0;
  v_answer text;
  v_is_correct boolean;
  v_results jsonb := '[]'::jsonb;
  v_score integer;
  v_passing integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_teacher() AND NOT EXISTS (
    SELECT 1
    FROM public.aulas a
    JOIN public.modulos m ON m.id = a.modulo_id
    JOIN public.turmas t ON t.curso_id = m.curso_id
    JOIN public.profiles p ON p.turma_id = t.id
    WHERE p.id = auth.uid()
      AND a.id = p_aula_id
      AND EXISTS (
        SELECT 1
        FROM public.turma_aulas_liberadas tal
        WHERE tal.turma_id = t.id
          AND tal.aula_id = a.id
      )
  ) THEN
    RAISE EXCEPTION 'lesson_not_available' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(nota_aprovacao, 70)
  INTO v_passing
  FROM public.aulas
  WHERE id = p_aula_id;

  FOR q IN
    SELECT *
    FROM public.questoes
    WHERE aula_id = p_aula_id
      AND COALESCE(para_arena, false) = false
      AND (
        (p_atividade_id IS NULL AND atividade_id IS NULL)
        OR (p_atividade_id IS NOT NULL AND atividade_id = p_atividade_id)
      )
    ORDER BY ordem
  LOOP
    v_total := v_total + 1;
    v_answer := COALESCE(p_respostas ->> q.id::text, '');
    v_is_correct := false;

    IF q.tipo = 'aberta' THEN
      IF COALESCE(q.opcoes[2], '') = '' THEN
        v_is_correct := BTRIM(v_answer) <> '';
      ELSE
        SELECT bool_and(position(keyword IN lower(v_answer)) > 0)
        INTO v_is_correct
        FROM (
          SELECT BTRIM(lower(value)) AS keyword
          FROM unnest(string_to_array(q.opcoes[2], ',')) AS value
          WHERE BTRIM(value) <> ''
        ) keywords;
        v_is_correct := COALESCE(v_is_correct, false);
      END IF;
    ELSIF q.tipo = 'multipla_selecao' THEN
      v_is_correct := (
        ARRAY(
          SELECT BTRIM(lower(value))
          FROM unnest(string_to_array(COALESCE(q.resposta_correta, ''), ';')) AS value
          WHERE BTRIM(value) <> ''
          ORDER BY BTRIM(lower(value))
        )
        =
        ARRAY(
          SELECT BTRIM(lower(value))
          FROM unnest(string_to_array(COALESCE(v_answer, ''), ';')) AS value
          WHERE BTRIM(value) <> ''
          ORDER BY BTRIM(lower(value))
        )
      );
    ELSE
      v_is_correct := BTRIM(lower(v_answer)) = BTRIM(lower(COALESCE(q.resposta_correta, '')));
    END IF;

    IF v_is_correct THEN
      v_correct := v_correct + 1;
    END IF;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'question_id', q.id,
        'is_correct', v_is_correct,
        'resposta_correta', q.resposta_correta,
        'opcoes', q.opcoes
      )
    );
  END LOOP;

  v_score := CASE WHEN v_total > 0 THEN ROUND((v_correct * 100.0) / v_total)::integer ELSE 0 END;

  RETURN jsonb_build_object(
    'score', v_score,
    'passed', v_score >= COALESCE(v_passing, 70),
    'correctCount', v_correct,
    'totalQuestions', v_total,
    'results', v_results
  );
END;
$$;

-- Arena Live helpers: students get sanitized questions and server-side scoring.
CREATE OR REPLACE FUNCTION public.is_kahoot_participant(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kahoot_players kp
    WHERE kp.session_id = p_session_id
      AND kp.aluno_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.sanitize_kahoot_question(p_question jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_question, '{}'::jsonb) - 'resposta_correta' || jsonb_build_object('resposta_correta', '');
$$;

CREATE OR REPLACE FUNCTION public.get_kahoot_session_by_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.kahoot_sessions%ROWTYPE;
  v_questions jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_session
  FROM public.kahoot_sessions
  WHERE pin = BTRIM(p_pin)
    AND status <> 'finished'
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_array_length(COALESCE(v_session.questoes_customizadas, '[]'::jsonb)) > 0 THEN
    SELECT COALESCE(jsonb_agg(public.sanitize_kahoot_question(question)), '[]'::jsonb)
    INTO v_questions
    FROM jsonb_array_elements(v_session.questoes_customizadas) AS question;
  ELSE
    SELECT COALESCE(jsonb_agg(public.sanitize_kahoot_question(to_jsonb(q))), '[]'::jsonb)
    INTO v_questions
    FROM (
      SELECT *
      FROM public.questoes
      WHERE aula_id = v_session.aula_id
        AND COALESCE(para_arena, false) = true
      ORDER BY ordem
    ) q;

    IF jsonb_array_length(v_questions) = 0 THEN
      SELECT COALESCE(jsonb_agg(public.sanitize_kahoot_question(to_jsonb(q))), '[]'::jsonb)
      INTO v_questions
      FROM (
        SELECT *
        FROM public.questoes
        WHERE aula_id = v_session.aula_id
          AND COALESCE(para_arena, false) = false
      ORDER BY ordem
      ) q;
    END IF;
  END IF;

  RETURN to_jsonb(v_session) || jsonb_build_object('questoes_customizadas', v_questions);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_kahoot_session(p_session_id uuid, p_nickname text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma_id uuid;
  v_player public.kahoot_players%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.kahoot_sessions
    WHERE id = p_session_id
      AND status <> 'finished'
  ) THEN
    RAISE EXCEPTION 'session_not_available' USING ERRCODE = '42501';
  END IF;

  SELECT turma_id INTO v_turma_id
  FROM public.profiles
  WHERE id = auth.uid();

  INSERT INTO public.kahoot_players (session_id, aluno_id, turma_id, nickname, total_score, streak)
  VALUES (p_session_id, auth.uid(), v_turma_id, LEFT(BTRIM(p_nickname), 30), 0, 0)
  ON CONFLICT (session_id, aluno_id) DO UPDATE
  SET nickname = EXCLUDED.nickname
  RETURNING * INTO v_player;

  RETURN to_jsonb(v_player);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_kahoot_answer(
  p_session_id uuid,
  p_player_id uuid,
  p_question_index integer,
  p_chosen_option text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.kahoot_sessions%ROWTYPE;
  v_player public.kahoot_players%ROWTYPE;
  v_updated_player public.kahoot_players%ROWTYPE;
  v_question jsonb;
  v_correct_answer text;
  v_is_correct boolean;
  v_response_time integer := 20000;
  v_points integer := 0;
  v_new_streak integer := 0;
  v_speed_ratio numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_session
  FROM public.kahoot_sessions
  WHERE id = p_session_id
    AND status = 'question';

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'session_not_accepting_answers' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_player
  FROM public.kahoot_players
  WHERE id = p_player_id
    AND session_id = p_session_id
    AND aluno_id = auth.uid();

  IF v_player.id IS NULL THEN
    RAISE EXCEPTION 'player_not_found' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.kahoot_responses
    WHERE player_id = p_player_id
      AND question_index = p_question_index
  ) THEN
    RAISE EXCEPTION 'question_already_answered' USING ERRCODE = '23505';
  END IF;

  IF jsonb_array_length(COALESCE(v_session.questoes_customizadas, '[]'::jsonb)) > 0 THEN
    v_question := v_session.questoes_customizadas -> p_question_index;
  ELSE
    SELECT to_jsonb(q)
    INTO v_question
    FROM (
      SELECT *
      FROM public.questoes
      WHERE aula_id = v_session.aula_id
        AND COALESCE(para_arena, false) = true
      ORDER BY ordem
      OFFSET p_question_index
      LIMIT 1
    ) q;

    IF v_question IS NULL THEN
      SELECT to_jsonb(q)
      INTO v_question
      FROM (
        SELECT *
        FROM public.questoes
        WHERE aula_id = v_session.aula_id
          AND COALESCE(para_arena, false) = false
        ORDER BY ordem
        OFFSET p_question_index
        LIMIT 1
      ) q;
    END IF;
  END IF;

  IF v_question IS NULL THEN
    RAISE EXCEPTION 'question_not_found' USING ERRCODE = 'P0001';
  END IF;

  v_correct_answer := COALESCE(v_question->>'resposta_correta', '');
  v_is_correct := BTRIM(lower(p_chosen_option)) = BTRIM(lower(v_correct_answer));

  IF v_session.question_started_at IS NOT NULL THEN
    v_response_time := GREATEST(0, LEAST(20000, FLOOR(EXTRACT(EPOCH FROM (now() - v_session.question_started_at)) * 1000)::integer));
  END IF;

  IF v_is_correct THEN
    v_speed_ratio := LEAST(1, v_response_time / 20000.0);
    v_points := GREATEST(500, ROUND(1000 * (1 - v_speed_ratio * 0.5))::integer);
    v_new_streak := COALESCE(v_player.streak, 0) + 1;
    v_points := v_points + LEAST(250, v_new_streak * 50);
  END IF;

  INSERT INTO public.kahoot_responses (
    session_id,
    player_id,
    question_index,
    chosen_option,
    is_correct,
    points_awarded,
    response_time_ms
  )
  VALUES (
    p_session_id,
    p_player_id,
    p_question_index,
    p_chosen_option,
    v_is_correct,
    v_points,
    v_response_time
  );

  UPDATE public.kahoot_players
  SET
    total_score = COALESCE(total_score, 0) + v_points,
    streak = CASE WHEN v_is_correct THEN v_new_streak ELSE 0 END
  WHERE id = p_player_id
  RETURNING * INTO v_updated_player;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'points_awarded', v_points,
    'response_time_ms', v_response_time,
    'player', to_jsonb(v_updated_player)
  );
END;
$$;

DROP POLICY IF EXISTS "Staff can manage kahoot_sessions" ON public.kahoot_sessions;
DROP POLICY IF EXISTS "Participants can read kahoot players" ON public.kahoot_players;
DROP POLICY IF EXISTS "Staff can manage kahoot_players" ON public.kahoot_players;
DROP POLICY IF EXISTS "Staff can manage kahoot_responses" ON public.kahoot_responses;

CREATE POLICY "Staff can manage kahoot_sessions" ON public.kahoot_sessions
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

CREATE POLICY "Participants can read kahoot players" ON public.kahoot_players
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_teacher()
    OR public.is_kahoot_participant(session_id)
  );

CREATE POLICY "Staff can manage kahoot_players" ON public.kahoot_players
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

CREATE POLICY "Staff can manage kahoot_responses" ON public.kahoot_responses
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

REVOKE ALL ON FUNCTION public.get_classmates_progress() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_accessible_questions(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grade_quiz_answers(uuid, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_kahoot_participant(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sanitize_kahoot_question(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_kahoot_session_by_pin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_kahoot_session(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_kahoot_answer(uuid, uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_classmates_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_questions(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_quiz_answers(uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_kahoot_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kahoot_session_by_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_kahoot_session(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_kahoot_answer(uuid, uuid, integer, text) TO authenticated;
