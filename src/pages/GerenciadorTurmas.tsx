import React, { useState, useEffect } from 'react';
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
  ArrowRight01Icon
} from '@hugeicons/core-free-icons';

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
}

interface Aluno {
  id: string;
  nome: string | null;
  role: string | null;
  turma_id: string | null;
  status: 'ativo' | 'bloqueado' | null;
  email?: string;
}

export const GerenciadorTurmas: React.FC = () => {
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

  // Modal State - Class creation/edit
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [classForm, setClassForm] = useState({
    nome: '',
    codigo_acesso: '',
    curso_id: ''
  });

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
          .insert(payload);
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
        .update({ turma_id: null })
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
        .update({ turma_id: targetClassId || null })
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
          <h2 className="app-title">Administração de Turmas</h2>
          <p className="app-subtitle">Crie turmas vinculadas a cursos, gerencie códigos de acesso e controle o status e a enturmação de alunos.</p>
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
              {turmas.length} Turmas
            </span>
          </div>

          {loading && turmas.length === 0 ? (
            <p className="text-slate-500 py-4">Buscando turmas...</p>
          ) : turmas.length === 0 ? (
            <div className="app-card-padded text-center text-slate-400 space-y-3">
              <HugeiconsIcon icon={UserGroupIcon} size={40} className="mx-auto text-slate-300" />
              <p className="text-body-md font-bold text-on-surface">Nenhuma turma cadastrada.</p>
              <button
                onClick={handleOpenCreateClass}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-primary font-label-md"
              >
                Criar Turma
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {turmas.map(t => {
                const isActive = selectedTurma?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectClass(t)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-level-1 flex flex-col justify-between gap-3 ${
                      isActive 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-white border-slate-200 hover:border-primary/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-heading font-extrabold text-body-md text-on-surface line-clamp-1">{t.nome}</h4>
                        <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold text-[11px] shrink-0 tracking-wider">
                          {t.codigo_acesso}
                        </span>
                      </div>
                      <p className="text-label-sm text-slate-400 flex items-center gap-1">
                        <HugeiconsIcon icon={BookOpen01Icon} size={14} className="shrink-0" />
                        <span className="truncate">{t.curso_titulo}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-label-sm">
                      <span className="text-slate-500 font-semibold">{t.total_alunos} Alunos enturmados</span>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEditClass(t); }}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-200/50 rounded-lg transition-colors"
                          title="Editar Turma"
                        >
                          <HugeiconsIcon icon={Edit01Icon} size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClass(t.id); }}
                          className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
                <div>
                  <h3 className="font-heading font-extrabold text-body-lg text-on-surface">Alunos de {selectedTurma.nome}</h3>
                  <p className="text-slate-400 text-label-sm mt-0.5">Código de Acesso para matrícula: <strong className="font-mono text-secondary text-sm ml-1 select-all">{selectedTurma.codigo_acesso}</strong></p>
                </div>
                <span className="text-label-sm font-semibold bg-secondary/5 text-secondary border border-secondary/10 px-2.5 py-1 rounded-full shrink-0">
                  {alunos.length} Alunos na lista
                </span>
              </div>

              {alunos.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-1">
                  <p className="text-body-md font-bold text-on-surface">Turma vazia.</p>
                  <p className="text-label-sm">Os alunos entrarão aqui ao usar o código de acesso no cadastro.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold text-label-sm">
                        <th className="pb-3 pl-2">Nome</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right pr-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alunos.map(aluno => (
                        <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pl-2">
                            <span className="font-heading font-semibold text-label-md text-on-surface block">{aluno.nome || 'Sem nome'}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{aluno.id.slice(0, 8)}...</span>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              aluno.status === 'bloqueado' 
                                ? 'bg-error/10 border-error/20 text-error' 
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}>
                              {aluno.status === 'bloqueado' ? 'Bloqueado' : 'Ativo'}
                            </span>
                          </td>
                          <td className="py-3 text-right pr-2">
                            <div className="inline-flex gap-1">
                              {/* Block/Unblock Button */}
                              <button
                                onClick={() => handleToggleBlockStudent(aluno)}
                                className={`px-2.5 py-1 rounded-lg text-label-sm font-bold border transition-colors ${
                                  aluno.status === 'bloqueado'
                                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                                    : 'bg-error/5 hover:bg-error/10 border-error/10 text-error'
                                }`}
                              >
                                {aluno.status === 'bloqueado' ? 'Desbloquear' : 'Bloquear'}
                              </button>

                              {/* Transfer Button */}
                              <button
                                onClick={() => setTransferringAluno(aluno)}
                                className="px-2.5 py-1 rounded-lg text-label-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                              >
                                Transferir
                              </button>

                              {/* Remove Button */}
                              <button
                                onClick={() => handleRemoveStudentFromClass(aluno)}
                                className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                                title="Remover da Turma"
                              >
                                <HugeiconsIcon icon={Cancel01Icon} size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="app-card-padded text-center text-slate-400 space-y-3">
              <HugeiconsIcon icon={UserGroupIcon} size={48} className="mx-auto text-slate-300" />
              <p className="text-body-md font-bold text-on-surface">Selecione uma turma à esquerda</p>
              <p className="text-label-sm max-w-xs mx-auto">Selecione uma das turmas ativas para visualizar seus alunos matriculados e administrar permissões de acesso.</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Criar / Editar Turma */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md border border-slate-200 rounded-2xl shadow-level-2 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-body-lg font-heading font-extrabold text-on-background flex items-center gap-2">
                <HugeiconsIcon icon={UserGroupIcon} size={20} className="text-primary" />
                {editingTurma ? 'Editar Turma' : 'Criar Nova Turma'}
              </h3>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveClass} className="p-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-slate-600">Nome da Turma</label>
                <input
                  type="text"
                  placeholder="Ex: Desenvolvimento Web - Noturno"
                  value={classForm.nome}
                  onChange={(e) => setClassForm({ ...classForm, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-body-md"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-slate-600">Código de Acesso</label>
                <input
                  type="text"
                  value={classForm.codigo_acesso}
                  onChange={(e) => setClassForm({ ...classForm, codigo_acesso: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-body-md font-mono tracking-wider font-bold text-center"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-slate-600">Curso Vinculado</label>
                <select
                  value={classForm.curso_id}
                  onChange={(e) => setClassForm({ ...classForm, curso_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-label-md"
                >
                  <option value="">Nenhum Curso (Desvinculado)</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.titulo}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-heading font-semibold text-label-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary text-on-primary rounded-xl font-heading font-bold text-label-sm shadow-sm hover:shadow hover:bg-primary-container transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm border border-slate-200 rounded-2xl shadow-level-2 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-body-lg font-heading font-extrabold text-on-background">
                Transferir Aluno
              </h3>
              <button
                onClick={() => setTransferringAluno(null)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-label-sm text-slate-500 leading-relaxed">
                Selecione a turma de destino para o aluno <strong className="text-on-surface font-semibold">{transferringAluno.nome}</strong>:
              </p>
              
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {turmas.filter(t => t.id !== selectedTurma?.id).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTransferStudent(t.id)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-label-md font-semibold text-on-surface flex justify-between items-center"
                  >
                    <span>{t.nome}</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-primary" />
                  </button>
                ))}
                
                {turmas.filter(t => t.id !== selectedTurma?.id).length === 0 && (
                  <p className="text-center py-4 text-slate-400 text-label-sm">Nenhuma outra turma ativa para transferência.</p>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setTransferringAluno(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-heading font-semibold text-label-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
