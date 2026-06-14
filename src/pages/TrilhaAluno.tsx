import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import { CardConquista } from '../components/common/CardConquista';
import { dispararCelebracao } from '../utils/celebracao';
import {
  BookOpen01Icon,
  PlayCircleIcon,
  NotebookIcon,
  Quiz01Icon,
  CheckmarkCircle02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Alert01Icon,
  Tick01Icon,
  Award01Icon,
  FireIcon,
  GraduateMaleIcon,
  LockPasswordIcon,
  Rocket01Icon,
  Layers01Icon,
  TaskDone01Icon,
  Calendar01Icon,
  MapsIcon,
  GameControllerIcon,
  Medal01Icon,
  Medal02Icon,
  Medal03Icon,
  DiamondIcon,
  CrownIcon,
  InformationCircleIcon
} from '@hugeicons/core-free-icons';

const renderFormattedText = (text: string) => {
  if (!text) return '';
  // Split by bold (**text**) or inline code (`code`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-on-surface">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-surface-container-high/80 text-primary px-1.5 py-0.5 rounded font-mono text-xs border border-outline-variant/30">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const parseLessonConteudo = (rawConteudo: string, tipo?: string) => {
  if (!rawConteudo) {
    return { descricao: '', conteudo: '' };
  }
  if (rawConteudo.includes('===DESCRIPTION_END===')) {
    const parts = rawConteudo.split('===DESCRIPTION_END===');
    return {
      descricao: parts[0] || '',
      conteudo: parts.slice(1).join('===DESCRIPTION_END===') || ''
    };
  }
  if (tipo && tipo !== 'texto') {
    return {
      descricao: rawConteudo,
      conteudo: ''
    };
  }
  return {
    descricao: '',
    conteudo: rawConteudo
  };
};

interface TrilhaAlunoProps {
  session: any;
  isAdmin: boolean;
  initialViewMode?: 'trail' | 'achievements';
  onStartArena: () => void;
}

interface Curso {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_capa: string | null;
  categoria: string | null;
  nivel: string | null;
  duracao: string | null;
}

interface Turma {
  id: string;
  nome: string;
  codigo_acesso: string;
  curso_id: string | null;
}

interface Modulo {
  id: string;
  curso_id: string;
  titulo: string;
  ordem: number;
}

interface Aula {
  id: string;
  modulo_id: string | null;
  tipo: 'video' | 'texto' | 'quiz' | 'arquivo';
  duracao: string | null;
  ordem: number;
  video_url: string | null;
  arquivo_url: string | null;
  pontos: number;
  nota_aprovacao: number;
  obrigatorio: boolean;
  embaralhar_questoes: boolean;
  tempo_limite: number | null;
  numero_aula: number;
  titulo: string;
  conteudo: string;
  liberada: boolean;
  atividades?: Atividade[];
  questoes?: Questao[];
}

interface Atividade {
  id: string;
  aula_id: string;
  enunciado: string;
  tipo_entrega: 'texto' | 'imagem' | 'quiz' | 'multipla';
  pontua?: boolean;
  permite_refazer?: boolean;
}

interface Questao {
  id: string;
  aula_id: string;
  enunciado: string;
  opcoes: string[];
  resposta_correta: string;
  ordem: number;
  tipo?: 'multipla_escolha' | 'verdadeiro_falso' | 'aberta' | 'multipla_selecao';
  atividade_id?: string | null;
  para_arena?: boolean;
}

interface Progresso {
  id: string;
  aluno_id: string;
  aula_id: string;
  concluido_em: string;
  avaliacao?: number | null;
}

interface Entrega {
  id: string;
  aluno_id: string;
  atividade_id: string;
  resposta: string;
  nota: number | null;
  feedback_professor: string | null;
}

// Ícones para status de módulo
const ArchitectureIcon = () => (
  <HugeiconsIcon icon={Layers01Icon} size={28} strokeWidth={2} className="text-primary" />
);

const ModuleLockIcon = () => (
  <HugeiconsIcon icon={LockPasswordIcon} size={28} strokeWidth={2} className="text-outline" />
);

const RocketModuleIcon = () => (
  <HugeiconsIcon icon={Rocket01Icon} size={28} strokeWidth={2} className="text-green-600" />
);

