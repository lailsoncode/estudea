-- Persistent class agenda shared between professor dashboard and student dashboard.

CREATE TABLE IF NOT EXISTS public.agenda (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE CASCADE,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  time text NOT NULL,
  title text NOT NULL,
  cohort text NOT NULL DEFAULT 'Todas as Turmas',
  duration text NOT NULL DEFAULT 'Sem detalhes',
  type text NOT NULL DEFAULT 'activity',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES public.turmas(id) ON DELETE CASCADE;
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS event_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS time text;
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS cohort text DEFAULT 'Todas as Turmas';
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS duration text DEFAULT 'Sem detalhes';
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS type text DEFAULT 'activity';
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.agenda
SET
  event_date = COALESCE(event_date, CURRENT_DATE),
  time = COALESCE(NULLIF(time, ''), '08:00'),
  title = COALESCE(NULLIF(title, ''), 'Evento sem titulo'),
  cohort = COALESCE(NULLIF(cohort, ''), 'Todas as Turmas'),
  duration = COALESCE(NULLIF(duration, ''), 'Sem detalhes'),
  type = COALESCE(NULLIF(type, ''), 'activity'),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.agenda ALTER COLUMN event_date SET NOT NULL;
ALTER TABLE public.agenda ALTER COLUMN time SET NOT NULL;
ALTER TABLE public.agenda ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.agenda ALTER COLUMN cohort SET NOT NULL;
ALTER TABLE public.agenda ALTER COLUMN duration SET NOT NULL;
ALTER TABLE public.agenda ALTER COLUMN type SET NOT NULL;
ALTER TABLE public.agenda ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.agenda ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agenda_type_check'
      AND conrelid = 'public.agenda'::regclass
  ) THEN
    ALTER TABLE public.agenda
      ADD CONSTRAINT agenda_type_check
      CHECK (type IN ('live', 'deadline', 'mentorship', 'exam', 'activity'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agenda_event_date ON public.agenda(event_date, time);
CREATE INDEX IF NOT EXISTS idx_agenda_turma_id ON public.agenda(turma_id);
CREATE INDEX IF NOT EXISTS idx_agenda_professor_id ON public.agenda(professor_id);

ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage agenda" ON public.agenda;
DROP POLICY IF EXISTS "Students can read relevant agenda" ON public.agenda;

CREATE POLICY "Staff can manage agenda" ON public.agenda
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());

CREATE POLICY "Students can read relevant agenda" ON public.agenda
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_teacher()
    OR turma_id IS NULL
    OR turma_id = (
      SELECT p.turma_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda TO authenticated;
