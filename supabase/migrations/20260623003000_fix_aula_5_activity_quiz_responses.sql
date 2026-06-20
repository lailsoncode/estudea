-- Fix Aula 5 activity quiz submissions and make quiz grading tolerate
-- activity quizzes that reuse the lesson's standard questions.

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
  v_activity_question_count integer := 0;
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

  IF p_atividade_id IS NOT NULL THEN
    SELECT count(*)
    INTO v_activity_question_count
    FROM public.questoes
    WHERE aula_id = p_aula_id
      AND COALESCE(para_arena, false) = false
      AND atividade_id = p_atividade_id;
  END IF;

  FOR q IN
    SELECT *
    FROM public.questoes
    WHERE aula_id = p_aula_id
      AND COALESCE(para_arena, false) = false
      AND (
        (p_atividade_id IS NULL AND atividade_id IS NULL)
        OR (
          p_atividade_id IS NOT NULL
          AND (
            atividade_id = p_atividade_id
            OR (v_activity_question_count = 0 AND atividade_id IS NULL)
          )
        )
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

DO $$
DECLARE
  v_aula_id constant uuid := 'b8c83cbb-c435-4ce6-9e9f-e233bb6d457e'::uuid;
  v_quiz_atividade_id constant uuid := '9c106515-f835-4bd4-91f2-5a9c24c215d9'::uuid;
  v_mapping jsonb := '{
    "65e55ab7-242b-4756-823f-e0651b0f7939": "a3d9a137-ee36-494f-b7dc-756ff5026c1e",
    "5e42cd97-985a-4b39-a719-69f2e657d343": "621aeae3-4ebe-4f95-ba75-8f57fc34e2e7",
    "5ae5ae2a-6f2c-49af-a50a-f33bbbc09129": "fbc2cce1-35c7-4a7d-8e4d-493029b71110",
    "d7857ec6-ec85-41cf-99ce-7ff47ba5fb16": "2acdacc4-d041-4782-a58b-4765f627f34b",
    "fdecfcf3-acbc-4c23-97db-cb3fa81e5a85": "6587332e-e99a-4e11-b299-9377874ef024",
    "4389ec2a-4b2b-42a5-b7fd-748eb67c67c3": "5e19c524-cb5f-4a27-9198-bdd39077a7f3",
    "1dd493ca-bbc8-43cd-817b-c639e7abf421": "0347dfcc-0091-444f-9bc9-871e0e4e0468",
    "72808e69-f5ce-4afd-ae14-0d7c7fc13edc": "eda0e3e5-c29d-4674-93fc-0c239857e1b7",
    "6458231e-4a17-4f07-827a-3ba4d6b1f91a": "6d1e272c-ef68-4361-90d7-6c5c645ceaea",
    "50b74d7b-aba3-4b03-8095-1a84cfbfc54f": "cdb368b7-b058-42d2-81f3-a04f0c1b9b28",
    "8c539bea-d2d7-4beb-9b61-edd67d8e3f09": "d2112df9-c135-450f-9264-45d632bd2b1f",
    "86ff1e06-85cf-4ad9-883f-d169c2c53753": "68ad2bf3-99e3-46ec-a737-ab5c3c33556f",
    "c4078ba3-e093-4e96-a73a-0dc1e0354b90": "27dfec07-cae8-479c-b819-cf3ed5f5c6a6",
    "b1ca3e60-7b6b-40ab-89a8-8a7305ee9b63": "da69e3e2-e476-437e-90ce-ab7b3d0df417",
    "39c0edc7-7ead-4d07-883b-04698b385d78": "5e15c28e-998a-4bd9-a0d5-c300352cbebf",
    "40ecc35e-e6d0-48a6-8e37-be986183ce3d": "00eec6eb-ef96-4121-8bcc-abd19497505f",
    "9d623a19-3bd5-4881-aeed-7bc89f5788a0": "3cd27f41-3ac0-437e-991a-c5a48d255173",
    "00841973-e1a9-4e65-98a2-27b0db96da60": "8db7458c-d288-4739-8e0a-62755ba5de21",

    "d8387f51-48ba-4a1f-93f6-8d384008592d": "e185ed24-5fc8-4c65-8398-8c67daba0d2d",
    "7cc8de27-9bc4-4995-9e1c-0b5929783a4f": "26597fa6-8964-4b7a-9c3c-9743c03a5659",
    "85ecc752-1ddb-45e1-ab1d-cfd50b1fcdd4": "261c01d6-42fc-4512-807a-d47852ab46dd",
    "35fd6d24-59b0-48c1-b435-d3dc5388fce3": "6e81eaa3-ea28-411d-82f5-4b4594ae5e2c",
    "9bbc7356-4ca8-4b0b-942f-0d31a7c77a6c": "487316ae-930a-4845-b87b-582f863c8827",
    "70133cba-e4da-41b4-a2d3-99ac5bfa757c": "55b3bda2-2372-4ee1-aa24-fe13556865d1",
    "7b4b32fe-01cd-4f83-89d1-d577d3d9cb63": "c4215d6c-f073-4c46-8440-c9382fe96226",
    "3769d55c-3ca8-4be4-b232-690e5cf2caf1": "a29bb591-a591-4b7f-aec1-31b767ed69a7",
    "55f8dbd8-ef04-4e2d-945c-a74eccca03e4": "d5ac1baa-0860-4cde-b24f-6b99e2380cfc",
    "0a3f1a60-6b3e-44ba-b035-8371cfdc9aab": "7b2ed9f6-d32d-420d-9516-609c7b7d9b74"
  }'::jsonb;
  r record;
  q record;
  v_key text;
  v_val jsonb;
  v_resp jsonb;
  v_new_respostas jsonb;
  v_answer text;
  v_is_correct boolean;
  v_total integer;
  v_correct integer;
  v_score integer;
