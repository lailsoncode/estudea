import { timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { McpConfig } from './config.js';

export interface AuthenticatedMcpContext {
  userId: string;
  role: 'admin' | 'teacher';
  supabase: SupabaseClient;
}

export class McpAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

const safeEqual = (received: string | undefined, expected: string) => {
  if (!received) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
};

const bearerToken = (headers: IncomingHttpHeaders) => {
  const authorization = headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return undefined;
  return authorization.slice('Bearer '.length).trim() || undefined;
};

export const authenticateMcpRequest = async (
  headers: IncomingHttpHeaders,
  connectionSecret: string | undefined,
  config: McpConfig,
): Promise<AuthenticatedMcpContext> => {
  let accessToken: string | undefined;

  if (config.authMode === 'development') {
    if (!safeEqual(connectionSecret, config.developmentConnectionSecret!)) {
      throw new McpAuthError('Conexão MCP de desenvolvimento inválida.');
    }
    accessToken = config.developmentSupabaseAccessToken;
  } else {
    accessToken = bearerToken(headers);
    if (!accessToken) throw new McpAuthError('Token OAuth ausente.');
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    throw new McpAuthError('Sessão do Estudea inválida ou expirada.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile || !['admin', 'teacher'].includes(profile.role)) {
    throw new McpAuthError('Somente professores e administradores podem usar este MCP.', 403);
  }

  return {
    userId: userData.user.id,
    role: profile.role as 'admin' | 'teacher',
    supabase,
  };
};
