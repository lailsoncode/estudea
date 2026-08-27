import * as z from 'zod/v4';
import { validateLessonPayload } from './lesson-validation.js';

const UUID_DESCRIPTION = 'UUID retornado pelo Estudea. Consulte as ferramentas de listagem antes de escrever.';
const IdempotencyKeySchema = z.string().trim().min(8).max(200).optional()
  .describe('Identificador único da operação. Reutilize o mesmo valor ao repetir uma chamada após erro.');

export const OptionSchema = z.object({
  id: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  texto: z.string().trim().min(1).max(500),
});

const QuestionBaseSchema = z.object({
  enunciado: z.string().trim().min(3).max(2000)
    .describe('Enunciado completo e inequívoco da questão.'),
  tipo: z.enum(['multipla_escolha', 'verdadeiro_falso', 'aberta', 'multipla_selecao'])
    .default('multipla_escolha'),
  opcoes: z.union([
    z.array(OptionSchema).max(8),
    z.array(z.string().trim().min(1).max(500)).max(8),
  ]).default([])
    .describe('Prefira objetos {id,texto}. A lista simples de textos é aceita apenas por compatibilidade.'),
  respostas_corretas: z.array(z.string().trim().min(1).max(40)).max(8).default([])
    .describe('IDs das opções corretas. Use dois ou mais IDs em múltipla seleção.'),
  resposta_correta: z.string().trim().max(2000).default('')
    .describe('Formato legado. Prefira respostas_corretas com IDs estáveis.'),
  para_arena: z.boolean().default(false)
    .describe('Compatibilidade legada. Para novas aulas, use arena.questoes.'),
  ordem: z.number().int().positive().max(10000).optional(),
});

export const QuestionSchema = QuestionBaseSchema.superRefine((question, context) => {
  const result = validateLessonPayload({
    titulo: 'Validação de questão',
    tipo: 'video',
    video_url: 'https://estudea.local/video',
    questoes: [question],
  });
  result.detalhes.erros
    .filter((issue) => issue.path[0] === 'questoes')
    .forEach((issue) => context.addIssue({
      code: 'custom',
      path: issue.path.slice(2),
      message: issue.message,
    }));
});

export const MaterialSchema = z.object({
  titulo: z.string().trim().min(2).max(200),
  url: z.url().max(2000),
  tipo: z.enum(['imagem', 'arquivo', 'video', 'link', 'referencia']).default('arquivo'),
  uso: z.enum(['atividade_pratica', 'consulta', 'leitura', 'download', 'referencia']).default('consulta'),
  obrigatorio: z.boolean().default(false),
});

