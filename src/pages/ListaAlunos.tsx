import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AddTeamIcon,
  Copy01Icon,
  FilterIcon,
  Download01Icon,
  Chat01Icon,
  EyeIcon,
  Search01Icon,
  Alert01Icon,
  CheckmarkCircle02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Edit01Icon,
  Delete02Icon,
  ArrowDown01Icon,
  FireIcon,
  SparklesIcon,
  ChartHistogramIcon,
  UserGroupIcon,
  Cancel01Icon
} from '@hugeicons/core-free-icons';

interface Student {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  progresso_geral: number;
  frequencia: number;
  autonomia_digital: 'S' | 'P' | 'N';
  status_risco: 'Excelente' | 'No Caminho' | 'Alerta Médio' | 'Em Risco';
  media_digitacao: number;
  ofensiva_atual: number;
  turma_id?: string | null;
  situacao_final?: 'cursando' | 'aprovado' | 'reprovado' | 'desistente' | null;
}

interface Turma {
  id: string;
  nome: string;
  codigo_acesso: string;
  curso_id: string | null;
  cursos?: {
    titulo: string;
  } | null;
}

interface ListaAlunosProps {
  onSelectStudent: (id: string, initialTab?: 'chat' | 'ficha') => void;
}

export const ListaAlunos: React.FC<ListaAlunosProps> = ({ onSelectStudent }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false);

  const [aulas, setAulas] = useState<any[]>([]);
  const [progresso, setProgresso] = useState<any[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [hoveredSquare, setHoveredSquare] = useState<{ studentId: string; lessonIndex: number } | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CRUD modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [createdStudentCredentials, setCreatedStudentCredentials] = useState<{
    nome: string;
    email: string;
    password: string;
  } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Form input states
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formProgresso, setFormProgresso] = useState(50);
  const [formFrequencia, setFormFrequencia] = useState(90);
  const [formAutonomia, setFormAutonomia] = useState<'S' | 'P' | 'N'>('P');
  const [formRisco, setFormRisco] = useState<'Excelente' | 'No Caminho' | 'Alerta Médio' | 'Em Risco'>('No Caminho');
  const [formDigitacao, setFormDigitacao] = useState(350);
  const [formOfensiva, setFormOfensiva] = useState(5);
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [formTurmaId, setFormTurmaId] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTurmas();
  }, []);

  useEffect(() => {
    if (selectedTurma) {
      localStorage.setItem('selectedTurmaId', selectedTurma.id);
      setLoading(true);
      fetchClassProgressData(selectedTurma.id, selectedTurma.curso_id || null).finally(() => {
        setLoading(false);
      });
    }
  }, [selectedTurma]);

  const fetchTurmas = async () => {
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select('*, cursos(titulo)')
        .order('nome', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setTurmas(data);
        const storedTurmaId = localStorage.getItem('selectedTurmaId');
        if (storedTurmaId === 'sem_turma') {
          setSelectedTurma({
            id: 'sem_turma',
            nome: 'Alunos Sem Turma',
            codigo_acesso: '',
            curso_id: null,
            cursos: { titulo: 'Sem Curso' }
          });
        } else {
          const defaultTurma = data.find((t) => t.id === storedTurmaId) || data[0];
          setSelectedTurma(defaultTurma);
        }
      }
    } catch (err) {
      console.error('Error fetching classes list:', err);
    }
  };

  const fetchClassProgressData = async (turmaId: string, cursoId: string | null) => {
    setError(null);
    try {
      let sortedAulas: any[] = [];
      if (cursoId) {
        const { data: modulosData, error: modulosError } = await supabase
          .from('modulos')
          .select('id, ordem')
          .eq('curso_id', cursoId)
          .order('ordem', { ascending: true });

        if (modulosError) throw modulosError;

        if (modulosData && modulosData.length > 0) {
          const moduloIds = modulosData.map(m => m.id);
          const { data: aulasData, error: aulasError } = await supabase
            .from('aulas')
            .select('*, atividades(*)')
            .in('modulo_id', moduloIds);

          if (aulasError) throw aulasError;

          const modIdToOrder = new Map(modulosData.map((m, idx) => [m.id, idx]));
          sortedAulas = (aulasData || []).sort((a, b) => {
            const orderA = modIdToOrder.get(a.modulo_id!) ?? 999;
            const orderB = modIdToOrder.get(b.modulo_id!) ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.ordem ?? 0) - (b.ordem ?? 0);
          });
        }
      } else {
        const { data: aulasData, error: aulasError } = await supabase
          .from('aulas')
          .select('*, atividades(*)')
          .is('modulo_id', null)
          .order('numero_aula', { ascending: true });

        if (aulasError) throw aulasError;
        sortedAulas = aulasData || [];
      }

      setAulas(sortedAulas);

      let query = supabase
        .from('profiles')
        .select('id, nome, email, avatar_url, progresso_geral, frequencia, autonomia_digital, status_risco, media_digitacao, ofensiva_atual, turma_id, situacao_final')
        .eq('role', 'student');

      if (turmaId === 'sem_turma') {
        query = query.is('turma_id', null);
      } else {
        query = query.eq('turma_id', turmaId);
      }

      const { data: profilesData, error: profilesError } = await query.order('nome', { ascending: true });

      if (profilesError) throw profilesError;

      if (profilesData && profilesData.length > 0) {
        const studentIds = profilesData.map((s) => s.id);

        const { data: progressoData, error: progressoError } = await supabase
          .from('progresso_alunos')
          .select('*')
          .in('aluno_id', studentIds);

        if (progressoError) throw progressoError;
        setProgresso(progressoData || []);

        const { data: entregasData, error: entregasError } = await supabase
          .from('entregas_atividades')
          .select('*')
          .in('aluno_id', studentIds);

        if (entregasError) throw entregasError;
        setEntregas(entregasData || []);

        const formattedStudents: Student[] = profilesData.map((p: any) => ({
          id: p.id,
          nome: p.nome || 'Estudante Sem Nome',
          email: p.email || `${(p.nome || 'aluno').toLowerCase().replace(/\s+/g, '.')}@edu.com`,
          avatar_url: p.avatar_url,
          progresso_geral: p.progresso_geral !== null && p.progresso_geral !== undefined ? p.progresso_geral : 0,
          frequencia: p.frequencia !== null && p.frequencia !== undefined ? p.frequencia : 100,
          autonomia_digital: (p.autonomia_digital || 'P') as 'S' | 'P' | 'N',
          status_risco: (p.status_risco || 'No Caminho') as 'Excelente' | 'No Caminho' | 'Alerta Médio' | 'Em Risco',
          media_digitacao: p.media_digitacao || 0,
          ofensiva_atual: p.ofensiva_atual || 0,
          turma_id: p.turma_id,
          situacao_final: p.situacao_final || 'cursando'
        }));
        setStudents(formattedStudents);
      } else {
        setStudents([]);
        setProgresso([]);
        setEntregas([]);
      }
    } catch (err) {
      console.error('Error fetching class progress data:', err);
      setStudents([]);
      setProgresso([]);
      setEntregas([]);
    }
  };

  const getSquareState = (studentId: string, aula: any) => {
    if (!aula) return { status: 'nao_iniciado' as const, label: 'Aula não cadastrada' };

    const hasProgresso = progresso.some((p) => p.aluno_id === studentId && p.aula_id === aula.id);
    const atividade = aula.atividades?.[0];
    const entrega = atividade
      ? entregas.find((e) => e.aluno_id === studentId && e.atividade_id === atividade.id)
      : null;

    if (entrega) {
      if (entrega.nota === null) {
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

  const getColorClasses = (status: 'concluido' | 'pendente' | 'nao_iniciado') => {
    switch (status) {
      case 'concluido':
        return 'bg-emerald-500 text-white';
      case 'pendente':
        return 'bg-amber-400 text-slate-900';
      case 'nao_iniciado':
        return 'bg-surface-container-highest border border-outline-variant/40';
    }
  };

  const handleAddStudentClick = () => {
    setEditingStudent(null);
    setFormNome('');
    setFormEmail('');
    setFormProgresso(0);
    setFormFrequencia(100);
    setFormAutonomia('P');
    setFormRisco('No Caminho');
    setFormDigitacao(0);
    setFormOfensiva(0);
    setFormAvatarUrl('');
    setFormTurmaId(selectedTurma?.id === 'sem_turma' ? '' : selectedTurma?.id || '');
    setIsFormModalOpen(true);
  };

  const handleCopyTemporaryPassword = async () => {
    if (!createdStudentCredentials?.password) return;
    await navigator.clipboard.writeText(createdStudentCredentials.password);
    setPasswordCopied(true);
    window.setTimeout(() => setPasswordCopied(false), 2000);
  };

  const handleEditStudentClick = (student: Student) => {
    setEditingStudent(student);
    setFormNome(student.nome);
    setFormEmail(student.email);
    setFormProgresso(student.progresso_geral);
    setFormFrequencia(student.frequencia);
    setFormAutonomia(student.autonomia_digital);
    setFormRisco(student.status_risco);
    setFormDigitacao(student.media_digitacao);
    setFormOfensiva(student.ofensiva_atual);
    setFormAvatarUrl(student.avatar_url || '');
    setFormTurmaId(student.turma_id || '');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim()) return;

    try {
      const formData = {
        nome: formNome,
        email: formEmail,
        progresso_geral: Number(formProgresso),
        frequencia: Number(formFrequencia),
        autonomia_digital: formAutonomia,
        status_risco: formRisco,
        media_digitacao: Number(formDigitacao),
        ofensiva_atual: Number(formOfensiva),
        avatar_url: formAvatarUrl.trim() || null
      };

      if (editingStudent) {
        const updateData = {
          nome: formNome,
          email: formEmail,
          avatar_url: formAvatarUrl.trim() || null,
          turma_id: formTurmaId || null
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingStudent.id);

        if (updateError) throw updateError;

        setStudents((prev) =>
          prev.map((s) => (s.id === editingStudent.id ? { ...s, ...updateData } : s))
        );
      } else {
        const targetTurma = turmas.find((turma) => turma.id === formTurmaId);
        if (!targetTurma) {
          throw new Error('Selecione uma turma válida para criar o aluno.');
        }

        const { data, error: createError } = await supabase.functions.invoke('admin-create-student', {
          body: {
            ...formData,
            email: formEmail.trim(),
            nome: formNome.trim(),
            turma_id: targetTurma.id,
            codigo_acesso: targetTurma.codigo_acesso
          }
        });

        if (createError) throw createError;
        if (data?.error) throw new Error(data.error);

        const newProfile = data?.profile;
        if (!newProfile) throw new Error('A função não retornou o perfil criado.');

        if (selectedTurma?.id === targetTurma.id) {
          setStudents((prev) => [...prev, newProfile as Student]);
        } else {
          setSelectedTurma(targetTurma);
        }

        if (data?.temporaryPassword) {
          setCreatedStudentCredentials({
            nome: newProfile.nome || formNome.trim(),
            email: newProfile.email || formEmail.trim(),
            password: data.temporaryPassword,
          });
          setPasswordCopied(false);
        }
      }

      setIsFormModalOpen(false);
      setEditingStudent(null);
    } catch (err: any) {
      console.error('Error saving student:', err);
      alert('Erro ao salvar aluno: ' + err.message);
    }
  };

  const handleDeleteStudentClick = async (id: string, name: string) => {
    if (selectedTurma?.id === 'sem_turma') {
      alert('Este aluno já está sem turma.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja remover o(a) aluno(a) "${name}" desta turma?`)) return;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ turma_id: null })
        .eq('id', id);

      if (updateError) throw updateError;
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error('Error removing student from class:', err);
      alert('Erro ao remover aluno da turma: ' + err.message);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.nome.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos' ||
      student.status_risco === statusFilter ||
      student.situacao_final === statusFilter.toLowerCase() ||
      (statusFilter === 'Aprovados' && student.situacao_final === 'aprovado') ||
      (statusFilter === 'Reprovados' && student.situacao_final === 'reprovado') ||
      (statusFilter === 'Desistentes' && student.situacao_final === 'desistente') ||
      (statusFilter === 'Cursando' && (!student.situacao_final || student.situacao_final === 'cursando'));

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const averageProgress = students.length
    ? Math.round(students.reduce((acc, s) => acc + s.progresso_geral, 0) / students.length * 10) / 10
    : 0;

  const criticalStudentsCount = students.filter((s) => s.status_risco === 'Em Risco').length;
  const formattedCriticalCount = String(criticalStudentsCount).padStart(2, '0');

  const averageEngagement = students.length
    ? Math.round(students.reduce((acc, s) => acc + s.frequencia, 0) / students.length)
    : 0;

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Progresso Geral (%)', 'Frequência (%)', 'Autonomia Digital', 'Status de Risco', 'Média Digitação (pal/m)', 'Ofensiva (dias)'];
    const rows = students.map((s) => [
      s.nome,
      s.email,
      s.progresso_geral,
      s.frequencia,
      s.autonomia_digital,
      s.status_risco,
      s.media_digitacao,
      s.ofensiva_atual
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `relatorio_alunos_${(selectedTurma?.nome || 'turma').toLowerCase().replace(/\s+/g, '_')}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchUnreadChatCounts = async (studentIds: string[]) => {
    if (studentIds.length === 0) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const teacherId = session.user.id;

      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('aluno_id, remetente_id, created_at')
        .in('aluno_id', studentIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      studentIds.forEach(id => {
        const lastOpenedKey = `chat_last_opened:${teacherId}:${id}`;
        const lastOpenedStr = localStorage.getItem(lastOpenedKey) || new Date(0).toISOString();
        const lastOpenedTime = new Date(lastOpenedStr).getTime();

        const studentMessages = messages?.filter(m => m.aluno_id === id && m.remetente_id === id) || [];
        const unread = studentMessages.filter(m => new Date(m.created_at).getTime() > lastOpenedTime).length;
        counts[id] = unread;
      });

      setUnreadCounts(counts);
    } catch (err) {
      console.error('Error fetching unread chat counts:', err);
    }
  };

  useEffect(() => {
    if (students.length === 0) return;
    const studentIds = students.map(s => s.id);
    fetchUnreadChatCounts(studentIds);

    const channel = supabase
      .channel('lista_alunos_chat')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          fetchUnreadChatCounts(studentIds);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [students]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="product-page max-w-7xl mx-auto relative animate-fade-in pb-10 space-y-6">
      
      {/* Dynamic Class Header Card */}
      <header className="product-card p-4 sm:p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserGroupIcon} size={22} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="product-section-kicker">{selectedTurma?.cursos?.titulo || 'Curso Geral'}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">
                  {selectedTurma ? selectedTurma.nome : 'Carregando...'}
                </h1>
                
                {/* Class switcher dropdown button */}
                <div className="relative">
                  <button
                    onClick={() => setShowTurmaDropdown(!showTurmaDropdown)}
                    className="product-icon-action !h-8 !w-8 border border-outline-variant/70 bg-surface-container-lowest shadow-sm"
                    title="Selecionar outra turma"
                    aria-label="Selecionar outra turma"
                  >
                    <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} />
                  </button>
                  {showTurmaDropdown && (
                    <div className="absolute left-0 mt-2 w-64 bg-surface-container-lowest border border-outline-variant/70 rounded-product-control shadow-xl py-1.5 z-30">
                      {turmas.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedTurma(t);
                            setShowTurmaDropdown(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-surface-container-low transition-colors ${
                            selectedTurma?.id === t.id ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface'
                          }`}
                        >
                          {t.nome}
                        </button>
                      ))}
                      <div className="border-t border-outline-variant/50 my-1"></div>
                      <button
                        onClick={() => {
                          setSelectedTurma({
                            id: 'sem_turma',
                            nome: 'Alunos Sem Turma',
                            codigo_acesso: '',
                            curso_id: null,
                            cursos: { titulo: 'Sem Curso' }
                          });
                          setShowTurmaDropdown(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-surface-container-low transition-colors ${
                          selectedTurma?.id === 'sem_turma' ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface-variant'
                        }`}
                      >
                        Alunos Sem Turma (Pendentes)
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">
                {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno matriculado' : 'alunos matriculados'} • Semestre {new Date().getFullYear()}.{new Date().getMonth() < 6 ? '1' : '2'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleAddStudentClick}
              className="product-primary-action text-xs"
            >
              <HugeiconsIcon icon={AddTeamIcon} size={16} strokeWidth={2} />
              <span>Adicionar aluno</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="product-secondary-action text-xs"
            >
              <HugeiconsIcon icon={Download01Icon} size={16} strokeWidth={2} />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-product-control text-error text-xs font-semibold flex items-center gap-2">
          <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {/* Class Statistics HUD Metrics */}
      <section aria-label="Estatísticas da turma" className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <HugeiconsIcon icon={ChartHistogramIcon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Média da Turma</span>
            <strong className="product-metric-value">{averageProgress}%</strong>
            <span className="block truncate text-[10px] font-semibold text-on-surface-variant">
              Progresso global de aulas
            </span>
          </div>
        </div>

        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control ${
            criticalStudentsCount > 0 ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            <HugeiconsIcon icon={Alert01Icon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Alunos em Risco</span>
            <strong className="product-metric-value">{formattedCriticalCount}</strong>
            <span className={`block truncate text-[10px] font-semibold ${criticalStudentsCount > 0 ? 'text-error' : 'text-on-surface-variant'}`}>
              {criticalStudentsCount > 0 ? 'Necessitam acompanhamento' : 'Nenhum aluno em risco'}
            </span>
          </div>
        </div>

        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Frequência Média</span>
            <strong className="product-metric-value">{averageEngagement}%</strong>
            <span className="block truncate text-[10px] font-semibold text-on-surface-variant">
              Presença e engajamento
            </span>
          </div>
        </div>
      </section>

      {/* Toolbar: Search and Filter by Status */}
      <div className="product-toolbar" aria-label="Busca e filtros de alunos">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="w-full lg:max-w-md relative">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
              size={17}
              strokeWidth={2}
            />
            <input
              type="text"
              className="product-control pl-10 pr-4 text-xs"
              placeholder="Buscar por nome, e-mail ou status..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="product-secondary-action text-xs w-full sm:w-auto"
            >
              <HugeiconsIcon icon={FilterIcon} size={15} strokeWidth={2} />
              <span>
                {statusFilter === 'todos' ? 'Filtrar por Status' : `Status: ${statusFilter}`}
              </span>
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant/70 rounded-product-control shadow-xl py-1.5 z-20 max-h-72 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase text-on-surface-variant tracking-wider">Geral</div>
                <button
                  onClick={() => { setStatusFilter('todos'); setCurrentPage(1); setShowFilterDropdown(false); }}
                  className={`w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-surface-container-low transition-colors ${statusFilter === 'todos' ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface'}`}
                >
                  Todos os Alunos
                </button>

                <div className="px-3 py-1 text-[10px] font-extrabold uppercase text-on-surface-variant tracking-wider border-t border-outline-variant/50 mt-1 pt-1.5">Situação Acadêmica</div>
                {[
                  { id: 'Aprovados', label: 'Aprovados', color: 'text-emerald-600' },
                  { id: 'Reprovados', label: 'Reprovados', color: 'text-rose-600' },
                  { id: 'Desistentes', label: 'Desistentes', color: 'text-amber-600' },
                  { id: 'Cursando', label: 'Cursando', color: 'text-primary' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setStatusFilter(item.id);
                      setCurrentPage(1);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-surface-container-low transition-colors flex items-center justify-between ${
                      statusFilter === item.id ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.color.replace('text-', 'bg-')}`} />
                  </button>
                ))}

                <div className="px-3 py-1 text-[10px] font-extrabold uppercase text-on-surface-variant tracking-wider border-t border-outline-variant/50 mt-1 pt-1.5">Status de Risco</div>
                {['Excelente', 'No Caminho', 'Alerta Médio', 'Em Risco'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setCurrentPage(1);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-surface-container-low transition-colors ${
                      statusFilter === status ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Student Cards Grid */}
      <div>
        {loading ? (
          <div className="product-card p-12 text-center space-y-4">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-on-surface-variant animate-pulse">Carregando lista de alunos...</p>
          </div>
        ) : (
          <>
            {paginatedStudents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedStudents.map((student) => {
                  const isAtRisk = student.status_risco === 'Em Risco';
                  const studentCompletedCount = aulas.filter(aula => getSquareState(student.id, aula).status === 'concluido').length;
                  const calculatedXP = (studentCompletedCount * 50) + ((student.ofensiva_atual || 0) * 20);

                  return (
                    <article
                      key={student.id}
                      className={`product-card-interactive p-4 flex flex-col justify-between ${
                        isAtRisk ? 'border-error/30 bg-error/5' : ''
                      }`}
                    >
                      <div>
                        {/* Card Header: Avatar & Identification */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-outline-variant/60">
                          <div className="flex items-center gap-2.5 truncate">
                            {student.avatar_url ? (
                              <img
                                alt={student.nome}
                                className="w-10 h-10 rounded-product-control object-cover border border-outline-variant/60 shrink-0"
                                src={student.avatar_url}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-product-control bg-surface-container-high flex items-center justify-center font-heading font-extrabold text-on-surface text-xs border border-outline-variant/60 select-none shrink-0">
                                {getInitials(student.nome)}
                              </div>
                            )}
                            <div className="truncate">
                              <h4 className="font-heading font-extrabold text-xs text-on-surface truncate leading-tight hover:text-primary transition-colors cursor-pointer" onClick={() => onSelectStudent(student.id, 'ficha')}>
                                {student.nome}
                              </h4>
                              <p className="text-[10px] font-medium text-on-surface-variant truncate mt-0.5">{student.email}</p>
                            </div>
                          </div>

                          {/* Gamification badges */}
                          <div className="flex flex-col items-end gap-1 shrink-0 ml-1.5">
                            {(student.ofensiva_atual || 0) > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-orange-600 dark:text-orange-400 font-bold bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full" title={`Ofensiva de ${student.ofensiva_atual} dias`}>
                                <HugeiconsIcon icon={FireIcon} size={10} strokeWidth={2.5} />
                                {student.ofensiva_atual}d
                              </span>
                            )}
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-secondary font-bold bg-secondary/10 border border-secondary/20 px-1.5 py-0.5 rounded-full" title="XP Acumulado">
                              <HugeiconsIcon icon={SparklesIcon} size={10} strokeWidth={2.5} />
                              {calculatedXP} XP
                            </span>
                          </div>
                        </div>

                        {/* Middle metrics list */}
                        <div className="space-y-2 text-xs">
                          {/* Frequency */}
                          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-1.5">
                            <span className="text-[11px] text-on-surface-variant font-medium">Frequência</span>
                            <span className={`font-extrabold text-xs ${student.frequencia >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error'}`}>
                              {student.frequencia}%
                            </span>
                          </div>

                          {/* Autonomia Digital */}
                          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-1.5">
                            <span className="text-[11px] text-on-surface-variant font-medium">Autonomia</span>
                            {student.autonomia_digital === 'S' && (
                              <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/20">
                                S (Supervisionado)
                              </span>
                            )}
                            {student.autonomia_digital === 'P' && (
                              <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 border border-primary/20">
                                P (Pleno)
                              </span>
                            )}
                            {student.autonomia_digital === 'N' && (
                              <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 border border-amber-500/20">
                                N (Necessita Apoio)
                              </span>
                            )}
                          </div>

                          {/* Situação Acadêmica */}
                          {student.situacao_final && student.situacao_final !== 'cursando' && (
                            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-1.5">
                              <span className="text-[11px] text-on-surface-variant font-medium">Situação</span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                student.situacao_final === 'aprovado'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : student.situacao_final === 'reprovado'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              }`}>
                                {student.situacao_final === 'aprovado' && 'Aprovado(a)'}
                                {student.situacao_final === 'reprovado' && 'Reprovado(a)'}
                                {student.situacao_final === 'desistente' && 'Desistente'}
                              </span>
                            </div>
                          )}

                          {/* Status de Risco */}
                          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-1.5">
                            <span className="text-[11px] text-on-surface-variant font-medium">Risco</span>
                            {student.status_risco === 'Excelente' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Excelente
                              </span>
                            )}
                            {student.status_risco === 'No Caminho' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                No Caminho
                              </span>
                            )}
                            {student.status_risco === 'Alerta Médio' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Alerta Médio
                              </span>
                            )}
                            {student.status_risco === 'Em Risco' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/10 text-error text-[10px] font-bold border border-error/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                                Em Risco
                              </span>
                            )}
                          </div>
                        </div>

                        {/* General Progress Bar */}
                        <div className="space-y-1 pt-2.5">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-on-surface-variant">Progresso Geral</span>
                            <span className={isAtRisk ? 'text-error' : 'text-primary'}>
                              {studentCompletedCount}/{aulas.length} ({student.progresso_geral}%)
                            </span>
                          </div>
                          <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden shadow-inner w-full">
                            <div
                              className={`h-full rounded-full ${isAtRisk ? 'bg-error' : 'bg-gradient-to-r from-brand-cyan to-secondary'}`}
                              style={{ width: `${student.progresso_geral}%` }}
                            />
                          </div>
                        </div>

                        {/* Dynamic Thermal Grid */}
                        {aulas.length > 0 && (
                          <div className="pt-3 border-t border-outline-variant/60 mt-3">
                            <p className="text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider mb-1.5">Grade de Aulas</p>
                            <div className="grid gap-[2.5px] w-full relative" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
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
                                    className={`aspect-square rounded-[2px] hover:scale-110 cursor-pointer transition-all ${getColorClasses(
                                      squareData.status
                                    )}`}
                                    title={squareData.label}
                                  >
                                    {isHovered && (
                                      <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-surface-container-lowest border border-outline-variant/70 text-on-surface text-[10px] font-semibold p-2 rounded-product-control shadow-xl pointer-events-none text-center leading-normal">
                                        <span className="font-extrabold block mb-0.5 border-b border-outline-variant/40 pb-0.5">Aula {aula.numero_aula}</span>
                                        {squareData.label}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between border-t border-outline-variant/60 pt-3 mt-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => onSelectStudent(student.id, 'chat')}
                            className="product-secondary-action !min-h-8 !px-2.5 !py-1 text-xs relative"
                            title="Abrir Chat"
                          >
                            <HugeiconsIcon icon={Chat01Icon} size={14} strokeWidth={2} />
                            <span>Chat</span>
                            {unreadCounts[student.id] > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 bg-error text-white text-[9px] font-black rounded-full h-4 min-w-4 px-1 flex items-center justify-center border border-white animate-pulse shadow-sm">
                                {unreadCounts[student.id]}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => onSelectStudent(student.id, 'ficha')}
                            className="product-secondary-action !min-h-8 !px-2.5 !py-1 text-xs"
                            title="Visualizar Ficha"
                          >
                            <HugeiconsIcon icon={EyeIcon} size={14} strokeWidth={2} />
                            <span>Ficha</span>
                          </button>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditStudentClick(student)}
                            className="product-icon-action !h-8 !w-8"
                            title="Editar Cadastro"
                            aria-label="Editar Cadastro"
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={15} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => handleDeleteStudentClick(student.id, student.nome)}
                            className="product-icon-action !h-8 !w-8 text-error hover:bg-error/10 hover:text-error"
                            title="Remover da Turma"
                            aria-label="Remover da Turma"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="product-empty-state">
                <HugeiconsIcon icon={UserGroupIcon} size={32} className="text-primary mb-2" />
                <p className="font-heading text-sm font-extrabold text-on-surface">Nenhum aluno encontrado</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Nenhum aluno cadastrado nesta turma ou correspondente aos filtros.</p>
              </div>
            )}

            {/* Pagination Footer */}
            <div className="mt-6 product-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-on-surface-variant">
              <p>Exibindo {paginatedStudents.length} de {filteredStudents.length} alunos</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="product-icon-action !h-7 !w-7 disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={15} strokeWidth={2} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const isActive = currentPage === page;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-product-control text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-brand-navy text-white shadow-sm'
                          : 'hover:bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="product-icon-action !h-7 !w-7 disabled:opacity-40"
                  aria-label="Próxima página"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form Modal (Add & Edit Student) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="product-dialog max-w-lg animate-scale-up">

            {/* Modal Header */}
            <div className="product-dialog-header border-b flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-product-control bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <HugeiconsIcon icon={Edit01Icon} size={16} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-sm text-on-surface leading-tight">
                    {editingStudent ? 'Editar Cadastro' : 'Adicionar Novo Aluno'}
                  </h3>
                  {editingStudent && (
                    <p className="text-[11px] text-on-surface-variant font-medium leading-none mt-0.5">{editingStudent.nome}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingStudent(null);
                }}
                className="product-icon-action !h-7 !w-7"
                aria-label="Fechar modal"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">

              <div className="space-y-3">
                <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Dados Cadastrais</p>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    className="product-control text-xs"
                    placeholder="Ex: João da Silva"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="product-control text-xs"
                    placeholder="Ex: joao.silva@edu.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">URL do Avatar <span className="text-on-surface-variant font-normal">(opcional)</span></label>
                  <input
                    type="text"
                    className="product-control text-xs"
                    placeholder="https://exemplo.com/avatar.jpg"
                    value={formAvatarUrl}
                    onChange={(e) => setFormAvatarUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Turma Vinculada</label>
                  <select
                    required={!editingStudent}
                    className="product-control text-xs"
                    value={formTurmaId}
                    onChange={(e) => setFormTurmaId(e.target.value)}
                  >
                    {editingStudent ? (
                      <option value="">Sem Turma (Pendente)</option>
                    ) : (
                      <option value="" disabled>Selecione uma turma</option>
                    )}
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Metrics Readonly info */}
              <div className="bg-surface-container-low border border-outline-variant/70 rounded-product-control p-3.5 space-y-3">
                <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                  <HugeiconsIcon icon={SparklesIcon} size={12} strokeWidth={2.5} className="text-primary" />
                  Métricas (calculadas automaticamente)
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">Progresso</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${formProgresso}%` }} />
                      </div>
                      <span className="font-extrabold text-primary shrink-0 text-[11px]">{formProgresso}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">Frequência</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${
                      formFrequencia >= 75 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' : 'bg-error/10 text-error border-error/20'
                    }`}>{formFrequencia}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">Autonomia Digital</span>
                    {formAutonomia === 'S' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-bold border border-emerald-500/20">S (Supervisionado)</span>}
                    {formAutonomia === 'P' && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">P (Pleno)</span>}
                    {formAutonomia === 'N' && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[11px] font-bold border border-amber-500/20">N (Necessita Apoio)</span>}
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">Status de Risco</span>
                    {formRisco === 'Excelente' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-bold border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />Excelente</span>}
                    {formRisco === 'No Caminho' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20"><span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />No Caminho</span>}
                    {formRisco === 'Alerta Médio' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[11px] font-bold border border-amber-500/20"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />Alerta Médio</span>}
                    {formRisco === 'Em Risco' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/10 text-error text-[11px] font-bold border border-error/20"><span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse shrink-0" />Em Risco</span>}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="product-dialog-footer flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="product-secondary-action text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="product-primary-action text-xs"
                >
                  {editingStudent ? 'Salvar Alterações' : 'Criar Aluno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Created Credentials Modal */}
      {createdStudentCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="product-dialog max-w-md animate-scale-up">
            <div className="product-dialog-header border-b flex items-center gap-3 bg-emerald-500/10">
              <div className="w-9 h-9 rounded-product-control bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-sm text-on-surface leading-tight">Aluno criado com sucesso</h3>
                <p className="text-[11px] text-on-surface-variant font-medium leading-tight mt-0.5">
                  {createdStudentCredentials.nome} • {createdStudentCredentials.email}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface">Senha temporária</label>
                <input
                  readOnly
                  value={createdStudentCredentials.password}
                  onFocus={(event) => event.currentTarget.select()}
                  onClick={(event) => event.currentTarget.select()}
                  className="product-control font-mono font-bold text-sm"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/25 rounded-product-control p-3 text-xs font-semibold text-amber-800 dark:text-amber-300 leading-relaxed">
                Guarde ou envie esta senha agora. Ela aparece somente neste momento e o aluno deve trocar no primeiro acesso.
              </div>

              <div className="product-dialog-footer flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCreatedStudentCredentials(null)}
                  className="product-secondary-action text-xs"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleCopyTemporaryPassword}
                  className="product-primary-action text-xs"
                >
                  <HugeiconsIcon icon={passwordCopied ? CheckmarkCircle02Icon : Copy01Icon} size={15} strokeWidth={2} />
                  <span>{passwordCopied ? 'Senha copiada' : 'Copiar senha'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
