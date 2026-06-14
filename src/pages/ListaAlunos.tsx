import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
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
  SchoolIcon,
  ArrowDown01Icon,
  KeyboardIcon,
  FireIcon,
  SparklesIcon
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

  // Fetch all classes
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
        const defaultTurma = data.find((t) => t.id === storedTurmaId) || data[0];
        setSelectedTurma(defaultTurma);
      }
    } catch (err) {
      console.error('Error fetching classes list:', err);
    }
  };

  // Fetch class progress data: lessons, students, progress, submissions
  const fetchClassProgressData = async (turmaId: string, cursoId: string | null) => {
    setError(null);
    try {
      // 1. Fetch Lessons dynamically based on course link or fallback
      let sortedAulas: any[] = [];
      if (cursoId) {
        // Fetch modules of the course sorted by order
        const { data: modulosData, error: modulosError } = await supabase
          .from('modulos')
          .select('id, ordem')
          .eq('curso_id', cursoId)
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
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, email, avatar_url, progresso_geral, frequencia, autonomia_digital, status_risco, media_digitacao, ofensiva_atual, turma_id')
        .eq('role', 'student')
        .eq('turma_id', turmaId)
        .order('nome', { ascending: true });

      if (profilesError) throw profilesError;

      if (profilesData && profilesData.length > 0) {
        const studentIds = profilesData.map((s) => s.id);

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
          turma_id: p.turma_id
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



  // Open modal for editing existing student
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

  // Submit create or edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim() || !selectedTurma) return;

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
        // UPDATE student profile (only cadastral details, metrics are dynamic)
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
        // CREATE student profile linking to selected class
        let newUserId;
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: formEmail,
            password: 'StudentPassword123!',
            options: {
              data: {
                nome: formNome,
                role: 'student',
                codigo_acesso: selectedTurma.codigo_acesso
              }
            }
          });

          if (signUpError) throw signUpError;
          newUserId = signUpData.user?.id;
        } catch (authErr) {
          console.warn('Auth signup bypassed or failed, using client UUID insertion:', authErr);
        }

        if (!newUserId) {
          newUserId = crypto.randomUUID();
        }

        const newProfile = {
          id: newUserId,
          role: 'student',
          turma_id: selectedTurma.id,
          ...formData,
          status: 'ativo'
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .upsert(newProfile);

        if (insertError) throw insertError;

        // Seed default criteria
        await supabase.from('observacoes_autonomia').upsert({
          aluno_id: newUserId,
          usa_computador: formAutonomia,
          navega_internet: formAutonomia,
          cria_salva_arquivos: formAutonomia,
          organiza_pastas: formAutonomia,
          copia_cola_links: formAutonomia,
          conhece_redes_sociais: formAutonomia,
          conhece_ferramentas: formAutonomia,
          precisa_apoio: formRisco === 'Em Risco' ? 'S' : 'N'
        });

        setStudents((prev) => [...prev, newProfile as Student]);
      }

      setIsFormModalOpen(false);
      setEditingStudent(null);
    } catch (err: any) {
      console.error('Error saving student:', err);
      alert('Erro ao salvar aluno: ' + err.message);
    }
  };

  // DELETE student profile
  const handleDeleteStudentClick = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o(a) aluno(a) "${name}" permanentemente?`)) return;

    try {
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error('Error deleting student:', err);
      alert('Erro ao excluir aluno: ' + err.message);
    }
  };

  // Filter students based on search and risk status
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.nome.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos' || student.status_risco === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate paginated students
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // Dynamic statistics
  const averageProgress = students.length
    ? Math.round(students.reduce((acc, s) => acc + s.progresso_geral, 0) / students.length * 10) / 10
    : 0;

  const criticalStudentsCount = students.filter((s) => s.status_risco === 'Em Risco').length;
  const formattedCriticalCount = String(criticalStudentsCount).padStart(2, '0');

  const averageEngagement = students.length
    ? Math.round(students.reduce((acc, s) => acc + s.frequencia, 0) / students.length)
    : 0;

  // Export CSV function
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

  // Get initials for profile placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Dynamic Breadcrumbs and Class Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6 bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1.5 uppercase tracking-wider">
            <HugeiconsIcon icon={SchoolIcon} size={16} strokeWidth={2.5} />
            <span>{selectedTurma?.cursos?.titulo || 'Curso Geral'}</span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="font-heading font-extrabold text-3xl text-on-surface leading-tight">
              Lista de Alunos - {selectedTurma ? selectedTurma.nome : 'Carregando...'}
            </h2>
            {/* Class switcher dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTurmaDropdown(!showTurmaDropdown)}
                className="p-1.5 rounded-xl bg-slate-50 border border-outline-variant/40 hover:bg-slate-100 transition-colors text-on-surface-variant flex items-center justify-center shadow-sm"
                title="Selecionar outra turma"
              >
                <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={2} />
              </button>
              {showTurmaDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white border border-outline-variant/40 rounded-xl shadow-lg py-1.5 z-30">
                  {turmas.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTurma(t);
                        setShowTurmaDropdown(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${
                        selectedTurma?.id === t.id ? 'text-primary bg-primary/5' : 'text-on-surface-variant'
                      }`}
                    >
                      {t.nome}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 my-1"></div>
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
                    className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${
                      selectedTurma?.id === 'sem_turma' ? 'text-primary bg-primary/5' : 'text-on-surface-variant'
                    }`}
                  >
                    Alunos Sem Turma (Pendentes)
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="text-on-surface-variant text-sm mt-1.5 font-medium">
            {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno matriculado' : 'alunos matriculados'} • Semestre {new Date().getFullYear()}.{new Date().getMonth() < 6 ? '1' : '2'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-error px-4 py-3 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Class Statistics Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4 hover-lift">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest leading-none mb-1.5">Mágia da Turma</p>
            <h4 className="text-2xl font-extrabold text-on-surface leading-none">{averageProgress}%</h4>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4 hover-lift">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
            <HugeiconsIcon icon={Alert01Icon} size={24} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest leading-none mb-1.5">Alunos Críticos</p>
            <h4 className="text-2xl font-extrabold text-on-surface leading-none">{formattedCriticalCount}</h4>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4 hover-lift">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-primary shadow-sm">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest leading-none mb-1.5">Engajamento</p>
            <h4 className="text-2xl font-extrabold text-on-surface leading-none">{averageEngagement}%</h4>
          </div>
        </div>
      </div>

      {/* Search Header for Student List */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/75 backdrop-blur-md border border-outline-variant/30 rounded-2xl p-4 shadow-sm">
        <div className="w-full lg:max-w-md relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
            size={18}
          />
          <input
            type="text"
            className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40"
            placeholder="Buscar por nome, e-mail ou status..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-outline-variant/50 rounded-xl text-sm font-bold text-on-surface-variant flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <HugeiconsIcon icon={FilterIcon} size={18} strokeWidth={1.5} />
              <span>
                {statusFilter === 'todos' ? 'Filtrar por Status' : `Status: ${statusFilter}`}
              </span>
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-outline-variant/40 rounded-xl shadow-lg py-1.5 z-20">
                {['todos', 'Excelente', 'No Caminho', 'Alerta Médio', 'Em Risco'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setCurrentPage(1);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${
                      statusFilter === status ? 'text-primary bg-primary/5' : 'text-on-surface-variant'
                    }`}
                  >
                    {status === 'todos' ? 'Todos os Status' : status}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-outline-variant/50 rounded-xl text-sm font-bold text-on-surface-variant flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.5} />
            <span>Exportar CSV</span>
          </button>

          {/* O botão de adicionar aluno manual foi removido, pois os alunos são carregados dinamicamente das matrículas das turmas */}
        </div>
      </div>

      {/* Main Student Cards Grid Container */}
      <div>
        {loading ? (
          <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-12 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-on-surface-variant animate-pulse">Carregando lista de alunos...</p>
          </div>
        ) : (
          <>
            {paginatedStudents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedStudents.map((student) => {
                  const isAtRisk = student.status_risco === 'Em Risco';
                  const studentCompletedCount = aulas.filter(aula => getSquareState(student.id, aula).status === 'concluido').length;
                  const calculatedXP = (studentCompletedCount * 50) + ((student.ofensiva_atual || 0) * 20);

                  return (
                    <article
                      key={student.id}
                      className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between ${
                        isAtRisk ? 'border-error/20 bg-red-50/5' : 'border-outline-variant/30'
                      }`}
                    >
                      <div>
                        {/* Card Header: Avatar & Identification */}
                        <div className="flex items-center justify-between mb-4.5 pb-4 border-b border-slate-100/60">
                          <div className="flex items-center gap-3 truncate">
                            {student.avatar_url ? (
                              <img
                                alt={student.nome}
                                className="w-11 h-11 rounded-full object-cover border border-outline-variant/30 shrink-0"
                                src={student.avatar_url}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center font-bold text-on-surface-variant text-xs border border-outline-variant/30 select-none shrink-0">
                                {getInitials(student.nome)}
                              </div>
                            )}
                            <div className="truncate">
                              <h4 className="font-bold text-on-surface text-sm truncate leading-tight hover:text-primary transition-colors cursor-pointer" onClick={() => onSelectStudent(student.id, 'ficha')}>{student.nome}</h4>
                              <p className="text-[11px] font-medium text-on-surface-variant/60 truncate mt-0.5">{student.email}</p>
                            </div>
                          </div>

                          {/* Gamification badges */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                            {(student.ofensiva_atual || 0) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 border border-orange-200/30 px-1.5 py-0.5 rounded-full" title={`Ofensiva de ${student.ofensiva_atual} dias`}>
                                <HugeiconsIcon icon={FireIcon} size={10} strokeWidth={2.5} />
                                {student.ofensiva_atual}d
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 font-bold bg-purple-50 border border-purple-200/30 px-1.5 py-0.5 rounded-full" title="XP Acumulado">
                              <HugeiconsIcon icon={SparklesIcon} size={10} strokeWidth={2.5} />
                              {calculatedXP} XP
                            </span>
                          </div>
                        </div>

                        {/* Middle metrics list */}
                        <div className="space-y-2.5">
                          {/* Frequency */}
                          <div className="flex items-center justify-between text-xs font-semibold border-b border-slate-100/40 pb-2">
                            <span className="text-on-surface-variant/60">Frequência</span>
                            <span className={`font-extrabold ${student.frequencia >= 75 ? 'text-emerald-600' : 'text-error'}`}>
                              {student.frequencia}%
                            </span>
                          </div>

                          {/* Autonomia Digital */}
                          <div className="flex items-center justify-between text-xs font-semibold border-b border-slate-100/40 pb-2">
                            <span className="text-on-surface-variant/60">Autonomia Digital</span>
                            {student.autonomia_digital === 'S' && (
                              <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/50">
                                S (Supervisionado)
                              </span>
                            )}
                            {student.autonomia_digital === 'P' && (
                              <span className="inline-block px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/50">
                                P (Pleno)
                              </span>
                            )}
                            {student.autonomia_digital === 'N' && (
                              <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/50">
                                N (Necessita Apoio)
                              </span>
                            )}
                          </div>

                          {/* Status de Risco */}
                          <div className="flex items-center justify-between text-xs font-semibold border-b border-slate-100/40 pb-2">
                            <span className="text-on-surface-variant/60">Status de Risco</span>
                            {student.status_risco === 'Excelente' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Excelente
                              </span>
                            )}
                            {student.status_risco === 'No Caminho' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                No Caminho
                              </span>
                            )}
                            {student.status_risco === 'Alerta Médio' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Alerta Médio
                              </span>
                            )}
                            {student.status_risco === 'Em Risco' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-error text-[10px] font-bold border border-red-200/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                                Em Risco
                              </span>
                            )}
                          </div>
                        </div>

                        {/* General Progress Bar */}
                        <div className="space-y-1.5 pt-3">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-on-surface-variant/60">Progresso Geral</span>
                            <span className={isAtRisk ? 'text-error' : 'text-primary'}>
                              {studentCompletedCount}/{aulas.length} Aulas ({student.progresso_geral}%)
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner w-full">
                            <div
                              className={`h-full rounded-full ${isAtRisk ? 'bg-error' : 'bg-primary'}`}
                              style={{ width: `${student.progresso_geral}%` }}
                            />
                          </div>
                        </div>

                        {/* Dynamic Thermal Grid */}
                        {aulas.length > 0 && (
                          <div className="pt-4 border-t border-slate-100/60 mt-3.5">
                            <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-wider mb-2">Grade de Aulas</p>
                            <div className="grid gap-[3px] w-full relative" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
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
                                      <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950 text-white text-[10px] font-semibold p-2 rounded-lg shadow-xl pointer-events-none text-center leading-normal">
                                        <span className="font-extrabold block mb-0.5 border-b border-white/10 pb-0.5">Aula {aula.numero_aula}</span>
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
                      <div className="flex items-center justify-between border-t border-slate-100/80 pt-3.5 mt-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onSelectStudent(student.id, 'chat')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/5 hover:bg-secondary/15 text-secondary text-xs font-bold rounded-xl transition-all"
                            title="Abrir Chat"
                          >
                            <HugeiconsIcon icon={Chat01Icon} size={15} strokeWidth={2} />
                            <span>Chat</span>
                          </button>
                          <button
                            onClick={() => onSelectStudent(student.id, 'ficha')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 hover:bg-primary/15 text-primary text-xs font-bold rounded-xl transition-all"
                            title="Visualizar Ficha"
                          >
                            <HugeiconsIcon icon={EyeIcon} size={15} strokeWidth={2} />
                            <span>Ficha</span>
                          </button>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditStudentClick(student)}
                            className="p-2 text-on-surface-variant/50 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                            title="Editar Cadastro"
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={16} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => handleDeleteStudentClick(student.id, student.nome)}
                            className="p-2 text-on-surface-variant/50 hover:text-error hover:bg-error/5 rounded-xl transition-all"
                            title="Excluir Aluno"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-12 text-center font-medium text-on-surface-variant/60">
                Nenhum aluno encontrado para esta turma.
              </div>
            )}

            {/* Pagination Footer */}
            <div className="mt-6 bg-white rounded-2xl border border-outline-variant/30 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-on-surface-variant/80 shadow-sm">
              <p>Exibindo {paginatedStudents.length} de {filteredStudents.length} alunos</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-outline-variant/40 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const isActive = currentPage === page;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-sm shadow-primary/15'
                          : 'hover:bg-slate-100 text-on-surface-variant'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-outline-variant/40 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CRUD Student Form Modal (Add & Edit) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">

            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-outline-variant/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Edit01Icon} size={16} strokeWidth={2} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface font-heading leading-tight">
                    {editingStudent ? 'Editar Cadastro' : 'Adicionar Novo Aluno'}
                  </h3>
                  {editingStudent && (
                    <p className="text-[11px] text-on-surface-variant/60 font-medium leading-none mt-0.5">{editingStudent.nome}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingStudent(null);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-slate-100 transition-all text-lg font-light leading-none shrink-0"
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">

              {/* Dados Cadastrais */}
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest">Dados Cadastrais</p>
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant/70 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl py-2.5 px-3 text-xs font-semibold text-on-surface outline-none transition-all"
                    placeholder="Ex: João da Silva"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant/70 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-50 border border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl py-2.5 px-3 text-xs font-semibold text-on-surface outline-none transition-all"
                    placeholder="Ex: joao.silva@edu.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant/70 mb-1">URL do Avatar <span className="text-on-surface-variant/40 font-medium">(opcional)</span></label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl py-2.5 px-3 text-xs font-semibold text-on-surface outline-none transition-all"
                    placeholder="https://exemplo.com/avatar.jpg"
                    value={formAvatarUrl}
                    onChange={(e) => setFormAvatarUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant/70 mb-1">Turma Vinculada</label>
                  <select
                    className="w-full bg-slate-50 border border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl py-2.5 px-3 text-xs font-semibold text-on-surface outline-none transition-all cursor-pointer"
                    value={formTurmaId}
                    onChange={(e) => setFormTurmaId(e.target.value)}
                  >
                    <option value="">Sem Turma (Pendente)</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Métricas (somente leitura) */}
              <div className="bg-slate-50 border border-outline-variant/30 rounded-xl p-3.5 space-y-3">
                <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest flex items-center gap-1.5">
                  <HugeiconsIcon icon={SparklesIcon} size={12} strokeWidth={2.5} className="text-primary" />
                  Métricas (calculadas automaticamente)
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  {/* Progresso */}
                  <div>
                    <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider block mb-1">Progresso</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${formProgresso}%` }} />
                      </div>
                      <span className="font-extrabold text-primary shrink-0 text-[11px]">{formProgresso}%</span>
                    </div>
                  </div>
                  {/* Frequencia */}
                  <div>
                    <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider block mb-1">Frequência</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold border ${
                      formFrequencia >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 'bg-red-50 text-error border-red-200/50'
                    }`}>{formFrequencia}%</span>
                  </div>
                  {/* Autonomia */}
                  <div>
                    <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider block mb-1">Autonomia Digital</span>
                    {formAutonomia === 'S' && <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/50">S (Supervisionado)</span>}
                    {formAutonomia === 'P' && <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/50">P (Pleno)</span>}
                    {formAutonomia === 'N' && <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200/50">N (Necessita Apoio)</span>}
                  </div>
                  {/* Status Risco */}
                  <div>
                    <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider block mb-1">Status de Risco</span>
                    {formRisco === 'Excelente' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100/50"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />Excelente</span>}
                    {formRisco === 'No Caminho' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100/50"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />No Caminho</span>}
                    {formRisco === 'Alerta Médio' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100/50"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />Alerta Médio</span>}
                    {formRisco === 'Em Risco' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-error text-[11px] font-bold border border-red-200/50"><span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse shrink-0" />Em Risco</span>}
                  </div>
                  {/* Digitação */}
                  <div>
                    <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider block mb-1">Velocidade Digitação</span>
                    <div className="flex items-center gap-1.5">
                      <HugeiconsIcon icon={KeyboardIcon} size={13} className="text-on-surface-variant/60 shrink-0" />
                      <span className="font-extrabold text-[11px]">{formDigitacao} ppm</span>
                    </div>
                  </div>
                  {/* Ofensiva */}
                  <div>
                    <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider block mb-1">Ofensiva</span>
                    <div className="flex items-center gap-1.5">
                      <HugeiconsIcon icon={FireIcon} size={13} className="text-orange-500 shrink-0" />
                      <span className="font-extrabold text-[11px]">{formOfensiva} dias</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 border border-outline-variant/50 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-sm shadow-primary/20 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
