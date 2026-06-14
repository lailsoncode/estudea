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
  ArrowDown01Icon
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
}

interface Turma {
  id: string;
  nome: string;
  codigo_acesso: string;
}

interface ListaAlunosProps {
  onSelectStudent: (id: string, initialTab?: 'chat' | 'ficha') => void;
}



export const ListaAlunos: React.FC<ListaAlunosProps> = ({ onSelectStudent }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false);

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchTurmas();
  }, []);

  useEffect(() => {
    if (selectedTurma) {
      fetchStudents(selectedTurma.id);
    }
  }, [selectedTurma]);

  // Fetch all classes
  const fetchTurmas = async () => {
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setTurmas(data);
        // Default to Turma 4B first, fallback to first in list
        const defaultTurma = data.find((t) => t.nome === 'Turma 4B') || data[0];
        setSelectedTurma(defaultTurma);
      }
    } catch (err) {
      console.error('Error fetching classes list:', err);
    }
  };

  // Fetch student profiles for selected class
  const fetchStudents = async (turmaId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, email, avatar_url, progresso_geral, frequencia, autonomia_digital, status_risco, media_digitacao, ofensiva_atual')
        .eq('role', 'student')
        .eq('turma_id', turmaId)
        .order('nome', { ascending: true });

      if (profilesError) throw profilesError;

      if (profilesData && profilesData.length > 0) {
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
          ofensiva_atual: p.ofensiva_atual || 0
        }));
        setStudents(formattedStudents);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    } finally {
      setLoading(false);
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
        // UPDATE student profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update(formData)
          .eq('id', editingStudent.id);

        if (updateError) throw updateError;

        setStudents((prev) =>
          prev.map((s) => (s.id === editingStudent.id ? { ...s, ...formData } : s))
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
    : 64.5;

  const criticalStudentsCount = students.filter((s) => s.status_risco === 'Em Risco').length;
  const formattedCriticalCount = String(criticalStudentsCount).padStart(2, '0');

  const averageEngagement = students.length
    ? Math.round(students.reduce((acc, s) => acc + s.frequencia, 0) / students.length)
    : 82;

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
            <span>Lógica de Programação</span>
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
                </div>
              )}
            </div>
          </div>
          <p className="text-on-surface-variant text-sm mt-1.5 font-medium">
            {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno matriculado' : 'alunos matriculados'} • Semestre 2024.2
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

      {/* Main Student Table Container */}
      <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-on-surface-variant animate-pulse">Carregando lista de alunos...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-outline-variant/30">
                    <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                    <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider">Progresso Geral</th>
                    <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider text-center">Frequência</th>
                    <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider text-center">Autonomia Digital</th>
                    <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider">Status de Risco</th>
                    <th className="px-6 py-4 text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {paginatedStudents.length > 0 ? (
                    paginatedStudents.map((student) => {
                      const isAtRisk = student.status_risco === 'Em Risco';
                      return (
                        <tr
                          key={student.id}
                          className={`transition-colors group hover:bg-slate-50/40 ${
                            isAtRisk ? 'bg-red-50/20 hover:bg-red-50/40' : ''
                          }`}
                        >
                          <td className="px-6 py-4.5">
                            <div className="flex items-center gap-3">
                              {student.avatar_url ? (
                                <img
                                  alt={student.nome}
                                  className="w-10 h-10 rounded-full object-cover border border-outline-variant/30"
                                  src={student.avatar_url}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-on-surface-variant text-xs border border-outline-variant/30 select-none">
                                  {getInitials(student.nome)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-on-surface text-sm">{student.nome}</p>
                                <p className="text-[11px] font-medium text-on-surface-variant/60">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4.5 w-52">
                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className={`h-full rounded-full ${
                                    isAtRisk ? 'bg-error' : 'bg-primary'
                                  }`}
                                  style={{ width: `${student.progresso_geral}%` }}
                                ></div>
                              </div>
                              <span
                                className={`text-xs font-extrabold ${
                                  isAtRisk ? 'text-error' : 'text-primary'
                                }`}
                              >
                                {student.progresso_geral}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4.5 text-center">
                            <span className={`text-sm font-semibold ${isAtRisk ? 'text-error' : 'text-on-surface'}`}>
                              {student.frequencia}%
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-center">
                            {student.autonomia_digital === 'S' && (
                              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/50">
                                S (Supervisionado)
                              </span>
                            )}
                            {student.autonomia_digital === 'P' && (
                              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/50">
                                P (Pleno)
                              </span>
                            )}
                            {student.autonomia_digital === 'N' && (
                              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200/50">
                                N (Necessita Apoio)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4.5">
                            {student.status_risco === 'Excelente' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Excelente
                              </span>
                            )}
                            {student.status_risco === 'No Caminho' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                No Caminho
                              </span>
                            )}
                            {student.status_risco === 'Alerta Médio' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Alerta Médio
                              </span>
                            )}
                            {student.status_risco === 'Em Risco' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-error text-xs font-bold border border-red-200/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                                Em Risco
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4.5 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => onSelectStudent(student.id, 'chat')}
                                className="p-2 text-on-surface-variant/70 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                title="Abrir Chat"
                              >
                                <HugeiconsIcon icon={Chat01Icon} size={20} strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() => onSelectStudent(student.id, 'ficha')}
                                className="p-2 text-on-surface-variant/70 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                title="Visualizar Detalhes"
                              >
                                <HugeiconsIcon icon={EyeIcon} size={20} strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() => handleEditStudentClick(student)}
                                className="p-2 text-on-surface-variant/70 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                title="Editar Cadastro"
                              >
                                <HugeiconsIcon icon={Edit01Icon} size={20} strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() => handleDeleteStudentClick(student.id, student.nome)}
                                className="p-2 text-on-surface-variant/70 hover:text-error hover:bg-error/5 rounded-xl transition-all"
                                title="Excluir Aluno"
                              >
                                <HugeiconsIcon icon={Delete02Icon} size={20} strokeWidth={1.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center font-medium text-on-surface-variant/60">
                        Nenhum aluno encontrado para esta turma.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-on-surface-variant/80 border-t border-outline-variant/20">
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant/40 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-outline-variant/20 flex justify-between items-center">
              <h3 className="text-sm font-bold text-on-surface font-heading">
                {editingStudent ? `Editar Aluno: ${editingStudent.nome}` : 'Adicionar Novo Aluno'}
              </h3>
              <button
                onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingStudent(null);
                }}
                className="text-on-surface-variant hover:text-on-surface text-xs font-bold"
              >
                Fechar
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-extrabold text-on-surface-variant/70 uppercase mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs font-semibold text-on-surface"
                    placeholder="Ex: João da Silva"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-extrabold text-on-surface-variant/70 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-50 border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs font-semibold text-on-surface"
                    placeholder="Ex: joao.silva@edu.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant/70 uppercase mb-1">Progresso Geral (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    className="w-full bg-slate-50 border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs font-semibold text-on-surface"
                    value={formProgresso}
                    onChange={(e) => setFormProgresso(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant/70 uppercase mb-1">Frequência (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    className="w-full bg-slate-50 border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs font-semibold text-on-surface"
                    value={formFrequencia}
                    onChange={(e) => setFormFrequencia(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant/70 uppercase mb-1">Autonomia Digital</label>
                  <select
                    className="w-full bg-slate-50 border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs font-semibold text-on-surface"
                    value={formAutonomia}
                    onChange={(e) => setFormAutonomia(e.target.value as 'S' | 'P' | 'N')}
                  >
                    <option value="S">S (Supervisionado)</option>
                    <option value="P">P (Pleno)</option>
                    <option value="N">N (Necessita Apoio)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant/70 uppercase mb-1">Status de Risco</label>
                  <select
                    className="w-full bg-slate-50 border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs font-semibold text-on-surface"
                    value={formRisco}
                    onChange={(e) => setFormRisco(e.target.value as any)}
                  >
                    <option value="Excelente">Excelente</option>
                    <option value="No Caminho">No Caminho</option>
                    <option value="Alerta Médio">Alerta Médio</option>
                    <option value="Em Risco">Em Risco</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant/70 uppercase mb-1">Média Digitação (pal/m)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full bg-slate-50 border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs font-semibold text-on-surface"
                    value={formDigitacao}
                    onChange={(e) => setFormDigitacao(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant/70 uppercase mb-1">Dias Ofensiva</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full bg-slate-50 border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs font-semibold text-on-surface"
                    value={formOfensiva}
                    onChange={(e) => setFormOfensiva(Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-extrabold text-on-surface-variant/70 uppercase mb-1">URL da Imagem de Avatar (Opcional)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs font-semibold text-on-surface"
                    placeholder="https://exemplo.com/avatar.jpg"
                    value={formAvatarUrl}
                    onChange={(e) => setFormAvatarUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-outline-variant/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 border border-outline-variant/60 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-container shadow-sm transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
