-- Base tables for Arena Live / Kahoot-style sessions.

CREATE TABLE IF NOT EXISTS public.kahoot_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pin text NOT NULL UNIQUE,
  professor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  aula_id uuid REFERENCES public.aulas(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'question', 'scoreboard', 'finished')),
  current_question_index integer NOT NULL DEFAULT 0,
  question_started_at timestamptz,
  questoes_customizadas jsonb DEFAULT '[]'::jsonb,
  exibir_perguntas boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS pin text;
ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS aula_id uuid REFERENCES public.aulas(id) ON DELETE CASCADE;
ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'lobby';
ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS current_question_index integer NOT NULL DEFAULT 0;
ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS question_started_at timestamptz;
ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS questoes_customizadas jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS exibir_perguntas boolean DEFAULT true;
ALTER TABLE public.kahoot_sessions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS public.kahoot_players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.kahoot_sessions(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  nickname text NOT NULL,
  total_score integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (session_id, aluno_id)
);

ALTER TABLE public.kahoot_players ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.kahoot_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.kahoot_players ADD COLUMN IF NOT EXISTS aluno_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.kahoot_players ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL;
ALTER TABLE public.kahoot_players ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE public.kahoot_players ADD COLUMN IF NOT EXISTS total_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.kahoot_players ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.kahoot_players ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS public.kahoot_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.kahoot_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.kahoot_players(id) ON DELETE CASCADE,
  question_index integer NOT NULL,
  chosen_option text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  points_awarded integer NOT NULL DEFAULT 0,
  response_time_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (player_id, question_index)
);

ALTER TABLE public.kahoot_responses ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.kahoot_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.kahoot_responses ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES public.kahoot_players(id) ON DELETE CASCADE;
ALTER TABLE public.kahoot_responses ADD COLUMN IF NOT EXISTS question_index integer;
ALTER TABLE public.kahoot_responses ADD COLUMN IF NOT EXISTS chosen_option text;
ALTER TABLE public.kahoot_responses ADD COLUMN IF NOT EXISTS is_correct boolean NOT NULL DEFAULT false;
ALTER TABLE public.kahoot_responses ADD COLUMN IF NOT EXISTS points_awarded integer NOT NULL DEFAULT 0;
ALTER TABLE public.kahoot_responses ADD COLUMN IF NOT EXISTS response_time_ms integer NOT NULL DEFAULT 0;
ALTER TABLE public.kahoot_responses ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL;

ALTER TABLE public.kahoot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kahoot_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kahoot_responses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kahoot_sessions_pin ON public.kahoot_sessions(pin);
CREATE INDEX IF NOT EXISTS idx_kahoot_players_session_id ON public.kahoot_players(session_id);
CREATE INDEX IF NOT EXISTS idx_kahoot_responses_session_question ON public.kahoot_responses(session_id, question_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kahoot_sessions_unique_pin ON public.kahoot_sessions(pin);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kahoot_players_unique_session_aluno ON public.kahoot_players(session_id, aluno_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kahoot_responses_unique_player_question ON public.kahoot_responses(player_id, question_index);

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['kahoot_sessions', 'kahoot_players', 'kahoot_responses']
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END $$;
