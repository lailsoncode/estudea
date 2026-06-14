import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const randomPassword = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('');
  return `Estudea-${token.slice(0, 24)}-Aa1!`;
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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'server_not_configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'not_authenticated' }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: 'not_authenticated' }, 401);
  }

  const { data: actorProfile, error: actorError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (actorError || !['admin', 'teacher'].includes(actorProfile?.role || '')) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  const body = await req.json().catch(() => null) as {
    nome?: string;
    email?: string;
    turma_id?: string;
    codigo_acesso?: string;
    avatar_url?: string | null;
    progresso_geral?: number;
    frequencia?: number;
    autonomia_digital?: 'S' | 'P' | 'N';
    status_risco?: 'Excelente' | 'No Caminho' | 'Alerta Médio' | 'Em Risco';
    media_digitacao?: number;
    ofensiva_atual?: number;
  } | null;

  const nome = body?.nome?.trim();
  const email = body?.email?.trim().toLowerCase();
  const codigoAcesso = body?.codigo_acesso?.trim();
  const turmaId = body?.turma_id?.trim();

  if (!nome || !email || !codigoAcesso || !turmaId) {
    return jsonResponse({ error: 'invalid_payload' }, 400);
  }

  const password = randomPassword();
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nome,
      codigo_acesso: codigoAcesso,
    },
    app_metadata: {
      role: 'student',
    },
  });

  if (createError || !created.user) {
    return jsonResponse({ error: createError?.message || 'create_user_failed' }, 400);
  }

  const profilePatch = {
    nome,
    email,
    turma_id: turmaId,
    avatar_url: body.avatar_url || null,
    progresso_geral: Number(body.progresso_geral || 0),
    frequencia: Number(body.frequencia || 100),
    autonomia_digital: body.autonomia_digital || 'P',
    status_risco: body.status_risco || 'No Caminho',
    media_digitacao: Number(body.media_digitacao || 0),
    ofensiva_atual: Number(body.ofensiva_atual || 0),
    status: 'ativo',
  };

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .update(profilePatch)
    .eq('id', created.user.id)
    .select()
    .single();

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return jsonResponse({ error: profileError.message }, 400);
  }

  await adminClient.from('observacoes_autonomia').upsert({
    aluno_id: created.user.id,
    usa_computador: body.autonomia_digital || 'P',
    navega_internet: body.autonomia_digital || 'P',
    cria_salva_arquivos: body.autonomia_digital || 'P',
    organiza_pastas: body.autonomia_digital || 'P',
    copia_cola_links: body.autonomia_digital || 'P',
    conhece_redes_sociais: body.autonomia_digital || 'P',
    conhece_ferramentas: body.autonomia_digital || 'P',
    precisa_apoio: body.status_risco === 'Em Risco' ? 'S' : 'N',
  });

  return jsonResponse({
    profile,
    temporaryPassword: password,
  });
});
