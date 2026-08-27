import { validateLessonPayload } from './lesson-validation.js';

type QuestionType = 'multipla_escolha' | 'verdadeiro_falso' | 'aberta' | 'multipla_selecao';
type QuestionDestination = 'aula' | 'atividade' | 'arena';
type DeliveryType = 'texto' | 'imagem' | 'quiz' | 'multipla' | 'arquivo';

type ImportedOption = { id: string; texto: string };

type ImportedQuestion = {
  enunciado: string;
  tipo: QuestionType;
  opcoes: ImportedOption[];
  respostas_corretas: string[];
  ordem: number;
  destino: QuestionDestination;
  gabarito_recomendado?: string;
  palavras_chave_aprovacao?: string[];
};

const TAG_PATTERN = /^\s*\[(T[IÍ]TULO|DESCRI[CÇ][AÃ]O|CONTE[UÚ]DO|LINK_ARQUIVO|ATIVIDADE|QUEST[OÕ]ES|ARENA_QUEST[OÕ]ES|ARENA)\]\s*$/gimu;

const canonical = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleUpperCase('pt-BR');

const comparable = (value: string) => value.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
const optionId = (index: number) => String.fromCharCode(97 + index);

const extractSections = (text: string) => {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const matches = [...normalized.matchAll(TAG_PATTERN)];
  const sections = new Map<string, string>();
  let foundTitle = false;
  let stoppedAtNextLesson = false;

  for (const [index, match] of matches.entries()) {
    const key = canonical(match[1]);
    if (key === 'TITULO' && foundTitle) {
      stoppedAtNextLesson = true;
      break;
    }
    if (key === 'TITULO') foundTitle = true;
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index || normalized.length) : normalized.length;
    const content = normalized.slice(start, end).trim();
    const previous = sections.get(key);
    sections.set(key, previous ? `${previous}\n\n${content}` : content);
  }

  return { sections, stoppedAtNextLesson };
};

const splitQuestionBlocks = (content: string) => {
  const blocks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.some((line) => line.trim())) blocks.push(current.join('\n'));
    current = [];
  };

  content.replace(/\r\n?/g, '\n').split('\n').forEach((line) => {
    const isHeader = /^(?:Pergunta|Questão)\s*\d*\s*:/iu.test(line.trim());
    const isSeparator = /^\s*---+\s*$/.test(line);
    if (isSeparator) {
      flush();
      return;
    }
    if (isHeader && current.some((item) => item.trim())) flush();
    if (isHeader || current.length > 0) current.push(line);
  });
  flush();
  return blocks;
};

const parseQuestionType = (raw: string): QuestionType => {
  const value = canonical(raw).toLocaleLowerCase('pt-BR');
  if (value === 'verdadeiro_falso' || value === 'vf' || value === 'v_f' || value.includes('verdadeiro')) {
    return 'verdadeiro_falso';
  }
  if (value === 'aberta' || value.includes('dissertativa')) return 'aberta';
  if (value === 'multipla_selecao' || value.includes('multiplas_respostas') || value.includes('selecao')) {
    return 'multipla_selecao';
  }
  return 'multipla_escolha';
};

const parseDestination = (raw: string, fallback: QuestionDestination): QuestionDestination => {
  const value = canonical(raw).toLocaleLowerCase('pt-BR');
  if (value.includes('arena')) return 'arena';
  if (value.includes('atividade')) return 'atividade';
  if (value.includes('aula')) return 'aula';
  return fallback;
};

