# Integração Estudea + ChatGPT via MCP

Este documento descreve a arquitetura, configuração, publicação e operação da integração que permite aos professores criarem aulas do Estudea diretamente pelo ChatGPT.

O caminho recomendado para produção usa:

- MCP com transporte **Streamable HTTP** em `https://mcp.estudea.com.br/mcp`;
- **OAuth 2.1 com PKCE** fornecido pelo Supabase Auth;
- registro dinâmico do ChatGPT como cliente OAuth;
- identidade individual do professor, sem JWT copiado manualmente;
- RLS, papel do perfil e vínculos pedagógicos já existentes no Estudea.

> O modo `development`, baseado em URL secreta e token temporário, existe apenas para diagnóstico local. Nunca deve ser usado como configuração permanente no EasyPanel.

## Sumário

1. [Experiência do professor](#1-experiência-do-professor)
2. [Arquitetura](#2-arquitetura)
3. [Ferramentas MCP](#3-ferramentas-mcp)
4. [Pré-requisitos](#4-pré-requisitos)
5. [Banco de dados](#5-banco-de-dados)
6. [Configuração OAuth no Supabase](#6-configuração-oauth-no-supabase)
7. [Configuração do frontend](#7-configuração-do-frontend)
8. [Publicação do MCP no EasyPanel](#8-publicação-do-mcp-no-easypanel)
9. [Ordem de publicação](#9-ordem-de-publicação)
10. [Validação dos endpoints](#10-validação-dos-endpoints)
11. [Conexão no ChatGPT](#11-conexão-no-chatgpt)
12. [Roteiro de testes](#12-roteiro-de-testes)
13. [Desenvolvimento local](#13-desenvolvimento-local)
14. [Segurança](#14-segurança)
15. [Solução de problemas](#15-solução-de-problemas)
16. [Comandos de manutenção](#16-comandos-de-manutenção)

## 1. Experiência do professor

Depois que o administrador publica e configura a integração uma única vez, cada professor faz sua própria conexão:

1. entra normalmente no Estudea;
2. abre **Minha Conta → Criar aulas pelo ChatGPT**;
3. clica em **Conectar ao ChatGPT**;
4. adiciona o endereço MCP que foi copiado;
5. entra no Estudea, caso ainda não esteja autenticado;
6. revisa as permissões e clica em **Autorizar conexão**.

Depois disso, o professor pode pedir ao ChatGPT para localizar cursos e módulos, criar aulas como rascunho, revisar o conteúdo e liberá-lo para uma turma.

Na mesma área do Estudea, o professor pode visualizar e revogar os aplicativos OAuth que autorizou. A senha do usuário nunca é compartilhada com o ChatGPT.

## 2. Arquitetura

```text
Professor
   │
   ├── usa o ChatGPT
   │       │
   │       ├── descobre o MCP em https://mcp.estudea.com.br/mcp
   │       ├── descobre o OAuth pelo metadata do MCP
   │       └── registra um cliente OAuth dinamicamente no Supabase
   │
   ├── autoriza em https://DOMINIO-DO-ESTUDEA/oauth/consent
   │
   └── ChatGPT envia o token OAuth ao MCP
           │
           ├── MCP valida o usuário no Supabase Auth
           ├── exige perfil teacher ou admin
           ├── executa RPCs usando o token do professor
           └── Supabase aplica RLS e registra auditoria
```

Responsabilidades:

| Componente | Responsabilidade |
| --- | --- |
| ChatGPT | Interpretar o pedido do professor e chamar ferramentas MCP |
| Frontend Estudea | Login, consentimento OAuth, instruções e revogação de conexões |
| Supabase Auth | OAuth 2.1, PKCE, emissão/renovação de tokens e registro de clientes |
| Servidor MCP | Validar a identidade, expor ferramentas e aplicar regras de negócio |
| PostgreSQL/RLS | Limitar os dados ao professor autorizado e persistir as alterações |

O MCP é stateless e não chama outro modelo de IA. O modelo conectado produz argumentos estruturados; o servidor valida esses argumentos antes de persistir qualquer conteúdo.

## 3. Ferramentas MCP

| Ferramenta | Tipo | Resultado |
| --- | --- | --- |
| `listar_cursos` | Leitura | Lista os cursos que o professor pode editar |
| `listar_modulos` | Leitura | Lista módulos e IDs de um curso |
| `listar_turmas` | Leitura | Lista turmas compatíveis com o professor e o curso |
| `consultar_aula` | Leitura | Retorna aula, atividades e questões para revisão |
| `criar_aula_rascunho` | Escrita | Cria aula, atividades e questões atomicamente, sem liberar |
| `liberar_aula_para_turma` | Escrita | Libera a aula somente após confirmação explícita |

Não existe ferramenta de exclusão nesta versão.

## 4. Pré-requisitos

- Node.js `>= 22.12.0`;
- projeto Supabase do Estudea;
- chave anônima/publishable do Supabase;
- frontend do Estudea publicado por HTTPS;
- subdomínio HTTPS público para o MCP;
- serviço separado no EasyPanel usando Nixpacks;
- migração MCP aplicada ao banco;
- Supabase OAuth Server habilitado;
- conta do ChatGPT com acesso ao Developer mode, conforme a política da conta ou workspace.

## 5. Banco de dados

Aplique as migrações antes de habilitar escrita pelo ChatGPT:

```bash
npx supabase db push
```

A migração específica da integração é:

```text
supabase/migrations/20260826010000_create_mcp_lesson_tools.sql
```

Ela inclui:

- RPC transacional de criação da aula completa;
- RPC de liberação para turma;
- validação de professor, curso, módulo e turma;
- idempotência para evitar duplicação após repetição de rede;
- tabela de auditoria `mcp_audit_logs`;
- suporte ao tipo de entrega `arquivo`.

Não use `service_role` no servidor MCP. As operações devem continuar usando `auth.uid()`, RLS e a identidade real do professor.

## 6. Configuração OAuth no Supabase

O OAuth 2.1 Server é apresentado atualmente pelo Supabase como recurso beta. Antes de mudanças importantes de produção, confira a documentação e o changelog do Supabase para possíveis alterações de comportamento ou configuração.

### 6.1 Site URL

No Dashboard do projeto:

1. abra **Authentication → URL Configuration**;
2. configure **Site URL** com o domínio público onde o frontend do Estudea abre;
3. não use `localhost` em produção;
4. não use o domínio do MCP como Site URL.

Exemplo:

```text
https://app.seudominio.com
```

### 6.2 OAuth Server

Em **Authentication → OAuth Server**:

1. ative **Enable the Supabase OAuth Server**;
2. informe **Authorization Path** como `/oauth/consent`;
3. ative **Allow Dynamic OAuth Apps**;
4. salve as alterações.

O Preview Authorization URL deve resultar em:

```text
https://app.seudominio.com/oauth/consent
```

A rota `/oauth/consent` já está implementada no frontend. Ela:

- preserva o `authorization_id` recebido do Supabase;
- permite login com a conta existente do Estudea;
- impede contas de estudante;
- mostra o aplicativo solicitante e as permissões;
- permite aprovar ou negar a conexão;
- redireciona ao cliente após a decisão.

> A tela **Publish a new OAuth application**, com permissões de Analytics, Database e Auth, não é usada nesta integração. Ela pertence à integração com a plataforma administrativa do Supabase.

### 6.3 Chave de assinatura JWT

Para o escopo OpenID Connect `openid`, use uma chave assimétrica, preferencialmente ES256 ou RS256. Confira em **Project Settings → JWT Keys**.

### 6.4 Validar o servidor OAuth

Substitua `<project-ref>` pela referência do projeto:

```bash
curl https://<project-ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1
```

O JSON precisa incluir, entre outros campos:

- `authorization_endpoint`;
- `token_endpoint`;
- `registration_endpoint`;
- `code_challenge_methods_supported` contendo `S256`.

Se `registration_endpoint` não aparecer, confirme se **Allow Dynamic OAuth Apps** foi ativado.

## 7. Configuração do frontend

No serviço do frontend Estudea no EasyPanel, mantenha as variáveis do Supabase e acrescente:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave-anon-ou-publishable>
VITE_MCP_PUBLIC_URL=https://mcp.estudea.com.br/mcp
```

`VITE_MCP_PUBLIC_URL` pertence ao serviço do frontend, não ao serviço MCP.

Variáveis iniciadas por `VITE_` são incorporadas no momento do build. Portanto, é obrigatório gerar uma nova build do frontend após adicioná-las ou alterá-las.

Funcionalidades relacionadas:

| Arquivo | Responsabilidade |
| --- | --- |
| `src/components/McpIntegrationCard.tsx` | Instruções, endereço MCP e lista/revogação de conexões |
| `src/pages/OAuthConsent.tsx` | Login e consentimento individual |
| `src/pages/PerfilUsuario.tsx` | Exibe a integração para professores e administradores |
| `src/App.tsx` | Mantém `/oauth/consent` como rota pública durante o fluxo OAuth |

## 8. Publicação do MCP no EasyPanel

Crie ou mantenha um serviço separado para o MCP.

### 8.1 Nixpacks

Use Node.js 22 e os seguintes comandos:

| Etapa | Comando |
| --- | --- |
| Install | `npm ci --include=dev` |
| Build | `npm run mcp:build` |
| Start | `npm run mcp:start` |

Variável do builder:

```dotenv
NIXPACKS_NODE_VERSION=22
```

Configure a porta interna do serviço como `3001` e associe o domínio público:

```text
https://mcp.estudea.com.br
```

### 8.2 Variáveis do serviço MCP

Use este modelo em produção:

```dotenv
NODE_ENV=production

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<chave-anon-ou-publishable>

MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PORT=3001
MCP_ALLOWED_HOSTS=mcp.estudea.com.br
MCP_PUBLIC_BASE_URL=https://mcp.estudea.com.br
MCP_AUTHORIZATION_SERVER_URL=https://<project-ref>.supabase.co/auth/v1

ESTUDEA_APP_URL=https://app.seudominio.com
```

Regras importantes:

- `MCP_PUBLIC_BASE_URL` não inclui `/mcp`;
- `MCP_AUTHORIZATION_SERVER_URL` termina em `/auth/v1`;
- `ESTUDEA_APP_URL` aponta para o frontend, não para o MCP;
- `MCP_ALLOWED_HOSTS` contém apenas os hosts aceitos, sem `https://`;
- não envolva valores com links Markdown ou colchetes;
- não coloque `VITE_MCP_PUBLIC_URL` no serviço MCP.

Remova do EasyPanel quando mudar para OAuth:

```dotenv
MCP_CONNECTION_SECRET
MCP_SUPABASE_ACCESS_TOKEN
```

Essas duas variáveis são ignoradas no modo OAuth, mas removê-las evita vazamento e confusão operacional. Se algum token foi exposto em print, log ou conversa, encerre a sessão correspondente e faça login novamente.

## 9. Ordem de publicação

Use esta ordem para evitar que o Supabase redirecione o professor para uma rota que ainda não existe em produção:

1. aplique as migrações do banco;
2. habilite e salve o OAuth Server no Supabase;
3. publique o frontend com `/oauth/consent` e `VITE_MCP_PUBLIC_URL`;
4. confirme que `https://DOMINIO-DO-ESTUDEA/oauth/consent` abre;
5. mude o serviço MCP para `MCP_AUTH_MODE=oauth`;
6. publique novamente o serviço MCP;
7. valide os endpoints de saúde e descoberta;
8. conecte e teste no ChatGPT.

Acessar `/oauth/consent` diretamente, sem `authorization_id`, deve mostrar uma mensagem de solicitação inválida. Isso confirma que a rota foi publicada; o identificador válido só é gerado durante o fluxo OAuth.

## 10. Validação dos endpoints

### 10.1 Saúde

```bash
curl https://mcp.estudea.com.br/health
```

Produção deve retornar:

```json
{
  "service": "estudea-mcp",
  "status": "ok",
  "auth_mode": "oauth"
}
```

Se retornar `development`, o EasyPanel ainda está usando a configuração temporária ou o serviço não foi reconstruído.

### 10.2 Protected Resource Metadata

```bash
curl https://mcp.estudea.com.br/.well-known/oauth-protected-resource/mcp
```

O documento precisa anunciar:

- `resource` igual a `https://mcp.estudea.com.br/mcp`;
- `authorization_servers` apontando para o Supabase Auth;
- escopos `openid`, `email` e `profile`;
- autenticação Bearer por cabeçalho.

### 10.3 Desafio de autenticação

Uma chamada MCP sem token deve responder `401 Unauthorized` e incluir `WWW-Authenticate` com o endereço do protected resource metadata. Esse comportamento é esperado e inicia a descoberta OAuth do cliente.

### 10.4 Discovery do Supabase

```bash
curl https://<project-ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1
```

Confirme a presença do `registration_endpoint` e do método PKCE `S256`.

## 11. Conexão no ChatGPT

O endpoint precisa estar publicado por HTTPS, suportar Streamable HTTP em `/mcp` e permitir descoberta de autenticação.

### 11.1 Habilitar Developer mode

No ChatGPT:

1. abra **Settings**;
2. entre em **Security and login**;
3. ative **Developer mode**.

A disponibilidade do Developer mode pode variar conforme a conta e as políticas do workspace.

### 11.2 Adicionar o MCP

1. abra a área **ChatGPT Plugins**;
2. clique no botão `+`;
3. use o nome `Estudea`;
4. descreva como `Criação e gerenciamento de aulas do Estudea`;
5. em **Connection**, informe:

```text
https://mcp.estudea.com.br/mcp
```

6. crie a conexão;
7. revise as seis ferramentas encontradas;
8. conclua o login e o consentimento no Estudea.

Não selecione **No authentication** em produção. O ChatGPT deve descobrir o OAuth a partir do `401` e dos documentos `.well-known`.

Após alterações em ferramentas, schemas, descrições ou autenticação, publique o MCP e use **Refresh** na conexão do ChatGPT antes de testar novamente.

## 12. Roteiro de testes

Teste primeiro com curso, módulo e turma que possam receber dados de homologação.

### 12.1 Descoberta e leitura

> Use o Estudea para listar os cursos que posso editar. Não faça alterações.

> Liste os módulos do curso de Informática e mostre os respectivos IDs.

### 12.2 Criação de rascunho

> Prepare uma aula textual sobre organização de arquivos no Windows 11, com uma atividade prática e cinco questões. Mostre o resumo antes de salvar. Salve somente como rascunho e não libere para nenhuma turma.

Depois, confirme no Estudea que:

- a aula foi criada no módulo correto;
- atividades e questões foram persistidas;
- a aula ainda não foi liberada;
- o log de auditoria foi criado.

### 12.3 Liberação controlada

> Consulte a aula que acabamos de criar e liste as turmas compatíveis. Mostre exatamente qual turma será afetada e peça minha confirmação antes de liberar.

Confirme somente em uma turma de teste. A ferramenta exige confirmação explícita e deve rejeitar uma tentativa ambígua.

### 12.4 Isolamento entre professores

Repita a conexão com um segundo professor e confirme que ele não consegue editar cursos ou turmas aos quais não possui acesso.

### 12.5 Revogação

No Estudea, abra **Minha Conta → Criar aulas pelo ChatGPT**, desconecte o aplicativo e confirme que novas chamadas deixam de funcionar até uma nova autorização.

## 13. Desenvolvimento local

O modo local usa um segredo na URL e um token curto de uma sessão real. Ele serve apenas para inspecionar as ferramentas antes do OAuth.

Crie `.env.mcp`:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<chave-anon-ou-publishable>

MCP_AUTH_MODE=development
MCP_HOST=127.0.0.1
MCP_PORT=3001
MCP_CONNECTION_SECRET=<segredo-aleatorio-longo>
MCP_SUPABASE_ACCESS_TOKEN=<access-token-temporario-de-professor>

ESTUDEA_APP_URL=http://localhost:5173
```

Gere um segredo local:

```bash
openssl rand -hex 32
```

Inicie o servidor:

```bash
npm run mcp:dev
```

Verifique:

```bash
curl http://127.0.0.1:3001/health
```

No MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

Use Streamable HTTP com:

```text
http://127.0.0.1:3001/mcp/SEU_SEGREDO_LOCAL
```

O token temporário expira e não deve ser reutilizado no EasyPanel. Nunca envie `.env.mcp` ou `.env.mcp.easypanel` ao Git.

## 14. Segurança

- produção sempre usa HTTPS e OAuth 2.1;
- cada conexão representa um professor específico;
- somente perfis `teacher` e `admin` passam pela autenticação do MCP;
- contas `student` são rejeitadas;
- o servidor usa chave anônima/publishable, nunca `service_role`;
- RLS e `auth.uid()` continuam definindo o alcance dos dados;
- criação ocorre primeiro como rascunho;
- liberação exige confirmação explícita;
- não existe ferramenta de exclusão;
- RPCs de escrita são transacionais e idempotentes;
- todas as escritas relevantes geram auditoria em `mcp_audit_logs`;
- o professor pode revogar a autorização no próprio Estudea;
- clientes OAuth registrados dinamicamente devem ser monitorados no Supabase;
- tokens, segredos e arquivos `.env*` não devem aparecer em commits, prints ou logs públicos.

## 15. Solução de problemas

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| `/health` mostra `development` | Variável antiga ou deploy não executado | Defina `MCP_AUTH_MODE=oauth` e faça redeploy |
| Preview do consentimento usa `localhost` | Site URL do Supabase incorreta | Atualize **Authentication → URL Configuration** |
| `OAuth discovery failed` | URL do authorization server ou metadata incorreto | Confira `/auth/v1` e os dois endpoints `.well-known` |
| Registro dinâmico retorna 403/404 | Dynamic OAuth Apps desativado | Ative **Allow Dynamic OAuth Apps** |
| Tela diz “Solicitação inválida” ao abrir manualmente | Falta `authorization_id` | Inicie a conexão pelo ChatGPT; é esperado ao abrir a rota diretamente |
| ChatGPT recebe 401 e não abre login | `WWW-Authenticate` ou metadata inacessível | Teste o protected resource metadata publicamente |
| `invalid_grant` na troca do token | Código expirado ou redirect URI divergente | Reinicie a conexão e confirme HTTPS/URI exata |
| Login funciona, mas MCP retorna 403 | Perfil não é professor/admin | Corrija o papel em `profiles` |
| Professor não vê um curso ou turma | RLS, propriedade ou vínculo ausente | Verifique as políticas e os vínculos do professor |
| `Invalid Host header` | Host ausente em `MCP_ALLOWED_HOSTS` | Adicione somente o hostname público e publique novamente |
| ChatGPT não mostra Developer mode | Plano ou política do workspace | Verifique permissões da conta/workspace |
| Ferramentas antigas aparecem | Metadata em cache | Use **Refresh** na conexão e abra uma nova conversa |

## 16. Comandos de manutenção

Validação completa antes de publicar:

```bash
npm run mcp:test
npm run mcp:build
npm run build:all
npx eslint mcp src/pages/OAuthConsent.tsx src/components/McpIntegrationCard.tsx
```

Scripts disponíveis:

| Script | Uso |
| --- | --- |
| `npm run mcp:dev` | Servidor MCP local com reload |
| `npm run mcp:build` | Compila `mcp/` para `dist-mcp/` |
| `npm run mcp:start` | Inicia a build compilada |
| `npm run mcp:test` | Executa testes de schemas e ferramentas |
| `npm run build:all` | Compila frontend, worker e MCP |

## Referências oficiais

- [OpenAI — autenticação de plugins MCP](https://developers.openai.com/plugins/build/auth)
- [OpenAI — conectar e testar no ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Supabase — OAuth 2.1 Server](https://supabase.com/docs/guides/auth/oauth-server)
- [Supabase — configuração inicial do OAuth Server](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
- [Supabase — autenticação MCP](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Supabase — segurança de tokens e RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security)
