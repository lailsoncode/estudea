import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Alert01Icon,
  SchoolIcon,
  ArrowDown01Icon,
  Tick01Icon,
  BookOpen01Icon,
  Calendar01Icon,
  UserGroupIcon,
  Clock01Icon
} from '@hugeicons/core-free-icons';

interface Student {
  id: string;
  nome: string;
  avatar_url: string | null;
}

interface Turma {
  id: string;
  nome: string;
  codigo_acesso: string;
  curso_id: string | null;
}

interface Aula {
  id: string;
  titulo: string;
  numero_aula: number;
}

interface AttendanceRecord {
  status: 'presente' | 'falta' | 'atrasado';
  observacao: string;
  compreendeu: 'S' | 'P' | 'N';
  participou: 'S' | 'P' | 'N';
  precisou_apoio: 'S' | 'P' | 'N';
}

export const DiarioClasse: React.FC = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false);

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [selectedAula, setSelectedAula] = useState<Aula | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  
  const [loading, setLoading] = useState(false);
  const [loadingAulas, setLoadingAulas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredAulasCount, setRegisteredAulasCount] = useState(0);

  useEffect(() => {
    fetchTurmas();
  }, []);

  useEffect(() => {
    if (selectedTurma) {
      localStorage.setItem('selectedTurmaId', selectedTurma.id);
      fetchAulas(selectedTurma.curso_id);
      fetchRegisteredLessonsCount(selectedTurma.id);
    } else {
      setAulas([]);
      setSelectedAula(null);
      setRegisteredAulasCount(0);
    }
  }, [selectedTurma]);

  useEffect(() => {
    if (selectedTurma && selectedAula) {
      fetchAttendance(selectedTurma.id, selectedAula.id);
    }
  }, [selectedTurma, selectedAula]);

  const fetchTurmas = async () => {
    try {
      const { data, error: err } = await supabase
        .from('turmas')
        .select('*')
        .order('nome', { ascending: true });

      if (err) throw err;

      if (data && data.length > 0) {
        setTurmas(data);
        const storedTurmaId = localStorage.getItem('selectedTurmaId');
        const defaultTurma = data.find((t) => t.id === storedTurmaId) || data[0];
        setSelectedTurma(defaultTurma);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchRegisteredLessonsCount = async (turmaId: string) => {
    try {
      const { data, error: countErr } = await supabase
        .from('diario_classe')
        .select('aula_id')
        .eq('turma_id', turmaId);

      if (countErr) throw countErr;

      if (data) {
        const uniqueAulas = new Set(data.map(d => d.aula_id));
        setRegisteredAulasCount(uniqueAulas.size);
      }
    } catch (err) {
      console.error('Error fetching registered count:', err);
    }
  };

  const fetchAulas = async (cursoId: string | null) => {
    if (!cursoId) {
      setAulas([]);
      setSelectedAula(null);
      return;
    }

    setLoadingAulas(true);
    try {
      const { data: modulosData, error: modError } = await supabase
        .from('modulos')
        .select('id, ordem')
        .eq('curso_id', cursoId)
        .order('ordem', { ascending: true });

      if (modError) throw modError;

      if (modulosData && modulosData.length > 0) {
        const moduloIds = modulosData.map(m => m.id);
        const { data: aulasData, error: aError } = await supabase
          .from('aulas')
          .select('id, modulo_id, ordem, numero_aula, titulo')
          .in('modulo_id', moduloIds);

        if (aError) throw aError;

        const modIdToOrder = new Map(modulosData.map((m, idx) => [m.id, idx]));
        const sorted = (aulasData || []).sort((a, b) => {
          const orderA = modIdToOrder.get(a.modulo_id!) ?? 999;
          const orderB = modIdToOrder.get(b.modulo_id!) ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.ordem ?? 0) - (b.ordem ?? 0);
        });

        setAulas(sorted);
        if (sorted.length > 0) {
          setSelectedAula(sorted[0]);
        } else {
          setSelectedAula(null);
        }
      } else {
        const { data: globalAulas, error: gError } = await supabase
          .from('aulas')
          .select('id, numero_aula, titulo')
          .is('modulo_id', null)
          .order('numero_aula', { ascending: true });

        if (gError) throw gError;
        setAulas(globalAulas || []);
        if (globalAulas && globalAulas.length > 0) {
          setSelectedAula(globalAulas[0]);
        } else {
          setSelectedAula(null);
        }
      }
    } catch (err) {
      console.error('Error fetching lessons for class:', err);
      setAulas([]);
      setSelectedAula(null);
    } finally {
      setLoadingAulas(false);
    }
  };

  const fetchAttendance = async (turmaId: string, aulaId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: studentsData, error: sErr } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url')
        .eq('turma_id', turmaId)
        .eq('role', 'student')
        .order('nome', { ascending: true });

      if (sErr) throw sErr;
      setStudents(studentsData || []);

      const { data: attendanceData, error: aErr } = await supabase
        .from('diario_classe')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('aula_id', aulaId);

      if (aErr) throw aErr;

      const recordMap: Record<string, AttendanceRecord> = {};
      let hasRecords = false;

      if (attendanceData && attendanceData.length > 0) {
        hasRecords = true;
        setSelectedDate(attendanceData[0].data || new Date().toISOString().split('T')[0]);

        attendanceData.forEach((record: any) => {
          recordMap[record.aluno_id] = {
            status: record.status || 'presente',
            observacao: record.observacao || '',
            compreendeu: record.compreendeu || 'S',
            participou: record.participou || 'S',
            precisou_apoio: record.precisou_apoio || 'N'
          };
        });
      }

      (studentsData || []).forEach(s => {
        if (!recordMap[s.id]) {
          recordMap[s.id] = {
            status: 'presente',
            observacao: '',
            compreendeu: 'S',
            participou: 'S',
            precisou_apoio: 'N'
          };
        }
      });

      setAttendance(recordMap);
      setIsRegistered(hasRecords);

    } catch (err: any) {
      console.error('Error fetching attendance records:', err);
      setError(err.message || 'Erro ao carregar lista de presença');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAttendance = async () => {
    if (!selectedTurma || !selectedAula) return;
    if (!window.confirm('Tem certeza que deseja apagar o registro desta chamada?')) return;

    setSaving(true);
    setError(null);
    try {
      const { error: delError } = await supabase
        .from('diario_classe')
        .delete()
        .eq('turma_id', selectedTurma.id)
        .eq('aula_id', selectedAula.id);

      if (delError) throw delError;

      setIsRegistered(false);
      setSuccess('Registro de chamada apagado.');
      fetchRegisteredLessonsCount(selectedTurma.id);
      fetchAttendance(selectedTurma.id, selectedAula.id);
    } catch (err: any) {
      console.error('Error clearing attendance:', err);
      setError(err.message || 'Erro ao apagar chamada.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (alunoId: string, status: 'presente' | 'falta' | 'atrasado') => {
    setAttendance(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        status
      }
    }));
  };

  const handleToggleEngagement = (alunoId: string, field: 'compreendeu' | 'participou' | 'precisou_apoio', value: 'S' | 'P' | 'N') => {
    setAttendance(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        [field]: value
      }
    }));
  };

  const getEngagementColor = (field: 'compreendeu' | 'participou' | 'precisou_apoio', value: 'S' | 'P' | 'N', currentValue: 'S' | 'P' | 'N') => {
    if (value !== currentValue) return 'text-on-surface-variant hover:bg-surface-container';

    if (field === 'precisou_apoio') {
      if (value === 'S') return 'bg-error text-white shadow-sm';
      if (value === 'P') return 'bg-amber-500 text-white shadow-sm';
      return 'bg-emerald-500 text-white shadow-sm';
    }

    if (value === 'S') return 'bg-emerald-500 text-white shadow-sm';
    if (value === 'P') return 'bg-amber-500 text-white shadow-sm';
    return 'bg-error text-white shadow-sm';
  };

  const handleObserveChange = (alunoId: string, text: string) => {
    setAttendance(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        observacao: text
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!selectedTurma || !selectedAula || !selectedDate) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const records = students.map(s => ({
        turma_id: selectedTurma.id,
        aluno_id: s.id,
        aula_id: selectedAula.id,
        data: selectedDate,
        status: attendance[s.id]?.status || 'presente',
        observacao: attendance[s.id]?.observacao || null,
        compreendeu: attendance[s.id]?.compreendeu || 'S',
        participou: attendance[s.id]?.participou || 'S',
        precisou_apoio: attendance[s.id]?.precisou_apoio || 'N'
      }));

      if (records.length === 0) {
        setSuccess('Não há alunos cadastrados nesta turma para salvar.');
        setSaving(false);
        return;
      }

      const { error: upsertError } = await supabase
        .from('diario_classe')
        .upsert(records, {
          onConflict: 'aluno_id,aula_id'
        });

      if (upsertError) throw upsertError;

      setSuccess('Diário de classe salvo com sucesso!');
      setIsRegistered(true);
      fetchRegisteredLessonsCount(selectedTurma.id);
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setError(err.message || 'Erro ao salvar o diário de classe');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = () => {
    setAttendance(prev => {
      const next = { ...prev };
      students.forEach(s => {
        next[s.id] = {
          ...next[s.id],
          status: 'presente'
        };
      });
      return next;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const totalStudents = students.length;
  const presentsCount = Object.values(attendance).filter(a => a.status === 'presente').length;
  const latesCount = Object.values(attendance).filter(a => a.status === 'atrasado').length;
  const absencesCount = Object.values(attendance).filter(a => a.status === 'falta').length;
  const attendancePercentage = totalStudents > 0 
    ? Math.round(((presentsCount + latesCount) * 100) / totalStudents) 
    : 100;

  return (
    <div className="product-page max-w-7xl mx-auto relative animate-fade-in pb-10 space-y-6">
      
      {/* Top feedback alerts */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-product-control text-error text-xs font-semibold flex items-center gap-2">
          <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-product-control text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Tick01Icon} size={16} strokeWidth={2} />
          <span>{success}</span>
        </div>
      )}

      {/* Header Panel */}
      <header className="product-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
              <HugeiconsIcon icon={Calendar01Icon} size={22} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="product-section-kicker">Gestão de Presenças</span>
                {selectedAula && (
                  isRegistered ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Registrada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold border border-amber-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Pendente
                    </span>
                  )
                )}
              </div>
              <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">Diário de Classe</h1>
              <p className="mt-1 text-sm text-on-surface-variant">Registre presenças, atrasos e acompanhe o engajamento dos alunos por aula.</p>
            </div>
          </div>

          {/* Date & Save Actions */}
          {selectedTurma?.curso_id && (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider mb-1">Data</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="product-control py-1.5 text-xs font-semibold"
                />
              </div>

              {isRegistered && (
                <button
                  onClick={handleClearAttendance}
                  disabled={saving || loading || !selectedAula}
                  className="product-secondary-action !min-h-10 text-xs text-error hover:bg-error/10 hover:border-error/30 self-end"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2} />
                  <span>Limpar</span>
                </button>
              )}

              <button
                onClick={handleSaveAll}
                disabled={saving || loading || !selectedAula}
                className="product-primary-action !min-h-10 text-xs self-end"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} />
                    <span>Salvar Chamada</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Toolbar: Turma & Aula Selectors */}
      <div className="product-toolbar" aria-label="Seletores de turma e aula">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Turma selection */}
            <div className="relative">
              <button
                onClick={() => setShowTurmaDropdown(!showTurmaDropdown)}
                className="product-secondary-action text-xs"
              >
                <HugeiconsIcon icon={SchoolIcon} size={15} strokeWidth={2} className="text-primary" />
                <span>{selectedTurma ? selectedTurma.nome : 'Selecionar Turma'}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} className={`transition-transform ${showTurmaDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showTurmaDropdown && (
                <div className="absolute left-0 mt-2 z-20 w-64 bg-surface-container-lowest border border-outline-variant/70 rounded-product-control shadow-xl py-1.5">
                  {turmas.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTurma(t);
                        setShowTurmaDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-surface-container-low transition-colors ${
                        selectedTurma?.id === t.id ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface'
                      }`}
                    >
                      {t.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aula selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-on-surface-variant flex items-center gap-1.5">
                <HugeiconsIcon icon={BookOpen01Icon} size={15} strokeWidth={2} className="text-secondary" />
                <span>Aula:</span>
              </span>

              {loadingAulas ? (
                <span className="text-xs text-on-surface-variant animate-pulse font-bold">Buscando aulas...</span>
              ) : !selectedTurma ? (
                <span className="text-xs text-on-surface-variant italic font-semibold">Selecione uma turma</span>
              ) : !selectedTurma.curso_id ? (
                <span className="text-xs text-error font-extrabold bg-error/10 border border-error/20 px-2.5 py-1 rounded-full">Sem Curso Vinculado</span>
              ) : aulas.length === 0 ? (
                <span className="text-xs text-on-surface-variant italic font-semibold">Sem aulas cadastradas</span>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedAula?.id || ''}
                    onChange={(e) => {
                      const aula = aulas.find(a => a.id === e.target.value);
                      if (aula) setSelectedAula(aula);
                    }}
                    className="product-control py-1.5 text-xs font-bold"
                  >
                    {aulas.map(a => (
                      <option key={a.id} value={a.id}>
                        Aula {a.numero_aula}: {a.titulo}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-on-surface-variant bg-surface-container-low border border-outline-variant/60 px-2.5 py-1.5 rounded-product-control">
                    {registeredAulasCount} / {aulas.length}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleMarkAllPresent}
            disabled={students.length === 0 || !selectedAula}
            className="product-secondary-action text-xs self-start md:self-auto disabled:opacity-40"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} strokeWidth={2} className="text-emerald-600 dark:text-emerald-400" />
            <span>Todos Presentes</span>
          </button>
        </div>
      </div>

      {selectedTurma && !selectedTurma.curso_id ? (
        <div className="product-empty-state max-w-xl mx-auto p-10">
          <HugeiconsIcon icon={Alert01Icon} size={36} strokeWidth={2} className="text-error mb-2" />
          <h2 className="font-heading font-extrabold text-base text-on-surface">Chamada Bloqueada</h2>
          <p className="text-xs text-on-surface-variant mt-1 max-w-md">
            Não é possível realizar chamada em turmas sem curso associado. Vá em <strong>Gerenciar Turmas</strong> e vincule um curso para liberar o diário.
          </p>
        </div>
      ) : (
        <>
          {/* Metrics HUD Row */}
          <section aria-label="Resumo da chamada do dia" className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
                <HugeiconsIcon icon={UserGroupIcon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Presença Geral</span>
                <strong className="product-metric-value">{attendancePercentage}%</strong>
                <span className="block truncate text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">do dia</span>
              </div>
            </div>

            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Presentes</span>
                <strong className="product-metric-value text-emerald-600 dark:text-emerald-400">{presentsCount}</strong>
                <span className="block truncate text-[10px] font-semibold text-on-surface-variant">alunos</span>
              </div>
            </div>

            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <HugeiconsIcon icon={Clock01Icon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Atrasos</span>
                <strong className="product-metric-value text-amber-600 dark:text-amber-400">{latesCount}</strong>
                <span className="block truncate text-[10px] font-semibold text-on-surface-variant">alunos</span>
              </div>
            </div>

            <div className="product-metric sm:min-h-[86px] sm:p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-error/10 text-error">
                <HugeiconsIcon icon={Cancel01Icon} size={21} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="product-metric-label">Faltas</span>
                <strong className="product-metric-value text-error">{absencesCount}</strong>
                <span className="block truncate text-[10px] font-semibold text-on-surface-variant">alunos</span>
              </div>
            </div>
          </section>

          {/* Attendance Table */}
          <div className="product-card overflow-hidden">
            {loading ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-on-surface-variant animate-pulse">Carregando diário de classe...</p>
              </div>
            ) : !selectedAula ? (
              <div className="product-empty-state py-12">
                <HugeiconsIcon icon={SchoolIcon} size={32} className="text-primary mb-2" />
                <p className="font-heading text-sm font-extrabold text-on-surface">Nenhuma aula selecionada</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Selecione uma turma e aula válidas acima para abrir a folha de presença.</p>
              </div>
            ) : students.length === 0 ? (
              <div className="product-empty-state py-12">
                <HugeiconsIcon icon={UserGroupIcon} size={32} className="text-primary mb-2" />
                <p className="font-heading text-sm font-extrabold text-on-surface">Nenhum aluno nesta turma</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Os alunos matriculados nesta turma aparecerão aqui para chamada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/60 border-b border-outline-variant/70">
                      <th className="px-5 py-3.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">Estudante</th>
                      <th className="px-5 py-3.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider text-center w-64">Presença</th>
                      <th className="px-5 py-3.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider text-center w-[350px]">Engajamento</th>
                      <th className="px-5 py-3.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {students.map((student) => {
                      const record = attendance[student.id] || { 
                        status: 'presente', 
                        observacao: '',
                        compreendeu: 'S',
                        participou: 'S',
                        precisou_apoio: 'N'
                      };
                      const status = record.status;

                      return (
                        <tr key={student.id} className="hover:bg-surface-container-low/40 transition-colors">
                          {/* Name & Avatar */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {student.avatar_url ? (
                                <img
                                  src={student.avatar_url}
                                  alt={student.nome}
                                  className="w-9 h-9 rounded-product-control object-cover border border-outline-variant/60"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-product-control bg-primary/10 text-primary flex items-center justify-center font-heading text-xs font-extrabold shadow-inner">
                                  {getInitials(student.nome)}
                                </div>
                              )}
                              <div>
                                <span className="font-heading font-extrabold text-xs text-on-surface block leading-tight">
                                  {student.nome}
                                </span>
                                <span className="text-[10px] font-mono text-on-surface-variant mt-0.5 block">{student.id.slice(0, 8)}...</span>
                              </div>
                            </div>
                          </td>

                          {/* Status Toggle Buttons */}
                          <td className="px-5 py-3.5">
                            <div className="flex justify-center gap-1 max-w-xs mx-auto bg-surface-container-low p-1 rounded-product-control border border-outline-variant/60">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(student.id, 'presente')}
                                className={`flex-1 py-1 px-2 rounded-product-control text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                  status === 'presente'
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'text-on-surface-variant hover:bg-surface-container'
                                }`}
                              >
                                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} strokeWidth={2.5} />
                                <span>Pres.</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(student.id, 'atrasado')}
                                className={`flex-1 py-1 px-2 rounded-product-control text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                  status === 'atrasado'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-on-surface-variant hover:bg-surface-container'
                                }`}
                              >
                                <HugeiconsIcon icon={Clock01Icon} size={13} strokeWidth={2.5} />
                                <span>Atras.</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(student.id, 'falta')}
                                className={`flex-1 py-1 px-2 rounded-product-control text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                  status === 'falta'
                                    ? 'bg-error text-white shadow-xs'
                                    : 'text-on-surface-variant hover:bg-surface-container'
                                }`}
                              >
                                <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2.5} />
                                <span>Falta</span>
                              </button>
                            </div>
                          </td>

                          {/* Engagement Toggles */}
                          <td className="px-5 py-3.5">
                            <div className="flex flex-row gap-5 justify-center items-center text-xs font-semibold">
                              {/* Compreendeu */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-on-surface-variant text-[9px] uppercase font-extrabold tracking-wider">Compreensão</span>
                                <div className="flex gap-0.5 bg-surface-container-low p-0.5 rounded-full border border-outline-variant/60">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEngagement(student.id, 'compreendeu', 'S')}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('compreendeu', 'S', record.compreendeu)
                                    }`}
                                    title="Sim"
                                  >
                                    S
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEngagement(student.id, 'compreendeu', 'P')}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('compreendeu', 'P', record.compreendeu)
                                    }`}
                                    title="Parcialmente"
                                  >
                                    P
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEngagement(student.id, 'compreendeu', 'N')}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('compreendeu', 'N', record.compreendeu)
                                    }`}
                                    title="Não"
                                  >
                                    N
                                  </button>
                                </div>
                              </div>

                              {/* Participou */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-on-surface-variant text-[9px] uppercase font-extrabold tracking-wider">Participação</span>
                                <div className="flex gap-0.5 bg-surface-container-low p-0.5 rounded-full border border-outline-variant/60">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEngagement(student.id, 'participou', 'S')}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('participou', 'S', record.participou)
                                    }`}
                                    title="Sim"
                                  >
                                    S
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEngagement(student.id, 'participou', 'P')}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('participou', 'P', record.participou)
                                    }`}
                                    title="Parcialmente"
                                  >
                                    P
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEngagement(student.id, 'participou', 'N')}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('participou', 'N', record.participou)
                                    }`}
                                    title="Não"
                                  >
                                    N
                                  </button>
                                </div>
                              </div>

                              {/* Precisou Apoio */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-on-surface-variant text-[9px] uppercase font-extrabold tracking-wider">Apoio</span>
                                <div className="flex gap-0.5 bg-surface-container-low p-0.5 rounded-full border border-outline-variant/60">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEngagement(student.id, 'precisou_apoio', 'S')}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('precisou_apoio', 'S', record.precisou_apoio)
                                    }`}
                                    title="Sim"
                                  >
                                    S
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEngagement(student.id, 'precisou_apoio', 'P')}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('precisou_apoio', 'P', record.precisou_apoio)
                                    }`}
                                    title="Parcialmente"
                                  >
                                    P
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEngagement(student.id, 'precisou_apoio', 'N')}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('precisou_apoio', 'N', record.precisou_apoio)
                                    }`}
                                    title="Não"
                                  >
                                    N
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Observations Input */}
                          <td className="px-5 py-3.5">
                            <input
                              type="text"
                              value={record.observacao}
                              onChange={(e) => handleObserveChange(student.id, e.target.value)}
                              placeholder="Observação opcional..."
                              className="product-control py-1.5 px-3 text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
