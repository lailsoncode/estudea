import * as z from 'zod/v4';

const UUID_DESCRIPTION = 'UUID retornado pelo Estudea. Consulte as ferramentas de listagem antes de escrever.';

export const QuestionSchema = z.object({
  enunciado: z.string().trim().min(3).max(2000)
    .describe('Enunciado completo e inequívoco da questão.'),
  tipo: z.enum(['multipla_escolha', 'verdadeiro_falso', 'aberta', 'multipla_selecao'])
    .default('multipla_escolha'),
  opcoes: z.array(z.string().trim().min(1).max(500)).max(8).default([])
    .describe('Opções possíveis. Para questão aberta, use uma lista vazia.'),
  resposta_correta: z.string().trim().max(2000).default('')
    .describe('Deve corresponder exatamente a uma opção; em múltipla seleção, separe respostas por ponto e vírgula.'),
  para_arena: z.boolean().default(false)
    .describe('Marca a questão para também poder ser usada na Arena.'),
}).superRefine((question, context) => {
  if (question.tipo === 'aberta') return;

  if (question.opcoes.length < 2) {
    context.addIssue({
      code: 'custom',
      path: ['opcoes'],
      message: 'Questões objetivas precisam ter ao menos duas opções.',
    });
    return;
  }

  if (question.tipo === 'verdadeiro_falso') {
    const normalized = question.opcoes.map((option) => option.toLocaleLowerCase('pt-BR'));
    if (normalized.length !== 2 || !normalized.includes('verdadeiro') || !normalized.includes('falso')) {
      context.addIssue({
        code: 'custom',
        path: ['opcoes'],
        message: 'Questões de verdadeiro ou falso devem usar exatamente as opções Verdadeiro e Falso.',
      });
    }
  }

  const answers = question.tipo === 'multipla_selecao'
    ? question.resposta_correta.split(';').map((answer) => answer.trim()).filter(Boolean)
    : [question.resposta_correta];

  if (answers.length === 0 || answers.some((answer) => !question.opcoes.includes(answer))) {
    context.addIssue({
      code: 'custom',
      path: ['resposta_correta'],
      message: 'A resposta correta deve corresponder exatamente a uma das opções informadas.',
    });
  }
});

export const ActivitySchema = z.object({
  enunciado: z.string().trim().min(3).max(10000)
    .describe('Instruções completas da atividade, incluindo entrega e critérios de qualidade.'),
  tipo_entrega: z.enum(['texto', 'imagem', 'quiz', 'multipla', 'arquivo']),
  pontua: z.boolean().default(true),
  permite_refazer: z.boolean().default(true),
  material_url: z.url().max(2000).optional()
    .describe('Link de apoio para executar a atividade, quando existir.'),
  questoes: z.array(QuestionSchema).max(50).default([])
    .describe('Questionário exclusivo desta atividade. Use somente quando tipo_entrega for quiz.'),
}).superRefine((activity, context) => {
  if (activity.questoes.length > 0 && activity.tipo_entrega !== 'quiz') {
    context.addIssue({
      code: 'custom',
      path: ['questoes'],
      message: 'Questões vinculadas à atividade exigem tipo_entrega igual a quiz.',
    });
  }
});

export const LessonSchema = z.object({
  titulo: z.string().trim().min(3).max(200),
  descricao: z.string().trim().max(5000).default('')
    .describe('Objetivos e resumo curto da aula.'),
  conteudo: z.string().trim().max(100000).default('')
    .describe('Conteúdo didático em Markdown simples, pronto para o aluno.'),
  tipo: z.enum(['video', 'texto', 'quiz', 'arquivo']).default('texto'),
  duracao: z.string().trim().min(1).max(80).optional(),
  numero_aula: z.number().int().positive().max(10000).optional(),
  ordem: z.number().int().positive().max(10000).optional(),
  video_url: z.url().max(2000).optional(),
  arquivo_url: z.url().max(2000).optional(),
  pontos: z.number().int().min(0).max(10000).default(100),
  nota_aprovacao: z.number().int().min(0).max(100).default(70),
  obrigatorio: z.boolean().default(true),
  embaralhar_questoes: z.boolean().default(true),
  permite_arena: z.boolean().default(true),
  tempo_limite: z.number().int().positive().max(1440).optional()
    .describe('Tempo limite em minutos.'),
  atividades: z.array(ActivitySchema).max(20).default([]),
  questoes: z.array(QuestionSchema).max(100).default([])
    .describe('Questões principais da aula, fora de atividades específicas.'),
}).superRefine((lesson, context) => {
  if (lesson.tipo === 'texto' && lesson.conteudo.length < 20) {
    context.addIssue({
      code: 'custom',
      path: ['conteudo'],
      message: 'Aula de texto precisa ter conteúdo didático com ao menos 20 caracteres.',
    });
  }
  if (lesson.tipo === 'video' && !lesson.video_url) {
    context.addIssue({ code: 'custom', path: ['video_url'], message: 'Aula de vídeo exige video_url.' });
  }
  if (lesson.tipo === 'arquivo' && !lesson.arquivo_url) {
    context.addIssue({ code: 'custom', path: ['arquivo_url'], message: 'Aula de arquivo exige arquivo_url.' });
  }
  if (lesson.tipo === 'quiz' && lesson.questoes.length === 0) {
    context.addIssue({ code: 'custom', path: ['questoes'], message: 'Aula de quiz exige questões principais.' });
  }
});

export const ListCoursesInputSchema = z.object({
  busca: z.string().trim().max(100).optional(),
  limite: z.number().int().min(1).max(100).default(30),
});

export const ListModulesInputSchema = z.object({
  curso_id: z.uuid().describe(UUID_DESCRIPTION),
});

export const ListClassesInputSchema = z.object({
  curso_id: z.uuid().optional().describe('Se informado, retorna somente turmas vinculadas a este curso.'),
});

export const GetLessonInputSchema = z.object({
  aula_id: z.uuid().describe(UUID_DESCRIPTION),
});

export const CreateLessonInputSchema = z.object({
  modulo_id: z.uuid().describe(UUID_DESCRIPTION),
  aula: LessonSchema,
  idempotency_key: z.string().trim().min(8).max(200).optional()
    .describe('Identificador único desta criação. Reutilize o mesmo valor ao repetir uma chamada após erro.'),
});

export const ReleaseLessonInputSchema = z.object({
  aula_id: z.uuid().describe(UUID_DESCRIPTION),
  turma_id: z.uuid().describe(UUID_DESCRIPTION),
  confirmado: z.literal(true)
    .describe('Só use true depois que o usuário confirmar explicitamente a liberação para os alunos.'),
  idempotency_key: z.string().trim().min(8).max(200).optional(),
});

export type LessonInput = z.infer<typeof LessonSchema>;
