import { loadEnvFile } from 'node:process';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import type { Request, Response } from 'express';
import { authenticateMcpRequest, McpAuthError } from './auth.js';
import { loadMcpConfig } from './config.js';
import { createEstudeaMcpServer } from './mcp-server.js';

try {
  loadEnvFile('.env.mcp');
} catch {
  // Production environments normally inject variables directly.
}

const config = loadMcpConfig();
const app = createMcpExpressApp({ host: config.host, allowedHosts: config.allowedHosts });

app.get('/health', (_request, response) => {
  response.json({ service: 'estudea-mcp', status: 'ok', auth_mode: config.authMode });
});

app.get('/.well-known/oauth-protected-resource', (_request, response) => {
  if (config.authMode !== 'oauth' || !config.publicBaseUrl || !config.authorizationServerUrl) {
    response.status(404).json({ error: 'oauth_not_configured' });
    return;
  }

  response.json({
    resource: `${config.publicBaseUrl}/mcp`,
    authorization_servers: [config.authorizationServerUrl],
    scopes_supported: ['courses:read', 'lessons:write', 'lessons:publish'],
  });
});

const sendAuthError = (response: Response, error: McpAuthError) => {
  if (config.authMode === 'oauth' && config.publicBaseUrl) {
    response.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${config.publicBaseUrl}/.well-known/oauth-protected-resource", scope="courses:read lessons:write"`,
    );
  }
  response.status(error.status).json({
    jsonrpc: '2.0',
    error: { code: -32001, message: error.message },
    id: null,
  });
};

app.post(['/mcp', '/mcp/:connectionSecret'], async (request, response) => {
  try {
    const connectionSecret = Array.isArray(request.params.connectionSecret)
      ? request.params.connectionSecret[0]
      : request.params.connectionSecret;
    const context = await authenticateMcpRequest(
      request.headers,
      connectionSecret,
      config,
    );
    const server = createEstudeaMcpServer(context, config);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);

    response.on('close', () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    if (error instanceof McpAuthError) {
      sendAuthError(response, error);
      return;
    }

    console.error('Falha ao processar chamada MCP:', error);
    if (!response.headersSent) {
      response.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Erro interno do servidor MCP.' },
        id: null,
      });
    }
  }
});

const methodNotAllowed = (_request: Request, response: Response) => {
  response.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Método não permitido neste servidor MCP stateless.' },
    id: null,
  });
};

app.get(['/mcp', '/mcp/:connectionSecret'], methodNotAllowed);
app.delete(['/mcp', '/mcp/:connectionSecret'], methodNotAllowed);

const listener = app.listen(config.port, config.host, () => {
  const endpoint = config.authMode === 'development'
    ? `http://${config.host}:${config.port}/mcp/<MCP_CONNECTION_SECRET>`
    : `${config.publicBaseUrl}/mcp`;
  console.log(`Estudea MCP 0.1.0 disponível em ${endpoint}`);
  if (config.authMode === 'development') {
    console.warn('MCP_AUTH_MODE=development é apenas para testes. Use HTTPS e OAuth em produção.');
  }
});

const shutdown = () => {
  listener.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
