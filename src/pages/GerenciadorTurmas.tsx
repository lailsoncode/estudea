import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AddCircleIcon,
  Alert01Icon,
  Tick01Icon,
  Edit01Icon,
  Delete02Icon,
  Cancel01Icon,
  UserGroupIcon,
  BookOpen01Icon,
  ArrowRight01Icon,
  Award01Icon,
  CheckmarkCircle02Icon,
  Search01Icon
} from '@hugeicons/core-free-icons';
import { FinalizarTurmaModal } from '../components/common/FinalizarTurmaModal';

interface Curso {
  id: string;
  titulo: string;
}

interface Turma {
  id: string;
  nome: string;
  codigo_acesso: string;
  curso_id: string | null;
  created_at: string;
  curso_titulo?: string;
  total_alunos?: number;
  status?: 'em_andamento' | 'concluida' | 'arquivada' | null;
  finalizada_em?: string | null;
  observacao_encerramento?: string | null;
}

interface Aluno {
  id: string;
  nome: string | null;
  role: string | null;
  turma_id: string | null;
  status: 'ativo' | 'bloqueado' | null;
  email?: string;
  situacao_final?: 'cursando' | 'aprovado' | 'reprovado' | 'desistente' | null;
  frequencia?: number | null;
  progresso_geral?: number | null;
  nota_final?: number | null;
}

interface GerenciadorTurmasProps {
  onSelectStudent?: (id: string, section?: 'chat' | 'ficha') => void;
}

