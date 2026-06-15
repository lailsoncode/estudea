-- Migration: Generate entregas_atividades entries for past completed quizzes
-- Date: 2026-06-22

DO $$
DECLARE
    r RECORD;
    v_count INT;
    v_existing INT;
    v_payload TEXT;
BEGIN
    -- Loop through all student progress entries
    FOR r IN 
        SELECT aluno_id, aula_id, concluido_em 
        FROM public.progresso_alunos
    LOOP
        -- Check if this lesson has standard quiz questions
        SELECT count(*) INTO v_count 
        FROM public.questoes 
        WHERE aula_id = r.aula_id AND para_arena = false AND atividade_id IS NULL;
        
        IF v_count > 0 THEN
            -- Check if an entrega already exists for this student/lesson/quiz
            SELECT count(*) INTO v_existing 
            FROM public.entregas_atividades 
            WHERE aluno_id = r.aluno_id AND aula_id = r.aula_id AND atividade_id IS NULL;
            
            IF v_existing = 0 THEN
                -- Build payload
                v_payload := json_build_object(
                    'respostas', json_build_object(),
                    'score', 100,
                    'correctCount', v_count,
                    'totalQuestions', v_count,
                    'passed', true
                )::text;
                
                -- Insert the simulated quiz delivery
                INSERT INTO public.entregas_atividades (
                    aluno_id,
                    aula_id,
                    atividade_id,
                    resposta,
                    nota,
                    created_at,
                    updated_at
                ) VALUES (
                    r.aluno_id,
                    r.aula_id,
                    NULL,
                    v_payload,
                    NULL,
                    r.concluido_em,
                    r.concluido_em
                );
            END IF;
        END IF;
    END LOOP;
END $$;
