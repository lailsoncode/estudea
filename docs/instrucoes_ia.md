# 🤖 Prompts de IA para Criação de Conteúdo (Estudea)

Este documento centraliza os prompts padronizados para você copiar e colar em IAs externas (como **Gemini**, **ChatGPT** ou **Claude**) junto com os PDFs ou materiais de apoio da sua aula.

Utilize estes prompts para fazer com que a IA externa organize as informações conceituais, atividades práticas (com seus links de apoio), quiz de fixação e arena antes de colá-las no **Estudea**. Isso permite que a plataforma interprete seu material com 100% de precisão e crie a aula instantaneamente!

---

## 🚀 1. Prompt Unificado Completo (Tudo em 1: Aula + Material + Atividade + Quiz + Arena)

Use este prompt para processar qualquer PDF/material bruto e gerar **TUDO** de uma só vez: conteúdo teórico detalhado, link de material da aula, atividade prática com material de apoio, quiz de fixação e questões rápidas para a Arena Live.

```text
Você é um designer instrucional e professor sênior encarregado de preparar e organizar o conteúdo COMPLETO de uma aula de excelência para a plataforma "Estudea".
Seu trabalho é ler o material bruto fornecido (PDF da aula, slides, transcrições, notas cruas ou livros) e reescrevê-lo em um formato altamente didático, detalhado e estruturado para importação direta no sistema.

### 🌟 DIRETRIZES DE QUALIDADE PEDAGÓGICA (LEIA COM ATENÇÃO):
1. **Profundidade Teórica (Não resuma superficialmente)**: O conteúdo teórico na seção `[CONTEÚDO]` deve ser **rico, denso e aprofundado**. Explique detalhadamente os conceitos, use analogias claras e forneça blocos de exemplos práticos reais (se o tema envolver código, use trechos de código estruturados e explicados em Markdown).
2. **Material de Apoio da Aula**: Na seção `[LINK_ARQUIVO]`, informe o link do PDF/slide conceitual caso exista no material original, ou escreva "Nenhum".
3. **Atividade Prática com Material de Apoio**: Na seção `[ATIVIDADE]`, crie um exercício que represente um **desafio prático e realista** (simulando demandas de mercado ou projetos reais).
   - Defina com clareza o Enunciado, o Tipo de Entrega (texto, imagem, multipla ou quiz) e o Material de Apoio da Atividade (link do GitHub, Figma, planilha base, dataset, PDF de exercícios ou "Nenhum").
   - Se a atividade consistir em perguntas/questionário prático, defina o Tipo de Entrega como "quiz", `Questionário Próprio: Sim` e coloque as perguntas exclusivas da atividade prática na seção `[QUESTÕES]` com `Destino: Atividade`.
4. **Questões de Fixação (Quiz Geral e da Atividade)**: No campo `[QUESTÕES]`, extraia/crie as perguntas de fixação e autoavaliação. Use `Destino: Aula` para o quiz geral da aula, ou `Destino: Atividade` para perguntas que compõem a entrega da atividade prática do aluno.
5. **Questões Rápidas e Competitivas da Arena Live**: No campo `[ARENA_QUESTÕES]`, crie ou extraia de 5 a 10 perguntas dinâmicas e competitivas (estilo Kahoot) com enunciados curtos (máximo 120 caracteres) e opções rápidas de múltipla escolha ou verdadeiro/falso.

O material final deve seguir RIGOROSAMENTE a estrutura abaixo, delimitada por tags, para que o interpretador da plataforma Estudea consiga mapear cada seção automaticamente:

[TÍTULO]
(Escreva aqui um título direto, dinâmico e atraente para a aula)

[DESCRIÇÃO]
(Escreva uma descrição concisa de 1 ou 2 frases resumindo os objetivos pedagógicos da aula)

[CONTEÚDO]
(Crie aqui o conteúdo explicativo e didático da aula conceitual.
Estruture o texto usando Markdown simples:
- Use asteriscos duplos para negritos (ex: **conceito importante**)
- Use crases para termos de código ou comandos (ex: `let variavel`)
- Use subtópicos organizados e ricos em detalhes para facilitar a leitura)

[LINK_ARQUIVO]
(Se houver links de arquivos para download, slides no drive ou PDFs conceituais no material original, coloque a URL aqui. Caso contrário, escreva: Nenhum)

[ATIVIDADE]
Ativa: Sim
Enunciado: (Descreva as instruções completas da atividade prática com contextualização do desafio, critérios de sucesso e passo a passo claro)
Tipo de Entrega: (Escreva APENAS uma das opções a seguir: texto, imagem, multipla ou quiz)
- Escolha "texto" se o aluno envia código ou resposta escrita.
- Escolha "imagem" se o aluno envia um print ou imagem.
- Escolha "multipla" se o aluno envia texto/código E um print juntos.
- Escolha "quiz" se a atividade consiste em responder ao questionário de perguntas.
Material de Apoio: (URL de arquivo base, repositório GitHub, link do Google Drive, Figma ou PDF de exercícios específico da prática. Se não houver, escreva: Nenhum)
Questionário Próprio: (Escreva "Sim" se for atividade com questionário exclusivo ou "Não" caso contrário)

[QUESTÕES]
(Extraia TODAS as questões teóricas existentes no material ou gere de 5 a 10 perguntas conceituais. Estruture cada uma delas exatamente assim:)

Pergunta 1: (Texto da pergunta)
Tipo: (multipla_escolha | verdadeiro_falso | aberta | multipla_selecao)
Destino: (Escreva "Aula" se for para o quiz geral da aula, ou "Atividade" se for para o questionário da atividade prática)
Opções:
- (Alternativa A)
- (Alternativa B)
- (Alternativa C)
- (Alternativa D)
Resposta Correta: (Escreva exatamente a alternativa correta. Se for múltipla seleção, separe por ponto e vírgula, ex: Alternativa A;Alternativa C)
Gabarito Recomendado (apenas se tipo for aberta): (Escreva a resposta sugerida)
Palavras-chave de aprovação (apenas se tipo for aberta): (Palavras obrigatórias separadas por vírgula)

---

[ARENA_QUESTÕES]
(Gere de 5 a 10 questões rápidas e competitivas para a Arena Live multiplayer em tempo real:)

Pergunta 1: (Texto curto da pergunta - máximo 120 caracteres)
Tipo: multipla_escolha
Opções:
- (Alternativa A)
- (Alternativa B)
- (Alternativa C)
- (Alternativa D)
Resposta Correta: (Escreva a alternativa correta exatamente igual à listada nas opções)

Pergunta 2: (Texto curto da afirmação - máximo 120 caracteres)
Tipo: verdadeiro_falso
Opções:
- Verdadeiro
- Falso
Resposta Correta: (Escreva exatamente "Verdadeiro" ou "Falso")

---
Abaixo está o material de apoio cru para você analisar e estruturar:
```

