import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserGroupIcon,
  AddCircleIcon,
  Alert01Icon,
  Tick01Icon,
  Search01Icon,
  Award01Icon,
  BookOpen01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Settings01Icon,
  AccessIcon,
  Copy01Icon
} from '@hugeicons/core-free-icons';

interface ProfessorData {
  id: string;
  nome: string | null;
  email: string | null;
  role: 'admin' | 'teacher' | 'student';
  avatar_url?: string | null;
  created_at: string;
  turmas: { id: string; nome: string; codigo_acesso: string; total_alunos: number }[];
  total_alunos: number;
}

export const GestaoProfessores: React.FC = () => {
  const [professores, setProfessores] = useState<ProfessorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'todos' | 'teacher' | 'admin'>('todos');

  // Teacher Access Key State
  const [teacherKey, setTeacherKey] = useState<string>('SENAC-DOCENTE-2026');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Modal State - Promote / Change Role
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfessorData | null>(null);
  const [newRole, setNewRole] = useState<'teacher' | 'admin' | 'student'>('teacher');
  const [savingRole, setSavingRole] = useState(false);

  // Modal State - New Teacher Invite / Registration info
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchProfessores();
  }, []);

  const fetchProfessores = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch teacher registration key from configuracoes_sistema
      const { data: keyData } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'chave_docente_cadastro')
        .maybeSingle();

      if (keyData?.valor) {
        setTeacherKey(keyData.valor);
      }

      // 2. Fetch all teacher/admin profiles
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['teacher', 'admin'])
        .order('nome', { ascending: true });

      if (profErr) throw profErr;

      // 3. Fetch all turmas with assigned professors
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, codigo_acesso, professor_id');

      // 4. Fetch student counts per turma
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, turma_id')
        .eq('role', 'student');

      const studentCounts = new Map<string, number>();
      (studentsData || []).forEach(s => {
        if (s.turma_id) {
          studentCounts.set(s.turma_id, (studentCounts.get(s.turma_id) || 0) + 1);
        }
      });

      const formattedProfessores: ProfessorData[] = (profs || []).map(p => {
        const myTurmas = (turmasData || [])
          .filter(t => t.professor_id === p.id)
          .map(t => ({
            id: t.id,
            nome: t.nome,
            codigo_acesso: t.codigo_acesso,
            total_alunos: studentCounts.get(t.id) || 0
          }));

        const totalAlunos = myTurmas.reduce((acc, curr) => acc + curr.total_alunos, 0);

        return {
          id: p.id,
          nome: p.nome,
          email: p.email,
          role: p.role as any,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          turmas: myTurmas,
          total_alunos: totalAlunos
        };
      });

      setProfessores(formattedProfessores);
    } catch (err: any) {
      console.error('Erro ao buscar equipe docente:', err);
      setError(err.message || 'Erro ao carregar dados da equipe docente.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoleModal = (user: ProfessorData) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setSavingRole(true);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id);

      if (updErr) throw updErr;

      setSuccess(`Papel de ${selectedUser.nome || selectedUser.email} atualizado para ${newRole === 'admin' ? 'Administrador' : newRole === 'teacher' ? 'Professor' : 'Aluno'} com sucesso!`);
      setShowRoleModal(false);
      fetchProfessores();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar papel do usuário.');
    } finally {
      setSavingRole(false);
    }
  };

  const handleOpenKeyModal = () => {
    setNewKeyInput(teacherKey);
    setShowKeyModal(true);
  };

  const handleSaveTeacherKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) {
      setError('A chave de acesso docente não pode ficar em branco.');
      return;
    }
    setSavingKey(true);
    setError(null);
    try {
      const keyToSave = newKeyInput.trim().toUpperCase();
      const { error: updErr } = await supabase
        .from('configuracoes_sistema')
        .upsert({
          chave: 'chave_docente_cadastro',
          valor: keyToSave,
          descricao: 'Chave institucional para auto-cadastro de novos professores',
          updated_at: new Date().toISOString()
        });

      if (updErr) throw updErr;

      setTeacherKey(keyToSave);
      setSuccess(`Chave de acesso docente personalizada com sucesso para "${keyToSave}"!`);
      setShowKeyModal(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar chave docente.');
    } finally {
      setSavingKey(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(teacherKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyInviteMessage = () => {
    const signupUrl = `${window.location.origin}/cadastro-professor`;
    const message = `Olá, Professor(a)!\nVocê foi convidado(a) para lecionar na plataforma Estudea Senac.\n\nPara criar sua conta docente, acesse:\n🔗 ${signupUrl}\n\n🔑 Chave de Acesso Docente: ${teacherKey}\n\nSeja bem-vindo(a) à equipe!`;
    navigator.clipboard.writeText(message);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const filteredProfessores = useMemo(() => {
    return professores.filter(p => {
      const nameMatch = (p.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
      const emailMatch = (p.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = nameMatch || emailMatch;

      const matchesRole = roleFilter === 'todos' || p.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [professores, searchTerm, roleFilter]);

  return (
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      
      {/* Feedback Messages */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-product-control text-error text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Alert01Icon} size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-product-control text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Tick01Icon} size={18} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Header Panel */}
      <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="product-section-kicker">Corpo Docente</span>
          <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">Gestão da Equipe Docente</h1>
          <p className="product-subtitle">Gerencie os professores da instituição, acompanhe turmas atribuídas e configure a chave de acesso docente.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenKeyModal}
            className="product-secondary-action text-xs"
            title="Configurar Chave de Acesso Docente"
          >
            <HugeiconsIcon icon={AccessIcon} size={15} strokeWidth={2} />
            <span>Configurar Chave Docente</span>
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="product-primary-action text-xs"
          >
            <HugeiconsIcon icon={AddCircleIcon} size={16} strokeWidth={2} />
            <span>Convidar Professor</span>
          </button>
        </div>
      </header>

      {/* Institutional Key Quick Banner */}
      <div className="product-card p-4 bg-gradient-to-r from-primary/10 via-surface-container-low to-secondary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-product-control bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
            <HugeiconsIcon icon={AccessIcon} size={18} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Chave de Auto-Cadastro Docente:</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-extrabold text-base text-primary tracking-wider">{teacherKey}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">Ativa</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyKey}
            className="product-secondary-action text-xs flex-1 sm:flex-initial"
          >
            <HugeiconsIcon icon={copiedKey ? Tick01Icon : Copy01Icon} size={14} className={copiedKey ? 'text-emerald-500' : ''} strokeWidth={2} />
            <span>{copiedKey ? 'Chave Copiada!' : 'Copiar Chave'}</span>
          </button>
          <button
            onClick={handleOpenKeyModal}
            className="product-primary-action text-xs !min-h-9"
          >
            <HugeiconsIcon icon={Settings01Icon} size={14} strokeWidth={2} />
            <span>Alterar</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics HUD */}
      <section aria-label="Resumo dos professores" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserGroupIcon} size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Total de Professores</span>
            <strong className="product-metric-value">{professores.length}</strong>
            <span className="block truncate text-[10px] font-semibold text-on-surface-variant">Corpo docente ativo</span>
          </div>
        </div>

        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-secondary/10 text-secondary">
            <HugeiconsIcon icon={BookOpen01Icon} size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Turmas Atribuídas</span>
            <strong className="product-metric-value text-secondary">
              {professores.reduce((acc, curr) => acc + curr.turmas.length, 0)}
            </strong>
            <span className="block truncate text-[10px] font-semibold text-on-surface-variant">Turmas sob mentoria</span>
          </div>
        </div>

        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <HugeiconsIcon icon={Award01Icon} size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Alunos em Acompanhamento</span>
            <strong className="product-metric-value text-emerald-600 dark:text-emerald-400">
              {professores.reduce((acc, curr) => acc + curr.total_alunos, 0)}
            </strong>
            <span className="block truncate text-[10px] font-semibold text-on-surface-variant">Alunos matriculados</span>
          </div>
        </div>
      </section>

      {/* Toolbar & Filters */}
      <div className="product-toolbar" aria-label="Busca e filtros de professores">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <HugeiconsIcon icon={Search01Icon} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" strokeWidth={2} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="product-control pl-8 pr-3 py-1.5 text-xs"
            />
          </div>

          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-product-control border border-outline-variant/60 text-xs">
            <button
              onClick={() => setRoleFilter('todos')}
              className={`py-1.5 px-3 rounded-product-control font-bold transition-all text-center ${
                roleFilter === 'todos'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Todos ({professores.length})
            </button>
            <button
              onClick={() => setRoleFilter('teacher')}
              className={`py-1.5 px-3 rounded-product-control font-bold transition-all text-center ${
                roleFilter === 'teacher'
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Professores ({professores.filter(p => p.role === 'teacher').length})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`py-1.5 px-3 rounded-product-control font-bold transition-all text-center ${
                roleFilter === 'admin'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-secondary'
              }`}
            >
              Coordenação ({professores.filter(p => p.role === 'admin').length})
            </button>
          </div>
        </div>
      </div>

      {/* Professors Grid */}
      {loading ? (
        <div className="product-card p-12 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin mx-auto" />
          <p className="text-xs font-semibold text-on-surface-variant animate-pulse">Carregando equipe docente...</p>
        </div>
      ) : filteredProfessores.length === 0 ? (
        <div className="product-empty-state space-y-3 p-10">
          <HugeiconsIcon icon={UserGroupIcon} size={40} className="mx-auto text-primary" />
          <p className="font-heading font-extrabold text-sm text-on-surface">Nenhum professor encontrado.</p>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">Tente ajustar seus filtros ou convide novos professores para a plataforma.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProfessores.map(p => (
            <article
              key={p.id}
              className="product-card-interactive p-4 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                {/* Header with avatar & role badge */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-product-control bg-primary/10 text-primary flex items-center justify-center font-heading font-extrabold text-sm uppercase shadow-inner shrink-0 border border-primary/20">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.nome || ''} className="w-full h-full object-cover rounded-product-control" />
                      ) : (
                        (p.nome || p.email || 'P').charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-heading font-extrabold text-xs text-on-surface line-clamp-1">
                        {p.nome || 'Sem Nome Cadastrado'}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant line-clamp-1 font-medium mt-0.5">{p.email}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
                    p.role === 'admin'
                      ? 'bg-secondary/10 text-secondary border-secondary/20'
                      : 'bg-primary/10 text-primary border-primary/20'
                  }`}>
                    {p.role === 'admin' ? 'Coordenação' : 'Docente'}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/50 text-xs">
                  <div className="bg-surface-container-low p-2 rounded-product-control text-center border border-outline-variant/40">
                    <span className="text-on-surface-variant font-medium block text-[10px] uppercase">Turmas</span>
                    <span className="font-heading font-extrabold text-on-surface text-sm">{p.turmas.length}</span>
                  </div>
                  <div className="bg-surface-container-low p-2 rounded-product-control text-center border border-outline-variant/40">
                    <span className="text-on-surface-variant font-medium block text-[10px] uppercase">Alunos</span>
                    <span className="font-heading font-extrabold text-secondary text-sm">{p.total_alunos}</span>
                  </div>
                </div>

                {/* Turmas List Badges */}
                {p.turmas.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Turmas Atribuídas:</p>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {p.turmas.map(t => (
                        <span key={t.id} className="text-[10px] font-bold bg-surface-container-low text-on-surface px-2 py-0.5 rounded-product-control border border-outline-variant/50">
                          {t.nome} ({t.total_alunos})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="border-t border-outline-variant/50 pt-2.5 flex justify-end">
                <button
                  onClick={() => handleOpenRoleModal(p)}
                  className="product-secondary-action text-xs !min-h-7 !px-2.5"
                >
                  <HugeiconsIcon icon={Award01Icon} size={14} strokeWidth={2} />
                  <span>Gerenciar Permissões</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal: Configure Teacher Key */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="product-dialog max-w-md animate-scale-up">
            <div className="product-dialog-header border-b flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-sm text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={AccessIcon} size={18} className="text-primary" strokeWidth={2} />
                <span>Chave de Acesso Docente</span>
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="product-icon-action !h-7 !w-7"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSaveTeacherKey} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface block">
                  Defina a Nova Chave de Auto-Cadastro
                </label>
                <input
                  type="text"
                  required
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value.toUpperCase())}
                  placeholder="Ex: SENAC-2026 ou DOCENTE-AQUIDABAN"
                  className="product-control text-xs font-mono tracking-wider font-bold uppercase"
                />
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Qualquer novo usuário que inserir esta chave na página de cadastro docente terá sua conta criada automaticamente com o papel de <strong>Professor</strong>.
                </p>
              </div>

              <div className="product-dialog-footer flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="product-secondary-action text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingKey}
                  className="product-primary-action text-xs flex items-center gap-1.5"
                >
                  {savingKey ? 'Salvando...' : 'Salvar Nova Chave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Role */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="product-dialog max-w-md animate-scale-up">
            <div className="product-dialog-header border-b flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-sm text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={Award01Icon} size={18} className="text-primary" strokeWidth={2} />
                <span>Permissões do Usuário</span>
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="product-icon-action !h-7 !w-7"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="font-heading font-extrabold text-xs text-on-surface">{selectedUser.nome || 'Sem Nome'}</p>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface">Papel na Plataforma</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 rounded-product-control border border-outline-variant/60 cursor-pointer hover:bg-surface-container-low transition-all">
                    <input
                      type="radio"
                      name="userRole"
                      value="teacher"
                      checked={newRole === 'teacher'}
                      onChange={() => setNewRole('teacher')}
                      className="mt-1 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-on-surface block">Professor (Docente)</span>
                      <span className="text-[11px] text-on-surface-variant">Acesso às suas turmas, alunos, diário, correções e cursos próprios.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-product-control border border-outline-variant/60 cursor-pointer hover:bg-surface-container-low transition-all">
                    <input
                      type="radio"
                      name="userRole"
                      value="admin"
                      checked={newRole === 'admin'}
                      onChange={() => setNewRole('admin')}
                      className="mt-1 text-secondary focus:ring-secondary"
                    />
                    <div>
                      <span className="text-xs font-bold text-on-surface block">Administrador / Coordenação</span>
                      <span className="text-[11px] text-on-surface-variant">Acesso global a todas as turmas, gestão de professores, cursos e relatórios institucionais.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="product-dialog-footer flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="product-secondary-action text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveRole}
                  disabled={savingRole}
                  className="product-primary-action text-xs"
                >
                  {savingRole ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Invite Teacher Info */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="product-dialog max-w-md animate-scale-up">
            <div className="product-dialog-header border-b flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-sm text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={UserGroupIcon} size={18} className="text-primary" strokeWidth={2} />
                <span>Convidar Novo Professor</span>
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="product-icon-action !h-7 !w-7"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-on-surface-variant leading-relaxed">
              <div className="p-3.5 bg-surface-container-low border border-outline-variant/60 rounded-product-control space-y-2">
                <p className="font-heading font-extrabold text-xs text-on-surface flex items-center gap-1.5">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} className="text-primary" strokeWidth={2} />
                  Dados de Acesso Docente
                </p>
                <div className="space-y-1.5 text-on-surface">
                  <p><strong>Link de Cadastro:</strong> <span className="font-mono text-primary text-[11px] break-all">{window.location.origin}/cadastro-professor</span></p>
                  <p><strong>Chave Institucional:</strong> <span className="font-mono font-bold text-secondary text-sm">{teacherKey}</span></p>
                </div>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-product-control space-y-1 text-on-surface">
                <p className="font-bold text-primary">Como funciona?</p>
                <p>O professor acessa o link, insere seus dados e a chave institucional acima para obter acesso docente imediato.</p>
              </div>

              <div className="product-dialog-footer flex flex-col sm:flex-row gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={handleCopyInviteMessage}
                  className="product-primary-action text-xs flex-1 flex items-center justify-center gap-1.5"
                >
                  <HugeiconsIcon icon={copiedInvite ? Tick01Icon : Copy01Icon} size={15} strokeWidth={2} />
                  <span>{copiedInvite ? 'Convite Copiado!' : 'Copiar Mensagem de Convite'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="product-secondary-action text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