const parseQuestionBlocks = (
  content: string,
  defaultDestination: QuestionDestination,
  importWarnings: string[],
) => splitQuestionBlocks(content).map((block, blockIndex) => {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  let prompt = '';
  let type: QuestionType = 'multipla_escolha';
  let destination = defaultDestination;
  let rawAnswer = '';
  let recommendedAnswer = '';
  let rawKeywords = '';
  const optionTexts: string[] = [];

  for (const line of lines) {
    const header = line.match(/^(?:Pergunta|Questão)\s*\d*\s*:\s*(.*)$/iu);
    const typeMatch = line.match(/^Tipo\s*:\s*(.*)$/iu);
    const destinationMatch = line.match(/^Destino\s*:\s*(.*)$/iu);
    const answerMatch = line.match(/^(?:Resposta\s+Correta|Resposta)\s*:\s*(.*)$/iu);
    const recommendedMatch = line.match(/^Gabarito(?:\s+Recomendado)?(?:\s*\([^)]*\))?\s*:\s*(.*)$/iu);
    const keywordsMatch = line.match(/^Palavras-chave(?:\s+de\s+aprova[cç][aã]o)?(?:\s*\([^)]*\))?\s*:\s*(.*)$/iu);
    const optionMatch = line.match(/^(?:[*•-]\s*|[a-hA-H][).]\s+)(.+)$/u);

    if (header) prompt = header[1].trim();
    else if (typeMatch) type = parseQuestionType(typeMatch[1]);
    else if (destinationMatch) destination = parseDestination(destinationMatch[1], defaultDestination);
    else if (answerMatch) rawAnswer = answerMatch[1].trim();
    else if (recommendedMatch) recommendedAnswer = recommendedMatch[1].trim();
    else if (keywordsMatch) rawKeywords = keywordsMatch[1].trim();
    else if (optionMatch) optionTexts.push(optionMatch[1].trim());
  }

  if (type === 'verdadeiro_falso' && optionTexts.length === 0) {
    optionTexts.push('Verdadeiro', 'Falso');
  }

  const options = type === 'aberta'
    ? []
    : optionTexts.map((texto, index) => ({ id: optionId(index), texto }));
  const answerTokens = type === 'multipla_selecao'
    ? rawAnswer.split(';').map((item) => item.trim()).filter(Boolean)
    : rawAnswer ? [rawAnswer] : [];
  const answerIds = answerTokens.map((answer) => {
    const match = options.find((option) => (
      comparable(option.id) === comparable(answer) || comparable(option.texto) === comparable(answer)
    ));
    if (!match) {
      importWarnings.push(`Questão ${blockIndex + 1}: a resposta “${answer}” não corresponde a uma alternativa.`);
    }
    return match?.id || answer;
  });
  const keywords = rawKeywords.split(',').map((keyword) => keyword.trim()).filter(Boolean);

  return {
    enunciado: prompt,
    tipo: type,
    opcoes: options,
    respostas_corretas: type === 'aberta' ? [] : answerIds,
    ordem: blockIndex + 1,
    destino: destination,
    ...(type === 'aberta' && recommendedAnswer ? { gabarito_recomendado: recommendedAnswer } : {}),
    ...(type === 'aberta' && keywords.length > 0 ? { palavras_chave_aprovacao: keywords } : {}),
  } satisfies ImportedQuestion;
});

const firstUrlOrText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || ['nenhum', 'none', 'não', 'nao'].includes(comparable(trimmed))) return undefined;
  return trimmed.match(/https?:\/\/[^\s)]+/u)?.[0] || trimmed;
};

const parseActivity = (content: string) => {
  if (!content.trim()) return undefined;
  const activeMatch = content.match(/Ativa\s*:\s*(Sim|Não|Nao|Yes|No)/iu);
  if (activeMatch && ['não', 'nao', 'no'].includes(comparable(activeMatch[1]))) return undefined;

  const promptMatch = content.match(/Enunciado\s*:\s*([\s\S]*?)(?=\n\s*(?:Tipo\s+de\s+Entrega|Material(?:\s+de\s+Apoio)?|Questionário\s+Próprio)\s*:|$)/iu);
  const deliveryMatch = content.match(/Tipo\s+de\s+Entrega\s*:\s*(\w+)/iu);
  const materialMatch = content.match(/Material(?:\s+de\s+Apoio)?\s*:\s*([^\n]+)/iu);
  const materialUrl = firstUrlOrText(materialMatch?.[1] || '');
  const supported = new Set<DeliveryType>(['texto', 'imagem', 'quiz', 'multipla', 'arquivo']);
  const requestedDelivery = (deliveryMatch?.[1] || 'texto').toLocaleLowerCase('pt-BR') as DeliveryType;

  return {
    enunciado: promptMatch?.[1].trim() || '',
    tipo_entrega: supported.has(requestedDelivery) ? requestedDelivery : 'texto',
    pontua: true,
    permite_refazer: true,
    ...(materialUrl ? { material_url: materialUrl } : {}),
    questoes: [] as Array<Omit<ImportedQuestion, 'destino'>>,
  };
};

