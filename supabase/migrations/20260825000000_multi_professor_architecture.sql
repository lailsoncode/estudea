-- Multi-Professor Architecture Migration
-- Adds professor ownership, co-teaching support, course authorship, and updated RLS boundaries.

-- 1. Alter public.turmas
ALTER TABLE public.turmas 
  ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_turmas_professor_id ON public.turmas(professor_id);

-- 2. Create public.turma_professores (Co-teaching & Assistant teachers)
CREATE TABLE IF NOT EXISTS public.turma_professores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE CASCADE NOT NULL,
  professor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  papel text DEFAULT 'principal' CHECK (papel IN ('principal', 'assistente', 'co_docente')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (turma_id, professor_id)
);

CREATE INDEX IF NOT EXISTS idx_turma_professores_turma ON public.turma_professores(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_professores_prof ON public.turma_professores(professor_id);

ALTER TABLE public.turma_professores ENABLE ROW LEVEL SECURITY;

-- 3. Alter public.cursos
ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_cursos_criado_por ON public.cursos(criado_por);

-- 4. Backfill existing turmas and cursos with the primary admin/teacher profile
DO $$
DECLARE
  v_default_teacher_id uuid;
BEGIN
  -- Find the primary teacher or admin
  SELECT id INTO v_default_teacher_id
  FROM public.profiles
  WHERE role IN ('admin', 'teacher')
  ORDER BY updated_at ASC
  LIMIT 1;

  IF v_default_teacher_id IS NOT NULL THEN
    -- Backfill turmas
    UPDATE public.turmas
    SET professor_id = v_default_teacher_id
    WHERE professor_id IS NULL;

    -- Also insert into turma_professores for co-teaching consistency
    INSERT INTO public.turma_professores (turma_id, professor_id, papel)
    SELECT id, v_default_teacher_id, 'principal'
    FROM public.turmas
    ON CONFLICT (turma_id, professor_id) DO NOTHING;

    -- Backfill cursos
    UPDATE public.cursos
    SET criado_por = v_default_teacher_id, is_public = true
    WHERE criado_por IS NULL;
  END IF;
END $$;

-- 5. Helper function to check if a user is an instructor of a given turma
CREATE OR REPLACE FUNCTION public.is_turma_instructor(p_turma_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.current_profile_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = p_turma_id AND t.professor_id = p_user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.turma_professores tp
      WHERE tp.turma_id = p_turma_id AND tp.professor_id = p_user_id
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_turma_instructor(uuid, uuid) TO authenticated;

-- 6. Trigger to automatically sync professor_id with turma_professores
CREATE OR REPLACE FUNCTION public.sync_turma_primary_professor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.professor_id IS NOT NULL THEN
    INSERT INTO public.turma_professores (turma_id, professor_id, papel)
    VALUES (NEW.id, NEW.professor_id, 'principal')
    ON CONFLICT (turma_id, professor_id) 
    DO UPDATE SET papel = 'principal';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_turma_primary_professor ON public.turmas;
CREATE TRIGGER trg_sync_turma_primary_professor
  AFTER INSERT OR UPDATE OF professor_id ON public.turmas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_turma_primary_professor();

-- 7. Policies for turma_professores
DROP POLICY IF EXISTS "Turma professores are viewable by authenticated users" ON public.turma_professores;
CREATE POLICY "Turma professores are viewable by authenticated users" ON public.turma_professores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Turma professores can be managed by staff" ON public.turma_professores;
CREATE POLICY "Turma professores can be managed by staff" ON public.turma_professores
  FOR ALL TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

-- 8. Refresh Cursos RLS policies
DROP POLICY IF EXISTS "Cursos are viewable by enrolled students and staff" ON public.cursos;
DROP POLICY IF EXISTS "Cursos can be managed by staff" ON public.cursos;

CREATE POLICY "Cursos are viewable by enrolled students and staff" ON public.cursos
  FOR SELECT TO authenticated
  USING (
    is_public = true
    OR criado_por = auth.uid()
    OR public.current_profile_role() = 'admin'
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
  USING (
    public.current_profile_role() = 'admin'
    OR (public.current_profile_role() = 'teacher' AND (criado_por = auth.uid() OR criado_por IS NULL))
  )
  WITH CHECK (
    public.current_profile_role() = 'admin'
    OR (public.current_profile_role() = 'teacher' AND (criado_por = auth.uid() OR criado_por IS NULL))
  );
