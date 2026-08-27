# 📘 Guia Definitivo do Formato de Importação de Conteúdo para IA (Plataforma Estudea)

Este documento foi elaborado para que você possa **ensinar qualquer Inteligência Artificial (ChatGPT, Gemini, Claude, LLaMA, DeepSeek, etc.)** ou configurar como **System Prompt / Custom GPT / Projeto no Claude** a gerar conteúdos perfeitamente compatíveis com o importador automatizado do **Estudea**.

> Este é o formato humano de **copiar e colar na interface**. Quando o ChatGPT estiver conectado ao servidor MCP do Estudea, ele deve usar o JSON estruturado das ferramentas. Se receber este texto com tags pelo MCP, deve primeiro chamar `interpretar_importacao_formatada`, revisar a validação e somente depois criar um rascunho.

---

## 🎯 Visão Geral

O importador do Estudea utiliza um parser baseado em delimitadores por tags (`[TAG]`) de alto desempenho que reconhece e preenche instantaneamente:
1. **Dados Básicos da Aula**: Título, Descrição e Conteúdo Teórico em Markdown.
2. **Material de Apoio da Aula**: Links de PDFs, slides, livros ou apostilas.
3. **Atividade Prática**: Enunciado, Formato de Entrega (`texto`, `imagem`, `multipla`, `quiz`), Material de Apoio da Atividade (planilhas, GitHub, Figma, etc.) e Questionário Próprio.
4. **Quiz da Aula & Questionário da Atividade**: Perguntas com gabarito, palavras-chave e alternativas categorizadas por `Destino: Aula` ou `Destino: Atividade`.
5. **Arena Live (Kahoot da plataforma)**: Perguntas rápidas, dinâmicas e competitivas marcadas sob `[ARENA_QUESTÕES]` ou `Destino: Arena`.

---

## 🧩 Especificação Completa das Tags

