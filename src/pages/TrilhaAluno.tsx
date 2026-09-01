import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import { CardConquista } from '../components/common/CardConquista';
import { dispararCelebracao } from '../utils/celebracao';
import {
  answersForQuestions,
  getActivityQuizQuestions,
  getStandardQuizQuestions,
  hasStandardQuizQuestions,
} from '../utils/lessonQuestionFilters';
import { fetchAllBatches } from '../utils/batchedFetch';
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
  InformationCircleIcon,
  Attachment01Icon,
  ImageAdd01Icon,
  Delete02Icon,
  Download01Icon,
  File01Icon
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

const getAtividadeTabLabel = (act: any, allActs: any[]) => {
  if (act.tipo_entrega === 'quiz') return 'Quiz';
  
  const nonQuizActs = allActs.filter(a => a.tipo_entrega !== 'quiz');
  if (nonQuizActs.length <= 1) {
    return 'Atividade Prática';
  } else {
    const nonQuizIndex = nonQuizActs.findIndex(a => a.id === act.id);
    return `Atividade Prática ${nonQuizIndex + 1}`;
  }
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

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

const formatAgendaDate = (date?: string) => {
  if (!date) return '';
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const getAgendaAccent = (type?: string) => {
  switch (type) {
    case 'live':
      return { dot: 'bg-primary', text: 'text-primary', label: 'Live' };
    case 'deadline':
      return { dot: 'bg-orange-500', text: 'text-orange-600', label: 'Prazo' };
    case 'exam':
      return { dot: 'bg-red-500', text: 'text-red-600', label: 'Prova' };
    case 'mentorship':
      return { dot: 'bg-purple-600', text: 'text-purple-600', label: 'Mentoria' };
    case 'activity':
    default:
      return { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Atividade' };
  }
};

interface TrilhaAlunoProps {
  session: any;
  isAdmin: boolean;
  initialViewMode?: 'trail' | 'achievements';
  initialAulaId?: string | null;
  initialModuloId?: string | null;
  onNavigateToAula?: (aulaId: string) => void;
  onNavigateToModulo?: (moduloId: string) => void;
  onNavigateToDashboard?: () => void;
  onNavigateToAchievements?: () => void;
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
  embaralhar_opcoes?: boolean;
  tempo_limite: number | null;
  numero_aula: number;
  titulo: string;
  conteudo: string;
  liberada: boolean;
  atividades?: Atividade[];
  questoes?: Questao[];
  aula_materiais?: MaterialAula[];
}

interface MaterialAula {
  id: string;
  titulo: string;
  url: string;
  tipo: 'imagem' | 'arquivo' | 'video' | 'link' | 'referencia';
  uso: 'atividade_pratica' | 'consulta' | 'leitura' | 'download' | 'referencia';
  obrigatorio: boolean;
}

interface Atividade {
  id: string;
  aula_id: string;
  enunciado: string;
  tipo_entrega: 'texto' | 'imagem' | 'quiz' | 'multipla' | 'arquivo';
  pontua?: boolean;
  permite_refazer?: boolean;
  material_url?: string | null;
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
  contexto?: 'aula' | 'atividade' | 'arena';
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
  atividade_id: string | null;
  aula_id?: string | null;
  resposta: string;
  nota: number | null;
  feedback_professor: string | null;
}

interface QuizSubmissionPayload {
  respostas: Record<string, string>;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  passed: boolean | null;
}

const shuffledCopy = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
};

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

export const TrilhaAluno: React.FC<TrilhaAlunoProps> = ({
  session,
  isAdmin,
  initialViewMode = 'trail',
  initialAulaId,
  initialModuloId,
  onNavigateToAula,
  onNavigateToModulo,
  onNavigateToDashboard,
  onNavigateToAchievements,
  onStartArena
}) => {
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
  const standardQuizQuestions = useMemo(
    () => getStandardQuizQuestions(selectedAula?.questoes),
    [selectedAula?.questoes],
  );

  // Selected modulo for module_trail view
  const [selectedModulo, setSelectedModulo] = useState<Modulo | null>(null);

  // Lesson view specific UI states
  const [lessonSidebarOpen, setLessonSidebarOpen] = useState(true);
  const [activeLessonTab, setActiveLessonTab] = useState<string>('conteudo');

  // File upload state for student activities
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, atividadeId: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFiles(prev => ({ ...prev, [atividadeId]: file }));
      
      // If it is an image, generate a preview URL
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFilePreviews(prev => ({ ...prev, [atividadeId]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      } else {
        // Clear preview for non-image files
        setSelectedFilePreviews(prev => {
          const updated = { ...prev };
          delete updated[atividadeId];
          return updated;
        });
      }
    }
  };

  const handleRemoveFile = (atividadeId: string) => {
    setSelectedFiles(prev => {
      const updated = { ...prev };
      delete updated[atividadeId];
      return updated;
    });
    setSelectedFilePreviews(prev => {
      const updated = { ...prev };
      delete updated[atividadeId];
      return updated;
    });
  };

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
        .is('arquivado_em', null)
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
            atividades(*),
            aula_materiais(*)
          `)
          .in('modulo_id', moduloIds)
          .is('arquivado_em', null);

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
          const questionsData = await fetchAllBatches<string, Questao>(aulaIds, (lessonIds) =>
            supabase
              .rpc('get_accessible_questions', { p_aula_ids: lessonIds })
          );

          questionsByLesson = questionsData.reduce((map: Map<string, Questao[]>, question: Questao) => {
            const current = map.get(question.aula_id) || [];
            current.push(question);
            map.set(question.aula_id, current);
            return map;
          }, new Map<string, Questao[]>());
        }

        setAulas(sortedAulas.map(aula => ({
          ...aula,
          questoes: (questionsByLesson.get(aula.id) || []).map((question) => ({
            ...question,
            opcoes: aula.embaralhar_opcoes && question.tipo !== 'aberta'
              ? shuffledCopy(question.opcoes || [])
              : question.opcoes,
          })),
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
        .or(`turma_id.is.null,turma_id.eq.${profileData.turma_id}`)
        .gte('event_date', getTodayIsoDate())
        .order('event_date', { ascending: true })
        .order('time', { ascending: true })
        .limit(6);

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

  // Sync view state when initialAulaId, initialModuloId or initialViewMode changes
  useEffect(() => {
    if (initialAulaId && aulas.length > 0) {
      const targetAula = aulas.find(a => a.id === initialAulaId);
      if (targetAula) {
        setSelectedAula(targetAula);
        setView('lesson');
        const parentMod = modulos.find(m => m.id === targetAula.modulo_id);
        if (parentMod) setSelectedModulo(parentMod);
      }
    } else if (initialModuloId && modulos.length > 0) {
      const targetMod = modulos.find(m => m.id === initialModuloId);
      if (targetMod) {
        setSelectedModulo(targetMod);
        setView('module_trail');
        setSelectedAula(null);
      }
    } else if (initialViewMode === 'achievements') {
      setView('achievements');
      setSelectedAula(null);
      setSelectedModulo(null);
    } else if (!initialAulaId && !initialModuloId) {
      setView('dashboard');
      setSelectedAula(null);
      setSelectedModulo(null);
    }
  }, [initialAulaId, initialModuloId, initialViewMode, aulas, modulos]);

  const handleOpenAula = (aula: Aula) => {
    setSelectedAula(aula);
    const parentMod = modulos.find(m => m.id === aula.modulo_id);
    if (parentMod) setSelectedModulo(parentMod);
    if (onNavigateToAula) {
      onNavigateToAula(aula.id);
    } else {
      setView('lesson');
    }
  };

  const handleOpenModulo = (modulo: Modulo) => {
    setSelectedModulo(modulo);
    setSelectedAula(null);
    if (onNavigateToModulo) {
      onNavigateToModulo(modulo.id);
    } else {
      setView('module_trail');
    }
  };

  const handleGoToDashboard = () => {
    setSelectedAula(null);
    setSelectedModulo(null);
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    } else {
      setView('dashboard');
    }
  };

  const handleGoToAchievements = () => {
    setSelectedAula(null);
    setSelectedModulo(null);
    if (onNavigateToAchievements) {
      onNavigateToAchievements();
    } else {
      setView('achievements');
    }
  };

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
      if (selectedAula.video_url || selectedAula.conteudo) {
        setActiveLessonTab('conteudo');
      } else if (standardQuizQuestions.length > 0) {
        setActiveLessonTab('quiz');
      } else if (selectedAula.arquivo_url || (selectedAula.aula_materiais?.length || 0) > 0) {
        setActiveLessonTab('arquivos');
      } else if (selectedAula.atividades && selectedAula.atividades.length > 0) {
        if (selectedAula.atividades.length === 1) {
          setActiveLessonTab('atividade');
        } else {
          setActiveLessonTab(selectedAula.atividades[0].id);
        }
      }
    }

    // Pre-fill standard lesson quiz if already submitted
    if (selectedAula) {
      const standardQuizEntrega = entregas.find(e => e.aula_id === selectedAula.id && !e.atividade_id);
      if (standardQuizEntrega) {
        try {
          const parsed = JSON.parse(standardQuizEntrega.resposta);
          if (parsed && typeof parsed === 'object') {
            if (parsed.respostas) {
              setQuizAnswers(parsed.respostas);
            }
            if (typeof parsed.score === 'number') {
              setQuizScore(parsed.score);
            }
            if (typeof parsed.passed === 'boolean') {
              setQuizPassed(parsed.passed);
            }
            setQuizSubmitted(true);
          }
        } catch (e) {
          console.error('Erro ao fazer parse da entrega de quiz da aula:', e);
        }
      }
    }

    // Pre-fill activity if already submitted
    if (selectedAula && selectedAula.atividades && selectedAula.atividades.length > 0) {
      const newResponses: Record<string, string> = {};
      const newImages: Record<string, string> = {};
      const newAnswers: Record<string, string> = {};

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
        setQuizAnswers(previous => ({ ...previous, ...newAnswers }));
      }
    }
  }, [selectedAula, standardQuizQuestions, entregas]);

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

  const resolveOption = (val: string, opcoes?: string[]): string => {
    if (!val) return '';
    const trimmed = String(val).trim();
    if (!opcoes || opcoes.length === 0) return trimmed.toLowerCase();

    const directIdx = opcoes.findIndex(o => o.trim().toLowerCase() === trimmed.toLowerCase());
    if (directIdx !== -1) return opcoes[directIdx].trim().toLowerCase();

    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const letterIdx = letters.indexOf(trimmed.toLowerCase());
    if (letterIdx !== -1 && letterIdx < opcoes.length) {
      return opcoes[letterIdx].trim().toLowerCase();
    }

    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 0 && num < opcoes.length) {
      return opcoes[num].trim().toLowerCase();
    }

    return trimmed.toLowerCase();
  };

  const isQuestionCorrect = (q: Questao, answer: string): boolean => {
    if (!answer && answer !== '0') return false;
    const gabarito = (q.resposta_correta || '').trim();
    const resp = answer.trim();

    if (!gabarito && q.tipo !== 'aberta') return true;

    if (q.tipo === 'verdadeiro_falso') {
      const isTrue = (s: string) => ['verdadeiro', 'v', 'true', '1', 'sim'].includes(s.trim().toLowerCase());
      const isFalse = (s: string) => ['falso', 'f', 'false', '0', 'nao', 'não'].includes(s.trim().toLowerCase());
      if (isTrue(resp) && isTrue(gabarito)) return true;
      if (isFalse(resp) && isFalse(gabarito)) return true;
      return resp.toLowerCase() === gabarito.toLowerCase();
    }

    if (q.tipo === 'multipla_selecao') {
      const splitTokens = (str: string) =>
        str
          .split(/[;,\n]/)
          .map(s => resolveOption(s, q.opcoes))
          .filter(Boolean)
          .sort();
      const respTokens = splitTokens(resp);
      const gabTokens = splitTokens(gabarito);
      if (respTokens.length === 0 && gabTokens.length === 0) return true;
      if (respTokens.length !== gabTokens.length) return false;
      return respTokens.every((token, idx) => token === gabTokens[idx]);
    }

    if (q.tipo === 'aberta') {
      const normGabarito = (q.opcoes?.[0] || q.resposta_correta || '').trim().toLowerCase();
      if (normGabarito && resp.toLowerCase().includes(normGabarito)) return true;

      const keywordsStr = q.opcoes?.[1] || '';
      if (keywordsStr.trim()) {
        const keywords = keywordsStr
          .split(',')
          .map((k: string) => k.trim().toLowerCase())
          .filter(Boolean);
        if (keywords.length > 0) {
          const matchCount = keywords.filter((k: string) => resp.toLowerCase().includes(k)).length;
          return matchCount >= Math.ceil(keywords.length * 0.5);
        }
      }
      return resp.length > 0;
    }

    // multipla_escolha
    const resolvedResp = resolveOption(resp, q.opcoes);
    const resolvedGab = resolveOption(gabarito, q.opcoes);
    return resolvedResp === resolvedGab;
  };

  const getStudentAnswerForQuestion = (payload: any, q: any, qIdx: number): string => {
    if (!payload) return '';
    const answers = payload.respostas || payload;
    if (!answers || typeof answers !== 'object') return '';

    if (answers[q.id] !== undefined && answers[q.id] !== null) {
      return String(answers[q.id]);
    }
    if (Array.isArray(answers) && answers[qIdx] !== undefined) {
      return String(answers[qIdx]);
    }
    if (answers[String(qIdx)] !== undefined && answers[String(qIdx)] !== null) {
      return String(answers[String(qIdx)]);
    }
    if (q.enunciado && answers[q.enunciado] !== undefined) {
      return String(answers[q.enunciado]);
    }
    return '';
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
    if (!selectedAula || standardQuizQuestions.length === 0) return;
    const standardAnswers = answersForQuestions(standardQuizQuestions, quizAnswers);

    const { data: gradeData, error: gradeError } = await supabase
      .rpc('grade_quiz_answers', {
        p_aula_id: selectedAula.id,
        p_respostas: standardAnswers,
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

    // Always mark the lesson as completed upon answering the quiz
    await handleToggleCompletion(selectedAula.id, true);

    // Save standard quiz submission in entregas_atividades so the teacher can review it
    try {
      const payload = {
        respostas: standardAnswers,
        score: score,
        correctCount: gradeData?.correctCount ?? 0,
        totalQuestions: gradeData?.totalQuestions ?? standardQuizQuestions.length,
        passed: passed
      };
      const answerJson = JSON.stringify(payload);
      const existingEntrega = entregas.find(e => e.aula_id === selectedAula.id && !e.atividade_id);

      if (existingEntrega) {
        const { error: updateError } = await supabase
          .from('entregas_atividades')
          .update({
            resposta: answerJson,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntrega.id);
        if (updateError) throw updateError;
        setEntregas(prev => prev.map(e => e.id === existingEntrega.id ? { ...e, resposta: answerJson } : e));
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('entregas_atividades')
          .insert({
            aluno_id: userId,
            aula_id: selectedAula.id,
            atividade_id: null,
            resposta: answerJson
          })
          .select();
        if (insertError) throw insertError;
        if (insertData) {
          setEntregas(prev => [...prev, insertData[0]]);
        }
      }
    } catch (err) {
      console.error('Erro ao salvar entrega do quiz:', err);
    }
  };

  const handleSubmitActivity = async (atividadeId: string, tipo: 'texto' | 'imagem' | 'quiz' | 'multipla' | 'arquivo') => {
    let answer = '';
    const actResponse = activityResponse[atividadeId] || '';
    const actImage = activityImage[atividadeId] || '';
    const file = selectedFiles[atividadeId];

    if (tipo === 'quiz') {
      const activityRecord = selectedAula?.atividades?.find(a => a.id === atividadeId);
      const questions = getActivityQuizQuestions(selectedAula?.questoes, atividadeId);
      const activityAnswers = answersForQuestions(questions, quizAnswers);

      const isGraded = activityRecord ? (activityRecord.pontua ?? true) : true;
      const shouldGrade = isGraded && questions.length > 0;

      let payload: QuizSubmissionPayload;

      if (shouldGrade) {
        const { data: gradeData, error: gradeError } = await supabase
          .rpc('grade_quiz_answers', {
            p_aula_id: selectedAula?.id,
            p_respostas: activityAnswers,
            p_atividade_id: atividadeId
          });

        if (gradeError) {
          throw gradeError;
        }

        if (selectedAula) {
          applyQuizCorrectionResults(selectedAula.id, gradeData?.results || []);
        }

        payload = {
          respostas: activityAnswers,
          score: gradeData?.score ?? 0,
          correctCount: gradeData?.correctCount ?? 0,
          totalQuestions: gradeData?.totalQuestions ?? questions.length,
          passed: !!gradeData?.passed
        };
      } else {
        payload = {
          respostas: activityAnswers,
          score: null,
          correctCount: null,
          totalQuestions: questions.length,
          passed: null
        };
      }
      answer = JSON.stringify(payload);
    } else if (tipo === 'multipla') {
      if (!actResponse.trim() && !file && !actImage.trim()) {
        setActivityErrorMsg('Por favor, insira um texto ou anexe uma imagem para enviar.');
        return;
      }
    } else if (tipo === 'imagem' || tipo === 'arquivo') {
      if (!file && !actResponse.trim() && !actImage.trim()) {
        setActivityErrorMsg('Por favor, selecione um arquivo ou insira uma resposta.');
        return;
      }
    } else {
      if (!actResponse.trim()) {
        setActivityErrorMsg('Por favor, insira uma resposta antes de enviar.');
        return;
      }
    }

    setSubmittingActivity(true);
    setActivityErrorMsg(null);
    setActivitySuccessMsg(null);

    try {
      let finalResposta = actResponse;

      if (file) {
        const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const fileName = `${userId}/${atividadeId}-${Date.now()}-${sanitizedOriginalName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('atividades')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('atividades')
          .getPublicUrl(fileName);

        finalResposta = publicUrlData.publicUrl;
      }

      if (tipo === 'multipla') {
        const payload = {
          texto: actResponse.trim(),
          imagem: file ? finalResposta : (actImage.trim() || null)
        };
        answer = JSON.stringify(payload);
      } else if (tipo === 'imagem') {
        answer = file ? finalResposta : (actImage.trim() || actResponse.trim());
      } else if (tipo === 'arquivo') {
        answer = file ? finalResposta : (actResponse.trim() || actImage.trim());
      } else if (tipo !== 'quiz') {
        answer = actResponse;
      }

      if (!answer.trim()) {
        setActivityErrorMsg('Por favor, insira uma resposta antes de enviar.');
        setSubmittingActivity(false);
        return;
      }

      const existingEntrega = entregas.find(e => e.atividade_id === atividadeId);
      const gradeValue = null; // Instructor reviews and confirms score

      if (existingEntrega) {
        // Update
        const { error: updateError } = await supabase
          .from('entregas_atividades')
          .update({
            resposta: answer.trim(),
            nota: gradeValue,
            aula_id: selectedAula?.id,
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
            aula_id: selectedAula?.id,
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

      // Clear the selected file on success
      handleRemoveFile(atividadeId);

      // Refresh entregas
      const { data: freshEntregas } = await supabase
        .from('entregas_atividades')
        .select('*')
        .eq('aluno_id', userId);
      if (freshEntregas) {
        setEntregas(freshEntregas);
      }

      // Automatically complete the lesson in progress map when activity/quiz is delivered
      if (selectedAula && !isLessonCompleted(selectedAula.id)) {
        await handleToggleCompletion(selectedAula.id, true);
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

  const unlockedAchievementsCount = achievements.filter(achievement => achievement.unlocked).length;

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
      <div className="product-panel mx-auto flex min-h-[360px] max-w-2xl flex-col items-center justify-center space-y-4 p-8 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <div>
          <h2 className="font-heading text-lg font-extrabold text-on-surface">Preparando sua jornada</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Carregando aulas, progresso e próximos compromissos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-panel mx-auto max-w-lg space-y-4 border-error/25 bg-error-container/10 p-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-product-control bg-error/10 text-error">
          <HugeiconsIcon icon={Alert01Icon} size={28} />
        </div>
        <h2 className="font-heading text-xl font-extrabold text-on-surface">Não foi possível carregar seu painel</h2>
        <p className="text-sm leading-relaxed text-on-surface-variant">{error}</p>
        <button
          onClick={fetchData}
          className="product-primary-action"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="product-panel mx-auto max-w-xl space-y-6 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-product-card bg-primary/10 text-primary">
          <HugeiconsIcon icon={BookOpen01Icon} size={28} />
        </div>
        <div className="space-y-2">
          <span className="product-eyebrow mx-auto">Aguardando vínculo</span>
          <h2 className="font-heading text-2xl font-extrabold text-on-surface">Nenhuma turma vinculada</h2>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            Olá! Parece que você ainda não está vinculado a nenhuma turma na plataforma.
          </p>
          <p className="text-sm text-on-surface-variant">
            Entre em contato com o seu professor ou administrador para solicitar o ingresso em uma turma.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={fetchData}
            className="product-primary-action"
          >
            Verificar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="product-panel mx-auto max-w-xl space-y-6 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-product-card bg-secondary/10 text-secondary">
          <HugeiconsIcon icon={BookOpen01Icon} size={28} />
        </div>
        <div className="space-y-2 text-center">
          <span className="inline-flex rounded-full border border-outline-variant/70 bg-surface-container-low px-3 py-1.5 text-xs font-bold text-on-surface-variant">
            Turma: {turma.nome}
          </span>
          <h2 className="font-heading text-2xl font-extrabold text-on-surface">Aguardando curso</h2>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            Sua turma <span className="font-bold text-on-surface">{turma.nome}</span> ainda não tem nenhum curso ativo atribuído.
          </p>
          <p className="text-sm text-on-surface-variant">
            Fique atento! Assim que o professor liberar os materiais do curso, eles aparecerão automaticamente aqui.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={fetchData}
            className="product-primary-action"
          >
            Atualizar conteúdos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-page animate-fade-in" data-initial-view={initialViewMode}>


      {/* VIEW 1: STUDENT DASHBOARD */}
      {view === 'dashboard' ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Welcome & Progress Row */}
          <section id="welcome-section" className="product-card p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
                  <HugeiconsIcon icon={BookOpen01Icon} size={22} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary">Painel do estudante</span>
                  <h1 className="mt-1 font-heading text-xl font-extrabold leading-tight tracking-[-0.025em] text-on-surface sm:text-2xl">
                    Olá, {userName}!
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                    Acompanhe seu progresso e continue de onde parou.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      {curso.titulo}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-bold text-on-surface-variant">
                      Turma {turma.nome}
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary">
                        Modo de visualização
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* General Progress Card Widget */}
              <div className="rounded-product-control border border-outline-variant/70 bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-on-surface-variant">Progresso geral</span>
                  <strong className="font-heading text-2xl font-extrabold text-primary">{percentComplete}%</strong>
                </div>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-container-highest shadow-inner"
                  role="progressbar"
                  aria-label="Progresso geral do curso"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percentComplete}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-secondary transition-all duration-500 ease-out"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3 text-xs font-semibold text-on-surface-variant">
                  <span>{completedAulasCount} de {totalAulasCount} aulas concluídas</span>
                  <span>{Math.max(totalAulasCount - completedAulasCount, 0)} restantes</span>
                </div>
              </div>
            </div>
          </section>

          {/* Learning summary */}
          <section aria-label="Resumo da sua aprendizagem" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
                <HugeiconsIcon icon={BookOpen01Icon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Aulas concluídas</span>
                <strong className="product-metric-value">{completedAulasCount}<span className="text-sm text-on-surface-variant">/{totalAulasCount}</span></strong>
              </div>
            </div>
            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-secondary/10 text-secondary">
                <HugeiconsIcon icon={TaskDone01Icon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Atividades</span>
                <strong className="product-metric-value">{entregas.length}</strong>
              </div>
            </div>
            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-orange-500/10 text-orange-600">
                <HugeiconsIcon icon={FireIcon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Ofensiva atual</span>
                <strong className="product-metric-value">{profile?.ofensiva_atual ?? 0}<span className="ml-1 text-sm text-on-surface-variant">dias</span></strong>
              </div>
            </div>
            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-gradient-to-br ${ligaUsuario.cor} text-white shadow-sm`}>
                <HugeiconsIcon icon={ligaUsuario.icon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">{ligaUsuario.nome}</span>
                <strong className="product-metric-value">{studentXP}<span className="ml-1 text-sm text-on-surface-variant">XP</span></strong>
              </div>
            </div>
          </section>

          {/* Academic Situation / Finalized Class Banner */}
          {profile?.situacao_final && profile.situacao_final !== 'cursando' && (
            <div className={`flex flex-col items-start justify-between gap-4 rounded-product-card border p-5 shadow-product-card animate-in fade-in duration-300 sm:flex-row sm:items-center ${
              profile.situacao_final === 'aprovado'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : profile.situacao_final === 'reprovado'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-product-control border ${
                  profile.situacao_final === 'aprovado'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                    : profile.situacao_final === 'reprovado'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                    : 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                }`}>
                  <HugeiconsIcon icon={Award01Icon} size={26} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base leading-tight">
                    {profile.situacao_final === 'aprovado' && '🎉 Parabéns! Você foi Aprovado(a) no Curso!'}
                    {profile.situacao_final === 'reprovado' && 'Aviso de Conclusão de Turma: Reprovado(a)'}
                    {profile.situacao_final === 'desistente' && 'Aviso de Conclusão de Turma: Desistente'}
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5">
                    {profile.situacao_final === 'aprovado' && 'Sua dedicação deu resultado! A turma foi finalizada e sua aprovação foi registrada na ata oficial.'}
                    {profile.situacao_final === 'reprovado' && 'A turma foi finalizada. Para dúvidas sobre recuperação ou novas oportunidades, procure o seu professor ou coordenação.'}
                    {profile.situacao_final === 'desistente' && 'A turma foi concluída. Caso queira retomar seus estudos em um novo período, procure a secretaria.'}
                  </p>
                </div>
              </div>

              {profile.situacao_final === 'aprovado' && (
                <button
                  type="button"
                  onClick={() => dispararCelebracao()}
                  className="product-secondary-action shrink-0 border-emerald-600/30 text-emerald-700 hover:bg-emerald-600/10 dark:text-emerald-300"
                >
                  Comemorar! 🎊
                </button>
              )}
            </div>
          )}

          {/* Main Content & Sidebar Grid */}
          <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
            
            {/* Left Column: Main Course Trail (8 Columns) */}
            <div className="flex flex-col gap-9 lg:col-span-8">
              
              {/* Continuing Watching Banner */}
              {resumeLesson && (
                <section aria-labelledby="continue-learning-title">
                  <div className="product-card group overflow-hidden p-0 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-product-elevated">
                    <div className="grid md:grid-cols-[minmax(0,1fr)_190px]">
                      <div className="p-5 sm:p-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary">
                          <HugeiconsIcon icon={PlayCircleIcon} size={15} strokeWidth={2} />
                          {percentComplete === 100 ? 'Revisar conteúdo' : 'Continuar assistindo'}
                        </span>
                        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{curso.titulo}</p>
                        <h2 id="continue-learning-title" className="mt-1.5 max-w-2xl font-heading text-xl font-extrabold leading-tight tracking-[-0.025em] text-on-surface sm:text-2xl">
                          Aula {resumeLesson.numero_aula}: {resumeLesson.titulo}
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">
                          {resumeLesson.tipo === 'quiz'
                            ? 'Resolva as questões do quiz para consolidar o conteúdo e avançar na trilha.'
                            : percentComplete === 100
                              ? 'Seu curso está completo. Você pode rever esta aula sempre que quiser.'
                              : 'Retome seus estudos exatamente do ponto em que parou.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenAula(resumeLesson)}
                          className="product-primary-action mt-5"
                        >
                          <HugeiconsIcon icon={PlayCircleIcon} size={19} strokeWidth={2} />
                          {percentComplete === 100 ? 'Revisar aula' : 'Continuar aula'}
                        </button>
                      </div>

                      <div className="relative flex min-h-[150px] items-center justify-center overflow-hidden border-t border-outline-variant/70 bg-surface-container-low p-5 md:min-h-full md:border-l md:border-t-0">
                        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
                        <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-secondary/10 blur-2xl" />
                        <div
                          className="relative flex h-24 w-24 items-center justify-center rounded-full p-1 shadow-xl transition-transform duration-300 group-hover:scale-105"
                          style={{
                            background: `conic-gradient(rgb(var(--color-secondary)) ${percentComplete}%, rgb(var(--color-outline-variant) / 0.65) 0)`,
                          }}
                        >
                          <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-outline-variant/70 bg-surface-container-lowest text-on-surface">
                            <HugeiconsIcon icon={PlayCircleIcon} size={30} strokeWidth={2} className="text-secondary" />
                            <span className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">Aula {resumeLesson.numero_aula}</span>
                          </div>
                        </div>
                        <span className="absolute bottom-3 right-3 rounded-full bg-surface-container-high px-2 py-1 text-[10px] font-bold text-on-surface-variant">
                          {percentComplete}% concluído
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Achievements Row */}
              <section id="achievements-section" aria-labelledby="achievements-title">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <span className="product-section-kicker">Sua evolução</span>
                    <h2 id="achievements-title" className="product-section-heading">Conquistas recentes</h2>
                  </div>
                  <button 
                    onClick={handleGoToAchievements}
                    className="inline-flex min-h-11 items-center gap-1 rounded-product-control px-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
                  >
                    Ver todas
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
              <section id="trail-section" aria-labelledby="trail-title">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <span className="product-section-kicker">Conteúdo do curso</span>
                    <h2 id="trail-title" className="product-section-heading">Trilha de aprendizado</h2>
                  </div>
                  <span className="rounded-full border border-outline-variant/70 bg-surface-container-low px-3 py-1.5 text-xs font-bold text-on-surface-variant">
                    {processedModulos.length} {processedModulos.length === 1 ? 'módulo' : 'módulos'}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {processedModulos.length === 0 ? (
                    <div className="product-empty-state">
                      <HugeiconsIcon icon={BookOpen01Icon} size={26} strokeWidth={2} className="mb-2 text-primary" />
                      <strong className="font-heading text-sm text-on-surface">Nenhum módulo disponível</strong>
                      <span className="mt-1 text-sm">O conteúdo aparecerá aqui assim que for liberado.</span>
                    </div>
                  ) : (
                    processedModulos.map((modulo) => {
                      const percentModulo = modulo.total > 0 ? Math.round((modulo.completed / modulo.total) * 100) : 0;

                      let circleStyle = 'border-outline-variant/60 bg-surface-container-high text-on-surface-variant';
                      let textStyle = 'text-on-surface-variant';
                      let badgeStyle = 'border-outline-variant/60 bg-surface-container-high text-on-surface-variant';
                      let badgeText = 'Bloqueado';
                      let barStyle = 'bg-outline-variant';
                      let Icon = ModuleLockIcon;

                      if (modulo.status === 'CONCLUÍDO') {
                        circleStyle = 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600';
                        textStyle = 'text-on-surface';
                        badgeStyle = 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
                        badgeText = 'Concluído';
                        barStyle = 'bg-emerald-500';
                        Icon = RocketModuleIcon;
                      } else if (modulo.status === 'EM PROGRESSO') {
                        circleStyle = 'border-primary/20 bg-primary/10 text-primary';
                        textStyle = 'text-on-surface';
                        badgeStyle = 'border-primary/20 bg-primary/10 text-primary';
                        badgeText = 'Em Progresso';
                        barStyle = 'bg-primary';
                        Icon = ArchitectureIcon;
                      }

                      const isExpanded = !!expandedModulos[modulo.id];
                      const moduloAulas = aulas.filter(a => a.modulo_id === modulo.id);

                      return (
                        <div 
                          key={modulo.id}
                          className={`product-card overflow-hidden p-5 sm:p-6 ${
                            modulo.status !== 'BLOQUEADO' 
                              ? 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-product-elevated'
                              : 'bg-surface-container-lowest'
                          }`}
                        >
                          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                            <div className="flex min-w-0 items-start gap-4">
                              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-product-control border shadow-sm ${circleStyle}`}>
                                <Icon />
                              </div>
                              <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <h3 className={`font-heading text-base font-extrabold leading-tight sm:text-lg ${textStyle}`}>{modulo.titulo}</h3>
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${badgeStyle}`}>
                                    {badgeText}
                                  </span>
                                </div>
                                <p className="mb-4 text-sm font-medium leading-relaxed text-on-surface-variant">
                                  {modulo.status === 'BLOQUEADO'
                                    ? 'Complete o módulo anterior para desbloquear.'
                                    : `${modulo.total} aula${modulo.total !== 1 ? 's' : ''} neste módulo`}
                                </p>

                                <div className="flex flex-wrap items-center gap-2">
                                  {modulo.status === 'EM PROGRESSO' && modulo.nextLesson && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAula(modulo.nextLesson!)}
                                      className="inline-flex min-h-10 items-center gap-2 rounded-product-control bg-primary/10 px-3 text-left text-xs font-bold text-primary transition-colors hover:bg-primary/15"
                                    >
                                      <HugeiconsIcon icon={PlayCircleIcon} size={16} />
                                      Continuar na aula {modulo.nextLesson.numero_aula}
                                    </button>
                                  )}

                                  {modulo.status !== 'BLOQUEADO' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenModulo(modulo)}
                                      className="inline-flex min-h-10 items-center gap-1.5 rounded-product-control px-3 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-high"
                                    >
                                      Abrir módulo
                                      <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={2} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => toggleModulo(modulo.id)}
                                    className="inline-flex min-h-10 items-center gap-1.5 rounded-product-control px-3 text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                                    aria-expanded={isExpanded}
                                    aria-controls={`module-lessons-${modulo.id}`}
                                  >
                                    {isExpanded ? 'Ocultar aulas' : 'Ver aulas'}
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
                            <div className="flex min-w-[200px] flex-col gap-2 border-t border-outline-variant/40 pt-4 md:border-0 md:pt-0">
                              <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                                <span>Progresso do módulo</span>
                                <span className={modulo.status === 'CONCLUÍDO' ? 'text-emerald-600 dark:text-emerald-300' : modulo.status === 'EM PROGRESSO' ? 'text-primary' : 'text-on-surface-variant'}>
                                  {modulo.completed}/{modulo.total} aulas
                                </span>
                              </div>
                              <div
                                className="h-2.5 overflow-hidden rounded-full bg-surface-container-high"
                                role="progressbar"
                                aria-label={`Progresso do módulo ${modulo.titulo}`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={modulo.status === 'BLOQUEADO' ? 0 : percentModulo}
                              >
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
                              id={`module-lessons-${modulo.id}`}
                              className="mt-6 space-y-2 border-t border-outline-variant/40 pt-6"
                            >
                              <h4 className="mb-3 font-heading text-sm font-extrabold text-on-surface">Aulas deste módulo</h4>
                              {moduloAulas.length === 0 ? (
                                <p className="text-sm italic text-on-surface-variant">Nenhuma aula cadastrada neste módulo.</p>
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
                                  let statusColor = 'text-on-surface-variant';
                                  
                                  if (!isLiberada) {
                                    statusText = 'Aguardando Liberação';
                                    statusColor = 'text-amber-500 font-bold';
                                  } else if (completed) {
                                    statusText = 'Concluído';
                                    statusColor = 'text-emerald-600 font-bold dark:text-emerald-300';
                                  } else if (unlocked) {
                                    statusText = 'Disponível';
                                    statusColor = 'text-primary font-bold';
                                  }

                                  const typesList: string[] = [];
                                  if (aula.video_url) typesList.push('Vídeo');
                                  if (hasStandardQuizQuestions(aula.questoes)) typesList.push('Quiz');
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
                                        handleOpenAula(aula);
                                      }}
                                      className={`flex min-h-14 w-full items-start justify-between gap-3 rounded-product-control border p-3.5 text-left transition-all sm:items-center ${
                                        unlocked
                                          ? 'cursor-pointer border-outline-variant/60 bg-surface-container-lowest shadow-sm hover:border-primary/30 hover:bg-primary/5'
                                          : 'cursor-not-allowed border-outline-variant/30 bg-surface-container-low opacity-70'
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
                                            ) : hasStandardQuizQuestions(aula.questoes) ? (
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
                                          <p className={`truncate font-sans text-sm font-bold ${unlocked ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                                            Aula {aula.numero_aula}: {aula.titulo}
                                          </p>
                                          <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">
                                            {typeLabel} {aula.duracao ? `• ${aula.duracao}` : ''}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <span className={`hidden text-[11px] font-bold uppercase tracking-wide sm:inline ${statusColor}`}>
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
            <aside className="flex flex-col gap-6 lg:col-span-4" aria-label="Informações complementares">

              {/* Arena Live Widget */}
              <section className="product-card p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control shadow-sm ring-4 ring-primary/10"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary))',
                      color: 'rgb(var(--color-on-primary))',
                    }}
                  >
                    <HugeiconsIcon
                      icon={GameControllerIcon}
                      size={20}
                      strokeWidth={2.25}
                      color="rgb(var(--color-on-primary))"
                      primaryColor="rgb(var(--color-on-primary))"
                      secondaryColor="rgb(var(--color-on-primary))"
                      disableSecondaryOpacity
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="product-section-kicker">Experiência ao vivo</span>
                    <h2 className="mt-0.5 font-heading text-base font-extrabold text-on-surface">Arena Estudea</h2>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-on-surface-variant">
                      Entre com o PIN enviado pelo professor e jogue com sua turma.
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={onStartArena}
                  className="product-primary-action mt-4 w-full !min-h-10 !py-2 !text-xs"
                >
                  <HugeiconsIcon icon={GameControllerIcon} size={16} strokeWidth={2} />
                  Entrar na Arena
                </button>
              </section>

              {/* Study Calendar Widget */}
              <section className="product-card p-5 sm:p-6" aria-labelledby="study-agenda-title">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="product-section-kicker">Próximos compromissos</span>
                    <h2 id="study-agenda-title" className="product-section-heading">Agenda de estudos</h2>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-product-control bg-primary/10 text-primary">
                    <HugeiconsIcon icon={Calendar01Icon} size={20} strokeWidth={2} className="text-primary" />
                  </div>
                </div>
                <div className={schedule.length > 0 ? 'divide-y divide-outline-variant/50' : ''}>
                  {schedule.length === 0 ? (
                    <div className="rounded-product-control border border-dashed border-outline-variant/70 bg-surface-container-low p-4 text-center text-sm text-on-surface-variant">
                      Nenhum evento agendado.
                    </div>
                  ) : (
                    schedule.map((item) => {
                      const accent = getAgendaAccent(item.type);

                      return (
                        <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                          <div className={`mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${accent.text}`}>
                            <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
                            {formatAgendaDate(item.event_date)} • {item.time}
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white ${
                              item.type === 'live' ? 'bg-red-500' :
                              item.type === 'exam' ? 'bg-red-600' :
                              item.type === 'deadline' ? 'bg-orange-500' :
                              item.type === 'mentorship' ? 'bg-purple-600' :
                              'bg-emerald-600'
                            }`}>
                              {accent.label}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-on-surface">{item.title}</div>
                          <div className="mt-1 truncate text-xs text-on-surface-variant">
                            {item.cohort} • {item.duration}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Community activity feed */}
              <section className="product-card p-5 sm:p-6" aria-labelledby="community-title">
                <span className="product-section-kicker">Sua turma</span>
                <h2 id="community-title" className="product-section-heading mb-5">Movimento da comunidade</h2>
                <div className="divide-y divide-outline-variant/50">
                  <div className="flex items-start gap-3 pb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-xs font-bold text-primary">
                      MR
                    </div>
                    <div>
                      <p className="text-sm text-on-surface">
                        <span className="font-bold">Maria R.</span> acabou de concluir o módulo{' '}
                        <span className="font-medium text-primary">Introdução ao Sistema</span>.
                      </p>
                      <span className="mt-1 block text-xs text-on-surface-variant">Há 2 horas</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pt-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-product-control bg-secondary/10 text-xs font-bold text-secondary">
                      PL
                    </div>
                    <div>
                      <p className="text-sm text-on-surface">
                        <span className="font-bold">Pedro L.</span> alcançou a conquista{' '}
                        <span className="font-medium text-secondary">Estudioso</span>.
                      </p>
                      <span className="mt-1 block text-xs text-on-surface-variant">Há 5 horas</span>
                    </div>
                  </div>
                </div>
              </section>

            </aside>

          </div>

        </div>
      ) : view === 'module_trail' && selectedModulo ? (
        
        /* VIEW 4: MODULE ROADMAP & DETAILS VIEW */
        <div className="space-y-6 animate-fade-in pb-12">
          {/* Module Header Section */}
          <header className="product-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoToDashboard}
                className="product-icon-action !h-9 !w-9"
                title="Voltar para o Dashboard"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} />
              </button>
              <div>
                <span className="product-section-kicker">
                  Módulo
                </span>
                <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">{selectedModulo.titulo}</h1>
                <p className="product-subtitle">
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
                <div className="bg-surface-container-low border border-outline-variant/60 rounded-product-control p-4 w-full md:w-auto md:min-w-[320px] shrink-0">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-xs text-on-surface-variant uppercase tracking-wide">Progresso do Módulo</span>
                    <span className="text-xl font-extrabold text-primary font-mono">{percentModulo}%</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500 ease-out" 
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
          </header>

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
                    onClick={() => handleOpenAula(targetLesson)}
                    className="product-card p-5 hover-lift relative overflow-hidden group min-h-[160px] cursor-pointer"
                  >
                    <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent z-0"></div>
                    <div className="relative z-20 flex flex-col h-full justify-between">
                      <div>
                        <span className="inline-block px-3 py-1 bg-surface-container-low text-primary font-bold text-xs rounded-product-control mb-3 border border-outline-variant/60 uppercase tracking-wider">
                          {isCompleted ? 'Módulo Concluído!' : 'Continuar Módulo'}
                        </span>
                        <h3 className="product-section-heading mt-0 text-base sm:text-lg max-w-lg">
                          {isCompleted ? 'Todas as aulas concluídas!' : `Próxima Aula: Aula ${targetLesson.numero_aula} - ${targetLesson.titulo}`}
                        </h3>
                        <p className="text-on-surface-variant mt-1.5 max-w-md font-medium text-xs">
                          {isCompleted 
                            ? 'Excelente! Você pode reassistir a qualquer aula da lista abaixo.' 
                            : targetLesson.tipo === 'quiz' 
                              ? 'Resolva o quiz para demonstrar seus conhecimentos.' 
                              : 'Continue estudando de onde parou para completar o módulo.'}
                        </p>
                      </div>
                      <div className="mt-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAula(targetLesson);
                          }}
                          className="product-primary-action text-xs"
                        >
                          <HugeiconsIcon icon={PlayCircleIcon} size={16} strokeWidth={2} />
                          <span>{isCompleted ? 'Reassistir Aula' : 'Estudar Agora'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* List of lessons */}
              <div className="space-y-4">
                <h2 className="font-heading font-extrabold text-sm text-on-surface">Roteiro de Aulas</h2>
                  <div className="flex flex-col gap-3">
                  {(() => {
                    const processed = processedModulos.find(m => m.id === selectedModulo.id);
                    const moduloAulas = aulas.filter(a => a.modulo_id === selectedModulo.id);
                    if (moduloAulas.length === 0) {
                      return (
                        <div className="product-empty-state text-center text-on-surface-variant italic">
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
                      if (hasStandardQuizQuestions(aula.questoes)) typesList.push('Quiz');
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
                                ) : hasStandardQuizQuestions(aula.questoes) ? (
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
                  <div className="product-card p-5">
                    <h3 className="font-heading font-extrabold text-sm text-on-surface mb-4">Métricas do Módulo</h3>
                    <div className="flex flex-col gap-4">
                      
                      <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-product-control border border-outline-variant/40">
                        <div className="w-10 h-10 rounded-product-control bg-secondary/10 flex items-center justify-center text-secondary shrink-0 border border-secondary/20">
                          <HugeiconsIcon icon={BookOpen01Icon} size={20} strokeWidth={2} className="text-secondary" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-on-surface-variant">Conclusão de Aulas</div>
                          <div className="text-lg font-extrabold text-on-surface font-mono">
                            {completedInModulo} <span className="text-xs text-on-surface-variant font-medium">de {moduloAulas.length}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-product-control border border-outline-variant/40">
                        <div className="w-10 h-10 rounded-product-control bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                          <HugeiconsIcon icon={Award01Icon} size={20} strokeWidth={2} className="text-primary" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-on-surface-variant">Pontos Acumulados</div>
                          <div className="text-lg font-extrabold text-on-surface font-mono">
                            {completedPoints} <span className="text-xs text-on-surface-variant font-medium">de {totalPoints} XP</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-product-control border border-outline-variant/40">
                        <div className="w-10 h-10 rounded-product-control bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
                          <HugeiconsIcon icon={TaskDone01Icon} size={20} strokeWidth={2} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-on-surface-variant">Atividades Práticas</div>
                          <div className="text-lg font-extrabold text-on-surface font-mono">
                            {completedActivities} <span className="text-xs text-on-surface-variant font-medium">de {activitiesCount}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* Study tips widget */}
              <div className="product-card p-5">
                <h3 className="font-heading font-extrabold text-sm text-on-surface mb-4">Dicas de Estudo</h3>
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
        <div className="product-page animate-fade-in pb-10">
          <section className="product-card p-4 sm:p-5" aria-labelledby="achievements-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={handleGoToDashboard}
                  className="product-icon-action shrink-0 border border-outline-variant/70 bg-surface-container-lowest shadow-sm"
                  title="Voltar para a trilha"
                  aria-label="Voltar para a trilha"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={19} strokeWidth={2} />
                </button>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-secondary/10 text-secondary">
                  <HugeiconsIcon icon={Award01Icon} size={22} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <span className="product-section-kicker">Progresso e recompensas</span>
                  <h1 id="achievements-title" className="product-section-heading mt-0 text-xl sm:text-2xl">Central de Conquistas</h1>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">Medalhas, desafios e sua posição na turma em um só lugar.</p>
                </div>
              </div>

              <button onClick={handleGoToDashboard} className="product-secondary-action w-full shrink-0 sm:w-auto">
                <HugeiconsIcon icon={MapsIcon} size={18} />
                Ver trilha de aprendizado
              </button>
            </div>
          </section>

          <section aria-label="Resumo das conquistas" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <HugeiconsIcon icon={FireIcon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Ofensiva atual</span>
                <strong className="product-metric-value">{profile?.ofensiva_atual ?? 0}<span className="ml-1 text-sm text-on-surface-variant">dias</span></strong>
              </div>
            </div>
            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-secondary/10 text-secondary">
                <HugeiconsIcon icon={Rocket01Icon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Pontuação</span>
                <strong className="product-metric-value">{studentXP}<span className="ml-1 text-sm text-on-surface-variant">XP</span></strong>
              </div>
            </div>
            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Aulas concluídas</span>
                <strong className="product-metric-value">{completedAulasCount}<span className="text-sm text-on-surface-variant">/{totalAulasCount}</span></strong>
              </div>
            </div>
            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
                <HugeiconsIcon icon={Award01Icon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Medalhas liberadas</span>
                <strong className="product-metric-value">{unlockedAchievementsCount}<span className="text-sm text-on-surface-variant">/{achievements.length}</span></strong>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <section className="product-card p-5 sm:p-6" aria-labelledby="daily-challenges-title">
                <div className="flex flex-col gap-3 border-b border-outline-variant/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="product-section-kicker">Metas de hoje</span>
                    <h2 id="daily-challenges-title" className="product-section-heading">Desafios diários</h2>
                  </div>
                  <span className="w-fit rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-primary">Renovados diariamente</span>
                </div>

                <div className="divide-y divide-outline-variant/70">
                  <div className="flex gap-3 py-4 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      <HugeiconsIcon icon={Tick01Icon} size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-heading text-sm font-extrabold text-on-surface">Consistência diária</h3>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Concluído · +10 XP</span>
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">Acesse a plataforma de ensino hoje.</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-label="Consistência diária" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
                        <div className="h-full w-full rounded-full bg-emerald-500" />
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const isCompleted = completedAulasCount > 0;
                    return (
                      <div className="flex gap-3 py-4 sm:gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control ${isCompleted ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                          <HugeiconsIcon icon={isCompleted ? Tick01Icon : PlayCircleIcon} size={18} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-heading text-sm font-extrabold text-on-surface">Foco no aprendizado</h3>
                            <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-primary'}`}>
                              {isCompleted ? 'Concluído · +50 XP' : '0/1 aula · +50 XP'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-on-surface-variant">Conclua pelo menos uma aula da sua trilha hoje.</p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-label="Foco no aprendizado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={isCompleted ? 100 : 0}>
                            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: isCompleted ? '100%' : '0%' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const value = Math.min(completedAulasCount, 3);
                    const isCompleted = value >= 3;
                    const percent = Math.round((value / 3) * 100);
                    return (
                      <div className="flex gap-3 py-4 sm:gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control ${isCompleted ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-secondary/10 text-secondary'}`}>
                          <HugeiconsIcon icon={isCompleted ? Tick01Icon : NotebookIcon} size={18} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-heading text-sm font-extrabold text-on-surface">Dedicação total</h3>
                            <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-on-surface-variant'}`}>
                              {isCompleted ? 'Concluído · +150 XP' : `${value}/3 aulas · +150 XP`}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-on-surface-variant">Conclua 3 aulas para avançar mais rápido no ranking semanal.</p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-label="Dedicação total" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                            <div className="h-full rounded-full bg-secondary transition-all duration-300" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>

              <section className="space-y-4" aria-labelledby="medals-title">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <span className="product-section-kicker">Sua coleção</span>
                    <h2 id="medals-title" className="product-section-heading">Minhas medalhas</h2>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-on-surface-variant">{unlockedAchievementsCount} de {achievements.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        className="product-card flex min-h-[230px] flex-col justify-between gap-5 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-product-control border ${
                            !ach.unlocked
                              ? 'border-outline-variant/70 bg-surface-container-high text-on-surface-variant'
                              : `${ach.bgClass} ${ach.iconClass} border-outline-variant/40 dark:bg-surface-container-high`
                          }`}>
                            <HugeiconsIcon icon={ach.icon as any} size={24} strokeWidth={2} />
                          </div>

                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${
                            ach.unlocked 
                              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'border-outline-variant/70 bg-surface-container-low text-on-surface-variant'
                          }`}>
                            {ach.unlocked ? 'Conquistada' : 'Bloqueada'}
                          </span>
                        </div>

                        <div className="text-left">
                          <h3 className="font-heading text-base font-extrabold text-on-surface">{ach.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{ach.desc}</p>
                        </div>

                        <div className="space-y-2 border-t border-outline-variant/70 pt-4">
                          <div className="flex justify-between gap-3 text-[11px] font-bold text-on-surface-variant">
                            <span>Progresso</span>
                            <span>{currentVal} / {targetVal} {unit}</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-label={`Progresso da medalha ${ach.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${ach.unlocked ? 'bg-secondary' : 'bg-on-surface-variant/30'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="lg:col-span-4">
              <section className="product-card p-5 sm:p-6" aria-labelledby="ranking-title">
                <div className="flex items-center justify-between gap-4 border-b border-outline-variant/70 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-gradient-to-br ${ligaUsuario.cor} text-white shadow-sm`}>
                      <HugeiconsIcon icon={ligaUsuario.icon} size={21} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <span className="product-section-kicker">Ranking semanal</span>
                      <h2 id="ranking-title" className="font-heading text-lg font-extrabold text-on-surface">{ligaUsuario.nome}</h2>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-outline-variant/70 bg-surface-container-low px-2.5 py-1 text-xs font-extrabold text-on-surface">{studentXP} XP</span>
                </div>

                <div className="flex items-start justify-between py-5 text-[11px] font-bold text-on-surface-variant">
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
                      <div key={lIdx} className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
                        {lIdx > 0 && (
                          <div className={`absolute right-1/2 top-[7px] -z-10 h-0.5 w-full ${
                            isPassed ? 'bg-primary' : 'bg-surface-container-highest'
                          }`} />
                        )}
                        <div className={`h-3.5 w-3.5 rounded-full border-2 ${
                          isCurrent 
                            ? 'scale-125 border-primary bg-surface-container-lowest ring-2 ring-primary/25'
                            : isPassed 
                              ? 'border-primary bg-primary'
                              : 'border-outline-variant bg-surface-container-lowest'
                        }`} />
                        <span className={`text-[9px] tracking-tight ${isCurrent ? 'font-extrabold text-primary' : 'font-semibold text-on-surface-variant'}`}>
                          {ligaNome}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-outline-variant/70">
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
                        className={`flex items-center justify-between gap-3 border-b border-outline-variant/70 py-3 last:border-b-0 ${user.isSelf ? '-mx-2 bg-primary/5 px-2' : ''}`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex w-6 shrink-0 items-center justify-center text-center font-heading text-sm font-extrabold text-on-surface-variant">
                            {posBadge}
                          </span>
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="h-9 w-9 shrink-0 rounded-full border border-outline-variant/70 object-cover"
                          />
                          <div className="min-w-0 text-left">
                            <p className={`truncate text-sm text-on-surface ${user.isSelf ? 'font-extrabold text-primary' : 'font-semibold'}`}>
                              {user.name} {user.isSelf && '(Você)'}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                              {position <= 5 ? 'Zona de Promoção' : 'Estável'}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right font-heading text-sm font-extrabold text-on-surface">
                          {user.xp} <span className="text-[10px] text-on-surface-variant font-medium">XP</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2 border-t border-outline-variant/70 pt-4 text-xs font-medium leading-relaxed text-on-surface-variant">
                  <HugeiconsIcon icon={FireIcon} size={16} className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
                  <span>
                    <strong className="text-on-surface">Fique no Top 5</strong> para subir de liga no fim de semana e liberar novas conquistas.
                  </span>
                </div>
              </section>
            </aside>
          </div>
        </div>
      ) : (
        
        /* VIEW 2: DETAILED LESSON INTERACTIVE VIEWER */
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Action: Back to Dashboard & Sidebar Toggle */}
          <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  if (selectedModulo) {
                    handleOpenModulo(selectedModulo);
                  } else {
                    handleGoToDashboard();
                  }
                }}
                className="product-secondary-action text-xs"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
                <span>Voltar para a Trilha</span>
              </button>
              
              <button
                onClick={() => setLessonSidebarOpen(prev => !prev)}
                className="product-secondary-action text-xs hidden lg:inline-flex items-center gap-2"
                title={lessonSidebarOpen ? "Ocultar Grade do Curso" : "Mostrar Grade do Curso"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
                <span>{lessonSidebarOpen ? 'Ocultar Grade' : 'Mostrar Grade'}</span>
              </button>
            </div>
            
            <div className="text-xs text-on-surface-variant font-bold">
              Curso: {curso.titulo}
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Sidebar Timeline navigation inside Lesson View (4 Columns) */}
            {lessonSidebarOpen && (
              <div className="lg:col-span-4 product-card p-5 space-y-4 h-[650px] flex flex-col">
                <h3 className="font-heading font-extrabold text-sm text-on-surface pb-3 border-b border-outline-variant/60 flex items-center gap-2">
                  <HugeiconsIcon icon={BookOpen01Icon} size={18} className="text-primary" strokeWidth={2} />
                  <span>Conteúdo do Curso</span>
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
                            else if (hasStandardQuizQuestions(aula.questoes)) icon = Quiz01Icon;
                            else if (aula.arquivo_url) icon = BookOpen01Icon;

                            return (
                              <div key={aula.id} className="space-y-1">
                                <button
                                  onClick={() => handleOpenAula(aula)}
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
                  <div className="product-card p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/60">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-extrabold text-on-surface-variant uppercase font-mono tracking-wider bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant/40">
                            Aula {selectedAula.numero_aula}
                          </span>
                          {selectedAula.video_url && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                              Vídeo
                            </span>
                          )}
                          {standardQuizQuestions.length > 0 && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                              Quiz
                            </span>
                          )}
                          {selectedAula.arquivo_url && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              Material
                            </span>
                          )}
                          {!selectedAula.video_url && standardQuizQuestions.length === 0 && !selectedAula.arquivo_url && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Leitura
                            </span>
                          )}
                        </div>
                        <h3 className="product-section-heading mt-0 text-base sm:text-lg">
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
                      {standardQuizQuestions.length > 0 && (
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

                        {(selectedAula.arquivo_url || (selectedAula.aula_materiais?.length || 0) > 0) && (
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

                        {standardQuizQuestions.length > 0 && (
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
                          selectedAula.atividades.length === 1 ? (
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
                          ) : (
                            selectedAula.atividades.map((act) => {
                              const isSelected = activeLessonTab === act.id;
                              const label = getAtividadeTabLabel(act, selectedAula.atividades || []);
                              const actEntrega = entregas.find(e => e.atividade_id === act.id);
                              
                              return (
                                <button
                                  key={act.id}
                                  onClick={() => setActiveLessonTab(act.id)}
                                  className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 font-heading text-label-md font-extrabold rounded-xl transition-all duration-200 relative ${
                                    isSelected
                                      ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                                      : 'text-on-surface hover:text-primary hover:bg-surface-container-high/60'
                                  }`}
                                >
                                  <HugeiconsIcon icon={act.tipo_entrega === 'quiz' ? Quiz01Icon : CheckmarkCircle02Icon} size={18} strokeWidth={2.5} />
                                  <span>{label}</span>
                                  {(() => {
                                    if (!actEntrega) {
                                      return <span className="flex h-2.5 w-2.5 rounded-full bg-secondary animate-pulse" />;
                                    }
                                    if (actEntrega.nota !== null) {
                                      return <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />;
                                    }
                                    return <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />;
                                  })()}
                                </button>
                              );
                            })
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Main media & theoretical content */}
                  {!aulasLiberadas.includes(selectedAula.id) ? (
                    <div className="product-card p-8 text-center space-y-6 flex flex-col items-center justify-center animate-fade-in">
                      <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full flex items-center justify-center shadow-xs">
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <div className="max-w-md space-y-1.5">
                        <h4 className="font-heading font-extrabold text-base text-on-surface">Conteúdo Bloqueado</h4>
                        <p className="text-xs text-on-surface-variant font-medium">
                          Esta aula foi cadastrada pelo professor, mas ainda não está liberada para acesso dos alunos. Aguarde a liberação.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (selectedModulo) {
                            handleOpenModulo(selectedModulo);
                          } else {
                            handleGoToDashboard();
                          }
                        }}
                        className="product-secondary-action text-xs"
                      >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
                        <span>Voltar para a Trilha</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Tab 1: Conteúdo (Vídeo + Conteúdo Teórico) */}
                      {activeLessonTab === 'conteudo' && (() => {
                        const parsed = parseLessonConteudo(selectedAula.conteudo || '', selectedAula.tipo);
                        return (
                          <div className="product-card p-5 sm:p-6 space-y-6 animate-fade-in">
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
                                        return <h4 key={pIdx} className="font-heading font-extrabold text-sm text-on-surface pt-6 pb-2 border-b border-outline-variant/40">{renderFormattedText(trimmed.replace('##', '').trim())}</h4>;
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

                      {activeLessonTab === 'arquivos' && (selectedAula.aula_materiais?.length || 0) > 0 && (
                        <div className="product-card p-5 sm:p-6 space-y-4 animate-fade-in">
                          <h4 className="font-heading font-extrabold text-body-lg text-on-surface flex items-center gap-2">
                            <HugeiconsIcon icon={BookOpen01Icon} size={18} className="text-primary" />
                            Materiais da aula
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedAula.aula_materiais?.map((material) => (
                              <a
                                key={material.id}
                                href={material.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start justify-between gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 hover:border-primary/40 hover:bg-primary/5 transition-all"
                              >
                                <div>
                                  <p className="font-heading font-bold text-on-surface">{material.titulo}</p>
                                  <p className="mt-1 text-xs text-on-surface-variant">
                                    {material.uso.replaceAll('_', ' ')} · {material.tipo}
                                    {material.obrigatorio ? ' · obrigatório' : ''}
                                  </p>
                                </div>
                                <HugeiconsIcon icon={ArrowRight01Icon} size={17} className="text-primary shrink-0 mt-1" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tab 2: material legado — PDF inline viewer ou download */}
                      {activeLessonTab === 'arquivos' && selectedAula.arquivo_url && (() => {
                        const embedInfo = getArquivoEmbedInfo(selectedAula.arquivo_url);

                        if (embedInfo) {
                          // ─── PDF / Google Drive: mostra viewer inline ───
                          return (
                            <div className="product-card p-5 space-y-4 animate-fade-in">
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
                          <div className="product-card p-5 sm:p-6 space-y-6 animate-fade-in">
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
                      {activeLessonTab === 'quiz' && standardQuizQuestions.length > 0 && (
                        <div className="product-card p-5 sm:p-6 space-y-6 animate-fade-in">
                          <h4 className="font-heading font-extrabold text-body-lg text-on-surface pb-2 border-b border-outline-variant/20 flex items-center gap-2">
                            <HugeiconsIcon icon={Quiz01Icon} size={18} className="text-secondary" />
                            Questões do Quiz
                          </h4>

                          {standardQuizQuestions.map((q, idx) => (
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
                                disabled={standardQuizQuestions.some(q => !quizAnswers[q.id] || !quizAnswers[q.id].trim())}
                                className={`px-6 py-3 rounded-lg font-heading font-bold text-body-md flex items-center gap-2 transition-all ${
                                  !standardQuizQuestions.some(q => !quizAnswers[q.id] || !quizAnswers[q.id].trim())
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
                                  <h4 className="font-heading font-extrabold text-sm text-emerald-700">Questionário Respondido!</h4>
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
                                  <h4 className="font-heading font-extrabold text-sm text-emerald-700">Parabéns! Você passou!</h4>
                                  <p className="text-on-surface-variant text-label-md">
                                    Seu aproveitamento: <span className="font-bold text-emerald-600 font-mono text-body-lg">{quizScore}%</span> (Nota mínima: {selectedAula.nota_aprovacao}%)
                                  </p>
                                  <p className="text-label-sm text-on-surface-variant/80">Esta aula foi automaticamente marcada como concluída.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                                    <HugeiconsIcon icon={Tick01Icon} size={32} strokeWidth={3} />
                                  </div>
                                  <h4 className="font-heading font-extrabold text-sm text-on-surface">Quiz Respondido!</h4>
                                  <p className="text-on-surface-variant text-label-md">
                                    Seu aproveitamento: <span className="font-bold text-on-surface font-mono text-body-lg">{quizScore}%</span> (Nota de referência: {selectedAula.nota_aprovacao}%)
                                  </p>
                                  <p className="text-label-sm text-emerald-600 font-semibold flex items-center justify-center gap-1">
                                    <HugeiconsIcon icon={Tick01Icon} size={14} strokeWidth={3} />
                                    Esta aula foi registrada como concluída com sucesso!
                                  </p>
                                  <button
                                    onClick={() => {
                                      setQuizAnswers({});
                                      setQuizSubmitted(false);
                                      setQuizScore(null);
                                      setQuizPassed(null);
                                    }}
                                    className="mt-3 px-5 py-2 bg-secondary text-on-secondary font-bold font-heading rounded-lg hover:bg-secondary-container transition-all"
                                  >
                                    Tentar Novamente para Melhorar Nota
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab 4: Atividade Prática */}
                      {selectedAula.atividades && selectedAula.atividades.length > 0 && (
                        selectedAula.atividades.map((atividade) => {
                          const isSingle = (selectedAula.atividades || []).length === 1;
                          const shouldShow = (isSingle && activeLessonTab === 'atividade') || (activeLessonTab === atividade.id);
                          if (!shouldShow) return null;

                          const exactEntrega = entregas.find(e => e.atividade_id === atividade.id);
                          const canRedo = exactEntrega && (atividade.permite_refazer !== false) && exactEntrega.nota === null;
                          const isRedoing = isRedoingActivity[atividade.id] || false;
                          
                          const activeQuestions = getActivityQuizQuestions(selectedAula.questoes, atividade.id);

                          const tabLabel = isSingle ? 'Atividade Prática' : getAtividadeTabLabel(atividade, selectedAula.atividades || []);

                          return (
                            <div key={atividade.id} className="product-card p-5 sm:p-6 space-y-5 animate-fade-in">
                              <h4 className="font-heading font-extrabold text-body-lg text-on-surface pb-3 border-b border-outline-variant/20 flex items-center gap-2">
                                <HugeiconsIcon icon={atividade.tipo_entrega === 'quiz' ? Quiz01Icon : CheckmarkCircle02Icon} size={18} className="text-secondary" />
                                {tabLabel}
                              </h4>

                              <div className="space-y-4">
                                {/* Support material download link */}
                                {atividade.material_url && (
                                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between gap-3 text-body-md animate-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2.5 text-primary min-w-0">
                                      <HugeiconsIcon icon={Attachment01Icon} size={20} className="shrink-0 text-primary" />
                                      <div className="min-w-0">
                                        <p className="font-heading font-bold text-on-surface leading-tight">
                                          Material de Apoio da Atividade
                                        </p>
                                        <p className="text-[11px] text-on-surface-variant truncate mt-0.5 max-w-md">
                                          {atividade.material_url}
                                        </p>
                                      </div>
                                    </div>
                                    <a
                                      href={atividade.material_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="product-primary-action !py-2 !px-3.5 !text-[11px] shrink-0 flex items-center gap-1.5"
                                    >
                                      <HugeiconsIcon icon={Download01Icon} size={14} />
                                      Acessar / Baixar
                                    </a>
                                  </div>
                                )}

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
                                              {exactEntrega.resposta.match(/\.(jpeg|jpg|gif|png|webp)/i) || exactEntrega.resposta.includes('atividades') ? (
                                                <img src={exactEntrega.resposta} alt="Envio do aluno" className="max-h-40 object-cover" />
                                              ) : (
                                                <a href={exactEntrega.resposta} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs flex items-center gap-1 mt-1">
                                                  <HugeiconsIcon icon={Download01Icon} size={14} />
                                                  Baixar arquivo
                                                </a>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : atividade.tipo_entrega === 'arquivo' ? (
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-surface p-3 rounded-xl border border-outline-variant/30 text-left">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <HugeiconsIcon icon={File01Icon} size={20} className="text-primary shrink-0" />
                                            <span className="text-xs text-on-surface-variant font-mono truncate">{exactEntrega.resposta}</span>
                                          </div>
                                          <a href={exactEntrega.resposta} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs whitespace-nowrap shrink-0 flex items-center gap-1">
                                            <HugeiconsIcon icon={Download01Icon} size={14} />
                                            Baixar arquivo
                                          </a>
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
                                                    <p className="text-[10px] text-on-surface-variant font-mono font-bold uppercase">Anexo Enviado:</p>
                                                    <div className="space-y-2">
                                                      <p className="text-label-sm font-mono truncate bg-surface p-2 rounded border border-outline-variant/30">{payload.imagem}</p>
                                                      {payload.imagem.startsWith('http') && (
                                                        <div className="max-w-xs border border-outline-variant/40 rounded overflow-hidden mt-1">
                                                          {payload.imagem.match(/\.(jpeg|jpg|gif|png|webp)/i) || payload.imagem.includes('atividades') ? (
                                                            <img src={payload.imagem} alt="Envio do aluno" className="max-h-40 object-cover" />
                                                          ) : (
                                                            <a href={payload.imagem} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs flex items-center gap-1 p-2 bg-surface border border-outline-variant/35 rounded-lg mt-1">
                                                              <HugeiconsIcon icon={Download01Icon} size={14} />
                                                              Baixar arquivo
                                                            </a>
                                                          )}
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
                                                    const alunoResp = getStudentAnswerForQuestion(payload, q, qIdx);
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
                                    <div className="space-y-1.5 text-left">
                                      <label className="text-label-sm font-semibold text-on-surface">
                                        {atividade.tipo_entrega === 'texto' 
                                          ? 'Escreva sua resposta para a atividade:' 
                                          : atividade.tipo_entrega === 'quiz'
                                            ? 'Responda as questões do quiz abaixo:'
                                            : atividade.tipo_entrega === 'multipla'
                                              ? 'Preencha os campos abaixo (texto e anexo) para entrega:'
                                              : atividade.tipo_entrega === 'imagem'
                                                ? 'Selecione uma imagem ou insira o link para entrega:'
                                                : 'Selecione o arquivo ou insira o link para entrega:'}
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
                                          <div className="space-y-3 text-left">
                                            <span className="text-[11px] font-bold text-slate-500 tracking-wider font-mono uppercase">2. Anexar Arquivo ou Imagem</span>
                                            
                                            {/* Drag & Drop File Zone */}
                                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/65 rounded-xl p-6 bg-surface-container-lowest hover:bg-surface-container-low/30 transition-all relative">
                                              <input
                                                type="file"
                                                onChange={(e) => handleFileChange(e, atividade.id)}
                                                disabled={submittingActivity}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                              />
                                              <HugeiconsIcon icon={Attachment01Icon} size={28} className="text-secondary mb-2" />
                                              <p className="text-label-md font-semibold text-on-surface">Arraste ou clique para selecionar uma imagem ou arquivo</p>
                                              <p className="text-[11px] text-on-surface-variant/75 mt-1">Imagens ou documentos (máx. 15MB)</p>
                                            </div>

                                            {/* Selected File Card */}
                                            {selectedFiles[atividade.id] && (
                                              <div className="flex items-center justify-between p-3.5 bg-secondary/5 rounded-xl border border-secondary/20 animate-fade-in">
                                                <div className="flex items-center gap-2 min-w-0">
                                                  {selectedFilePreviews[atividade.id] ? (
                                                    <img src={selectedFilePreviews[atividade.id]} alt="Preview" className="w-10 h-10 object-cover rounded border border-secondary/20" />
                                                  ) : (
                                                    <HugeiconsIcon icon={File01Icon} size={20} className="text-secondary shrink-0" />
                                                  )}
                                                  <div className="min-w-0">
                                                    <p className="text-label-sm font-bold text-on-surface truncate">{selectedFiles[atividade.id].name}</p>
                                                    <p className="text-[10px] text-on-surface-variant font-mono font-bold mt-0.5">{(selectedFiles[atividade.id].size / 1024).toFixed(1)} KB</p>
                                                  </div>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveFile(atividade.id)}
                                                  disabled={submittingActivity}
                                                  className="p-1.5 hover:bg-error-container/20 rounded-lg text-error transition-colors"
                                                  title="Remover arquivo"
                                                >
                                                  <HugeiconsIcon icon={Delete02Icon} size={18} />
                                                </button>
                                              </div>
                                            )}

                                            {/* Fallback Input URL */}
                                            {!selectedFiles[atividade.id] && (
                                              <div className="space-y-1">
                                                <label className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">Ou cole um link direto da imagem/arquivo:</label>
                                                <input
                                                  type="url"
                                                  value={activityImage[atividade.id] || ''}
                                                  onChange={(e) => setActivityImage(prev => ({ ...prev, [atividade.id]: e.target.value }))}
                                                  placeholder="https://exemplo.com/sua-imagem.png"
                                                  disabled={submittingActivity}
                                                  className="w-full p-3.5 text-body-md rounded-xl border border-outline-variant/50 bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-sans"
                                                />
                                                {(activityImage[atividade.id] || '').trim().startsWith('http') && (
                                                  <div className="max-w-xs border border-outline-variant/50 rounded overflow-hidden p-1 bg-surface mt-2">
                                                    {activityImage[atividade.id].match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                                      <img src={activityImage[atividade.id] || ''} alt="Preview do link" className="max-h-36 object-cover" />
                                                    ) : (
                                                      <p className="text-xs font-mono p-2 truncate">{activityImage[atividade.id]}</p>
                                                    )}
                                                  </div>
                                                )}
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
                                      ) : atividade.tipo_entrega === 'imagem' ? (
                                        <div className="space-y-3">
                                          {/* Drag & Drop File Zone */}
                                          <div className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/65 rounded-xl p-6 bg-surface-container-lowest hover:bg-surface-container-low/30 transition-all relative">
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => handleFileChange(e, atividade.id)}
                                              disabled={submittingActivity}
                                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <HugeiconsIcon icon={ImageAdd01Icon} size={28} className="text-secondary mb-2" />
                                            <p className="text-label-md font-semibold text-on-surface">Arraste ou clique para selecionar uma imagem</p>
                                            <p className="text-[11px] text-on-surface-variant/75 mt-1">PNG, JPG, WEBP ou GIF (máx. 10MB)</p>
                                          </div>

                                          {/* Selected File Card */}
                                          {selectedFiles[atividade.id] && (
                                            <div className="flex items-center justify-between p-3.5 bg-secondary/5 rounded-xl border border-secondary/20 animate-fade-in">
                                              <div className="flex items-center gap-2 min-w-0">
                                                {selectedFilePreviews[atividade.id] ? (
                                                  <img src={selectedFilePreviews[atividade.id]} alt="Preview" className="w-10 h-10 object-cover rounded border border-secondary/20" />
                                                ) : (
                                                  <HugeiconsIcon icon={File01Icon} size={20} className="text-secondary shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                  <p className="text-label-sm font-bold text-on-surface truncate">{selectedFiles[atividade.id].name}</p>
                                                  <p className="text-[10px] text-on-surface-variant font-mono font-bold mt-0.5">{(selectedFiles[atividade.id].size / 1024).toFixed(1)} KB</p>
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveFile(atividade.id)}
                                                disabled={submittingActivity}
                                                className="p-1.5 hover:bg-error-container/20 rounded-lg text-error transition-colors"
                                                title="Remover arquivo"
                                              >
                                                <HugeiconsIcon icon={Delete02Icon} size={18} />
                                              </button>
                                            </div>
                                          )}

                                          {/* Fallback Input URL */}
                                          {!selectedFiles[atividade.id] && (
                                            <div className="space-y-1">
                                              <label className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">Ou cole um link direto da imagem:</label>
                                              <input
                                                type="url"
                                                value={activityImage[atividade.id] || ''}
                                                onChange={(e) => setActivityImage(prev => ({ ...prev, [atividade.id]: e.target.value }))}
                                                placeholder="https://exemplo.com/sua-imagem.png"
                                                disabled={submittingActivity}
                                                className="w-full p-3.5 text-body-md rounded-xl border border-outline-variant/50 bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-sans"
                                              />
                                              {(activityImage[atividade.id] || '').trim().startsWith('http') && (
                                                <div className="max-w-xs border border-outline-variant/50 rounded overflow-hidden p-1 bg-surface mt-2">
                                                  <img src={activityImage[atividade.id] || ''} alt="Preview do link" className="max-h-36 object-cover" />
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          {/* Drag & Drop File Zone */}
                                          <div className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/65 rounded-xl p-6 bg-surface-container-lowest hover:bg-surface-container-low/30 transition-all relative">
                                            <input
                                              type="file"
                                              onChange={(e) => handleFileChange(e, atividade.id)}
                                              disabled={submittingActivity}
                                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <HugeiconsIcon icon={Attachment01Icon} size={28} className="text-primary mb-2" />
                                            <p className="text-label-md font-semibold text-on-surface">Arraste ou clique para selecionar um arquivo</p>
                                            <p className="text-[11px] text-on-surface-variant/75 mt-1">PDF, ZIP, DOCX, XLSX ou qualquer documento (máx. 25MB)</p>
                                          </div>

                                          {/* Selected File Card */}
                                          {selectedFiles[atividade.id] && (
                                            <div className="flex items-center justify-between p-3.5 bg-primary/5 rounded-xl border border-primary/20 animate-fade-in">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <HugeiconsIcon icon={File01Icon} size={20} className="text-primary shrink-0" />
                                                <div className="min-w-0">
                                                  <p className="text-label-sm font-bold text-on-surface truncate">{selectedFiles[atividade.id].name}</p>
                                                  <p className="text-[10px] text-on-surface-variant font-mono font-bold mt-0.5">{(selectedFiles[atividade.id].size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveFile(atividade.id)}
                                                disabled={submittingActivity}
                                                className="p-1.5 hover:bg-error-container/20 rounded-lg text-error transition-colors"
                                                title="Remover arquivo"
                                              >
                                                <HugeiconsIcon icon={Delete02Icon} size={18} />
                                              </button>
                                            </div>
                                          )}

                                          {/* Fallback Input URL */}
                                          {!selectedFiles[atividade.id] && (
                                            <div className="space-y-1">
                                              <label className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">Ou cole um link direto do arquivo:</label>
                                              <input
                                                type="url"
                                                value={activityResponse[atividade.id] || ''}
                                                onChange={(e) => setActivityResponse(prev => ({ ...prev, [atividade.id]: e.target.value }))}
                                                placeholder="https://exemplo.com/seu-documento.pdf"
                                                disabled={submittingActivity}
                                                className="w-full p-3.5 text-body-md rounded-xl border border-outline-variant/50 bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-sans"
                                              />
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
                                                  const activeQuestions = getActivityQuizQuestions(selectedAula.questoes, atividade.id);
                                                  return activeQuestions.length === 0 || activeQuestions.some(q => !quizAnswers[q.id] || !quizAnswers[q.id].trim());
                                                })()
                                              : atividade.tipo_entrega === 'multipla'
                                                ? (!(activityResponse[atividade.id] || '').trim() && !selectedFiles[atividade.id] && !(activityImage[atividade.id] || '').trim())
                                                : (!selectedFiles[atividade.id] && !(atividade.tipo_entrega === 'imagem' ? activityImage[atividade.id] : activityResponse[atividade.id] || '').trim()))
                                        }
                                        className={`px-5 py-2.5 rounded-lg font-heading font-bold text-label-md flex items-center gap-2 transition-all ${
                                          (atividade.tipo_entrega === 'texto' 
                                            ? (activityResponse[atividade.id] || '').trim() 
                                            : atividade.tipo_entrega === 'quiz'
                                              ? (() => {
                                                  const activeQuestions = getActivityQuizQuestions(selectedAula.questoes, atividade.id);
                                                  return activeQuestions.length > 0 && !activeQuestions.some(q => !quizAnswers[q.id] || !quizAnswers[q.id].trim());
                                                })()
                                              : atividade.tipo_entrega === 'multipla'
                                                ? ((activityResponse[atividade.id] || '').trim() || selectedFiles[atividade.id] || (activityImage[atividade.id] || '').trim())
                                                : (selectedFiles[atividade.id] || (atividade.tipo_entrega === 'imagem' ? activityImage[atividade.id] : activityResponse[atividade.id] || '').trim())) && !submittingActivity
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
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Manual completion checkbox */}
                  <div className="product-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
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

                      if (standardQuizQuestions.length > 0) {
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
