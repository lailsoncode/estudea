import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthenticatedMcpContext } from './auth.js';
import type { McpConfig } from './config.js';
import {
  createLessonDraft,
  getLesson,
  listClasses,
  listCourses,
  listModules,
  releaseLessonToClass,
} from './estudea.js';
import {
  CreateLessonInputSchema,
  GetLessonInputSchema,
  ListClassesInputSchema,
  ListCoursesInputSchema,
  ListModulesInputSchema,
  ReleaseLessonInputSchema,
} from './schemas.js';

const success = (message: string, data: unknown) => ({
  content: [{ type: 'text' as const, text: message }],
  structuredContent: { data },
});

const toolError = (error: unknown) => ({
  isError: true,
  content: [{
    type: 'text' as const,
    text: error instanceof Error ? error.message : 'Erro inesperado no Estudea.',
  }],
});

const runTool = async <T>(operation: () => Promise<T>, message: (data: T) => string) => {
  try {
    const data = await operation();
    return success(message(data), data);
  } catch (error) {
    return toolError(error);
  }
};

export const createEstudeaMcpServer = (
  context: AuthenticatedMcpContext,
  config: McpConfig,
) => {
  const server = new McpServer(
    { name: 'estudea', version: '0.1.0' },
    {
      instructions: [
        'Consulte cursos, módulos e turmas antes de usar IDs em ações de escrita.',
        'Crie aulas como não liberadas. Só libere uma aula quando o usuário pedir e confirmar explicitamente.',
        'Nunca invente IDs. Questões objetivas devem ter resposta idêntica a uma opção.',
      ].join(' '),
    },
  );

  server.registerTool('listar_cursos', {
    title: 'Listar cursos editáveis',
    description: 'Localiza os cursos que o professor autenticado pode editar no Estudea.',
    inputSchema: ListCoursesInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ busca, limite }) => runTool(
    () => listCourses(context, busca, limite),
    (courses) => `${courses.length} curso(s) editável(is) encontrado(s).`,
  ));

  server.registerTool('listar_modulos', {
    title: 'Listar módulos de um curso',
    description: 'Retorna os módulos editáveis de um curso e seus IDs antes da criação de uma aula.',
    inputSchema: ListModulesInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ curso_id }) => runTool(
    () => listModules(context, curso_id),
    (result) => `${result.modulos.length} módulo(s) encontrado(s) em ${result.curso.titulo}.`,
  ));

  server.registerTool('listar_turmas', {
    title: 'Listar turmas do professor',
    description: 'Lista as turmas nas quais o professor pode liberar aulas, opcionalmente filtradas por curso.',
    inputSchema: ListClassesInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ curso_id }) => runTool(
    () => listClasses(context, curso_id),
    (classes) => `${classes.length} turma(s) encontrada(s).`,
  ));

  server.registerTool('consultar_aula', {
    title: 'Consultar aula completa',
    description: 'Obtém uma aula com atividades e questões para revisão pelo professor.',
    inputSchema: GetLessonInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ aula_id }) => runTool(
    () => getLesson(context, aula_id),
    (lesson) => `Aula “${lesson.titulo}” carregada para revisão.`,
  ));

  server.registerTool('criar_aula_rascunho', {
    title: 'Criar aula completa não liberada',
    description: [
      'Cria atomicamente uma aula pronta no módulo informado, incluindo conteúdo, atividades e questões.',
      'A aula fica não liberada para as turmas até uma chamada separada de liberar_aula_para_turma.',
      'Antes de chamar, consulte o curso e o módulo e apresente um resumo ao usuário.',
    ].join(' '),
    inputSchema: CreateLessonInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ modulo_id, aula, idempotency_key }) => runTool(
    () => createLessonDraft(context, modulo_id, aula, idempotency_key),
    (result) => {
      const baseUrl = config.estudeaAppUrl ? `${config.estudeaAppUrl}/admin/course-builder` : undefined;
      return [
        `Aula “${String(result.titulo)}” criada com sucesso e ainda não liberada.`,
        `ID: ${String(result.aula_id)}.`,
        baseUrl ? `Revisar no Estudea: ${baseUrl}` : '',
      ].filter(Boolean).join(' ');
    },
  ));

  server.registerTool('liberar_aula_para_turma', {
    title: 'Liberar aula para uma turma',
    description: [
      'Torna uma aula acessível aos alunos de uma turma vinculada ao mesmo curso.',
      'Use somente após confirmação explícita do usuário e depois de consultar a aula e a turma.',
    ].join(' '),
    inputSchema: ReleaseLessonInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  }, async ({ aula_id, turma_id, idempotency_key }) => runTool(
    () => releaseLessonToClass(context, aula_id, turma_id, idempotency_key),
    () => 'Aula liberada para a turma com sucesso.',
  ));

  return server;
};