BEGIN
  FOR r IN
    SELECT id, aluno_id, resposta::jsonb AS resp
    FROM public.entregas_atividades
    WHERE aula_id = v_aula_id
      AND atividade_id IS NULL
      AND resposta IS NOT NULL
      AND resposta <> ''
      AND resposta LIKE '{%'
  LOOP
    v_resp := r.resp;

    IF NOT (v_resp ? 'respostas') THEN
      CONTINUE;
    END IF;

    v_new_respostas := '{}'::jsonb;

    FOR v_key, v_val IN
      SELECT * FROM jsonb_each(v_resp->'respostas')
    LOOP
      IF v_mapping ? v_key THEN
        v_new_respostas := jsonb_set(v_new_respostas, ARRAY[v_mapping->>v_key], v_val, true);
      ELSE
        v_new_respostas := jsonb_set(v_new_respostas, ARRAY[v_key], v_val, true);
      END IF;
    END LOOP;

    v_total := 0;
    v_correct := 0;

    FOR q IN
      SELECT *
      FROM public.questoes
      WHERE aula_id = v_aula_id
        AND COALESCE(para_arena, false) = false
        AND atividade_id IS NULL
      ORDER BY ordem
    LOOP
      v_total := v_total + 1;
      v_answer := COALESCE(v_new_respostas ->> q.id::text, '');
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
    END LOOP;

    v_score := CASE WHEN v_total > 0 THEN ROUND((v_correct * 100.0) / v_total)::integer ELSE 0 END;
    v_resp := jsonb_set(v_resp, '{respostas}', v_new_respostas, true);
    v_resp := jsonb_set(v_resp, '{score}', to_jsonb(v_score), true);
    v_resp := jsonb_set(v_resp, '{correctCount}', to_jsonb(v_correct), true);
    v_resp := jsonb_set(v_resp, '{totalQuestions}', to_jsonb(v_total), true);
    v_resp := jsonb_set(v_resp, '{passed}', to_jsonb(v_score >= 70), true);

    UPDATE public.entregas_atividades
    SET
      atividade_id = v_quiz_atividade_id,
      aula_id = v_aula_id,
      resposta = v_resp::text,
      updated_at = now()
    WHERE id = r.id
      AND NOT EXISTS (
        SELECT 1
        FROM public.entregas_atividades existing
        WHERE existing.id <> r.id
          AND existing.aluno_id = r.aluno_id
          AND existing.atividade_id = v_quiz_atividade_id
      );
  END LOOP;
END $$;
