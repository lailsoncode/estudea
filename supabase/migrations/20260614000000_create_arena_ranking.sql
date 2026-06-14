-- Migration: Create arena_ranking table for persistent Arena Live leaderboards
-- Date: 2026-06-14

-- 1. Create arena_ranking table
CREATE TABLE IF NOT EXISTS public.arena_ranking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.kahoot_sessions(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  nickname TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  final_position INTEGER NOT NULL DEFAULT 1,
  total_players INTEGER NOT NULL DEFAULT 1,
  streak_max INTEGER NOT NULL DEFAULT 0,
  quiz_titulo TEXT,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Comments
COMMENT ON TABLE public.arena_ranking IS 'Histórico de resultados individuais de cada jogador em sessões da Arena Live.';
COMMENT ON COLUMN public.arena_ranking.session_id IS 'Referência à sessão da Arena Live (kahoot_sessions).';
COMMENT ON COLUMN public.arena_ranking.aluno_id IS 'Referência ao usuário/aluno que participou.';
COMMENT ON COLUMN public.arena_ranking.turma_id IS 'Turma do aluno, para filtros de ranking por turma.';
COMMENT ON COLUMN public.arena_ranking.nickname IS 'Apelido usado na partida.';
COMMENT ON COLUMN public.arena_ranking.total_score IS 'Pontuação total obtida na partida.';
COMMENT ON COLUMN public.arena_ranking.total_correct IS 'Número de respostas corretas na partida.';
COMMENT ON COLUMN public.arena_ranking.total_questions IS 'Total de questões na partida.';
COMMENT ON COLUMN public.arena_ranking.final_position IS 'Posição final obtida no ranking da partida.';
COMMENT ON COLUMN public.arena_ranking.total_players IS 'Total de jogadores na partida.';
COMMENT ON COLUMN public.arena_ranking.streak_max IS 'Maior sequência de acertos consecutivos obtida.';
COMMENT ON COLUMN public.arena_ranking.quiz_titulo IS 'Nome do quiz/aula usado na partida.';
COMMENT ON COLUMN public.arena_ranking.played_at IS 'Data e hora em que a partida ocorreu.';

-- 2. Enable Row Level Security
ALTER TABLE public.arena_ranking ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Admins can read/write everything
CREATE POLICY "Admins can manage arena ranking" ON public.arena_ranking
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Students can read all arena ranking (it's public leaderboard)
CREATE POLICY "Students can read arena ranking" ON public.arena_ranking
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_arena_ranking_aluno_id ON public.arena_ranking(aluno_id);
CREATE INDEX IF NOT EXISTS idx_arena_ranking_session_id ON public.arena_ranking(session_id);
CREATE INDEX IF NOT EXISTS idx_arena_ranking_total_score ON public.arena_ranking(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_arena_ranking_played_at ON public.arena_ranking(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_ranking_turma_id ON public.arena_ranking(turma_id);
