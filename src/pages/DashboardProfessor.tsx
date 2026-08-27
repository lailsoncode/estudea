import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserGroupIcon,
  Alert01Icon,
  BookOpen01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon
} from '@hugeicons/core-free-icons';

interface Turma {
  id: string;
  nome: string;
  codigo_acesso: string;
  curso_id: string | null;
  created_at: string;
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
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [aulasLiberadas, setAulasLiberadas] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false);

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
          const storedTurmaId = localStorage.getItem('selectedTurmaId');
          const matchedTurma = turmasData.find((t) => t.id === storedTurmaId);
          setSelectedTurma(matchedTurma || turmasData[0]);
        }
      } catch (err) {
        console.error('Erro ao buscar dados iniciais:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch lessons and released lessons whenever the active class changes
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

        // 2. Fetch released lessons for this class
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

  const getInitials = (nome: string) => {
    if (!nome) return 'AL';
    const parts = nome.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      {/* Top Header Panel */}
      <header className="product-card p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="max-w-2xl">
            <span className="product-section-kicker">Controle de Acesso</span>
            <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">Liberação de Aulas</h1>
            <p className="product-subtitle">
              Controle quais lições os alunos desta turma podem visualizar e realizar na trilha de aprendizado.
            </p>
          </div>

          <div className="relative w-full lg:w-[360px] shrink-0">
            <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Turma em análise
            </p>
            <button
              type="button"
              onClick={() => setShowTurmaDropdown((current) => !current)}
              disabled={turmas.length <= 1}
              className="w-full flex items-center gap-3 rounded-product-control border border-outline-variant/60 bg-surface-container-low px-4 py-2.5 text-left shadow-xs transition-all hover:border-primary/40 hover:bg-surface-container disabled:cursor-default disabled:hover:border-outline-variant/60 disabled:hover:bg-surface-container-low"
              title={turmas.length <= 1 ? 'Apenas uma turma disponível' : 'Trocar turma'}
            >
              <div className="w-9 h-9 rounded-product-control bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-extrabold text-xs text-on-surface truncate">
                  {selectedTurma ? selectedTurma.nome : 'Nenhuma turma encontrada'}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  {selectedTurma?.codigo_acesso && (
                    <span className="font-mono text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded border border-outline-variant/40">
                      {selectedTurma.codigo_acesso}
                    </span>
                  )}
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    {selectedTurma
                      ? turmas.length > 1 ? `${turmas.length} turmas disponíveis` : 'Turma atual'
                      : 'Nenhuma turma cadastrada'}
                  </span>
                </div>
              </div>
              {turmas.length > 1 && (
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={16}
                  strokeWidth={2.4}
                  className={`text-on-surface-variant transition-transform ${showTurmaDropdown ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {showTurmaDropdown && turmas.length > 1 && (
              <div className="absolute right-0 mt-2 w-full bg-surface-container-lowest border border-outline-variant/60 rounded-product-control shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-outline-variant/40">
                  <p className="font-heading font-extrabold text-xs text-on-surface">Selecionar turma</p>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Troque a turma sem sair da visão de progresso.</p>
                </div>
                <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                  {turmas.map((t) => {
                    const active = selectedTurma?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTurma(t);
                          localStorage.setItem('selectedTurmaId', t.id);
                          setShowTurmaDropdown(false);
                        }}
                        className={`w-full text-left rounded-product-control px-3 py-2 transition-colors flex items-center justify-between gap-3 ${
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-product-control flex items-center justify-center font-heading font-extrabold text-[10px] shrink-0 ${
                            active
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container text-on-surface-variant border border-outline-variant/40'
                          }`}>
                            {getInitials(t.nome || '')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-xs truncate">{t.nome}</p>
                            <p className="font-mono text-[10px] text-on-surface-variant">Código {t.codigo_acesso}</p>
                          </div>
                        </div>
                        {active && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider rounded-full bg-primary/10 text-primary px-2 py-0.5 border border-primary/20">
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
      </header>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total de Aulas */}
        <div className="product-metric">
          <div className="h-10 w-10 rounded-product-control bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <HugeiconsIcon icon={BookOpen01Icon} size={18} strokeWidth={2} />
          </div>
          <div>
            <h4 className="product-metric-label">
              Total de Aulas
            </h4>
            <p className="product-metric-value mt-0.5">
              {loading ? '...' : aulas.length}
            </p>
          </div>
        </div>

        {/* Card 2: Aulas Liberadas */}
        <div className="product-metric">
          <div className="h-10 w-10 rounded-product-control bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} />
          </div>
          <div>
            <h4 className="product-metric-label">
              Aulas Liberadas
            </h4>
            <p className="product-metric-value mt-0.5">
              {loading ? '...' : aulasLiberadas.length}
            </p>
          </div>
        </div>

        {/* Card 3: Aulas Bloqueadas */}
        <div className="product-metric">
          <div className="h-10 w-10 rounded-product-control bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
            <HugeiconsIcon icon={Alert01Icon} size={18} strokeWidth={2} />
          </div>
          <div>
            <h4 className="product-metric-label">
              Aulas Bloqueadas
            </h4>
            <p className="product-metric-value mt-0.5">
              {loading ? '...' : (aulas.length - aulasLiberadas.length)}
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid View */}
      {loading ? (
        <div className="product-card p-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-on-surface-variant font-semibold animate-pulse">Carregando dados de liberação de aulas...</p>
        </div>
      ) : (
        aulas.length === 0 ? (
          <div className="product-empty-state space-y-2 p-10">
            <HugeiconsIcon icon={Alert01Icon} size={36} className="text-amber-500 mx-auto" strokeWidth={2} />
            <p className="font-heading font-extrabold text-sm text-on-surface mt-2">
              Sem Aulas Cadastradas
            </p>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              {selectedTurma?.curso_id 
                ? 'O curso vinculado a esta turma não possui aulas cadastradas no momento.'
                : 'Esta turma não possui um curso vinculado ou não há aulas cadastradas no sistema.'}
            </p>
          </div>
        ) : (
          <div className="product-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/60">
              <div>
                <h3 className="font-heading font-extrabold text-sm text-on-surface">Liberar Aulas da Turma</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Os alunos cadastrados na turma <strong>{selectedTurma?.nome}</strong> só conseguirão acessar as aulas que você liberar abaixo.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={handleReleaseAllLessons}
                  className="product-primary-action text-xs !bg-emerald-600 hover:!bg-emerald-700"
                >
                  Liberar Todas
                </button>
                <button
                  onClick={handleLockAllLessons}
                  className="product-secondary-action text-xs text-error hover:bg-error/10"
                >
                  Bloquear Todas
                </button>
              </div>
            </div>

            {/* List of lessons sorted */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {aulas.map((aula) => {
                const isLiberada = aulasLiberadas.includes(aula.id);
                return (
                  <div
                    key={aula.id}
                    className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-product-control border border-outline-variant/60 hover:border-primary/40 transition-all flex-wrap sm:flex-nowrap gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-product-control bg-surface-container flex items-center justify-center font-mono font-extrabold text-xs text-on-surface-variant border border-outline-variant/40 shrink-0">
                        {aula.numero_aula.toString().padStart(2, '0')}
                      </div>
                      <div className="truncate">
                        <h4 className="font-heading font-extrabold text-xs text-on-surface truncate">{aula.titulo}</h4>
                        <p className="text-[10px] text-on-surface-variant font-mono capitalize">
                          {aula.tipo} {aula.duracao ? `• ${aula.duracao}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isLiberada 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
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
                        <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
};