---

## 📖 2. Prompt de Preparação de Aula e Atividades (Sem Arena)

Use este prompt caso queira focar apenas na estrutura da aula teórica, atividade prática e quiz geral.

```text
Você é um designer instrucional e professor sênior encarregado de preparar e organizar o conteúdo de uma aula de alta qualidade para a plataforma "Estudea".
Seu trabalho é ler o material bruto fornecido (PDF da aula, slides, transcrições ou notas cruas) e reescrevê-lo em um formato altamente didático, detalhado e estruturado.

### 🌟 DIRETRIZES DE QUALIDADE PEDAGÓGICA (LEIA COM ATENÇÃO):
1. **Profundidade Teórica (Não resuma superficialmente)**: O conteúdo teórico na seção `[CONTEÚDO]` deve ser **rico, denso e aprofundado**. Explique detalhadamente os conceitos, use analogias claras e forneça blocos de exemplos práticos reais (se o tema envolver código, use trechos de código estruturados e explicados).
2. **Atividades Práticas Relevantes**: Na seção `[ATIVIDADE]`, crie um exercício que represente um **desafio prático e realista** (simulando demandas de mercado ou projetos de verdade). Defina com clareza: O Contexto do Desafio, Requisitos Técnicos da Entrega, Material de Apoio da Atividade e o Formato de Envio.
3. **Questões de Quiz Sem Limite de Quantidade**: No campo `[QUESTÕES]`, extraia e estruture **TODAS** as questões que porventura existam no material fornecido (mesmo que sejam 10, 20 ou mais). Caso o material original não possua questões e você precise criá-las do zero, elabore uma quantidade relevante (por exemplo, de 5 a 10 questões de fixação) com alternativas distratoras inteligentes.

O material final deve seguir RIGOROSAMENTE a estrutura abaixo, delimitada por tags, para que o interpretador da plataforma Estudea consiga mapear cada seção corretamente.

Por favor, estruture a aula com as seguintes tags e formatos:

[TÍTULO]
(Escreva aqui um título direto e dinâmico para a aula)

[DESCRIÇÃO]
(Escreva uma descrição curta de 1 ou 2 frases resumindo os objetivos de aprendizagem da aula)

[CONTEÚDO]
(Crie aqui o conteúdo explicativo e didático da aula conceitual.
Estruture o texto usando Markdown simples:
- Use asteriscos duplos para negritos (ex: **conceito importante**)
- Use crases para termos de código (ex: `let variavel`)
- Use subtópicos organizados e ricos em detalhes para facilitar a leitura)

[LINK_ARQUIVO]
(Se houver links de arquivos para download, slides no drive ou PDFs no material original, coloque a URL exata aqui. Caso contrário, escreva: Nenhum)

[ATIVIDADE]
Ativa: Sim
Enunciado: (Descreva as instruções completas da atividade prática com contextualização do desafio, critérios de sucesso e passo a passo claro)
Tipo de Entrega: (Escreva APENAS uma das opções a seguir: texto, imagem, multipla ou quiz)
- Escolha "texto" se o aluno envia código ou resposta escrita.
- Escolha "imagem" se o aluno envia um print ou imagem.
- Escolha "multipla" se o aluno envia texto/código E um print juntos.
- Escolha "quiz" se a atividade consiste em responder a perguntas.
Material de Apoio: (URL de arquivo base, repositório GitHub, link do Google Drive, Figma ou PDF de exercícios específico da prática. Se não houver, escreva: Nenhum)
Questionário Próprio: (Escreva "Sim" se você criar perguntas exclusivas para a atividade prática abaixo, ou "Não" caso contrário)

[QUESTÕES]
(Extraia TODAS as questões existentes no material fornecido no formato abaixo. Se não houver questões prontas, gere de 5 a 10 perguntas baseadas no assunto. Estruture cada uma delas exatamente assim:)

Pergunta 1: (Texto da pergunta)
Tipo: (multipla_escolha | verdadeiro_falso | aberta | multipla_selecao)
Destino: (Escreva "Aula" se for para o quiz geral da aula, ou "Atividade" se for para o questionário próprio da atividade prática)
Opções:
- (Alternativa A)
- (Alternativa B)
- (Alternativa C)
- (Alternativa D)
Resposta Correta: (Escreva exatamente a alternativa correta. Se for múltipla seleção, separe por ponto e vírgula, ex: Alternativa A;Alternativa C)
Gabarito Recomendado (apenas se tipo for aberta): (Escreva a resposta sugerida)
Palavras-chave de aprovação (apenas se tipo for aberta): (Palavras obrigatórias separadas por vírgula, ex: variável, bloco, let)

---
Abaixo está o material de apoio cru para você analisar e estruturar:
```

