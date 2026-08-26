export type McpAuthMode = 'development' | 'oauth';

export interface McpConfig {
  port: number;
  host: string;
  allowedHosts?: string[];
  authMode: McpAuthMode;
  supabaseUrl: string;
  supabaseAnonKey: string;
  developmentConnectionSecret?: string;
  developmentSupabaseAccessToken?: string;
  publicBaseUrl?: string;
  authorizationServerUrl?: string;
  estudeaAppUrl?: string;
}

const required = (value: string | undefined, name: string) => {
  if (!value?.trim()) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value.trim();
};

const optionalUrl = (value: string | undefined, name: string) => {
  if (!value?.trim()) return undefined;
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`URL inválida em ${name}`);
  }
};

export const loadMcpConfig = (): McpConfig => {
  const authMode = (process.env.MCP_AUTH_MODE || 'oauth') as McpAuthMode;
  if (!['development', 'oauth'].includes(authMode)) {
    throw new Error('MCP_AUTH_MODE deve ser development ou oauth.');
  }

  const port = Number(process.env.PORT || process.env.MCP_PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT/MCP_PORT precisa ser uma porta válida.');
  }

  const config: McpConfig = {
    port,
    host: process.env.MCP_HOST?.trim() || '127.0.0.1',
    allowedHosts: process.env.MCP_ALLOWED_HOSTS
      ?.split(',')
      .map((host) => host.trim())
      .filter(Boolean),
    authMode,
    supabaseUrl: required(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, 'SUPABASE_URL'),
    supabaseAnonKey: required(
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
      'SUPABASE_ANON_KEY',
    ),
    publicBaseUrl: optionalUrl(process.env.MCP_PUBLIC_BASE_URL, 'MCP_PUBLIC_BASE_URL'),
    authorizationServerUrl: optionalUrl(
      process.env.MCP_AUTHORIZATION_SERVER_URL,
      'MCP_AUTHORIZATION_SERVER_URL',
    ),
    estudeaAppUrl: optionalUrl(process.env.ESTUDEA_APP_URL, 'ESTUDEA_APP_URL'),
  };

  if (authMode === 'development') {
    config.developmentConnectionSecret = required(
      process.env.MCP_CONNECTION_SECRET,
      'MCP_CONNECTION_SECRET',
    );
    config.developmentSupabaseAccessToken = required(
      process.env.MCP_SUPABASE_ACCESS_TOKEN,
      'MCP_SUPABASE_ACCESS_TOKEN',
    );
  } else {
    config.authorizationServerUrl = required(
      config.authorizationServerUrl,
      'MCP_AUTHORIZATION_SERVER_URL',
    );
    config.publicBaseUrl = required(config.publicBaseUrl, 'MCP_PUBLIC_BASE_URL');
  }

  return config;
};
