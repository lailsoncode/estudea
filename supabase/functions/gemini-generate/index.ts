import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type GeminiMode = 'lesson' | 'arena' | 'ptd';

const ptdResponseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    situacaoAprendizagem: { type: 'string', description: 'Relato objetivo, com no máximo 700 caracteres.' },
    conhecimentos: { type: 'string', description: 'Conhecimentos em texto breve, com no máximo 700 caracteres.' },
    habilidades: { type: 'string', description: 'Habilidades em texto breve, com no máximo 700 caracteres.' },
    atitudesValores: { type: 'string', description: 'Atitudes e valores em texto breve, com no máximo 700 caracteres.' },
    indicadores: { type: 'array', items: { type: 'string' } },
    aulas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          titulo: { type: 'string' },
          data: { type: 'string' },
          inicio: { type: 'string' },
          fim: { type: 'string' },
          tipo: { type: 'string', enum: ['Presencial', 'Remota', 'Híbrida'] },
          atividades: { type: 'string', description: 'Relato objetivo, com no máximo 350 caracteres.' },
          odas: { type: 'string', description: 'Recursos e objetos de aprendizagem, com no máximo 350 caracteres.' },
          registro: { type: 'string', description: 'Registro observável, com no máximo 350 caracteres.' },
          marcasFormativas: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: { type: 'string', enum: ['Domínio técnico-científico', 'Visão crítica', 'Criatividade e atitude empreendedora', 'Atitude sustentável', 'Colaboração e comunicação', 'Autonomia digital'] },
          },
        },
        required: ['titulo', 'data', 'inicio', 'fim', 'tipo', 'atividades', 'odas', 'registro', 'marcasFormativas'],
      },
    },
  },
  required: ['situacaoAprendizagem', 'conhecimentos', 'habilidades', 'atitudesValores', 'indicadores', 'aulas'],
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getPrompt = (mode: GeminiMode, input: string) => {
  if (mode === 'ptd') {
    return `Você é um especialista em planejamento pedagógico por competências do Senac Brasil.
Crie um Plano de Trabalho Docente (PTD) a partir da unidade curricular, turma e aulas fornecidas no JSON abaixo. Um documento de plano de curso pode acompanhar esta solicitação; trate-o como fonte prioritária para competências, indicadores, conhecimentos e termos técnicos.

Dados da unidade:
${input}

Regras essenciais:
1. Não invente dados institucionais, datas, carga horária, indicadores oficiais ou normas que não constem nos dados/documento. Quando uma data não for fornecida, deixe a string vazia.
2. Escreva em português brasileiro, com linguagem objetiva e pronta para o professor revisar e copiar no ambiente do Senac.
3. Seja breve. Cada campo geral deve ter no máximo 700 caracteres e cada campo de aula no máximo 350 caracteres. O professor precisa copiar relatos objetivos, não textos extensos.
4. A situação de aprendizagem deve apresentar contexto, desafio, entregas e critérios de qualidade, conectada ao conteúdo das aulas.
5. Para cada aula recebida, crie exatamente uma entrada em "aulas", na mesma ordem. Proponha atividades práticas coerentes, ODAs/recursos e um registro de participação/avaliação observável.
6. Sugira de uma a três marcas formativas por aula entre: "Domínio técnico-científico", "Visão crítica", "Criatividade e atitude empreendedora", "Atitude sustentável", "Colaboração e comunicação", "Autonomia digital".
7. Retorne somente JSON válido, sem markdown, obedecendo estritamente a esta estrutura:
{
  "situacaoAprendizagem": "",
  "conhecimentos": "",
  "habilidades": "",
  "atitudesValores": "",
  "indicadores": [""],
  "aulas": [
    {
      "titulo": "",
      "data": "YYYY-MM-DD ou vazio",
      "inicio": "HH:MM ou vazio",
      "fim": "HH:MM ou vazio",
      "tipo": "Presencial | Remota | Híbrida",
      "atividades": "",
      "odas": "",
      "registro": "",
      "marcasFormativas": [""]
    }
  ]
}`;
  }

  if (mode === 'arena') {
    return `Você é o mestre da Arena Estudea, um quiz multiplayer em tempo real similar ao Kahoot.
Seu objetivo é ler o material fornecido pelo professor e criar de 5 a 8 questões de múltipla escolha ou verdadeiro ou falso para a Arena competitiva.

O material fornecido é o seguinte:
"""
${input}
"""

Regras importantes:
1. As perguntas devem ser diretas, desafiadoras e rápidas (máximo de 120 caracteres).
2. As opções de resposta devem ser curtas e objetivas (máximo de 50 caracteres) para que os alunos possam ler e responder rapidamente em dispositivos móveis.
3. Forneça exatamente entre 2 e 4 opções de resposta por questão (use exatamente ["Verdadeiro", "Falso"] para questões de verdadeiro ou falso).
4. Garanta que a "resposta_correta" corresponda exatamente a um dos itens da lista "opcoes".
5. Retorne a resposta estruturada estritamente em formato JSON de acordo com o modelo abaixo, sem qualquer tipo de markdown ou comentários adicionais.

Modelo JSON de saída:
[
  {
    "enunciado": "Pergunta para a arena?",
    "opcoes": ["Opção 1", "Opção 2", "Opção 3", "Opção 4"],
    "resposta_correta": "Opção 1"
  }
]`;
  }

  return `Você é um assistente pedagógico especializado na plataforma "Estudea".
Seu objetivo é ajudar professores a criar ou formatar aulas e atividades práticas a partir de pedidos textuais, links ou descrições cruas.

O professor forneceu a seguinte solicitação:
"""
${input}
"""

Você deve retornar um objeto JSON válido estruturado exatamente de acordo com as seguintes regras de negócio da plataforma:
1. Se houver um link na solicitação que aponte para um material de leitura/pdf/drive (ex: link com terminação .pdf, ou link do Google Drive), preencha o campo "arquivo_url" e certifique-se de que "tipo" seja "arquivo".
2. Se a solicitação pedir a criação ou adaptação de um questionário/quiz tradicional vinculado à aula (ex: questões com múltipla escolha, verdadeiro ou falso, abertas ou múltipla seleção), monte a lista de questões no campo "questoes". Defina "tipo" como "quiz".
3. Se a solicitação pedir ou fornecer um conteúdo teórico (texto para leitura), escreva e estruture o texto no campo "conteudo" usando Markdown simples (suportando negrito como **texto** e código inline como \`código\`). Defina "tipo" como "texto".
4. Defina os campos "titulo" (Título da aula) e "descricao" (Descrição/Objetivos da aula) com base nas informações fornecidas ou criadas para a aula.
5. Se for pedida ou inferida uma atividade prática/projeto/exercício de entrega, configure "has_atividade": true e escreva o enunciado em "atividade_enunciado". Caso contrário, configure "has_atividade": false.
6. Para o tipo de entrega da atividade prática ("atividade_tipo_entrega"), os valores aceitos são "texto", "imagem", "quiz" (questionário/perguntas) ou "multipla" (envio misto de texto e imagem).
7. Se a atividade for do formato de entrega "quiz", ela pode possuir um questionário exclusivo (independente do quiz principal da aula). Nesse caso, defina "atividade_quiz_proprio" como true, liste as perguntas dessa atividade no campo "questoes" e configure a flag "pertence_a_atividade": true em cada uma dessas perguntas.
8. Se houver um link ou arquivo específico de material de apoio para a execução da atividade prática (ex: repositório github, link no figma, etc), configure no campo "atividade_material_url".

O JSON deve seguir exatamente a seguinte estrutura (não inclua marcações extras como \`\`\`json, apenas retorne o JSON cru):
{
  "titulo": "Título da Aula",
  "descricao": "Uma descrição concisa dos objetivos da aula",
  "tipo": "video | texto | quiz | arquivo",
  "conteudo": "Texto da aula formatado em Markdown se aplicável",
  "video_url": "URL de vídeo se aplicável",
  "arquivo_url": "URL do material de apoio se aplicável",
  "has_atividade": false,
  "atividade_enunciado": "Enunciado da atividade prática se aplicável",
  "atividade_tipo_entrega": "texto | imagem | quiz | multipla",
  "atividade_material_url": "URL do material de apoio da atividade se aplicável",
  "atividade_quiz_proprio": false,
  "questoes": [
    {
      "enunciado": "Texto da pergunta?",
      "opcoes": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "resposta_correta": "Opção correspondente exatamente a uma das opções listadas (ou separadas por ponto e vírgula se for múltipla seleção)",
      "tipo": "multipla_escolha | verdadeiro_falso | aberta | multipla_selecao",
      "pertence_a_atividade": false
    }
  ]
}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.1-flash-lite';

  if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
    return jsonResponse({ error: 'server_not_configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'not_authenticated' }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: 'not_authenticated' }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !['admin', 'teacher'].includes(profile?.role || '')) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  const body = await req.json().catch(() => null) as {
    mode?: GeminiMode;
    input?: string;
    document?: { name?: string; mimeType?: string; data?: string };
  } | null;
  const mode = body?.mode;
  const input = body?.input?.trim();

  if ((mode !== 'lesson' && mode !== 'arena' && mode !== 'ptd') || !input) {
    return jsonResponse({ error: 'invalid_payload' }, 400);
  }

  const document = body?.document;
  if (document && (!document.data || !document.mimeType || document.data.length > 12_000_000)) {
    return jsonResponse({ error: 'invalid_document' }, 400);
  }

  const parts: Array<Record<string, unknown>> = [{ text: getPrompt(mode, input) }];
  if (document) {
    parts.push({ inlineData: { mimeType: document.mimeType, data: document.data } });
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: mode === 'ptd' ? {
          responseMimeType: 'application/json',
          responseJsonSchema: ptdResponseSchema,
          maxOutputTokens: 32768,
        } : {
          responseMimeType: 'application/json',
          maxOutputTokens: mode === 'lesson' ? 8192 : 4096,
        },
      }),
    },
  );

  const geminiJson = await geminiResponse.json().catch(() => null);
  if (!geminiResponse.ok) {
    return jsonResponse(
      { error: geminiJson?.error?.message || 'gemini_request_failed' },
      geminiResponse.status,
    );
  }

  const candidate = geminiJson?.candidates?.[0];
  const text = candidate?.content?.parts
    ?.filter((part: { thought?: boolean; text?: string }) => !part.thought && typeof part.text === 'string')
    .map((part: { text?: string }) => part.text || '')
    .join('');
  if (!text) {
    return jsonResponse({ error: 'empty_gemini_response' }, 502);
  }

  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    return jsonResponse({ error: `generation_incomplete_${candidate.finishReason}` }, 502);
  }

  return jsonResponse({ text });
});
