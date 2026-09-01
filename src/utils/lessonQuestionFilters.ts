export type LessonQuestionReference = {
  atividade_id?: string | null;
  para_arena?: boolean | null;
  contexto?: 'aula' | 'atividade' | 'arena' | string | null;
};

export type LessonActivityReference = {
  id: string;
  tipo_entrega?: string | null;
};

export const isArenaQuestion = (question: LessonQuestionReference) => (
  question.para_arena === true || question.contexto === 'arena'
);

export const getStandardQuizQuestions = <T extends LessonQuestionReference>(questions?: T[] | null): T[] => (
  (questions || []).filter((question) => !question.atividade_id && !isArenaQuestion(question))
);

export const getArenaQuestions = <T extends LessonQuestionReference>(questions?: T[] | null): T[] => (
  (questions || []).filter((question) => !question.atividade_id && isArenaQuestion(question))
);

export const getActivityQuizQuestions = <T extends LessonQuestionReference>(
  questions: T[] | null | undefined,
  activityId: string,
): T[] => {
  const allList = questions || [];
  const activityQuestions = allList.filter((question) => question.atividade_id === activityId);
  if (activityQuestions.length > 0) {
    return activityQuestions;
  }
  const standard = getStandardQuizQuestions(allList);
  if (standard.length > 0) {
    return standard;
  }
  return allList.filter((question) => !isArenaQuestion(question));
};

export const hasStandardQuizQuestions = (questions?: LessonQuestionReference[] | null) => (
  getStandardQuizQuestions(questions).length > 0
);

export const shouldShowStandardQuiz = (
  questions?: LessonQuestionReference[] | null,
  activities?: LessonActivityReference[] | null,
) => {
  const standardQuestions = getStandardQuizQuestions(questions);
  if (standardQuestions.length === 0) {
    return false;
  }

  const allQuestions = questions || [];
  const quizActivityReusingStandardQuestions = (activities || []).some((activity) => (
    activity.tipo_entrega === 'quiz'
    && !allQuestions.some((question) => question.atividade_id === activity.id)
  ));

  return !quizActivityReusingStandardQuestions;
};

export const answersForQuestions = <T extends LessonQuestionReference & { id: string }>(
  questions: T[],
  answers: Record<string, string>,
) => Object.fromEntries(questions.map((question) => [question.id, answers[question.id] || '']));
