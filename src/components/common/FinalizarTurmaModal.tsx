import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Alert01Icon,
  SparklesIcon,
  Copy01Icon,
  PrinterIcon,
  UserGroupIcon,
  Award01Icon,
  Tick01Icon,
  Search01Icon,
  InformationCircleIcon,
  RotateLeft01Icon
} from '@hugeicons/core-free-icons';

export interface StudentEvaluation {
  id: string;
  nome: string | null;
  email?: string | null;
  frequencia: number;
  progresso_geral: number;
  media_digitacao: number;
  status_risco: string;
  media_notas: number | null;
  situacao_final: 'aprovado' | 'reprovado' | 'desistente' | 'cursando';
  sugestao_ia: 'aprovado' | 'reprovado' | 'desistente';
  motivo_sugestao: string;
  observacao_conclusao: string;
  nota_final: number | null;
}

interface TurmaInfo {
  id: string;
  nome: string;
  codigo_acesso: string;
  curso_id: string | null;
  curso_titulo?: string;
  status?: 'em_andamento' | 'concluida' | 'arquivada' | null;
  finalizada_em?: string | null;
  observacao_encerramento?: string | null;
}

interface FinalizarTurmaModalProps {
  turma: TurmaInfo;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTurma: TurmaInfo) => void;
}

