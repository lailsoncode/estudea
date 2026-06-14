import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Tick01Icon,
  Alert01Icon,
  Task01Icon
} from '@hugeicons/core-free-icons';

interface Turma {
  id: string;
  nome: string;
}

interface Entrega {
  id: string;
  aluno_id: string;
  atividade_id: string;
  resposta: string;
  nota: number | null;
  feedback_professor: string | null;
  created_at: string;
  aluno_nome?: string;
  aluno_turma_nome?: string;
  atividade_enunciado?: string;
  atividade_tipo_entrega?: 'texto' | 'imagem' | 'quiz' | 'multipla';
  atividade_pontua?: boolean;
  atividade_permite_refazer?: boolean;
  aula_titulo?: string;
  aula_numero?: number;
  isHighPriority?: boolean;
  questoes?: any[];
}

export const CentralCorrecoes: React.FC = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(() => {
    return localStorage.getItem('selectedTurmaId') || 'todas';
  });
  const [statusFilter, setStatusFilter] = useState<'pendentes' | 'corrigidas' | 'todas'>('pendentes');
  const [searchQuery, setSearchQuery] = useState('');
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Metrics states
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [correctedCount, setCorrectedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [avgGrade, setAvgGrade] = useState<number | null>(null);

  // Correction Form States
  const [gradeInput, setGradeInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTurmas();
  }, []);

  useEffect(() => {
    fetchEntregas();
  }, [selectedTurmaId, statusFilter, searchQuery]);

  const fetchTurmas = async () => {
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome')
        .order('nome', { ascending: true });
      if (error) throw error;
      setTurmas(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar turmas:', err);
    }
  };

  const fetchEntregas = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch activities submissions
      const { data, error: queryError } = await supabase
        .from('entregas_atividades')
        .select(`
          id,
          aluno_id,
          atividade_id,
          resposta,
          nota,
          feedback_professor,
          created_at,
          profiles:aluno_id (
            id,
            nome,
            turma_id,
            turmas:turma_id (
              id,
              nome
            )
          ),
          atividades:atividade_id (
            id,
            enunciado,
            tipo_entrega,
            pontua,
            permite_refazer,
            aulas:aula_id (
              id,
              titulo,
              numero_aula,
              questoes(*)
            )
          )
        `);

      if (queryError) throw queryError;

      // 2. Format relations
      let formatted: Entrega[] = (data || []).map((item: any) => {
        const profile = item.profiles;
        const atividade = item.atividades;
        const aula = atividade?.aulas;
        const turma = profile?.turmas;

        // Mark high priority if it has been pending for more than 24 hours
        const sentDate = new Date(item.created_at);
        const timeDiff = new Date().getTime() - sentDate.getTime();
        const isHighPriority = item.nota === null && timeDiff > 86400000;

        return {
          id: item.id,
          aluno_id: item.aluno_id,
          atividade_id: item.atividade_id,
          resposta: item.resposta,
          nota: item.nota !== null ? Number(item.nota) : null,
          feedback_professor: item.feedback_professor,
          created_at: item.created_at,
          aluno_nome: profile?.nome || 'Aluno sem nome',
          aluno_turma_nome: turma?.nome || 'Sem Turma',
          atividade_enunciado: atividade?.enunciado || 'Atividade sem enunciado',
          atividade_tipo_entrega: atividade?.tipo_entrega || 'texto',
          atividade_pontua: atividade?.pontua ?? true,
          atividade_permite_refazer: atividade?.permite_refazer ?? true,
          aula_titulo: aula?.titulo || 'Aula sem título',
          aula_numero: aula?.numero_aula || 0,
          isHighPriority,
          questoes: (() => {
            const allQuestions = aula?.questoes || [];
            const isProprio = allQuestions.some((q: any) => q.atividade_id === item.atividade_id);
            return isProprio
              ? allQuestions.filter((q: any) => q.atividade_id === item.atividade_id)
              : allQuestions.filter((q: any) => !q.atividade_id && !q.para_arena);
          })()
        };
      });

      // 3. Compute overall metrics dynamically
      const total = formatted.length;
      const corrected = formatted.filter(e => e.nota !== null).length;
      const pending = total - corrected;

      // Calculate active today (unique students who submitted in the last 24h)
      const activeUsers = new Set(
        formatted
          .filter(e => {
            const timeDiff = new Date().getTime() - new Date(e.created_at).getTime();
            return timeDiff < 86400000;
          })
          .map(e => e.aluno_id)
      ).size;

      // Calculate average grade from corrected submissions
      const gradedEntries = formatted.filter(e => e.nota !== null && e.atividade_pontua);
      const avg =
        gradedEntries.length > 0
          ? gradedEntries.reduce((sum, e) => sum + (e.nota as number), 0) / gradedEntries.length
          : null;

      setTotalSubmissions(total);
      setCorrectedCount(corrected);
      setPendingCount(pending);
      setActiveToday(activeUsers);
      setAvgGrade(avg !== null ? Math.round(avg * 10) / 10 : null);

      // 4. Apply filters to list view
      // Filter by Turma
      if (selectedTurmaId !== 'todas') {
        const { data: studentsInTurma } = await supabase
          .from('profiles')
          .select('id')
          .eq('turma_id', selectedTurmaId);
        
        const studentIds = (studentsInTurma || []).map(s => s.id);
        formatted = formatted.filter(e => studentIds.includes(e.aluno_id));
      }

      // Filter by Correction Status
      if (statusFilter === 'pendentes') {
        formatted = formatted.filter(e => e.nota === null);
      } else if (statusFilter === 'corrigidas') {
        formatted = formatted.filter(e => e.nota !== null);
      }

      // Filter by Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        formatted = formatted.filter(e => 
          e.aluno_nome?.toLowerCase().includes(query) || 
          e.aula_titulo?.toLowerCase().includes(query) ||
          e.atividade_enunciado?.toLowerCase().includes(query)
        );
      }

      // Sort by newest
      formatted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEntregas(formatted);

      // Sincronizar item selecionado
      if (formatted.length > 0) {
        // Se já tinha selecionado, tenta mantê-lo ativo
        if (selectedEntrega) {
          const stillExists = formatted.find(e => e.id === selectedEntrega.id);
          if (stillExists) {
            setSelectedEntrega(stillExists);
          } else {
            setSelectedEntrega(formatted[0]);
            setGradeInput(formatted[0].nota !== null ? formatted[0].nota : 85);
            setFeedbackInput(formatted[0].feedback_professor || '');
          }
        } else {
          setSelectedEntrega(formatted[0]);
          setGradeInput(formatted[0].nota !== null ? formatted[0].nota : 85);
          setFeedbackInput(formatted[0].feedback_professor || '');
        }
      } else {
        setSelectedEntrega(null);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar entregas.');
    } finally {
      setLoading(false);
    }
  };

  const isQuestionCorrect = (q: any, answer: string) => {
    if (!answer || !answer.trim()) return false;
    
    if (q.tipo === 'aberta') {
      const keywordsStr = q.opcoes?.[1] || '';
      if (!keywordsStr.trim()) {
        return true;
      }
      
      const keywords = keywordsStr.toLowerCase().split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      const studentAnswer = answer.toLowerCase();
      
      return keywords.every((k: string) => studentAnswer.includes(k));
    }

    if (q.tipo === 'multipla_selecao') {
      const correctParts = (q.resposta_correta || '').split(';').map((p: string) => p.trim().toLowerCase()).filter((p: string) => p.length > 0).sort();
      const answerParts = answer.split(';').map((p: string) => p.trim().toLowerCase()).filter((p: string) => p.length > 0).sort();
      return correctParts.length === answerParts.length && correctParts.every((val: string, index: number) => val === answerParts[index]);
    }
    
    return answer.trim().toLowerCase() === q.resposta_correta?.trim().toLowerCase();
  };

  const selectSubmission = (entrega: Entrega) => {
    setSelectedEntrega(entrega);
    let initialGrade = 85;
    if (entrega.nota !== null) {
      initialGrade = entrega.nota;
    } else if (entrega.atividade_tipo_entrega === 'quiz') {
      try {
        const payload = JSON.parse(entrega.resposta);
        if (payload && typeof payload.score === 'number') {
          initialGrade = payload.score;
        }
      } catch (e) {
        console.error('Erro ao fazer parse da resposta do quiz:', e);
      }
    }
    setGradeInput(initialGrade);
    setFeedbackInput(entrega.feedback_professor || '');
    setSuccess(null);
    setError(null);
  };

  const handleSaveCorrection = async () => {
    if (!selectedEntrega) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const isGradedActivity = selectedEntrega.atividade_pontua ?? true;

      const { error: updateError } = await supabase
        .from('entregas_atividades')
        .update({
          nota: isGradedActivity ? gradeInput : 100,
          feedback_professor: feedbackInput.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedEntrega.id);

      if (updateError) throw updateError;

      // Register progress automatically
      const { data: atividadeData } = await supabase
        .from('atividades')
        .select('aula_id')
        .eq('id', selectedEntrega.atividade_id)
        .single();

      if (atividadeData && atividadeData.aula_id) {
        await supabase
          .from('progresso_alunos')
          .upsert({
            aluno_id: selectedEntrega.aluno_id,
            aula_id: atividadeData.aula_id,
            concluido_em: new Date().toISOString(),
          }, { onConflict: 'aluno_id,aula_id' });
      }

      if (isGradedActivity) {
        setSuccess(`Nota ${gradeInput}/100 publicada para ${selectedEntrega.aluno_nome}!`);
      } else {
        setSuccess(`Feedback e revisão concluídos para ${selectedEntrega.aluno_nome}!`);
      }
      
      // Auto advance to next pending submission if available
      const currentIndex = entregas.findIndex(e => e.id === selectedEntrega.id);
      await fetchEntregas(); // reload lists

      // Find next item
      if (entregas.length > 1) {
        const nextIndex = currentIndex < entregas.length - 1 ? currentIndex + 1 : 0;
        const nextEntrega = entregas[nextIndex];
        if (nextEntrega && nextEntrega.id !== selectedEntrega.id) {
          selectSubmission(nextEntrega);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar avaliação.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickTemplate = (text: string) => {
    setFeedbackInput(prev => {
      const separator = prev.trim() === '' ? '' : ' ';
      return prev + separator + text;
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const sentDate = new Date(dateString);
    const diffMs = now.getTime() - sentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins}m`;
    if (diffHours < 24) return `há ${diffHours}h`;
    return `há ${diffDays}d`;
  };

  const getInitials = (nome?: string) => {
    if (!nome) return 'AL';
    const parts = nome.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const isImageUrl = (url: string) => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
  };

  const navigateSubmission = (direction: 'next' | 'prev') => {
    if (!selectedEntrega || entregas.length <= 1) return;
    const currentIndex = entregas.findIndex(e => e.id === selectedEntrega.id);
    let nextIndex = currentIndex;

    if (direction === 'next') {
      nextIndex = currentIndex < entregas.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : entregas.length - 1;
    }

    selectSubmission(entregas[nextIndex]);
  };

  return (
    <div className="app-page">
      
      {/* Messages */}
      {error && (
        <div className="p-4 bg-error-container/35 border border-error/20 rounded-xl text-error text-label-md flex items-start gap-2 animate-in fade-in duration-300">
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

      {/* Header and Search/Filter Bar */}
      <header className="app-page-header">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="app-title">Central de Correções</h2>
            <p className="app-subtitle">Revise as entregas, publique notas e envie retornos eficientemente.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Turma filter dropdown */}
            <div className="relative">
              <select
                value={selectedTurmaId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTurmaId(val);
                  localStorage.setItem('selectedTurmaId', val);
                }}
                className="bg-slate-50 border border-slate-200 text-on-surface rounded-xl py-2 pl-3 pr-8 font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="todas">Todas as Turmas</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 lg:flex-initial">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar aluno ou aula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-on-surface rounded-xl py-2 pl-10 pr-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full lg:w-64"
              />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="app-card p-4 flex items-center justify-between transition-all hover:shadow-sm">
            <div>
              <p className="app-metric-label mb-1">Nota Média</p>
              <p className="app-metric-value">
                {avgGrade !== null ? (
                  <>
                    {avgGrade}
                    <span className="text-on-surface-variant text-lg font-normal">/100</span>
                  </>
                ) : (
                  <span className="text-on-surface-variant text-lg font-normal">—</span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {correctedCount > 0 ? `Baseado em ${correctedCount} correç${correctedCount === 1 ? 'ão' : 'ões'}` : 'Nenhuma nota publicada'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
              avgGrade === null ? 'bg-slate-100 text-slate-400 border-slate-200'
              : avgGrade >= 70 ? 'bg-secondary/10 text-secondary border-secondary/20'
              : avgGrade >= 50 ? 'bg-amber-50 text-amber-500 border-amber-200'
              : 'bg-error-container/30 text-error border-error/20'
            }`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          <div className="app-card p-4 flex items-center justify-between transition-all hover:shadow-sm">
            <div>
              <p className="app-metric-label mb-1">Pendentes vs Corrigidos</p>
              <p className="app-metric-value">
                {pendingCount}<span className="text-on-surface-variant text-lg font-normal">/{totalSubmissions}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-tertiary-container/10 flex items-center justify-center text-tertiary border border-tertiary/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
          </div>

          <div className="app-card p-4 flex items-center justify-between transition-all hover:shadow-sm">
            <div>
              <p className="app-metric-label mb-1">Alunos Ativos Hoje</p>
              <p className="app-metric-value">{activeToday}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => setStatusFilter('pendentes')}
            className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-all border ${
              statusFilter === 'pendentes'
                ? 'bg-primary/5 text-primary border-primary/20 font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('corrigidas')}
            className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-all border ${
              statusFilter === 'corrigidas'
                ? 'bg-primary/5 text-primary border-primary/20 font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Corrigidas ({correctedCount})
          </button>
          <button
            onClick={() => setStatusFilter('todas')}
            className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-all border ${
              statusFilter === 'todas'
                ? 'bg-primary/5 text-primary border-primary/20 font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todas ({totalSubmissions})
          </button>
        </div>
      </header>

      {/* Main Split-View Workspace */}
      <div className="flex flex-col lg:flex-row gap-6 h-[65vh] items-stretch">
        
        {/* Left Column: List of Submissions */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
            <span className="font-heading font-extrabold text-label-sm text-slate-500 uppercase tracking-wider">
              Lista de Envios
            </span>
            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-bold">
              {entregas.length} itens
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide">
            {loading && entregas.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-label-sm">Buscando envios...</p>
              </div>
            ) : entregas.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <HugeiconsIcon icon={Task01Icon} size={36} className="mx-auto text-slate-300" />
                <p className="text-body-md font-bold text-on-surface">Nenhum envio</p>
                <p className="text-label-sm">Nenhuma entrega corresponde aos filtros.</p>
              </div>
            ) : (
              entregas.map((entrega) => {
                const isSelected = selectedEntrega?.id === entrega.id;
                return (
                  <div
                    key={entrega.id}
                    onClick={() => selectSubmission(entrega)}
                    className={`p-3.5 rounded-xl transition-all cursor-pointer relative flex flex-col gap-2 border ${
                      isSelected
                        ? 'bg-primary/5 border-primary/25 shadow-sm'
                        : 'bg-white border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    {/* Active Indicator Bar */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"></div>
                    )}

                    <div className="flex items-start gap-3">
                      {/* Avatar initials */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-label-md shrink-0 shadow-inner ${
                        isSelected 
                          ? 'bg-primary text-white' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {getInitials(entrega.aluno_nome)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className="font-heading font-extrabold text-label-md text-on-surface truncate pr-2">
                            {entrega.aluno_nome}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {getRelativeTime(entrega.created_at)}
                          </span>
                        </div>
                        
                        <p className="text-body-md text-[13px] text-on-surface-variant truncate font-medium">
                          Aula {entrega.aula_numero}: {entrega.aula_titulo}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-slate-100 text-slate-500 border border-slate-200/80 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            {entrega.aluno_turma_nome}
                          </span>
                          
                          {/* Priority flag if too old and pending */}
                          {entrega.isHighPriority && (
                            <span className="ml-auto text-error flex items-center gap-0.5" title="Aguardando mais de 24h">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                              </svg>
                              <span className="text-[10px] font-bold uppercase tracking-wide">Prioridade</span>
                            </span>
                          )}

                          {entrega.nota !== null && (
                            <span className="ml-auto bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                              {entrega.nota}/100
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Submission Details & Correction Workspace */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden h-full">
          {selectedEntrega ? (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="p-5 border-b border-slate-200/80 flex justify-between items-start bg-slate-50 shrink-0">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {selectedEntrega.aluno_turma_nome}
                    </span>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Enviado em: {new Date(selectedEntrega.created_at).toLocaleDateString()} às {new Date(selectedEntrega.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-headline-md text-on-surface">
                    Aula {selectedEntrega.aula_numero}: {selectedEntrega.aula_titulo}
                  </h3>
                  <p className="text-label-md text-on-surface-variant font-medium">
                    Aluno: <span className="font-bold text-on-surface">{selectedEntrega.aluno_nome}</span>
                  </p>
                </div>

                {/* Prev / Next buttons */}
                {entregas.length > 1 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigateSubmission('prev')}
                      className="p-2 text-slate-500 hover:text-on-surface rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 bg-white"
                      title="Entrega anterior"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigateSubmission('next')}
                      className="p-2 text-slate-500 hover:text-on-surface rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 bg-white"
                      title="Próxima entrega"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Work Preview Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto space-y-6">
                  {/* Task Instructions */}
                  <div className="border-b border-slate-100 pb-4">
                    <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider mb-1">Enunciado da Atividade</p>
                    <p className="text-body-md text-slate-600 font-semibold leading-relaxed whitespace-pre-wrap">
                      {selectedEntrega.atividade_enunciado}
                    </p>
                  </div>

                  {/* Student Answer */}
                  <div>
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Resposta Enviada</p>
                      <div className="flex gap-2">
                        {selectedEntrega.atividade_tipo_entrega === 'quiz' && (
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                            selectedEntrega.atividade_pontua 
                              ? 'bg-blue-50 border-blue-200 text-blue-800' 
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}>
                            {selectedEntrega.atividade_pontua ? 'Atividade Avaliativa' : 'Atividade Formativa'}
                          </span>
                        )}
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                          selectedEntrega.atividade_permite_refazer !== false
                            ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}>
                          {selectedEntrega.atividade_permite_refazer !== false ? 'Permite Reenvio' : 'Reenvio Bloqueado'}
                        </span>
                      </div>
                    </div>
                    
                    {selectedEntrega.atividade_tipo_entrega === 'imagem' && isImageUrl(selectedEntrega.resposta) ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-[12px] text-slate-500 font-semibold truncate max-w-xs">{selectedEntrega.resposta.substring(0, 45)}...</span>
                          <a
                            href={selectedEntrega.resposta}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-label-sm"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Abrir em Nova Guia &nearr;
                          </a>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 p-2 flex justify-center shadow-inner">
                          <img
                            src={selectedEntrega.resposta}
                            alt="Solução do Aluno"
                            className="max-h-96 object-contain rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    ) : selectedEntrega.atividade_tipo_entrega === 'quiz' ? (
                      (() => {
                        try {
                          const payload = JSON.parse(selectedEntrega.resposta);
                          const correct = payload.correctCount ?? 0;
                          const total = payload.totalQuestions ?? 0;
                          const score = payload.score ?? 0;
                          const hasDefinedAnswers = selectedEntrega.questoes?.some((q: any) => q.resposta_correta && q.resposta_correta.trim() !== '');
                          const isGraded = (selectedEntrega.atividade_pontua ?? true) && hasDefinedAnswers;
                          
                          return (
                            <div className="space-y-4 text-left">
                              {/* Quiz Stats Row */}
                              {isGraded ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Sugestão de Nota</span>
                                    <span className="text-body-lg font-extrabold text-primary font-mono">{score}/100</span>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Questões Corretas</span>
                                    <span className="text-body-md font-bold text-slate-700">{correct} de {total}</span>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl col-span-2 md:col-span-1">
                                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Aproveitamento</span>
                                    <span className="text-body-md font-bold text-slate-700 font-mono">{Math.round((correct / (total || 1)) * 100)}%</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-slate-600 font-medium text-body-md">
                                  Este envio é um questionário formativo (não pontua). Nenhuma nota foi calculada pelo sistema.
                                </div>
                              )}

                              {/* Question by question analysis */}
                              <div className="space-y-3 pt-2">
                                <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Detalhamento das Respostas</p>
                                {selectedEntrega.questoes && selectedEntrega.questoes.length > 0 ? (
                                  selectedEntrega.questoes.map((q: any, qIdx: number) => {
                                    const alunoResp = payload.respostas?.[q.id] || '';
                                    const isCorrect = isGraded ? isQuestionCorrect(q, alunoResp) : false;
                                    
                                    return (
                                      <div key={q.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-2">
                                        <div className="flex justify-between items-start gap-3">
                                          <p className="font-semibold text-slate-700 text-body-md leading-relaxed flex items-start gap-1.5">
                                            <span className="text-secondary font-mono">Q{qIdx + 1}.</span>
                                            <span>{q.enunciado}</span>
                                          </p>
                                          {isGraded && (
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                                              isCorrect 
                                                ? 'bg-emerald-100 text-emerald-800' 
                                                : 'bg-error-container/20 text-error'
                                            }`}>
                                              {isCorrect ? 'Correta' : 'Incorreta'}
                                            </span>
                                          )}
                                        </div>

                                        {isGraded ? (
                                          <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-100 text-label-sm">
                                              <div>
                                                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Resposta do Aluno:</span>
                                                <p className={`font-semibold ${isCorrect ? 'text-emerald-700' : 'text-error'}`}>
                                                  {q.tipo === 'multipla_selecao' && alunoResp
                                                    ? alunoResp.split(';').join(', ')
                                                    : (alunoResp || '(Sem resposta)')}
                                                </p>
                                              </div>
                                              <div>
                                                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Gabarito Esperado:</span>
                                                <p className="font-semibold text-emerald-700">
                                                  {q.tipo === 'aberta'
                                                    ? (q.opcoes?.[0] || q.resposta_correta)
                                                    : q.tipo === 'multipla_selecao' && q.resposta_correta
                                                      ? q.resposta_correta.split(';').join(', ')
                                                      : q.resposta_correta}
                                                </p>
                                              </div>
                                            </div>

                                            {q.tipo === 'aberta' && q.opcoes?.[1] && (
                                              <div className="bg-slate-100/60 p-2.5 rounded-lg border border-slate-200/50 text-[12px] text-slate-600">
                                                <span className="font-bold text-slate-500 font-mono text-[9px] uppercase block mb-0.5">Palavras-chave exigidas pela IA para aprovação automática:</span>
                                                <span className="font-mono text-slate-700 bg-white px-2 py-1 rounded border border-slate-200/50 block mt-1">
                                                  {q.opcoes[1]}
                                                </span>
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <div className="pt-1 border-t border-slate-100 text-label-sm">
                                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Resposta do Aluno:</span>
                                            <p className="font-semibold text-slate-700">
                                              {q.tipo === 'multipla_selecao' && alunoResp
                                                ? alunoResp.split(';').join(', ')
                                                : (alunoResp || '(Sem resposta)')}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-label-md text-slate-400 font-mono">As questões associadas a esta aula não foram encontradas.</p>
                                )}
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return <p className="text-label-sm bg-slate-50 p-3 rounded border border-slate-200 text-error font-mono">Erro ao interpretar o payload do quiz do aluno.</p>;
                        }
                      })()
                    ) : selectedEntrega.atividade_tipo_entrega === 'multipla' ? (
                      (() => {
                        try {
                          const payload = JSON.parse(selectedEntrega.resposta);
                          return (
                            <div className="space-y-6">
                              {payload.texto && (
                                <div className="space-y-2 text-left">
                                  <p className="text-[11px] font-bold text-slate-450 uppercase font-mono tracking-wider">Resposta em Texto / Código</p>
                                  <div className="prose max-w-none text-body-md text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 font-sans">
                                    {payload.texto}
                                  </div>
                                </div>
                              )}
                              {payload.imagem && (
                                <div className="space-y-3 text-left">
                                  <p className="text-[11px] font-bold text-slate-450 uppercase font-mono tracking-wider">Imagem Anexada</p>
                                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[12px] text-slate-500 font-semibold truncate max-w-xs">{payload.imagem}</span>
                                    <a
                                      href={payload.imagem}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-label-sm"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Abrir em Nova Guia &nearr;
                                    </a>
                                  </div>
                                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 p-2 flex justify-center shadow-inner">
                                    <img
                                      src={payload.imagem}
                                      alt="Solução do Aluno"
                                      className="max-h-96 object-contain rounded-lg bg-white"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        } catch (e) {
                          return <p className="text-label-sm bg-slate-50 p-3 rounded border border-slate-200 text-error font-mono">Erro ao ler o envio misto do aluno.</p>;
                        }
                      })()
                    ) : (
                      <div className="prose max-w-none text-body-md text-on-surface whitespace-pre-wrap leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 font-sans">
                        {selectedEntrega.resposta}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Grading & Feedback Sticky Panel */}
              <footer className="border-t border-slate-200 bg-white p-5 shrink-0 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.03)]">
                <div className="flex flex-col xl:flex-row gap-5 max-w-5xl mx-auto">
                  {(() => {
                    const isGradedActivity = selectedEntrega.atividade_pontua ?? true;
                    return (
                      <>
                        {/* Slider Control */}
                        {isGradedActivity && (
                          <div className="xl:w-1/3 flex flex-col justify-center border-b xl:border-b-0 xl:border-r border-slate-100 pb-4 xl:pb-0 xl:pr-5">
                            <div className="flex justify-between items-end mb-2">
                              <label className="font-heading font-extrabold text-label-md text-on-surface uppercase tracking-wide">Nota Final</label>
                              <span className="font-heading font-extrabold text-headline-md text-primary">
                                {gradeInput}<span className="text-slate-400 text-lg font-normal">/100</span>
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={gradeInput}
                              onChange={(e) => setGradeInput(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                            />
                            <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-bold font-mono">
                              <span>0</span>
                              <span>50</span>
                              <span>100</span>
                            </div>
                          </div>
                        )}

                        {/* Feedback Form */}
                        <div className="flex-1 flex flex-col gap-3">
                          <textarea
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            placeholder={isGradedActivity ? "Escreva comentários sobre o envio, correções de passos ou elogios pedagógicos..." : "Escreva comentários pedagógicos ou feedback sobre as respostas do aluno..."}
                            disabled={saving}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none h-20 leading-relaxed font-sans"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            {/* Quick Templates */}
                            <div className="flex gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">Retornos rápidos:</span>
                              <button
                                type="button"
                                onClick={() => handleQuickTemplate("Excelente trabalho!")}
                                className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full font-label-sm text-[12px] border border-slate-200 hover:bg-slate-100 transition-colors"
                              >
                                Excelente Trabalho
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickTemplate("Falta detalhar melhor a resposta.")}
                                className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full font-label-sm text-[12px] border border-slate-200 hover:bg-slate-100 transition-colors"
                              >
                                Faltou Detalhe
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickTemplate("Revise o passo a passo da aula.")}
                                className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full font-label-sm text-[12px] border border-slate-200 hover:bg-slate-100 transition-colors"
                              >
                                Revisar Passo
                              </button>
                            </div>

                            {/* Save Action */}
                            <button
                              onClick={handleSaveCorrection}
                              disabled={saving}
                              className="px-6 py-2.5 rounded-xl font-heading font-bold text-label-md bg-gradient-to-b from-primary to-primary-container text-on-primary hover:opacity-95 transition-opacity shadow-sm flex items-center gap-2 ml-auto"
                            >
                              {saving ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Salvando...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                  </svg>
                                  <span>{isGradedActivity ? 'Publicar Nota' : 'Concluir Revisão'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </footer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-12 text-slate-400 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-300">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="text-body-md font-bold text-on-surface">Nenhum envio selecionado</p>
                <p className="text-label-sm">Selecione uma entrega na lista lateral esquerda para iniciar o processo de avaliação.</p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
