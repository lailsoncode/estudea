import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserGroupIcon,
  Task01Icon,
  Progress01Icon,
  Alert01Icon,
  BookOpen01Icon,
  ArrowDown01Icon,
  FireIcon,
  SparklesIcon
} from '@hugeicons/core-free-icons';

interface Turma {
  id: string;
  nome: string;
  codigo_acesso: string;
  curso_id: string | null;
  created_at: string;
}

interface StudentProfile {
  id: string;
  nome: string | null;
  role: string | null;
  turma_id: string | null;
  ofensiva_atual?: number;
  maior_ofensiva?: number;
}

interface Aula {
  id: string;
  numero_aula: number;
  titulo: string;
  conteudo: string;
  modulo_id: string | null;
  ordem: number;
  tipo?: 'video' | 'texto' | 'quiz' | 'arquivo';
  duracao?: string | null;
  atividades?: {
    id: string;
    aula_id: string;
    enunciado: string;
    tipo_entrega: 'texto' | 'imagem';
  }[];
}

interface Progresso {
  id: string;
  aluno_id: string;
  aula_id: string;
  concluido_em: string;
}

interface Entrega {
  id: string;
  aluno_id: string;
  atividade_id: string;
  resposta: string;
  nota: number | null;
  feedback_professor: string | null;
}

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

