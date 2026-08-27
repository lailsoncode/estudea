import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthenticatedMcpContext } from './auth.js';
import type { McpConfig } from './config.js';
import {
  archiveLesson,
  archiveModule,
  createLessonDraft,
  createLessonsBatch,
  createModule,
  getLesson,
  listClasses,
  listCourses,
  listLessons,
  listModules,
  registerTaughtLesson,
  releaseLessonToClass,
  reorderLessons,
  reorderModules,
  updateLessonDraft,
  updateModule,
  validateLesson,
  withdrawLessonFromClass,
} from './estudea.js';
import {
  ArchiveLessonInputSchema,
  ArchiveModuleInputSchema,
  CreateLessonInputSchema,
  CreateLessonsBatchInputSchema,
  CreateModuleInputSchema,
  GetLessonInputSchema,
  ListClassesInputSchema,
  ListCoursesInputSchema,
  ListLessonsInputSchema,
  ListModulesInputSchema,
  RegisterTaughtLessonInputSchema,
  ReleaseLessonInputSchema,
  ReorderLessonsInputSchema,
  ReorderModulesInputSchema,
  UpdateLessonInputSchema,
  UpdateModuleInputSchema,
  ValidateLessonInputSchema,
  WithdrawLessonInputSchema,
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

const runTool = async <T>(operation: () => Promise<T> | T, message: (data: T) => string) => {
  try {
    const data = await operation();
    return success(message(data), data);
  } catch (error) {
    return toolError(error);
  }
};

const reviewUrl = (config: McpConfig) => (
  config.estudeaAppUrl ? `${config.estudeaAppUrl}/admin/course-builder` : undefined
);

export const createEstudeaMcpServer = (
  context: AuthenticatedMcpContext,
  config: McpConfig,
) => {
  const server = new McpServer(
    { name: 'estudea', version: '0.2.0' },
    {
      instructions: [
        'Localize curso, módulo, aula e turma pelas ferramentas de listagem; nunca invente IDs.',
        'Antes de criar ou atualizar uma aula, use validar_aula e apresente erros, alertas e um resumo ao professor.',
        'Criações ficam como rascunho. Só libere, retire acesso ou arquive após pedido e confirmação explícita do usuário.',
        'Use opções estruturadas {id,texto} e respostas_corretas com IDs. Prefira arena.questoes a para_arena.',
        'Ao editar, reutilize o revision_id mais recente retornado pela consulta para não sobrescrever outra edição.',
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
    description: 'Retorna módulos, IDs, ordem, carga horária e revision_id de um curso editável.',
    inputSchema: ListModulesInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ curso_id, incluir_arquivados }) => runTool(
    () => listModules(context, curso_id, incluir_arquivados),
    (result) => `${result.modulos.length} módulo(s) encontrado(s) em ${result.curso.titulo}.`,
  ));

  server.registerTool('criar_modulo', {
    title: 'Criar módulo no curso',
    description: 'Cria um módulo/UC no curso editável, sem criar ou liberar aulas automaticamente.',
    inputSchema: CreateModuleInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ curso_id, titulo, ordem, carga_horaria, idempotency_key }) => runTool(
    () => createModule(context, curso_id, titulo, ordem, carga_horaria, idempotency_key),
    (result) => `Módulo “${String(result.titulo)}” criado. ID: ${String(result.modulo_id)}.`,
  ));

  server.registerTool('atualizar_modulo', {
    title: 'Atualizar módulo com controle de revisão',
    description: 'Altera título, ordem ou carga horária. Exige o revision_id da listagem mais recente.',
    inputSchema: UpdateModuleInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ modulo_id, revision_id, alteracoes, idempotency_key }) => runTool(
    () => updateModule(context, modulo_id, revision_id, alteracoes, idempotency_key),
    () => 'Módulo atualizado com sucesso.',
  ));

  server.registerTool('reordenar_modulos', {
    title: 'Reordenar módulos',
    description: 'Atualiza atomicamente a ordem dos módulos informados, todos pertencentes ao mesmo curso.',
    inputSchema: ReorderModulesInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ curso_id, modulos, idempotency_key }) => runTool(
    () => reorderModules(context, curso_id, modulos, idempotency_key),
    () => 'Módulos reordenados com sucesso.',
  ));

  server.registerTool('arquivar_modulo', {
    title: 'Arquivar módulo',
    description: 'Arquiva um módulo vazio ou sem aulas liberadas. Exige confirmação explícita e não apaga os dados.',
    inputSchema: ArchiveModuleInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async ({ modulo_id, idempotency_key }) => runTool(
    () => archiveModule(context, modulo_id, idempotency_key),
    () => 'Módulo arquivado com sucesso.',
  ));

  server.registerTool('listar_aulas', {
    title: 'Listar aulas de um módulo',
    description: 'Localiza aulas e retorna ID, número, ordem, situação, contagens, turmas liberadas, updated_at e revision_id.',
    inputSchema: ListLessonsInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ modulo_id, incluir_arquivadas }) => runTool(
    () => listLessons(context, modulo_id, incluir_arquivadas),
    (result) => `${result.aulas.length} aula(s) encontrada(s) no módulo ${result.modulo.titulo}.`,
  ));

  server.registerTool('consultar_aula', {
    title: 'Consultar aula completa',
    description: 'Obtém a aula, materiais, atividades, questões do Estudea, Arena independente, liberações e revision_id.',
    inputSchema: GetLessonInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ aula_id }) => runTool(
    () => getLesson(context, aula_id),
    (lesson) => `Aula “${String(lesson.titulo)}” carregada para revisão.`,
  ));

  server.registerTool('validar_aula', {
    title: 'Validar aula sem gravar',
    description: [
      'Confere conteúdo, ordem, URLs, alternativas, respostas, duplicidades e Arena sem alterar o Estudea.',
      'Use antes de criar ou atualizar. Retorna valida, erros, alertas, contagens e detalhes por campo.',
    ].join(' '),
    inputSchema: ValidateLessonInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ aula }) => runTool(
    () => validateLesson(aula),
    (result) => result.valida
      ? `Aula válida, com ${result.alertas.length} alerta(s). Nada foi gravado.`
      : `Aula inválida, com ${result.erros.length} erro(s). Nada foi gravado.`,
  ));

  server.registerTool('criar_aula_rascunho', {
    title: 'Criar aula completa não liberada',
    description: [
      'Cria atomicamente uma aula validada com conteúdo, materiais, atividades, questões e Arena independente.',
      'A aula fica como rascunho até uma chamada separada de liberar_aula_para_turma.',
      'Antes de chamar, valide a aula, consulte o módulo e apresente um resumo ao usuário.',
    ].join(' '),
    inputSchema: CreateLessonInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ modulo_id, aula, idempotency_key }) => runTool(
    () => createLessonDraft(context, modulo_id, aula, idempotency_key),
    (result) => [
      `Aula “${String(result.titulo)}” criada com sucesso e ainda não liberada.`,
      `ID: ${String(result.aula_id)}.`,
      reviewUrl(config) ? `Revisar no Estudea: ${reviewUrl(config)}` : '',
    ].filter(Boolean).join(' '),
  ));

  server.registerTool('atualizar_aula_rascunho', {
    title: 'Atualizar aula em rascunho',
    description: [
      'Substitui somente as seções informadas de uma aula ainda não liberada, de forma atômica.',
      'Listas informadas substituem integralmente materiais, atividades, questões ou Arena.',
      'Exige o revision_id da consulta mais recente para impedir sobrescrita concorrente.',
    ].join(' '),
    inputSchema: UpdateLessonInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async ({ aula_id, revision_id, alteracoes, idempotency_key }) => runTool(
    () => updateLessonDraft(context, aula_id, revision_id, alteracoes, idempotency_key),
    () => 'Rascunho atualizado e validado com sucesso.',
  ));

  server.registerTool('reordenar_aulas', {
    title: 'Reordenar aulas do módulo',
    description: 'Atualiza atomicamente ordem e, opcionalmente, número das aulas informadas no mesmo módulo.',
    inputSchema: ReorderLessonsInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ modulo_id, aulas, idempotency_key }) => runTool(
    () => reorderLessons(context, modulo_id, aulas, idempotency_key),
    () => 'Aulas reordenadas com sucesso.',
  ));

  server.registerTool('arquivar_aula', {
    title: 'Arquivar aula',
    description: 'Arquiva uma aula não liberada sem apagar seus dados. Exige confirmação explícita.',
    inputSchema: ArchiveLessonInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async ({ aula_id, idempotency_key }) => runTool(
    () => archiveLesson(context, aula_id, idempotency_key),
    () => 'Aula arquivada com sucesso.',
  ));

  server.registerTool('criar_aulas_em_lote', {
    title: 'Criar lote de aulas em rascunho',
    description: [
      'Valida e cria atomicamente até 100 aulas no mesmo módulo; detecta números e ordens duplicadas.',
      'Se uma aula falhar, nenhuma é criada. Nunca libera aulas automaticamente.',
      'Apresente ao usuário o resumo completo do lote antes da chamada.',
    ].join(' '),
    inputSchema: CreateLessonsBatchInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ modulo_id, aulas, idempotency_key }) => runTool(
    () => createLessonsBatch(context, modulo_id, aulas, idempotency_key),
    (result) => `${String(result.quantidade)} aula(s) criada(s) como rascunho. Nenhuma foi liberada.`,
  ));

  server.registerTool('registrar_aula_ministrada', {
    title: 'Registrar o que foi ministrado',
    description: 'Registra conteúdo e atividades efetivamente realizados, separados do material mostrado ao aluno.',
    inputSchema: RegisterTaughtLessonInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ aula_id, conteudo_da_aula, atividades_realizadas, idempotency_key }) => runTool(
    () => registerTaughtLesson(context, aula_id, conteudo_da_aula, atividades_realizadas, idempotency_key),
    () => 'Registro pós-aula salvo com sucesso.',
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

  server.registerTool('liberar_aula_para_turma', {
    title: 'Liberar aula para uma turma',
    description: 'Torna a aula acessível aos alunos. Use somente após confirmação explícita e depois de consultar aula e turma.',
    inputSchema: ReleaseLessonInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  }, async ({ aula_id, turma_id, idempotency_key }) => runTool(
    () => releaseLessonToClass(context, aula_id, turma_id, idempotency_key),
    () => 'Aula liberada para a turma com sucesso.',
  ));

  server.registerTool('retirar_aula_da_turma', {
    title: 'Retirar aula de uma turma',
    description: 'Remove o acesso da turma à aula, sem apagar a aula. Exige confirmação explícita do usuário.',
    inputSchema: WithdrawLessonInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  }, async ({ aula_id, turma_id, idempotency_key }) => runTool(
    () => withdrawLessonFromClass(context, aula_id, turma_id, idempotency_key),
    () => 'Aula retirada da turma com sucesso.',
  ));

  return server;
};
