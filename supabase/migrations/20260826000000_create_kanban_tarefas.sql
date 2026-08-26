-- Migration: Create kanban_tarefas table for student task management
-- Date: 2026-08-26

CREATE TABLE IF NOT EXISTS public.kanban_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coluna_id VARCHAR(50) NOT NULL DEFAULT 'todo',
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  prioridade VARCHAR(20) NOT NULL DEFAULT 'media',
  tag VARCHAR(50) DEFAULT 'estudos',
  prazo DATE,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  link_url TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.kanban_tarefas ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Students can manage their own kanban_tarefas" ON public.kanban_tarefas;
CREATE POLICY "Students can manage their own kanban_tarefas" ON public.kanban_tarefas
  FOR ALL TO authenticated USING (aluno_id = auth.uid()) WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Teachers and Admins can view kanban_tarefas" ON public.kanban_tarefas;
CREATE POLICY "Teachers and Admins can view kanban_tarefas" ON public.kanban_tarefas
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );
