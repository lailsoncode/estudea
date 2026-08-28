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

Depois disso, o professor pode pedir ao ChatGPT para administrar módulos, validar e criar aulas individuais ou em lote, corrigir rascunhos, configurar a Arena, anexar materiais e liberar o conteúdo para uma turma. Criação e liberação continuam sendo etapas separadas.

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

| Grupo | Ferramenta | Tipo | Resultado |
| --- | --- | --- | --- |
| Curso | `listar_cursos` | Leitura | Lista cursos que o professor pode editar |
| Módulo | `listar_modulos` | Leitura | Lista IDs, ordem, carga horária e `revision_id` |
| Módulo | `criar_modulo` | Escrita | Cria uma UC/módulo sem gerar aulas |
| Módulo | `atualizar_modulo` | Escrita | Altera um módulo com controle de revisão |
| Módulo | `reordenar_modulos` | Escrita | Atualiza ordens atomicamente |
| Módulo | `arquivar_modulo` | Escrita confirmada | Arquiva o módulo e suas aulas sem apagar dados |
| Aula | `listar_aulas` | Leitura | Retorna IDs, situação, contagens, turmas e revisões |
| Aula | `consultar_aula` | Leitura | Retorna conteúdo, materiais, atividades, quiz, Arena e liberações |
| Aula | `validar_aula` | Leitura | Devolve erros e alertas sem gravar nada |
| Importação | `interpretar_importacao_formatada` | Leitura | Converte o formato com tags para JSON e valida sem gravar |
| Aula | `criar_aula_rascunho` | Escrita | Cria uma aula completa atomicamente, sem liberar |
| Aula | `atualizar_aula_rascunho` | Escrita | Substitui seções do rascunho com `revision_id` |
| Aula | `reordenar_aulas` | Escrita | Atualiza ordem e numeração atomicamente |
| Aula | `arquivar_aula` | Escrita confirmada | Arquiva uma aula ainda não liberada |
| Aula | `criar_aulas_em_lote` | Escrita | Valida e cria até 100 rascunhos em uma única transação |
| Diário | `registrar_aula_ministrada` | Escrita | Guarda conteúdo e atividades realizados separados do conteúdo do aluno |
| Turma | `listar_turmas` | Leitura | Lista turmas compatíveis com professor e curso |
| Turma | `liberar_aula_para_turma` | Escrita confirmada | Revalida e libera usando o `revision_id` atual |
| Turma | `retirar_aula_da_turma` | Escrita confirmada | Retira o acesso sem apagar a aula |

Não existe exclusão definitiva pelo MCP. Arquivamento é reversível no banco e retirada de turma não remove conteúdo.

O servidor também publica o recurso `estudea://guias/criacao-aulas`, com o contrato pedagógico, e o prompt `preparar_aula_estudea`. As restrições críticas continuam nos schemas e validadores, portanto a segurança não depende de o cliente abrir o recurso.

### 3.1 Estrutura recomendada das questões

Use IDs estáveis para as opções e respostas:

```json
{
  "enunciado": "Quais formatos preservam transparência?",
  "tipo": "multipla_selecao",
  "opcoes": [
    { "id": "a", "texto": "PNG" },
    { "id": "b", "texto": "JPEG" },
    { "id": "c", "texto": "WebP" }
  ],
  "respostas_corretas": ["a", "c"]
}
```

O formato antigo com `opcoes` como textos e `resposta_correta` continua aceito para compatibilidade. Novas aulas devem usar o formato estruturado. O servidor rejeita respostas inexistentes, IDs repetidos, divergência entre os dois formatos de gabarito e múltipla seleção sem exatamente duas ou três respostas distintas.

Questões abertas usam campos próprios, sem transformar gabarito em alternativa:

```json
{
  "enunciado": "Explique o conceito de variável.",
  "tipo": "aberta",
  "gabarito_recomendado": "Uma variável associa um nome a um valor.",
  "palavras_chave_aprovacao": ["nome", "valor"]
}
```

Na persistência, o MCP converte esses campos para a estrutura legada que a interface já compreende e os reconstrói em `consultar_aula`.

### 3.2 Arena e materiais

Uma aula pode ter quiz e Arena independentes:

```json
{
  "embaralhar_questoes": true,
  "embaralhar_opcoes": true,
  "materiais": [
    {
      "titulo": "Imagem-base",
      "url": "https://exemplo.com/imagem.png",
      "tipo": "imagem",
      "uso": "atividade_pratica",
      "obrigatorio": true
    }
  ],
  "arena": {
    "habilitada": true,
    "embaralhar_questoes": true,
    "embaralhar_opcoes": true,
    "questoes": []
  }
}
```

O Estudea congela a ordem sorteada das questões e alternativas ao iniciar cada sessão da Arena. Na trilha, as alternativas são reorganizadas a cada carregamento/tentativa sem alterar o gabarito.

Regras validadas para `arena.questoes`:

- somente `multipla_escolha` e `verdadeiro_falso`;
- enunciado de até 120 caracteres;
- no máximo quatro opções para múltipla escolha e exatamente `Verdadeiro`/`Falso` no outro tipo;
- exatamente uma resposta correta;
- alerta quando a Arena habilitada possui entre uma e quatro questões.

Ao gerar conteúdo novo, prefira de 5 a 10 questões e exatamente quatro alternativas na múltipla escolha. Ao importar material com questões existentes, preserve todas, até o limite técnico de 100.

### 3.3 Formato com tags versus JSON do MCP

