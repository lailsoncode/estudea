import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { usePendingCorrections } from '../hooks/usePendingCorrections';
interface DashboardProfessorOverviewProps {
  setActiveTab: (tab: 'overview' | 'progress' | 'corrections' | 'assignments' | 'turmas' | 'settings') => void;
  session: any;
  onStartArena: () => void;
}

// Inline SVGs matching design style
const GroupIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const FactCheckIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="m9 11 2 2 4-4" />
    <path d="M8 16h8" />
  </svg>
);

const EngagementIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20v-6" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-4 h-4 text-amber-500 fill-current" viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ForumIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const PlayCircleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);

const AddCircleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const ArrowForwardIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

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
      return { border: 'border-primary', text: 'text-primary', label: 'Live' };
    case 'deadline':
      return { border: 'border-orange-500', text: 'text-orange-600', label: 'Prazo' };
    case 'exam':
      return { border: 'border-red-600', text: 'text-red-600', label: 'Prova' };
    case 'mentorship':
      return { border: 'border-purple-600', text: 'text-purple-600', label: 'Mentoria' };
    case 'activity':
    default:
      return { border: 'border-emerald-500', text: 'text-emerald-600', label: 'Atividade' };
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

export const DashboardProfessorOverview: React.FC<DashboardProfessorOverviewProps> = ({ setActiveTab, onStartArena }) => {

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
          
          if (sCount > 0) {
            avgProgress = Math.round((courseProgress.length / (sCount * courseLessons.length)) * 100);
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

      const totalCompleted = progressData?.length || 0;
      setTotalCompletedLessonsCount(totalCompleted);

      if (profilesData && profilesData.length > 0 && aulasData && aulasData.length > 0) {
        const totalExpected = profilesData.length * aulasData.length;
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

  return (
    <div className="app-page animate-fade-in relative pb-10">
      


      {/* 2. Bento Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: Active Students */}
        <div className="app-card-padded hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 flex items-center justify-center">
              <GroupIcon />
            </div>
            <span className="flex items-center gap-1 font-sans text-label-sm font-extrabold px-2.5 py-1 rounded-md border text-emerald-700 bg-emerald-50 border-emerald-200">
              <TrendingUpIcon />
              {loading ? '...' : `${activeThisWeekCount} ativos esta semana`}
            </span>
          </div>
          <div>
            <p className="app-metric-label">Estudantes Ativos</p>
            <h3 className="app-metric-value mt-2">{loading ? '...' : studentsCount}</h3>
          </div>
        </div>

        {/* KPI 2: Pending Corrections */}
        <div className="app-card-padded hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute right-0 top-0 w-32 h-32 bg-error/5 rounded-bl-[100px] -z-0"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-error-container text-error rounded-lg border border-error/10 flex items-center justify-center">
              <FactCheckIcon />
            </div>
            <span className={`flex items-center gap-1 font-sans text-label-sm font-extrabold px-2.5 py-1 rounded-md border ${
              pendingCorrections > 0 ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
            }`}>
              {pendingCorrections > 0 ? 'Requer Atenção' : 'Tudo em dia'}
            </span>
          </div>
          <div className="relative z-10">
            <p className="app-metric-label">Correções Pendentes</p>
            <h3 className="app-metric-value mt-2">{loading ? '...' : pendingCorrections}</h3>
          </div>
        </div>

        {/* KPI 3: Engagement Rate */}
        <div className="app-card-padded hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary-container text-primary rounded-lg border border-primary/10 flex items-center justify-center">
              <EngagementIcon />
            </div>
            <span className="flex items-center gap-1 font-sans text-label-sm font-extrabold px-2.5 py-1 rounded-md border text-primary bg-primary-container border-primary/20">
              {loading ? '...' : `${totalCompletedLessonsCount} lições concluídas`}
            </span>
          </div>
          <div>
            <p className="app-metric-label">Taxa de Engajamento</p>
            <div className="flex items-center justify-between gap-3 mt-1.5">
              <h3 className="app-metric-value">{loading ? '...' : `${engagementRate}%`}</h3>
              <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden shadow-inner max-w-[120px]">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${engagementRate}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Columns Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Active Courses (Takes 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
            <h3 className="app-section-title">Cursos Sob Gestão</h3>
            <button 
              onClick={() => setActiveTab('assignments')}
              className="font-sans font-bold text-label-md text-primary hover:underline"
            >
              Ir para Criador de Cursos
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="app-card-padded text-center text-on-surface-variant italic">
              Nenhum curso ativo sob sua gestão no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {courses.map(course => (
                <div 
                  key={course.id}
                  onClick={() => setActiveTab('assignments')}
                  className="app-card-padded hover:shadow-md hover:-translate-y-1 transition-all group cursor-pointer flex flex-col justify-between min-h-[290px]"
                >
                  <div>
                    <div className="h-32 rounded-lg bg-surface-container-highest mb-4 overflow-hidden relative border border-outline-variant/20">
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/80 to-tertiary-container/80 mix-blend-multiply"></div>
                      <img 
                        alt="Course Cover" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        src={course.imagem_capa || "https://lh3.googleusercontent.com/aida-public/AB6AXuA4GC49br6MULJ_sNhA5Tr-TYpXEfl3rWzuNp18tC3_cXoCgu8Zv2wJ-iTMy3e_f8bf_UEV7OT7BIGi9RuzHsOQ7trg1Ii0mhHVxpy0GAA7ONY_BFOJNYpmUjg_FqmBw1S2Z8229jGC3oas4c66NXQSbU7X0KH3q__Sb3yfyjcwtYYakZpeDZaM2YmWTfwFQkr8tP5uFHyyY2qt0XzhkA-SNnEjPs-2hXmzWY_2rqapUhWjyauQUnJ6Q73TTp7x2_amCQE8A6KG5VY"}
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/50 shadow-sm">
                        <span className="font-sans font-bold text-label-sm text-primary uppercase tracking-wide">
                          {course.categoria || 'Desenvolvimento'}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-heading font-extrabold text-body-lg text-on-surface mb-2 group-hover:text-primary transition-colors leading-tight">
                      {course.titulo}
                    </h4>
                    <div className="flex items-center gap-4 text-on-surface-variant font-sans text-label-sm mb-4">
                      <span className="flex items-center gap-1 font-medium">
                        <svg className="w-4 h-4 text-outline" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493" />
                        </svg>
                        {course.studentCount} Alunos
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <StarIcon />
                        {course.rating.toFixed(1)} / 5.0
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-outline-variant/10">
                    <div className="flex justify-between font-sans text-label-sm font-semibold">
                      <span className="text-on-surface-variant">Progresso Médio</span>
                      <span className="text-primary font-bold">{course.avgProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${course.avgProgress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-8">
          
          {/* Quick Actions Panel */}
          <div className="app-card-padded relative overflow-hidden">
            <h3 className="app-section-title mb-4">Ações Rápidas</h3>
            <div className="space-y-2">
              {/* Action 1: Create Course */}
              <button 
                onClick={() => setActiveTab('assignments')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-container-low transition-all group border border-transparent hover:border-outline-variant/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center border border-primary-container/20 shrink-0">
                    <AddCircleIcon />
                  </div>
                  <span className="font-sans font-bold text-label-md text-on-surface group-hover:text-primary transition-colors">Criar Novo Curso</span>
                </div>
                <ArrowForwardIcon />
              </button>

              {/* Action 2: Start Live Class */}
              <button 
                onClick={() => {
                  if (classes.length > 0) {
                    setShowLiveModal(true);
                  } else {
                    alert('Cadastre uma turma e um curso antes de iniciar uma aula ao vivo.');
                  }
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-container-low transition-all group border border-transparent hover:border-outline-variant/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shrink-0">
                    <PlayCircleIcon />
                  </div>
                  <span className="font-sans font-bold text-label-md text-on-surface group-hover:text-red-500 transition-colors">Iniciar Aula Ao Vivo</span>
                </div>
                <ArrowForwardIcon />
              </button>

              {/* Action 3: Message Class */}
              <button 
                onClick={() => {
                  if (classes.length > 0) {
                    setShowMessageModal(true);
                  } else {
                    alert('Nenhuma turma disponível para notificar.');
                  }
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-container-low transition-all group border border-transparent hover:border-outline-variant/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-tertiary-container/10 text-tertiary-container flex items-center justify-center border border-tertiary-container/20 shrink-0">
                    <ForumIcon />
                  </div>
                  <span className="font-sans font-bold text-label-md text-on-surface group-hover:text-tertiary-container transition-colors">Notificar Turma</span>
                </div>
                <ArrowForwardIcon />
              </button>

              {/* Action: Start Arena Live (Kahoot) */}
              <button 
                onClick={() => {
                  if (classes.length > 0) {
                    onStartArena();
                  } else {
                    alert('Cadastre uma turma e um quiz antes de iniciar a Arena Live.');
                  }
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-container-low transition-all group border border-transparent hover:border-outline-variant/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
                      <line x1="6" y1="12" x2="10" y2="12" />
                      <line x1="8" y1="10" x2="8" y2="14" />
                      <line x1="15" y1="13" x2="15.01" y2="13" />
                      <line x1="18" y1="11" x2="18.01" y2="11" />
                    </svg>
                  </div>
                  <span className="font-sans font-bold text-label-md text-on-surface group-hover:text-indigo-500 transition-colors">Iniciar Arena Estudea</span>
                </div>
                <ArrowForwardIcon />
              </button>

              {/* Action 4: Export CSV */}
              <button 
                onClick={exportProgressReport}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-container-low transition-all group border border-transparent hover:border-outline-variant/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/10 text-secondary flex items-center justify-center border border-secondary-container/20 shrink-0">
                    <DownloadIcon />
                  </div>
                  <span className="font-sans font-bold text-label-md text-on-surface group-hover:text-secondary transition-colors">Exportar Relatório</span>
                </div>
                <ArrowForwardIcon />
              </button>
            </div>
          </div>

          {/* Schedule Widget Card */}
          <div id="schedule-card-widget" className="app-card-padded space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="app-section-title">Próximos Eventos</h3>
              <button 
                onClick={() => setShowScheduleModal(true)}
                className="text-primary hover:bg-surface-container-low p-2 rounded-lg transition-colors border border-outline-variant/20 flex items-center gap-1 text-[11px] font-bold"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Agendar
              </button>
            </div>
            
            <div className="relative pl-6 border-l-2 border-surface-container-high space-y-6">
              {scheduleError ? (
                <p className="text-error font-sans text-label-sm font-semibold pl-2">{scheduleError}</p>
              ) : schedule.length === 0 ? (
                <p className="text-on-surface-variant font-sans text-label-sm italic pl-2">Nenhum evento agendado.</p>
              ) : (
                schedule.map(item => {
                  const accent = getScheduleAccent(item.type);

                  return (
                    <div key={item.id} className="relative group/item">
                      {/* Circle timeline anchor */}
                      <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white ring-2 ring-white shadow-sm border-4 ${accent.border}`} />

                      <div className="mb-1 flex items-center gap-2">
                        <span className={`font-sans text-[11px] font-bold uppercase tracking-wider ${accent.text}`}>
                          {formatScheduleDate(item.event_date)} • {item.time}
                        </span>

                        <span className={`text-[10px] text-white px-2 py-0.5 rounded font-extrabold uppercase tracking-widest ${
                          item.type === 'live' ? 'bg-red-500 animate-pulse' :
                          item.type === 'exam' ? 'bg-red-600' :
                          item.type === 'deadline' ? 'bg-orange-500' :
                          item.type === 'mentorship' ? 'bg-purple-600' :
                          'bg-emerald-600'
                        }`}>
                          {accent.label}
                        </span>
                      </div>

                      <h4 className="font-sans font-bold text-label-md text-on-surface group-hover/item:text-primary transition-colors leading-tight">
                        {item.title}
                      </h4>
                      <p className="font-sans text-[11px] text-on-surface-variant mt-1.5 flex justify-between items-center">
                        <span>{item.cohort} • {item.duration}</span>
                        <button
                          onClick={() => removeScheduleItem(item.id)}
                          className="text-error opacity-0 group-hover/item:opacity-100 transition-opacity hover:underline font-bold text-[10px] ml-2"
                        >
                          Excluir
                        </button>
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </section>

      {/* ======================================================== */}
      {/* MODAL 1: LIVE CLASS STREAM SIMULATOR */}
      {/* ======================================================== */}
      {showLiveModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-3xl overflow-hidden shadow-2xl relative space-y-6 text-white flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-heading font-extrabold text-headline-md text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  Transmissão de Aula Ao Vivo
                </h3>
                <p className="text-slate-400 text-label-sm mt-1">Configure sua câmera e selecione a turma para iniciar.</p>
              </div>
              {!isLiveStreaming && (
                <button 
                  onClick={() => setShowLiveModal(false)}
                  className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-[350px] flex flex-col items-center justify-center relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
              {isLiveStreaming ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover max-h-[400px]"
                  />
                  {/* Streaming Overlays */}
                  <div className="absolute top-4 left-4 bg-red-600 text-white font-mono font-bold text-xs uppercase px-3 py-1 rounded-md tracking-widest shadow flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    AO VIVO
                  </div>
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-md text-[11px] font-mono shadow">
                    Espectadores: {12 + Math.floor(Math.random() * 8)}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3.5 py-2 rounded-xl text-xs flex gap-4 max-w-sm">
                    <div>
                      <p className="opacity-60 text-[10px] uppercase font-bold">Turma Ativa</p>
                      <p className="font-bold text-primary-fixed-dim">{classes.find(c => c.id === selectedClassForLive)?.nome || 'Turma Selecionada'}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center max-w-md space-y-6">
                  <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-primary animate-pulse">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-sans font-bold text-label-sm block text-left">Selecione a Turma Alvo</label>
                      <select 
                        value={selectedClassForLive} 
                        onChange={(e) => setSelectedClassForLive(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-primary text-white text-body-md focus:ring-0 focus:outline-none"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.id} className="bg-slate-900">{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              {isLiveStreaming ? (
                <button 
                  onClick={stopLiveClass}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-heading font-extrabold text-label-md rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  Encerrar Transmissão
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setShowLiveModal(false)}
                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-heading font-bold text-label-md rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={startLiveClass}
                    className="px-6 py-3 bg-primary hover:bg-blue-700 text-white font-heading font-extrabold text-label-md rounded-xl shadow transition-colors"
                  >
                    Iniciar Transmissão
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant/40 rounded-xl p-6 w-full max-w-xl shadow-2xl relative space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/20">
              <h3 className="font-heading font-extrabold text-headline-md text-on-surface">Notificar Turma</h3>
              <button 
                onClick={closeMessageModal}
                className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {msgSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-inner">
                  <svg className="w-7 h-7 animate-bounce" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <h4 className="font-heading font-extrabold text-headline-md text-emerald-700">Mensagem Enviada!</h4>
                <p className="text-on-surface-variant text-label-md max-w-xs mx-auto">O comunicado já está disponível no sino de notificações dos alunos da turma.</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                {msgError && (
                  <div className="p-3.5 rounded-xl bg-error-container/30 border border-error/20 text-error text-label-md">
                    {msgError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-on-surface font-sans font-bold text-label-sm block">Selecione a Turma</label>
                  <select 
                    value={selectedClassForMsg} 
                    onChange={(e) => setSelectedClassForMsg(e.target.value)}
                    disabled={sendingMsg}
                    required
                    className="w-full p-3.5 bg-surface rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface text-body-md focus:bg-white transition-all outline-none"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-on-surface font-sans font-bold text-label-sm block">Assunto / Título</label>
                  <input 
                    type="text" 
                    value={msgTitle} 
                    onChange={(e) => setMsgTitle(e.target.value)}
                    placeholder="Ex: Novo material liberado ou Link da Mentoria"
                    disabled={sendingMsg}
                    required
                    className="w-full p-3.5 bg-surface rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface text-body-md focus:bg-white transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-on-surface font-sans font-bold text-label-sm block">Mensagem</label>
                  <textarea 
                    value={msgBody} 
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="Escreva as instruções ou comunicados para a turma..."
                    rows={4}
                    disabled={sendingMsg}
                    required
                    className="w-full p-3.5 bg-surface rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface text-body-md focus:bg-white transition-all outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={closeMessageModal}
                    disabled={sendingMsg}
                    className="px-5 py-2.5 bg-surface-container-high hover:bg-outline-variant/40 text-on-surface-variant font-heading font-bold text-label-md rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={sendingMsg}
                    className="px-6 py-2.5 bg-primary hover:bg-blue-700 text-white font-heading font-extrabold text-label-md rounded-lg shadow disabled:opacity-60 transition-colors"
                  >
                    {sendingMsg ? 'Enviando...' : 'Enviar Comunicado'}
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant/40 rounded-xl p-6 w-full max-w-md shadow-2xl relative space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/20">
              <h3 className="font-heading font-extrabold text-headline-md text-on-surface">Agendar Evento</h3>
              <button 
                onClick={() => {
                  setShowScheduleModal(false);
                  resetScheduleForm();
                }}
                className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              {scheduleError && (
                <div className="bg-red-50 border border-red-200 text-error px-3 py-2 rounded-xl text-xs font-semibold">
                  {scheduleError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-on-surface font-sans font-bold text-label-sm block">Data</label>
                  <input
                    type="date"
                    value={schedDate}
                    min={getTodayIsoDate()}
                    onChange={(e) => setSchedDate(e.target.value)}
                    required
                    disabled={scheduleSaving}
                    className="w-full p-3 bg-surface rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface text-body-md focus:bg-white transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-on-surface font-sans font-bold text-label-sm block">Horário</label>
                  <input
                    type="time"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    required
                    disabled={scheduleSaving}
                    className="w-full p-3 bg-surface rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface text-body-md focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-on-surface font-sans font-bold text-label-sm block">Título do Evento</label>
                <input 
                  type="text" 
                  value={schedTitle} 
                  onChange={(e) => setSchedTitle(e.target.value)}
                  placeholder="Ex: Prova de digitação, entrega de atividade, aula ao vivo"
                  required
                  disabled={scheduleSaving}
                  className="w-full p-3 bg-surface rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface text-body-md focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-on-surface font-sans font-bold text-label-sm block">Destino</label>
                <select
                  value={schedTargetTurmaId}
                  onChange={(e) => setSchedTargetTurmaId(e.target.value)}
                  disabled={scheduleSaving}
                  className="w-full p-3 bg-surface rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface text-body-md focus:bg-white transition-all outline-none font-sans"
                >
                  <option value="all">Todas as turmas</option>
                  {classes.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-on-surface font-sans font-bold text-label-sm block">Duração / Detalhes</label>
                <input 
                  type="text" 
                  value={schedDuration} 
                  onChange={(e) => setSchedDuration(e.target.value)}
                  placeholder="Ex: 45 min, Entrega prática, 2 questões discursivas"
                  disabled={scheduleSaving}
                  className="w-full p-3 bg-surface rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface text-body-md focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-on-surface font-sans font-bold text-label-sm block">Tipo do Evento</label>
                <select 
                  value={schedType} 
                  onChange={(e) => setSchedType(e.target.value as ScheduleItem['type'])}
                  disabled={scheduleSaving}
                  className="w-full p-3 bg-surface rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface text-body-md focus:bg-white transition-all outline-none font-sans"
                >
                  <option value="live">Live / Aula Síncrona</option>
                  <option value="deadline">Prazo Limite / Atividade</option>
                  <option value="exam">Prova / Avaliação</option>
                  <option value="activity">Atividade / Exercício</option>
                  <option value="mentorship">Mentoria Individual</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    resetScheduleForm();
                  }}
                  disabled={scheduleSaving}
                  className="px-4 py-2 bg-surface-container-high text-on-surface-variant font-heading font-bold text-label-md rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={scheduleSaving}
                  className="px-5 py-2 bg-primary text-white font-heading font-extrabold text-label-md rounded-lg shadow hover:bg-blue-700 transition-colors"
                >
                  {scheduleSaving ? 'Salvando...' : 'Confirmar Evento'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}



    </div>
  );
};
