export type ValidationIssue = {
  path: Array<string | number>;
  message: string;
};

export type LessonValidationResult = {
  valida: boolean;
  erros: string[];
  alertas: string[];
  resumo: {
    questoes_estudea: number;
    questoes_atividades: number;
    questoes_arena: number;
    atividades: number;
    materiais: number;
  };
  detalhes: {
    erros: ValidationIssue[];
    alertas: ValidationIssue[];
  };
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const asArray = (value: unknown) => Array.isArray(value) ? value : [];
const asText = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const comparable = (value: unknown) => asText(value).toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
const questionTypes = new Set(['multipla_escolha', 'verdadeiro_falso', 'aberta', 'multipla_selecao']);

const labelPath = (path: Array<string | number>) => {
  if (path[0] === 'arena' && path[1] === 'questoes') return `Arena — questão ${Number(path[2]) + 1}`;
  if (path[0] === 'atividades' && path[2] === 'questoes') {
    return `Atividade ${Number(path[1]) + 1} — questão ${Number(path[3]) + 1}`;
  }
  if (path[0] === 'questoes') return `Questão ${Number(path[1]) + 1}`;
  if (path[0] === 'materiais') return `Material ${Number(path[1]) + 1}`;
  if (path[0] === 'atividades') return `Atividade ${Number(path[1]) + 1}`;
  return 'Aula';
};

const formatIssue = (issue: ValidationIssue) => `${labelPath(issue.path)}: ${issue.message}`;

const normalizedOptions = (question: UnknownRecord) => asArray(question.opcoes).map((option, index) => {
  if (isRecord(option)) {
    return { id: asText(option.id), texto: asText(option.texto) };
  }
  return { id: String.fromCharCode(97 + index), texto: asText(option) };
});

const normalizedAnswerIds = (
  question: UnknownRecord,
  options: Array<{ id: string; texto: string }>,
) => {
  const explicit = asArray(question.respostas_corretas).map(asText).filter(Boolean);
  if (explicit.length > 0) return explicit;

  const legacy = asText(question.resposta_correta);
  if (!legacy) return [];
  const tokens = (asText(question.tipo) === 'multipla_selecao' ? legacy.split(';') : [legacy])
    .map((item) => item.trim())
    .filter(Boolean);

  return tokens.map((token) => {
    const match = options.find((option) => (
      option.id.toLocaleLowerCase('pt-BR') === token.toLocaleLowerCase('pt-BR')
      || option.texto.toLocaleLowerCase('pt-BR') === token.toLocaleLowerCase('pt-BR')
    ));
    return match?.id || token;
  });
};

const validateQuestion = (
  value: unknown,
  path: Array<string | number>,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
) => {
  if (!isRecord(value)) {
    errors.push({ path, message: 'estrutura inválida.' });
    return undefined;
  }

  const prompt = asText(value.enunciado);
  const type = asText(value.tipo) || 'multipla_escolha';
  const options = normalizedOptions(value);
  const answerIds = normalizedAnswerIds(value, options);

  if (prompt.length < 3) errors.push({ path, message: 'o enunciado está vazio ou curto demais.' });
  if (!questionTypes.has(type)) errors.push({ path, message: `tipo “${type || 'vazio'}” não reconhecido.` });
  if (type === 'aberta') return { prompt, type, options, answerIds };

  if (options.length < 2) errors.push({ path, message: 'questões objetivas precisam de pelo menos duas alternativas.' });
  if (options.length > 8) errors.push({ path, message: 'há mais de oito alternativas.' });

  const emptyOption = options.findIndex((option) => !option.id || !option.texto);
  if (emptyOption >= 0) errors.push({ path, message: `a alternativa ${emptyOption + 1} está sem ID ou texto.` });

  const optionIds = options.map((option) => comparable(option.id));
  const optionTexts = options.map((option) => comparable(option.texto));
  if (new Set(optionIds).size !== optionIds.length) errors.push({ path, message: 'existem IDs de alternativas repetidos.' });
  if (new Set(optionTexts).size !== optionTexts.length) errors.push({ path, message: 'existem alternativas repetidas.' });

  const validIds = new Set(optionIds);
  const invalidAnswers = answerIds.filter((answer) => !validIds.has(comparable(answer)));
  if (invalidAnswers.length > 0) {
    errors.push({ path, message: `resposta(s) apontam para ID inexistente: ${invalidAnswers.join(', ')}.` });
  }
  if (answerIds.length === 0) errors.push({ path, message: 'nenhuma resposta correta foi informada.' });

  if (type === 'multipla_escolha' && answerIds.length !== 1) {
    errors.push({ path, message: 'escolha única exige exatamente uma resposta correta.' });
  }
  if (type === 'multipla_selecao') {
    if (answerIds.length < 2) errors.push({ path, message: 'múltipla seleção exige pelo menos duas respostas corretas.' });
    if (options.length > 0 && new Set(answerIds.map(comparable)).size >= options.length) {
      errors.push({ path, message: 'múltipla seleção não pode marcar todas as alternativas como corretas.' });
    }
  }
  if (type === 'verdadeiro_falso') {
    const optionSet = new Set(optionTexts);
    if (options.length !== 2 || !optionSet.has('verdadeiro') || !optionSet.has('falso')) {
      errors.push({ path, message: 'verdadeiro/falso deve conter exatamente as alternativas Verdadeiro e Falso.' });
    }
    if (answerIds.length !== 1) errors.push({ path, message: 'verdadeiro/falso exige exatamente uma resposta correta.' });
  }

  if (options.length >= 6) warnings.push({ path, message: 'muitas alternativas podem prejudicar a leitura em telas pequenas.' });
  return { prompt, type, options, answerIds };
};

const validHttpUrl = (value: unknown) => {
  try {
    const url = new URL(asText(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const validateLessonPayload = (value: unknown): LessonValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!isRecord(value)) {
    const issue = { path: [] as Array<string | number>, message: 'o conteúdo da aula precisa ser um objeto.' };
    return {
      valida: false,
      erros: [formatIssue(issue)],
      alertas: [],
      resumo: { questoes_estudea: 0, questoes_atividades: 0, questoes_arena: 0, atividades: 0, materiais: 0 },
      detalhes: { erros: [issue], alertas: [] },
    };
  }

  const title = asText(value.titulo);
  const lessonType = asText(value.tipo) || 'texto';
  const content = asText(value.conteudo);
  if (title.length < 3) errors.push({ path: ['titulo'], message: 'o título precisa ter pelo menos três caracteres.' });
  if (lessonType === 'texto' && content.length < 20) {
    errors.push({ path: ['conteudo'], message: 'aula de texto precisa de conteúdo didático com pelo menos 20 caracteres.' });
  }
  if (lessonType === 'video' && !validHttpUrl(value.video_url)) {
    errors.push({ path: ['video_url'], message: 'aula de vídeo exige uma URL HTTP(S) válida.' });
  }
  if (lessonType === 'arquivo' && !validHttpUrl(value.arquivo_url)) {
    errors.push({ path: ['arquivo_url'], message: 'aula de arquivo exige uma URL HTTP(S) válida.' });
  }
  for (const field of ['numero_aula', 'ordem'] as const) {
    if (value[field] !== undefined && (!Number.isInteger(value[field]) || Number(value[field]) < 1)) {
      errors.push({ path: [field], message: `${field} precisa ser um inteiro positivo.` });
    }
  }

  const checkedQuestions: Array<{
    path: Array<string | number>;
    prompt: string;
    type: string;
    options: Array<{ id: string; texto: string }>;
    answerIds: string[];
  }> = [];
  const standardQuestions = asArray(value.questoes);
  standardQuestions.forEach((question, index) => {
    const path: Array<string | number> = ['questoes', index];
    const checked = validateQuestion(question, path, errors, warnings);
    if (checked) checkedQuestions.push({ path, ...checked });
  });

  const activities = asArray(value.atividades);
  let activityQuestionCount = 0;
  activities.forEach((activity, activityIndex) => {
    const activityPath: Array<string | number> = ['atividades', activityIndex];
    if (!isRecord(activity)) {
      errors.push({ path: activityPath, message: 'estrutura inválida.' });
      return;
    }
    if (asText(activity.enunciado).length < 3) errors.push({ path: activityPath, message: 'o enunciado está vazio ou curto demais.' });
    const activityQuestions = asArray(activity.questoes);
    if (activityQuestions.length > 0 && asText(activity.tipo_entrega) !== 'quiz') {
      errors.push({ path: activityPath, message: 'atividades com questões precisam usar tipo_entrega “quiz”.' });
    }
    activityQuestions.forEach((question, questionIndex) => {
      activityQuestionCount += 1;
      const path: Array<string | number> = ['atividades', activityIndex, 'questoes', questionIndex];
      const checked = validateQuestion(question, path, errors, warnings);
      if (checked) checkedQuestions.push({ path, ...checked });
    });
  });

  const arena = isRecord(value.arena) ? value.arena : undefined;
  const arenaQuestions = arena ? asArray(arena.questoes) : [];
  arenaQuestions.forEach((question, index) => {
    const path: Array<string | number> = ['arena', 'questoes', index];
    const checked = validateQuestion(question, path, errors, warnings);
    if (checked) checkedQuestions.push({ path, ...checked });
  });
  if (arena?.habilitada === true && arenaQuestions.length === 0) {
    warnings.push({ path: ['arena'], message: 'a Arena está habilitada, mas não possui questões próprias; será usado o fallback legado.' });
  }

  const materials = asArray(value.materiais);
  materials.forEach((material, index) => {
    const path: Array<string | number> = ['materiais', index];
    if (!isRecord(material)) {
      errors.push({ path, message: 'estrutura inválida.' });
      return;
    }
    if (asText(material.titulo).length < 2) errors.push({ path, message: 'informe um título para o material.' });
    if (!validHttpUrl(material.url)) errors.push({ path, message: 'a URL precisa usar HTTP ou HTTPS e ser válida.' });
  });

  if (lessonType === 'quiz' && standardQuestions.length === 0) {
    errors.push({ path: ['questoes'], message: 'aula de quiz exige questões do Estudea.' });
  }

  const promptGroups = new Map<string, Array<Array<string | number>>>();
  checkedQuestions.forEach((question) => {
    const key = comparable(question.prompt);
    if (!key) return;
    promptGroups.set(key, [...(promptGroups.get(key) || []), question.path]);
  });
  promptGroups.forEach((paths) => {
    if (paths.length > 1) {
      paths.slice(1).forEach((path) => errors.push({ path, message: 'o enunciado é idêntico ao de outra questão da aula.' }));
    }
  });

  const singleChoice = checkedQuestions.filter((question) => question.type === 'multipla_escolha');
  if (singleChoice.length >= 5) {
    const positions = singleChoice.map((question) => {
      const answer = comparable(question.answerIds[0]);
      return question.options.findIndex((option) => comparable(option.id) === answer);
    }).filter((position) => position >= 0);
    const counts = new Map<number, number>();
    positions.forEach((position) => counts.set(position, (counts.get(position) || 0) + 1));
    const highest = Math.max(0, ...counts.values());
    if (positions.length >= 5 && highest / positions.length >= 0.7) {
      const repeatedPosition = [...counts.entries()].find(([, count]) => count === highest)?.[0] ?? 0;
      warnings.push({
        path: ['questoes'],
        message: `${highest} de ${positions.length} questões de escolha única têm a resposta na posição ${repeatedPosition + 1}.`,
      });
    }
  }

  let vfRun = 0;
  let warnedVfRun = false;
  arenaQuestions.forEach((question) => {
    const type = isRecord(question) ? (asText(question.tipo) || 'multipla_escolha') : '';
    vfRun = type === 'verdadeiro_falso' ? vfRun + 1 : 0;
    if (vfRun >= 3 && !warnedVfRun) {
      warnings.push({ path: ['arena', 'questoes'], message: 'existem três ou mais questões verdadeiro/falso consecutivas.' });
      warnedVfRun = true;
    }
  });

  return {
    valida: errors.length === 0,
    erros: errors.map(formatIssue),
    alertas: warnings.map(formatIssue),
    resumo: {
      questoes_estudea: standardQuestions.length,
      questoes_atividades: activityQuestionCount,
      questoes_arena: arenaQuestions.length,
      atividades: activities.length,
      materiais: materials.length,
    },
    detalhes: { erros: errors, alertas: warnings },
  };
};

export const normalizeQuestionForPersistence = (value: UnknownRecord, context: 'aula' | 'atividade' | 'arena') => {
  const options = normalizedOptions(value);
  const answerIds = normalizedAnswerIds(value, options);
  const answerTexts = answerIds.map((answerId) => (
    options.find((option) => comparable(option.id) === comparable(answerId))?.texto || answerId
  ));
  const type = asText(value.tipo) || 'multipla_escolha';

  return {
    ...value,
    tipo: type,
    opcoes: options.map((option) => option.texto),
    opcoes_estruturadas: options,
    respostas_corretas: answerIds,
    resposta_correta: type === 'aberta'
      ? asText(value.resposta_correta)
      : answerTexts.join(type === 'multipla_selecao' ? ';' : ''),
    para_arena: context === 'arena' || value.para_arena === true,
    contexto: context,
  };
};

export const normalizeLessonForPersistence = (value: UnknownRecord) => {
  const activities = asArray(value.atividades).map((activity) => {
    if (!isRecord(activity)) return activity;
    return {
      ...activity,
      questoes: asArray(activity.questoes).map((question) => (
        isRecord(question) ? normalizeQuestionForPersistence(question, 'atividade') : question
      )),
    };
  });
  const arena = isRecord(value.arena) ? value.arena : undefined;

  return {
    ...value,
    atividades: activities,
    questoes: asArray(value.questoes).map((question) => (
      isRecord(question) ? normalizeQuestionForPersistence(question, 'aula') : question
    )),
    arena: arena ? {
      ...arena,
      questoes: asArray(arena.questoes).map((question) => (
        isRecord(question) ? normalizeQuestionForPersistence(question, 'arena') : question
      )),
    } : undefined,
    permite_arena: arena ? arena.habilitada === true : value.permite_arena,
  };
};

export const isUnknownRecord = isRecord;
