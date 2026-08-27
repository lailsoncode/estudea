import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedMcpContext } from './auth.js';
import {
  isUnknownRecord,
  normalizeLessonForPersistence,
  validateLessonPayload,
} from './lesson-validation.js';
import type { LessonInput, LessonPatchInput } from './schemas.js';

export class EstudeaToolError extends Error {}

const friendlyErrors: Record<string, string> = {
  concurrent_module_update: 'O módulo foi alterado depois da sua consulta. Liste os módulos novamente e refaça a edição com o novo revision_id.',
  concurrent_lesson_update: 'A aula foi alterada depois da sua consulta. Consulte a aula novamente e refaça a edição com o novo revision_id.',
  released_lesson_cannot_be_edited: 'A aula já foi liberada. Retire-a das turmas antes de substituir seu conteúdo.',
  released_lesson_cannot_be_archived: 'A aula está liberada para uma ou mais turmas. Retire as liberações antes de arquivá-la.',
  module_has_released_lessons: 'O módulo possui aulas liberadas. Retire as liberações antes de arquivá-lo.',
  duplicate_lesson_order_in_batch: 'O lote contém aulas com a mesma ordem.',
  duplicate_lesson_number_in_batch: 'O lote contém aulas com o mesmo número.',
};

const throwOnError = (error: { message: string; code?: string } | null) => {
  if (error) {
    const translated = Object.entries(friendlyErrors).find(([key]) => error.message.includes(key))?.[1];
    const suffix = error.code ? ` (${error.code})` : '';
    throw new EstudeaToolError(`${translated || error.message}${suffix}`);
  }
};

const callRpc = async (
  context: AuthenticatedMcpContext,
  name: string,
  parameters: Record<string, unknown>,
) => {
  const { data, error } = await context.supabase.rpc(name, parameters);
  throwOnError(error);
  return data as Record<string, unknown>;
};

const assertCourseManagement = async (
  supabase: SupabaseClient,
  context: Pick<AuthenticatedMcpContext, 'userId' | 'role'>,
  courseId: string,
) => {
  const { data: course, error } = await supabase
    .from('cursos')
    .select('id, titulo, criado_por')
    .eq('id', courseId)
    .single();
  throwOnError(error);

  if (!course) throw new EstudeaToolError('Curso não encontrado.');
  if (context.role === 'teacher' && course.criado_por && course.criado_por !== context.userId) {
    throw new EstudeaToolError('O professor autenticado não pode alterar este curso.');
  }
  return course;
};

const assertModuleManagement = async (context: AuthenticatedMcpContext, moduleId: string) => {
  const { data: module, error } = await context.supabase
    .from('modulos')
    .select('id, curso_id, titulo')
    .eq('id', moduleId)
    .single();
  throwOnError(error);
  if (!module) throw new EstudeaToolError('Módulo não encontrado.');
  const course = await assertCourseManagement(context.supabase, context, module.curso_id);
  return { module, course };
};

const ensureValidLesson = (lesson: unknown) => {
  const validation = validateLessonPayload(lesson);
  if (!validation.valida) {
    throw new EstudeaToolError(`A aula não passou na validação: ${validation.erros.join(' | ')}`);
  }
  if (!isUnknownRecord(lesson)) throw new EstudeaToolError('Estrutura da aula inválida.');
  return normalizeLessonForPersistence(lesson);
};

const optionId = (index: number) => String.fromCharCode(97 + index);

const questionForMcp = (question: Record<string, unknown>): Record<string, unknown> & {
  opcoes: unknown[];
  respostas_corretas: unknown[];
} => {
  const texts = Array.isArray(question.opcoes) ? question.opcoes.map(String) : [];
  const structured = Array.isArray(question.opcoes_estruturadas) && question.opcoes_estruturadas.length > 0
    ? question.opcoes_estruturadas
    : texts.map((texto, index) => ({ id: optionId(index), texto }));
  const answers = Array.isArray(question.respostas_corretas) && question.respostas_corretas.length > 0
    ? question.respostas_corretas
    : String(question.resposta_correta || '')
      .split(question.tipo === 'multipla_selecao' ? ';' : '\u0000')
      .map((answer) => answer.trim())
      .filter(Boolean)
      .map((answer) => {
        const match = (structured as Array<{ id?: unknown; texto?: unknown }>).find(
          (option) => String(option.texto || '').toLocaleLowerCase('pt-BR') === answer.toLocaleLowerCase('pt-BR'),
        );
        return String(match?.id || answer);
      });

  return { ...question, opcoes: structured, respostas_corretas: answers };
};