export const GerenciadorTurmas: React.FC<GerenciadorTurmasProps> = ({ onSelectStudent }) => {
  // Data lists
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'todas' | 'em_andamento' | 'concluida'>('todas');
  const [searchTurma, setSearchTurma] = useState('');

  // Modal State - Class creation/edit
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [classForm, setClassForm] = useState({
    nome: '',
    codigo_acesso: '',
    curso_id: ''
  });

  // Modal State - Finalizar Turma / Ata
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [turmaToFinalize, setTurmaToFinalize] = useState<Turma | null>(null);

  // Transfer state
  const [transferringAluno, setTransferringAluno] = useState<Aluno | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('cursos')
        .select('id, titulo')
        .order('titulo', { ascending: true });
      if (coursesError) throw coursesError;
      setCursos(coursesData || []);

      // 2. Fetch classes
      await fetchTurmasList(coursesData || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados iniciais.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTurmasList = async (coursesList: Curso[]) => {
    try {
      const { data: turmasData, error: turmasError } = await supabase
        .from('turmas')
        .select('*')
        .order('created_at', { ascending: false });
      if (turmasError) throw turmasError;

      // Fetch all student profiles to calculate totals
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('turma_id')
        .eq('role', 'student');
      if (profilesError) throw profilesError;

      const formatted = (turmasData || []).map(t => {
        const course = coursesList.find(c => c.id === t.curso_id);
        const studentsInClass = (profilesData || []).filter(p => p.turma_id === t.id).length;
        return {
          ...t,
          curso_titulo: course ? course.titulo : 'Sem Curso Vinculado',
          total_alunos: studentsInClass
        };
      });

      setTurmas(formatted);

      // Keep selected turma updated if already selected
      if (selectedTurma) {
        const updatedSelected = formatted.find(t => t.id === selectedTurma.id);
        if (updatedSelected) {
          setSelectedTurma(updatedSelected);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar turmas.');
    }
  };

  const fetchStudentsForClass = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('turma_id', classId)
        .eq('role', 'student')
        .order('nome', { ascending: true });
      if (error) throw error;
      setAlunos(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar alunos da turma.');
    }
  };

  const handleOpenCreateClass = () => {
    setEditingTurma(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setClassForm({
      nome: '',
      codigo_acesso: code,
      curso_id: ''
    });
    setShowClassModal(true);
  };

  const handleOpenEditClass = (turma: Turma) => {
    setEditingTurma(turma);
    setClassForm({
      nome: turma.nome,
      codigo_acesso: turma.codigo_acesso,
      curso_id: turma.curso_id || ''
    });
    setShowClassModal(true);
  };

  const handleOpenFinalizarTurma = (turma: Turma) => {
    setTurmaToFinalize(turma);
    setShowFinalizarModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!classForm.nome.trim()) throw new Error('O nome da turma é obrigatório.');

      const payload = {
        nome: classForm.nome.trim(),
        codigo_acesso: classForm.codigo_acesso,
        curso_id: classForm.curso_id || null
      };

      if (editingTurma) {
        // Update
        const { error } = await supabase
          .from('turmas')
          .update(payload)
          .eq('id', editingTurma.id);
        if (error) throw error;
        setSuccess('Turma atualizada com sucesso!');
      } else {
        // Insert
        const { error } = await supabase
          .from('turmas')
          .insert({ ...payload, status: 'em_andamento' });
        if (error) throw error;
        setSuccess('Turma criada com sucesso!');
      }

      setShowClassModal(false);
      fetchInitialData();
      if (selectedTurma && editingTurma && selectedTurma.id === editingTurma.id) {
        setSelectedTurma({ ...selectedTurma, ...payload });
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar a turma.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (turmaId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta turma? Os alunos vinculados serão removidos dela.')) return;
    setError(null);
    try {
      const { error } = await supabase
        .from('turmas')
        .delete()
        .eq('id', turmaId);
      if (error) throw error;
      setSuccess('Turma excluída com sucesso.');
      if (selectedTurma?.id === turmaId) {
        setSelectedTurma(null);
        setAlunos([]);
      }
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir turma.');
    }
  };

  const handleSelectClass = (turma: Turma) => {
    setSelectedTurma(turma);
    fetchStudentsForClass(turma.id);
  };

  const handleFinalizarSuccess = (updatedTurma: any) => {
    // Update local state
    setTurmas(prev => prev.map(t => t.id === updatedTurma.id ? { ...t, ...updatedTurma } : t));
    if (selectedTurma?.id === updatedTurma.id) {
      setSelectedTurma(prev => prev ? { ...prev, ...updatedTurma } : null);
      fetchStudentsForClass(updatedTurma.id);
    }
    fetchInitialData();
  };

  // STUDENT MANAGEMENT ACTIONS
  const handleToggleBlockStudent = async (student: Aluno) => {
    const nextStatus = student.status === 'bloqueado' ? 'ativo' : 'bloqueado';
    const actionText = nextStatus === 'bloqueado' ? 'bloquear' : 'desbloquear';
    if (!window.confirm(`Deseja realmente ${actionText} o aluno ${student.nome || ''}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: nextStatus })
        .eq('id', student.id);
      if (error) throw error;
      
      setAlunos(prev => prev.map(a => a.id === student.id ? { ...a, status: nextStatus } : a));
      setSuccess(`Status do aluno atualizado para ${nextStatus}.`);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status do aluno.');
    }
  };

  const handleRemoveStudentFromClass = async (student: Aluno) => {
    if (!window.confirm(`Tem certeza que deseja remover o aluno ${student.nome || ''} desta turma?`)) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ turma_id: null, situacao_final: 'cursando' })
        .eq('id', student.id);
      if (error) throw error;
      
      setAlunos(prev => prev.filter(a => a.id !== student.id));
      setSuccess('Aluno removido da turma com sucesso.');
      fetchInitialData(); // update totals
    } catch (err: any) {
      setError(err.message || 'Erro ao remover o aluno.');
    }
  };

  const handleTransferStudent = async (targetClassId: string) => {
    if (!transferringAluno) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ turma_id: targetClassId || null, situacao_final: 'cursando' })
        .eq('id', transferringAluno.id);
      if (error) throw error;

      setAlunos(prev => prev.filter(a => a.id !== transferringAluno.id));
      setSuccess('Aluno transferido de turma com sucesso!');
      setTransferringAluno(null);
      fetchInitialData(); // update totals
    } catch (err: any) {
      setError(err.message || 'Erro ao transferir aluno.');
    }
  };

  // Filtered turmas list
  const filteredTurmas = useMemo(() => {
    return turmas.filter(t => {
      const matchesSearch = t.nome.toLowerCase().includes(searchTurma.toLowerCase()) ||
        t.codigo_acesso.includes(searchTurma) ||
        (t.curso_titulo && t.curso_titulo.toLowerCase().includes(searchTurma.toLowerCase()));

      const isConcluida = t.status === 'concluida';
      if (statusFilter === 'em_andamento') return matchesSearch && !isConcluida;
      if (statusFilter === 'concluida') return matchesSearch && isConcluida;
      return matchesSearch;
    });
  }, [turmas, statusFilter, searchTurma]);

  // Selected class stats for banner
  const classResultsSummary = useMemo(() => {
    if (!selectedTurma || alunos.length === 0) return null;
    const aprovados = alunos.filter(a => a.situacao_final === 'aprovado').length;
    const reprovados = alunos.filter(a => a.situacao_final === 'reprovado').length;
    const desistentes = alunos.filter(a => a.situacao_final === 'desistente').length;
    const cursando = alunos.filter(a => !a.situacao_final || a.situacao_final === 'cursando').length;
    return { aprovados, reprovados, desistentes, cursando, total: alunos.length };
  }, [selectedTurma, alunos]);

  return (
    <div className="app-page relative overflow-hidden">
      
      {/* Feedback Messages */}
      {error && (
        <div className="p-4 bg-error-container/30 border border-error/20 rounded-xl text-error text-label-md flex items-start gap-2 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Alert01Icon} size={20} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-secondary-container/10 border border-secondary/20 rounded-xl text-secondary text-label-md flex items-start gap-2 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Tick01Icon} size={20} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="app-page-header app-page-header-row">
        <div>
          <h2 className="app-title">Administração e Finalização de Turmas</h2>
          <p className="app-subtitle">Gerencie códigos de acesso, acompanhe enturmação e finalize turmas marcando alunos aprovados, reprovados e desistentes com emissão de ata.</p>
        </div>
        <button
          onClick={handleOpenCreateClass}
          className="app-primary-action"
        >
          <HugeiconsIcon icon={AddCircleIcon} size={20} />
          Nova Turma
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Columns: Classes List */}
        <div className="xl:col-span-1 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="app-section-title">Minhas Turmas</h3>
            <span className="text-label-sm font-semibold bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 rounded-full">
              {filteredTurmas.length} {filteredTurmas.length === 1 ? 'Turma' : 'Turmas'}
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-container-low dark:bg-slate-800/80 rounded-xl border border-outline-variant/30 text-xs">
            <button
              onClick={() => setStatusFilter('todas')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                statusFilter === 'todas'
                  ? 'bg-white dark:bg-slate-700 text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('em_andamento')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 ${
                statusFilter === 'em_andamento'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs'
                  : 'text-on-surface-variant hover:text-emerald-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ativas
            </button>
            <button
              onClick={() => setStatusFilter('concluida')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 ${
                statusFilter === 'concluida'
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs'
                  : 'text-on-surface-variant hover:text-purple-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Concluídas
            </button>
          </div>

          {/* Search Turma Input */}
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            <input
              type="text"
              value={searchTurma}
              onChange={(e) => setSearchTurma(e.target.value)}
              placeholder="Filtrar turmas por nome, código ou curso..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-slate-800 border border-outline-variant/30 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
            />
          </div>

          {loading && turmas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-on-surface-variant">
              <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <p className="text-xs">Buscando turmas...</p>
            </div>
          ) : filteredTurmas.length === 0 ? (
            <div className="app-card-padded text-center text-slate-400 space-y-3">
              <HugeiconsIcon icon={UserGroupIcon} size={40} className="mx-auto text-slate-300" />
              <p className="text-body-md font-bold text-on-surface">Nenhuma turma encontrada.</p>
              <button
                onClick={handleOpenCreateClass}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-primary font-label-md"
              >
                Criar Turma
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-0.5">
              {filteredTurmas.map(t => {
                const isActive = selectedTurma?.id === t.id;
                const isConcluida = t.status === 'concluida';

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectClass(t)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs flex flex-col justify-between gap-3 ${
                      isActive 
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 ring-1 ring-primary/20' 
                        : 'bg-surface-container-lowest dark:bg-slate-800 border-outline-variant/30 hover:border-primary/30'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-heading font-extrabold text-body-md text-on-surface line-clamp-1">{t.nome}</h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isConcluida
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            {isConcluida ? 'Concluída' : 'Ativa'}
                          </span>
                          <span className="bg-surface-container text-on-surface-variant border border-outline-variant/30 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                            {t.codigo_acesso}
                          </span>
                        </div>
                      </div>
                      <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
                        <HugeiconsIcon icon={BookOpen01Icon} size={14} className="shrink-0" />
                        <span className="truncate">{t.curso_titulo}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-outline-variant/20 dark:border-slate-700/60 pt-3 text-xs">
                      <span className="text-on-surface-variant font-semibold">
                        {t.total_alunos} {t.total_alunos === 1 ? 'Aluno' : 'Alunos'}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {/* Quick Finalize / View Ata Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenFinalizarTurma(t); }}
                          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px] ${
                            isConcluida
                              ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'
                              : 'text-primary hover:bg-primary/10'
                          }`}
                          title={isConcluida ? 'Ver Ata de Conclusão' : 'Finalizar Turma / Gerar Ata'}
                        >
                          <HugeiconsIcon icon={Award01Icon} size={16} />
                          <span className="hidden sm:inline">{isConcluida ? 'Ata' : 'Finalizar'}</span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEditClass(t); }}
                          className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors"
                          title="Editar Turma"
                        >
                          <HugeiconsIcon icon={Edit01Icon} size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClass(t.id); }}
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                          title="Excluir Turma"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Columns: Students Workspace */}
        <div className="xl:col-span-2 space-y-4">
          {selectedTurma ? (
            <div className="app-card-padded space-y-5 animate-in fade-in duration-300">
              
              {/* Header of Selected Cohort */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-outline-variant/30 dark:border-slate-800 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-heading font-extrabold text-body-lg text-on-surface">{selectedTurma.nome}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                      selectedTurma.status === 'concluida'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    }`}>
                      {selectedTurma.status === 'concluida' ? 'Turma Concluída' : 'Turma em Andamento'}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-label-sm mt-0.5">
                    Código de Acesso para matrícula: <strong className="font-mono text-primary text-sm ml-1 select-all">{selectedTurma.codigo_acesso}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Finalizar / Ata Master Button */}
                  <button
                    onClick={() => handleOpenFinalizarTurma(selectedTurma)}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs shadow-xs transition-all ${
                      selectedTurma.status === 'concluida'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'
                        : 'bg-primary hover:bg-primary/90 text-on-primary shadow-primary/20'
                    }`}
                  >
                    <HugeiconsIcon icon={Award01Icon} size={17} />
                    {selectedTurma.status === 'concluida' ? 'Ver Ata / Resultados' : 'Finalizar Turma / Gerar Ata'}
                  </button>
                </div>
              </div>

              {/* Concluded Class Results Banner */}
              {selectedTurma.status === 'concluida' && classResultsSummary && (
                <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} className="text-purple-600 dark:text-purple-400" />
                      <h4 className="font-heading font-bold text-sm text-purple-900 dark:text-purple-200">
                        Resultados Finais da Turma
                      </h4>
                    </div>
                    {selectedTurma.finalizada_em && (
                      <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                        Concluída em {new Date(selectedTurma.finalizada_em).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200/50 dark:border-slate-700">
                      <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Aprovados</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 text-base">{classResultsSummary.aprovados}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200/50 dark:border-slate-700">
                      <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Reprovados</span>
                      <strong className="text-rose-600 dark:text-rose-400 text-base">{classResultsSummary.reprovados}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200/50 dark:border-slate-700">
                      <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Desistentes</span>
                      <strong className="text-amber-600 dark:text-amber-400 text-base">{classResultsSummary.desistentes}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200/50 dark:border-slate-700">
                      <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Total Concluintes</span>
                      <strong className="text-on-surface text-base">{classResultsSummary.total}</strong>
                    </div>
                  </div>
                </div>
              )}

              {alunos.length === 0 ? (
                <div className="text-center py-16 text-on-surface-variant space-y-1">
                  <p className="text-body-md font-bold text-on-surface">Turma vazia.</p>
                  <p className="text-label-sm">Os alunos entrarão aqui ao usar o código de acesso no cadastro.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/30 text-on-surface-variant font-bold text-label-sm text-xs uppercase tracking-wider">
                        <th className="pb-3 pl-2">Estudante</th>
                        <th className="pb-3 text-center">Frequência</th>
                        <th className="pb-3 text-center">Situação Acadêmica</th>
                        <th className="pb-3">Acesso</th>
                        <th className="pb-3 text-right pr-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 dark:divide-slate-800 text-xs">
                      {alunos.map(aluno => {
                        const situacao = aluno.situacao_final || 'cursando';

                        return (
                          <tr key={aluno.id} className="hover:bg-surface-container-low/40 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 pl-2">
                              <span className="font-heading font-semibold text-sm text-on-surface block">{aluno.nome || 'Sem nome'}</span>
                              <span className="text-[11px] text-on-surface-variant font-mono">{aluno.email || aluno.id.slice(0, 8) + '...'}</span>
                            </td>

                            <td className="py-3.5 text-center">
                              <span className="font-bold font-mono text-[11px] text-on-surface">
                                {typeof aluno.frequencia === 'number' ? `${aluno.frequencia}%` : '100%'}
                              </span>
                            </td>

                            {/* Situação Acadêmica Badge */}
                            <td className="py-3.5 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                situacao === 'aprovado'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : situacao === 'reprovado'
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                                  : situacao === 'desistente'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-primary/10 border-primary/20 text-primary'
                              }`}>
                                {situacao === 'aprovado' && 'Aprovado(a)'}
                                {situacao === 'reprovado' && 'Reprovado(a)'}
                                {situacao === 'desistente' && 'Desistente'}
                                {situacao === 'cursando' && 'Cursando'}
                              </span>
                            </td>

                            {/* Acesso (Bloqueado/Ativo) */}
                            <td className="py-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                aluno.status === 'bloqueado' 
                                  ? 'bg-error/10 border-error/20 text-error' 
                                  : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                              }`}>
                                {aluno.status === 'bloqueado' ? 'Bloqueado' : 'Liberado'}
                              </span>
                            </td>

                            <td className="py-3.5 text-right pr-2">
                              <div className="inline-flex items-center gap-1">
                                {/* Acompanhar Button */}
                                {onSelectStudent && (
                                  <button
                                    onClick={() => onSelectStudent(aluno.id, 'ficha')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                                  >
                                    Acompanhar
                                  </button>
                                )}

                                {/* Block/Unblock Button */}
                                <button
                                  onClick={() => handleToggleBlockStudent(aluno)}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                    aluno.status === 'bloqueado'
                                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'bg-error/5 hover:bg-error/10 border-error/10 text-error'
                                  }`}
                                  title={aluno.status === 'bloqueado' ? 'Desbloquear acesso' : 'Bloquear acesso'}
                                >
                                  {aluno.status === 'bloqueado' ? 'Desbloquear' : 'Bloquear'}
                                </button>

                                {/* Transfer Button */}
                                <button
                                  onClick={() => setTransferringAluno(aluno)}
                                  className="px-2 py-1 rounded-lg text-xs font-bold border border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant transition-colors"
                                  title="Transferir para outra turma"
                                >
                                  Transferir
                                </button>

                                {/* Remove Button */}
                                <button
                                  onClick={() => handleRemoveStudentFromClass(aluno)}
                                  className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                                  title="Remover da Turma"
                                >
                                  <HugeiconsIcon icon={Cancel01Icon} size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="app-card-padded text-center text-slate-400 space-y-3">
              <HugeiconsIcon icon={UserGroupIcon} size={48} className="mx-auto text-slate-300" />
              <p className="text-body-md font-bold text-on-surface">Selecione uma turma à esquerda</p>
              <p className="text-label-sm max-w-xs mx-auto">Selecione uma das turmas ativas ou concluídas para visualizar seus alunos matriculados, lançar a ata de encerramento e administrar permissões de acesso.</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Criar / Editar Turma */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-slate-900 w-full max-w-md border border-outline-variant/30 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="p-5 border-b border-outline-variant/30 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-body-lg font-heading font-extrabold text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={UserGroupIcon} size={20} className="text-primary" />
                {editingTurma ? 'Editar Turma' : 'Criar Nova Turma'}
              </h3>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveClass} className="p-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-on-surface">Nome da Turma</label>
                <input
                  type="text"
                  placeholder="Ex: Desenvolvimento Web - Noturno"
                  value={classForm.nome}
                  onChange={(e) => setClassForm({ ...classForm, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-slate-800 focus:border-primary focus:outline-none text-body-md text-on-surface"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-on-surface">Código de Acesso</label>
                <input
                  type="text"
                  value={classForm.codigo_acesso}
                  onChange={(e) => setClassForm({ ...classForm, codigo_acesso: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-slate-800 focus:border-primary focus:outline-none text-body-md font-mono tracking-wider font-bold text-center text-on-surface"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-on-surface">Curso Vinculado</label>
                <select
                  value={classForm.curso_id}
                  onChange={(e) => setClassForm({ ...classForm, curso_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-slate-800 focus:border-primary focus:outline-none text-label-md text-on-surface"
                >
                  <option value="">Nenhum Curso (Desvinculado)</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.titulo}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 border border-outline-variant/40 text-on-surface rounded-xl hover:bg-surface-container font-heading font-semibold text-label-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary text-on-primary rounded-xl font-heading font-bold text-label-sm shadow-sm hover:shadow hover:bg-primary/90 transition-all"
                >
                  {saving ? 'Salvando...' : (editingTurma ? 'Salvar Alterações' : 'Criar Turma')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transferência de Aluno */}
      {transferringAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-slate-900 w-full max-w-sm border border-outline-variant/30 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden font-sans">
            <div className="p-5 border-b border-outline-variant/30 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-body-lg font-heading font-extrabold text-on-surface">
                Transferir Aluno
              </h3>
              <button
                onClick={() => setTransferringAluno(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-label-sm text-on-surface-variant leading-relaxed">
                Selecione a turma de destino para o aluno <strong className="text-on-surface font-semibold">{transferringAluno.nome}</strong>:
              </p>
              
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {turmas.filter(t => t.id !== selectedTurma?.id).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTransferStudent(t.id)}
                    className="w-full text-left p-3 rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-label-md font-semibold text-on-surface flex justify-between items-center"
                  >
                    <span>{t.nome}</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-primary" />
                  </button>
                ))}
                
                {turmas.filter(t => t.id !== selectedTurma?.id).length === 0 && (
                  <p className="text-center py-4 text-on-surface-variant text-label-sm">Nenhuma outra turma ativa para transferência.</p>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-outline-variant/30">
                <button
                  onClick={() => setTransferringAluno(null)}
                  className="px-4 py-2 border border-outline-variant/40 text-on-surface rounded-xl hover:bg-surface-container font-heading font-semibold text-label-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Finalizar Turma / Ata de Conclusão */}
      {showFinalizarModal && turmaToFinalize && (
        <FinalizarTurmaModal
          turma={turmaToFinalize}
          isOpen={showFinalizarModal}
          onClose={() => {
            setShowFinalizarModal(false);
            setTurmaToFinalize(null);
          }}
          onSuccess={handleFinalizarSuccess}
        />
      )}

    </div>
  );
};
