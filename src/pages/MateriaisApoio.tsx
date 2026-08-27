import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon, Tick01Icon, BookOpen01Icon, Award01Icon, Layers01Icon } from '@hugeicons/core-free-icons';

const AI_UNIFIED_PROMPT = `Você é um designer instrucional e professor sênior encarregado de preparar e organizar o conteúdo COMPLETO de uma aula de excelência para a plataforma "Estudea".
Seu trabalho é ler o material bruto fornecido (PDF da aula, slides, transcrições, notas cruas ou livros) e reescrevê-lo em um formato altamente didático, detalhado e estruturado para importação direta no sistema.

### 🌟 DIRETRIZES DE QUALIDADE PEDAGÓGICA (LEIA COM ATENÇÃO):
1. **Profundidade Teórica (Não resuma superficialmente)**: O conteúdo teórico na seção \`[CONTEÚDO]\` deve ser **rico, denso e aprofundado**. Explique detalhadamente os conceitos, use analogias claras e forneça blocos de exemplos práticos reais (se o tema envolver código, use trechos de código estruturados e explicados em Markdown).
2. **Material de Apoio da Aula**: Na seção \`[LINK_ARQUIVO]\`, informe o link do PDF/slide conceitual caso exista no material original, ou escreva "Nenhum".
3. **Atividade Prática com Material de Apoio**: Na seção \`[ATIVIDADE]\`, crie um exercício que represente um **desafio prático e realista** (simulando demandas de mercado ou projetos reais).
   - Defina com clareza o Enunciado, o Tipo de Entrega (texto, imagem, multipla ou quiz) e o Material de Apoio da Atividade (link do GitHub, Figma, planilha base, dataset, PDF de exercícios ou "Nenhum").
   - Se a atividade consistir em perguntas/questionário prático, defina o Tipo de Entrega como "quiz", \`Questionário Próprio: Sim\` e coloque as perguntas exclusivas da atividade prática na seção \`[QUESTÕES]\` com \`Destino: Atividade\`.
4. **Questões de Fixação (Quiz Geral e da Atividade)**: No campo \`[QUESTÕES]\`, extraia/crie as perguntas de fixação e autoavaliação. Use \`Destino: Aula\` para o quiz geral da aula, ou \`Destino: Atividade\` para perguntas que compõem a entrega da atividade prática do aluno.
5. **Questões Rápidas e Competitivas da Arena Live**: No campo \`[ARENA_QUESTÕES]\`, crie ou extraia de 5 a 10 perguntas dinâmicas e competitivas (estilo Kahoot) com enunciados curtos (máximo 120 caracteres) e opções rápidas de múltipla escolha ou verdadeiro/falso.

O material final deve seguir RIGOROSAMENTE a estrutura abaixo, delimitada por tags, para que o interpretador da plataforma Estudea consiga mapear cada seção automaticamente:

[TÍTULO]
(Escreva aqui um título direto, dinâmico e atraente para a aula)

[DESCRIÇÃO]
(Escreva uma descrição concisa de 1 ou 2 frases resumindo os objetivos pedagógicos da aula)

[CONTEÚDO]
(Crie aqui o conteúdo explicativo e didático da aula conceitual.
Estruture o texto usando Markdown simples:
- Use asteriscos duplos para negritos (ex: **conceito importante**)
- Use crases para termos de código ou comandos (ex: \`let variavel\`)
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
Abaixo está o material de apoio cru para você analisar e estruturar:`;

const AI_LESSON_PROMPT = `Você é um designer instrucional e professor sênior encarregado de preparar e organizar o conteúdo de uma aula de alta qualidade para a plataforma "Estudea".
Seu trabalho é ler o material bruto fornecido (PDF da aula, slides, transcrições ou notas cruas) e reescrevê-lo em um formato altamente didático, detalhado e estruturado.

### 🌟 DIRETRIZES DE QUALIDADE PEDAGÓGICA (LEIA COM ATENÇÃO):
1. **Profundidade Teórica (Não resuma superficialmente)**: O conteúdo teórico na seção \`[CONTEÚDO]\` deve ser **rico, denso e aprofundado**. Explique detalhadamente os conceitos, use analogias claras e forneça blocos de exemplos práticos reais (se o tema envolver código, use trechos de código estruturados e explicados).
2. **Atividades Práticas Relevantes**: Na seção \`[ATIVIDADE]\`, crie um exercício que represente um **desafio prático e realista** (simulando demandas de mercado ou projetos de verdade). Defina com clareza: O Contexto do Desafio, Requisitos Técnicos da Entrega, Material de Apoio da Atividade e o Formato de Envio.
3. **Questões de Quiz Sem Limite de Quantidade**: No campo \`[QUESTÕES]\`, extraia e estruture **TODAS** as questões que porventura existam no material fornecido (mesmo que sejam 10, 20 ou mais). Caso o material original não possua questões e você precise criá-las do zero, elabore uma quantidade relevante (por exemplo, de 5 a 10 questões de fixação) com alternativas distratoras inteligentes.

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
- Use crases para termos de código (ex: \`let variavel\`)
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
Abaixo está o material de apoio cru para você analisar e estruturar:`;