export const listCourses = async (
  context: AuthenticatedMcpContext,
  busca: string | undefined,
  limite: number,
) => {
  let query = context.supabase
    .from('cursos')
    .select('id, titulo, descricao, categoria, nivel, duracao, criado_por, is_public')
    .order('titulo', { ascending: true })
    .limit(limite);

  if (context.role === 'teacher') query = query.or(`criado_por.eq.${context.userId},criado_por.is.null`);
  if (busca) query = query.ilike('titulo', `%${busca}%`);

  const { data, error } = await query;
  throwOnError(error);
  return data || [];
};

export const listModules = async (
  context: AuthenticatedMcpContext,
  courseId: string,
  includeArchived = false,
) => {
  const course = await assertCourseManagement(context.supabase, context, courseId);
  let query = context.supabase
    .from('modulos')
    .select('id, curso_id, titulo, ordem, carga_horaria, updated_at, arquivado_em')
    .eq('curso_id', courseId)
    .order('ordem', { ascending: true });
  if (!includeArchived) query = query.is('arquivado_em', null);
  const { data, error } = await query;
  throwOnError(error);
  return { curso: course, modulos: data || [] };
};

export const createModule = (
  context: AuthenticatedMcpContext,
  courseId: string,
  title: string,
  order: number | undefined,
  workload: string | undefined,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_create_module', {
  p_curso_id: courseId,
  p_titulo: title,
  p_ordem: order || null,
  p_carga_horaria: workload || null,
  p_idempotency_key: idempotencyKey || null,
});

export const updateModule = (
  context: AuthenticatedMcpContext,
  moduleId: string,
  revisionId: string,
  patch: Record<string, unknown>,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_update_module', {
  p_modulo_id: moduleId,
  p_revision_id: revisionId,
  p_alteracoes: patch,
  p_idempotency_key: idempotencyKey || null,
});

export const reorderModules = (
  context: AuthenticatedMcpContext,
  courseId: string,
  modules: Array<{ id: string; ordem: number }>,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_reorder_modules', {
  p_curso_id: courseId,
  p_modulos: modules,
  p_idempotency_key: idempotencyKey || null,
});

export const archiveModule = (
  context: AuthenticatedMcpContext,
  moduleId: string,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_archive_module', {
  p_modulo_id: moduleId,
  p_confirmado: true,
  p_idempotency_key: idempotencyKey || null,
});

export const listLessons = async (
  context: AuthenticatedMcpContext,
  moduleId: string,
  includeArchived = false,
) => {
  const { module, course } = await assertModuleManagement(context, moduleId);
  let lessonsQuery = context.supabase
    .from('aulas')
    .select('id, modulo_id, numero_aula, ordem, titulo, tipo, updated_at, arquivado_em')
    .eq('modulo_id', moduleId)
    .order('ordem', { ascending: true });
  if (!includeArchived) lessonsQuery = lessonsQuery.is('arquivado_em', null);
  const { data: lessons, error: lessonsError } = await lessonsQuery;
  throwOnError(lessonsError);

  const lessonIds = (lessons || []).map((lesson) => lesson.id as string);
  if (lessonIds.length === 0) return { curso: course, modulo: module, aulas: [] };

  const [activitiesResult, questionsResult, releasesResult] = await Promise.all([
    context.supabase.from('atividades').select('id, aula_id').in('aula_id', lessonIds),
    context.supabase.from('questoes').select('id, aula_id, para_arena, contexto').in('aula_id', lessonIds),
    context.supabase.from('turma_aulas_liberadas').select('aula_id, turma_id, created_at').in('aula_id', lessonIds),
  ]);
  throwOnError(activitiesResult.error);
  throwOnError(questionsResult.error);
  throwOnError(releasesResult.error);

  const classIds = [...new Set((releasesResult.data || []).map((release) => release.turma_id as string))];
  const classesResult = classIds.length > 0
    ? await context.supabase.from('turmas').select('id, nome').in('id', classIds)
    : { data: [], error: null };
  throwOnError(classesResult.error);
  const classNames = new Map((classesResult.data || []).map((item) => [item.id, item.nome]));

  const aulas = (lessons || []).map((lesson) => {
    const lessonQuestions = (questionsResult.data || []).filter((question) => question.aula_id === lesson.id);
    const releases = (releasesResult.data || [])
      .filter((release) => release.aula_id === lesson.id)
      .map((release) => ({
        turma_id: release.turma_id,
        turma: classNames.get(release.turma_id) || 'Turma',
        liberada_em: release.created_at,
      }));
    return {
      ...lesson,
      situacao: releases.length > 0 ? 'liberada' : 'rascunho',
      quantidade_atividades: (activitiesResult.data || []).filter((activity) => activity.aula_id === lesson.id).length,
      quantidade_questoes: lessonQuestions.filter((question) => question.contexto !== 'arena' && !question.para_arena).length,
      quantidade_questoes_arena: lessonQuestions.filter((question) => question.contexto === 'arena' || question.para_arena).length,
      turmas_liberadas: releases,
      revision_id: lesson.updated_at,
    };
  });
  return { curso: course, modulo: module, aulas };
};

