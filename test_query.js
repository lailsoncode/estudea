import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envText = fs.readFileSync('.env', 'utf8');
const getEnvVal = (key) => {
  const match = envText.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};
const supabaseUrl = getEnvVal('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVal('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('entregas_atividades')
    .select(`
      id,
      aluno_id,
      atividade_id,
      aula_id,
      resposta,
      nota,
      feedback_professor,
      created_at,
      profiles:aluno_id (
        id,
        nome,
        turma_id,
        turmas:turma_id (
          id,
          nome
        )
      ),
      atividades:atividade_id (
        id,
        enunciado,
        tipo_entrega,
        pontua,
        permite_refazer,
        aulas:aula_id (
          id,
          titulo,
          numero_aula,
          questoes(*)
        )
      ),
      aulas:aula_id (
        id,
        titulo,
        numero_aula,
        questoes(*)
      )
    `)
    .eq('id', 'aa1c6dbe-6c0f-4527-8f1b-9f40310026fb');

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log('Data returned from query:', data);
  if (!data || data.length === 0) {
    console.log('No data found for ID');
    return;
  }

  const item = data[0];
  const profile = item.profiles;
  const atividade = item.atividades;
  const aula = atividade?.aulas || item.aulas;
  const turma = profile?.turmas;

  const questoes = (() => {
    if (atividade) {
      const allQuestions = aula?.questoes || [];
      const isProprio = allQuestions.some((q) => q.atividade_id === item.atividade_id);
      return isProprio
        ? allQuestions.filter((q) => q.atividade_id === item.atividade_id)
        : allQuestions.filter((q) => !q.atividade_id && !q.para_arena);
    } else {
      return (aula?.questoes || []).filter((q) => !q.atividade_id && !q.para_arena);
    }
  })();

  console.log('--- SUBMISSION DETAILS ---');
  console.log('ID:', item.id);
  console.log('Aluno Nome:', profile?.nome);
  console.log('Atividade ID:', item.atividade_id);
  console.log('Aula ID:', item.aula_id);
  console.log('Aula Titulo:', aula?.titulo);
  console.log('Questions fetched (count):', questoes.length);
  if (questoes.length > 0) {
    console.log('First Question ID:', questoes[0].id);
    console.log('First Question Enunciado:', questoes[0].enunciado);
  }
  
  try {
    const payload = JSON.parse(item.resposta);
    console.log('Parsed Respostas Keys:', Object.keys(payload.respostas || {}));
    if (questoes.length > 0) {
      console.log('Answer to first question:', payload.respostas?.[questoes[0].id]);
    }
  } catch (e) {
    console.error('Error parsing response:', e);
  }
}

run();