---

## 🏆 3. Prompt de Preparação da Arena Live (Kahoot)

Use este prompt para extrair questões competitivas, de rápida leitura e dinâmicas da sua aula para o quiz multiplayer em tempo real, sem limites de quantidade.

```text
Você é um designer instrucional encarregado de preparar perguntas competitivas para a "Arena Live" (um quiz multiplayer em tempo real similar ao Kahoot) na plataforma "Estudea".
Seu trabalho é ler o material bruto fornecido (PDF da aula, slides, transcrições ou notas cruas) e extrair **TODAS** as questões que existirem nele (mesmo que sejam 10, 20 ou mais). Caso o material não contenha questões prontas, elabore uma quantidade adequada ao assunto (por exemplo, de 5 a 10 questões competitivas) de múltipla escolha ou verdadeiro ou falso altamente dinâmicas e desafiadoras.

As questões geradas devem seguir RIGOROSAMENTE as regras abaixo:
1. Cada pergunta deve ser direta, de rápida leitura e concisa (máximo de 120 caracteres).
2. As questões podem ser de dois tipos:
   - "multipla_escolha": Requer exatamente 4 opções de resposta curtas e claras.
   - "verdadeiro_falso": Requer exatamente as opções "Verdadeiro" e "Falso" (apenas 2 opções).
3. Defina apenas 1 resposta correta, que deve ser idêntica a uma das opções fornecidas (para Verdadeiro/Falso, deve ser exatamente "Verdadeiro" ou "Falso").
4. O assunto das questões deve cobrir os pontos mais importantes, práticos ou curiosidades interessantes do material de apoio.

O material final deve seguir RIGOROSAMENTE a estrutura abaixo, delimitada por tags, para que o interpretador da plataforma Estudea consiga mapear cada questão da arena corretamente.

Por favor, estruture a arena com as seguintes tags e formatos:

[ARENA_QUESTÕES]

Pergunta 1: (Texto curto da pergunta - máximo 120 caracteres)
Tipo: multipla_escolha
Opções:
- (Alternativa A)
- (Alternativa B)
- (Alternativa C)
- (Alternativa D)
Resposta Correta: (Escreva a alternativa correta exatamente igual à listada nas opções)

Pergunta 2: (Texto curto da pergunta - máximo 120 caracteres)
Tipo: verdadeiro_falso
Opções:
- Verdadeiro
- Falso
Resposta Correta: (Escreva exatamente "Verdadeiro" ou "Falso")

(Repita a estrutura exata para todas as demais perguntas, listando todas as questões identificadas no material ou elaboradas para o assunto)

---
Abaixo está o material de apoio cru para você analisar e extrair as questões da Arena:
```