const AI_ARENA_PROMPT = `Você é um designer instrucional encarregado de preparar perguntas competitivas para a "Arena Live" (um quiz multiplayer em tempo real similar ao Kahoot) na plataforma "Estudea".
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
Abaixo está o material de apoio cru para você analisar e extrair as questões da Arena:`;

export const MateriaisApoio: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'unified' | 'lessons' | 'arena'>('unified');
  const [copied, setCopied] = useState(false);

  const getCurrentPrompt = () => {
    switch (activeSubTab) {
      case 'unified':
        return AI_UNIFIED_PROMPT;
      case 'lessons':
        return AI_LESSON_PROMPT;
      case 'arena':
        return AI_ARENA_PROMPT;
      default:
        return AI_UNIFIED_PROMPT;
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(getCurrentPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      {/* Header */}
      <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="product-section-kicker">Materiais & Engenharia de Prompts</span>
          <h1 className="product-section-heading mt-0 text-xl sm:text-2xl flex items-center gap-2">
            <HugeiconsIcon icon={SparklesIcon} className="text-primary animate-pulse" size={20} strokeWidth={2} />
            <span>Assistente de Prompts de IA</span>
          </h1>
          <p className="product-subtitle">
            Copie os prompts padronizados para alimentar o <strong>Gemini</strong>, <strong>ChatGPT</strong> ou <strong>Claude</strong> e gerar estruturas compatíveis com o Estudea.
          </p>
        </div>
      </header>

      {/* Sub-Tabs for selecting template type */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-container-low rounded-product-control border border-outline-variant/60 text-xs w-fit">
        <button
          onClick={() => { setActiveSubTab('unified'); setCopied(false); }}
          className={`py-1.5 px-3 rounded-product-control font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'unified'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <HugeiconsIcon icon={Layers01Icon} size={14} strokeWidth={2} />
          <span>Tudo em 1 (Completo + Arena)</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('lessons'); setCopied(false); }}
          className={`py-1.5 px-3 rounded-product-control font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'lessons'
              ? 'bg-brand-navy text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <HugeiconsIcon icon={BookOpen01Icon} size={14} strokeWidth={2} />
          <span>Apenas Aula & Atividades</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('arena'); setCopied(false); }}
          className={`py-1.5 px-3 rounded-product-control font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'arena'
              ? 'bg-secondary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <HugeiconsIcon icon={Award01Icon} size={14} strokeWidth={2} />
          <span>Apenas Arena Live</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Explanatory Section */}
        <div className="lg:col-span-1 product-card p-4 sm:p-5 space-y-4 text-left h-fit">
          <h4 className="font-heading font-extrabold text-sm text-on-surface border-b border-outline-variant/60 pb-2">Como utilizar este fluxo?</h4>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-product-control bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs shrink-0 border border-primary/20">1</div>
              <div>
                <p className="text-xs font-bold text-on-surface">Copie o Prompt Padronizado</p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5 font-medium">
                  {activeSubTab === 'unified'
                    ? 'O prompt unificado estrutura aula teórica, material complementar, atividade prática, quiz de fixação e arena de uma só vez.'
                    : activeSubTab === 'lessons'
                    ? 'Clique em "Copiar Prompt" para copiar as diretrizes de aulas conceituais, atividades e quiz geral.'
                    : 'Clique em "Copiar Prompt" para copiar as diretrizes de extração de perguntas curtas para a competição multiplayer.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-product-control bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs shrink-0 border border-primary/20">2</div>
              <div>
                <p className="text-xs font-bold text-on-surface">Processe seu PDF ou Material Externamente</p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5 font-medium">Abra o Gemini, ChatGPT ou Claude, envie seu material de apoio (PDF/Texto) junto com o prompt copiado.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-product-control bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs shrink-0 border border-primary/20">3</div>
              <div>
                <p className="text-xs font-bold text-on-surface">Cole no Importador do Estudea</p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5 font-medium">
                  Copie o texto gerado pela IA com as tags, vá no <strong>Course Builder</strong>, cole no campo <strong>"Assistente de Criação com IA"</strong> e clique em gerar para preencher tudo instantaneamente!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Textbox Section */}
        <div className="lg:col-span-2 product-card p-4 sm:p-5 space-y-3 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline-variant/60 pb-3">
            <span className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider font-mono">
              {activeSubTab === 'unified'
                ? 'Prompt Unificado Completo (Tudo em 1)'
                : activeSubTab === 'lessons'
                ? 'Prompt de Preparação de Aula'
                : 'Prompt de Preparação da Arena (Kahoot)'}
            </span>
            <button
              onClick={handleCopyPrompt}
              className={`product-primary-action text-xs !min-h-8 ${
                copied ? '!bg-emerald-600 !text-white' : ''
              }`}
            >
              <HugeiconsIcon icon={copied ? Tick01Icon : SparklesIcon} size={14} strokeWidth={2} />
              <span>{copied ? 'Copiado!' : 'Copiar Prompt de IA'}</span>
            </button>
          </div>

          <textarea
            readOnly
            value={getCurrentPrompt()}
            className="w-full h-[380px] p-4 text-xs font-mono leading-relaxed bg-surface-container-lowest text-on-surface rounded-product-control border border-outline-variant/60 outline-none resize-none overflow-y-auto"
          />
        </div>
      </div>
    </div>
  );
};
