# Estudea MCP — MVP 0.1

Este servidor permite que o ChatGPT consulte a estrutura pedagógica do Estudea, crie uma aula completa e, após confirmação explícita, libere a aula para uma turma.

O MVP usa Streamable HTTP stateless e não chama outro modelo de IA. O ChatGPT produz os argumentos estruturados; o MCP valida e persiste o conteúdo usando a identidade de um professor no Supabase.

## Ferramentas disponíveis

| Ferramenta | Tipo | Resultado |
| --- | --- | --- |
| `listar_cursos` | Leitura | Cursos que o usuário pode editar |
| `listar_modulos` | Leitura | Módulos e IDs de um curso |
| `listar_turmas` | Leitura | Turmas do professor |
| `consultar_aula` | Leitura | Aula, atividades e questões para revisão |
| `criar_aula_rascunho` | Escrita | Cria aula, atividades e questões atomicamente, sem liberá-la |
| `liberar_aula_para_turma` | Escrita | Libera uma aula após confirmação explícita |

Não há ferramenta de exclusão neste MVP.

## 1. Aplicar a migração

A migração cria as RPCs transacionais, auditoria e a correção do tipo de entrega `arquivo`:

```bash
npx supabase db push
```

Arquivo: `supabase/migrations/20260826010000_create_mcp_lesson_tools.sql`.

Não use `service_role` no MCP. As RPCs usam `auth.uid()`, RLS, papel do perfil, propriedade do curso e vínculo do professor com a turma.

## 2. Configuração local

Crie `.env.mcp` — o arquivo já é ignorado pelo Git:

```dotenv
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON

MCP_AUTH_MODE=development
MCP_HOST=127.0.0.1
MCP_PORT=3001
MCP_CONNECTION_SECRET=SEGREDO_ALEATORIO_LONGO
MCP_SUPABASE_ACCESS_TOKEN=JWT_DE_SESSAO_DE_UM_PROFESSOR

ESTUDEA_APP_URL=http://localhost:5173
```

Gere o segredo da conexão com:

```bash
openssl rand -hex 32
```

`MCP_SUPABASE_ACCESS_TOKEN` é o `access_token` temporário da sessão de um professor ou administrador autenticado. O servidor valida esse token no Supabase e deixará de funcionar quando ele expirar. Esse modo existe apenas para o primeiro teste; não deve ser usado como autenticação de produção.

## 3. Executar e inspecionar

```bash
npm run mcp:dev
```

Verifique a saúde:

```bash
curl http://127.0.0.1:3001/health
```

Abra o MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

No Inspector, selecione Streamable HTTP e informe:

```text
http://127.0.0.1:3001/mcp/SEGREDO_ALEATORIO_LONGO
```

Teste nesta ordem:

1. `listar_cursos`;
2. `listar_modulos` com um `curso_id` real;
3. `criar_aula_rascunho` com um `modulo_id` real;
4. `consultar_aula` com o ID retornado;
5. `listar_turmas` usando o curso da aula;
6. `liberar_aula_para_turma` somente em uma turma de teste.

## 4. Conectar ao ChatGPT Work durante o desenvolvimento

O ChatGPT precisa alcançar o endpoint MCP por HTTPS. Para desenvolvimento, exponha o servidor usando o Secure MCP Tunnel da OpenAI ou outro túnel HTTPS temporário aprovado pela equipe.

No ChatGPT:

1. habilite **Developer mode** em **Settings → Security and login**;
2. crie uma conexão MCP;
3. selecione **No authentication** apenas para este modo de desenvolvimento;
4. informe a URL HTTPS completa, incluindo `/mcp/SEGREDO_ALEATORIO_LONGO`;
5. revise as seis ferramentas descobertas antes de testar.

O segredo na URL reduz exposição acidental, mas não substitui OAuth. Não publique nem reutilize essa URL e rotacione o segredo após os testes.

Prompt de teste:

> Use o Estudea para localizar meu curso de Informática e seus módulos. Depois prepare uma aula textual sobre organização de arquivos no Windows 11, com uma atividade prática e cinco questões. Mostre o resumo antes de salvar e não libere a aula.

Prompt de liberação:

> Consulte a aula que acabamos de criar e as turmas desse curso. Mostre qual turma será afetada e peça minha confirmação antes de liberar.

## 5. Produção com OAuth

O modo de produção já está preparado para receber um Bearer token e publicar o protected-resource metadata do MCP:

```dotenv
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PORT=3001
MCP_PUBLIC_BASE_URL=https://mcp.estudea.example
MCP_AUTHORIZATION_SERVER_URL=https://auth.estudea.example
MCP_ALLOWED_HOSTS=mcp.estudea.example
```

Ainda será necessário configurar um Authorization Server OAuth 2.1 compatível com MCP para emitir um token aceito pelo Supabase ou adicionar uma camada segura de troca de identidade. Essa é a próxima evolução antes de uso real por múltiplos professores.

## Verificações do projeto

```bash
npm run mcp:test
npm run mcp:build
npx eslint mcp
npm run build:all
```

O log `mcp_audit_logs` registra a ferramenta, o ator, o alvo, um resumo da solicitação e o resultado. A `idempotency_key` impede duplicações quando uma operação é repetida após falha de rede.