export const DashboardProfessor: React.FC = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [progresso, setProgresso] = useState<Progresso[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [aulasLiberadas, setAulasLiberadas] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false);
  const [hoveredSquare, setHoveredSquare] = useState<{ studentId: string; lessonIndex: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'progress' | 'lessons'>('progress');

  // Fetch initial data: turmas
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: turmasData, error: turmasError } = await supabase
          .from('turmas')
          .select('*')
          .order('created_at', { ascending: false });

        if (turmasError) throw turmasError;
        setTurmas(turmasData || []);

        if (turmasData && turmasData.length > 0) {
          setSelectedTurma(turmasData[0]);
        }
      } catch (err) {
        console.error('Erro ao buscar dados iniciais:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch lessons, student progress, and submissions whenever the active class changes
  useEffect(() => {
    if (!selectedTurma) return;

    const fetchClassData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Lessons dynamically based on course link or fallback
        let sortedAulas: Aula[] = [];
        if (selectedTurma.curso_id) {
          // Fetch modules of the course sorted by order
          const { data: modulosData, error: modulosError } = await supabase
            .from('modulos')
            .select('id, ordem')
            .eq('curso_id', selectedTurma.curso_id)
            .order('ordem', { ascending: true });

          if (modulosError) throw modulosError;

          if (modulosData && modulosData.length > 0) {
            const moduloIds = modulosData.map(m => m.id);
            // Fetch lessons linked to these modules
            const { data: aulasData, error: aulasError } = await supabase
              .from('aulas')
              .select('*, atividades(*)')
              .in('modulo_id', moduloIds);

            if (aulasError) throw aulasError;

            // Sort lessons client-side by module order, then lesson order
            const modIdToOrder = new Map(modulosData.map((m, idx) => [m.id, idx]));
            sortedAulas = (aulasData || []).sort((a, b) => {
              const orderA = modIdToOrder.get(a.modulo_id!) ?? 999;
              const orderB = modIdToOrder.get(b.modulo_id!) ?? 999;
              if (orderA !== orderB) return orderA - orderB;
              return (a.ordem ?? 0) - (b.ordem ?? 0);
            });
          }
        } else {
          // Fallback: fetch global lessons (lessons with no modulo_id)
          const { data: aulasData, error: aulasError } = await supabase
            .from('aulas')
            .select('*, atividades(*)')
            .is('modulo_id', null)
            .order('numero_aula', { ascending: true });

          if (aulasError) throw aulasError;
          sortedAulas = aulasData || [];
        }

        setAulas(sortedAulas);

        // 2. Fetch student profiles in this class
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('turma_id', selectedTurma.id)
          .eq('role', 'student')
          .order('nome', { ascending: true });

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        if (studentsData && studentsData.length > 0) {
          const studentIds = studentsData.map((s) => s.id);

          // 3. Fetch progress
          const { data: progressoData, error: progressoError } = await supabase
            .from('progresso_alunos')
            .select('*')
            .in('aluno_id', studentIds);

          if (progressoError) throw progressoError;
          setProgresso(progressoData || []);

          // 4. Fetch submissions
          const { data: entregasData, error: entregasError } = await supabase
            .from('entregas_atividades')
            .select('*')
            .in('aluno_id', studentIds);

          if (entregasError) throw entregasError;
          setEntregas(entregasData || []);
        } else {
          setProgresso([]);
          setEntregas([]);
        }

        // 5. Fetch released lessons for this class
        const { data: liberadasData, error: liberadasError } = await supabase
          .from('turma_aulas_liberadas')
          .select('aula_id')
          .eq('turma_id', selectedTurma.id);

        if (liberadasError) throw liberadasError;
        setAulasLiberadas((liberadasData || []).map(r => r.aula_id));
      } catch (err) {
        console.error('Erro ao buscar dados da turma:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [selectedTurma]);

  // Class lesson release management functions
  const handleToggleClassLessonRelease = async (aulaId: string) => {
    if (!selectedTurma) return;
    const isCurrentlyLiberada = aulasLiberadas.includes(aulaId);
    try {
      if (isCurrentlyLiberada) {
        // Bloquear: remover o registro
        const { error } = await supabase
          .from('turma_aulas_liberadas')
          .delete()
          .eq('turma_id', selectedTurma.id)
          .eq('aula_id', aulaId);
        if (error) throw error;
        setAulasLiberadas(prev => prev.filter(id => id !== aulaId));
      } else {
        // Liberar: criar o registro
        const { error } = await supabase
          .from('turma_aulas_liberadas')
          .insert({
            turma_id: selectedTurma.id,
            aula_id: aulaId
          });
        if (error) throw error;
        setAulasLiberadas(prev => [...prev, aulaId]);
      }
    } catch (err: unknown) {
      console.error('Erro ao alternar liberação da aula para turma:', err);
      alert(getErrorMessage(err, 'Erro ao alterar liberação da aula.'));
    }
  };

  const handleReleaseAllLessons = async () => {
    if (!selectedTurma || aulas.length === 0) return;
    if (!window.confirm('Tem certeza que deseja liberar todas as aulas do curso para esta turma?')) return;
    try {
      const { error: deleteError } = await supabase
        .from('turma_aulas_liberadas')
        .delete()
        .eq('turma_id', selectedTurma.id);
      if (deleteError) throw deleteError;

      const inserts = aulas.map(a => ({
        turma_id: selectedTurma.id,
        aula_id: a.id
      }));

      const { error: insertError } = await supabase
        .from('turma_aulas_liberadas')
        .insert(inserts);
      if (insertError) throw insertError;

      setAulasLiberadas(aulas.map(a => a.id));
    } catch (err: unknown) {
      console.error('Erro ao liberar todas as aulas:', err);
      alert(getErrorMessage(err, 'Erro ao liberar todas as aulas.'));
    }
  };

  const handleLockAllLessons = async () => {
    if (!selectedTurma || aulas.length === 0) return;
    if (!window.confirm('Tem certeza que deseja bloquear todas as aulas do curso para esta turma?')) return;
    try {
      const { error } = await supabase
        .from('turma_aulas_liberadas')
        .delete()
        .eq('turma_id', selectedTurma.id);
      if (error) throw error;

      setAulasLiberadas([]);
    } catch (err: unknown) {
      console.error('Erro ao bloquear todas as aulas:', err);
      alert(getErrorMessage(err, 'Erro ao bloquear todas as aulas.'));
    }
  };

  // Generate helper structures for rendering
  const getSquareState = (studentId: string, aula: Aula) => {
    if (!aula) return { status: 'nao_iniciado' as const, label: 'Aula não cadastrada' };

    const hasProgresso = progresso.some((p) => p.aluno_id === studentId && p.aula_id === aula.id);
    const atividade = aula.atividades?.[0];
    const entrega = atividade
      ? entregas.find((e) => e.aluno_id === studentId && e.atividade_id === atividade.id)
      : null;

    if (entrega) {
      if (entrega.nota === null || entrega.feedback_professor === null) {
        return {
          status: 'pendente' as const,
          label: `${aula.titulo} (Pendente de Correção)`,
          entrega
        };
      } else {
        return {
          status: 'concluido' as const,
          label: `${aula.titulo} (Concluído & Aprovado - Nota: ${entrega.nota})`,
          entrega
        };
      }
    }

    if (hasProgresso) {
      return {
        status: 'concluido' as const,
        label: `${aula.titulo} (Concluído)`
      };
    }

    return {
      status: 'nao_iniciado' as const,
      label: `${aula.titulo} (Não Iniciado)`
    };
  };

  // Metrics calculations
  const totalStudents = students.length;

  const studentsCompletedCount = students.map((s) => {
    let completed = 0;
    aulas.forEach((aula) => {
      if (getSquareState(s.id, aula).status === 'concluido') {
        completed++;
      }
    });
    return completed;
  });

  const studentsPendingCount = students.map((s) => {
    let pending = 0;
    aulas.forEach((aula) => {
      if (getSquareState(s.id, aula).status === 'pendente') {
        pending++;
      }
    });
    return pending;
  });

  const totalCompletedLessons = studentsCompletedCount.reduce((acc, val) => acc + val, 0);
  const totalPendingCorrections = studentsPendingCount.reduce((acc, val) => acc + val, 0);

  const mediaTurma =
    totalStudents > 0 && aulas.length > 0
      ? Math.round((totalCompletedLessons / (totalStudents * aulas.length)) * 100)
      : 0;

  // Classic status colors
  const getColorClasses = (status: 'concluido' | 'pendente' | 'nao_iniciado') => {
    switch (status) {
      case 'concluido':
        return 'bg-green-500 text-white';
      case 'pendente':
        return 'bg-yellow-400 text-on-surface';
      case 'nao_iniciado':
        return 'bg-gray-200 border border-gray-300/40';
    }
  };

  const getLegendColor = (status: 'concluido' | 'pendente' | 'nao_iniciado') => {
    switch (status) {
      case 'concluido':
        return 'bg-green-500';
      case 'pendente':
        return 'bg-yellow-400';
      case 'nao_iniciado':
        return 'bg-gray-200 border border-gray-300/40';
    }
  };

  const getInitials = (nome: string) => {
    if (!nome) return 'AL';
    const parts = nome.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="app-page">
      {/* Top Header Panel */}
      <header className="app-page-header">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="app-eyebrow">
              Progresso dos alunos
            </p>
            <h2 className="app-title">
              Mapa de evolução da turma
            </h2>
            <p className="app-subtitle">
              Acompanhe conclusão, pendências de correção e liberação de aulas em uma visão compacta.
            </p>
          </div>

          <div className="relative w-full lg:w-[360px] shrink-0">
            <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Turma em análise
            </p>
            <button
              type="button"
              onClick={() => setShowTurmaDropdown((current) => !current)}
              disabled={turmas.length <= 1}
              className="w-full flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-3 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-surface-container-low disabled:cursor-default disabled:hover:border-outline-variant/60 disabled:hover:bg-surface-container-lowest"
              title={turmas.length <= 1 ? 'Apenas uma turma disponível' : 'Trocar turma'}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-extrabold text-body-md text-on-surface truncate">
                  {selectedTurma ? selectedTurma.nome : 'Nenhuma turma encontrada'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {selectedTurma?.codigo_acesso && (
                    <span className="font-mono text-[11px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant/40">
                      {selectedTurma.codigo_acesso}
                    </span>
                  )}
                  <span className="text-label-sm text-on-surface-variant">
                    {selectedTurma
                      ? turmas.length > 1 ? `${turmas.length} turmas disponíveis` : 'Turma atual'
                      : 'Nenhuma turma cadastrada'}
                  </span>
                </div>
              </div>
              {turmas.length > 1 && (
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={18}
                  strokeWidth={2.4}
                  className={`text-on-surface-variant transition-transform ${showTurmaDropdown ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {showTurmaDropdown && turmas.length > 1 && (
              <div className="absolute right-0 mt-2 w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-outline-variant/30">
                  <p className="font-heading font-bold text-label-md text-on-surface">Selecionar turma</p>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">Troque a turma sem sair da visão de progresso.</p>
                </div>
                <div className="max-h-72 overflow-y-auto p-1.5">
                  {turmas.map((t) => {
                    const active = selectedTurma?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTurma(t);
                          setShowTurmaDropdown(false);
                        }}
                        className={`w-full text-left rounded-lg px-3 py-3 transition-colors flex items-center justify-between gap-3 ${
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-heading font-extrabold text-label-sm shrink-0 ${
                            active
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container text-on-surface-variant border border-outline-variant/40'
                          }`}>
                            {getInitials(t.nome || '')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-label-md truncate">{t.nome}</p>
                            <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">Código {t.codigo_acesso}</p>
                          </div>
                        </div>
                        {active && (
                          <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-primary/10 text-primary px-2 py-1 border border-primary/20">
                            Atual
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-outline-variant/30 pt-4">
          <div>
            <p className="text-label-sm font-bold text-on-surface uppercase tracking-wider">
              Legenda de status
            </p>
            <p className="text-label-sm text-on-surface-variant mt-0.5">
              Padrão clássico: verde para concluído, amarelo para pendência e cinza para não iniciado.
            </p>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap gap-3 border border-outline-variant/60 rounded-xl px-4 py-2.5 bg-surface-container-lowest shadow-sm text-label-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-[3px] ${getLegendColor('concluido')}`} />
              <span className="text-on-surface-variant">Concluído</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-[3px] ${getLegendColor('pendente')}`} />
              <span className="text-on-surface-variant">Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-[3px] ${getLegendColor('nao_iniciado')}`} />
              <span className="text-on-surface-variant">Não iniciado</span>
            </div>
          </div>
        </div>

      </header>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Alunos Ativos */}
        <div className="app-card-padded hover:shadow-md transition-all flex items-center gap-5">
          <div className="p-3.5 rounded bg-primary/10 text-primary border border-primary/20">
            <HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={2} />
          </div>
          <div>
            <h4 className="app-metric-label">
              Alunos Ativos
            </h4>
            <p className="app-metric-value mt-2">
              {loading ? '...' : totalStudents}
            </p>
          </div>
        </div>

        {/* Card 2: Média de Conclusão */}
        <div className="app-card-padded hover:shadow-md transition-all flex items-center gap-5">
          <div className="p-3.5 rounded bg-secondary/10 text-secondary border border-secondary/20">
            <HugeiconsIcon icon={Progress01Icon} size={20} strokeWidth={2} />
          </div>
          <div>
            <h4 className="app-metric-label">
              Média da Turma
            </h4>
            <p className="app-metric-value mt-2">
              {loading ? '...' : `${mediaTurma}%`}
            </p>
          </div>
        </div>

        {/* Card 3: Aguardando Correção */}
        <div className="app-card-padded hover:shadow-md transition-all flex items-center gap-5">
          <div className="p-3.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <HugeiconsIcon icon={Task01Icon} size={20} strokeWidth={2} />
          </div>
          <div>
            <h4 className="app-metric-label">
              Aguardando Correção
            </h4>
            <p className="app-metric-value mt-2">
              {loading ? '...' : totalPendingCorrections}
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid View */}
      {loading ? (
        <div className="app-card-padded text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant text-body-lg">Carregando dados de progresso da turma...</p>
        </div>
      ) : (
        <>
          {/* Tabs Navigation */}
          <div className="flex border-b border-outline-variant/60 mb-6">
            <button
              onClick={() => setActiveTab('progress')}
              className={`px-5 py-3 font-heading font-bold text-label-md border-b-2 transition-all cursor-pointer ${
                activeTab === 'progress'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Progresso dos Estudantes
            </button>
            <button
              onClick={() => setActiveTab('lessons')}
              className={`px-5 py-3 font-heading font-bold text-label-md border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'lessons'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <HugeiconsIcon icon={BookOpen01Icon} size={16} />
              Liberação de Aulas
            </button>
          </div>

          {activeTab === 'progress' ? (
            totalStudents === 0 ? (
              <div className="app-card-padded text-center text-on-surface-variant space-y-2">
                <HugeiconsIcon icon={Alert01Icon} size={40} className="text-outline mx-auto" />
                <p className="app-section-title mt-4">
                  Nenhum Aluno Cadastrado
                </p>
                <p className="text-body-md">
                  Compartilhe o código de acesso <span className="font-bold font-mono text-secondary bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 select-all">{selectedTurma?.codigo_acesso}</span> com seus alunos para que eles possam se cadastrar.
                </p>
              </div>
            ) : aulas.length === 0 ? (
              <div className="app-card-padded text-center text-on-surface-variant space-y-2">
                <HugeiconsIcon icon={Alert01Icon} size={40} className="text-outline mx-auto" />
                <p className="app-section-title mt-4">
                  Sem Aulas Cadastradas
                </p>
                <p className="text-body-md">
                  {selectedTurma?.curso_id 
                    ? 'O curso vinculado a esta turma não possui aulas cadastradas no momento.'
                    : 'Esta turma não possui um curso vinculado ou não há aulas cadastradas no sistema.'}
                </p>
                <p className="text-label-sm max-w-sm mx-auto text-slate-400">
                  Acesse o <strong>Criador de Cursos</strong> para adicionar módulos e aulas, ou vincule a turma a um curso na aba <strong>Gerenciar Turmas</strong>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {students.map((student, idx) => {
                  const completedCount = studentsCompletedCount[idx];

                  return (
                    <article
                      key={student.id}
                      className={`bg-surface-container-lowest rounded-xl p-5 border shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group flex flex-col justify-between ${
                        completedCount < (aulas.length * 0.4)
                          ? 'border-error/25 bg-red-50/5'
                          : 'border-outline-variant/50'
                      }`}
                    >
                      <div>
                        {/* Card Student Header */}
                        <div className="flex items-center gap-3.5 mb-5">
                          <div className="w-11 h-11 rounded-full bg-primary-fixed flex items-center justify-center font-label-md text-label-md text-on-primary-fixed font-bold shadow-inner shrink-0">
                            {getInitials(student.nome || '')}
                          </div>
                          <div className="truncate">
                            <h3 className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors font-bold truncate">
                              {student.nome || 'Aluno sem Nome'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className={`text-[11px] font-bold ${
                                completedCount < (aulas.length * 0.4) ? 'text-error' : 'text-slate-500'
                              }`}>
                                {completedCount}/{aulas.length} Aulas
                              </span>
                              {(student.ofensiva_atual || 0) > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 border border-orange-200/30 px-1.5 py-0.5 rounded-full" title={`Ofensiva de ${student.ofensiva_atual} dias`}>
                                  <HugeiconsIcon icon={FireIcon} size={10} strokeWidth={2.5} />
                                  {student.ofensiva_atual}d
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 font-bold bg-purple-50 border border-purple-200/30 px-1.5 py-0.5 rounded-full" title={`XP acumulado`}>
                                <HugeiconsIcon icon={SparklesIcon} size={10} strokeWidth={2.5} />
                                {(completedCount * 50) + ((student.ofensiva_atual || 0) * 20)} XP
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Thermal Grid arranged dynamically */}
                        <div className="grid grid-cols-10 gap-1.5 w-full relative">
                          {aulas.map((aula, i) => {
                            const squareData = getSquareState(student.id, aula);
                            const isHovered =
                              hoveredSquare &&
                              hoveredSquare.studentId === student.id &&
                              hoveredSquare.lessonIndex === i;

                            return (
                              <div
                                key={aula.id}
                                onMouseEnter={() => setHoveredSquare({ studentId: student.id, lessonIndex: i })}
                                onMouseLeave={() => setHoveredSquare(null)}
                                className={`aspect-square rounded-[3px] hover:scale-110 cursor-pointer transition-all ${getColorClasses(
                                  squareData.status
                                  )}`}
                                title={squareData.label}
                              >
                                {/* Rich Tooltip popup */}
                                {isHovered && (
                                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[11px] font-medium py-1.5 px-3 rounded shadow-lg z-50 w-44 pointer-events-none text-center font-sans">
                                    {squareData.label}
                                    <div className="w-2 h-2 bg-inverse-surface rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : (
            aulas.length === 0 ? (
              <div className="app-card-padded text-center text-on-surface-variant space-y-2">
                <HugeiconsIcon icon={Alert01Icon} size={40} className="text-outline mx-auto" />
                <p className="app-section-title mt-4">
                  Sem Aulas Cadastradas
                </p>
                <p className="text-body-md">
                  {selectedTurma?.curso_id 
                    ? 'O curso vinculado a esta turma não possui aulas cadastradas no momento.'
                    : 'Esta turma não possui um curso vinculado ou não há aulas cadastradas no sistema.'}
                </p>
              </div>
            ) : (
              <div className="app-card-padded space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
                  <div>
                    <h3 className="app-section-title">Liberar Aulas da Turma</h3>
                    <p className="text-body-md text-on-surface-variant mt-1">
                      Os alunos cadastrados na turma <strong>{selectedTurma?.nome}</strong> só conseguirão acessar as aulas que você liberar abaixo.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={handleReleaseAllLessons}
                      className="px-4 py-2.5 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 text-label-sm font-heading font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Liberar Todas
                    </button>
                    <button
                      onClick={handleLockAllLessons}
                      className="px-4 py-2.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-label-sm font-heading font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Bloquear Todas
                    </button>
                  </div>
                </div>

                {/* List of lessons sorted */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {aulas.map((aula) => {
                    const isLiberada = aulasLiberadas.includes(aula.id);
                    return (
                      <div
                        key={aula.id}
                        className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 hover:border-slate-300 transition-all flex-wrap sm:flex-nowrap gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center font-mono font-bold text-slate-500 border border-outline-variant/30 shrink-0">
                            {aula.numero_aula.toString().padStart(2, '0')}
                          </div>
                          <div className="truncate">
                            <h4 className="font-heading font-bold text-body-md text-on-surface truncate">{aula.titulo}</h4>
                            <p className="text-label-sm text-on-surface-variant mt-0.5 font-mono capitalize">
                              {aula.tipo} {aula.duracao ? `• ${aula.duracao}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 ml-auto sm:ml-0">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                            isLiberada 
                              ? 'bg-green-50 border-green-200 text-green-700' 
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {isLiberada ? 'Liberada' : 'Bloqueada'}
                          </span>
                          
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isLiberada}
                              onChange={() => handleToggleClassLessonRelease(aula.id)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};
