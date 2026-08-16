-- Migration: Mark all pending activity deliveries as graded with 100 score
-- and ensure associated lesson progress is updated.

-- 1. Grade all pending submissions in entregas_atividades
UPDATE public.entregas_atividades
SET 
  nota = 100,
  feedback_professor = COALESCE(feedback_professor, 'Atividade avaliada e aprovada com nota máxima.'),
  updated_at = NOW()
WHERE nota IS NULL;

-- 2. Ensure progresso_alunos has entries for all students who completed activities
INSERT INTO public.progresso_alunos (aluno_id, aula_id, concluido_em)
SELECT DISTINCT 
  ea.aluno_id,
  COALESCE(ea.aula_id, at.aula_id) AS aula_id,
  COALESCE(ea.created_at, NOW()) AS concluido_em
FROM public.entregas_atividades ea
LEFT JOIN public.atividades at ON at.id = ea.atividade_id
WHERE COALESCE(ea.aula_id, at.aula_id) IS NOT NULL
ON CONFLICT (aluno_id, aula_id) DO NOTHING;

-- 3. Recalculate progresso_geral for all students in classes
UPDATE public.profiles p
SET progresso_geral = COALESCE((
  SELECT 
    CASE 
      WHEN COUNT(DISTINCT a.id) = 0 THEN 0
      ELSE ROUND((COUNT(DISTINCT pa.aula_id)::NUMERIC / COUNT(DISTINCT a.id)::NUMERIC) * 100)
    END
  FROM public.turmas t
  JOIN public.modulos m ON m.curso_id = t.curso_id
  JOIN public.aulas a ON a.modulo_id = m.id
  LEFT JOIN public.progresso_alunos pa ON pa.aula_id = a.id AND pa.aluno_id = p.id
  WHERE t.id = p.turma_id
), p.progresso_geral)
WHERE p.role = 'student' AND p.turma_id IS NOT NULL;
