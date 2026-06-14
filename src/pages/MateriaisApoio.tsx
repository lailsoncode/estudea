import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon, Tick01Icon, BookOpen01Icon, Award01Icon } from '@hugeicons/core-free-icons';

const AI_LESSON_PROMPT = `Você é um designer instrucional e professor sênior encarregado de preparar e organizar o conteúdo de uma aula de alta qualidade para a plataforma "Estudea".
Seu trabalho é ler o material bruto fornecido (PDF da aula, slides, transcrições ou notas cruas) e reescrevê-lo em um formato altamente didático, detalhado e estruturado.

### 🌟 DIRETRIZES DE QUALIDADE PEDAGÓGICA (LEIA COM ATENÇÃO):
1. **Profundidade Teórica (Não resuma superficialmente)**: O conteúdo teórico na seção \`[CONTEÚDO]\` deve ser **rico, denso e aprofundado**. Explique detalhadamente os conceitos, use analogias claras e forneça blocos de exemplos práticos reais (se o tema envolver código, use trechos de código estruturados e explicados).
2. **Atividades Práticas Relevantes**: Na seção \`[ATIVIDADE]\`, crie um exercício que represente um **desafio prático e realista** (simulando demandas de mercado ou projetos de verdade). Evite atividades puramente teóricas ou óbvias. Defina com clareza: O Contexto do Desafio, Requisitos Técnicos da Entrega e o Formato de Envio.
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
  const [activeSubTab, setActiveSubTab] = useState<'lessons' | 'arena'>('lessons');
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = () => {
    const textToCopy = activeSubTab === 'lessons' ? AI_LESSON_PROMPT : AI_ARENA_PROMPT;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-card-padded space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
        <div>
          <h3 className="app-section-title flex items-center gap-2 text-on-surface">
            <HugeiconsIcon icon={SparklesIcon} className="text-primary" size={20} />
            Assistente de Prompt de IA (Preparação de Conteúdos)
          </h3>
          <p className="text-body-md text-on-surface-variant mt-1">
            Copie os prompts padronizados e use-os no <strong>Gemini</strong> ou <strong>ChatGPT</strong> para processar seus materiais e alimentar a IA do Estudea.
          </p>
        </div>
      </div>

      {/* Sub-Tabs for selecting template type */}
      <div className="flex border-b border-outline-variant/40 mb-4 bg-surface-container-lowest p-1 rounded-xl gap-2 max-w-md">
        <button
          onClick={() => { setActiveSubTab('lessons'); setCopied(false); }}
          className={`flex-1 py-2 px-3 rounded-lg text-label-sm font-heading font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'lessons'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <HugeiconsIcon icon={BookOpen01Icon} size={14} />
          Preparação de Aulas
        </button>
        <button
          onClick={() => { setActiveSubTab('arena'); setCopied(false); }}
          className={`flex-1 py-2 px-3 rounded-lg text-label-sm font-heading font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'arena'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <HugeiconsIcon icon={Award01Icon} size={14} />
          Preparação da Arena Live
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Explanatory Section */}
        <div className="lg:col-span-1 space-y-5 text-left">
          <h4 className="font-heading font-bold text-body-md text-on-surface border-b border-outline-variant/30 pb-2">Como utilizar este fluxo?</h4>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-sm shrink-0">1</div>
              <div>
                <p className="text-label-md font-bold text-on-surface">Copie o Prompt Temático</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  {activeSubTab === 'lessons'
                    ? 'Clique em "Copiar Prompt" para copiar as diretrizes de aulas conceituais, atividades e quiz geral.'
                    : 'Clique em "Copiar Prompt" para copiar as diretrizes de extração de perguntas curtas para a competição multiplayer.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-sm shrink-0">2</div>
              <div>
                <p className="text-label-md font-bold text-on-surface">Processe seu PDF Externamente</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">Abra a IA externa de sua preferência, envie seu material de apoio (PDF/Texto) e envie junto com o prompt copiado.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-sm shrink-0">3</div>
              <div>
                <p className="text-label-md font-bold text-on-surface">Insira no Estudea</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  {activeSubTab === 'lessons'
                    ? 'Copie o texto com as tags (ex: [TÍTULO], [ATIVIDADE]) gerado pela IA, vá ao Course Builder, ative "Criar com IA" e cole para montar a aula!'
                    : 'Copie a lista de perguntas gerada sob [ARENA_QUESTÕES], abra o gerador de questões da Arena (Kahoot) no criador da aula e cole na caixa de texto da IA!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Textbox Section */}
        <div className="lg:col-span-2 space-y-3 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              {activeSubTab === 'lessons' ? 'Prompt de Preparação de Aula' : 'Prompt de Preparação da Arena (Kahoot)'}
            </span>
            <button
              onClick={handleCopyPrompt}
              className={`px-4 py-2 rounded-xl text-label-sm font-heading font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                copied
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-primary text-on-primary hover:bg-primary-container hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <HugeiconsIcon icon={copied ? Tick01Icon : SparklesIcon} size={14} />
              {copied ? 'Copiado!' : 'Copiar Prompt de IA'}
            </button>
          </div>

          <textarea
            readOnly
            value={activeSubTab === 'lessons' ? AI_LESSON_PROMPT : AI_ARENA_PROMPT}
            className="w-full h-[380px] p-4 text-[13px] font-mono leading-relaxed bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 outline-none resize-none overflow-y-auto"
          />
        </div>
      </div>
    </div>
  );
};