export const FinalizarTurmaModal: React.FC<FinalizarTurmaModalProps> = ({
  turma,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'avaliacao' | 'ata'>('avaliacao');
  const [students, setStudents] = useState<StudentEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAta, setCopiedAta] = useState(false);
  const [observacaoGeral, setObservacaoGeral] = useState(turma.observacao_encerramento || '');
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  const isAlreadyConcluded = turma.status === 'concluida';

  useEffect(() => {
    if (isOpen) {
      fetchClassAndStudentMetrics();
    }
  }, [isOpen, turma.id]);

  const fetchClassAndStudentMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch student profiles in this class
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('turma_id', turma.id)
        .eq('role', 'student')
        .order('nome', { ascending: true });

      if (profilesError) throw profilesError;

      const studentList = profilesData || [];
      if (studentList.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = studentList.map(s => s.id);

      // 2. Fetch submissions to calculate real average grade
      const { data: entregasData } = await supabase
        .from('entregas_atividades')
        .select('aluno_id, nota')
        .in('aluno_id', studentIds)
        .not('nota', 'is', null);

      // Map average grades per student
      const gradeMap: Record<string, { sum: number; count: number }> = {};
      (entregasData || []).forEach(e => {
        if (typeof e.nota === 'number') {
          if (!gradeMap[e.aluno_id]) gradeMap[e.aluno_id] = { sum: 0, count: 0 };
          gradeMap[e.aluno_id].sum += e.nota;
          gradeMap[e.aluno_id].count += 1;
        }
      });

      // 3. Build evaluation items with intelligent suggestions
      const evaluations: StudentEvaluation[] = studentList.map(p => {
        const freq = typeof p.frequencia === 'number' ? p.frequencia : 100;
        const prog = typeof p.progresso_geral === 'number' ? p.progresso_geral : 0;
        const studentGrades = gradeMap[p.id];
        const avgGrade = studentGrades && studentGrades.count > 0 
          ? Math.round(studentGrades.sum / studentGrades.count) 
          : null;

        // Intelligent Suggestion Heuristic
        let sugestao: 'aprovado' | 'reprovado' | 'desistente' = 'aprovado';
        let motivo = '';

        if (freq === 0 && prog === 0 && (!studentGrades || studentGrades.count === 0)) {
          sugestao = 'desistente';
          motivo = 'Sem frequência e sem atividades registradas.';
        } else if (freq < 75) {
          sugestao = 'reprovado';
          motivo = `Frequência insuficiente (${freq}% < 75% mínimo).`;
        } else if (prog < 50 && (avgGrade === null || avgGrade < 50)) {
          sugestao = 'reprovado';
          motivo = `Progresso muito baixo (${prog}%) e média insuficiente.`;
        } else {
          sugestao = 'aprovado';
          motivo = `Frequência satisfatória (${freq}%) e bom engajamento.`;
        }

        // If student already has a saved final status (and not 'cursando'), preserve it
        const currentSavedStatus = p.situacao_final && p.situacao_final !== 'cursando'
          ? (p.situacao_final as 'aprovado' | 'reprovado' | 'desistente')
          : (isAlreadyConcluded ? sugestao : (p.situacao_final === 'cursando' ? sugestao : (p.situacao_final || sugestao)));

        return {
          id: p.id,
          nome: p.nome,
          email: p.email,
          frequencia: freq,
          progresso_geral: prog,
          media_digitacao: p.media_digitacao || 0,
          status_risco: p.status_risco || 'No Caminho',
          media_notas: avgGrade,
          situacao_final: currentSavedStatus as any,
          sugestao_ia: sugestao,
          motivo_sugestao: motivo,
          observacao_conclusao: p.observacao_conclusao || '',
          nota_final: p.nota_final || (avgGrade !== null ? avgGrade : prog)
        };
      });

      setStudents(evaluations);
    } catch (err: any) {
      console.error('Erro ao carregar métricas para finalização:', err);
      setError(err.message || 'Erro ao carregar dados dos alunos.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics summary
  const summary = useMemo(() => {
    const total = students.length;
    const aprovados = students.filter(s => s.situacao_final === 'aprovado').length;
    const reprovados = students.filter(s => s.situacao_final === 'reprovado').length;
    const desistentes = students.filter(s => s.situacao_final === 'desistente').length;
    const taxaAprovacao = total > 0 ? Math.round((aprovados / total) * 100) : 0;
    const frequenciaMedia = total > 0 
      ? Math.round(students.reduce((acc, s) => acc + s.frequencia, 0) / total) 
      : 0;

    return {
      total,
      aprovados,
      reprovados,
      desistentes,
      taxaAprovacao,
      frequenciaMedia
    };
  }, [students]);

  // Bulk Actions
  const handleApplyAllSuggestions = () => {
    setStudents(prev => prev.map(s => ({
      ...s,
      situacao_final: s.sugestao_ia
    })));
  };

  const handleSetAllStatus = (status: 'aprovado' | 'reprovado' | 'desistente') => {
    setStudents(prev => prev.map(s => ({
      ...s,
      situacao_final: status
    })));
  };

  const handleStudentStatusChange = (studentId: string, status: 'aprovado' | 'reprovado' | 'desistente' | 'cursando') => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, situacao_final: status } : s));
  };

  const handleStudentObservationChange = (studentId: string, obs: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, observacao_conclusao: obs } : s));
  };

  // Save cohort finalization
  const handleFinalizeCohort = async () => {
    if (students.length === 0) {
      setError('A turma não possui alunos para finalizar.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const now = new Date().toISOString();

      // 1. Update Turma status to 'concluida'
      const { error: turmaError } = await supabase
        .from('turmas')
        .update({
          status: 'concluida',
          finalizada_em: now,
          observacao_encerramento: observacaoGeral.trim() || null
        })
        .eq('id', turma.id);

      if (turmaError) throw turmaError;

      // 2. Update each student's final situation in batch/parallel
      const updatePromises = students.map(student => {
        return supabase
          .from('profiles')
          .update({
            situacao_final: student.situacao_final,
            data_conclusao: now,
            nota_final: student.nota_final,
            observacao_conclusao: student.observacao_conclusao.trim() || null
          })
          .eq('id', student.id);
      });

      const results = await Promise.all(updatePromises);
      const firstError = results.find(r => r.error);
      if (firstError?.error) throw firstError.error;

      const updatedTurma: TurmaInfo = {
        ...turma,
        status: 'concluida',
        finalizada_em: now,
        observacao_encerramento: observacaoGeral.trim() || null
      };

      setSuccessMsg('Turma finalizada com sucesso! A ata foi registrada.');
      onSuccess(updatedTurma);
    } catch (err: any) {
      console.error('Erro ao finalizar turma:', err);
      setError(err.message || 'Erro ao finalizar a turma.');
    } finally {
      setSaving(false);
    }
  };

  // Reopen Cohort
  const handleReopenCohort = async () => {
    setSaving(true);
    setError(null);

    try {
      // 1. Update Turma status to 'em_andamento'
      const { error: turmaError } = await supabase
        .from('turmas')
        .update({
          status: 'em_andamento',
          finalizada_em: null
        })
        .eq('id', turma.id);

      if (turmaError) throw turmaError;

      // 2. Update students back to 'cursando'
      const updatePromises = students.map(student => {
        return supabase
          .from('profiles')
          .update({
            situacao_final: 'cursando',
            data_conclusao: null
          })
          .eq('id', student.id);
      });

      await Promise.all(updatePromises);

      const updatedTurma: TurmaInfo = {
        ...turma,
        status: 'em_andamento',
        finalizada_em: null
      };

      setShowReopenConfirm(false);
      setSuccessMsg('Turma reaberta com sucesso! O status foi revertido para Em Andamento.');
      onSuccess(updatedTurma);
      onClose();
    } catch (err: any) {
      console.error('Erro ao reabrir turma:', err);
      setError(err.message || 'Erro ao reabrir a turma.');
    } finally {
      setSaving(false);
    }
  };

  // Copy Ata to Clipboard
  const generateAtaText = () => {
    const dataFormatada = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    let text = `====================================================\n`;
    text += `          ATA DE ENCERRAMENTO DE TURMA\n`;
    text += `                ESTUDEA - LMS\n`;
    text += `====================================================\n\n`;
    text += `Turma: ${turma.nome}\n`;
    text += `Curso: ${turma.curso_titulo || 'Não informado'}\n`;
    text += `Código de Acesso: ${turma.codigo_acesso}\n`;
    text += `Data de Conclusão: ${dataFormatada}\n\n`;
    text += `--- RESUMO GERAL ---\n`;
    text += `Total de Alunos Matriculados: ${summary.total}\n`;
    text += `Aprovados: ${summary.aprovados} (${summary.taxaAprovacao}%)\n`;
    text += `Reprovados: ${summary.reprovados}\n`;
    text += `Desistentes: ${summary.desistentes}\n`;
    text += `Frequência Média da Turma: ${summary.frequenciaMedia}%\n\n`;
    if (observacaoGeral.trim()) {
      text += `Observações Gerais: ${observacaoGeral.trim()}\n\n`;
    }
    text += `--- RESULTADO INDIVIDUAL DOS ALUNOS ---\n`;
    students.forEach((s, idx) => {
      const situacaoLabel = s.situacao_final.toUpperCase();
      text += `${idx + 1}. ${s.nome || 'Sem nome'} | Situação: [ ${situacaoLabel} ] | Frequência: ${s.frequencia}% | Progresso: ${s.progresso_geral}%`;
      if (s.nota_final !== null) text += ` | Média: ${s.nota_final}`;
      if (s.observacao_conclusao) text += ` | Obs: ${s.observacao_conclusao}`;
      text += `\n`;
    });
    text += `\n====================================================\n`;
    text += `Registrado e emitido via Plataforma Estudea.\n`;
    return text;
  };

  const handleCopyAta = () => {
    const ata = generateAtaText();
    navigator.clipboard.writeText(ata);
    setCopiedAta(true);
    setTimeout(() => setCopiedAta(false), 3000);
  };

  const handlePrintAta = () => {
    window.print();
  };

  // Filtered student list for search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      (s.nome && s.nome.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      s.situacao_final.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/40 dark:border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-6xl max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-outline-variant/30 dark:border-slate-800 bg-surface-container-low/50 dark:bg-slate-800/50 flex items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={Award01Icon} size={24} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-extrabold text-base sm:text-xl text-on-surface truncate">
                  {isAlreadyConcluded ? 'Ata de Encerramento e Resultados' : 'Finalizar e Fechar Turma'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide border shrink-0 ${
                  isAlreadyConcluded
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  {isAlreadyConcluded ? 'Turma Concluída' : 'Em Andamento'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5 truncate">
                Turma: <strong className="text-on-surface font-semibold">{turma.nome}</strong> • Curso: <span className="font-semibold text-primary">{turma.curso_titulo || 'Sem curso'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors shrink-0"
            title="Fechar modal"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>

        {/* Navigation Tabs & Metrics Summary */}
        <div className="px-4 sm:px-6 pt-3 pb-3 border-b border-outline-variant/20 dark:border-slate-800 bg-surface-container-lowest dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-surface-container-low dark:bg-slate-800/80 p-1 rounded-xl border border-outline-variant/20 dark:border-slate-700 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('avaliacao')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'avaliacao'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              1. Avaliação dos Alunos ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('ata')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ata'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <HugeiconsIcon icon={Copy01Icon} size={15} />
              2. Ata de Conclusão Oficial
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs font-semibold">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Aprovados: <strong className="font-bold">{summary.aprovados}</strong> ({summary.taxaAprovacao}%)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Reprovados: <strong className="font-bold">{summary.reprovados}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>Desistentes: <strong className="font-bold">{summary.desistentes}</strong></span>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3.5 bg-error-container/30 border border-error/20 rounded-xl text-error text-xs font-semibold flex items-center gap-2 shrink-0">
            <HugeiconsIcon icon={Alert01Icon} size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 shrink-0">
            <HugeiconsIcon icon={Tick01Icon} size={18} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
              <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-xs font-bold">Carregando métricas pedagógicas e histórico dos alunos...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 space-y-3 bg-surface-container-low/40 rounded-2xl border border-outline-variant/30">
              <HugeiconsIcon icon={UserGroupIcon} size={48} className="mx-auto text-on-surface-variant/40" />
              <h4 className="font-heading font-bold text-base text-on-surface">Nenhum aluno matriculado</h4>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                Esta turma não possui estudantes matriculados para serem avaliados ou finalizados.
              </p>
            </div>
          ) : activeTab === 'avaliacao' ? (
            <div className="space-y-5">
              {/* Intelligent Suggestion Banner & Quick Actions */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={SparklesIcon} size={22} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-heading font-extrabold text-on-surface">
                      Sugestão Pedagógica Automática
                    </h4>
                    <p className="text-[11px] sm:text-xs text-on-surface-variant leading-relaxed">
                      O sistema calculou automaticamente o status com base em: <strong>Frequência mínima (75%)</strong>, <strong>Progresso nas aulas</strong> e <strong>Média de notas práticas</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={handleApplyAllSuggestions}
                    className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 shadow-sm transition-all"
                  >
                    <HugeiconsIcon icon={SparklesIcon} size={15} />
                    Aplicar Sugestões ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllStatus('aprovado')}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all"
                    title="Marcar todos como aprovados"
                  >
                    Aprovar Todos
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
                <div className="relative flex-1 max-w-sm">
                  <HugeiconsIcon icon={Search01Icon} size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar aluno por nome..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-lowest dark:bg-slate-800 border border-outline-variant/30 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/50"
                  />
                </div>
                <div className="text-xs text-on-surface-variant font-medium">
                  Exibindo <strong>{filteredStudents.length}</strong> de <strong>{students.length}</strong> alunos
                </div>
              </div>

              {/* Student Evaluation Table */}
              <div className="border border-outline-variant/30 dark:border-slate-700 rounded-xl sm:rounded-2xl overflow-hidden bg-surface-container-lowest dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs min-w-[820px]">
                    <thead>
                      <tr className="border-b border-outline-variant/30 dark:border-slate-800 bg-surface-container-low/60 dark:bg-slate-800 text-on-surface-variant font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 pl-4 pr-2 min-w-[180px]">Estudante</th>
                        <th className="py-3.5 px-2 text-center min-w-[85px]">Frequência</th>
                        <th className="py-3.5 px-2 text-center min-w-[95px]">Progresso</th>
                        <th className="py-3.5 px-2 text-center min-w-[90px]">Média Entregas</th>
                        <th className="py-3.5 px-2 min-w-[135px]">Sugestão</th>
                        <th className="py-3.5 px-3 text-center min-w-[250px]">Situação Final (Ajuste)</th>
                        <th className="py-3.5 pr-4 pl-2 min-w-[160px]">Observação Individual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 dark:divide-slate-800">
                      {filteredStudents.map((s) => {
                        const isApproved = s.situacao_final === 'aprovado';
                        const isFailed = s.situacao_final === 'reprovado';
                        const isDropped = s.situacao_final === 'desistente';

                        return (
                          <tr key={s.id} className="hover:bg-surface-container-low/30 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 pl-4 pr-2">
                              <span className="font-heading font-bold text-sm text-on-surface block line-clamp-1">{s.nome || 'Sem nome'}</span>
                              <span className="text-[11px] text-on-surface-variant font-mono">{s.email || 'Sem e-mail'}</span>
                            </td>

                            <td className="py-3 px-2 text-center">
                              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-bold font-mono text-[11px] ${
                                s.frequencia >= 75
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {s.frequencia}%
                              </span>
                            </td>

                            <td className="py-3 px-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-bold font-mono text-[11px] text-on-surface">{s.progresso_geral}%</span>
                                <div className="w-12 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(0, s.progresso_geral))}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-2 text-center">
                              <span className="font-bold font-mono text-on-surface">
                                {s.media_notas !== null ? `${s.media_notas} pts` : '—'}
                              </span>
                            </td>

                            <td className="py-3 px-2">
                              <div className="flex flex-col gap-0.5" title={s.motivo_sugestao}>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full w-fit ${
                                  s.sugestao_ia === 'aprovado'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : s.sugestao_ia === 'reprovado'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}>
                                  <HugeiconsIcon icon={SparklesIcon} size={11} />
                                  {s.sugestao_ia}
                                </span>
                                <span className="text-[10px] text-on-surface-variant truncate max-w-[130px]">{s.motivo_sugestao}</span>
                              </div>
                            </td>

                            {/* Status Selector Buttons */}
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center p-0.5 sm:p-1 bg-surface-container-low dark:bg-slate-800 border border-outline-variant/30 dark:border-slate-700 rounded-xl gap-0.5 sm:gap-1 shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => handleStudentStatusChange(s.id, 'aprovado')}
                                  className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all flex items-center gap-1 ${
                                    isApproved
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-on-surface-variant hover:text-emerald-600'
                                  }`}
                                >
                                  <HugeiconsIcon icon={Tick01Icon} size={13} />
                                  Aprovado
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStudentStatusChange(s.id, 'reprovado')}
                                  className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all flex items-center gap-1 ${
                                    isFailed
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-on-surface-variant hover:text-rose-600'
                                  }`}
                                >
                                  <HugeiconsIcon icon={Cancel01Icon} size={13} />
                                  Reprovado
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStudentStatusChange(s.id, 'desistente')}
                                  className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all ${
                                    isDropped
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'text-on-surface-variant hover:text-amber-600'
                                  }`}
                                >
                                  Desistente
                                </button>
                              </div>
                            </td>

                            {/* Observation input */}
                            <td className="py-3 pr-4 pl-2">
                              <input
                                type="text"
                                value={s.observacao_conclusao}
                                onChange={(e) => handleStudentObservationChange(s.id, e.target.value)}
                                placeholder="Observação opcional..."
                                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low dark:bg-slate-800 border border-outline-variant/30 dark:border-slate-700 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General Class Note */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-container-low/40 dark:bg-slate-800/40 border border-outline-variant/30 dark:border-slate-700 space-y-2">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-primary" />
                  Observações Gerais da Turma (Consta na Ata Oficial)
                </label>
                <textarea
                  rows={2}
                  value={observacaoGeral}
                  onChange={(e) => setObservacaoGeral(e.target.value)}
                  placeholder="Ex: Turma dedicada, bom aproveitamento geral nas aulas de digitação e desenvolvimento prático..."
                  className="w-full p-3 rounded-xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-700 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          ) : (
            /* TAB 2: ATA OFICIAL DE CONCLUSÃO */
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-on-surface-variant">
                  Esta ata pode ser impressa ou copiada para os registros pedagógicos formais da instituição.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAta}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-high dark:bg-slate-800 border border-outline-variant/30 text-xs font-bold text-on-surface hover:bg-surface-container transition-colors shadow-xs"
                  >
                    <HugeiconsIcon icon={copiedAta ? Tick01Icon : Copy01Icon} size={16} className={copiedAta ? 'text-emerald-500' : ''} />
                    {copiedAta ? 'Ata Copiada!' : 'Copiar Texto da Ata'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintAta}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <HugeiconsIcon icon={PrinterIcon} size={16} />
                    Imprimir Ata
                  </button>
                </div>
              </div>

              {/* Printable Document Box */}
              <div className="p-4 sm:p-8 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-outline-variant/40 dark:border-slate-700 shadow-sm text-slate-800 dark:text-slate-200 font-serif leading-relaxed space-y-6">
                
                {/* Document Header */}
                <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-5 space-y-1">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-primary">Plataforma Educacional Estudea • Oxente Code</span>
                  <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white">ATA OFICIAL DE ENCERRAMENTO E CONCLUSÃO DE CURSO</h2>
                  <p className="text-xs text-slate-500 font-sans">
                    Emissão gerada em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Cohort Identification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-sans text-xs border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Turma</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{turma.nome}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Curso Vinculado</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{turma.curso_titulo || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Código de Acesso</span>
                    <strong className="font-mono text-slate-900 dark:text-white text-sm">{turma.codigo_acesso}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Status Atual</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {isAlreadyConcluded ? 'Turma Concluída' : 'Em Processo de Encerramento'}
                    </span>
                  </div>
                </div>

                {/* Stats Summary Table */}
                <div className="font-sans space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Quadro Geral de Resultados</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 text-center">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 text-[10px] block font-bold uppercase">Matriculados</span>
                      <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{summary.total}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <span className="text-emerald-600 dark:text-emerald-400 text-[10px] block font-bold uppercase">Aprovados</span>
                      <span className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300">{summary.aprovados} ({summary.taxaAprovacao}%)</span>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
                      <span className="text-rose-600 dark:text-rose-400 text-[10px] block font-bold uppercase">Reprovados</span>
                      <span className="text-base sm:text-lg font-bold text-rose-700 dark:text-rose-300">{summary.reprovados}</span>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] block font-bold uppercase">Desistentes</span>
                      <span className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300">{summary.desistentes}</span>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 text-[10px] block font-bold uppercase">Freq. Média</span>
                      <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{summary.frequenciaMedia}%</span>
                    </div>
                  </div>
                </div>

                {/* Individual Results List */}
                <div className="font-sans space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Relação Nominal dos Estudantes</h4>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse border border-slate-200 dark:border-slate-700 text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          <th className="border border-slate-200 dark:border-slate-700 p-2 text-center w-10">Nº</th>
                          <th className="border border-slate-200 dark:border-slate-700 p-2 text-left">Nome do Aluno</th>
                          <th className="border border-slate-200 dark:border-slate-700 p-2 text-center">Frequência</th>
                          <th className="border border-slate-200 dark:border-slate-700 p-2 text-center">Progresso</th>
                          <th className="border border-slate-200 dark:border-slate-700 p-2 text-center">Situação Final</th>
                          <th className="border border-slate-200 dark:border-slate-700 p-2 text-left">Observações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, index) => (
                          <tr key={s.id} className="border-b border-slate-200 dark:border-slate-800">
                            <td className="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono">{index + 1}</td>
                            <td className="border border-slate-200 dark:border-slate-700 p-2 font-semibold text-slate-900 dark:text-white">{s.nome || 'Sem nome'}</td>
                            <td className="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono">{s.frequencia}%</td>
                            <td className="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono">{s.progresso_geral}%</td>
                            <td className="border border-slate-200 dark:border-slate-700 p-2 text-center">
                              <span className={`font-bold uppercase text-[11px] ${
                                s.situacao_final === 'aprovado'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : s.situacao_final === 'reprovado'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}>
                                {s.situacao_final}
                              </span>
                            </td>
                            <td className="border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-400 text-[11px]">
                              {s.observacao_conclusao || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures Area */}
                <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row justify-around items-center gap-6 sm:gap-4 font-sans text-xs text-center">
                  <div className="border-t border-slate-400 dark:border-slate-600 pt-2 w-56">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Professor(a) / Instrutor(a)</p>
                    <p className="text-[11px] text-slate-500">Responsável Pedagógico</p>
                  </div>
                  <div className="border-t border-slate-400 dark:border-slate-600 pt-2 w-56">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Coordenação / Secretaria</p>
                    <p className="text-[11px] text-slate-500">Validação Institucional</p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-outline-variant/30 dark:border-slate-800 bg-surface-container-low/50 dark:bg-slate-800/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div>
            {isAlreadyConcluded && (
              <button
                type="button"
                onClick={() => setShowReopenConfirm(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
              >
                <HugeiconsIcon icon={RotateLeft01Icon} size={16} />
                Reabrir Turma (Voltar a Em Andamento)
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-bold text-on-surface transition-colors text-center"
            >
              Fechar
            </button>

            <button
              type="button"
              disabled={saving || students.length === 0}
              onClick={handleFinalizeCohort}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-heading font-bold text-xs hover:bg-primary/90 shadow-md hover:shadow-primary/20 transition-all disabled:opacity-50"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
              {saving ? 'Gravando Encerramento...' : isAlreadyConcluded ? 'Atualizar Resultados da Ata' : 'Finalizar e Concluir Turma'}
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Submodal: Reopen Cohort */}
      {showReopenConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <HugeiconsIcon icon={Alert01Icon} size={26} />
            </div>
            <div className="space-y-1">
              <h4 className="font-heading font-extrabold text-base text-on-surface">Deseja realmente reabrir a turma?</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Ao reabrir a turma, seu status retornará para <strong>Em Andamento</strong> e os alunos voltarão para o status acadêmico de <strong>Cursando</strong>, permitindo novas atividades e registros no diário de classe.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReopenConfirm(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleReopenCohort}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
              >
                {saving ? 'Reabrindo...' : 'Sim, Reabrir Turma'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
};