export const TrilhaAluno: React.FC<TrilhaAlunoProps> = ({ session, isAdmin, initialViewMode = 'trail', onStartArena }) => {
  const userId = session?.user?.id;
  const userName = session?.user?.user_metadata?.nome || session?.user?.email?.split('@')[0] || 'Estudante';

  // Navigation state
  const [view, setView] = useState<'dashboard' | 'module_trail' | 'lesson' | 'achievements'>('dashboard');

  // Database states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turma, setTurma] = useState<Turma | null>(null);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [progresso, setProgresso] = useState<Progresso[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [aulasLiberadas, setAulasLiberadas] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [classProgress, setClassProgress] = useState<any[]>([]);


  // Selected lesson navigation states
  const [selectedAula, setSelectedAula] = useState<Aula | null>(null);

  // Selected modulo for module_trail view
  const [selectedModulo, setSelectedModulo] = useState<Modulo | null>(null);

  // Lesson view specific UI states
  const [lessonSidebarOpen, setLessonSidebarOpen] = useState(true);
  const [activeLessonTab, setActiveLessonTab] = useState<'conteudo' | 'arquivos' | 'quiz' | 'atividade'>('conteudo');

  // Module expansion states
  const [expandedModulos, setExpandedModulos] = useState<Record<string, boolean>>({});

  const toggleModulo = (moduloId: string) => {
    setExpandedModulos(prev => ({
      ...prev,
      [moduloId]: !prev[moduloId]
    }));
  };

  // Quiz interactive state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);

  // Activity interactive state
  const [activityResponse, setActivityResponse] = useState<Record<string, string>>({});
  const [activityImage, setActivityImage] = useState<Record<string, string>>({});
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [activitySuccessMsg, setActivitySuccessMsg] = useState<string | null>(null);
  const [activityErrorMsg, setActivityErrorMsg] = useState<string | null>(null);
  const [isRedoingActivity, setIsRedoingActivity] = useState<Record<string, boolean>>({});

  // Progress submission state
  const [updatingProgress, setUpdatingProgress] = useState(false);

  // Lesson evaluation state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingLessonId, setRatingLessonId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Nota: o background do ambiente do aluno é aplicado via classe Tailwind
  // no wrapper abaixo. Não injetamos mais estilos em document.body.

  // Load everything
  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Update user streak in Supabase via RPC
      try {
        await supabase.rpc('atualizar_ofensiva_aluno', { p_user_id: userId });
      } catch (rpcErr) {
        console.warn('Erro ao atualizar ofensiva via RPC:', rpcErr);
      }

      // 2. Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (!profileData.turma_id) {
        setLoading(false);
        return; // No class assigned yet
      }

      // 2. Fetch class (turma)
      const { data: turmaData, error: turmaError } = await supabase
        .from('turmas')
        .select('*')
        .eq('id', profileData.turma_id)
        .single();

      if (turmaError) throw turmaError;
      setTurma(turmaData);

      if (!turmaData.curso_id) {
        setLoading(false);
        return; // No course assigned to this class
      }

      // 3. Fetch course (curso)
      const { data: cursoData, error: cursoError } = await supabase
        .from('cursos')
        .select('*')
        .eq('id', turmaData.curso_id)
        .single();

      if (cursoError) throw cursoError;
      setCurso(cursoData);

      // 4. Fetch modules (modulos) sorted by order
      const { data: modulosData, error: modulosError } = await supabase
        .from('modulos')
        .select('*')
        .eq('curso_id', turmaData.curso_id)
        .order('ordem', { ascending: true });

      if (modulosError) throw modulosError;
      setModulos(modulosData || []);

      if (modulosData && modulosData.length > 0) {
        const moduloIds = modulosData.map(m => m.id);

        // 5. Fetch lessons (aulas) along with nested activities and questions
        const { data: aulasData, error: aulasError } = await supabase
          .from('aulas')
          .select(`
            *,
            atividades(*)
          `)
          .in('modulo_id', moduloIds);

        if (aulasError) throw aulasError;

        // Sort lessons client-side by module order, then lesson order
        const modIdToOrder = new Map(modulosData.map((m, idx) => [m.id, idx]));
        const sortedAulas = (aulasData || []).sort((a, b) => {
          const orderA = modIdToOrder.get(a.modulo_id!) ?? 999;
          const orderB = modIdToOrder.get(b.modulo_id!) ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.ordem ?? 0) - (b.ordem ?? 0);
        });

        const aulaIds = sortedAulas.map(aula => aula.id);
        let questionsByLesson = new Map<string, Questao[]>();

        if (aulaIds.length > 0) {
          const { data: questionsData, error: questionsError } = await supabase
            .rpc('get_accessible_questions', { p_aula_ids: aulaIds });

          if (questionsError) throw questionsError;

          questionsByLesson = (questionsData || []).reduce((map: Map<string, Questao[]>, question: Questao) => {
            const current = map.get(question.aula_id) || [];
            current.push(question);
            map.set(question.aula_id, current);
            return map;
          }, new Map<string, Questao[]>());
        }

        setAulas(sortedAulas.map(aula => ({
          ...aula,
          questoes: questionsByLesson.get(aula.id) || []
        })));
      }

      // 6. Fetch user progress
      const { data: progressoData, error: progressoError } = await supabase
        .from('progresso_alunos')
        .select('*')
        .eq('aluno_id', userId);

      if (progressoError) throw progressoError;
      setProgresso(progressoData || []);

      // 7. Fetch user submissions
      const { data: entregasData, error: entregasError } = await supabase
        .from('entregas_atividades')
        .select('*')
        .eq('aluno_id', userId);

      if (entregasError) throw entregasError;
      setEntregas(entregasData || []);

      // 8. Fetch class released lessons
      const { data: liberadasData, error: liberadasError } = await supabase
        .from('turma_aulas_liberadas')
        .select('aula_id')
        .eq('turma_id', profileData.turma_id);

      if (liberadasError) throw liberadasError;
      setAulasLiberadas((liberadasData || []).map(r => r.aula_id));

      // 9. Fetch schedule/calendar from agenda
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda')
        .select('*')
        .order('time', { ascending: true });

      if (agendaError) throw agendaError;
      setSchedule(agendaData || []);

      // 10. Fetch a safe same-class ranking projection without exposing full profiles/submissions
      const { data: studentsData, error: studentsError } = await supabase
        .rpc('get_classmates_progress');

      if (studentsError) throw studentsError;
      setClassStudents(studentsData || []);
      setClassProgress([]);

    } catch (err: any) {
      console.error('Erro ao buscar dados da trilha:', err);
      setError(err.message || 'Falha ao carregar a trilha do aluno.');
    } finally {
      setLoading(false);
    }
  };

  const leaderboard = useMemo(() => {
    // Group other students' progress by student
    const progressCountMap = new Map<string, number>();
    classProgress.forEach(p => {
      progressCountMap.set(p.aluno_id, (progressCountMap.get(p.aluno_id) || 0) + 1);
    });

    let list = classStudents.map(student => {
      const isSelf = student.id === userId;
      // If it's the current user, use the live 'progresso' state length
      const completedCount = isSelf
        ? progresso.length
        : (student.aulas_concluidas ?? progressCountMap.get(student.id) ?? 0);
      const xp = (completedCount * 50) + ((student.maior_ofensiva || 0) * 20);
      return {
        id: student.id,
        name: student.nome || (isSelf ? userName : 'Estudante'),
        avatar: student.avatar_url || (isSelf ? (session?.user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDjHJPa48VdYiR05ZWGxXbALLDYlIWcSxoTbPlibTUuk_A5DCL8ceP5PgSnt9UDcsU9RAFB5c91IDtPmTCljSnfhoH8EoBhXp_QcCMb4QnDf_L_yuFFhQtcrk823AyvvrtjJbAwqlYZnOsu_lk5zBOMbLX8egLCirDVds1o7bri1xsI-opaFngNWT6CGBfc3F9lG9SBh4apN4fBXkExG7Rqfn34GSDZwsYInAIDdo4Jl6M42fD0xaeWUBN2lwtf5cebz3BoHRN3ypo") : "https://lh3.googleusercontent.com/aida-public/AB6AXuDjHJPa48VdYiR05ZWGxXbALLDYlIWcSxoTbPlibTUuk_A5DCL8ceP5PgSnt9UDcsU9RAFB5c91IDtPmTCljSnfhoH8EoBhXp_QcCMb4QnDf_L_yuFFhQtcrk823AyvvrtjJbAwqlYZnOsu_lk5zBOMbLX8egLCirDVds1o7bri1xsI-opaFngNWT6CGBfc3F9lG9SBh4apN4fBXkExG7Rqfn34GSDZwsYInAIDdo4Jl6M42fD0xaeWUBN2lwtf5cebz3BoHRN3ypo"),
        xp,
        isSelf
      };
    });
    return list.sort((a, b) => b.xp - a.xp);
  }, [classStudents, classProgress, progresso, userId, userName, session]);

  useEffect(() => {
    fetchData();
  }, [userId]);

  // Sync view state when initialViewMode changes (e.g., clicking dashboard or achievements in the sidebar)
  useEffect(() => {
    if (initialViewMode === 'achievements') {
      setView('achievements');
    } else {
      setView('dashboard');
    }
  }, [initialViewMode]);

  // Reset interactive states when lesson changes
  useEffect(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizPassed(null);
    setActivityResponse({});
    setActivityImage({});
    setActivitySuccessMsg(null);
    setActivityErrorMsg(null);
    setIsRedoingActivity({});

    // Set default active tab based on available contents
    if (selectedAula) {
      const hasActivityQuiz = selectedAula.atividades && selectedAula.atividades.some(a => a.tipo_entrega === 'quiz');

      if (selectedAula.video_url || selectedAula.conteudo) {
        setActiveLessonTab('conteudo');
      } else if (selectedAula.questoes && selectedAula.questoes.length > 0 && !hasActivityQuiz) {
        setActiveLessonTab('quiz');
      } else if (selectedAula.arquivo_url) {
        setActiveLessonTab('arquivos');
      } else if (selectedAula.atividades && selectedAula.atividades.length > 0) {
        setActiveLessonTab('atividade');
      }
    }

    // Pre-fill activity if already submitted
    if (selectedAula && selectedAula.atividades && selectedAula.atividades.length > 0) {
      const newResponses: Record<string, string> = {};
      const newImages: Record<string, string> = {};
      const newAnswers: Record<string, any> = {};

      selectedAula.atividades.forEach(activeAtividade => {
        const existingEntrega = entregas.find(e => e.atividade_id === activeAtividade.id);
        if (existingEntrega) {
          if (activeAtividade.tipo_entrega === 'quiz') {
            try {
              const parsed = JSON.parse(existingEntrega.resposta);
              if (parsed && parsed.respostas) {
                Object.assign(newAnswers, parsed.respostas);
              }
            } catch (e) {
              console.error('Erro ao fazer parse da resposta do quiz:', e);
            }
          } else {
            newResponses[activeAtividade.id] = existingEntrega.resposta;
            if (activeAtividade.tipo_entrega === 'imagem') {
              newImages[activeAtividade.id] = existingEntrega.resposta;
            } else if (activeAtividade.tipo_entrega === 'multipla') {
              try {
                const parsed = JSON.parse(existingEntrega.resposta);
                newResponses[activeAtividade.id] = parsed.texto || '';
                newImages[activeAtividade.id] = parsed.imagem || '';
              } catch (e) {}
            }
          }
        }
      });

      setActivityResponse(newResponses);
      setActivityImage(newImages);
      if (Object.keys(newAnswers).length > 0) {
        setQuizAnswers(newAnswers);
      }
    }
  }, [selectedAula, entregas]);

  // Check if a lesson is completed
  const isLessonCompleted = (aulaId: string) => {
    return progresso.some(p => p.aula_id === aulaId);
  };

  const handleToggleCompletion = async (aulaId: string, forceConcluir = false) => {
    if (updatingProgress || !userId) return;
    setUpdatingProgress(true);

    try {
      const completed = isLessonCompleted(aulaId);

      if (completed && !forceConcluir) {
        // Remove progress
        const { error: deleteError } = await supabase
          .from('progresso_alunos')
          .delete()
          .eq('aluno_id', userId)
          .eq('aula_id', aulaId);

        if (deleteError) throw deleteError;
        setProgresso(prev => prev.filter(p => p.aula_id !== aulaId));
      } else if (!completed) {
        // Insert progress
        const { data: insertData, error: insertError } = await supabase
          .from('progresso_alunos')
          .insert({
            aluno_id: userId,
            aula_id: aulaId
          })
          .select();

        if (insertError) throw insertError;
        if (insertData) {
          setProgresso(prev => [...prev, insertData[0]]);
          dispararCelebracao();
          
          // Open rating modal after successful completion!
          setRatingLessonId(aulaId);
          setRatingValue(0);
          setShowRatingModal(true);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar progresso:', err);
    } finally {
      setUpdatingProgress(false);
    }
  };

  const getLessonRating = (aulaId: string) => {
    const p = progresso.find(x => x.aula_id === aulaId);
    return p ? p.avaliacao : null;
  };

  const handleOpenRating = (aulaId: string, currentRating: number) => {
    setRatingLessonId(aulaId);
    setRatingValue(currentRating);
    setHoverRating(0);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (!userId || !ratingLessonId || ratingValue === 0) return;
    setSubmittingRating(true);
    try {
      const { error: ratingError } = await supabase
        .from('progresso_alunos')
        .upsert({
          aluno_id: userId,
          aula_id: ratingLessonId,
          concluido_em: new Date().toISOString(),
          avaliacao: ratingValue
        }, { onConflict: 'aluno_id,aula_id' });

      if (ratingError) throw ratingError;

      // Update the progress list locally with the rating
      setProgresso(prev => prev.map(p => {
        if (p.aula_id === ratingLessonId) {
          return { ...p, avaliacao: ratingValue };
        }
        return p;
      }));

      setShowRatingModal(false);
      setRatingLessonId(null);
    } catch (err) {
      console.error('Erro ao enviar avaliação da aula:', err);
    } finally {
      setSubmittingRating(false);
    }
  };

  const isQuestionCorrect = (q: Questao, answer: string) => {
    if (!answer || !answer.trim()) return false;
    
    if (q.tipo === 'aberta') {
      const keywordsStr = q.opcoes?.[1] || '';
      if (!keywordsStr.trim()) {
        return true;
      }
      
      const keywords = keywordsStr.toLowerCase().split(',').map(k => k.trim()).filter(k => k.length > 0);
      const studentAnswer = answer.toLowerCase();
      
      // Verifica se o aluno escreveu TODAS as palavras-chave na resposta
      return keywords.every(k => studentAnswer.includes(k));
    }

    if (q.tipo === 'multipla_selecao') {
      const correctParts = (q.resposta_correta || '').split(';').map(p => p.trim().toLowerCase()).filter(p => p.length > 0).sort();
      const answerParts = answer.split(';').map(p => p.trim().toLowerCase()).filter(p => p.length > 0).sort();
      return correctParts.length === answerParts.length && correctParts.every((val, index) => val === answerParts[index]);
    }
    
  };

  const handleToggleAnswerMulti = (qId: string, option: string) => {
    setQuizAnswers(prev => {
      const currentAnswer = prev[qId] || '';
      const selected = currentAnswer ? currentAnswer.split(';').map(o => o.trim()).filter(o => o.length > 0) : [];
      
      let updated: string[];
      if (selected.includes(option)) {
        updated = selected.filter(o => o !== option);
      } else {
        updated = [...selected, option];
      }
      
      return { ...prev, [qId]: updated.join(';') };
    });
  };

  const applyQuizCorrectionResults = (aulaId: string, results: any[]) => {
    if (!Array.isArray(results) || results.length === 0) return;

    const resultMap = new Map(results.map(result => [result.question_id, result]));
    const hydrateQuestions = (questions: Questao[] = []) =>
      questions.map(question => {
        const correction = resultMap.get(question.id);
        if (!correction) return question;

        return {
          ...question,
          resposta_correta: correction.resposta_correta || question.resposta_correta || '',
          opcoes: Array.isArray(correction.opcoes) ? correction.opcoes : question.opcoes
        };
      });

    setAulas(prev =>
      prev.map(aula =>
        aula.id === aulaId
          ? { ...aula, questoes: hydrateQuestions(aula.questoes || []) }
          : aula
      )
    );

    setSelectedAula(prev =>
      prev && prev.id === aulaId
        ? { ...prev, questoes: hydrateQuestions(prev.questoes || []) }
        : prev
    );
  };

  // Submit quiz responses
  const handleSubmitQuiz = async () => {
    if (!selectedAula || !selectedAula.questoes || selectedAula.questoes.length === 0) return;

    const { data: gradeData, error: gradeError } = await supabase
      .rpc('grade_quiz_answers', {
        p_aula_id: selectedAula.id,
        p_respostas: quizAnswers,
        p_atividade_id: null
      });

    if (gradeError) {
      console.error('Erro ao corrigir quiz:', gradeError);
      setActivityErrorMsg('Não foi possível corrigir o quiz. Tente novamente.');
      return;
    }

    applyQuizCorrectionResults(selectedAula.id, gradeData?.results || []);

    const score = typeof gradeData?.score === 'number' ? gradeData.score : null;
    const passed = !!gradeData?.passed;

    setQuizScore(score);
    setQuizPassed(passed);
    setQuizSubmitted(true);

    if (passed) {
      // Automatically complete the lesson
      await handleToggleCompletion(selectedAula.id, true);
    }

    // Rede de segurança: Se a aula tem uma atividade vinculada do tipo quiz,
    // e o aluno por algum motivo submeteu o Quiz tradicional da Aula (Tab 3),
    // salvamos a resposta dele como a entrega da Atividade Prática
    const quizActivity = selectedAula.atividades?.find(a => a.tipo_entrega === 'quiz');
    if (quizActivity) {
      await handleSubmitActivity(quizActivity.id, 'quiz');
    }
  };

  const handleSubmitActivity = async (atividadeId: string, tipo: 'texto' | 'imagem' | 'quiz' | 'multipla') => {
    let answer = '';
    const actResponse = activityResponse[atividadeId] || '';
    const actImage = activityImage[atividadeId] || '';

    if (tipo === 'quiz') {
      const activityRecord = selectedAula?.atividades?.find(a => a.id === atividadeId);
      const isProprio = selectedAula?.questoes?.some(q => q.atividade_id === atividadeId);
      const questions = isProprio
        ? (selectedAula?.questoes?.filter(q => q.atividade_id === atividadeId) || [])
        : (selectedAula?.questoes?.filter(q => !q.atividade_id && !q.para_arena) || []);

      const isGraded = activityRecord ? (activityRecord.pontua ?? true) : true;
      const shouldGrade = isGraded && questions.length > 0;

      let payload: any = {};

      if (shouldGrade) {
        const { data: gradeData, error: gradeError } = await supabase
          .rpc('grade_quiz_answers', {
            p_aula_id: selectedAula?.id,
            p_respostas: quizAnswers,
            p_atividade_id: atividadeId
          });

        if (gradeError) {
          throw gradeError;
        }

        if (selectedAula) {
          applyQuizCorrectionResults(selectedAula.id, gradeData?.results || []);
        }

        payload = {
          respostas: quizAnswers,
          score: gradeData?.score ?? 0,
          correctCount: gradeData?.correctCount ?? 0,
          totalQuestions: gradeData?.totalQuestions ?? questions.length,
          passed: !!gradeData?.passed
        };
      } else {
        payload = {
          respostas: quizAnswers,
          score: null,
          correctCount: null,
          totalQuestions: questions.length,
          passed: null
        };
      }
      answer = JSON.stringify(payload);
    } else if (tipo === 'multipla') {
      if (!actResponse.trim() && !actImage.trim()) {
        setActivityErrorMsg('Por favor, insira um texto ou o link de uma imagem para enviar.');
        return;
      }
      answer = JSON.stringify({
        texto: actResponse.trim(),
        imagem: actImage.trim()
      });
    } else {
      answer = tipo === 'texto' ? actResponse : actImage;
    }

    if (!answer.trim()) {
      setActivityErrorMsg('Por favor, insira uma resposta antes de enviar.');
      return;
    }

    setSubmittingActivity(true);
    setActivityErrorMsg(null);
    setActivitySuccessMsg(null);

    try {
      const existingEntrega = entregas.find(e => e.atividade_id === atividadeId);

      // Automatically fill the grade if the quiz is graded (pontua === true)
      // We will set nota to null initially so it arrives in the Corrections Center as pending review,
      // but we can still store it. Wait, if we keep nota null, it's marked as pending. Let's do that!
      const gradeValue = null; // Instructor reviews and confirms score

      if (existingEntrega) {
        // Update
        const { error: updateError } = await supabase
          .from('entregas_atividades')
          .update({
            resposta: answer.trim(),
            nota: gradeValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntrega.id);

        if (updateError) throw updateError;
        setActivitySuccessMsg('Atividade atualizada com sucesso!');
      } else {
        // Insert
        const { data: insertData, error: insertError } = await supabase
          .from('entregas_atividades')
          .insert({
            aluno_id: userId,
            atividade_id: atividadeId,
            resposta: answer.trim(),
            nota: gradeValue
          })
          .select();

        if (insertError) throw insertError;
        if (insertData) {
          setEntregas(prev => [...prev, insertData[0]]);
          dispararCelebracao();
        }
        setActivitySuccessMsg('Atividade enviada com sucesso!');
      }

      // Refresh entregas
      const { data: freshEntregas } = await supabase
        .from('entregas_atividades')
        .select('*')
        .eq('aluno_id', userId);
      if (freshEntregas) {
        setEntregas(freshEntregas);
      }

      // Automatically complete the lesson in progress map if all activities are delivered
      if (selectedAula && !isLessonCompleted(selectedAula.id)) {
        const allActs = selectedAula.atividades || [];
        const currentDeliveries = freshEntregas || entregas;
        const allSubmitted = allActs.every(act => 
          currentDeliveries.some(e => e.atividade_id === act.id)
        );
        if (allSubmitted) {
          await handleToggleCompletion(selectedAula.id, true);
        }
      }

      setIsRedoingActivity(prev => ({ ...prev, [atividadeId]: false }));
    } catch (err: any) {
      console.error('Erro ao enviar atividade:', err);
      setActivityErrorMsg(err.message || 'Erro ao enviar a atividade.');
    } finally {
      setSubmittingActivity(false);
    }
  };

  // Navigate lessons in detail view
  const handleNextLesson = () => {
    if (!selectedAula) return;
    const currentIndex = aulas.findIndex(a => a.id === selectedAula.id);
    if (currentIndex >= 0 && currentIndex < aulas.length - 1) {
      const nextL = aulas[currentIndex + 1];
      if (nextL && aulasLiberadas.includes(nextL.id)) {
        const nextModulo = modulos.find(m => m.id === nextL.modulo_id);
        if (nextModulo) {
          setSelectedModulo(nextModulo);
        }
        setSelectedAula(nextL);
      }
    }
  };

  const handlePrevLesson = () => {
    if (!selectedAula) return;
    const currentIndex = aulas.findIndex(a => a.id === selectedAula.id);
    if (currentIndex > 0) {
      const prevL = aulas[currentIndex - 1];
      const prevModulo = modulos.find(m => m.id === prevL.modulo_id);
      if (prevModulo) {
        setSelectedModulo(prevModulo);
      }
      setSelectedAula(prevL);
    }
  };

  // Calculations for progress
  const totalAulasCount = aulas.length;
  const completedAulasCount = aulas.filter(a => isLessonCompleted(a.id)).length;
  const percentComplete = totalAulasCount > 0 ? Math.round((completedAulasCount / totalAulasCount) * 100) : 0;

  // League calculations based on student XP
  const studentXP = (completedAulasCount * 50) + ((profile?.maior_ofensiva || 0) * 20);

  const obterLiga = (xp: number) => {
    if (xp <= 200) return { nome: 'Liga Bronze', icon: Medal03Icon, cor: 'from-amber-700 to-amber-500', shadow: 'shadow-amber-500/20', text: 'text-amber-700' };
    if (xp <= 500) return { nome: 'Liga Prata', icon: Medal02Icon, cor: 'from-slate-400 to-slate-500', shadow: 'shadow-slate-500/20', text: 'text-slate-600' };
    if (xp <= 1000) return { nome: 'Liga Ouro', icon: Medal01Icon, cor: 'from-yellow-400 to-yellow-500', shadow: 'shadow-yellow-500/20', text: 'text-yellow-600' };
    if (xp <= 2000) return { nome: 'Liga Platina', icon: DiamondIcon, cor: 'from-cyan-400 to-cyan-500', shadow: 'shadow-cyan-500/20', text: 'text-cyan-600' };
    return { nome: 'Liga Diamante', icon: CrownIcon, cor: 'from-purple-500 to-indigo-600', shadow: 'shadow-purple-500/20', text: 'text-purple-600' };
  };

  const ligaUsuario = obterLiga(studentXP);

  // Find the next lesson to resume studying (first uncompleted lesson)
  const resumeLesson = aulas.find(a => !isLessonCompleted(a.id)) || (aulas.length > 0 ? aulas[0] : null);

  // Sequential module unlocking logic
  let foundActiveModule = false;
  const processedModulos = modulos.map((modulo) => {
    const moduloAulas = aulas.filter(a => a.modulo_id === modulo.id);
    const total = moduloAulas.length;
    const completed = moduloAulas.filter(a => isLessonCompleted(a.id)).length;

    let status: 'CONCLUÍDO' | 'EM PROGRESSO' | 'BLOQUEADO' = 'BLOQUEADO';
    if (total > 0 && completed === total) {
      status = 'CONCLUÍDO';
    } else if (!foundActiveModule) {
      status = 'EM PROGRESSO';
      foundActiveModule = true;
    } else {
      status = 'BLOQUEADO';
    }

    const nextLesson = moduloAulas.find(a => !isLessonCompleted(a.id));

    return {
      ...modulo,
      total,
      completed,
      status,
      nextLesson
    };
  });

  // Conquistas — usando Huge Icons do sistema
  const achievements = [
    {
      id: 'pioneiro',
      title: 'Pioneiro',
      desc: 'Completou a primeira aula do curso.',
      icon: Award01Icon,
      iconName: 'Award01Icon',
      unlocked: completedAulasCount > 0,
      bgClass: 'bg-amber-50',
      iconClass: 'text-amber-500'
    },
    {
      id: 'autodidata',
      title: 'Auto-didata',
      desc: 'Completou 5 aulas do curso.',
      icon: BookOpen01Icon,
      iconName: 'BookOpen01Icon',
      unlocked: completedAulasCount >= 5,
      bgClass: 'bg-teal-50',
      iconClass: 'text-teal-500'
    },
    {
      id: 'estudioso',
      title: 'Estudioso',
      desc: 'Completou 10 aulas do curso.',
      icon: GraduateMaleIcon,
      iconName: 'GraduateMaleIcon',
      unlocked: completedAulasCount >= 10,
      bgClass: 'bg-purple-50',
      iconClass: 'text-secondary'
    },
    {
      id: 'mestre',
      title: 'Mestre',
      desc: 'Completou 100% de todo o curso.',
      icon: Award01Icon,
      iconName: 'Award01Icon',
      unlocked: percentComplete === 100,
      bgClass: 'bg-yellow-50',
      iconClass: 'text-yellow-600'
    },
    {
      id: 'fogo3',
      title: '3 Dias de Fogo',
      desc: 'Manteve uma sequência de 3 dias de acessos.',
      icon: FireIcon,
      iconName: 'FireIcon',
      unlocked: (profile?.maior_ofensiva ?? 0) >= 3,
      bgClass: 'bg-orange-50',
      iconClass: 'text-orange-500'
    },
    {
      id: 'fogo7',
      title: '7 Dias de Fogo',
      desc: 'Manteve uma sequência de 7 dias de acessos.',
      icon: FireIcon,
      iconName: 'FireIcon',
      unlocked: (profile?.maior_ofensiva ?? 0) >= 7,
      bgClass: 'bg-red-50',
      iconClass: 'text-red-500'
    },
    {
      id: 'maratonista',
      title: 'Maratonista',
      desc: 'Alcançou um recorde de 15 dias de ofensiva.',
      icon: Rocket01Icon,
      iconName: 'Rocket01Icon',
      unlocked: (profile?.maior_ofensiva ?? 0) >= 15,
      bgClass: 'bg-blue-50',
      iconClass: 'text-blue-500'
    },
    {
      id: 'imparavel',
      title: 'Imparável',
      desc: 'Alcançou um recorde de 30 dias de ofensiva.',
      icon: Rocket01Icon,
      iconName: 'Rocket01Icon',
      unlocked: (profile?.maior_ofensiva ?? 0) >= 30,
      bgClass: 'bg-indigo-50',
      iconClass: 'text-indigo-500'
    },
    {
      id: 'explorador',
      title: 'Explorador',
      desc: 'Entregou sua primeira atividade prática.',
      icon: NotebookIcon,
      iconName: 'NotebookIcon',
      unlocked: entregas.length > 0,
      bgClass: 'bg-pink-50',
      iconClass: 'text-pink-500'
    },
    {
      id: 'top_scholar',
      title: 'Cientista',
      desc: 'Entregou 3 ou mais atividades práticas.',
      icon: Layers01Icon,
      iconName: 'Layers01Icon',
      unlocked: entregas.length >= 3,
      bgClass: 'bg-cyan-50',
      iconClass: 'text-cyan-500'
    }
  ];

  // Extract youtube video id
  const getYoutubeEmbedUrl = (url: string | null) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  // Converts a file URL to an embeddable preview URL (Google Drive or direct PDF)
  // Returns: { embedUrl, type: 'gdrive' | 'pdf' | 'other' }
  const getArquivoEmbedInfo = (url: string | null): { embedUrl: string; type: 'gdrive' | 'pdf' | 'other' } | null => {
    if (!url) return null;

    // Google Drive: /file/d/FILE_ID/view or open?id=FILE_ID
    const gdriveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (gdriveFileMatch) {
      const fileId = gdriveFileMatch[1];
      return {
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        type: 'gdrive'
      };
    }
    const gdriveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (gdriveOpenMatch) {
      const fileId = gdriveOpenMatch[1];
      return {
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        type: 'gdrive'
      };
    }

    // Direct PDF link
    if (url.toLowerCase().includes('.pdf')) {
      return { embedUrl: url, type: 'pdf' };
    }

    // Other file types — no embed, just download
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <p className="text-on-surface-variant font-medium animate-pulse">Carregando sua jornada de aprendizado...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-error-container/10 border border-error/20 rounded-2xl p-6 text-center space-y-4">
        <HugeiconsIcon icon={Alert01Icon} size={48} className="text-error mx-auto" />
        <h3 className="app-section-title">Ops, algo deu errado</h3>
        <p className="text-on-surface-variant text-body-md">{error}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-container shadow transition-all"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="max-w-xl mx-auto bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-8 text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
          <HugeiconsIcon icon={BookOpen01Icon} size={28} />
        </div>
        <div className="space-y-2">
          <h3 className="app-title">Nenhuma turma vinculada</h3>
          <p className="text-on-surface-variant text-body-md leading-relaxed">
            Olá! Parece que você ainda não está vinculado a nenhuma turma na plataforma.
          </p>
          <p className="text-label-md text-on-surface-variant/80">
            Entre em contato com o seu professor ou administrador para solicitar o ingresso em uma turma.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold font-heading rounded-xl shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            Verificar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="max-w-xl mx-auto bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-8 text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mx-auto">
          <HugeiconsIcon icon={BookOpen01Icon} size={28} />
        </div>
        <div className="space-y-2 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-surface-container border border-outline-variant/40 text-label-sm font-semibold text-on-surface-variant mb-2">
            Turma: {turma.nome}
          </span>
          <h3 className="app-title">Aguardando Curso</h3>
          <p className="text-on-surface-variant text-body-md leading-relaxed">
            Sua turma <span className="font-bold text-on-surface">{turma.nome}</span> ainda não tem nenhum curso ativo atribuído.
          </p>
          <p className="text-label-md text-on-surface-variant/80">
            Fique atento! Assim que o professor liberar os materiais do curso, eles aparecerão automaticamente aqui.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-gradient-to-r from-secondary to-secondary-container text-on-secondary font-bold font-heading rounded-xl shadow-md shadow-secondary/10 hover:shadow-lg hover:shadow-secondary/20 transition-all"
          >
            Atualizar Conteúdos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page animate-fade-in" data-initial-view={initialViewMode}>


      {/* VIEW 1: STUDENT DASHBOARD */}
      {view === 'dashboard' ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Welcome & Progress Row */}
          <section id="welcome-section" className="app-page-header app-page-header-row">
            <div>
              <h1 className="app-title">
                Olá, {userName}! 👋 {isAdmin && <span className="text-[12px] bg-secondary/10 text-secondary border border-secondary/20 font-bold px-2.5 py-0.5 rounded-full inline-block align-middle ml-2">Modo de Visualização</span>}
              </h1>
              <p className="text-body-md text-on-surface-variant font-medium">Pronto para continuar sua jornada de aprendizado hoje?</p>
            </div>
            
            {/* General Progress Card Widget */}
            <div className="app-card-padded w-full md:w-auto md:min-w-[320px] shrink-0">
              <div className="flex justify-between items-end mb-3">
                <span className="font-semibold text-sm text-on-surface-variant uppercase tracking-wide">Progresso Geral</span>
                <span className="text-2xl font-bold text-primary">{percentComplete}%</span>
              </div>
              <div className="h-3 bg-surface-container-low rounded-full overflow-hidden shadow-inner relative">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out" 
                  style={{ 
                    width: `${percentComplete}%`,
                    background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)' 
                  }}
                >
                  <div className="shimmer-bg"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content & Sidebar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Main Course Trail (8 Columns) */}
            <div className="lg:col-span-8 flex flex-col gap-10">
              
              {/* Continuing Watching Banner */}
              {resumeLesson && (
                <section>
                  <div 
                    onClick={() => {
                      const moduloOfLesson = modulos.find(m => m.id === resumeLesson.modulo_id);
                      if (moduloOfLesson) {
                        setSelectedModulo(moduloOfLesson);
                      }
                      setSelectedAula(resumeLesson);
                      setView('lesson');
                    }}
                    className="app-card-padded hover-lift relative overflow-hidden group min-h-[180px] cursor-pointer"
                  >
                    <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent z-0"></div>
                    <img 
                      alt="Aula em andamento" 
                      className="absolute right-0 top-0 w-2/3 h-full object-cover object-right opacity-30 group-hover:scale-105 transition-transform duration-700 mix-blend-multiply" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUw456cP16FhWgyosnJDFinBAvf0CYt8XZxgsGs0KraSItgUFDSC5CQZRicq2QFORsZY7nym7gBk1lfngyGLaimKxXHzRgRsCruXoB4eAaOu1TyfCveHSXIvrfecav0mOxbGntRV47L28S6svQNJ8N9K_AFIZIWqM_Ch8XUNWTFn79LzstNzTmgXmGfodeoBMZKiATRMlEKhRdHlwEDXenR_eNiDFwqiKUFK69k65hirnI3vWMrTckNboL1ceaavlYuyCbp8oL-TA"
                    />
                    <div className="relative z-20 flex flex-col h-full justify-between">
                      <div>
                        <span className="inline-block px-4 py-1.5 bg-white/60 text-primary font-semibold text-xs rounded-full mb-4 backdrop-blur-md border border-white/50 uppercase tracking-wider">
                          Continuar Assistindo • {curso.titulo}
                        </span>
                        <h3 className="app-title max-w-lg">
                          Aula {resumeLesson.numero_aula}: {resumeLesson.titulo}
                        </h3>
                        <p className="text-on-surface-variant mt-3 max-w-md font-medium text-body-md">
                          {resumeLesson.tipo === 'quiz' ? 'Resolva as questões do quiz para passar de módulo.' : 'Faltam alguns minutos para concluir este módulo.'}
                        </p>
                      </div>
                      <div className="mt-8 flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const moduloOfLesson = modulos.find(m => m.id === resumeLesson.modulo_id);
                            if (moduloOfLesson) {
                              setSelectedModulo(moduloOfLesson);
                            }
                            setSelectedAula(resumeLesson);
                            setView('lesson');
                          }}
                          className="app-primary-action"
                        >
                          <HugeiconsIcon icon={PlayCircleIcon} size={18} />
                          Retomar Aula
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Achievements Row */}
              <section id="achievements-section">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="app-section-title">Conquistas</h2>
                  <button 
                    onClick={() => setView('achievements')}
                    className="text-primary font-medium text-label-sm hover:underline"
                  >
                    Ver todas
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {achievements.slice(0, 4).map((ach, idx) => (
                    <CardConquista
                      key={idx}
                      titulo={ach.title}
                      descricao={ach.unlocked ? ach.desc : 'Bloqueado'}
                      iconeName={ach.iconName}
                      bloqueado={!ach.unlocked}
                    />
                  ))}
                </div>
              </section>

              {/* Learning Trail Modules list */}
              <section id="trail-section">
                <h2 className="app-section-title mb-4">Trilha de Aprendizado</h2>
                <div className="flex flex-col gap-4">
                  {processedModulos.length === 0 ? (
                    <div className="app-card-padded text-center text-on-surface-variant italic">
                      Nenhum módulo disponível no momento.
                    </div>
                  ) : (
                    processedModulos.map((modulo) => {
                      const percentModulo = modulo.total > 0 ? Math.round((modulo.completed / modulo.total) * 100) : 0;

                      let borderStyle = 'border-l-4 border-l-gray-300 opacity-75';
                      let circleStyle = 'bg-surface-variant text-outline';
                      let textStyle = 'text-gray-500';
                      let badgeStyle = 'bg-gray-100 text-gray-500';
                      let badgeText = 'Bloqueado';
                      let barStyle = 'bg-outline-variant w-0';
                      let Icon = ModuleLockIcon;

                      if (modulo.status === 'CONCLUÍDO') {
                        borderStyle = 'border-l-4 border-l-green-500';
                        circleStyle = 'bg-green-50 text-green-600';
                        textStyle = 'text-on-surface';
                        badgeStyle = 'bg-green-100 text-green-700';
                        badgeText = 'Conclúido';
                        barStyle = 'bg-green-500 w-full';
                        Icon = RocketModuleIcon;
                      } else if (modulo.status === 'EM PROGRESSO') {
                        borderStyle = 'border-l-4 border-l-primary';
                        circleStyle = 'bg-blue-50 text-primary';
                        textStyle = 'text-on-surface';
                        badgeStyle = 'bg-blue-100 text-primary';
                        badgeText = 'Em Progresso';
                        barStyle = 'bg-primary';
                        Icon = ArchitectureIcon;
                      }

                      const isExpanded = !!expandedModulos[modulo.id];
                      const moduloAulas = aulas.filter(a => a.modulo_id === modulo.id);

                      return (
                        <div 
                          key={modulo.id} 
                          onClick={() => {
                            if (modulo.status !== 'BLOQUEADO') {
                              setSelectedModulo(modulo);
                              setView('module_trail');
                            }
                          }}
                          className={`app-card-padded transition-all ${
                            modulo.status !== 'BLOQUEADO' 
                              ? 'hover-lift cursor-pointer hover:bg-white/80' 
                              : 'opacity-75 cursor-not-allowed'
                          } ${borderStyle}`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${circleStyle}`}>
                                <Icon />
                              </div>
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className={`app-section-title ${textStyle}`}>{modulo.titulo}</h4>
                                  <span className={`px-2.5 py-1 font-bold text-[10px] uppercase tracking-wider rounded-md ${badgeStyle}`}>
                                    {badgeText}
                                  </span>
                                </div>
                                <p className="text-label-sm text-on-surface-variant font-medium mb-3">
                                  {modulo.status === 'BLOQUEADO'
                                    ? 'Complete o módulo anterior para desbloquear.'
                                    : `${modulo.total} aula${modulo.total !== 1 ? 's' : ''} neste módulo`}
                                </p>

                                <div className="flex flex-wrap items-center gap-4">
                                  {modulo.status === 'EM PROGRESSO' && modulo.nextLesson && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedModulo(modulo);
                                        setSelectedAula(modulo.nextLesson!);
                                        setView('lesson');
                                      }}
                                      className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline text-left cursor-pointer"
                                    >
                                      <HugeiconsIcon icon={PlayCircleIcon} size={16} />
                                      Próxima: Aula {modulo.nextLesson.numero_aula} - {modulo.nextLesson.titulo}
                                    </button>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleModulo(modulo.id);
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                  >
                                    {isExpanded ? 'Ocultar Lições' : 'Ver Lições do Módulo'}
                                    <svg 
                                      className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2.5" 
                                      viewBox="0 0 24 24" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Right Module progress bar */}
                            <div className="flex flex-col gap-2 min-w-[200px] pt-4 md:pt-0 border-t md:border-0 border-outline-variant/20">
                              <div className="flex justify-between text-xs font-semibold text-on-surface-variant">
                                <span>Progresso do Módulo</span>
                                <span className={modulo.status === 'CONCLUÍDO' ? 'text-green-600' : modulo.status === 'EM PROGRESSO' ? 'text-primary' : 'text-gray-400'}>
                                  {modulo.completed}/{modulo.total} aulas
                                </span>
                              </div>
                              <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${barStyle}`}
                                  style={{ width: modulo.status === 'BLOQUEADO' ? '0%' : modulo.status === 'CONCLUÍDO' ? '100%' : `${percentModulo}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Expanded Lesson Drawer List */}
                          {isExpanded && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="mt-6 pt-6 border-t border-outline-variant/30 space-y-2"
                            >
                              <h5 className="font-heading font-extrabold text-label-md text-on-surface mb-3">Conteúdo Detalhado:</h5>
                              {moduloAulas.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic">Nenhuma lição cadastrada neste módulo.</p>
                              ) : (
                                moduloAulas.map((aula) => {
                                  const completed = isLessonCompleted(aula.id);
                                  const isLiberada = aulasLiberadas.includes(aula.id);
                                  const unlocked = (modulo.status === 'CONCLUÍDO'
                                    ? true
                                    : modulo.status === 'BLOQUEADO'
                                      ? false
                                      : (completed || modulo.nextLesson?.id === aula.id)) && isLiberada;

                                  let statusText = 'Bloqueado';
                                  let statusColor = 'text-gray-400';
                                  
                                  if (!isLiberada) {
                                    statusText = 'Aguardando Liberação';
                                    statusColor = 'text-amber-500 font-bold';
                                  } else if (completed) {
                                    statusText = 'Concluído';
                                    statusColor = 'text-green-600 font-bold';
                                  } else if (unlocked) {
                                    statusText = 'Disponível';
                                    statusColor = 'text-primary font-bold';
                                  }

                                  const typesList: string[] = [];
                                  if (aula.video_url) typesList.push('Vídeo');
                                  if (aula.questoes && aula.questoes.length > 0 && !(aula.atividades && aula.atividades.some(a => a.tipo_entrega === 'quiz'))) typesList.push('Quiz');
                                  if (aula.arquivo_url) typesList.push('Material');
                                  if (aula.atividades && aula.atividades.length > 0) typesList.push('Atividade');
                                  if (aula.conteudo && typesList.length === 0) typesList.push('Texto');
                                  const typeLabel = typesList.join(' + ') || 'Teórica';

                                  return (
                                    <button
                                      key={aula.id}
                                      disabled={!unlocked}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedModulo(modulo);
                                        setSelectedAula(aula);
                                        setView('lesson');
                                      }}
                                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                                        unlocked
                                          ? 'bg-white/60 hover:bg-primary/5 hover:border-primary/20 border-outline-variant/30 cursor-pointer shadow-sm hover:scale-[1.01]'
                                          : 'bg-surface border-transparent opacity-60 cursor-not-allowed'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={`shrink-0 ${unlocked ? 'text-primary' : 'text-outline-variant'}`}>
                                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            {aula.video_url ? (
                                              <>
                                                <circle cx="12" cy="12" r="10" />
                                                <polygon points="10 8 16 12 10 16 10 8" />
                                              </>
                                            ) : (aula.questoes && aula.questoes.length > 0) ? (
                                              <>
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                              </>
                                            ) : aula.arquivo_url ? (
                                              <>
                                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                              </>
                                            ) : (
                                              <>
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                <line x1="16" y1="17" x2="8" y2="17" />
                                                <polyline points="10 9 9 9 8 9" />
                                              </>
                                            )}
                                          </svg>
                                        </div>
                                        <div className="truncate">
                                          <p className={`font-sans font-bold text-label-md truncate ${unlocked ? 'text-on-surface' : 'text-gray-400'}`}>
                                            Aula {aula.numero_aula}: {aula.titulo}
                                          </p>
                                          <p className="text-[10px] text-on-surface-variant font-semibold mt-0.5">
                                            {typeLabel} {aula.duracao ? `• ${aula.duracao}` : ''}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <span className={`text-[11px] font-bold uppercase tracking-wide ${statusColor}`}>
                                          {statusText}
                                        </span>
                                        <div className={completed ? 'text-green-600' : unlocked ? 'text-primary' : 'text-outline-variant'}>
                                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            {completed && <polyline points="20 6 9 17 4 12" />}
                                            {!completed && unlocked && <polygon points="5 3 19 12 5 21 5 3" className="fill-current" />}
                                            {!completed && !unlocked && (
                                              <path d="M17 11V7a5 5 0 0 0-10 0v4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM9 11V7a3 3 0 0 1 6 0v4H9z" />
                                            )}
                                          </svg>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

            </div>

            {/* Right Column: Sidebar Widgets (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col gap-8">

              {/* Arena Live Widget */}
              <div className="app-card-padded border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden flex flex-col justify-between">
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest mb-3">
                    Multiplayer Live
                  </span>
                  <h3 className="font-heading font-black text-body-md text-on-surface flex items-center gap-2">
                    <HugeiconsIcon icon={GameControllerIcon} size={20} strokeWidth={2} />
                    Arena Estudea
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1.5 font-medium leading-relaxed">
                    Entre com o código PIN fornecido pelo seu professor para participar do quiz competitivo em tempo real!
                  </p>
                </div>
                <button 
                  onClick={onStartArena}
                  className="w-full mt-5 py-3 bg-primary hover:bg-blue-700 text-white font-heading font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  Entrar na Arena Live
                </button>
              </div>
              
              {/* Quick Stats Widget */}
              <div className="app-card-padded">
                <h3 className="app-section-title mb-6">Estatísticas Rápidas</h3>
                <div className="flex flex-col gap-5">
                  
                  {/* Card 1: Completed lessons count */}
                  <div className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-primary shrink-0 shadow-sm">
                      <HugeiconsIcon icon={BookOpen01Icon} size={22} strokeWidth={2} className="text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-on-surface-variant">Aulas Assistidas</div>
                      <div className="text-2xl font-extrabold text-on-surface">{completedAulasCount}</div>
                    </div>
                  </div>

                  {/* Card 2: Assignments completed count */}
                  <div className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-secondary shrink-0 shadow-sm">
                      <HugeiconsIcon icon={TaskDone01Icon} size={22} strokeWidth={2} className="text-secondary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-on-surface-variant">Atividades Entregues</div>
                      <div className="text-2xl font-extrabold text-on-surface">{entregas.length}</div>
                    </div>
                  </div>

                  {/* Card 3: Offensive Streak streak */}
                  <div className="flex items-center gap-4 bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-200">
                      <HugeiconsIcon icon={FireIcon} size={22} strokeWidth={2} className="text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-orange-800">Dias de Ofensiva</div>
                      <div className="text-2xl font-extrabold text-orange-600">{profile?.ofensiva_atual ?? 0}</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Study Calendar Widget */}
              <div className="app-card-padded">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="app-section-title">Agenda de Estudos</h3>
                  <button className="text-primary hover:bg-blue-50 p-1.5 rounded-lg transition-colors">
                    <HugeiconsIcon icon={Calendar01Icon} size={20} strokeWidth={2} className="text-primary" />
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  {schedule.length === 0 ? (
                    <div className="text-xs text-on-surface-variant italic pl-2">Nenhum compromisso hoje.</div>
                  ) : (
                    schedule.map((item) => {
                      let borderColor = 'border-gray-300';
                      let textColor = 'text-gray-500';
                      if (item.type === 'live') {
                        borderColor = 'border-primary';
                        textColor = 'text-primary';
                      } else if (item.type === 'deadline') {
                        borderColor = 'border-orange-400';
                        textColor = 'text-orange-500';
                      } else if (item.type === 'mentorship') {
                        borderColor = 'border-purple-600';
                        textColor = 'text-purple-600';
                      }

                      return (
                        <div key={item.id} className={`border-l-2 ${borderColor} pl-4 py-1`}>
                          <div className={`text-xs font-bold ${textColor} mb-1 uppercase tracking-wide flex items-center gap-1.5`}>
                            {item.time}
                            {item.type === 'live' && (
                              <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-extrabold uppercase tracking-widest animate-pulse">Live</span>
                            )}
                          </div>
                          <div className="font-semibold text-on-surface text-sm">{item.title}</div>
                          <div className="text-xs text-on-surface-variant mt-1 truncate">
                            {item.cohort} • {item.duration}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Community activity feed */}
              <div className="app-card-padded">
                <h3 className="app-section-title mb-5">Comunidade</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      MR
                    </div>
                    <div>
                      <p className="text-sm text-on-surface">
                        <span className="font-bold">Maria R.</span> acabou de concluir o módulo{' '}
                        <span className="font-medium text-primary">Introdução ao Sistema</span>.
                      </p>
                      <span className="text-[10px] text-on-surface-variant">Há 2 horas</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-secondary font-bold text-xs shrink-0">
                      PL
                    </div>
                    <div>
                      <p className="text-sm text-on-surface">
                        <span className="font-bold">Pedro L.</span> alcançou a conquista{' '}
                        <span className="font-medium text-secondary">Estudioso</span>.
                      </p>
                      <span className="text-[10px] text-on-surface-variant">Há 5 horas</span>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 bg-surface-container text-on-surface font-semibold text-sm rounded-xl hover:bg-surface-container-high transition-colors">
                  Acessar Fórum
                </button>
              </div>

            </div>

          </div>

        </div>
      ) : view === 'module_trail' && selectedModulo ? (
        
        /* VIEW 4: MODULE ROADMAP & DETAILS VIEW */
        <div className="space-y-6 animate-fade-in pb-12">
          {/* Module Header Section */}
          <div className="app-page-header app-page-header-row flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView('dashboard')}
                className="app-icon-button bg-surface hover:bg-surface-container border border-outline-variant/30 rounded-xl"
                title="Voltar para o Dashboard"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
              </button>
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-label-sm font-semibold text-primary mb-2 uppercase tracking-wider font-mono">
                  Módulo
                </span>
                <h1 className="app-title">{selectedModulo.titulo}</h1>
                <p className="text-body-md text-on-surface-variant font-medium mt-1">
                  Acompanhe as lições e atividades deste módulo para avançar em sua jornada.
                </p>
              </div>
            </div>

            {/* Module Progress Card */}
            {(() => {
              const processed = processedModulos.find(m => m.id === selectedModulo.id);
              if (!processed) return null;
              const percentModulo = processed.total > 0 ? Math.round((processed.completed / processed.total) * 100) : 0;
              return (
                <div className="app-card-padded w-full md:w-auto md:min-w-[320px] shrink-0">
                  <div className="flex justify-between items-end mb-3">
                    <span className="font-semibold text-sm text-on-surface-variant uppercase tracking-wide">Progresso do Módulo</span>
                    <span className="text-2xl font-bold text-primary">{percentModulo}%</span>
                  </div>
                  <div className="h-3 bg-surface-container-low rounded-full overflow-hidden shadow-inner relative">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ 
                        width: `${percentModulo}%`,
                        background: 'linear-gradient(90deg, #712ae2 0%, #8a4cfc 100%)'
                      }}
                    >
                      <div className="shimmer-bg"></div>
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-semibold mt-2 text-right">
                    {processed.completed} de {processed.total} aulas concluídas
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Grid: Left roadmap and right stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Lesson roadmap (8 Columns) */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              
              {/* Highlight Banner: Resume/Start Module */}
              {(() => {
                const processed = processedModulos.find(m => m.id === selectedModulo.id);
                if (!processed) return null;
                
                const targetLesson = processed.nextLesson || (aulas.filter(a => a.modulo_id === selectedModulo.id)[0]);
                if (!targetLesson) return null;

                const isCompleted = isLessonCompleted(targetLesson.id);

                return (
                  <div 
                    onClick={() => {
                      setSelectedAula(targetLesson);
                      setView('lesson');
                    }}
                    className="app-card-padded hover-lift relative overflow-hidden group min-h-[160px] cursor-pointer"
                  >
                    <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-secondary/10 to-transparent z-0"></div>
                    <div className="relative z-20 flex flex-col h-full justify-between">
                      <div>
                        <span className="inline-block px-4 py-1.5 bg-white/60 text-secondary font-semibold text-xs rounded-full mb-4 backdrop-blur-md border border-white/50 uppercase tracking-wider">
                          {isCompleted ? 'Módulo Concluído!' : 'Continuar Módulo'}
                        </span>
                        <h3 className="app-title max-w-lg">
                          {isCompleted ? 'Todas as aulas concluídas!' : `Próxima Aula: Aula ${targetLesson.numero_aula} - ${targetLesson.titulo}`}
                        </h3>
                        <p className="text-on-surface-variant mt-2 max-w-md font-medium text-body-md">
                          {isCompleted 
                            ? 'Excelente! Você pode reassistir a qualquer aula da lista abaixo.' 
                            : targetLesson.tipo === 'quiz' 
                              ? 'Resolva o quiz para demonstrar seus conhecimentos.' 
                              : 'Continue estudando de onde parou para completar o módulo.'}
                        </p>
                      </div>
                      <div className="mt-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAula(targetLesson);
                            setView('lesson');
                          }}
                          className="app-primary-action"
                          style={{
                            background: 'linear-gradient(135deg, #712ae2 0%, #8a4cfc 100%)',
                            boxShadow: '0 4px 14px 0 rgba(113, 42, 226, 0.3)'
                          }}
                        >
                          <HugeiconsIcon icon={PlayCircleIcon} size={18} />
                          {isCompleted ? 'Reassistir Aula' : 'Estudar Agora'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* List of lessons */}
              <div className="space-y-4">
                <h2 className="app-section-title">Roteiro de Aulas</h2>
                  <div className="flex flex-col gap-3">
                  {(() => {
                    const processed = processedModulos.find(m => m.id === selectedModulo.id);
                    const moduloAulas = aulas.filter(a => a.modulo_id === selectedModulo.id);
                    if (moduloAulas.length === 0) {
                      return (
                        <div className="app-card-padded text-center text-on-surface-variant italic">
                          Nenhuma aula cadastrada neste módulo.
                        </div>
                      );
                    }

                    return moduloAulas.map((aula) => {
                      const completed = isLessonCompleted(aula.id);
                      const isLiberada = aulasLiberadas.includes(aula.id);
                      const unlocked = (processed?.status === 'CONCLUÍDO'
                        ? true
                        : processed?.status === 'BLOQUEADO'
                          ? false
                          : (completed || processed?.nextLesson?.id === aula.id)) && isLiberada;

                      let statusText = 'Bloqueado';
                      let statusColor = 'text-gray-400';
                      let statusBg = 'bg-surface border-transparent opacity-60 cursor-not-allowed';
                      
                      if (!isLiberada) {
                        statusText = 'Aguardando Liberação';
                        statusColor = 'text-amber-500 font-bold';
                      } else if (completed) {
                        statusText = 'Concluído';
                        statusColor = 'text-green-600 font-bold';
                        statusBg = 'bg-white hover:bg-emerald-50/10 border-green-200/60 shadow-sm hover:scale-[1.01] cursor-pointer';
                      } else if (unlocked) {
                        statusText = 'Disponível';
                        statusColor = 'text-primary font-bold';
                        statusBg = 'bg-white hover:bg-primary/5 hover:border-primary/20 border-outline-variant/30 shadow-sm hover:scale-[1.01] cursor-pointer';
                      }

                      const typesList: string[] = [];
                      if (aula.video_url) typesList.push('Vídeo');
                      if (aula.questoes && aula.questoes.length > 0 && !(aula.atividades && aula.atividades.some(a => a.tipo_entrega === 'quiz'))) typesList.push('Quiz');
                      if (aula.arquivo_url) typesList.push('Material');
                      if (aula.atividades && aula.atividades.length > 0) typesList.push('Atividade');
                      if (aula.conteudo && typesList.length === 0) typesList.push('Texto');
                      const typeLabel = typesList.join(' + ') || 'Teórica';

                      return (
                        <div
                          key={aula.id}
                          onClick={() => {
                            if (unlocked) {
                              setSelectedAula(aula);
                              setView('lesson');
                            }
                          }}
                          className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border transition-all ${statusBg}`}
                        >
                          <div className="flex items-start gap-4 min-w-0">
                            {/* Circle Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                              completed ? 'bg-green-50 text-green-600' : unlocked ? 'bg-blue-50 text-primary' : 'bg-surface-variant text-outline'
                            }`}>
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                {aula.video_url ? (
                                  <>
                                    <circle cx="12" cy="12" r="10" />
                                    <polygon points="10 8 16 12 10 16 10 8" />
                                  </>
                                ) : (aula.questoes && aula.questoes.length > 0) ? (
                                  <>
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                  </>
                                ) : aula.arquivo_url ? (
                                  <>
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                  </>
                                ) : (
                                  <>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                    <polyline points="10 9 9 9 8 9" />
                                  </>
                                )}
                              </svg>
                            </div>
                            
                            <div className="truncate">
                              <h4 className="font-heading font-extrabold text-body-md text-on-surface truncate">
                                Aula {aula.numero_aula}: {aula.titulo}
                              </h4>
                              <p className="text-label-sm text-on-surface-variant font-medium mt-1">
                                {typeLabel} {aula.duracao ? `• ${aula.duracao}` : ''} • {aula.pontos || 0} XP
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-3 md:mt-0 shrink-0 self-end md:self-center">
                            <span className={`text-[11px] font-bold uppercase tracking-wide ${statusColor}`}>
                              {statusText}
                            </span>
                            <div className={completed ? 'text-green-600' : unlocked ? 'text-primary' : 'text-outline-variant'}>
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                {completed && <polyline points="20 6 9 17 4 12" />}
                                {!completed && unlocked && <polygon points="5 3 19 12 5 21 5 3" className="fill-current" />}
                                {!completed && !unlocked && (
                                  <path d="M17 11V7a5 5 0 0 0-10 0v4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM9 11V7a3 3 0 0 1 6 0v4H9z" />
                                )}
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>

            {/* Right Column: Sidebar Widgets (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              {/* Stats Widget */}
              {(() => {
                const moduloAulas = aulas.filter(a => a.modulo_id === selectedModulo.id);
                const completedInModulo = moduloAulas.filter(a => isLessonCompleted(a.id)).length;
                
                // Calculate points in modulo
                const totalPoints = moduloAulas.reduce((acc, curr) => acc + (curr.pontos || 0), 0);
                const completedPoints = moduloAulas.filter(a => isLessonCompleted(a.id)).reduce((acc, curr) => acc + (curr.pontos || 0), 0);

                // Count practical activities in modulo
                let activitiesCount = 0;
                let completedActivities = 0;
                moduloAulas.forEach(a => {
                  if (a.atividades) {
                    activitiesCount += a.atividades.length;
                    completedActivities += a.atividades.filter(act => entregas.some(e => e.atividade_id === act.id)).length;
                  }
                });

                return (
                  <div className="app-card-padded">
                    <h3 className="app-section-title mb-6">Métricas do Módulo</h3>
                    <div className="flex flex-col gap-5">
                      
                      <div className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-secondary shrink-0 shadow-sm">
                          <HugeiconsIcon icon={BookOpen01Icon} size={22} strokeWidth={2} className="text-secondary" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-on-surface-variant">Conclusão de Aulas</div>
                          <div className="text-2xl font-extrabold text-on-surface">
                            {completedInModulo} <span className="text-sm text-on-surface-variant">de {moduloAulas.length}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-primary shrink-0 shadow-sm">
                          <HugeiconsIcon icon={Award01Icon} size={22} strokeWidth={2} className="text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-on-surface-variant">Pontos Acumulados</div>
                          <div className="text-2xl font-extrabold text-on-surface">
                            {completedPoints} <span className="text-sm text-on-surface-variant font-medium">de {totalPoints} XP</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl">
                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0 shadow-sm">
                          <HugeiconsIcon icon={TaskDone01Icon} size={22} strokeWidth={2} className="text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-on-surface-variant">Atividades Práticas</div>
                          <div className="text-2xl font-extrabold text-on-surface">
                            {completedActivities} <span className="text-sm text-on-surface-variant">de {activitiesCount}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* Study tips widget */}
              <div className="app-card-padded">
                <h3 className="app-section-title mb-4">Dicas de Estudo</h3>
                <ul className="space-y-3 text-label-md text-on-surface-variant">
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    <span>Dedique de 20 a 30 minutos diários para manter sua ofensiva.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    <span>Baixe os materiais de apoio para complementar os vídeos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    <span>Faça os exercícios práticos para fixar o conteúdo.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : view === 'achievements' ? (
        
        /* VIEW 3: DEDICATED ACHIEVEMENTS PANEL */
        <div className="space-y-8 animate-fade-in pb-12">
          {/* Section Header */}
          <div className="app-page-header app-page-header-row flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('dashboard')}
                className="app-icon-button"
                title="Voltar para a Trilha"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
              </button>
              <div>
                <h1 className="app-title flex items-center gap-2">
                  <HugeiconsIcon icon={Award01Icon} size={28} className="text-secondary animate-bounce" />
                  Central de Conquistas
                </h1>
                <p className="text-body-md text-on-surface-variant font-medium">Acompanhe seu progresso, medalhas conquistadas e ranking da turma.</p>
              </div>
            </div>
            
            {/* Back to Trail Action Button */}
            <button
              onClick={() => setView('dashboard')}
              className="app-secondary-action w-full md:w-auto"
            >
              <HugeiconsIcon icon={MapsIcon} size={18} />
              Ver Trilha de Aprendizado
            </button>
          </div>

          {/* Stats Summary Grid (Duolingo Style) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ofensiva Flame Card */}
            <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-sm">
              <div className="absolute right-4 bottom-2 text-orange-500/10 group-hover:scale-110 transition-transform duration-300">
                <HugeiconsIcon icon={FireIcon} size={96} strokeWidth={1} />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
                  <HugeiconsIcon icon={FireIcon} size={22} strokeWidth={2} />
                </div>
                <span className="font-heading font-extrabold text-label-md text-orange-700 dark:text-orange-300 uppercase tracking-wider">Ofensiva</span>
              </div>
              <div className="text-5xl font-heading font-black text-orange-600 dark:text-orange-400">
                {profile?.ofensiva_atual || 0} <span className="text-body-lg font-bold">dias</span>
              </div>
              <p className="text-sm text-orange-700/80 dark:text-orange-400/80 font-semibold mt-2">
                Seu recorde histórico é de <strong className="text-orange-600">{profile?.maior_ofensiva || 0}</strong> dias seguidos.
              </p>
            </div>

            {/* XP Total Card */}
            <div className="bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-sm">
              <div className="absolute right-4 bottom-2 text-purple-500/10 group-hover:scale-110 transition-transform duration-300">
                <HugeiconsIcon icon={Rocket01Icon} size={96} strokeWidth={1} />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-sm">
                  <HugeiconsIcon icon={Rocket01Icon} size={22} strokeWidth={2} />
                </div>
                <span className="font-heading font-extrabold text-label-md text-purple-700 dark:text-purple-300 uppercase tracking-wider">Pontuação (XP)</span>
              </div>
              <div className="text-5xl font-heading font-black text-purple-600 dark:text-purple-400">
                {(completedAulasCount * 50) + ((profile?.maior_ofensiva || 0) * 20)} <span className="text-body-lg font-bold">XP</span>
              </div>
              <p className="text-sm text-purple-700/80 dark:text-purple-400/80 font-semibold mt-2">
                Você ganha 50 XP por aula e 20 XP por dia de ofensiva!
              </p>
            </div>

            {/* Aulas Assistidas Card */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-sm">
              <div className="absolute right-4 bottom-2 text-emerald-500/10 group-hover:scale-110 transition-transform duration-300">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={96} strokeWidth={1} />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} strokeWidth={2} />
                </div>
                <span className="font-heading font-extrabold text-label-md text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Aulas Concluídas</span>
              </div>
              <div className="text-5xl font-heading font-black text-emerald-600 dark:text-emerald-400">
                {completedAulasCount} <span className="text-body-lg font-bold">/ {totalAulasCount}</span>
              </div>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 font-semibold mt-2">
                Seu progresso total do curso está em <strong className="text-emerald-600">{percentComplete}%</strong>.
              </p>
            </div>
          </div>

          {/* Two Columns Grid: Quests & Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Daily Quests & Detailed Badges (8 columns) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Daily Quests Section */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-outline-variant/30">
                  <h3 className="font-heading font-extrabold text-body-lg text-on-surface flex items-center gap-2">
                    <HugeiconsIcon icon={Calendar01Icon} size={20} className="text-primary" />
                    Desafios Diários
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Atualiza Diariamente</span>
                </div>
                
                <div className="space-y-4">
                  {/* Quest 1 */}
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                      <HugeiconsIcon icon={Tick01Icon} size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-heading font-extrabold text-label-md text-on-surface">Consistência Diária</h4>
                        <span className="text-label-sm font-bold text-emerald-600">Concluído (+10 XP)</span>
                      </div>
                      <p className="text-sm text-on-surface-variant">Acesse a plataforma de ensino hoje.</p>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Quest 2 */}
                  {(() => {
                    const isCompleted = completedAulasCount > 0;
                    return (
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          isCompleted 
                            ? 'bg-emerald-100 text-emerald-600 border-emerald-200' 
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          <HugeiconsIcon icon={isCompleted ? Tick01Icon : PlayCircleIcon} size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-heading font-extrabold text-label-md text-on-surface">Foco no Aprendizado</h4>
                            <span className={`text-label-sm font-bold ${isCompleted ? 'text-emerald-600' : 'text-primary'}`}>
                              {isCompleted ? 'Concluído (+50 XP)' : '0 / 1 Aula (+50 XP)'}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant">Conclua pelo menos uma aula da sua trilha hoje.</p>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: isCompleted ? '100%' : '0%' }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quest 3 */}
                  {(() => {
                    const value = Math.min(completedAulasCount, 3);
                    const isCompleted = value >= 3;
                    const percent = Math.round((value / 3) * 100);
                    return (
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          isCompleted 
                            ? 'bg-emerald-100 text-emerald-600 border-emerald-200' 
                            : 'bg-indigo/10 text-indigo-500 border-indigo-200/50'
                        }`}>
                          <HugeiconsIcon icon={isCompleted ? Tick01Icon : NotebookIcon} size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-heading font-extrabold text-label-md text-on-surface">Dedicação Total</h4>
                            <span className={`text-label-sm font-bold ${isCompleted ? 'text-emerald-600' : 'text-on-surface-variant'}`}>
                              {isCompleted ? 'Concluído (+150 XP)' : `${value} / 3 Aulas (+150 XP)`}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant">Conclua 3 aulas para um grande impulso no ranking semanal.</p>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Medalhas & Conquistas Grid */}
              <div className="space-y-4">
                <h3 className="font-heading font-extrabold text-body-lg text-on-surface flex items-center gap-2">
                  <HugeiconsIcon icon={Award01Icon} size={20} className="text-secondary" />
                  Minhas Medalhas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {achievements.map((ach, idx) => {
                    // Calculate progress values for achievements
                    let currentVal = 0;
                    let targetVal = 1;
                    let unit = 'aulas';
                    
                    if (ach.id === 'pioneiro') {
                      currentVal = completedAulasCount;
                      targetVal = 1;
                    } else if (ach.id === 'autodidata') {
                      currentVal = completedAulasCount;
                      targetVal = 5;
                    } else if (ach.id === 'estudioso') {
                      currentVal = completedAulasCount;
                      targetVal = 10;
                    } else if (ach.id === 'mestre') {
                      currentVal = percentComplete;
                      targetVal = 100;
                      unit = '%';
                    } else if (ach.id === 'fogo3') {
                      currentVal = profile?.maior_ofensiva || 0;
                      targetVal = 3;
                      unit = 'dias';
                    } else if (ach.id === 'fogo7') {
                      currentVal = profile?.maior_ofensiva || 0;
                      targetVal = 7;
                      unit = 'dias';
                    } else if (ach.id === 'maratonista') {
                      currentVal = profile?.maior_ofensiva || 0;
                      targetVal = 15;
                      unit = 'dias';
                    } else if (ach.id === 'imparavel') {
                      currentVal = profile?.maior_ofensiva || 0;
                      targetVal = 30;
                      unit = 'dias';
                    } else if (ach.id === 'explorador') {
                      currentVal = entregas.length;
                      targetVal = 1;
                      unit = 'atividades';
                    } else if (ach.id === 'top_scholar') {
                      currentVal = entregas.length;
                      targetVal = 3;
                      unit = 'atividades';
                    }

                    const percent = Math.min(Math.round((currentVal / targetVal) * 100), 100);

                    return (
                      <div
                        key={idx}
                        className={`relative p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md hover:-translate-y-1 group ${
                          !ach.unlocked
                            ? 'grayscale bg-slate-50/50 border-slate-200 text-slate-400'
                            : 'bg-gradient-to-br from-surface-container-lowest to-surface-container-low/40 border-outline-variant/30 text-on-surface'
                        }`}
                      >
                        {/* Top Row: Icon and Status */}
                        <div className="flex items-start justify-between gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-105 ${
                            !ach.unlocked
                              ? 'bg-slate-200 border-slate-300 text-slate-400'
                              : `${ach.bgClass} border-transparent ${ach.iconClass} shadow-sm`
                          }`}>
                            <HugeiconsIcon icon={ach.icon as any} size={28} strokeWidth={2} />
                          </div>
                          
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            ach.unlocked 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/40' 
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {ach.unlocked ? 'Conquistada' : 'Bloqueada'}
                          </span>
                        </div>

                        {/* Middle Row: Text info */}
                        <div className="space-y-1 text-left">
                          <h4 className="font-heading font-black text-body-lg text-on-surface">
                            {ach.title}
                          </h4>
                          <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                            {ach.unlocked ? ach.desc : 'Bloqueada'}
                          </p>
                        </div>

                        {/* Bottom Row: Dynamic Progress bar */}
                        <div className="space-y-1.5 pt-3 border-t border-slate-100/85">
                          <div className="flex justify-between text-[11px] font-extrabold text-on-surface-variant">
                            <span>Progresso</span>
                            <span>{currentVal} / {targetVal} {unit}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                ach.unlocked 
                                  ? 'bg-gradient-to-r from-secondary to-secondary-container' 
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column: Leaderboard/Liga (4 columns) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Class Ranking Card */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="text-center space-y-1">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${ligaUsuario.cor} text-white flex items-center justify-center mx-auto shadow-md ${ligaUsuario.shadow}`}>
                    <HugeiconsIcon icon={ligaUsuario.icon} size={24} strokeWidth={2} />
                  </div>
                  <h3 className="font-heading font-black text-body-lg text-on-surface mt-3">{ligaUsuario.nome}</h3>
                  <p className="text-label-sm text-on-surface-variant">Classificação Semanal da Turma</p>
                </div>

                {/* League Progression Map */}
                <div className="flex items-center justify-between px-2 pt-3 pb-1 text-[11px] font-bold text-on-surface-variant border-t border-slate-100/80">
                  {['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'].map((ligaNome, lIdx) => {
                    const lName = 'Liga ' + ligaNome;
                    const isCurrent = ligaUsuario.nome === lName;
                    const isPassed = 
                      (ligaUsuario.nome === 'Liga Bronze' && lIdx === 0) ||
                      (ligaUsuario.nome === 'Liga Prata' && lIdx <= 1) ||
                      (ligaUsuario.nome === 'Liga Ouro' && lIdx <= 2) ||
                      (ligaUsuario.nome === 'Liga Platina' && lIdx <= 3) ||
                      (ligaUsuario.nome === 'Liga Diamante' && lIdx <= 4);

                    return (
                      <div key={lIdx} className="flex flex-col items-center gap-1 flex-1 relative z-10">
                        {/* Line between steps */}
                        {lIdx > 0 && (
                          <div className={`absolute right-1/2 top-[7px] -translate-y-1/2 w-full h-[3px] -z-10 ${
                            isPassed ? 'bg-primary' : 'bg-slate-200'
                          }`} />
                        )}
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          isCurrent 
                            ? 'bg-white border-primary ring-2 ring-primary/30 scale-125' 
                            : isPassed 
                              ? 'bg-primary border-primary' 
                              : 'bg-white border-slate-300'
                        }`} />
                        <span className={`text-[9px] tracking-tight ${isCurrent ? 'text-primary font-black scale-105' : 'text-slate-400 font-medium'}`}>
                          {ligaNome}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Leaderboard list */}
                <div className="space-y-2.5">
                  {leaderboard.map((user, index) => {
                    const position = index + 1;
                    let posBadge: React.ReactNode = '';
                    
                    if (position === 1) posBadge = <HugeiconsIcon icon={Medal01Icon} size={20} className="text-yellow-500 mx-auto" />;
                    else if (position === 2) posBadge = <HugeiconsIcon icon={Medal02Icon} size={20} className="text-slate-400 mx-auto" />;
                    else if (position === 3) posBadge = <HugeiconsIcon icon={Medal03Icon} size={20} className="text-amber-600 mx-auto" />;
                    else posBadge = `#${position}`;

                    return (
                      <div 
                        key={user.id || index} 
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          user.isSelf 
                            ? 'bg-primary/5 border-primary/30 shadow-inner' 
                            : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center font-heading font-black text-body-md text-on-surface-variant flex items-center justify-center">
                            {posBadge}
                          </span>
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" 
                          />
                          <div className="text-left">
                            <p className={`text-label-md text-on-surface ${user.isSelf ? 'font-bold text-primary' : 'font-medium'}`}>
                              {user.name} {user.isSelf && '(Você)'}
                            </p>
                            <p className="text-[10px] text-on-surface-variant/80 font-bold uppercase tracking-wider">
                              {position <= 3 ? 'Zona de Promoção' : 'Estável'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-heading font-extrabold text-label-md text-on-surface shrink-0">
                          {user.xp} <span className="text-[10px] text-on-surface-variant font-medium">XP</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanatory footer */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-[11px] text-on-surface-variant/90 leading-relaxed font-sans font-medium flex items-center justify-center gap-2">
                  <HugeiconsIcon icon={FireIcon} size={14} className="text-orange-500 shrink-0" strokeWidth={2.5} />
                  <span>
                    <strong>Fique no Top 3</strong> para subir de Liga no fim de semana e ganhar medalhas e conquistas exclusivas!
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        
        /* VIEW 2: DETAILED LESSON INTERACTIVE VIEWER */
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Action: Back to Dashboard & Sidebar Toggle */}
          <div className="app-page-header app-page-header-row">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setView(selectedModulo ? 'module_trail' : 'dashboard')}
                className="app-secondary-action"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                Voltar para a Trilha
              </button>
              
              <button
                onClick={() => setLessonSidebarOpen(prev => !prev)}
                className="app-secondary-action hidden lg:inline-flex items-center gap-2"
                title={lessonSidebarOpen ? "Ocultar Grade do Curso" : "Mostrar Grade do Curso"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
                {lessonSidebarOpen ? 'Ocultar Grade' : 'Mostrar Grade'}
              </button>
            </div>
            
            <div className="text-label-sm text-on-surface-variant font-bold">
              Curso: {curso.titulo}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Sidebar Timeline navigation inside Lesson View (4 Columns) */}
            {lessonSidebarOpen && (
              <div className="lg:col-span-4 app-card-padded space-y-4 h-[650px] flex flex-col">
                <h3 className="app-section-title pb-3 border-b border-outline-variant/30 flex items-center gap-2">
                  <HugeiconsIcon icon={BookOpen01Icon} size={20} className="text-primary" />
                  Conteúdo do Curso
                </h3>

                <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin">
                  {processedModulos.map((modulo, mIdx) => {
                    const moduloAulas = aulas.filter(a => a.modulo_id === modulo.id);

                    return (
                      <div key={modulo.id} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary flex items-center justify-center shrink-0 font-mono">
                            {mIdx + 1}
                          </span>
                          <h4 className="font-heading font-bold text-body-md text-on-surface truncate" title={modulo.titulo}>
                            {modulo.titulo}
                          </h4>
                        </div>

                        <div className="pl-3 border-l border-outline-variant/40 ml-3.5 space-y-1">
                          {moduloAulas.map((aula) => {
                            const isCompleted = isLessonCompleted(aula.id);
                            const isSelected = selectedAula?.id === aula.id;

                            let icon = NotebookIcon;
                            if (aula.video_url) icon = PlayCircleIcon;
                            else if (aula.questoes && aula.questoes.length > 0) icon = Quiz01Icon;
                            else if (aula.arquivo_url) icon = BookOpen01Icon;

                            return (
                              <div key={aula.id} className="space-y-1">
                                <button
                                  onClick={() => {
                                    setSelectedAula(aula);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all border ${
                                    isSelected
                                      ? 'bg-primary/5 text-primary border-primary/30 font-semibold shadow-sm'
                                      : 'text-on-surface-variant hover:text-on-surface bg-transparent border-transparent hover:bg-surface-container-low/50'
                                  }`}
                                >
                                  <div className="shrink-0">
                                    <HugeiconsIcon icon={icon} size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-label-md truncate leading-tight">
                                      {aula.numero_aula}. {aula.titulo}
                                    </p>
                                  </div>
                                  {isCompleted && (
                                    <div className="shrink-0 text-emerald-600">
                                      <HugeiconsIcon icon={Tick01Icon} size={12} strokeWidth={3} />
                                    </div>
                                  )}
                                </button>

                                {aula.atividades && aula.atividades.map((act, actIdx) => {
                                  const entrega = entregas.find(e => e.atividade_id === act.id);
                                  return (
                                    <div key={act.id} className="ml-6 pl-2.5 border-l border-outline-variant/30 flex items-center justify-between text-[11px] py-1 text-on-surface-variant/80">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} className="text-secondary shrink-0" />
                                        <span className="truncate">Ativ. {actIdx + 1}: {act.tipo_entrega}</span>
                                      </div>
                                      
                                      <span className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded border shrink-0 uppercase mr-1 ${
                                        entrega?.nota !== null && entrega?.nota !== undefined
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : entrega
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : 'bg-slate-100 text-slate-500 border-slate-200'
                                      }`}>
                                        {entrega?.nota !== null && entrega?.nota !== undefined
                                          ? `Nota: ${entrega.nota}`
                                          : entrega
                                          ? 'Entregue'
                                          : 'Pendente'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lesson Body/Workspace (8 Columns or 12 Columns) */}
            <div className={`${lessonSidebarOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6 transition-all duration-300`}>
              {selectedAula && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Lesson header card */}
                  <div className="app-card-padded space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-bold text-on-surface-variant uppercase font-mono tracking-wider bg-surface px-2 py-0.5 rounded border border-outline-variant/30">
                            Aula {selectedAula.numero_aula}
                          </span>
                          {selectedAula.video_url && (
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                              Vídeo
                            </span>
                          )}
                          {selectedAula.questoes && selectedAula.questoes.length > 0 && (
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                              Quiz
                            </span>
                          )}
                          {selectedAula.arquivo_url && (
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                              Material
                            </span>
                          )}
                          {!selectedAula.video_url && (!selectedAula.questoes || selectedAula.questoes.length === 0) && !selectedAula.arquivo_url && (
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                              Leitura
                            </span>
                          )}
                        </div>
                        <h3 className="app-title">
                          {selectedAula.titulo}
                        </h3>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-3">
                          {isLessonCompleted(selectedAula.id) ? (
                            <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-label-sm font-bold px-3 py-1.5 rounded-lg shadow-sm">
                              <HugeiconsIcon icon={Tick01Icon} size={14} strokeWidth={3} />
                              Concluída
                            </span>
                          ) : (
                            <span className="text-label-sm font-semibold text-on-surface-variant bg-surface px-3 py-1.5 rounded-lg border border-outline-variant/40">
                              Não Concluída
                            </span>
                          )}
                        </div>
                        {isLessonCompleted(selectedAula.id) && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400 font-semibold mr-1">Sua avaliação:</span>
                            {(() => {
                              const rating = getLessonRating(selectedAula.id);
                              if (rating) {
                                return (
                                  <div className="flex gap-0.5 cursor-pointer" onClick={() => handleOpenRating(selectedAula.id, rating)}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <svg key={star} className={`w-3.5 h-3.5 ${star <= rating ? 'text-amber-500 fill-current' : 'text-slate-300'}`} viewBox="0 0 24 24">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                      </svg>
                                    ))}
                                  </div>
                                );
                              }
                              return (
                                <button
                                  onClick={() => handleOpenRating(selectedAula.id, 0)}
                                  className="text-[11px] text-primary font-bold hover:underline"
                                >
                                  Avaliar Aula
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-label-sm text-on-surface-variant">
                      {selectedAula.duracao && (
                        <div className="bg-surface p-3 rounded-lg border border-outline-variant/30">
                          <p className="opacity-75 text-[11px]">Duração</p>
                          <p className="font-bold text-on-surface font-mono">{selectedAula.duracao}</p>
                        </div>
                      )}
                      {selectedAula.questoes && selectedAula.questoes.length > 0 && (
                        <>
                          <div className="bg-surface p-3 rounded-lg border border-outline-variant/30">
                            <p className="opacity-75 text-[11px]">Pontos</p>
                            <p className="font-bold text-on-surface font-mono">{selectedAula.pontos} pts</p>
                          </div>
                          <div className="bg-surface p-3 rounded-lg border border-outline-variant/30">
                            <p className="opacity-75 text-[11px]">Mínimo para Aprovação</p>
                            <p className="font-bold text-on-surface font-mono">{selectedAula.nota_aprovacao}%</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Tabs Navigation */}
                    {aulasLiberadas.includes(selectedAula.id) && (
                      <div className="bg-surface-container border border-outline-variant/60 p-1.5 rounded-2xl flex flex-wrap sm:flex-nowrap gap-1.5 mt-6 shadow-sm">
                        <button
                          onClick={() => setActiveLessonTab('conteudo')}
                          className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 font-heading text-label-md font-extrabold rounded-xl transition-all duration-200 ${
                            activeLessonTab === 'conteudo'
                              ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                              : 'text-on-surface hover:text-primary hover:bg-surface-container-high/60'
                          }`}
                        >
                          <HugeiconsIcon icon={NotebookIcon} size={18} strokeWidth={2.5} />
                          <span>Conteúdo</span>
                        </button>

                        {selectedAula.arquivo_url && (
                          <button
                            onClick={() => setActiveLessonTab('arquivos')}
                            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 font-heading text-label-md font-extrabold rounded-xl transition-all duration-200 ${
                              activeLessonTab === 'arquivos'
                                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                                : 'text-on-surface hover:text-primary hover:bg-surface-container-high/60'
                            }`}
                          >
                            <HugeiconsIcon icon={BookOpen01Icon} size={18} strokeWidth={2.5} />
                            <span>Materiais</span>
                          </button>
                        )}

                        {selectedAula.questoes && selectedAula.questoes.length > 0 && !(selectedAula.atividades && selectedAula.atividades.some(a => a.tipo_entrega === 'quiz')) && (
                          <button
                            onClick={() => setActiveLessonTab('quiz')}
                            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 font-heading text-label-md font-extrabold rounded-xl transition-all duration-200 relative ${
                              activeLessonTab === 'quiz'
                                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                                : 'text-on-surface hover:text-primary hover:bg-surface-container-high/60'
                            }`}
                          >
                            <HugeiconsIcon icon={Quiz01Icon} size={18} strokeWidth={2.5} />
                            <span>Quiz</span>
                            {!isLessonCompleted(selectedAula.id) ? (
                              <span className="flex h-2.5 w-2.5 rounded-full bg-secondary animate-pulse" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                            )}
                          </button>
                        )}

                        {selectedAula.atividades && selectedAula.atividades.length > 0 && (
                          <button
                            onClick={() => setActiveLessonTab('atividade')}
                            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 font-heading text-label-md font-extrabold rounded-xl transition-all duration-200 relative ${
                              activeLessonTab === 'atividade'
                                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                                : 'text-on-surface hover:text-primary hover:bg-surface-container-high/60'
                            }`}
                          >
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2.5} />
                            <span>Atividade Prática</span>
                            {(() => {
                              const allActs = selectedAula.atividades || [];
                              const entregasForAula = entregas.filter(e => allActs.some(a => a.id === e.atividade_id));
                              
                              if (entregasForAula.length === 0) {
                                return <span className="flex h-2.5 w-2.5 rounded-full bg-secondary animate-pulse" />;
                              }
                              if (entregasForAula.length < allActs.length) {
                                return <span className="flex h-2.5 w-2.5 rounded-full bg-secondary animate-pulse" />;
                              }
                              const allGraded = entregasForAula.every(e => e.nota !== null);
                              if (allGraded) {
                                return <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />;
                              }
                              return <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />;
                            })()}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Main media & theoretical content */}
                  {!aulasLiberadas.includes(selectedAula.id) ? (
                    <div className="app-card-padded text-center space-y-6 flex flex-col items-center justify-center animate-fade-in">
                      <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-500 rounded-full flex items-center justify-center shadow-inner">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <div className="max-w-md space-y-2">
                        <h4 className="app-section-title">Conteúdo Bloqueado</h4>
                        <p className="text-body-md text-on-surface-variant font-medium">
                          Esta aula foi cadastrada pelo professor, mas ainda não está liberada para acesso dos alunos. Aguarde a liberação.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAula(null);
                          setView(selectedModulo ? 'module_trail' : 'dashboard');
                        }}
                        className="px-6 py-2.5 bg-surface border border-outline-variant/40 hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface font-semibold text-label-md rounded-xl transition-all flex items-center gap-2"
                      >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                        Voltar para a Trilha
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Tab 1: Conteúdo (Vídeo + Conteúdo Teórico) */}
                      {activeLessonTab === 'conteudo' && (() => {
                        const parsed = parseLessonConteudo(selectedAula.conteudo || '', selectedAula.tipo);
                        return (
                          <div className="app-card-padded space-y-6 animate-fade-in">
                            {/* Video player */}
                            {selectedAula.video_url && (
                              <div className="space-y-4">
                                {getYoutubeEmbedUrl(selectedAula.video_url) ? (
                                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-outline-variant/50 shadow-inner">
                                    <iframe
                                      src={getYoutubeEmbedUrl(selectedAula.video_url)!}
                                      title={selectedAula.titulo}
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      className="w-full h-full"
                                    />
                                  </div>
                                ) : (
                                  <div className="bg-slate-900 aspect-video w-full rounded-xl overflow-hidden border border-outline-variant/50 relative flex items-center justify-center group shadow-md">
                                    <video
                                      src={selectedAula.video_url}
                                      controls
                                      className="w-full h-full max-h-[450px]"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Description / Objectives block */}
                            {parsed.descricao && (
                              <div className="bg-surface-container-low/80 border border-outline-variant/30 rounded-xl p-4.5 space-y-1.5 shadow-sm">
                                <p className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                  <HugeiconsIcon icon={BookOpen01Icon} size={14} className="text-primary" />
                                  Descrição & Objetivos da Aula
                                </p>
                                <p className="text-body-md text-on-surface-variant font-medium leading-relaxed whitespace-pre-wrap">
                                  {parsed.descricao}
                                </p>
                              </div>
                            )}

                            {/* Theoretical Content */}
                            {(parsed.conteudo || selectedAula.tipo === 'texto') && (
                              <div className="space-y-4">
                                <h4 className="font-heading font-extrabold text-body-lg text-on-surface flex items-center gap-2">
                                  <HugeiconsIcon icon={NotebookIcon} size={18} className="text-primary" />
                                  Material de Apoio
                                </h4>
                                <div className="prose prose-slate max-w-none text-body-md text-on-surface-variant leading-relaxed font-sans space-y-4">
                                  {parsed.conteudo ? (
                                    parsed.conteudo.split('\n').map((para, pIdx) => {
                                      const trimmed = para.trim();
                                      if (!trimmed) return null;

                                      if (trimmed.startsWith('###')) {
                                        return <h5 key={pIdx} className="font-heading font-extrabold text-body-lg text-on-surface pt-4">{renderFormattedText(trimmed.replace('###', '').trim())}</h5>;
                                      }
                                      if (trimmed.startsWith('##')) {
                                        return <h4 key={pIdx} className="app-section-title pt-6 pb-2 border-b border-outline-variant/20">{renderFormattedText(trimmed.replace('##', '').trim())}</h4>;
                                      }
                                      if (trimmed.startsWith('-') || (trimmed.startsWith('*') && !trimmed.startsWith('**'))) {
                                        return (
                                          <ul key={pIdx} className="list-disc pl-6 space-y-1 my-2">
                                            <li className="text-body-md">{renderFormattedText(trimmed.substring(1).trim())}</li>
                                          </ul>
                                        );
                                      }
                                      return <p key={pIdx} className="my-3 leading-relaxed text-justify">{renderFormattedText(trimmed)}</p>;
                                    })
                                  ) : (
                                    <p className="italic text-on-surface-variant/70">Nenhum conteúdo complementar para esta aula.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Tab 2: Materiais — PDF inline viewer ou download */}
                      {activeLessonTab === 'arquivos' && selectedAula.arquivo_url && (() => {
                        const embedInfo = getArquivoEmbedInfo(selectedAula.arquivo_url);

                        if (embedInfo) {
                          // ─── PDF / Google Drive: mostra viewer inline ───
                          return (
                            <div className="app-card-padded space-y-4 animate-fade-in">
                              {/* Header do viewer */}
                              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0">
                                    {/* PDF icon */}
                                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                      <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="font-heading font-extrabold text-body-md text-on-surface">Material da Aula</p>
                                    <p className="text-[11px] text-on-surface-variant font-medium">
                                      {embedInfo.type === 'gdrive' ? 'Documento do Google Drive' : 'Arquivo PDF'}
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href={selectedAula.arquivo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3.5 py-2 text-label-sm font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
                                >
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                  </svg>
                                  Abrir em nova aba
                                </a>
                              </div>

                              {/* iFrame viewer */}
                              <div className="relative w-full rounded-xl overflow-hidden border border-outline-variant/40 shadow-inner bg-slate-100" style={{ height: '640px' }}>
                                <iframe
                                  src={embedInfo.embedUrl}
                                  title={`Material: ${selectedAula.titulo}`}
                                  className="w-full h-full"
                                  frameBorder="0"
                                  allowFullScreen
                                  loading="lazy"
                                />
                                {/* Subtle loading overlay hint */}
                                <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-outline-variant/20" />
                              </div>

                              {/* Footer hint */}
                              {embedInfo.type === 'gdrive' && (
                                <p className="text-[11px] text-on-surface-variant/70 text-center font-medium">
                                  <span className="flex items-center justify-center gap-1.5">
                                    <HugeiconsIcon icon={InformationCircleIcon} size={14} strokeWidth={2} />
                                    Se o documento não carregar, verifique se o arquivo está com acesso público no Google Drive.
                                  </span>
                                </p>
                              )}
                            </div>
                          );
                        }

                        // ─── Outros formatos: botão de download ───
                        return (
                          <div className="app-card-padded space-y-6 animate-fade-in">
                            <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-inner">
                              <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto shadow-sm">
                                <HugeiconsIcon icon={BookOpen01Icon} size={32} />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-heading font-extrabold text-body-lg text-on-surface">Material Didático</h4>
                                <p className="text-on-surface-variant text-label-md">
                                  Esta aula contém um arquivo adicional. Clique para baixar ou acessar o material.
                                </p>
                              </div>
                              <a
                                href={selectedAula.arquivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold font-heading rounded-lg shadow hover:bg-primary-container transition-all"
                              >
                                Acessar / Baixar Arquivo
                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                              </a>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Tab 3: Quiz */}
                      {activeLessonTab === 'quiz' && selectedAula.questoes && selectedAula.questoes.length > 0 && (
                        <div className="app-card-padded space-y-6 animate-fade-in">
                          <h4 className="font-heading font-extrabold text-body-lg text-on-surface pb-2 border-b border-outline-variant/20 flex items-center gap-2">
                            <HugeiconsIcon icon={Quiz01Icon} size={18} className="text-secondary" />
                            Questões do Quiz
                          </h4>

                          {selectedAula.questoes.map((q, idx) => (
                            <div key={q.id} className="space-y-3 p-4 bg-surface rounded-xl border border-outline-variant/45">
                              <p className="font-semibold text-on-surface text-body-md flex items-start gap-2">
                                <span className="text-secondary font-bold font-mono">Q{idx + 1}.</span>
                                <span>
                                  {q.enunciado}
                                  {q.tipo === 'verdadeiro_falso' && (
                                    <span className="ml-2 text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">V / F</span>
                                  )}
                                  {q.tipo === 'aberta' && (
                                    <span className="ml-2 text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">Prática Aberta</span>
                                  )}
                                  {q.tipo === 'multipla_selecao' && (
                                    <span className="ml-2 text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">Múltiplas Respostas</span>
                                  )}
                                </span>
                              </p>

                              {/* Options list: Múltipla Seleção */}
                              {q.tipo === 'multipla_selecao' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                  {q.opcoes.map((opcao, optIdx) => {
                                    const selectedAnswers = quizAnswers[q.id] ? quizAnswers[q.id].split(';').map(o => o.trim()) : [];
                                    const isSelected = selectedAnswers.includes(opcao);
                                    
                                    const correctOptions = q.resposta_correta ? q.resposta_correta.split(';').map(o => o.trim()) : [];
                                    const isCorrect = correctOptions.includes(opcao);
                                    
                                    let optionStyle = 'bg-surface-container-lowest border-outline-variant/50 hover:bg-surface-container-low/50';

                                    if (quizSubmitted) {
                                      if (isSelected && isCorrect) {
                                        optionStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm';
                                      } else if (isSelected && !isCorrect) {
                                        optionStyle = 'bg-error-container/20 border-error/40 text-error';
                                      } else if (isCorrect) {
                                        optionStyle = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                                      } else {
                                        optionStyle = 'bg-surface-container-lowest border-outline-variant/20 opacity-60';
                                      }
                                    } else if (isSelected) {
                                      optionStyle = 'bg-secondary/5 border-secondary text-secondary font-medium shadow-sm';
                                    }

                                    return (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        disabled={quizSubmitted}
                                        onClick={() => handleToggleAnswerMulti(q.id, opcao)}
                                        className={`w-full text-left p-3.5 rounded-lg border text-label-md transition-all flex items-start gap-2.5 ${optionStyle}`}
                                      >
                                        <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center mt-0.5 ${
                                          isSelected
                                            ? 'bg-secondary border-secondary text-white'
                                            : 'border-slate-300'
                                        }`}>
                                          {isSelected && (
                                            <HugeiconsIcon icon={Tick01Icon} size={10} strokeWidth={3} className="text-white" />
                                          )}
                                        </div>
                                        <span>{opcao}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Options list: Múltipla Escolha */}
                              {(!q.tipo || q.tipo === 'multipla_escolha') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                  {q.opcoes.map((opcao, optIdx) => {
                                    const isSelected = quizAnswers[q.id] === opcao;
                                    const isCorrect = q.resposta_correta === opcao;
                                    let optionStyle = 'bg-surface-container-lowest border-outline-variant/50 hover:bg-surface-container-low/50';

                                    if (quizSubmitted) {
                                      if (isSelected && isCorrect) {
                                        optionStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm';
                                      } else if (isSelected && !isCorrect) {
                                        optionStyle = 'bg-error-container/20 border-error/40 text-error';
                                      } else if (isCorrect) {
                                        optionStyle = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                                      } else {
                                        optionStyle = 'bg-surface-container-lowest border-outline-variant/20 opacity-60';
                                      }
                                    } else if (isSelected) {
                                      optionStyle = 'bg-secondary/5 border-secondary text-secondary font-medium shadow-sm';
                                    }

                                    return (
                                      <button
                                        key={optIdx}
                                        disabled={quizSubmitted}
                                        onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opcao }))}
                                        className={`w-full text-left p-3.5 rounded-lg border text-label-md transition-all flex items-start gap-2 ${optionStyle}`}
                                      >
                                        <span className="font-bold font-mono text-outline-variant shrink-0">
                                          {String.fromCharCode(65 + optIdx)})
                                        </span>
                                        <span>{opcao}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Options list: Verdadeiro ou Falso */}
                              {q.tipo === 'verdadeiro_falso' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                  {['Verdadeiro', 'Falso'].map((opcao, optIdx) => {
                                    const isSelected = quizAnswers[q.id] === opcao;
                                    const isCorrect = q.resposta_correta === opcao;
                                    let optionStyle = 'bg-surface-container-lowest border-outline-variant/50 hover:bg-surface-container-low/50';

                                    if (quizSubmitted) {
                                      if (isSelected && isCorrect) {
                                        optionStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm';
                                      } else if (isSelected && !isCorrect) {
                                        optionStyle = 'bg-error-container/20 border-error/40 text-error';
                                      } else if (isCorrect) {
                                        optionStyle = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                                      } else {
                                        optionStyle = 'bg-surface-container-lowest border-outline-variant/20 opacity-60';
                                      }
                                    } else if (isSelected) {
                                      optionStyle = 'bg-secondary/5 border-secondary text-secondary font-medium shadow-sm';
                                    }

                                    return (
                                      <button
                                        key={optIdx}
                                        disabled={quizSubmitted}
                                        onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opcao }))}
                                        className={`w-full text-center p-3.5 rounded-lg border text-label-md font-bold transition-all flex items-center justify-center gap-2 ${optionStyle}`}
                                      >
                                        <span className={`w-2 h-2 rounded-full ${opcao === 'Verdadeiro' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <span>{opcao}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Options list: Questão Aberta */}
                              {q.tipo === 'aberta' && (
                                <div className="pl-6 space-y-3">
                                  <textarea
                                    rows={3}
                                    disabled={quizSubmitted}
                                    value={quizAnswers[q.id] || ''}
                                    onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    placeholder="Digite a sua resposta prática/teórica para validação..."
                                    className="w-full px-4 py-3 rounded-xl border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all text-body-md bg-white disabled:bg-slate-50 disabled:text-slate-500"
                                  />
                                  
                                  {quizSubmitted && (() => {
                                    const isCorrect = isQuestionCorrect(q, quizAnswers[q.id] || '');
                                    const gabaritoSugerido = q.opcoes[0] || '';
                                    
                                    return (
                                      <div className="space-y-3 animate-fade-in pt-1">
                                        <div className={`flex items-center gap-2 text-label-md font-bold ${isCorrect ? 'text-emerald-700' : 'text-amber-800'}`}>
                                          <HugeiconsIcon icon={isCorrect ? Tick01Icon : Alert01Icon} size={16} />
                                          <span>{isCorrect ? 'Resposta Aceita' : 'Resposta Parcial / Gabarito Sugerido'}</span>
                                        </div>
                                        
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-left">
                                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Gabarito Sugerido pelo Professor:</p>
                                          <p className="text-label-sm leading-relaxed text-on-surface font-medium italic">
                                            {gabaritoSugerido}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}

                          {!quizSubmitted ? (
                            <div className="flex justify-end pt-2">
                              <button
                                onClick={handleSubmitQuiz}
                                disabled={selectedAula.questoes.some(q => !quizAnswers[q.id] || !quizAnswers[q.id].trim())}
                                className={`px-6 py-3 rounded-lg font-heading font-bold text-body-md flex items-center gap-2 transition-all ${
                                  !selectedAula.questoes.some(q => !quizAnswers[q.id] || !quizAnswers[q.id].trim())
                                    ? 'bg-gradient-to-r from-secondary to-secondary-container text-on-secondary shadow shadow-secondary/15 hover:shadow-md hover:shadow-secondary/20 hover:-translate-y-0.5'
                                    : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed border border-outline-variant/40'
                                }`}
                              >
                                Enviar Respostas
                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="p-6 rounded-xl border text-center space-y-4 shadow-sm bg-surface-container-lowest">
                              {quizScore === null ? (
                                <div className="space-y-2">
                                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                                    <HugeiconsIcon icon={Tick01Icon} size={32} strokeWidth={3} />
                                  </div>
                                  <h4 className="app-section-title text-emerald-700">Questionário Respondido!</h4>
                                  <p className="text-on-surface-variant text-label-md">
                                    Suas respostas foram salvas com sucesso.
                                  </p>
                                  <p className="text-label-sm text-on-surface-variant/80">Esta aula foi concluída automaticamente.</p>
                                </div>
                              ) : quizPassed ? (
                                <div className="space-y-2">
                                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                                    <HugeiconsIcon icon={Tick01Icon} size={32} strokeWidth={3} />
                                  </div>
                                  <h4 className="app-section-title text-emerald-700">Parabéns! Você passou!</h4>
                                  <p className="text-on-surface-variant text-label-md">
                                    Seu aproveitamento: <span className="font-bold text-emerald-600 font-mono text-body-lg">{quizScore}%</span> (Nota mínima: {selectedAula.nota_aprovacao}%)
                                  </p>
                                  <p className="text-label-sm text-on-surface-variant/80">Esta aula foi automaticamente marcada como concluída.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="w-16 h-16 rounded-full bg-error-container/20 border border-error/20 flex items-center justify-center text-error mx-auto shadow-sm">
                                    <HugeiconsIcon icon={Alert01Icon} size={32} />
                                  </div>
                                  <h4 className="app-section-title text-error">Não foi dessa vez</h4>
                                  <p className="text-on-surface-variant text-label-md">
                                    Seu aproveitamento: <span className="font-bold text-error font-mono text-body-lg">{quizScore}%</span> (Nota mínima: {selectedAula.nota_aprovacao}%)
                                  </p>
                                  <p className="text-label-sm text-on-surface-variant/80">Revise o material teórico e tente novamente.</p>
                                  <button
                                    onClick={() => {
                                      setQuizAnswers({});
                                      setQuizSubmitted(false);
                                      setQuizScore(null);
                                      setQuizPassed(null);
                                    }}
                                    className="mt-3 px-5 py-2 bg-secondary text-on-secondary font-bold font-heading rounded-lg hover:bg-secondary-container transition-all"
                                  >
                                    Tentar Novamente
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab 4: Atividade Prática */}
                      {activeLessonTab === 'atividade' && selectedAula.atividades && selectedAula.atividades.length > 0 && (
                        <div className="app-card-padded space-y-5 animate-fade-in">
                          <h4 className="font-heading font-extrabold text-body-lg text-on-surface pb-3 border-b border-outline-variant/20 flex items-center gap-2">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-secondary" />
                            Atividade Prática
                          </h4>

                          {selectedAula.atividades.map((atividade) => {
                            // Find the exact delivery match
                            const exactEntrega = entregas.find(e => e.atividade_id === atividade.id);
                            const canRedo = exactEntrega && (atividade.permite_refazer !== false) && exactEntrega.nota === null;
                            const isRedoing = isRedoingActivity[atividade.id] || false;
                            
                            const isProprio = selectedAula.questoes?.some(q => q.atividade_id === atividade.id);
                            const activeQuestions = isProprio
                              ? (selectedAula.questoes?.filter(q => q.atividade_id === atividade.id) || [])
                              : (selectedAula.questoes?.filter(q => !q.atividade_id && !q.para_arena) || []);

                            return (
                              <div key={atividade.id} className="space-y-4">
                                <div className="p-4 bg-surface rounded-xl border border-outline-variant/40 space-y-2">
                                  <p className="text-[11px] font-bold text-on-surface-variant uppercase font-mono tracking-wider">Instruções</p>
                                  <div className="prose prose-slate max-w-none text-body-md text-on-surface leading-relaxed font-sans space-y-3">
                                    {atividade.enunciado ? (
                                      atividade.enunciado.split('\n').map((para, pIdx) => {
                                        const trimmed = para.trim();
                                        if (!trimmed) return <div key={pIdx} className="h-2" />;

                                        if (trimmed.startsWith('###')) {
                                          return <h5 key={pIdx} className="font-heading font-extrabold text-body-md text-on-surface pt-2">{renderFormattedText(trimmed.replace('###', '').trim())}</h5>;
                                        }
                                        if (trimmed.startsWith('##')) {
                                          return <h4 key={pIdx} className="font-heading font-extrabold text-body-lg text-on-surface pt-4 pb-1 border-b border-outline-variant/10">{renderFormattedText(trimmed.replace('##', '').trim())}</h4>;
                                        }
                                        if (trimmed.startsWith('-') || (trimmed.startsWith('*') && !trimmed.startsWith('**'))) {
                                          return (
                                            <ul key={pIdx} className="list-disc pl-5 space-y-1 my-1">
                                              <li className="text-body-md font-medium">{renderFormattedText(trimmed.substring(1).trim())}</li>
                                            </ul>
                                          );
                                        }
                                        return <p key={pIdx} className="my-2 leading-relaxed text-justify font-medium">{renderFormattedText(trimmed)}</p>;
                                      })
                                    ) : (
                                      <p className="italic text-on-surface-variant/70">Nenhuma instrução disponível para esta atividade.</p>
                                    )}
                                  </div>
                                  <div className="flex gap-4 pt-1 text-[11px] text-on-surface-variant font-mono">
                                    <span>Formato de entrega: <span className="font-bold text-secondary uppercase">{atividade.tipo_entrega}</span></span>
                                  </div>
                                </div>

                                {/* Submitted feedback */}
                                {exactEntrega && (
                                  <div className={`p-4 rounded-xl border space-y-3 ${
                                    exactEntrega.nota !== null 
                                      ? 'bg-emerald-50/20 border-emerald-200 text-on-surface' 
                                      : 'bg-amber-50/20 border-amber-200 text-on-surface'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                        exactEntrega.nota !== null 
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      }`}>
                                        {exactEntrega.nota !== null ? 'Corrigida' : 'Aguardando Correção'}
                                      </span>
                                      
                                      {exactEntrega.nota !== null && (
                                        <span className="text-label-md font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded">
                                          Nota: {exactEntrega.nota}
                                        </span>
                                      )}
                                    </div>

                                    <div className="space-y-1">
                                      <p className="text-[11px] text-on-surface-variant font-mono font-bold">Sua resposta enviada:</p>
                                      {atividade.tipo_entrega === 'imagem' ? (
                                        <div className="space-y-2">
                                          <p className="text-label-sm font-mono truncate bg-surface p-2 rounded border border-outline-variant/30">{exactEntrega.resposta}</p>
                                          {exactEntrega.resposta.startsWith('http') && (
                                            <div className="max-w-xs border border-outline-variant/40 rounded overflow-hidden">
                                              <img src={exactEntrega.resposta} alt="Envio do aluno" className="max-h-40 object-cover" />
                                            </div>
                                          )}
                                        </div>
                                      ) : atividade.tipo_entrega === 'multipla' ? (
                                        (() => {
                                          try {
                                            const payload = JSON.parse(exactEntrega.resposta);
                                            return (
                                              <div className="space-y-4">
                                                {payload.texto && (
                                                  <div className="space-y-1">
                                                    <p className="text-[10px] text-on-surface-variant font-mono font-bold uppercase">Resposta em Texto:</p>
                                                    <div className="text-body-md leading-relaxed text-on-surface bg-surface p-4 rounded-xl border border-outline-variant/30 whitespace-pre-wrap font-sans">
                                                      {payload.texto}
                                                    </div>
                                                  </div>
                                                )}
                                                {payload.imagem && (
                                                  <div className="space-y-1">
                                                    <p className="text-[10px] text-on-surface-variant font-mono font-bold uppercase">Imagem Anexada:</p>
                                                    <div className="space-y-2">
                                                      <p className="text-label-sm font-mono truncate bg-surface p-2 rounded border border-outline-variant/30">{payload.imagem}</p>
                                                      {payload.imagem.startsWith('http') && (
                                                        <div className="max-w-xs border border-outline-variant/40 rounded overflow-hidden mt-1">
                                                          <img src={payload.imagem} alt="Envio do aluno" className="max-h-40 object-cover" />
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          } catch (e) {
                                            return <p className="text-label-sm bg-surface p-3 rounded border border-outline-variant/30 text-error font-mono">Erro ao ler o envio misto.</p>;
                                          }
                                        })()
                                      ) : atividade.tipo_entrega === 'quiz' ? (
                                        (() => {
                                          try {
                                            const payload = JSON.parse(exactEntrega.resposta);
                                            const correct = payload.correctCount ?? 0;
                                            const total = payload.totalQuestions ?? 0;
                                            const score = payload.score ?? 0;
                                            const isGraded = (atividade.pontua ?? true) && payload.score !== null;
                                            
                                            return (
                                              <div className="space-y-4">
                                                {isGraded ? (
                                                  <div className="flex items-center gap-4 bg-surface p-3 rounded-xl border border-outline-variant/30">
                                                    <div className="flex flex-col">
                                                      <span className="text-[10px] uppercase font-mono text-on-surface-variant font-bold">Aproveitamento</span>
                                                      <span className="text-body-lg font-extrabold text-secondary font-mono">{score}%</span>
                                                    </div>
                                                    <div className="h-8 w-[1px] bg-outline-variant/30" />
                                                    <div className="flex flex-col">
                                                      <span className="text-[10px] uppercase font-mono text-on-surface-variant font-bold">Respostas Corretas</span>
                                                      <span className="text-body-md font-bold text-on-surface">{correct} de {total}</span>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="p-3 bg-surface rounded-xl border border-outline-variant/30 text-label-sm font-semibold text-on-surface-variant">
                                                    Respostas enviadas com sucesso (Questionário formativo).
                                                  </div>
                                                )}

                                                <div className="space-y-2">
                                                  <p className="text-[11px] text-on-surface-variant font-mono font-bold">Detalhamento das Respostas:</p>
                                                  {activeQuestions && activeQuestions.map((q, qIdx) => {
                                                    const alunoResp = payload.respostas?.[q.id] || '';
                                                    const isCorrect = isGraded ? isQuestionCorrect(q, alunoResp) : false;
                                                    return (
                                                      <div key={q.id} className="p-3 bg-surface rounded-lg border border-outline-variant/20 space-y-1 text-left">
                                                        <p className="text-label-sm font-semibold text-on-surface flex items-start gap-1">
                                                          <span className="text-secondary font-mono">Q{qIdx + 1}.</span>
                                                          <span>{q.enunciado}</span>
                                                        </p>
                                                        {isGraded ? (
                                                          <>
                                                            <p className="text-label-sm">
                                                              <span className="text-on-surface-variant font-mono text-[10px] uppercase block">Sua Resposta:</span>
                                                              <span className={`font-semibold ${isCorrect ? 'text-emerald-600' : 'text-error'}`}>
                                                                {q.tipo === 'multipla_selecao' && alunoResp
                                                                  ? alunoResp.split(';').join(', ')
                                                                  : (alunoResp || '(Sem resposta)')}
                                                              </span>
                                                              {isCorrect ? (
                                                                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold uppercase">Correto</span>
                                                              ) : (
                                                                <span className="ml-2 text-[10px] bg-error-container/20 text-error px-1.5 py-0.2 rounded font-bold uppercase">Incorreto</span>
                                                              )}
                                                            </p>
                                                            {!isCorrect && (
                                                              <p className="text-label-sm">
                                                                <span className="text-on-surface-variant font-mono text-[10px] uppercase block">Gabarito:</span>
                                                                <span className="font-semibold text-emerald-600">
                                                                  {q.tipo === 'aberta'
                                                                    ? (q.opcoes?.[0] || q.resposta_correta)
                                                                    : q.tipo === 'multipla_selecao' && q.resposta_correta
                                                                      ? q.resposta_correta.split(';').join(', ')
                                                                      : q.resposta_correta}
                                                                </span>
                                                              </p>
                                                            )}
                                                          </>
                                                        ) : (
                                                          <p className="text-label-sm">
                                                            <span className="text-on-surface-variant font-mono text-[10px] uppercase block">Sua Resposta:</span>
                                                            <span className="font-semibold text-on-surface">
                                                              {q.tipo === 'multipla_selecao' && alunoResp
                                                                ? alunoResp.split(';').join(', ')
                                                                : (alunoResp || '(Sem resposta)')}
                                                            </span>
                                                          </p>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          } catch (e) {
                                            return <p className="text-label-sm bg-surface p-3 rounded border border-outline-variant/30 text-error font-mono">Erro ao ler as respostas do quiz.</p>;
                                          }
                                        })()
                                      ) : (
                                        <div className="text-body-md leading-relaxed text-on-surface bg-surface p-4 rounded-xl border border-outline-variant/30 whitespace-pre-wrap font-sans">
                                          {exactEntrega.resposta}
                                        </div>
                                      )}
                                    </div>

                                    {exactEntrega.feedback_professor && (
                                      <div className="pt-2 border-t border-outline-variant/30 mt-2 space-y-1">
                                        <p className="text-[11px] text-secondary font-mono font-bold">Feedback do Professor:</p>
                                        <p className="text-label-sm italic text-on-surface-variant bg-white p-3 rounded border border-outline-variant/20 leading-relaxed">
                                          {exactEntrega.feedback_professor}
                                        </p>
                                      </div>
                                    )}

                                    {canRedo && !isRedoing && (
                                      <div className="pt-3 border-t border-outline-variant/30 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsRedoingActivity(prev => ({ ...prev, [atividade.id]: true }));
                                            if (atividade.tipo_entrega === 'multipla') {
                                              try {
                                                const parsed = JSON.parse(exactEntrega.resposta);
                                                setActivityResponse(prev => ({ ...prev, [atividade.id]: parsed.texto || '' }));
                                                setActivityImage(prev => ({ ...prev, [atividade.id]: parsed.imagem || '' }));
                                              } catch (e) {}
                                            } else if (atividade.tipo_entrega !== 'quiz') {
                                              setActivityResponse(prev => ({ ...prev, [atividade.id]: exactEntrega.resposta || '' }));
                                              if (atividade.tipo_entrega === 'imagem') {
                                                setActivityImage(prev => ({ ...prev, [atividade.id]: exactEntrega.resposta || '' }));
                                              }
                                            }
                                          }}
                                          className="px-4 py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/25 hover:border-secondary/40 font-heading font-bold text-label-sm rounded-lg transition-all flex items-center gap-1.5"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                                          </svg>
                                          Refazer Atividade
                                        </button>
                                      </div>
                                    )}

                                    {atividade.permite_refazer === false && exactEntrega.nota === null && (
                                      <div className="pt-2 border-t border-outline-variant/30 mt-2 text-[11px] text-on-surface-variant/75 italic flex items-center gap-1">
                                        <HugeiconsIcon icon={Alert01Icon} size={12} className="text-amber-500" />
                                        <span>Esta atividade não permite reenvio de respostas.</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Submit Form */}
                                {(!exactEntrega || (canRedo && isRedoing)) && (
                                  <form 
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleSubmitActivity(atividade.id, atividade.tipo_entrega);
                                    }}
                                    className="space-y-4"
                                  >
                                    <div className="space-y-1.5">
                                      <label className="text-label-sm font-semibold text-on-surface">
                                        {atividade.tipo_entrega === 'texto' 
                                          ? 'Escreva sua resposta para a atividade' 
                                          : atividade.tipo_entrega === 'quiz'
                                            ? 'Responda as questões do quiz abaixo:'
                                            : atividade.tipo_entrega === 'multipla'
                                              ? 'Preencha os campos abaixo (texto e/ou imagem) para entrega:'
                                              : 'Cole o link/URL da sua imagem para entrega'}
                                      </label>

                                      {atividade.tipo_entrega === 'texto' ? (
                                        <textarea
                                          value={activityResponse[atividade.id] || ''}
                                          onChange={(e) => setActivityResponse(prev => ({ ...prev, [atividade.id]: e.target.value }))}
                                          placeholder="Escreva sua resposta detalhada aqui..."
                                          rows={8}
                                          disabled={submittingActivity}
                                          className="w-full p-4 text-body-md leading-relaxed font-sans min-h-[200px] rounded-xl border border-outline-variant/50 bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                                        />
                                      ) : atividade.tipo_entrega === 'multipla' ? (
                                        <div className="space-y-4">
                                          <div className="space-y-1.5 text-left">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">1. Resposta Escrita (Código ou Texto)</span>
                                            <textarea
                                              value={activityResponse[atividade.id] || ''}
                                              onChange={(e) => setActivityResponse(prev => ({ ...prev, [atividade.id]: e.target.value }))}
                                              placeholder="Escreva sua resposta detalhada aqui..."
                                              rows={6}
                                              disabled={submittingActivity}
                                              className="w-full p-4 text-body-md leading-relaxed font-sans min-h-[150px] rounded-xl border border-outline-variant/50 bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                                            />
                                          </div>
                                          <div className="space-y-1.5 text-left">
                                            <span className="text-[11px] font-bold text-slate-500 tracking-wider font-mono uppercase">2. Link/URL de Imagem (Opcional se preencheu texto)</span>
                                            <input
                                              type="url"
                                              value={activityImage[atividade.id] || ''}
                                              onChange={(e) => setActivityImage(prev => ({ ...prev, [atividade.id]: e.target.value }))}
                                              placeholder="https://exemplo.com/sua-imagem.png"
                                              disabled={submittingActivity}
                                              className="w-full p-4 text-body-md rounded-xl border border-outline-variant/50 bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                                            />
                                            {(activityImage[atividade.id] || '').trim().startsWith('http') && (
                                              <div className="max-w-xs border border-outline-variant/50 rounded overflow-hidden p-1 bg-surface mt-2">
                                                <img src={activityImage[atividade.id] || ''} alt="Preview do envio" className="max-h-36 object-cover" />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : atividade.tipo_entrega === 'quiz' ? (
                                        <div className="space-y-4">
                                          {activeQuestions && activeQuestions.length > 0 ? (
                                            activeQuestions.map((q, idx) => (
                                              <div key={q.id} className="space-y-3 p-4 bg-surface rounded-xl border border-outline-variant/45">
                                                <p className="font-semibold text-on-surface text-body-md flex items-start gap-2">
                                                  <span className="text-secondary font-bold font-mono">Q{idx + 1}.</span>
                                                  <span>
                                                    {q.enunciado}
                                                    {q.tipo === 'verdadeiro_falso' && (
                                                      <span className="ml-2 text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">V / F</span>
                                                    )}
                                                    {q.tipo === 'aberta' && (
                                                      <span className="ml-2 text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">Prática Aberta</span>
                                                    )}
                                                    {q.tipo === 'multipla_selecao' && (
                                                      <span className="ml-2 text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">Múltiplas Respostas</span>
                                                    )}
                                                  </span>
                                                </p>

                                                {/* Options list: Múltipla Seleção */}
                                                {q.tipo === 'multipla_selecao' && (
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                                    {q.opcoes.map((opcao, optIdx) => {
                                                      const selectedAnswers = quizAnswers[q.id] ? quizAnswers[q.id].split(';').map(o => o.trim()) : [];
                                                      const isSelected = selectedAnswers.includes(opcao);
                                                      let optionStyle = 'bg-surface-container-lowest border-outline-variant/50 hover:bg-surface-container-low/50';

                                                      if (isSelected) {
                                                        optionStyle = 'bg-secondary/5 border-secondary text-secondary font-medium shadow-sm';
                                                      }

                                                      return (
                                                        <button
                                                          key={optIdx}
                                                          type="button"
                                                          disabled={submittingActivity}
                                                          onClick={() => handleToggleAnswerMulti(q.id, opcao)}
                                                          className={`w-full text-left p-3.5 rounded-lg border text-label-md transition-all flex items-start gap-2.5 ${optionStyle}`}
                                                        >
                                                          <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] font-extrabold mt-0.5 ${
                                                            isSelected
                                                              ? 'bg-secondary border-secondary text-white'
                                                              : 'border-slate-300'
                                                          }`}>
                                                            {isSelected && (
                                                               <HugeiconsIcon icon={Tick01Icon} size={10} strokeWidth={3} className="text-white" />
                                                             )}
                                                          </div>
                                                          <span>{opcao}</span>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                )}

                                                {/* Options list: Múltipla Escolha */}
                                                {(!q.tipo || q.tipo === 'multipla_escolha') && (
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                                    {q.opcoes.map((opcao, optIdx) => {
                                                      const isSelected = quizAnswers[q.id] === opcao;
                                                      let optionStyle = 'bg-surface-container-lowest border-outline-variant/50 hover:bg-surface-container-low/50';

                                                      if (isSelected) {
                                                        optionStyle = 'bg-secondary/5 border-secondary text-secondary font-medium shadow-sm';
                                                      }

                                                      return (
                                                        <button
                                                          key={optIdx}
                                                          type="button"
                                                          disabled={submittingActivity}
                                                          onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opcao }))}
                                                          className={`w-full text-left p-3.5 rounded-lg border text-label-md transition-all flex items-start gap-2 ${optionStyle}`}
                                                        >
                                                          <span className="font-bold font-mono text-outline-variant shrink-0">
                                                            {String.fromCharCode(65 + optIdx)})
                                                          </span>
                                                          <span>{opcao}</span>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                )}

                                                {/* Options list: Verdadeiro ou Falso */}
                                                {q.tipo === 'verdadeiro_falso' && (
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                                    {['Verdadeiro', 'Falso'].map((opcao, optIdx) => {
                                                      const isSelected = quizAnswers[q.id] === opcao;
                                                      let optionStyle = 'bg-surface-container-lowest border-outline-variant/50 hover:bg-surface-container-low/50';

                                                      if (isSelected) {
                                                        optionStyle = 'bg-secondary/5 border-secondary text-secondary font-medium shadow-sm';
                                                      }

                                                      return (
                                                        <button
                                                          key={optIdx}
                                                          type="button"
                                                          disabled={submittingActivity}
                                                          onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opcao }))}
                                                          className={`w-full text-center p-3.5 rounded-lg border text-label-md font-bold transition-all flex items-center justify-center gap-2 ${optionStyle}`}
                                                        >
                                                          <span className={`w-2 h-2 rounded-full ${opcao === 'Verdadeiro' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                          <span>{opcao}</span>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                )}

                                                {/* Options list: Questão Aberta */}
                                                {q.tipo === 'aberta' && (
                                                  <div className="pl-6 space-y-3">
                                                    <textarea
                                                      rows={3}
                                                      disabled={submittingActivity}
                                                      value={quizAnswers[q.id] || ''}
                                                      onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                      placeholder="Digite a sua resposta prática/teórica para validação..."
                                                      className="w-full px-4 py-3 rounded-xl border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all text-body-md bg-white disabled:bg-slate-50 disabled:text-slate-500"
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-label-md text-on-surface-variant font-mono">Esta atividade não possui questões de quiz configuradas.</p>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <input
                                            type="url"
                                            value={activityImage[atividade.id] || ''}
                                            onChange={(e) => setActivityImage(prev => ({ ...prev, [atividade.id]: e.target.value }))}
                                            placeholder="https://exemplo.com/sua-imagem.png"
                                            disabled={submittingActivity}
                                            className="w-full p-4 text-body-md rounded-xl border border-outline-variant/50 bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                                          />
                                          {(activityImage[atividade.id] || '').trim().startsWith('http') && (
                                            <div className="max-w-xs border border-outline-variant/50 rounded overflow-hidden p-1 bg-surface mt-2">
                                              <img src={activityImage[atividade.id] || ''} alt="Preview do envio" className="max-h-36 object-cover" />
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {activityErrorMsg && (
                                      <div className="p-3 bg-error-container/20 border border-error/20 rounded-lg text-error text-label-md flex items-center gap-2">
                                        <HugeiconsIcon icon={Alert01Icon} size={16} />
                                        <span>{activityErrorMsg}</span>
                                      </div>
                                    )}

                                    {activitySuccessMsg && (
                                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-label-md flex items-center gap-2">
                                        <HugeiconsIcon icon={Tick01Icon} size={16} />
                                        <span>{activitySuccessMsg}</span>
                                      </div>
                                    )}

                                    <div className="flex justify-end gap-3">
                                      {canRedo && isRedoing && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsRedoingActivity(prev => ({ ...prev, [atividade.id]: false }));
                                            // Reset inputs to original submission
                                            if (atividade.tipo_entrega === 'quiz') {
                                              try {
                                                const parsed = JSON.parse(exactEntrega.resposta);
                                                if (parsed && parsed.respostas) {
                                                  setQuizAnswers(parsed.respostas);
                                                }
                                              } catch (e) {}
                                            } else if (atividade.tipo_entrega === 'multipla') {
                                              try {
                                                const parsed = JSON.parse(exactEntrega.resposta);
                                                setActivityResponse(prev => ({ ...prev, [atividade.id]: parsed.texto || '' }));
                                                setActivityImage(prev => ({ ...prev, [atividade.id]: parsed.imagem || '' }));
                                              } catch (e) {}
                                            } else {
                                              setActivityResponse(prev => ({ ...prev, [atividade.id]: exactEntrega.resposta || '' }));
                                              if (atividade.tipo_entrega === 'imagem') {
                                                setActivityImage(prev => ({ ...prev, [atividade.id]: exactEntrega.resposta || '' }));
                                              }
                                            }
                                          }}
                                          className="px-5 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high font-heading font-bold text-label-md transition-all"
                                        >
                                          Cancelar
                                        </button>
                                      )}
                                      <button
                                        type="submit"
                                        disabled={
                                          submittingActivity || 
                                          (atividade.tipo_entrega === 'texto' 
                                            ? !(activityResponse[atividade.id] || '').trim() 
                                            : atividade.tipo_entrega === 'quiz'
                                              ? (() => {
                                                  const isProprio = selectedAula.questoes?.some(q => q.atividade_id === atividade.id);
                                                  const activeQuestions = isProprio
                                                    ? (selectedAula.questoes?.filter(q => q.atividade_id === atividade.id) || [])
                                                    : (selectedAula.questoes?.filter(q => !q.atividade_id && !q.para_arena) || []);
                                                  return activeQuestions.length === 0 || activeQuestions.some(q => !quizAnswers[q.id] || !quizAnswers[q.id].trim());
                                                })()
                                              : atividade.tipo_entrega === 'multipla'
                                                ? (!(activityResponse[atividade.id] || '').trim() && !(activityImage[atividade.id] || '').trim())
                                                : !(activityImage[atividade.id] || '').trim())
                                        }
                                        className={`px-5 py-2.5 rounded-lg font-heading font-bold text-label-md flex items-center gap-2 transition-all ${
                                          (atividade.tipo_entrega === 'texto' 
                                            ? (activityResponse[atividade.id] || '').trim() 
                                            : atividade.tipo_entrega === 'quiz'
                                              ? (() => {
                                                  const isProprio = selectedAula.questoes?.some(q => q.atividade_id === atividade.id);
                                                  const activeQuestions = isProprio
                                                    ? (selectedAula.questoes?.filter(q => q.atividade_id === atividade.id) || [])
                                                    : (selectedAula.questoes?.filter(q => !q.atividade_id && !q.para_arena) || []);
                                                  return activeQuestions.length > 0 && !activeQuestions.some(q => !quizAnswers[q.id] || !quizAnswers[q.id].trim());
                                                })()
                                              : atividade.tipo_entrega === 'multipla'
                                                ? ((activityResponse[atividade.id] || '').trim() || (activityImage[atividade.id] || '').trim())
                                                : (activityImage[atividade.id] || '').trim()) && !submittingActivity
                                            ? 'bg-primary text-on-primary shadow shadow-primary/15 hover:shadow-md hover:bg-primary-container hover:-translate-y-0.5'
                                            : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed border border-outline-variant/40'
                                        }`}
                                      >
                                        {submittingActivity ? 'Enviando...' : exactEntrega ? 'Reenviar Atividade' : 'Enviar Resposta'}
                                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual completion checkbox */}
                  <div className="app-card-padded flex flex-col sm:flex-row items-center justify-between gap-4">
                    {!aulasLiberadas.includes(selectedAula.id) ? (
                      <div className="text-label-sm text-amber-600 font-bold flex items-center gap-1.5">
                        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Aguardando liberação do professor.
                      </div>
                    ) : (() => {
                      const hasAtividade = selectedAula.atividades && selectedAula.atividades.length > 0;
                      const atividade = hasAtividade ? selectedAula.atividades![0] : null;
                      const exactEntrega = atividade ? entregas.find(e => e.atividade_id === atividade.id) : null;

                      if (selectedAula.questoes && selectedAula.questoes.length > 0) {
                        return (
                          <div className="text-label-sm text-on-surface-variant font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            * Quizzes são concluídos automaticamente após aprovação.
                          </div>
                        );
                      }

                      if (hasAtividade) {
                        if (exactEntrega) {
                          return (
                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/60 p-3.5 rounded-xl text-emerald-800 text-label-md">
                              <HugeiconsIcon icon={Tick01Icon} size={18} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
                              <div>
                                <p className="font-heading font-bold text-emerald-950 leading-tight">Aula Concluída!</p>
                                <p className="text-[11px] text-emerald-700 mt-0.5">
                                  {exactEntrega.nota !== null 
                                    ? `Atividade avaliada pelo professor (Nota: ${exactEntrega.nota}/100)` 
                                    : 'Atividade prática enviada. Aguardando correção.'}
                                </p>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200/60 p-3.5 rounded-xl text-amber-800 text-label-md">
                              <HugeiconsIcon icon={Alert01Icon} size={18} className="text-amber-600 shrink-0" />
                              <div>
                                <p className="font-heading font-bold text-amber-950 leading-tight">Atividade Prática Obrigatória</p>
                                <p className="text-[11px] text-amber-700 mt-0.5">Envie a sua resposta para a atividade prática acima para concluir esta aula.</p>
                              </div>
                            </div>
                          );
                        }
                      }

                      // Default manual toggle button for lessons without activity
                      return (
                        <button
                          onClick={() => handleToggleCompletion(selectedAula.id)}
                          disabled={updatingProgress}
                          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border font-heading font-bold text-label-md transition-all ${
                            isLessonCompleted(selectedAula.id)
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70'
                              : 'bg-primary text-on-primary border-primary hover:bg-primary-container hover:-translate-y-0.5 shadow shadow-primary/10'
                          }`}
                        >
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2.5} />
                          {isLessonCompleted(selectedAula.id) ? 'Concluída (Desmarcar)' : 'Concluir Aula'}
                        </button>
                      );
                    })()}

                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={handlePrevLesson}
                        disabled={aulas.findIndex(a => a.id === selectedAula.id) === 0}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-surface border border-outline-variant/40 hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface font-semibold text-label-md rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                        Anterior
                      </button>
                       <button
                        onClick={handleNextLesson}
                        disabled={
                          (() => {
                            const idx = aulas.findIndex(a => a.id === selectedAula.id);
                            if (idx === -1 || idx === aulas.length - 1) return true;
                            return aulas[idx + 1] && !aulasLiberadas.includes(aulas[idx + 1].id);
                          })()
                        }
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-surface border border-outline-variant/40 hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface font-semibold text-label-md rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Próxima
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>
      )}



      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-250">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h3 className="font-heading font-extrabold text-body-lg text-on-surface">Avalie esta Aula!</h3>
              <p className="text-body-md text-on-surface-variant">Como foi sua experiência de aprendizado com este conteúdo?</p>
            </div>

            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingValue(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <svg
                    className={`w-9 h-9 transition-colors ${
                      star <= (hoverRating || ratingValue)
                        ? 'text-amber-500 fill-current'
                        : 'text-slate-200'
                    }`}
                    viewBox="0 0 24 24"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRatingModal(false);
                  setRatingLessonId(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-heading font-bold text-label-sm rounded-xl transition-all cursor-pointer"
              >
                Pular
              </button>
              <button
                type="button"
                onClick={handleSubmitRating}
                disabled={ratingValue === 0 || submittingRating}
                className="flex-1 px-4 py-2.5 bg-primary text-on-primary font-heading font-bold text-label-sm rounded-xl hover:bg-primary-container disabled:opacity-50 transition-all cursor-pointer"
              >
                {submittingRating ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
