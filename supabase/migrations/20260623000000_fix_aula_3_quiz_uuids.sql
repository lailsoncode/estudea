-- Migration: Fix old quiz question UUIDs in student submissions for Aula 03 - Hardware na Prática
-- Date: 2026-06-23

DO $$
DECLARE
  r RECORD;
  v_resp JSONB;
  v_new_respostas JSONB;
  v_key TEXT;
  v_val JSONB;
  v_mapping JSONB;
BEGIN
  -- Define mapping of old question IDs to new question IDs for Aula 3
  v_mapping := '{
    "90dc6ebd-9fa9-4056-b06d-17c70fc553ca": "c3e3fa19-48fc-4e07-ac00-0e85950037f9",
    "3f5173fd-ef60-413c-bf38-63b8aec1d015": "2b03730f-d6cb-4bf4-8438-d6d5c4db8557",
    "064608d7-73a5-49ce-9499-841c05d8c6dd": "552662e3-70aa-4ae5-abd7-fbbcee31ca0e",
    "42e1a927-9897-4db6-b3ee-b59df53bdfab": "0b5e7ba5-c3ea-43f9-9660-b5d5aead6de3",
    "51941e63-c5b8-4e45-9a19-ac16bf4e9de0": "9c07d9e4-b39e-4241-87d8-354c2f55ae24",
    "e965fc77-b8e2-4484-95ce-1f994239e683": "f9e8f5e8-6997-4435-9f33-2e3a17445d9d",
    "f80512a6-9024-433c-82b0-c0e0d8c5deef": "799db8d9-e268-4873-a995-cd1ae9d93b51",
    "468c4ac0-a09d-4f56-8c1c-65116ce08bb0": "240fd463-14cc-40f8-9ed6-29efb85f1120",
    "2fd726db-4fbe-4368-9983-68d252882a69": "69f621dd-0825-4730-9dd5-a645856f49d8",
    "2736bce1-629f-4bb3-a4d1-bb37f2121090": "02fac368-0381-45f0-99db-006ec488892d",
    "64337668-3bc6-47cd-8520-8b41193c4fc4": "824ea073-007e-4202-9330-d7e472420b87",
    "8a274fdc-2045-4f31-9e17-cedb92d5178b": "f2997585-2421-4dd5-8569-8a5e6124d896",
    "92e4bdb6-e95d-4cdd-987f-b6c4d750a561": "d533f31e-8f36-4000-ae08-fe02619bec37",
    "eadb74bc-b6dd-4e19-b9dd-3b077408e110": "2467abad-985e-426a-b7f9-8f1f3c98ec29",
    "14795784-b400-4fdb-a253-fe18160c8da9": "6bf4fa8c-d903-468c-b08e-9f7b9f92a525",
    "c28b6438-70af-4fec-a92f-4f511e704e5c": "11c80581-9e49-4c4f-bd52-531975743053",
    "c402997c-e4f4-4894-b174-09a40349d189": "c1a8dfc7-df31-45a9-9ebc-30a5ec616570",
    "04460d20-4db9-407b-9886-e3762bb23f46": "3ad5e4f0-9150-409f-a846-d45d3453a7a4",
    "8f935296-acc9-4ff9-99a8-9516f8cd51b3": "1f316bd4-dc06-4a8e-be28-d546c09088a5",
    "4ebc453f-6909-410a-836e-ebeb8674da06": "157aff61-3384-42eb-be95-9d01a6911edb",
    "db83e0eb-9c17-4db6-9877-6799809601a0": "5c6fbdca-b97d-4cda-9b5b-d9e078b60d5d",
    "89704d01-7ecb-43bb-aac9-fc9fc5b68f67": "667202a8-9065-433e-9934-adeac8a85b99",
    "9a46e541-e433-4983-9e8d-7dc20cd38d34": "4e554f62-25a2-435b-9a62-a1838f2b420a",
    "ef14dd9a-2fcc-44f6-b3df-87d138f9a88f": "64764c95-7cf8-44c9-bb83-d33f0c7f6c51",
    "f6493f5e-4aa6-4f3d-93ec-8d0a7b4fe5b5": "75c470db-cd0e-4dd4-801f-824b06844a22",
    "8b61fdd0-4e6d-4a01-bd2c-d14de170d40a": "2ca30f1e-f7d8-432f-ac88-85695bfd01b2",
    "214205bd-dc98-4d9e-adc9-ce1aa956e2e4": "f0822407-55d1-4c39-ae7d-e3abf5ecd5a9",
    "c8eb2bc3-b2f3-47ef-85d9-c5d632d9c80a": "e9d10800-f472-4854-99f8-ddeae7afd9df",
    "8e1a18eb-7a49-48f6-b967-4552bcf9dffe": "1073b184-1b92-44c0-b51b-5f8ced4bd188",
    "74fb6405-bc78-4760-a0be-4edfd58d5b5f": "d23f73e8-71da-4da1-83de-4ab3e5f2aacb",
    "60cad209-4ec5-42f2-9ae2-df1344b5eaf0": "521c4da7-9f72-4b4e-af74-fb6854dc9e10",
    "ebbafdfd-6453-42eb-a4f1-cb8b4df3dc2f": "670eae03-0c13-437a-9494-a3312a65049b",
    "a12ecafb-15a1-40ed-b63b-62cf43fb0a92": "bc4c050c-064c-4703-8e72-8df055d65c4b",
    "0f533026-2b07-4e76-a1c1-f06334280f2c": "022a3ab6-5e43-48a4-928a-a853040bb4fa",
    "656d3be8-c4a3-4bf2-8685-a78cf44cc722": "e76c3da1-c8ed-4108-ae44-4ded810c955a",
    "46d5051e-a7bb-4dbf-8ea4-e397d5cf34d1": "13905179-3bc2-43b8-9f46-303db2216dc2",
    "bcf6e282-91ab-43a6-8975-f8113c66d201": "f9807184-c1d1-4f72-ba5d-103fb3533d19",
    "f40fba62-9ad6-4dca-9582-1e550e72cd57": "8ee0d731-e3b9-48a7-83dd-cd96640c1a71",
    "4fce8074-1447-4124-9066-add7a8b82d3b": "a75905fa-5684-488c-968c-a855e6582e29",
    "fc24e456-4db1-495a-8b6b-9e4d817257ce": "3f6ae944-5031-4d6e-95a3-fd5d66c0dbed"
  }'::jsonb;

  -- Update each entrega in public.entregas_atividades for Aula 3
  FOR r IN 
    SELECT id, resposta::jsonb as resp 
    FROM public.entregas_atividades 
    WHERE aula_id = 'f7d5a8b3-4391-42e2-bff1-045d060057db' 
      AND resposta IS NOT NULL AND resposta <> '' AND resposta LIKE '{%'
  LOOP
    v_resp := r.resp;
    IF v_resp ? 'respostas' THEN
      v_new_respostas := '{}'::jsonb;
      
      -- Loop through all keys in the answers object
      FOR v_key, v_val IN 
        SELECT * FROM jsonb_each(v_resp->'respostas')
      LOOP
        -- Translate it to the new UUID if mapped
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