export const listClasses = async (context: AuthenticatedMcpContext, courseId?: string) => {
  let allowedClassIds: string[] | undefined;
  if (context.role === 'teacher') {
    const [{ data: owned, error: ownedError }, { data: memberships, error: membershipsError }] = await Promise.all([
      context.supabase.from('turmas').select('id').eq('professor_id', context.userId),
      context.supabase.from('turma_professores').select('turma_id').eq('professor_id', context.userId),
    ]);
    throwOnError(ownedError);
    throwOnError(membershipsError);
    allowedClassIds = [...new Set([
      ...(owned || []).map((item) => item.id as string),
      ...(memberships || []).map((item) => item.turma_id as string),
    ])];
    if (allowedClassIds.length === 0) return [];
  }

  let query = context.supabase.from('turmas').select('id, nome, curso_id, professor_id').order('nome');
  if (courseId) query = query.eq('curso_id', courseId);
  if (allowedClassIds) query = query.in('id', allowedClassIds);
  const { data, error } = await query;
  throwOnError(error);
  return data || [];
};

export const getLesson = async (context: AuthenticatedMcpContext, lessonId: string) => {
  const { data: lesson, error: lessonError } = await context.supabase.from('aulas').select('*').eq('id', lessonId).single();
  throwOnError(lessonError);
  if (!lesson?.modulo_id) throw new EstudeaToolError('Aula não encontrada ou sem módulo.');

  const { module, course } = await assertModuleManagement(context, lesson.modulo_id);
  const [activitiesResult, questionsResult, materialsResult, arenaResult, releasesResult] = await Promise.all([
    context.supabase.from('atividades').select('*').eq('aula_id', lessonId).order('created_at'),
    context.supabase.from('questoes').select('*').eq('aula_id', lessonId).order('ordem'),
    context.supabase.from('aula_materiais').select('*').eq('aula_id', lessonId).order('created_at'),
    context.supabase.from('aula_arena_config').select('*').eq('aula_id', lessonId).maybeSingle(),
    context.supabase.from('turma_aulas_liberadas').select('turma_id, created_at').eq('aula_id', lessonId),
  ]);
  [activitiesResult.error, questionsResult.error, materialsResult.error, arenaResult.error, releasesResult.error]
    .forEach(throwOnError);

  const allQuestions = (questionsResult.data || []).map((question) => questionForMcp(question));
  const activities = (activitiesResult.data || []).map((activity) => ({
    ...activity,
    questoes: allQuestions.filter((question) => question.atividade_id === activity.id),
  }));
  const standardQuestions = allQuestions.filter((question) => (
    !question.atividade_id && question.contexto !== 'arena' && !question.para_arena
  ));
  const arenaQuestions = allQuestions.filter((question) => (
    question.contexto === 'arena' || (!question.atividade_id && question.para_arena)
  ));

  const rawContent = String(lesson.conteudo || '');
  const separator = '===DESCRIPTION_END===';
  const separatorIndex = rawContent.indexOf(separator);
  const arenaConfig = arenaResult.data || {
    habilitada: lesson.permite_arena ?? false,
    embaralhar_questoes: true,
    embaralhar_opcoes: lesson.embaralhar_opcoes ?? true,
  };

  return {
    ...lesson,
    descricao: separatorIndex >= 0 ? rawContent.slice(0, separatorIndex) : '',
    conteudo: separatorIndex >= 0 ? rawContent.slice(separatorIndex + separator.length) : rawContent,
    curso: course,
    modulo: module,
    materiais: materialsResult.data || [],
    atividades: activities,
    questoes: standardQuestions,
    arena: { ...arenaConfig, questoes: arenaQuestions },
    turmas_liberadas: releasesResult.data || [],
    situacao: (releasesResult.data || []).length > 0 ? 'liberada' : 'rascunho',
    revision_id: lesson.updated_at,
  };
};

export const validateLesson = (lesson: unknown) => validateLessonPayload(lesson);

