-- Relate legacy lesson-quiz submissions that were stored with atividade_id = NULL.
-- These rows are quiz JSON payloads, so they should point to a quiz activity,
-- not to the existing file-based practical activities on the same lessons.

BEGIN;

DO $$
DECLARE
  v_mapping jsonb := '{
    "ac18a804-3cac-4da2-aa25-e392276b5b98": "2effd3b7-ed21-4de1-8a77-008e326b43ec",
    "e2e42374-6590-44df-a34c-7e2f3568d351": "2cfa925c-8ff7-4de6-b480-cac12871ff78",
    "00964850-aa48-430f-936f-30fc303463d5": "0b3845b9-619c-4fbb-90d6-6c0c5751990c",
    "608e87a5-939c-4871-80f8-954b51755b44": "8ec5f58d-d064-4634-a5ec-5aab76221bc7",
    "707ad04c-829a-4c53-aa66-8034d82e71e3": "68781ea8-90f7-48cd-9aea-4d4f08fb5850",
    "7774c933-15d8-4339-81ed-86bb588d8a94": "89d978e0-c35e-4d47-8261-6776e8817555",
    "8326c883-6348-4b5f-9b66-966b6be44ff6": "db636078-97f0-4186-aebf-eabbb6c85a83",
    "f26670dd-050e-44bc-a973-d699ef2d170d": "f582bea1-d0af-4018-be3e-42c5702b4834",
    "d81feb38-612f-4695-a8e1-fd9dfa118b84": "98f5eea7-9f2a-413c-8d30-19fa5e05142a",
    "96410f6f-825c-47da-b9f3-69cfb9dabe9d": "edbcb261-c05e-4b9a-8aa9-a0ea2f5e443f",
    "9482f3fb-8d7f-438f-956f-4f49f0da5382": "6f214181-87cc-497a-9730-ebd2aeb3e7f4",
    "20c2e4f4-e7cc-4b18-bb36-abbf87b113cc": "4c3f58b0-45b6-42de-9da8-ee4fadf0aca8",
    "108b0ad1-8607-4dc2-939b-f7352cfb87bd": "966082e1-de6f-4f19-89de-4d3967cfa08a",
    "94b4b86a-15d1-4e54-a4d7-33a9dc263db4": "f6856aa8-cf9d-45a5-be8c-28309b8c2fa8",
    "cc3cfeb3-04e6-4d2d-bc88-48253ece72c6": "3a2e0f88-573a-4c13-ab58-1cdd0c58010c"
  }'::jsonb;
  r record;
  v_resp jsonb;
  v_new_respostas jsonb;
  v_key text;
  v_val jsonb;
BEGIN
  FOR r IN
    SELECT id, resposta::jsonb AS resp
    FROM public.entregas_atividades
    WHERE aula_id = '69cc48e8-4445-4ae5-a4cc-e87c778f4cab'
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

    UPDATE public.entregas_atividades
    SET
      resposta = jsonb_set(v_resp, '{respostas}', v_new_respostas, true)::text,
      updated_at = now()
    WHERE id = r.id;
  END LOOP;
END $$;

WITH target_quiz_activities (id, aula_id) AS (
  VALUES
    ('cedfc66b-b74b-4a7a-9efa-2adeddfa614a'::uuid, 'd9babe94-40c7-442d-89e7-7e5b95a4a314'::uuid),
    ('90e7b2b7-bb06-48ae-954c-593e972856ef'::uuid, '69cc48e8-4445-4ae5-a4cc-e87c778f4cab'::uuid),
    ('c707156f-6393-4f43-9734-cbff64fe021a'::uuid, '2c3b3da7-a8c3-493f-b9a5-42f2b036e750'::uuid)
)
INSERT INTO public.atividades (
  id,
  aula_id,
  enunciado,
  tipo_entrega,
  pontua,
  permite_refazer
)
SELECT
  target.id,
  target.aula_id,
  'Quiz Geral da Aula',
  'quiz',
  true,
  true
FROM target_quiz_activities target
WHERE NOT EXISTS (
  SELECT 1
  FROM public.atividades existing
  WHERE existing.aula_id = target.aula_id
    AND existing.tipo_entrega = 'quiz'
);

WITH target_aulas (preferred_id, aula_id) AS (
  VALUES
    ('cedfc66b-b74b-4a7a-9efa-2adeddfa614a'::uuid, 'd9babe94-40c7-442d-89e7-7e5b95a4a314'::uuid),
    ('90e7b2b7-bb06-48ae-954c-593e972856ef'::uuid, '69cc48e8-4445-4ae5-a4cc-e87c778f4cab'::uuid),
    ('c707156f-6393-4f43-9734-cbff64fe021a'::uuid, '2c3b3da7-a8c3-493f-b9a5-42f2b036e750'::uuid)
),
quiz_activities AS (
  SELECT DISTINCT ON (a.aula_id)
    a.aula_id,
    a.id
  FROM public.atividades a
  JOIN target_aulas target ON target.aula_id = a.aula_id
  WHERE a.tipo_entrega = 'quiz'
  ORDER BY a.aula_id, (a.id = target.preferred_id) DESC, a.created_at
)
UPDATE public.entregas_atividades entrega
SET
  atividade_id = quiz_activities.id,
  updated_at = now()
FROM quiz_activities
WHERE entrega.atividade_id IS NULL
  AND entrega.aula_id = quiz_activities.aula_id
  AND entrega.resposta IS NOT NULL
  AND entrega.resposta <> ''
  AND entrega.resposta LIKE '{%'
  AND (entrega.resposta::jsonb ? 'respostas')
  AND NOT EXISTS (
    SELECT 1
    FROM public.entregas_atividades existing
    WHERE existing.id <> entrega.id
      AND existing.aluno_id = entrega.aluno_id
      AND existing.atividade_id = quiz_activities.id
  );

COMMIT;
