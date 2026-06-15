-- Migration: Fix old quiz question UUIDs in student submissions
-- Date: 2026-06-22

DO $$
DECLARE
  r RECORD;
  v_resp JSONB;
  v_new_respostas JSONB;
  v_key TEXT;
  v_val JSONB;
  v_mapping JSONB;
BEGIN
  -- Define mapping of old question IDs to new question IDs
  v_mapping := '{
    "b36d3794-0316-42ed-99c6-17347dc60a7c": "2e983e97-0d23-437f-9c33-088069ce3b40",
    "8f008e15-6097-42a1-a06e-3e7d1d926fbd": "b3f142e6-626e-4afa-9b95-577b5b3607b9",
    "0e4bb4dc-b77a-4608-b0db-5afabdad1524": "38348a33-27aa-4f26-9d7f-0219b19b2574",
    "86bcc13a-76dc-4c22-ae03-fe1defced2f4": "ebb9ae92-0e2c-48a3-a33c-5bcbc04233c3",
    "d4d72cd6-cb0a-48f8-ad89-2396330bd12a": "2a3d1df8-bc62-4500-bf80-0099aa7562e2",
    "b3e3f58e-8746-4e9b-8608-4295dcb6cf18": "ffd77170-d1dc-4a31-babb-4be20369ab55",
    "0eef8c99-8811-4521-b2f7-ad58065e7c79": "72c3e824-d1e3-4630-a133-ad66c9d6277e",
    "d4a660fb-ca62-4770-994f-6d42098abb1c": "10c28986-56ac-4d47-a588-0b6081a2a016",
    "40564bb9-1b33-42c3-83bc-b11749f6afc1": "62ef9f92-62c9-4c62-a63b-cf235ec91969",
    "301afd18-dc25-420a-b5df-8423218c404e": "501dca9a-3400-4805-936d-c941ca1ca467",
    "e5449ab5-d33c-48ee-9481-85c6c90797f9": "e05dfa43-e16f-4b02-83aa-fdad5a55ede4",
    "3f6f3251-52d2-4168-8c46-80811d440385": "e02b1b11-ad08-4ccf-8713-806fab719270",
    "4c34e073-1d80-46de-b04d-dd401cc41806": "724ba2d5-90a3-4d63-9fdc-3bbb386411c2",
    "0edc3e82-44cb-49e2-9d04-4be96fbb7c57": "b4be58fd-3396-467b-902b-511868e29d06",
    "911ea43d-75d0-4479-884b-07abb276bcd3": "0fefc11b-3791-4f14-a0f5-b617b61068db",
    "c4afa89f-70e6-4d23-a718-9c6338da04f5": "738aa33c-c8f6-49d1-be1c-62f89ff36d24",
    "d12aba21-03c2-4ed8-9af5-2919abe14afd": "b13ee46b-c73b-4dfd-86fd-de62691c0680",
    "738aed1b-a451-4c51-a7b1-869d49f8b65f": "924cbce8-7e61-4649-a6aa-41cbd682b4ec",
    "01c2284a-976a-4f76-98ed-e4b89889485e": "bab5b4b1-1570-4462-aa70-aa442c23b315",
    "287123fa-323e-46d6-9d3f-90f9fa98022f": "d86ca9e7-ec7e-4f60-ac91-5e7a6e6b005d",
    "25f9e70b-72aa-456c-9a69-13f0db51a111": "784acf11-916a-42dd-8503-771956407150",
    "58db7ce6-da59-4959-8078-96b9b2b3c7b5": "0ba0e050-ff14-46a6-a5eb-b88712ac5cbc"
  }'::jsonb;

  -- Update each entrega in public.entregas_atividades
  FOR r IN 
    SELECT id, resposta::jsonb as resp 
    FROM public.entregas_atividades 
    WHERE resposta IS NOT NULL AND resposta <> '' AND resposta LIKE '{%'
  LOOP
    v_resp := r.resp;
    IF v_resp ? 'respostas' THEN
      v_new_respostas := '{}'::jsonb;
      -- Loop through all keys in the answers object
      FOR v_key, v_val IN 
        SELECT * FROM jsonb_each(v_resp->'respostas')
      LOOP
        -- If the key is in our mapping, translate it to the new UUID
        IF v_mapping ? v_key THEN
          v_new_respostas := jsonb_set(v_new_respostas, ARRAY[v_mapping->>v_key], v_val);
        ELSE
          v_new_respostas := jsonb_set(v_new_respostas, ARRAY[v_key], v_val);
        END IF;
      END LOOP;
      
      -- Update the answers in response payload
      v_resp := jsonb_set(v_resp, ARRAY['respostas'], v_new_respostas);
      
      -- Save back to database
      UPDATE public.entregas_atividades
      SET resposta = v_resp::text, updated_at = now()
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