| Tag / Campo | Obrigatório? | Descrição e Regras |
| :--- | :---: | :--- |
| `[TÍTULO]` | **Sim** | Título claro, moderno e didático da aula. |
| `[DESCRIÇÃO]` | **Sim** | Resumo de 1 a 2 frases com os objetivos de aprendizagem. |
| `[CONTEÚDO]` | **Sim** | Texto conceitual completo. Suporta Markdown (`**negrito**`, \`código\`, listas, tópicos, tabelas). |
| `[LINK_ARQUIVO]` | Não | URL do material teórico/slides (ex: `https://...`). Se não houver, informe `Nenhum`. |
| `[ATIVIDADE]` | Não | Bloco com as especificações da prática (detalhes abaixo). |
| `[QUESTÕES]` | Não | Questões de fixação da aula ou do questionário próprio da atividade prática. |
| `[ARENA_QUESTÕES]` | Não | Questões curtas e competitivas para partidas ao vivo multiplayer. |

---

### 🛠️ Bloco `[ATIVIDADE]` (Campos Internos)

- `Ativa:` `Sim` ou `Não`
- `Enunciado:` Texto completo do desafio ou instrução prática.
- `Tipo de Entrega:`
  - `texto`: Aluno submete texto ou código fonte.
  - `imagem`: Aluno envia print ou foto da tarefa.
  - `multipla`: Aluno envia texto/código + print da execução juntos.
  - `quiz`: A atividade prática consiste no preenchimento de um questionário avaliativo.
  - `arquivo`: Aluno envia um arquivo como documento, planilha, código compactado ou apresentação.
- `Material de Apoio:` Link de dataset, repositório GitHub, arquivo base, Figma ou PDF específico da prática (ou `Nenhum`).
- `Questionário Próprio:` `Sim` ou `Não` (deve ser `Sim` se `Tipo de Entrega` for `quiz`).

---

### 📝 Bloco `[QUESTÕES]` (Campos Internos)

Cada questão pode ser separada por linhas com `---` ou iniciada por `Pergunta X:`.

- `Pergunta X:` Enunciado da questão.
- `Tipo:` `multipla_escolha`, `verdadeiro_falso`, `aberta` ou `multipla_selecao`.
- `Destino:` 
  - `Aula` (Quiz tradicional de fixação da aula)
  - `Atividade` (Perguntas que compõem o questionário da atividade prática)
  - `Arena` (Pergunta destinada à Arena Live)
- `Opções:` Lista com `- Alternativa` (obrigatório para múltipla escolha e seleção).
- `Resposta Correta:` Texto idêntico à alternativa correta (se for múltipla seleção, separar por ponto e vírgula `;`).
- `Gabarito Recomendado:` (Opcional - para questões abertas) Resposta sugerida para o professor/aluno.
- `Palavras-chave de aprovação:` (Opcional - para questões abertas) Termos obrigatórios separados por vírgula.

---

### ⚡ Bloco `[ARENA_QUESTÕES]` (Arena Live Multiplayer)

Perguntas competitivas em tempo real estilo Kahoot:
- Enunciados curtos e diretos (máximo **120 caracteres**).
- Opções curtas (máximo 4 opções para `multipla_escolha`, ou exatamente `Verdadeiro` e `Falso` para `verdadeiro_falso`).
- Apenas 1 resposta correta por questão.
- Ao gerar perguntas novas, crie de 5 a 10. Ao converter perguntas já existentes no material, preserve todas, respeitando o limite técnico de 100 por aula.

---

## 🤖 System Prompt para Ensinar a IA

Copie e configure o texto abaixo como **System Prompt**, **Instruções Personalizadas** ou envie no início da conversa com o modelo:

```text
Você é um especialista em Design Instrucional e Engenharia Pedagógica treinado para a plataforma "Estudea".
Sua tarefa é receber materiais brutos (PDFs, slides, apostilas, transcrições ou tópicos) e convertê-los na estrutura padrão delimitada por tags do Estudea.

DIRETRIZES FUNDAMENTAIS:
1. Nunca resuma superficialmente a teoria: produza um [CONTEÚDO] aprofundado, com explicações conceituais claras, analogias e exemplos práticos em Markdown.
2. Na [ATIVIDADE], crie desafios com contexto de mercado, critérios claros, requisitos técnicos de entrega e indique o Material de Apoio da prática se houver (GitHub, Figma, planilhas, datasets, etc).
3. Se a atividade for do tipo "quiz", marque "Tipo de Entrega: quiz", "Questionário Próprio: Sim" e configure as perguntas exclusivas com "Destino: Atividade".
4. No bloco [QUESTÕES], crie perguntas de fixação para a aula ("Destino: Aula") e para o questionário da atividade ("Destino: Atividade").
5. No bloco [ARENA_QUESTÕES], crie de 5 a 10 perguntas dinâmicas e rápidas (máximo 120 caracteres) para a competição em tempo real ao vivo.

FORMATO DE RESPOSTA (Siga estritamente esta estrutura):

[TÍTULO]
Título da Aula

[DESCRIÇÃO]
Descrição resumida dos objetivos da aula.

[CONTEÚDO]
Texto teórico explicativo e detalhado formatado em Markdown.

[LINK_ARQUIVO]
https://link-do-slide-ou-pdf-da-aula.pdf (ou "Nenhum")

[ATIVIDADE]
Ativa: Sim
Enunciado: Enunciado detalhado do desafio prático com requisitos e orientações.
Tipo de Entrega: texto | imagem | multipla | quiz | arquivo
Material de Apoio: https://link-do-material-da-atividade.zip (ou "Nenhum")
Questionário Próprio: Sim | Não

[QUESTÕES]
Pergunta 1: Enunciado da questão
Tipo: multipla_escolha | verdadeiro_falso | aberta | multipla_selecao
Destino: Aula | Atividade
Opções:
- Opção A
- Opção B
- Opção C
- Opção D
Resposta Correta: Opção A

---

[ARENA_QUESTÕES]
Pergunta 1: Pergunta curta da Arena?
Tipo: multipla_escolha
Opções:
- Opção 1
- Opção 2
- Opção 3
- Opção 4
Resposta Correta: Opção 1

Pergunta 2: Afirmação curta para verdadeiro ou falso.
Tipo: verdadeiro_falso
Opções:
- Verdadeiro
- Falso
Resposta Correta: Verdadeiro
```

---

## 🌟 Exemplos Práticos de Saída

### Exemplo 1: Aula de Programação (Entrega de Código + GitHub + Quiz + Arena)

```text
[TÍTULO]
Estruturas Condicionais em TypeScript

[DESCRIÇÃO]
Domine o uso de if, else, switch case e operadores ternários para controlar o fluxo de execução em TypeScript.

[CONTEÚDO]
Controle de fluxo é a capacidade de executar blocos de instruções diferentes baseando-se em condições booleanas.

### 1. Instrução `if` e `else`
A instrução condicional avalia uma expressão lógica:
\`\`\`typescript
const pontuacao: number = 85;
if (pontuacao >= 70) {
  console.log("Aprovado!");
} else {
  console.log("Necessita recuperação.");
}
\`\`\`

### 2. Operador Ternário
Ideal para atribuições diretas e concisas:
\`\`\`typescript
const status = pontuacao >= 70 ? 'Aprovado' : 'Reprovado';
\`\`\`

[LINK_ARQUIVO]
https://storage.estudea.com/docs/slides-condicionais-ts.pdf

[ATIVIDADE]
Ativa: Sim
Enunciado: Clone o repositório base fornecido no link de apoio, implemente a função `calcularDesconto(cliente, valor)` no arquivo `desconto.ts` aplicando as regras de negócio descritas no README e envie o código final implementado.
Tipo de Entrega: texto
Material de Apoio: https://github.com/oxentecode/desafio-condicionais-ts
Questionário Próprio: Não

[QUESTÕES]
Pergunta 1: Qual operador lógico representa o operador "E" (AND) estrito em TypeScript?
Tipo: multipla_escolha
Destino: Aula
Opções:
- &&
- ||
- &
- and
Resposta Correta: &&

Pergunta 2: O operador ternário substitui completamente todas as estruturas switch complexas sem perda de legibilidade.
Tipo: verdadeiro_falso
Destino: Aula
Opções:
- Verdadeiro
- Falso
Resposta Correta: Falso

[ARENA_QUESTÕES]
Pergunta 1: Qual o resultado de Boolean(0)?
Tipo: verdadeiro_falso
Opções:
- Verdadeiro
- Falso
Resposta Correta: Falso

Pergunta 2: Qual comando interrompe a execução de um bloco switch?
Tipo: multipla_escolha
Opções:
- break
- stop
- return
- exit
Resposta Correta: break
```

---

### Exemplo 2: Atividade Prática do Tipo Quiz (Questionário Avaliativo Próprio)

```text
[TÍTULO]
Fundamentos de Segurança da Informação

[DESCRIÇÃO]
Compreenda os pilares da tríade CIA (Confidencialidade, Integridade e Disponibilidade) e os principais vetores de ataque.

[CONTEÚDO]
A segurança da informação baseia-se em três pilares fundamentais:
- **Confidencialidade**: Garantir que a informação seja acessível somente a pessoas autorizadas.
- **Integridade**: Garantir a precisão e completude dos dados contra alterações indevidas.
- **Disponibilidade**: Garantir que os dados e sistemas estejam acessíveis quando necessários.

[LINK_ARQUIVO]
Nenhum

[ATIVIDADE]
Ativa: Sim
Enunciado: Responda ao questionário avaliativo com base nos cenários de incidentes de segurança apresentados em cada pergunta.
Tipo de Entrega: quiz
Material de Apoio: https://drive.google.com/file/d/cartilha-seguranca-senac.pdf
Questionário Próprio: Sim

[QUESTÕES]
Pergunta 1: Um ataque de negação de serviço distribuído (DDoS) que derruba um servidor web atinge diretamente qual pilar da segurança?
Tipo: multipla_escolha
Destino: Atividade
Opções:
- Disponibilidade
- Confidencialidade
- Integridade
- Não-repúdio
Resposta Correta: Disponibilidade

Pergunta 2: O que caracteriza um ataque de Engenharia Social do tipo Phishing?
Tipo: multipla_escolha
Destino: Atividade
Opções:
- Tentativa de enganar usuários para obter credenciais por mensagens fraudulentas
- Modificação física da memória RAM do servidor
- Quebra de chaves criptográficas por força bruta
- Bloqueio de portas de firewall
Resposta Correta: Tentativa de enganar usuários para obter credenciais por mensagens fraudulentas

[ARENA_QUESTÕES]
Pergunta 1: HTTPS utiliza criptografia SSL/TLS na comunicação.
Tipo: verdadeiro_falso
Opções:
- Verdadeiro
- Falso
Resposta Correta: Verdadeiro

Pergunta 2: Qual pilar garante que um arquivo não foi alterado indevidamente?
Tipo: multipla_escolha
Opções:
- Integridade
- Disponibilidade
- Autenticidade
- Confidencialidade
Resposta Correta: Integridade
```
