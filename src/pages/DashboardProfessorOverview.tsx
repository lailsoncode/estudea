import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { usePendingCorrections } from '../hooks/usePendingCorrections';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AddCircleIcon,
  Alert01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  BookOpen01Icon,
  Calendar01Icon,
  Cancel01Icon,
  ChartHistogramIcon,
  Chat01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  GameControllerIcon,
  PlayCircleIcon,
  SchoolIcon,
  StarIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
interface DashboardProfessorOverviewProps {
  setActiveTab: (tab: 'overview' | 'progress' | 'corrections' | 'assignments' | 'turmas' | 'settings') => void;
  session: any;
  onStartArena: () => void;
}

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  cohort: string;
  duration: string;
  type: 'live' | 'deadline' | 'mentorship' | 'exam' | 'activity';
  event_date: string;
  turma_id?: string | null;
}

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

const formatScheduleDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const getScheduleAccent = (type: ScheduleItem['type']) => {
  switch (type) {
    case 'live':
      return { surface: 'bg-primary/10 text-primary', text: 'text-primary', label: 'Live' };
    case 'deadline':
      return { surface: 'bg-orange-500/10 text-orange-700 dark:text-orange-400', text: 'text-orange-700 dark:text-orange-400', label: 'Prazo' };
    case 'exam':
      return { surface: 'bg-error/10 text-error', text: 'text-error', label: 'Prova' };
    case 'mentorship':
      return { surface: 'bg-secondary/10 text-secondary', text: 'text-secondary', label: 'Mentoria' };
    case 'activity':
    default:
      return { surface: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-400', label: 'Atividade' };
  }
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

export const DashboardProfessorOverview: React.FC<DashboardProfessorOverviewProps> = ({ setActiveTab, session, onStartArena }) => {

  // DB States
  const [loading, setLoading] = useState(true);
  const [studentsCount, setStudentsCount] = useState(0);
  const [engagementRate, setEngagementRate] = useState(88);
  const [activeThisWeekCount, setActiveThisWeekCount] = useState(0);
  const [totalCompletedLessonsCount, setTotalCompletedLessonsCount] = useState(0);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Hook centralizado — elimina query duplicada
  const { count: pendingCorrections } = usePendingCorrections(true);

  // Interactive UI Modals
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [selectedClassForLive, setSelectedClassForLive] = useState('');
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedClassForMsg, setSelectedClassForMsg] = useState('');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedDate, setSchedDate] = useState(getTodayIsoDate());
  const [schedTime, setSchedTime] = useState('');
  const [schedTitle, setSchedTitle] = useState('');
  const [schedDuration, setSchedDuration] = useState('');
  const [schedType, setSchedType] = useState<ScheduleItem['type']>('activity');
  const [schedTargetTurmaId, setSchedTargetTurmaId] = useState('all');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);





  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Students Count
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      setStudentsCount(studentCount || 0);

      // 2. Classes list
      const { data: classesData } = await supabase
        .from('turmas')
        .select('*')
        .order('nome');
      setClasses(classesData || []);

      if (classesData && classesData.length > 0) {
        setSelectedClassForLive(classesData[0].id);
        setSelectedClassForMsg(classesData[0].id);
      }

      // 4. Fetch Courses and calculate real metrics
      const { data: coursesData } = await supabase.from('cursos').select('*');
      const { data: profilesData } = await supabase.from('profiles').select('*').eq('role', 'student');
      const { data: modulosData } = await supabase.from('modulos').select('*');
      const { data: aulasData } = await supabase.from('aulas').select('*');
      const { data: progressData } = await supabase.from('progresso_alunos').select('*');
      const { data: releasedData } = await supabase.from('turma_aulas_liberadas').select('*');

      // Create maps for efficient lookups of released lessons and student profiles
      const releasedMap = new Map<string, Set<string>>();
      (releasedData || []).forEach(r => {
        if (!releasedMap.has(r.turma_id)) {
          releasedMap.set(r.turma_id, new Set());
        }
        releasedMap.get(r.turma_id)!.add(r.aula_id);
      });

      const studentMap = new Map<string, any>();
      (profilesData || []).forEach(s => {
        studentMap.set(s.id, s);
      });

      const enrichedCourses = (coursesData || []).map(course => {
        // Find classes of this course
        const courseClasses = (classesData || []).filter(c => c.curso_id === course.id);
        const courseClassIds = courseClasses.map(c => c.id);

        // Find students in these classes
        const courseStudents = (profilesData || []).filter(s => s.turma_id && courseClassIds.includes(s.turma_id));
        const sCount = courseStudents.length;

        // Find modules and lessons
        const courseModulos = (modulosData || []).filter(m => m.curso_id === course.id);
        const courseModIds = courseModulos.map(m => m.id);
        const courseLessons = (aulasData || []).filter(l => l.modulo_id && courseModIds.includes(l.modulo_id));

        // Calculate Average Progress and Rating
        let avgProgress = 0;
        let realRating = null;
        if (courseLessons.length > 0) {
          const lessonIds = courseLessons.map(l => l.id);
          const studentIds = courseStudents.map(s => s.id);
          const courseProgress = (progressData || []).filter(p => lessonIds.includes(p.aula_id) && studentIds.includes(p.aluno_id));
          
          // Calculate average progress considering ONLY released lessons for the students' classes
          let courseExpected = 0;
          let courseCompleted = 0;

          courseStudents.forEach(s => {
            if (s.turma_id) {
              const releasedAulas = releasedMap.get(s.turma_id);
              if (releasedAulas) {
                const courseReleasedAulasCount = Array.from(releasedAulas).filter(id => lessonIds.includes(id)).length;
                courseExpected += courseReleasedAulasCount;
              }
            }
          });

          courseProgress.forEach(p => {
            const student = studentMap.get(p.aluno_id);
            if (student && student.turma_id) {
              const releasedAulas = releasedMap.get(student.turma_id);
              if (releasedAulas && releasedAulas.has(p.aula_id)) {
                courseCompleted++;
              }
            }
          });

          if (courseExpected > 0) {
            avgProgress = Math.round((courseCompleted / courseExpected) * 100);
          } else {
            avgProgress = 0;
          }

          // Fetch all ratings for these lessons from progressData
          const ratedProgress = courseProgress.filter(p => p.avaliacao !== null && p.avaliacao > 0);
          if (ratedProgress.length > 0) {
            const sumRating = ratedProgress.reduce((sum, p) => sum + (p.avaliacao as number), 0);
            realRating = sumRating / ratedProgress.length;
          }
        }

        return {
          ...course,
          studentCount: sCount,
          avgProgress,
          rating: realRating !== null ? realRating : 4.8 + Math.round(Math.random() * 2) / 10
        };
      });

      setCourses(enrichedCourses);
 
      // 5. Calculate real engagement and active students statistics
      let activeThisWeek = 0;
      if (profilesData && profilesData.length > 0) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        activeThisWeek = profilesData.filter(s => {
          if (!s.ultimo_acesso_data) return false;
          const accessDate = new Date(s.ultimo_acesso_data);
          return accessDate >= sevenDaysAgo;
        }).length;
      }
      setActiveThisWeekCount(activeThisWeek);

      // Calculate total expected completions and total completed lessons (only counting released ones)
      let totalExpected = 0;
      let totalCompleted = 0;

      (profilesData || []).forEach(s => {
        if (s.turma_id) {
          const releasedAulas = releasedMap.get(s.turma_id);
          if (releasedAulas) {
            totalExpected += releasedAulas.size;
          }
        }
      });

      (progressData || []).forEach(p => {
        const student = studentMap.get(p.aluno_id);
        if (student && student.turma_id) {
          const releasedAulas = releasedMap.get(student.turma_id);
          if (releasedAulas && releasedAulas.has(p.aula_id)) {
            totalCompleted++;
          }
        }
      });

      setTotalCompletedLessonsCount(totalCompleted);

      if (totalExpected > 0) {
        const rate = Math.round((totalCompleted / totalExpected) * 100);
        setEngagementRate(rate);
      } else {
        setEngagementRate(0);
      }

    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    setScheduleError(null);

    try {
      const { data, error } = await supabase
        .from('agenda')
        .select('*')
        .gte('event_date', getTodayIsoDate())
        .order('event_date', { ascending: true })
        .order('time', { ascending: true })
        .limit(10);

      if (error) throw error;
      setSchedule((data || []) as ScheduleItem[]);
    } catch (err) {
      console.error('Erro ao buscar agenda:', err);
      setScheduleError(getErrorMessage(err, 'Não foi possível carregar a agenda.'));
      setSchedule([]);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSchedule();
  }, []);

  // Handle stream initialization
  const startLiveClass = async () => {
    setIsLiveStreaming(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable, using simulation.', err);
    }
  };

  const stopLiveClass = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsLiveStreaming(false);
    setShowLiveModal(false);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setMsgTitle('');
    setMsgBody('');
    setMsgSuccess(false);
    setMsgError(null);
  };

  // Handle Message Class
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = msgTitle.trim();
    const body = msgBody.trim();

    if (!selectedClassForMsg) {
      setMsgError('Selecione uma turma para enviar o comunicado.');
      return;
    }

    if (!title || !body) {
      setMsgError('Preencha o título e a mensagem antes de enviar.');
      return;
    }

    setSendingMsg(true);
    setMsgError(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { error: insertError } = await supabase
        .from('notificacoes')
        .insert({
          turma_id: selectedClassForMsg,
          titulo: title,
          mensagem: body,
          remetente_id: userData.user?.id || null,
        });

      if (insertError) throw insertError;

      setSendingMsg(false);
      setMsgSuccess(true);
      setTimeout(() => {
        closeMessageModal();
      }, 2000);
    } catch (err: unknown) {
      console.error('Erro ao enviar notificacao:', err);
      setMsgError(getErrorMessage(err, 'Não foi possível enviar a notificação.'));
      setSendingMsg(false);
    }
  };

  const resetScheduleForm = () => {
    setSchedDate(getTodayIsoDate());
    setSchedTime('');
    setSchedTitle('');
    setSchedDuration('');
    setSchedType('activity');
    setSchedTargetTurmaId('all');
    setScheduleError(null);
  };

  // Add Item to Schedule
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = schedTitle.trim();
    const selectedClass = schedTargetTurmaId === 'all'
      ? null
      : classes.find((turma) => turma.id === schedTargetTurmaId);

    if (!title || !schedDate || !schedTime) {
      setScheduleError('Preencha data, horário e título do evento.');
      return;
    }

    if (schedTargetTurmaId !== 'all' && !selectedClass) {
      setScheduleError('Selecione uma turma válida para o evento.');
      return;
    }

    setScheduleSaving(true);
    setScheduleError(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { error } = await supabase
        .from('agenda')
        .insert({
          professor_id: userData.user?.id || null,
          turma_id: selectedClass?.id || null,
          event_date: schedDate,
          time: schedTime,
          title,
          cohort: selectedClass?.nome || 'Todas as Turmas',
          duration: schedDuration.trim() || 'Sem detalhes',
          type: schedType,
        });

      if (error) throw error;

      await fetchSchedule();
      resetScheduleForm();
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Erro ao salvar evento da agenda:', err);
      setScheduleError(getErrorMessage(err, 'Não foi possível salvar o evento.'));
    } finally {
      setScheduleSaving(false);
    }
  };

  const removeScheduleItem = async (id: string) => {
    if (!window.confirm('Excluir este evento da agenda?')) return;

    try {
      const { error } = await supabase
        .from('agenda')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSchedule((current) => current.filter(item => item.id !== id));
    } catch (err) {
      console.error('Erro ao excluir evento da agenda:', err);
      setScheduleError(getErrorMessage(err, 'Não foi possível excluir o evento.'));
    }
  };

  // Export CSV Report of Students Progress
  const exportProgressReport = async () => {
    try {
      const { data: students } = await supabase.from('profiles').select('id, nome, turma_id').eq('role', 'student');
      const { data: classes } = await supabase.from('turmas').select('id, nome');
      const { data: progress } = await supabase.from('progresso_alunos').select('aluno_id, aula_id');
      const { data: lessons } = await supabase.from('aulas').select('id');

      if (!students || students.length === 0) {
        alert('Nenhum estudante cadastrado para exportação.');
        return;
      }

      const classMap = new Map((classes || []).map(c => [c.id, c.nome]));
      const totalLessons = lessons?.length || 0;

      // Group progress by student
      const progressMap = new Map<string, number>();
      (progress || []).forEach(p => {
        progressMap.set(p.aluno_id, (progressMap.get(p.aluno_id) || 0) + 1);
      });

      // Build CSV Content
      const headers = ['Nome do Estudante', 'Turma', 'Aulas Concluidas', 'Total Aulas', 'Progresso (%)'];
      const rows = students.map(s => {
        const studentProgress = progressMap.get(s.id) || 0;
        const percent = totalLessons > 0 ? Math.round((studentProgress / totalLessons) * 100) : 0;
        return [
          s.nome || 'Sem Nome',
          s.turma_id ? classMap.get(s.turma_id) || 'Sem Turma' : 'Sem Turma',
          studentProgress.toString(),
          totalLessons.toString(),
          `${percent}%`
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_progresso_estudantes_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    }
  };

  const teacherName = session?.user?.user_metadata?.nome || 'Professor(a)';
  const teacherFirstName = teacherName.trim().split(/\s+/)[0] || 'Professor(a)';

  return (
    <div className="product-page animate-fade-in relative pb-10">
      <section className="product-card p-4 sm:p-5" aria-labelledby="teacher-dashboard-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
              <HugeiconsIcon icon={SchoolIcon} size={22} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <span className="product-section-kicker">Painel docente</span>
              <h1 id="teacher-dashboard-title" className="product-section-heading mt-0 text-xl sm:text-2xl">Olá, {teacherFirstName}</h1>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">Acompanhe suas turmas e priorize o que precisa de atenção hoje.</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {pendingCorrections > 0 && (
              <button onClick={() => setActiveTab('corrections')} className="product-secondary-action w-full sm:w-auto">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} />
                {pendingCorrections} {pendingCorrections === 1 ? 'correção pendente' : 'correções pendentes'}
              </button>
            )}
            <button
              onClick={() => {
                if (classes.length > 0) onStartArena();
                else alert('Cadastre uma turma e um quiz antes de iniciar a Arena.');
              }}
              className="product-primary-action w-full sm:w-auto"
            >
              <HugeiconsIcon icon={GameControllerIcon} size={18} strokeWidth={2} />
              Iniciar Arena Estudea
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Resumo da operação docente" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <HugeiconsIcon icon={UserGroupIcon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Estudantes</span>
            <strong className="product-metric-value">{loading ? '...' : studentsCount}</strong>
            <span className="block truncate text-[10px] font-semibold text-on-surface-variant">{loading ? 'Carregando atividade' : `${activeThisWeekCount} ativos na semana`}</span>
          </div>
        </div>
        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control ${pendingCorrections > 0 ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant'}`}>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Correções pendentes</span>
            <strong className="product-metric-value">{loading ? '...' : pendingCorrections}</strong>
            <span className={`block truncate text-[10px] font-semibold ${pendingCorrections > 0 ? 'text-error' : 'text-on-surface-variant'}`}>{pendingCorrections > 0 ? 'Requer atenção' : 'Tudo em dia'}</span>
          </div>
        </div>
        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
            <HugeiconsIcon icon={ChartHistogramIcon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="product-metric-label">Engajamento</span>
            <strong className="product-metric-value">{loading ? '...' : `${engagementRate}%`}</strong>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-label="Taxa de engajamento" aria-valuemin={0} aria-valuemax={100} aria-valuenow={engagementRate}>
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${engagementRate}%` }} />
            </div>
          </div>
        </div>
        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-secondary/10 text-secondary">
            <HugeiconsIcon icon={SchoolIcon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Turmas</span>
            <strong className="product-metric-value">{loading ? '...' : classes.length}</strong>
            <span className="block truncate text-[10px] font-semibold text-on-surface-variant">{totalCompletedLessonsCount} lições concluídas</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-8" aria-labelledby="managed-courses-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="product-section-kicker">Conteúdo em andamento</span>
              <h2 id="managed-courses-title" className="product-section-heading">Cursos sob gestão</h2>
            </div>
            <button onClick={() => setActiveTab('assignments')} className="product-secondary-action w-full sm:w-auto">
              Gerenciar cursos
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={17} strokeWidth={2} />
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="product-empty-state">
              <HugeiconsIcon icon={BookOpen01Icon} size={28} className="mb-2 text-primary" />
              <p className="font-heading text-sm font-extrabold text-on-surface">Nenhum curso ativo</p>
              <p className="mt-1 text-sm">Crie ou vincule um curso para começar o acompanhamento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {courses.map(course => (
                <button
                  type="button"
                  key={course.id}
                  onClick={() => setActiveTab('assignments')}
                  className="product-card-interactive group flex min-h-[292px] flex-col justify-between p-4 text-left"
                >
                  <div>
                    <div className="relative mb-4 h-28 overflow-hidden rounded-product-control border border-outline-variant/70 bg-surface-container-highest">
                      <img
                        alt={`Capa do curso ${course.titulo}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={course.imagem_capa || "https://lh3.googleusercontent.com/aida-public/AB6AXuA4GC49br6MULJ_sNhA5Tr-TYpXEfl3rWzuNp18tC3_cXoCgu8Zv2wJ-iTMy3e_f8bf_UEV7OT7BIGi9RuzHsOQ7trg1Ii0mhHVxpy0GAA7ONY_BFOJNYpmUjg_FqmBw1S2Z8229jGC3oas4c66NXQSbU7X0KH3q__Sb3yfyjcwtYYakZpeDZaM2YmWTfwFQkr8tP5uFHyyY2qt0XzhkA-SNnEjPs-2hXmzWY_2rqapUhWjyauQUnJ6Q73TTp7x2_amCQE8A6KG5VY"}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                      <span className="absolute left-3 top-3 max-w-[85%] truncate rounded-full border border-white/30 bg-surface-container-lowest/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-primary backdrop-blur-sm">
                        {course.categoria || 'Desenvolvimento'}
                      </span>
                    </div>
                    <h3 className="font-heading text-base font-extrabold leading-tight text-on-surface transition-colors group-hover:text-primary">{course.titulo}</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-on-surface-variant">
                      <span className="flex items-center gap-1.5">
                        <HugeiconsIcon icon={UserGroupIcon} size={15} strokeWidth={2} />
                        {course.studentCount} alunos
                      </span>
                      <span className="flex items-center gap-1.5">
                        <HugeiconsIcon icon={StarIcon} size={15} strokeWidth={2} className="text-amber-600 dark:text-amber-400" />
                        {course.rating.toFixed(1)} / 5,0
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-outline-variant/70 pt-4">
                    <div className="flex justify-between gap-3 text-[11px] font-bold text-on-surface-variant">
                      <span>Progresso médio</span>
                      <span className="text-primary">{course.avgProgress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-label={`Progresso médio do curso ${course.titulo}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={course.avgProgress}>
                      <div className="h-full rounded-full bg-secondary" style={{ width: `${course.avgProgress}%` }} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <section className="product-card p-5" aria-labelledby="quick-actions-title">
            <div className="border-b border-outline-variant/70 pb-4">
              <span className="product-section-kicker">Atalhos</span>
              <h2 id="quick-actions-title" className="font-heading text-lg font-extrabold text-on-surface">Ações rápidas</h2>
            </div>
            <div className="divide-y divide-outline-variant/70">
              <button onClick={() => setActiveTab('assignments')} className="group flex w-full items-center justify-between gap-3 py-3.5 text-left">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary"><HugeiconsIcon icon={AddCircleIcon} size={19} strokeWidth={2} /></span>
                  <span className="text-sm font-bold text-on-surface transition-colors group-hover:text-primary">Criar novo curso</span>
                </span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={17} className="shrink-0 text-on-surface-variant" />
              </button>
              <button
                onClick={() => {
                  if (classes.length > 0) setShowLiveModal(true);
                  else alert('Cadastre uma turma e um curso antes de iniciar uma aula ao vivo.');
                }}
                className="group flex w-full items-center justify-between gap-3 py-3.5 text-left"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control bg-error/10 text-error"><HugeiconsIcon icon={PlayCircleIcon} size={19} strokeWidth={2} /></span>
                  <span className="text-sm font-bold text-on-surface transition-colors group-hover:text-primary">Iniciar aula ao vivo</span>
                </span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={17} className="shrink-0 text-on-surface-variant" />
              </button>
              <button
                onClick={() => {
                  if (classes.length > 0) setShowMessageModal(true);
                  else alert('Nenhuma turma disponível para notificar.');
                }}
                className="group flex w-full items-center justify-between gap-3 py-3.5 text-left"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary"><HugeiconsIcon icon={Chat01Icon} size={19} strokeWidth={2} /></span>
                  <span className="text-sm font-bold text-on-surface transition-colors group-hover:text-primary">Notificar turma</span>
                </span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={17} className="shrink-0 text-on-surface-variant" />
              </button>
              <button onClick={exportProgressReport} className="group flex w-full items-center justify-between gap-3 py-3.5 text-left">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control bg-secondary/10 text-secondary"><HugeiconsIcon icon={Download01Icon} size={19} strokeWidth={2} /></span>
                  <span className="text-sm font-bold text-on-surface transition-colors group-hover:text-primary">Exportar relatório</span>
                </span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={17} className="shrink-0 text-on-surface-variant" />
              </button>
            </div>
          </section>

          <section id="schedule-card-widget" className="product-card p-5" aria-labelledby="schedule-title">
            <div className="flex items-end justify-between gap-3 border-b border-outline-variant/70 pb-4">
              <div>
                <span className="product-section-kicker">Agenda</span>
                <h2 id="schedule-title" className="font-heading text-lg font-extrabold text-on-surface">Próximos eventos</h2>
              </div>
              <button onClick={() => setShowScheduleModal(true)} className="product-secondary-action min-h-10 px-3 py-2 text-xs">
                <HugeiconsIcon icon={AddCircleIcon} size={16} strokeWidth={2} />
                Agendar
              </button>
            </div>

            {scheduleError ? (
              <div className="mt-4 flex gap-2 rounded-product-control border border-error/25 bg-error/10 p-3 text-xs font-semibold text-error">
                <HugeiconsIcon icon={Alert01Icon} size={16} className="shrink-0" />
                {scheduleError}
              </div>
            ) : schedule.length === 0 ? (
              <div className="product-empty-state mt-4 min-h-32">
                <HugeiconsIcon icon={Calendar01Icon} size={24} className="mb-2 text-primary" />
                <p className="text-sm font-bold text-on-surface">Agenda livre</p>
                <p className="mt-1 text-xs">Nenhum evento programado.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/70">
                {schedule.map(item => {
                  const accent = getScheduleAccent(item.type);
                  return (
                    <div key={item.id} className="group flex gap-3 py-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control ${accent.surface}`}>
                        <HugeiconsIcon icon={Calendar01Icon} size={18} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase tracking-[0.08em] ${accent.text}`}>{formatScheduleDate(item.event_date)} · {item.time}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] ${accent.surface}`}>{accent.label}</span>
                        </div>
                        <h3 className="mt-1 truncate text-sm font-bold text-on-surface">{item.title}</h3>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-[11px] font-medium text-on-surface-variant">{item.cohort} · {item.duration}</p>
                          <button onClick={() => removeScheduleItem(item.id)} className="product-icon-action h-8 w-8 shrink-0 text-error sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Excluir evento ${item.title}`} title="Excluir evento">
                            <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: LIVE CLASS STREAM SIMULATOR */}
      {/* ======================================================== */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="product-dialog max-h-[92vh] max-w-3xl">
            <div className="product-dialog-header flex items-start justify-between gap-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control bg-error/10 text-error">
                  <HugeiconsIcon icon={PlayCircleIcon} size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-extrabold text-on-surface">Transmissão de aula ao vivo</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">Configure sua câmera e selecione a turma para iniciar.</p>
                </div>
              </div>
              {!isLiveStreaming && (
                <button
                  onClick={() => setShowLiveModal(false)}
                  className="product-icon-action shrink-0"
                  aria-label="Fechar transmissão"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={19} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="overflow-y-auto p-4 sm:p-5">
              <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-product-card border border-slate-800 bg-slate-950 text-white">
                {isLiveStreaming ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="max-h-[400px] h-full w-full object-cover"
                    />
                    <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                      Ao vivo
                    </div>
                    <div className="absolute right-4 top-4 rounded-full bg-black/65 px-3 py-1 text-[11px] font-bold backdrop-blur">
                      {12 + Math.floor(Math.random() * 8)} espectadores
                    </div>
                    <div className="absolute bottom-4 left-4 max-w-sm rounded-product-control bg-black/65 px-3.5 py-2 text-xs backdrop-blur">
                      <p className="text-[10px] font-bold uppercase text-white/65">Turma ativa</p>
                      <p className="font-extrabold text-white">{classes.find(c => c.id === selectedClassForLive)?.nome || 'Turma selecionada'}</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full max-w-md space-y-5 p-7 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-product-control border border-slate-700 bg-slate-900 text-primary-fixed-dim">
                      <HugeiconsIcon icon={UserGroupIcon} size={26} strokeWidth={2} />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="block text-xs font-bold text-slate-200">Turma da transmissão</label>
                      <select
                        value={selectedClassForLive}
                        onChange={(e) => setSelectedClassForLive(e.target.value)}
                        className="min-h-11 w-full rounded-product-control border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="product-dialog-footer flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end">
              {isLiveStreaming ? (
                <button
                  onClick={stopLiveClass}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-product-control bg-error px-5 py-2.5 text-sm font-heading font-extrabold text-on-error shadow-sm transition hover:opacity-90"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={17} strokeWidth={2} />
                  Encerrar transmissão
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowLiveModal(false)}
                    className="product-secondary-action"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={startLiveClass}
                    className="product-primary-action"
                  >
                    <HugeiconsIcon icon={PlayCircleIcon} size={17} strokeWidth={2} />
                    Iniciar transmissão
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: NOTIFY CLASS */}
      {/* ======================================================== */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="product-dialog max-w-xl">
            <div className="product-dialog-header flex items-start justify-between gap-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Chat01Icon} size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-extrabold text-on-surface">Notificar turma</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">Envie um comunicado para os estudantes selecionados.</p>
                </div>
              </div>
              <button
                onClick={closeMessageModal}
                className="product-icon-action shrink-0"
                aria-label="Fechar comunicado"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={19} strokeWidth={2} />
              </button>
            </div>

            {msgSuccess ? (
              <div className="space-y-4 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-product-control bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={28} strokeWidth={2} />
                </div>
                <h4 className="font-heading text-lg font-extrabold text-on-surface">Mensagem enviada</h4>
                <p className="mx-auto max-w-xs text-sm text-on-surface-variant">O comunicado já está disponível nas notificações dos alunos da turma.</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage}>
                <div className="space-y-4 p-5 sm:p-6">
                  {msgError && (
                    <div className="flex gap-2 rounded-product-control border border-error/25 bg-error/10 p-3 text-sm font-semibold text-error">
                      <HugeiconsIcon icon={Alert01Icon} size={17} className="mt-0.5 shrink-0" />
                      {msgError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="app-field-label">Turma</label>
                    <select
                      value={selectedClassForMsg}
                      onChange={(e) => setSelectedClassForMsg(e.target.value)}
                      disabled={sendingMsg}
                      required
                      className="app-input"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="app-field-label">Assunto</label>
                    <input
                      type="text"
                      value={msgTitle}
                      onChange={(e) => setMsgTitle(e.target.value)}
                      placeholder="Ex.: Novo material liberado"
                      disabled={sendingMsg}
                      required
                      className="app-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="app-field-label">Mensagem</label>
                    <textarea
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      placeholder="Escreva as instruções ou o comunicado para a turma..."
                      rows={4}
                      disabled={sendingMsg}
                      required
                      className="app-input resize-none"
                    />
                  </div>
                </div>

                <div className="product-dialog-footer flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeMessageModal}
                    disabled={sendingMsg}
                    className="product-secondary-action"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sendingMsg}
                    className="product-primary-action"
                  >
                    {sendingMsg ? 'Enviando...' : 'Enviar comunicado'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD SCHEDULE EVENT */}
      {/* ======================================================== */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="product-dialog max-h-[92vh] max-w-md">
            <div className="product-dialog-header flex items-start justify-between gap-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-product-control bg-secondary/10 text-secondary">
                  <HugeiconsIcon icon={Calendar01Icon} size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-extrabold text-on-surface">Agendar evento</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">Organize uma atividade para uma ou mais turmas.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  resetScheduleForm();
                }}
                className="product-icon-action shrink-0"
                aria-label="Fechar agendamento"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={19} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="min-h-0 overflow-y-auto">
              <div className="space-y-4 p-5 sm:p-6">
                {scheduleError && (
                  <div className="flex gap-2 rounded-product-control border border-error/25 bg-error/10 p-3 text-xs font-semibold text-error">
                    <HugeiconsIcon icon={Alert01Icon} size={16} className="mt-0.5 shrink-0" />
                    {scheduleError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="app-field-label">Data</label>
                    <input
                      type="date"
                      value={schedDate}
                      min={getTodayIsoDate()}
                      onChange={(e) => setSchedDate(e.target.value)}
                      required
                      disabled={scheduleSaving}
                      className="app-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="app-field-label">Horário</label>
                    <input
                      type="time"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      required
                      disabled={scheduleSaving}
                      className="app-input"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="app-field-label">Título do evento</label>
                  <input
                    type="text"
                    value={schedTitle}
                    onChange={(e) => setSchedTitle(e.target.value)}
                    placeholder="Ex.: Prova de digitação"
                    required
                    disabled={scheduleSaving}
                    className="app-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="app-field-label">Destino</label>
                  <select
                    value={schedTargetTurmaId}
                    onChange={(e) => setSchedTargetTurmaId(e.target.value)}
                    disabled={scheduleSaving}
                    className="app-input"
                  >
                    <option value="all">Todas as turmas</option>
                    {classes.map((turma) => (
                      <option key={turma.id} value={turma.id}>{turma.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="app-field-label">Duração ou detalhes</label>
                  <input
                    type="text"
                    value={schedDuration}
                    onChange={(e) => setSchedDuration(e.target.value)}
                    placeholder="Ex.: 45 min ou entrega prática"
                    disabled={scheduleSaving}
                    className="app-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="app-field-label">Tipo do evento</label>
                  <select
                    value={schedType}
                    onChange={(e) => setSchedType(e.target.value as ScheduleItem['type'])}
                    disabled={scheduleSaving}
                    className="app-input"
                  >
                    <option value="live">Live / Aula síncrona</option>
                    <option value="deadline">Prazo / Atividade</option>
                    <option value="exam">Prova / Avaliação</option>
                    <option value="activity">Atividade / Exercício</option>
                    <option value="mentorship">Mentoria individual</option>
                  </select>
                </div>
              </div>

              <div className="product-dialog-footer flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    resetScheduleForm();
                  }}
                  disabled={scheduleSaving}
                  className="product-secondary-action"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={scheduleSaving}
                  className="product-primary-action"
                >
                  {scheduleSaving ? 'Salvando...' : 'Confirmar evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
};
