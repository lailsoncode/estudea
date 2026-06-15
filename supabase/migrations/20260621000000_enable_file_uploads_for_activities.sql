-- 1. Update check constraint on public.atividades to support 'arquivo'
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

-- 2. Create the activities storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('atividades', 'atividades', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for the activities bucket
-- Allow public select of student submissions so teachers can view/download them.
DROP POLICY IF EXISTS "Public read access for atividades bucket" ON storage.objects;
CREATE POLICY "Public read access for atividades bucket"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'atividades');

-- Allow authenticated users to upload files.
DROP POLICY IF EXISTS "Authenticated users can upload files to atividades bucket" ON storage.objects;
CREATE POLICY "Authenticated users can upload files to atividades bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'atividades');

-- Allow users to update their own files.
DROP POLICY IF EXISTS "Users can update their own files in atividades bucket" ON storage.objects;
CREATE POLICY "Users can update their own files in atividades bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'atividades');

-- Allow users to delete their own files.
DROP POLICY IF EXISTS "Users can delete their own files in atividades bucket" ON storage.objects;
CREATE POLICY "Users can delete their own files in atividades bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'atividades');
