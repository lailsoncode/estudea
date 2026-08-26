import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedMcpContext } from './auth.js';
import type { LessonInput } from './schemas.js';

export class EstudeaToolError extends Error {}

const throwOnError = (error: { message: string; code?: string } | null) => {
  if (error) {
    const suffix = error.code ? ` (${error.code})` : '';
    throw new EstudeaToolError(`${error.message}${suffix}`);
  }
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

  if (context.role === 'teacher') {
    query = query.or(`criado_por.eq.${context.userId},criado_por.is.null`);
  }
  if (busca) query = query.ilike('titulo', `%${busca}%`);

  const { data, error } = await query;
  throwOnError(error);
  return data || [];
};

export const listModules = async (context: AuthenticatedMcpContext, courseId: string) => {
  const course = await assertCourseManagement(context.supabase, context, courseId);
  const { data, error } = await context.supabase
    .from('modulos')
    .select('id, curso_id, titulo, ordem')
    .eq('curso_id', courseId)
    .order('ordem', { ascending: true });
  throwOnError(error);
  return { curso: course, modulos: data || [] };
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

  let query = context.supabase
    .from('turmas')
    .select('id, nome, curso_id, professor_id')
    .order('nome', { ascending: true });
  if (courseId) query = query.eq('curso_id', courseId);
  if (allowedClassIds) query = query.in('id', allowedClassIds);

  const { data, error } = await query;
  throwOnError(error);
  return data || [];
};

export const getLesson = async (context: AuthenticatedMcpContext, lessonId: string) => {
  const { data: lesson, error: lessonError } = await context.supabase
    .from('aulas')
    .select('*')
    .eq('id', lessonId)
    .single();
  throwOnError(lessonError);
  if (!lesson?.modulo_id) throw new EstudeaToolError('Aula não encontrada ou sem módulo.');

  const { data: module, error: moduleError } = await context.supabase
    .from('modulos')
    .select('id, curso_id, titulo')
    .eq('id', lesson.modulo_id)
    .single();
  throwOnError(moduleError);
  if (!module) throw new EstudeaToolError('Módulo da aula não encontrado.');
  await assertCourseManagement(context.supabase, context, module.curso_id);

  const [{ data: activities, error: activitiesError }, { data: questions, error: questionsError }] = await Promise.all([
    context.supabase.from('atividades').select('*').eq('aula_id', lessonId).order('created_at'),
    context.supabase.from('questoes').select('*').eq('aula_id', lessonId).order('ordem'),
  ]);
  throwOnError(activitiesError);
  throwOnError(questionsError);

  const rawContent = String(lesson.conteudo || '');
  const separator = '===DESCRIPTION_END===';
  const separatorIndex = rawContent.indexOf(separator);

  return {
    ...lesson,
    descricao: separatorIndex >= 0 ? rawContent.slice(0, separatorIndex) : '',
    conteudo: separatorIndex >= 0 ? rawContent.slice(separatorIndex + separator.length) : rawContent,
    modulo: module,
    atividades: activities || [],
    questoes: questions || [],
  };
};

export const createLessonDraft = async (
  context: AuthenticatedMcpContext,
  moduleId: string,
  lesson: LessonInput,
  idempotencyKey?: string,
) => {
  const { data, error } = await context.supabase.rpc('mcp_create_lesson_bundle', {
    p_modulo_id: moduleId,
    p_aula: lesson,
    p_idempotency_key: idempotencyKey || null,
  });
  throwOnError(error);
  return data as Record<string, unknown>;
};

export const releaseLessonToClass = async (
  context: AuthenticatedMcpContext,
  lessonId: string,
  classId: string,
  idempotencyKey?: string,
) => {
  const { data, error } = await context.supabase.rpc('mcp_release_lesson_to_class', {
    p_aula_id: lessonId,
    p_turma_id: classId,
    p_confirmado: true,
    p_idempotency_key: idempotencyKey || null,
  });
  throwOnError(error);
  return data as Record<string, unknown>;
};
