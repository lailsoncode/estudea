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
  BookOpen01Icon
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

  // Fetch all classes
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
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      setError('Erro ao buscar turmas no banco de dados');
    }
  };

  // Fetch count of unique registered lessons for the class
  const fetchRegisteredLessonsCount = async (turmaId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('diario_classe')
        .select('aula_id')
        .eq('turma_id', turmaId);

      if (err) throw err;

      if (data) {
        const uniqueIds = new Set(data.map((r: any) => r.aula_id));
        setRegisteredAulasCount(uniqueIds.size);
      } else {
        setRegisteredAulasCount(0);
      }
    } catch (err) {
      console.error('Error fetching registered lessons count:', err);
    }
  };

  // Delete all attendance logs for selected class and lesson
  const handleClearAttendance = async () => {
    if (!selectedTurma || !selectedAula) return;
    if (
      !window.confirm(
        'Tem certeza de que deseja excluir todos os registros de chamada desta aula? Esta ação é irreversível e atualizará a frequência de todos os alunos.'
      )
    )
      return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: deleteError } = await supabase
        .from('diario_classe')
        .delete()
        .eq('turma_id', selectedTurma.id)
        .eq('aula_id', selectedAula.id);

      if (deleteError) throw deleteError;

      setSuccess('Registros de chamada excluídos com sucesso!');
      setIsRegistered(false);
      fetchRegisteredLessonsCount(selectedTurma.id);

      // Reset local attendance to default present
      const resetAttendance: Record<string, AttendanceRecord> = {};
      students.forEach((s) => {
        resetAttendance[s.id] = {
          status: 'presente',
          observacao: '',
          compreendeu: 'S',
          participou: 'S',
          precisou_apoio: 'N'
        };
      });
      setAttendance(resetAttendance);

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error clearing attendance:', err);
      setError(err.message || 'Erro ao excluir chamada do banco');
    } finally {
      setSaving(false);
    }
  };

  // Fetch all lessons linked to the course
  const fetchAulas = async (cursoId: string | null) => {
    if (!cursoId) {
      setAulas([]);
      setSelectedAula(null);
      return;
    }
    setLoadingAulas(true);
    try {
      // 1. Fetch modules for this course
      const { data: modulesData, error: modulesError } = await supabase
        .from('modulos')
        .select('id')
        .eq('curso_id', cursoId);

      if (modulesError) throw modulesError;

      const moduleIds = (modulesData || []).map((m: any) => m.id);

      if (moduleIds.length > 0) {
        // 2. Fetch lessons (aulas) for these modules
        const { data: aulasData, error: aulasError } = await supabase
          .from('aulas')
          .select('id, titulo, numero_aula')
          .in('modulo_id', moduleIds)
          .order('numero_aula', { ascending: true });

        if (aulasError) throw aulasError;

        setAulas(aulasData || []);
        if (aulasData && aulasData.length > 0) {
          setSelectedAula(aulasData[0]);
        } else {
          setSelectedAula(null);
        }
      } else {
        setAulas([]);
        setSelectedAula(null);
      }
    } catch (err: any) {
      console.error('Error fetching lessons:', err);
      setError('Erro ao carregar as aulas vinculadas ao curso.');
    } finally {
      setLoadingAulas(false);
    }
  };

  // Fetch attendance records and student profiles
  const fetchAttendance = async (turmaId: string, aulaId: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Students registered in this class
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url')
        .eq('role', 'student')
        .eq('turma_id', turmaId)
        .order('nome', { ascending: true });

      if (studentsError) throw studentsError;

      const studentList = (studentsData || []).map((s: any) => ({
        id: s.id,
        nome: s.nome || 'Estudante Sem Nome',
        avatar_url: s.avatar_url
      }));
      setStudents(studentList);

      // 2. Fetch existing Attendance logs for this class and lesson
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('diario_classe')
        .select('aluno_id, status, observacao, compreendeu, participou, precisou_apoio, data')
        .eq('turma_id', turmaId)
        .eq('aula_id', aulaId);

      if (attendanceError) throw attendanceError;

      // Update date picker value if a record already exists
      if (attendanceData && attendanceData.length > 0) {
        const recordDate = attendanceData[0].data;
        if (recordDate) {
          setSelectedDate(recordDate);
        }
      }

      // 3. Map logs to active state
      const initialAttendance: Record<string, AttendanceRecord> = {};
      
      // Seed default presence for all students
      studentList.forEach(s => {
        initialAttendance[s.id] = {
          status: 'presente',
          observacao: '',
          compreendeu: 'S',
          participou: 'S',
          precisou_apoio: 'N'
        };
      });

      // Override with actual database logs
      let registered = false;
      if (attendanceData && attendanceData.length > 0) {
        registered = true;
        attendanceData.forEach((record: any) => {
          if (initialAttendance[record.aluno_id]) {
            initialAttendance[record.aluno_id] = {
              status: record.status as 'presente' | 'falta' | 'atrasado',
              observacao: record.observacao || '',
              compreendeu: (record.compreendeu || 'S') as 'S' | 'P' | 'N',
              participou: (record.participou || 'S') as 'S' | 'P' | 'N',
              precisou_apoio: (record.precisou_apoio || 'N') as 'S' | 'P' | 'N'
            };
          }
        });
      }

      setAttendance(initialAttendance);
      setIsRegistered(registered);
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      setError(err.message || 'Erro ao carregar diário de classe');
    } finally {
      setLoading(false);
    }
  };

  // Toggle status for a student
  const handleToggleStatus = (alunoId: string, status: 'presente' | 'falta' | 'atrasado') => {
    setAttendance(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        status
      }
    }));
  };

  // Toggle engagement toggles
  const handleToggleEngagement = (
    alunoId: string,
    field: 'compreendeu' | 'participou' | 'precisou_apoio',
    val: 'S' | 'P' | 'N'
  ) => {
    setAttendance(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        [field]: val
      }
    }));
  };

  // Helper to get color classes for S/P/N buttons
  const getEngagementColor = (
    field: 'compreendeu' | 'participou' | 'precisou_apoio',
    val: 'S' | 'P' | 'N',
    currentVal: 'S' | 'P' | 'N'
  ) => {
    const isActive = val === currentVal;
    if (!isActive) {
      return 'text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 bg-transparent';
    }
    if (field === 'precisou_apoio') {
      if (val === 'S') return 'bg-red-500 text-white shadow-sm';
      if (val === 'P') return 'bg-amber-500 text-white shadow-sm';
      return 'bg-emerald-500 text-white shadow-sm'; // N
    } else {
      if (val === 'S') return 'bg-emerald-500 text-white shadow-sm';
      if (val === 'P') return 'bg-amber-500 text-white shadow-sm';
      return 'bg-red-500 text-white shadow-sm'; // N
    }
  };

  // Update observation text
  const handleObserveChange = (alunoId: string, text: string) => {
    setAttendance(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        observacao: text
      }
    }));
  };

  // Save all records to database
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

  // Mark all students as present
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

  // Get initials for profile placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Calculate day summary metrics
  const totalStudents = students.length;
  const presentsCount = Object.values(attendance).filter(a => a.status === 'presente').length;
  const latesCount = Object.values(attendance).filter(a => a.status === 'atrasado').length;
  const absencesCount = Object.values(attendance).filter(a => a.status === 'falta').length;
  const attendancePercentage = totalStudents > 0 
    ? Math.round(((presentsCount + latesCount) * 100) / totalStudents) 
    : 100;

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      {/* Top feedback warnings */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-error rounded-xl text-xs font-semibold flex items-center gap-2">
          <HugeiconsIcon icon={Alert01Icon} size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Tick01Icon} size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-heading font-extrabold text-2xl text-on-surface">Diário de Classe</h2>
            {selectedAula && (
              isRegistered ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100/50 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Chamada Registrada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100/50 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Pendente de Registro
                </span>
              )
            )}
          </div>
          <p className="text-on-surface-variant/70 text-xs font-semibold mt-1">Registre presenças, atrasos e acompanhe o engajamento dos alunos por aula.</p>
        </div>

        {/* Date & Save Actions */}
        {selectedTurma?.curso_id && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase mb-1">Data de Realização</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-white border border-outline-variant/60 rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {isRegistered && (
              <button
                onClick={handleClearAttendance}
                disabled={saving || loading || !selectedAula}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100/60 border border-red-200 text-error rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all self-end shadow-sm"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
                <span>Limpar Registro</span>
              </button>
            )}

            <button
              onClick={handleSaveAll}
              disabled={saving || loading || !selectedAula}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/95 disabled:opacity-50 transition-all shadow-sm shadow-primary/10 self-end"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} />
                  <span>Salvar Chamada</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Class & Lesson Selectors */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white border border-outline-variant/30 rounded-2xl p-4.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Class selection dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTurmaDropdown(!showTurmaDropdown)}
              className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/80 border border-outline-variant/40 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface transition-colors"
            >
              <HugeiconsIcon icon={SchoolIcon} size={18} strokeWidth={2} className="text-primary" />
              <span>{selectedTurma ? selectedTurma.nome : 'Selecionar Turma'}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} className={`ml-1 transition-transform ${showTurmaDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showTurmaDropdown && (
              <div className="absolute left-0 mt-2 z-20 w-64 bg-white border border-outline-variant/35 rounded-xl shadow-level-2 py-1 animate-in fade-in duration-200">
                {turmas.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTurma(t);
                      setShowTurmaDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors ${
                      selectedTurma?.id === t.id ? 'text-primary bg-primary/5' : 'text-on-surface-variant'
                    }`}
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lesson selection dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-on-surface-variant/75 flex items-center gap-1.5 bg-slate-50 px-3 py-2.5 rounded-xl border border-outline-variant/30">
              <HugeiconsIcon icon={BookOpen01Icon} size={16} strokeWidth={2} className="text-secondary" />
              <span>Aula:</span>
            </span>

            {loadingAulas ? (
              <span className="text-xs text-on-surface-variant/50 animate-pulse font-bold">Buscando aulas...</span>
            ) : !selectedTurma ? (
              <span className="text-xs text-on-surface-variant/40 italic font-semibold">Selecione uma turma para carregar aulas</span>
            ) : !selectedTurma.curso_id ? (
              <span className="text-xs text-red-500 font-extrabold bg-red-50 border border-red-100 px-3 py-2 rounded-xl">Sem Curso Vinculado</span>
            ) : aulas.length === 0 ? (
              <span className="text-xs text-on-surface-variant/40 italic font-semibold">Este curso não possui aulas cadastradas</span>
            ) : (
              <div className="flex items-center gap-2.5">
                <select
                  value={selectedAula?.id || ''}
                  onChange={(e) => {
                    const aula = aulas.find(a => a.id === e.target.value);
                    if (aula) setSelectedAula(aula);
                  }}
                  className="bg-slate-50 hover:bg-slate-100/80 border border-outline-variant/40 px-3 py-2.5 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-10 animate-fade-in"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '12px'
                  }}
                >
                  {aulas.map(a => (
                    <option key={a.id} value={a.id}>
                      Aula {a.numero_aula}: {a.titulo}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-bold text-on-surface-variant/65 bg-slate-50 border border-outline-variant/30 px-3 py-2 rounded-xl">
                  {registeredAulasCount} / {aulas.length} registradas
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <button
          onClick={handleMarkAllPresent}
          disabled={students.length === 0 || !selectedAula}
          className="text-xs font-extrabold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 self-start md:self-auto disabled:opacity-40"
        >
          Marcar Todos Como Presentes
        </button>
      </div>

      {selectedTurma && !selectedTurma.curso_id ? (
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-16 text-center shadow-sm space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 bg-red-50 text-error rounded-full flex items-center justify-center mx-auto border border-red-100">
            <HugeiconsIcon icon={Alert01Icon} size={28} strokeWidth={2} className="text-error" />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-extrabold text-lg text-on-surface">Chamada Bloqueada</h3>
            <p className="text-xs text-on-surface-variant/75 font-semibold leading-relaxed">
              Não é possível realizar a chamada ou registrar presenças em turmas que não possuem um curso associado. 
              Por favor, vá para a aba **"Gerenciar Turmas"**, edite a turma correspondente e vincule um curso para liberar o diário de classe.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Presence rate */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-1">
              <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-wider">Presença Geral</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-on-surface font-heading">{attendancePercentage}%</span>
                <span className="text-xs font-semibold text-emerald-500">do dia</span>
              </div>
            </div>

            {/* Present counts */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-1">
              <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-wider">Presentes</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 font-heading">{presentsCount}</span>
                <span className="text-xs font-semibold text-on-surface-variant/65">alunos</span>
              </div>
            </div>

            {/* Late counts */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-1">
              <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-wider">Atrasos</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-500 font-heading">{latesCount}</span>
                <span className="text-xs font-semibold text-on-surface-variant/65">alunos</span>
              </div>
            </div>

            {/* Absence counts */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-1">
              <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-wider">Faltas</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-red-500 font-heading">{absencesCount}</span>
                <span className="text-xs font-semibold text-on-surface-variant/65">alunos</span>
              </div>
            </div>
          </div>

          {/* Student List & Attendance Table */}
          <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-16 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-semibold text-on-surface-variant animate-pulse">Carregando diário de classe...</p>
              </div>
            ) : !selectedAula ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <HugeiconsIcon icon={SchoolIcon} size={40} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-on-surface">Nenhuma aula selecionada.</p>
                <p className="text-xs">Selecione uma turma e aula válidas acima para abrir a folha de presença.</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <HugeiconsIcon icon={SchoolIcon} size={40} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-on-surface">Nenhum aluno nesta turma.</p>
                <p className="text-xs">Os alunos matriculados nesta turma aparecerão aqui para chamada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-outline-variant/30">
                      <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                      <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider text-center w-64">Presença</th>
                      <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider text-center w-[350px]">Acompanhamento de Engajamento</th>
                      <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider">Notas / Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
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
                        <tr key={student.id} className="hover:bg-slate-50/20 transition-colors">
                          {/* Name & Avatar */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {student.avatar_url ? (
                                <img
                                  src={student.avatar_url}
                                  alt={student.nome}
                                  className="w-9 h-9 rounded-full object-cover border border-outline-variant/20"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-heading text-xs font-bold shadow-inner">
                                  {getInitials(student.nome)}
                                </div>
                              )}
                              <div>
                                <span className="font-heading font-extrabold text-xs text-on-surface block leading-tight">
                                  {student.nome}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">{student.id.slice(0, 8)}...</span>
                              </div>
                            </div>
                          </td>

                          {/* Status Toggle Buttons */}
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-1.5 max-w-xs mx-auto bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                              {/* Presente */}
                              <button
                                onClick={() => handleToggleStatus(student.id, 'presente')}
                                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                  status === 'presente'
                                    ? 'bg-emerald-500 text-white shadow-sm scale-[1.03]'
                                    : 'text-slate-400 hover:bg-slate-200/50 hover:text-slate-600'
                                }`}
                              >
                                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2.5} />
                                <span>Pres.</span>
                              </button>

                              {/* Atrasado */}
                              <button
                                onClick={() => handleToggleStatus(student.id, 'atrasado')}
                                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                  status === 'atrasado'
                                    ? 'bg-amber-500 text-white shadow-sm scale-[1.03]'
                                    : 'text-slate-400 hover:bg-slate-200/50 hover:text-slate-600'
                                }`}
                              >
                                <HugeiconsIcon icon={Alert01Icon} size={14} strokeWidth={2.5} />
                                <span>Atras.</span>
                              </button>

                              {/* Falta */}
                              <button
                                onClick={() => handleToggleStatus(student.id, 'falta')}
                                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                  status === 'falta'
                                    ? 'bg-red-500 text-white shadow-sm scale-[1.03]'
                                    : 'text-slate-400 hover:bg-slate-200/50 hover:text-slate-600'
                                }`}
                              >
                                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2.5} />
                                <span>Falta</span>
                              </button>
                            </div>
                          </td>

                          {/* Student Engagement Toggles */}
                          <td className="px-6 py-4">
                            <div className="flex flex-row gap-6 justify-center items-center text-xs font-semibold">
                              {/* Compreendeu */}
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-on-surface-variant/70 text-[10px] uppercase font-bold tracking-wider">Compreensão</span>
                                <div className="flex gap-1 bg-slate-50 p-0.5 rounded-full border border-slate-100">
                                  <button
                                    onClick={() => handleToggleEngagement(student.id, 'compreendeu', 'S')}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('compreendeu', 'S', record.compreendeu)
                                    }`}
                                    title="Sim"
                                  >
                                    S
                                  </button>
                                  <button
                                    onClick={() => handleToggleEngagement(student.id, 'compreendeu', 'P')}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('compreendeu', 'P', record.compreendeu)
                                    }`}
                                    title="Parcialmente"
                                  >
                                    P
                                  </button>
                                  <button
                                    onClick={() => handleToggleEngagement(student.id, 'compreendeu', 'N')}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('compreendeu', 'N', record.compreendeu)
                                    }`}
                                    title="Não"
                                  >
                                    N
                                  </button>
                                </div>
                              </div>

                              {/* Participou */}
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-on-surface-variant/70 text-[10px] uppercase font-bold tracking-wider">Participação</span>
                                <div className="flex gap-1 bg-slate-50 p-0.5 rounded-full border border-slate-100">
                                  <button
                                    onClick={() => handleToggleEngagement(student.id, 'participou', 'S')}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('participou', 'S', record.participou)
                                    }`}
                                    title="Sim"
                                  >
                                    S
                                  </button>
                                  <button
                                    onClick={() => handleToggleEngagement(student.id, 'participou', 'P')}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('participou', 'P', record.participou)
                                    }`}
                                    title="Parcialmente"
                                  >
                                    P
                                  </button>
                                  <button
                                    onClick={() => handleToggleEngagement(student.id, 'participou', 'N')}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('participou', 'N', record.participou)
                                    }`}
                                    title="Não"
                                  >
                                    N
                                  </button>
                                </div>
                              </div>

                              {/* Precisou Apoio */}
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-on-surface-variant/70 text-[10px] uppercase font-bold tracking-wider">Apoio</span>
                                <div className="flex gap-1 bg-slate-50 p-0.5 rounded-full border border-slate-100">
                                  <button
                                    onClick={() => handleToggleEngagement(student.id, 'precisou_apoio', 'S')}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('precisou_apoio', 'S', record.precisou_apoio)
                                    }`}
                                    title="Sim"
                                  >
                                    S
                                  </button>
                                  <button
                                    onClick={() => handleToggleEngagement(student.id, 'precisou_apoio', 'P')}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                      getEngagementColor('precisou_apoio', 'P', record.precisou_apoio)
                                    }`}
                                    title="Parcialmente"
                                  >
                                    P
                                  </button>
                                  <button
                                    onClick={() => handleToggleEngagement(student.id, 'precisou_apoio', 'N')}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
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

                          {/* Observations Note Input */}
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={record.observacao}
                              onChange={(e) => handleObserveChange(student.id, e.target.value)}
                              placeholder="Observação opcional..."
                              className="w-full bg-slate-50 border border-outline-variant/35 rounded-xl px-4 py-2 text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
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