Os documentos `GUIA_FORMATO_IMPORTACAO_IA.md` e `instrucoes_ia.md` descrevem o formato humano usado ao copiar e colar conteúdo na interface. As ferramentas de criação e atualização do MCP usam JSON estruturado.

Quando o professor fornecer um texto com `[TÍTULO]`, `[CONTEÚDO]`, `[QUESTÕES]` ou `[ARENA_QUESTÕES]`, use o fluxo:

```text
texto com tags
  → interpretar_importacao_formatada
  → corrigir erros e revisar alertas
  → validar_aula
  → apresentar resumo ao professor
  → criar_aula_rascunho, somente quando solicitado
```

`interpretar_importacao_formatada` nunca grava dados. O retorno contém `aula`, `validacao`, `alertas_importacao` e `resumo_importacao`. A ferramenta interpreta uma aula por chamada; ao encontrar outro `[TÍTULO]`, mantém somente a primeira aula e emite um alerta para que o conteúdo seja dividido.

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

As migrações específicas da integração são:

```text
supabase/migrations/20260826010000_create_mcp_lesson_tools.sql
supabase/migrations/20260827010000_expand_mcp_course_management.sql
supabase/migrations/20260827020000_harden_mcp_lesson_release.sql
```

Ao atualizar uma instalação existente, publique a migration `20260827020000` e o MCP `0.4.0` na mesma janela de manutenção: ela substitui a assinatura da RPC de liberação para tornar `revision_id` obrigatório.

Elas incluem:

- RPCs transacionais de módulo, aula, lote, arquivamento e liberação;
- controle otimista por `updated_at`/`revision_id`;
- revalidação transacional imediatamente antes de liberar uma aula;
- Arena independente, opções estruturadas e materiais múltiplos;
- registro pós-aula separado do conteúdo do aluno;
- validação de professor, curso, módulo, aula e turma;
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
  "version": "0.4.0",
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
7. revise as 19 ferramentas encontradas;
8. conclua o login e o consentimento no Estudea.

Não selecione **No authentication** em produção. O ChatGPT deve descobrir o OAuth a partir do `401` e dos documentos `.well-known`.

Após alterações em ferramentas, schemas, descrições ou autenticação, publique o MCP e use **Refresh** na conexão do ChatGPT antes de testar novamente.

## 12. Roteiro de testes

Teste primeiro com curso, módulo e turma que possam receber dados de homologação.

### 12.1 Descoberta e leitura

> Use o Estudea para listar os cursos que posso editar. Não faça alterações.

> Liste os módulos do curso de Informática e mostre os respectivos IDs.

### 12.2 Conversão do formato com tags

> Converta este conteúdo do formato de importação do Estudea. Mostre o JSON, os erros e os alertas. Não salve nada.

Confirme que `interpretar_importacao_formatada` reconhece as seções, separa questões da aula, atividade e Arena e não cria registros no banco.

### 12.3 Criação de rascunho

> Prepare uma aula textual sobre organização de arquivos no Windows 11, com uma atividade prática e cinco questões. Mostre o resumo antes de salvar. Salve somente como rascunho e não libere para nenhuma turma.

Depois, confirme no Estudea que:

- a aula foi criada no módulo correto;
- atividades e questões foram persistidas;
- a aula ainda não foi liberada;
- o log de auditoria foi criado.

### 12.4 Validação, edição e lote

> Valide uma aula sobre tratamento de imagens. Não salve nada; mostre todos os erros e alertas encontrados.

> Liste as aulas da UC1, consulte a aula escolhida e corrija apenas o conteúdo e a Arena. Use o `revision_id` retornado e mantenha como rascunho.

> Prepare três aulas para a UC2. Valide o lote inteiro, verifique números e ordens duplicadas, mostre o resumo e só então crie todas como rascunho. Não libere nenhuma.

Confirme que uma edição feita com `revision_id` antigo falha, em vez de sobrescrever a versão mais recente.

### 12.5 Liberação controlada

> Consulte a aula que acabamos de criar e liste as turmas compatíveis. Mostre exatamente qual turma será afetada e peça minha confirmação antes de liberar.

Confirme somente em uma turma de teste. A ferramenta exige confirmação explícita e o `revision_id` devolvido pela consulta mais recente. Ela revalida os dados persistidos dentro da mesma transação da liberação e deve rejeitar uma aula inválida, uma revisão desatualizada ou uma tentativa ambígua.

Depois, repita a mesma chamada com a mesma `idempotency_key`: o resultado deve indicar `idempotent_replay` sem criar uma segunda liberação ou outro log de operação.

### 12.6 Isolamento entre professores

Repita a conexão com um segundo professor e confirme que ele não consegue editar cursos ou turmas aos quais não possui acesso.

### 12.7 Revogação

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
- liberação exige confirmação explícita, `revision_id` atual e uma última validação transacional;
- retirada de turma e arquivamento exigem confirmação explícita;
- não existe ferramenta de exclusão definitiva;
- rascunhos liberados não podem ser substituídos ou arquivados até a retirada das turmas;
- `revision_id` impede que uma edição antiga sobrescreva uma edição recente ou que uma versão já alterada seja liberada;
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
| `concurrent_lesson_update` | A aula mudou depois da consulta | Consulte novamente e use o novo `revision_id` |
| `concurrent_lesson_release` | A aula mudou antes da liberação | Consulte e valide novamente antes de confirmar |
| `lesson_invalid_for_release` | O rascunho persistido não atende às regras | Corrija a aula, execute `validar_aula` e tente com a nova revisão |
| Coluna `arquivado_em` não existe | Frontend/MCP publicados antes da migração nova | Aplique todas as migrações e depois faça o redeploy |

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
