-- Add material_url column to atividades table to support linking files or resources
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS material_url text;