export const ActivitySchema = z.object({
  enunciado: z.string().trim().min(3).max(10000)
    .describe('Instruções completas da atividade, incluindo entrega e critérios de qualidade.'),
  tipo_entrega: z.enum(['texto', 'imagem', 'quiz', 'multipla', 'arquivo']),
  pontua: z.boolean().default(true),
  permite_refazer: z.boolean().default(true),
  material_url: z.url().max(2000).optional()
    .describe('Link legado. Para novos conteúdos, prefira materiais no nível da aula.'),
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

export const ArenaSchema = z.object({
  habilitada: z.boolean().default(false),
  embaralhar_questoes: z.boolean().default(true),
  embaralhar_opcoes: z.boolean().default(true),
  questoes: z.array(QuestionSchema).max(100).default([])
    .describe('Questões exclusivas da Arena, independentes do quiz mostrado no Estudea.'),
});

const LessonObjectSchema = z.object({
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
  embaralhar_opcoes: z.boolean().default(true),
  permite_arena: z.boolean().default(true)
    .describe('Compatibilidade legada. Quando arena for informada, arena.habilitada prevalece.'),
  tempo_limite: z.number().int().positive().max(1440).optional()
    .describe('Tempo limite em minutos.'),
  materiais: z.array(MaterialSchema).max(50).default([]),
  atividades: z.array(ActivitySchema).max(20).default([]),
  questoes: z.array(QuestionSchema).max(100).default([])
    .describe('Questões do Estudea, fora de atividades e da Arena.'),
  arena: ArenaSchema.optional(),
});

export const LessonSchema = LessonObjectSchema.superRefine((lesson, context) => {
  const result = validateLessonPayload(lesson);
  result.detalhes.erros.forEach((issue) => context.addIssue({
    code: 'custom',
    path: issue.path,
    message: issue.message,
  }));
});

export const ListCoursesInputSchema = z.object({
  busca: z.string().trim().max(100).optional(),
  limite: z.number().int().min(1).max(100).default(30),
});

export const ListModulesInputSchema = z.object({
  curso_id: z.uuid().describe(UUID_DESCRIPTION),
  incluir_arquivados: z.boolean().default(false),
});

export const CreateModuleInputSchema = z.object({
  curso_id: z.uuid().describe(UUID_DESCRIPTION),
  titulo: z.string().trim().min(3).max(200),
  ordem: z.number().int().positive().max(10000).optional(),
  carga_horaria: z.string().trim().min(1).max(80).optional(),
  idempotency_key: IdempotencyKeySchema,
});

export const UpdateModuleInputSchema = z.object({
  modulo_id: z.uuid().describe(UUID_DESCRIPTION),
  revision_id: z.iso.datetime().describe('updated_at retornado pela listagem; impede sobrescrever edição recente.'),
  alteracoes: z.object({
    titulo: z.string().trim().min(3).max(200).optional(),
    ordem: z.number().int().positive().max(10000).optional(),
    carga_horaria: z.string().trim().min(1).max(80).nullable().optional(),
  }).refine((value) => Object.keys(value).length > 0, 'Informe ao menos uma alteração.'),
  idempotency_key: IdempotencyKeySchema,
});

const ReorderItemSchema = z.object({ id: z.uuid(), ordem: z.number().int().positive().max(10000) });

export const ReorderModulesInputSchema = z.object({
  curso_id: z.uuid().describe(UUID_DESCRIPTION),
  modulos: z.array(ReorderItemSchema).min(1).max(500),
  idempotency_key: IdempotencyKeySchema,
});

export const ArchiveModuleInputSchema = z.object({
  modulo_id: z.uuid().describe(UUID_DESCRIPTION),
  confirmado: z.literal(true).describe('Exige confirmação explícita do usuário.'),
  idempotency_key: IdempotencyKeySchema,
});

export const ListLessonsInputSchema = z.object({
  modulo_id: z.uuid().describe(UUID_DESCRIPTION),
  incluir_arquivadas: z.boolean().default(false),
});

export const ListClassesInputSchema = z.object({
  curso_id: z.uuid().optional().describe('Se informado, retorna somente turmas vinculadas a este curso.'),
});

export const GetLessonInputSchema = z.object({
  aula_id: z.uuid().describe(UUID_DESCRIPTION),
});

export const ValidateLessonInputSchema = z.object({
  aula: z.record(z.string(), z.unknown())
    .describe('Aula a conferir. Aceita conteúdo incompleto para devolver erros e alertas sem gravar.'),
});

export const CreateLessonInputSchema = z.object({
  modulo_id: z.uuid().describe(UUID_DESCRIPTION),
  aula: LessonSchema,
  idempotency_key: IdempotencyKeySchema,
});

export const LessonPatchSchema = LessonObjectSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Informe ao menos uma alteração.',
);

export const UpdateLessonInputSchema = z.object({
  aula_id: z.uuid().describe(UUID_DESCRIPTION),
  revision_id: z.iso.datetime().describe('updated_at retornado por consultar_aula ou listar_aulas.'),
  alteracoes: LessonPatchSchema.describe('Somente os campos informados serão substituídos; listas informadas substituem a lista inteira.'),
  idempotency_key: IdempotencyKeySchema,
});

export const ArchiveLessonInputSchema = z.object({
  aula_id: z.uuid().describe(UUID_DESCRIPTION),
  confirmado: z.literal(true).describe('Exige confirmação explícita do usuário.'),
  idempotency_key: IdempotencyKeySchema,
});

export const ReorderLessonsInputSchema = z.object({
  modulo_id: z.uuid().describe(UUID_DESCRIPTION),
  aulas: z.array(ReorderItemSchema.extend({ numero_aula: z.number().int().positive().max(10000).optional() })).min(1).max(500),
  idempotency_key: IdempotencyKeySchema,
});

export const CreateLessonsBatchInputSchema = z.object({
  modulo_id: z.uuid().describe(UUID_DESCRIPTION),
  aulas: z.array(LessonSchema).min(1).max(100),
  idempotency_key: z.string().trim().min(8).max(160)
    .describe('Obrigatório no lote; cada aula recebe uma chave derivada para repetição segura.'),
});

export const RegisterTaughtLessonInputSchema = z.object({
  aula_id: z.uuid().describe(UUID_DESCRIPTION),
  conteudo_da_aula: z.string().trim().min(3).max(100000),
  atividades_realizadas: z.string().trim().min(3).max(50000),
  idempotency_key: IdempotencyKeySchema,
});

export const ReleaseLessonInputSchema = z.object({
  aula_id: z.uuid().describe(UUID_DESCRIPTION),
  turma_id: z.uuid().describe(UUID_DESCRIPTION),
  confirmado: z.literal(true)
    .describe('Só use true depois que o usuário confirmar explicitamente a liberação para os alunos.'),
  idempotency_key: IdempotencyKeySchema,
});

export const WithdrawLessonInputSchema = z.object({
  aula_id: z.uuid().describe(UUID_DESCRIPTION),
  turma_id: z.uuid().describe(UUID_DESCRIPTION),
  confirmado: z.literal(true)
    .describe('Só use true depois que o usuário confirmar explicitamente a retirada do acesso dos alunos.'),
  idempotency_key: IdempotencyKeySchema,
});

export type LessonInput = z.infer<typeof LessonSchema>;
export type LessonPatchInput = z.infer<typeof LessonPatchSchema>;
