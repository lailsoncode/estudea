import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createEstudeaMcpServer } from './mcp-server.js';

test('anuncia a superfície MCP esperada com anotações de segurança', async () => {
  const server = createEstudeaMcpServer(
    {
      userId: '123e4567-e89b-42d3-a456-426614174000',
      role: 'teacher',
      supabase: {} as SupabaseClient,
    },
    {
      port: 3001,
      host: '127.0.0.1',
      authMode: 'development',
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'test-key',
    },
  );
  const client = new Client({ name: 'estudea-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();

    assert.deepEqual(names, [
      'arquivar_aula',
      'arquivar_modulo',
      'atualizar_aula_rascunho',
      'atualizar_modulo',
      'consultar_aula',
      'criar_aula_rascunho',
      'criar_aulas_em_lote',
      'criar_modulo',
      'interpretar_importacao_formatada',
      'liberar_aula_para_turma',
      'listar_aulas',
      'listar_cursos',
      'listar_modulos',
      'listar_turmas',
      'registrar_aula_ministrada',
      'reordenar_aulas',
      'reordenar_modulos',
      'retirar_aula_da_turma',
      'validar_aula',
    ]);
    assert.equal(
      tools.find((tool) => tool.name === 'listar_cursos')?.annotations?.readOnlyHint,
      true,
    );
    assert.equal(
      tools.find((tool) => tool.name === 'liberar_aula_para_turma')?.annotations?.openWorldHint,
      true,
    );
    assert.equal(
      tools.find((tool) => tool.name === 'validar_aula')?.annotations?.readOnlyHint,
      true,
    );
    assert.equal(
      tools.find((tool) => tool.name === 'interpretar_importacao_formatada')?.annotations?.readOnlyHint,
      true,
    );
    assert.equal(
      tools.find((tool) => tool.name === 'retirar_aula_da_turma')?.annotations?.destructiveHint,
      true,
    );

    const { resources } = await client.listResources();
    assert.equal(resources.some((resource) => resource.uri === 'estudea://guias/criacao-aulas'), true);
    const { prompts } = await client.listPrompts();
    assert.equal(prompts.some((prompt) => prompt.name === 'preparar_aula_estudea'), true);

    const conversion = await client.callTool({
      name: 'interpretar_importacao_formatada',
      arguments: {
        conteudo_formatado: [
          '[TÍTULO]',
          'Aula convertida',
          '[CONTEÚDO]',
          'Conteúdo didático suficientemente detalhado para validação.',
        ].join('\n'),
      },
    });
    const data = (conversion.structuredContent as { data?: { aula?: { titulo?: string } } } | undefined)?.data;
    assert.equal(conversion.isError, undefined);
    assert.equal(data?.aula?.titulo, 'Aula convertida');
  } finally {
    await client.close();
    await server.close();
  }
});
