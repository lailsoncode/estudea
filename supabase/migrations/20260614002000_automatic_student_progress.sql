-- Migration: Automatic student progress calculation trigger
-- Date: 2026-06-14

-- 1. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.update_student_progresso_geral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  v_aluno_id uuid;
  v_turma_id uuid;
  v_curso_id uuid;
  v_total_aulas int;
  v_aulas_concluidas int;
  v_progresso int;
begin
  v_aluno_id := coalesce(new.aluno_id, old.aluno_id);

  -- Retrieve class for the student
  select turma_id into v_turma_id from public.profiles where id = v_aluno_id;

  if v_turma_id is not null then
    -- Retrieve course linked to that class
    select curso_id into v_curso_id from public.turmas where id = v_turma_id;

    if v_curso_id is not null then
      -- Count total lessons in the course
      select count(*) into v_total_aulas 
      from public.aulas a 
      join public.modulos m on a.modulo_id = m.id 
      where m.curso_id = v_curso_id;

      -- Count lessons completed by student in this course
      select count(distinct p.aula_id) into v_aulas_concluidas 
      from public.progresso_alunos p
      join public.aulas a on p.aula_id = a.id
      join public.modulos m on a.modulo_id = m.id
      where p.aluno_id = v_aluno_id and m.curso_id = v_curso_id;

      if v_total_aulas > 0 then
        v_progresso := round((v_aulas_concluidas * 100.0) / v_total_aulas);
      else
        v_progresso := 0;
      end if;

      update public.profiles 
      set progresso_geral = v_progresso 
      where id = v_aluno_id;
    end if;
  end if;

  return new;
end;
$$;

-- 2. Bind trigger to public.progresso_alunos
DROP TRIGGER IF EXISTS trigger_update_progresso_geral ON public.progresso_alunos;
CREATE TRIGGER trigger_update_progresso_geral
  AFTER INSERT OR DELETE OR UPDATE
  ON public.progresso_alunos
  FOR EACH ROW
  EXECUTE FUNCTION update_student_progresso_geral();

-- 3. Initial sync of student progress
UPDATE public.profiles p
SET progresso_geral = COALESCE((
  SELECT ROUND((COUNT(DISTINCT pa.aula_id) * 100.0) / NULLIF(COUNT(DISTINCT a.id), 0))
  FROM public.turmas t
  JOIN public.cursos c ON t.curso_id = c.id
  JOIN public.modulos m ON m.curso_id = c.id
  LEFT JOIN public.aulas a ON a.modulo_id = m.id
  LEFT JOIN public.progresso_alunos pa ON pa.aluno_id = p.id AND pa.aula_id = a.id
  WHERE t.id = p.turma_id
), 0)
WHERE p.role = 'student' AND p.turma_id IS NOT NULL;