const withoutDestination = ({ destino, ...question }: ImportedQuestion) => {
  void destino;
  return question;
};

export const interpretTaggedLesson = (text: string) => {
  const { sections, stoppedAtNextLesson } = extractSections(text);
  const importWarnings: string[] = [];
  if (stoppedAtNextLesson) {
    importWarnings.push('Foram detectadas várias aulas no mesmo texto. Apenas a primeira foi interpretada; envie cada bloco [TÍTULO] separadamente.');
  }
  const standardBlock = sections.get('QUESTOES') || '';
  const arenaBlock = [sections.get('ARENA_QUESTOES'), sections.get('ARENA')].filter(Boolean).join('\n\n');
  const parsedQuestions = [
    ...parseQuestionBlocks(standardBlock, 'aula', importWarnings),
    ...parseQuestionBlocks(arenaBlock, 'arena', importWarnings),
  ];
  const standardQuestions = parsedQuestions.filter((question) => question.destino === 'aula').map(withoutDestination);
  const activityQuestions = parsedQuestions.filter((question) => question.destino === 'atividade').map(withoutDestination);
  const arenaQuestions = parsedQuestions.filter((question) => question.destino === 'arena').map(withoutDestination);
  const activity = parseActivity(sections.get('ATIVIDADE') || '');

  if (activityQuestions.length > 0) {
    if (activity && activity.tipo_entrega !== 'quiz') {
      importWarnings.push('A atividade foi convertida para tipo quiz porque possui questões com Destino: Atividade.');
    }
    if (!activity) importWarnings.push('Há questões de atividade, mas o bloco [ATIVIDADE] não foi informado.');
  }

  const activities = activity
    ? [{
      ...activity,
      tipo_entrega: activityQuestions.length > 0 ? 'quiz' as const : activity.tipo_entrega,
      questoes: activityQuestions,
    }]
    : activityQuestions.length > 0
      ? [{
        enunciado: '',
        tipo_entrega: 'quiz' as const,
        pontua: true,
        permite_refazer: true,
        questoes: activityQuestions,
      }]
      : [];

  const content = sections.get('CONTEUDO') || '';
  const fileUrl = firstUrlOrText(sections.get('LINK_ARQUIVO') || '');
  const lesson = {
    titulo: sections.get('TITULO') || '',
    descricao: sections.get('DESCRICAO') || '',
    conteudo: content,
    tipo: content.length >= 20 ? 'texto' : standardQuestions.length > 0 ? 'quiz' : fileUrl ? 'arquivo' : 'texto',
    ...(fileUrl ? { arquivo_url: fileUrl } : {}),
    atividades: activities,
    questoes: standardQuestions,
    ...(arenaQuestions.length > 0 ? {
      arena: {
        habilitada: true,
        embaralhar_questoes: true,
        embaralhar_opcoes: true,
        questoes: arenaQuestions,
      },
    } : {}),
  };
  const validation = validateLessonPayload(lesson);

  return {
    aula: lesson,
    validacao: validation,
    alertas_importacao: importWarnings,
    resumo_importacao: {
      secoes_reconhecidas: [...sections.keys()],
      questoes_estudea: standardQuestions.length,
      questoes_atividade: activityQuestions.length,
      questoes_arena: arenaQuestions.length,
      atividades: activities.length,
    },
  };
};