export const createLessonDraft = async (
  context: AuthenticatedMcpContext,
  moduleId: string,
  lesson: LessonInput,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_create_lesson_bundle', {
  p_modulo_id: moduleId,
  p_aula: ensureValidLesson(lesson),
  p_idempotency_key: idempotencyKey || null,
});

export const updateLessonDraft = async (
  context: AuthenticatedMcpContext,
  lessonId: string,
  revisionId: string,
  patch: LessonPatchInput,
  idempotencyKey?: string,
) => {
  const current = await getLesson(context, lessonId);
  if (current.situacao !== 'rascunho') {
    throw new EstudeaToolError('Somente aulas ainda não liberadas podem ter seu conteúdo substituído pelo MCP.');
  }
  const base = {
    titulo: current.titulo,
    descricao: current.descricao,
    conteudo: current.conteudo,
    tipo: current.tipo,
    duracao: current.duracao,
    numero_aula: current.numero_aula,
    ordem: current.ordem,
    video_url: current.video_url || undefined,
    arquivo_url: current.arquivo_url || undefined,
    pontos: current.pontos,
    nota_aprovacao: current.nota_aprovacao,
    obrigatorio: current.obrigatorio,
    embaralhar_questoes: current.embaralhar_questoes,
    embaralhar_opcoes: current.embaralhar_opcoes,
    permite_arena: current.permite_arena,
    tempo_limite: current.tempo_limite || undefined,
    materiais: current.materiais,
    atividades: current.atividades,
    questoes: current.questoes,
    arena: current.arena,
  };
  const merged = { ...base, ...patch };
  const normalized = ensureValidLesson(merged);
  return callRpc(context, 'mcp_update_lesson_draft', {
    p_aula_id: lessonId,
    p_revision_id: revisionId,
    p_aula: normalized,
    p_idempotency_key: idempotencyKey || null,
  });
};

export const archiveLesson = (
  context: AuthenticatedMcpContext,
  lessonId: string,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_archive_lesson', {
  p_aula_id: lessonId,
  p_confirmado: true,
  p_idempotency_key: idempotencyKey || null,
});

export const reorderLessons = (
  context: AuthenticatedMcpContext,
  moduleId: string,
  lessons: Array<{ id: string; ordem: number; numero_aula?: number }>,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_reorder_lessons', {
  p_modulo_id: moduleId,
  p_aulas: lessons,
  p_idempotency_key: idempotencyKey || null,
});

export const createLessonsBatch = async (
  context: AuthenticatedMcpContext,
  moduleId: string,
  lessons: LessonInput[],
  idempotencyKey: string,
) => {
  const normalized: Array<Record<string, unknown>> = lessons.map((lesson, index) => {
    try {
      return ensureValidLesson(lesson);
    } catch (error) {
      throw new EstudeaToolError(`Aula ${index + 1} (“${lesson.titulo}”): ${error instanceof Error ? error.message : 'inválida'}`);
    }
  });
  const duplicate = (field: 'ordem' | 'numero_aula') => {
    const values = normalized.map((lesson) => lesson[field]).filter((value) => value !== undefined);
    return new Set(values).size !== values.length;
  };
  if (duplicate('ordem')) throw new EstudeaToolError('O lote possui duas ou mais aulas com a mesma ordem.');
  if (duplicate('numero_aula')) throw new EstudeaToolError('O lote possui duas ou mais aulas com o mesmo número.');

  return callRpc(context, 'mcp_create_lessons_batch', {
    p_modulo_id: moduleId,
    p_aulas: normalized,
    p_idempotency_key: idempotencyKey,
  });
};

export const registerTaughtLesson = (
  context: AuthenticatedMcpContext,
  lessonId: string,
  content: string,
  activities: string,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_register_taught_lesson', {
  p_aula_id: lessonId,
  p_conteudo_da_aula: content,
  p_atividades_realizadas: activities,
  p_idempotency_key: idempotencyKey || null,
});

export const releaseLessonToClass = (
  context: AuthenticatedMcpContext,
  lessonId: string,
  classId: string,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_release_lesson_to_class', {
  p_aula_id: lessonId,
  p_turma_id: classId,
  p_confirmado: true,
  p_idempotency_key: idempotencyKey || null,
});

export const withdrawLessonFromClass = (
  context: AuthenticatedMcpContext,
  lessonId: string,
  classId: string,
  idempotencyKey?: string,
) => callRpc(context, 'mcp_withdraw_lesson_from_class', {
  p_aula_id: lessonId,
  p_turma_id: classId,
  p_confirmado: true,
  p_idempotency_key: idempotencyKey || null,
});
