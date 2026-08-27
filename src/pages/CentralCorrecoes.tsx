import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Tick01Icon,
  Alert01Icon,
  Task01Icon,
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Download01Icon,
  SentIcon,
  UserGroupIcon,
  ChartHistogramIcon,
  Calendar01Icon,
  Flag01Icon,
  CheckmarkCircle02Icon,
  File01Icon
} from '@hugeicons/core-free-icons';

interface Turma {
  id: string;
  nome: string;
}

interface Entrega {
  id: string;
  aluno_id: string;
  atividade_id: string | null;
  aula_id?: string | null;
  resposta: string;
  nota: number | null;
  feedback_professor: string | null;
  created_at: string;
  aluno_nome?: string;
  aluno_turma_nome?: string;
  atividade_enunciado?: string;
  atividade_tipo_entrega?: 'texto' | 'imagem' | 'quiz' | 'multipla' | 'arquivo';
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
      let query = supabase
        .from('entregas_atividades')
        .select(`
          id,
          aluno_id,
          atividade_id,
          aula_id,
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
            aula_id,
            aulas:aula_id (
              id,
              titulo,
              numero_aula
            )
          ),
          aulas:aula_id (
            id,
            titulo,
            numero_aula
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter === 'pendentes') {
        query = query.is('nota', null);
      } else if (statusFilter === 'corrigidas') {
        query = query.not('nota', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      let formatted: Entrega[] = (data || []).map((item: any) => {
        const profile = item.profiles || {};
        const turma = profile.turmas || {};
        const atividade = item.atividades || {};
        const aulaFromAtividade = atividade.aulas || {};
        const aulaDirect = item.aulas || {};

        const aula_titulo = aulaFromAtividade.titulo || aulaDirect.titulo || 'Aula Geral';
        const aula_numero = aulaFromAtividade.numero_aula || aulaDirect.numero_aula || 1;
        const aula_id_final = item.aula_id || atividade.aula_id || null;

        const sentDate = new Date(item.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - sentDate.getTime()) / (1000 * 3600);
        const isHighPriority = item.nota === null && diffHours >= 24;

        return {
          id: item.id,
          aluno_id: item.aluno_id,
          atividade_id: item.atividade_id,
          aula_id: aula_id_final,
          resposta: item.resposta,
          nota: item.nota,
          feedback_professor: item.feedback_professor,
          created_at: item.created_at,
          aluno_nome: profile.nome || 'Estudante',
          aluno_turma_nome: turma.nome || 'Sem Turma',
          turma_id: profile.turma_id || null,
          atividade_enunciado: atividade.enunciado || 'Avaliação da Aula / Questionário Geral',
          atividade_tipo_entrega: item.atividade_id ? (atividade.tipo_entrega || 'texto') : 'quiz',
          atividade_pontua: item.atividade_id ? (atividade.pontua ?? true) : true,
          atividade_permite_refazer: atividade.permite_refazer ?? true,
          aula_titulo,
          aula_numero,
          isHighPriority
        };
      });

      if (selectedTurmaId === 'sem_turma') {
        formatted = formatted.filter(e => !e.aluno_turma_nome || e.aluno_turma_nome === 'Sem Turma');
      } else if (selectedTurmaId !== 'todas') {
        const turmaObj = turmas.find(t => t.id === selectedTurmaId);
        if (turmaObj) {
          formatted = formatted.filter(e => e.aluno_turma_nome === turmaObj.nome);
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        formatted = formatted.filter(e =>
          (e.aluno_nome && e.aluno_nome.toLowerCase().includes(q)) ||
          (e.aula_titulo && e.aula_titulo.toLowerCase().includes(q))
        );
      }

      // Fetch questions for quizzes
      const quizAulasIds = Array.from(new Set(formatted.filter(e => e.atividade_tipo_entrega === 'quiz' && e.aula_id).map(e => e.aula_id!)));
      let questionsMap = new Map<string, any[]>();
      if (quizAulasIds.length > 0) {
        const { data: questoesData } = await supabase
          .from('questoes')
          .select('*')
          .in('aula_id', quizAulasIds);

        if (questoesData) {
          questoesData.forEach((q: any) => {
            const current = questionsMap.get(q.aula_id) || [];
            current.push(q);
            questionsMap.set(q.aula_id, current);
          });
        }
      }

      formatted = formatted.map(item => {
        if (item.atividade_tipo_entrega === 'quiz' && item.aula_id) {
          let questionsForThis = questionsMap.get(item.aula_id) || [];
          if (item.atividade_id) {
            const specificQuestions = questionsForThis.filter(q => q.atividade_id === item.atividade_id);
            if (specificQuestions.length > 0) {
              questionsForThis = specificQuestions;
            }
          }
          return {
            ...item,
            questoes: questionsForThis
          };
        }
        return item;
      });

      setEntregas(formatted);

      // Calculate HUD metrics
      const { data: allData } = await supabase
        .from('entregas_atividades')
        .select('nota, created_at');

      if (allData) {
        setTotalSubmissions(allData.length);
        const corrected = allData.filter(d => d.nota !== null);
        setCorrectedCount(corrected.length);
        setPendingCount(allData.filter(d => d.nota === null).length);

        if (corrected.length > 0) {
          const totalGrade = corrected.reduce((acc, curr) => acc + (curr.nota || 0), 0);
          setAvgGrade(Math.round(totalGrade / corrected.length));
        } else {
          setAvgGrade(null);
        }

        const today = new Date().toISOString().slice(0, 10);
        const active = allData.filter(d => d.created_at && d.created_at.startsWith(today)).length;
        setActiveToday(active);
      }

      if (formatted.length > 0) {
        if (!selectedEntrega || !formatted.some(e => e.id === selectedEntrega.id)) {
          selectSubmission(formatted[0]);
        }
      } else {
        setSelectedEntrega(null);
      }

    } catch (err: any) {
      console.error('Erro ao buscar entregas:', err);
      setError(err.message || 'Falha ao carregar entregas.');
    } finally {
      setLoading(false);
    }
  };

  const isQuestionCorrect = (q: any, alunoResp: string) => {
    if (!alunoResp) return false;
    const gabarito = (q.resposta_correta || '').trim().toLowerCase();
    const resp = alunoResp.trim().toLowerCase();

    if (q.tipo === 'multipla_escolha' || q.tipo === 'verdadeiro_falso') {
      return resp === gabarito;
    }

    if (q.tipo === 'multipla_selecao') {
      const respSet = new Set(resp.split(';').map((s: string) => s.trim()).filter(Boolean));
      const gabSet = new Set(gabarito.split(';').map((s: string) => s.trim()).filter(Boolean));
      if (respSet.size !== gabSet.size) return false;
      for (const item of respSet) {
        if (!gabSet.has(item)) return false;
      }
      return true;
    }

    if (q.tipo === 'aberta') {
      if (gabarito && resp.includes(gabarito)) return true;
      const keyWordsRaw = q.opcoes?.[1] || '';
      if (keyWordsRaw) {
        const keywords = keyWordsRaw.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
        if (keywords.length > 0) {
          const matchCount = keywords.filter((k: string) => resp.includes(k)).length;
          return matchCount >= Math.ceil(keywords.length * 0.5);
        }
      }
      return resp.length > 10;
    }

    return resp === gabarito;
  };

  const getCleanFilename = (url: string) => {
    if (!url) return '';
    try {
      const parts = url.split('/');
      const rawName = parts[parts.length - 1] || 'arquivo';
      const cleanName = rawName.replace(/^[0-9a-fA-F-]{36}-?[0-9]*-?/, '');
      return decodeURIComponent(cleanName);
    } catch {
      return 'arquivo_anexo';
    }
  };

  const selectSubmission = (entrega: Entrega) => {
    setSelectedEntrega(entrega);
    if (entrega.nota !== null) {
      setGradeInput(entrega.nota);
    } else {
      if (entrega.atividade_tipo_entrega === 'quiz') {
        try {
          const payload = JSON.parse(entrega.resposta);
          if (payload && typeof payload.score === 'number') {
            setGradeInput(payload.score);
          } else {
            setGradeInput(85);
          }
        } catch {
          setGradeInput(85);
        }
      } else {
        setGradeInput(85);
      }
    }
    setFeedbackInput(entrega.feedback_professor || '');
    setError(null);
    setSuccess(null);
  };

  const handleSaveCorrection = async () => {
    if (!selectedEntrega) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const isGradedActivity = selectedEntrega.atividade_pontua ?? true;
      const finalGrade = isGradedActivity ? gradeInput : null;

      const { error: updateError } = await supabase
        .from('entregas_atividades')
        .update({
          nota: finalGrade,
          feedback_professor: feedbackInput.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEntrega.id);

      if (updateError) throw updateError;

      let aulaId = selectedEntrega.aula_id;
      if (!aulaId && selectedEntrega.atividade_id) {
        const { data: atividadeData } = await supabase
          .from('atividades')
          .select('aula_id')
          .eq('id', selectedEntrega.atividade_id)
          .single();
        if (atividadeData) {
          aulaId = atividadeData.aula_id;
        }
      }

      if (aulaId) {
        await supabase
          .from('progresso_alunos')
          .upsert({
            aluno_id: selectedEntrega.aluno_id,
            aula_id: aulaId,
            concluido_em: new Date().toISOString(),
          }, { onConflict: 'aluno_id,aula_id' });
      }

      if (isGradedActivity) {
        setSuccess(`Nota ${gradeInput}/100 publicada para ${selectedEntrega.aluno_nome}!`);
      } else {
        setSuccess(`Feedback e revisão concluídos para ${selectedEntrega.aluno_nome}!`);
      }

      const currentIndex = entregas.findIndex(e => e.id === selectedEntrega.id);
      await fetchEntregas();

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
    <div className="product-page max-w-7xl mx-auto relative animate-fade-in pb-10">
      
      {/* Messages */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-product-control text-error font-medium text-sm flex items-start gap-2.5 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Alert01Icon} size={20} className="mt-0.5 shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-product-control text-emerald-700 dark:text-emerald-300 font-medium text-sm flex items-start gap-2.5 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Tick01Icon} size={20} className="mt-0.5 shrink-0" strokeWidth={2} />
          <span>{success}</span>
        </div>
      )}

      {/* Header */}
      <header className="product-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <span className="product-section-kicker">Avaliação & Ensino</span>
              <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">Central de Correções</h1>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                Revise as entregas dos alunos, publique notas e forneça retornos pedagógicos com agilidade.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <HugeiconsIcon icon={Task01Icon} size={15} strokeWidth={2} />
              {pendingCount} {pendingCount === 1 ? 'pendência' : 'pendências'}
            </span>
          </div>
        </div>
      </header>

      {/* Metrics HUD */}
      <section aria-label="Resumo das correções" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control ${
            avgGrade === null 
              ? 'bg-surface-container-high text-on-surface-variant'
              : avgGrade >= 70 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                : avgGrade >= 50 
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' 
                  : 'bg-error/10 text-error'
          }`}>
            <HugeiconsIcon icon={ChartHistogramIcon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Nota Média</span>
            <strong className="product-metric-value">
              {avgGrade !== null ? (
                <>
                  {avgGrade}<span className="text-sm font-semibold text-on-surface-variant">/100</span>
                </>
              ) : '—'}
            </strong>
            <span className="block truncate text-[10px] font-semibold text-on-surface-variant">
              {correctedCount > 0 ? `${correctedCount} correç${correctedCount === 1 ? 'ão' : 'ões'}` : 'Sem notas'}
            </span>
          </div>
        </div>

        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control ${
            pendingCount > 0 ? 'bg-error/10 text-error' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          }`}>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Pendentes vs Total</span>
            <strong className="product-metric-value">
              {pendingCount}<span className="text-sm font-semibold text-on-surface-variant">/{totalSubmissions}</span>
            </strong>
            <span className={`block truncate text-[10px] font-semibold ${pendingCount > 0 ? 'text-error' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {pendingCount > 0 ? `${pendingCount} aguardando correção` : 'Tudo corrigido!'}
            </span>
          </div>
        </div>

        <div className="product-metric sm:min-h-[86px] sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserGroupIcon} size={21} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="product-metric-label">Envios Hoje</span>
            <strong className="product-metric-value">{activeToday}</strong>
            <span className="block truncate text-[10px] font-semibold text-on-surface-variant">
              Recebidos nas últimas 24h
            </span>
          </div>
        </div>
      </section>

      {/* Toolbar: Search & Quick Filters */}
      <div className="product-toolbar" aria-label="Filtros de correções">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('pendentes')}
              className={`px-3.5 py-1.5 rounded-product-control text-xs font-bold transition-all border ${
                statusFilter === 'pendentes'
                  ? 'border-primary/25 bg-primary/10 text-primary shadow-sm'
                  : 'border-outline-variant/70 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('corrigidas')}
              className={`px-3.5 py-1.5 rounded-product-control text-xs font-bold transition-all border ${
                statusFilter === 'corrigidas'
                  ? 'border-primary/25 bg-primary/10 text-primary shadow-sm'
                  : 'border-outline-variant/70 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              Corrigidas ({correctedCount})
            </button>
            <button
              onClick={() => setStatusFilter('todas')}
              className={`px-3.5 py-1.5 rounded-product-control text-xs font-bold transition-all border ${
                statusFilter === 'todas'
                  ? 'border-primary/25 bg-primary/10 text-primary shadow-sm'
                  : 'border-outline-variant/70 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              Todas ({totalSubmissions})
            </button>
          </div>

          {/* Search & Turma Select */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-56">
              <select
                value={selectedTurmaId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTurmaId(val);
                  localStorage.setItem('selectedTurmaId', val);
                }}
                className="product-control py-2 text-xs"
              >
                <option value="todas">Todas as Turmas</option>
                <option value="sem_turma">Alunos Sem Turma</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Buscar aluno ou aula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="product-control pl-10 pr-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Split-View Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: List of Submissions (4 cols on lg) */}
        <div className="lg:col-span-4 product-card flex flex-col overflow-hidden h-[750px]">
          <div className="p-4 border-b border-outline-variant/70 flex justify-between items-center bg-surface-container-low/50">
            <span className="font-heading text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">
              Fila de Envios
            </span>
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
              {entregas.length} itens
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {loading && entregas.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-medium">Buscando envios...</p>
              </div>
            ) : entregas.length === 0 ? (
              <div className="product-empty-state my-6">
                <HugeiconsIcon icon={Task01Icon} size={32} className="text-primary mb-2" />
                <p className="font-heading text-sm font-extrabold text-on-surface">Nenhum envio encontrado</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Nenhuma entrega corresponde aos filtros atuais.</p>
              </div>
            ) : (
              entregas.map((entrega) => {
                const isSelected = selectedEntrega?.id === entrega.id;
                return (
                  <button
                    key={entrega.id}
                    type="button"
                    onClick={() => selectSubmission(entrega)}
                    className={`w-full text-left p-3 rounded-product-control transition-all duration-200 relative flex flex-col gap-2 border ${
                      isSelected
                        ? 'border-primary/40 bg-primary/10 shadow-sm'
                        : 'border-outline-variant/70 bg-surface-container-lowest hover:border-primary/20 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar initials */}
                      <div className={`w-9 h-9 rounded-product-control flex items-center justify-center font-heading font-extrabold text-xs shrink-0 shadow-inner ${
                        isSelected 
                          ? 'bg-primary text-white' 
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {getInitials(entrega.aluno_nome)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className="font-heading font-extrabold text-xs text-on-surface truncate pr-2">
                            {entrega.aluno_nome}
                          </h4>
                          <span className="text-[10px] text-on-surface-variant font-medium shrink-0">
                            {getRelativeTime(entrega.created_at)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-on-surface-variant truncate font-medium">
                          Aula {entrega.aula_numero}: {entrega.aula_titulo}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                            {entrega.aluno_turma_nome}
                          </span>
                          
                          {entrega.isHighPriority && (
                            <span className="ml-auto inline-flex items-center gap-1 text-error text-[10px] font-bold uppercase tracking-wider" title="Aguardando mais de 24h">
                              <HugeiconsIcon icon={Flag01Icon} size={12} strokeWidth={2} />
                              Prioridade
                            </span>
                          )}

                          {entrega.nota !== null && (
                            <span className="ml-auto rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold px-1.5 py-0.5">
                              {entrega.nota}/100
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Submission Details & Correction Workspace (8 cols on lg) */}
        <div className="lg:col-span-8 product-card flex flex-col overflow-hidden h-[750px]">
          {selectedEntrega ? (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="p-4 sm:p-5 border-b border-outline-variant/70 flex justify-between items-start bg-surface-container-low/40 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                      {selectedEntrega.aluno_turma_nome}
                    </span>
                    <span className="text-on-surface-variant text-xs flex items-center gap-1">
                      <HugeiconsIcon icon={Calendar01Icon} size={13} strokeWidth={2} />
                      Enviado em {new Date(selectedEntrega.created_at).toLocaleDateString()} às {new Date(selectedEntrega.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-extrabold text-on-surface">
                    Aula {selectedEntrega.aula_numero}: {selectedEntrega.aula_titulo}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Estudante: <strong className="text-on-surface">{selectedEntrega.aluno_nome}</strong>
                  </p>
                </div>

                {/* Prev / Next buttons */}
                {entregas.length > 1 && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigateSubmission('prev')}
                      className="product-icon-action border border-outline-variant/70 bg-surface-container-lowest shadow-sm"
                      title="Entrega anterior"
                      aria-label="Entrega anterior"
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => navigateSubmission('next')}
                      className="product-icon-action border border-outline-variant/70 bg-surface-container-lowest shadow-sm"
                      title="Próxima entrega"
                      aria-label="Próxima entrega"
                    >
                      <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Work Preview Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-surface-container-lowest">
                <div className="space-y-5 max-w-3xl">
                  {/* Task Instructions */}
                  <div className="rounded-product-control border border-outline-variant/70 bg-surface-container-low p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant mb-1">Enunciado da Atividade</p>
                    <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedEntrega.atividade_enunciado}
                    </p>
                  </div>

                  {/* Student Answer Container */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">Resposta do Estudante</p>
                      <div className="flex gap-2">
                        {selectedEntrega.atividade_tipo_entrega === 'quiz' && (
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            selectedEntrega.atividade_pontua 
                              ? 'bg-primary/10 border-primary/25 text-primary' 
                              : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300'
                          }`}>
                            {selectedEntrega.atividade_pontua ? 'Atividade Avaliativa' : 'Atividade Formativa'}
                          </span>
                        )}
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          selectedEntrega.atividade_permite_refazer !== false
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300'
                        }`}>
                          {selectedEntrega.atividade_permite_refazer !== false ? 'Permite Reenvio' : 'Reenvio Bloqueado'}
                        </span>
                      </div>
                    </div>
                    
                    {selectedEntrega.atividade_tipo_entrega === 'imagem' && isImageUrl(selectedEntrega.resposta) ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center rounded-product-control border border-outline-variant/70 bg-surface-container-low p-3">
                          <span className="text-xs text-on-surface-variant font-semibold truncate max-w-xs">{selectedEntrega.resposta.substring(0, 45)}...</span>
                          <a
                            href={selectedEntrega.resposta}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs"
                          >
                            <HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={2} />
                            Abrir em Nova Guia ↗
                          </a>
                        </div>
                        {(selectedEntrega.resposta.match(/\.(jpeg|jpg|gif|png|webp)/i) || selectedEntrega.resposta.includes('atividades')) ? (
                          <div className="rounded-product-card border border-outline-variant/70 overflow-hidden bg-black/40 p-2 flex justify-center shadow-inner">
                            <img
                              src={selectedEntrega.resposta}
                              alt="Solução do Aluno"
                              className="max-h-96 object-contain rounded-product-control bg-white"
                            />
                          </div>
                        ) : (
                          <div className="product-empty-state">
                            <HugeiconsIcon icon={File01Icon} size={28} className="text-primary mb-1" />
                            <p className="text-xs">Este anexo não é uma imagem visualizável diretamente. Clique no link acima para fazer download.</p>
                          </div>
                        )}
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
                                  <div className="product-metric">
                                    <div className="min-w-0">
                                      <span className="product-metric-label">Sugestão de Nota</span>
                                      <strong className="product-metric-value text-primary font-mono">{score}/100</strong>
                                    </div>
                                  </div>
                                  <div className="product-metric">
                                    <div className="min-w-0">
                                      <span className="product-metric-label">Acertos</span>
                                      <strong className="product-metric-value font-mono">{correct} de {total}</strong>
                                    </div>
                                  </div>
                                  <div className="product-metric col-span-2 md:col-span-1">
                                    <div className="min-w-0">
                                      <span className="product-metric-label">Aproveitamento</span>
                                      <strong className="product-metric-value font-mono">{Math.round((correct / (total || 1)) * 100)}%</strong>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-product-control border border-outline-variant/70 bg-surface-container-low p-3.5 text-on-surface-variant text-xs font-medium">
                                  Este envio é um questionário formativo (não pontua). Nenhuma nota foi calculada pelo sistema.
                                </div>
                              )}

                              {/* Question by question analysis */}
                              <div className="space-y-3 pt-2">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">Detalhamento das Questões</p>
                                {selectedEntrega.questoes && selectedEntrega.questoes.length > 0 ? (
                                  selectedEntrega.questoes.map((q: any, qIdx: number) => {
                                    const alunoResp = payload.respostas?.[q.id] || '';
                                    const isCorrect = isGraded ? isQuestionCorrect(q, alunoResp) : false;
                                    
                                    return (
                                      <div key={q.id} className="p-3.5 rounded-product-control border border-outline-variant/70 bg-surface-container-low space-y-2">
                                        <div className="flex justify-between items-start gap-3">
                                          <p className="font-semibold text-on-surface text-xs leading-relaxed flex items-start gap-1.5">
                                            <span className="text-secondary font-mono font-bold">Q{qIdx + 1}.</span>
                                            <span>{q.enunciado}</span>
                                          </p>
                                          {isGraded && (
                                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                              isCorrect 
                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' 
                                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                            }`}>
                                              {isCorrect ? 'Correta' : 'Incorreta'}
                                            </span>
                                          )}
                                        </div>

                                        {isGraded ? (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-outline-variant/50 text-xs">
                                            <div>
                                              <span className="text-[10px] text-on-surface-variant font-mono font-bold uppercase block">Resposta do Aluno:</span>
                                              <p className={`font-semibold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-error'}`}>
                                                {q.tipo === 'multipla_selecao' && alunoResp
                                                  ? alunoResp.split(';').join(', ')
                                                  : (alunoResp || '(Sem resposta)')}
                                              </p>
                                            </div>
                                            <div>
                                              <span className="text-[10px] text-on-surface-variant font-mono font-bold uppercase block">Gabarito Esperado:</span>
                                              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                {q.tipo === 'aberta'
                                                  ? (q.opcoes?.[0] || q.resposta_correta)
                                                  : q.tipo === 'multipla_selecao' && q.resposta_correta
                                                    ? q.resposta_correta.split(';').join(', ')
                                                    : q.resposta_correta}
                                              </p>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="pt-1 border-t border-outline-variant/50 text-xs">
                                            <span className="text-[10px] text-on-surface-variant font-mono font-bold uppercase block">Resposta do Aluno:</span>
                                            <p className="font-semibold text-on-surface">
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
                                  <p className="text-xs text-on-surface-variant font-mono">As questões associadas a esta aula não foram encontradas.</p>
                                )}
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return <p className="text-xs bg-error/10 p-3 rounded-product-control border border-error/20 text-error font-mono">Erro ao interpretar o payload do quiz do aluno.</p>;
                        }
                      })()
                    ) : selectedEntrega.atividade_tipo_entrega === 'arquivo' ? (
                      <div className="space-y-3 text-left">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 rounded-product-control border border-outline-variant/70 bg-surface-container-low p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-product-control bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <HugeiconsIcon icon={File01Icon} size={22} strokeWidth={2} />
                            </div>
                            <div className="text-left overflow-hidden">
                              <span className="text-xs font-bold text-on-surface block">Arquivo Enviado pelo Estudante</span>
                              <span className="text-[11px] text-on-surface-variant font-mono truncate max-w-xs sm:max-w-sm block" title={selectedEntrega.resposta}>{getCleanFilename(selectedEntrega.resposta)}</span>
                            </div>
                          </div>
                          <a
                            href={selectedEntrega.resposta}
                            target="_blank"
                            rel="noreferrer"
                            className="product-primary-action text-xs"
                          >
                            <HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={2} />
                            Download / Abrir ↗
                          </a>
                        </div>
                      </div>
                    ) : selectedEntrega.atividade_tipo_entrega === 'multipla' ? (
                      (() => {
                        try {
                          const payload = JSON.parse(selectedEntrega.resposta);
                          return (
                            <div className="space-y-4">
                              {payload.texto && (
                                <div className="space-y-1 text-left">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">Resposta em Texto</p>
                                  <div className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed bg-surface-container-low p-4 rounded-product-control border border-outline-variant/70">
                                    {payload.texto}
                                  </div>
                                </div>
                              )}
                              {payload.imagem && (
                                <div className="space-y-2 text-left">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">Anexo Enviado</p>
                                  <div className="flex justify-between items-center bg-surface-container-low p-3 rounded-product-control border border-outline-variant/70">
                                    <span className="text-xs text-on-surface-variant font-semibold truncate max-w-xs" title={payload.imagem}>{getCleanFilename(payload.imagem)}</span>
                                    <a
                                      href={payload.imagem}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs"
                                    >
                                      <HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={2} />
                                      Abrir em Nova Guia ↗
                                    </a>
                                  </div>
                                  {(payload.imagem.match(/\.(jpeg|jpg|gif|png|webp)/i) || payload.imagem.includes('atividades')) ? (
                                    <div className="rounded-product-card border border-outline-variant/70 overflow-hidden bg-black/40 p-2 flex justify-center shadow-inner">
                                      <img
                                        src={payload.imagem}
                                        alt="Solução do Aluno"
                                        className="max-h-96 object-contain rounded-product-control bg-white"
                                      />
                                    </div>
                                  ) : (
                                    <div className="product-empty-state">
                                      <HugeiconsIcon icon={File01Icon} size={28} className="text-primary mb-1" />
                                      <p className="text-xs">Este anexo não é uma imagem visualizável diretamente.</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        } catch (e) {
                          return <p className="text-xs bg-error/10 p-3 rounded-product-control border border-error/20 text-error font-mono">Erro ao ler o envio misto do aluno.</p>;
                        }
                      })()
                    ) : (
                      <div className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed bg-surface-container-low p-4 rounded-product-control border border-outline-variant/70">
                        {selectedEntrega.resposta}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Grading & Feedback Sticky Footer */}
              <footer className="border-t border-outline-variant/70 bg-surface-container-low/60 p-4 shrink-0">
                <div className="flex flex-col lg:flex-row gap-4 max-w-4xl mx-auto items-stretch">
                  {(() => {
                    const isGradedActivity = selectedEntrega.atividade_pontua ?? true;
                    let calculatedScore: number | null = null;
                    if (selectedEntrega.atividade_tipo_entrega === 'quiz') {
                      try {
                        const payload = JSON.parse(selectedEntrega.resposta);
                        if (payload && typeof payload.score === 'number') {
                          calculatedScore = payload.score;
                        }
                      } catch (e) {}
                    }

                    return (
                      <>
                        {/* Grade Range Input */}
                        {isGradedActivity && (
                          <div className="lg:w-1/4 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-outline-variant/70 pb-3 lg:pb-0 lg:pr-4 shrink-0">
                            <div className="flex justify-between items-end mb-1">
                              <label className="font-heading font-extrabold text-[11px] text-on-surface uppercase tracking-wide">Nota Final</label>
                              <span className="font-heading font-extrabold text-lg text-primary">
                                {gradeInput}<span className="text-on-surface-variant text-xs font-normal">/100</span>
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={gradeInput}
                              onChange={(e) => setGradeInput(Number(e.target.value))}
                              className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary focus:outline-none"
                            />
                            <div className="flex justify-between mt-1 text-[9px] text-on-surface-variant font-bold font-mono">
                              <span>0</span>
                              <span>50</span>
                              <span>100</span>
                            </div>
                            {calculatedScore !== null && gradeInput !== calculatedScore && (
                              <button
                                type="button"
                                onClick={() => setGradeInput(calculatedScore!)}
                                className="text-[10px] text-primary hover:underline font-bold text-left mt-1"
                              >
                                Usar quiz: {calculatedScore}/100
                              </button>
                            )}
                          </div>
                        )}

                        {/* Feedback Textarea & Action */}
                        <div className="flex-1 flex flex-col gap-2">
                          <textarea
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            placeholder={isGradedActivity ? "Escreva comentários pedagógicos, elogios ou orientações..." : "Escreva observações ou feedback sobre o questionário..."}
                            disabled={saving}
                            className="product-control resize-none h-16 text-xs leading-relaxed"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Quick chip responses */}
                            <div className="flex gap-1 flex-wrap items-center">
                              <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider self-center mr-1">Sugestões:</span>
                              <button
                                type="button"
                                onClick={() => handleQuickTemplate("Excelente trabalho!")}
                                className="rounded-full border border-outline-variant/70 bg-surface-container-lowest px-2.5 py-0.5 text-[10px] font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                              >
                                Excelente
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickTemplate("Falta detalhar melhor a resposta.")}
                                className="rounded-full border border-outline-variant/70 bg-surface-container-lowest px-2.5 py-0.5 text-[10px] font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                              >
                                Faltou Detalhe
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickTemplate("Revise o passo a passo da aula.")}
                                className="rounded-full border border-outline-variant/70 bg-surface-container-lowest px-2.5 py-0.5 text-[10px] font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                              >
                                Revisar Passo
                              </button>
                            </div>

                            {/* Publish action button */}
                            <button
                              onClick={handleSaveCorrection}
                              disabled={saving}
                              className="product-primary-action text-xs ml-auto"
                            >
                              {saving ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Salvando...</span>
                                </>
                              ) : (
                                <>
                                  <HugeiconsIcon icon={SentIcon} size={15} strokeWidth={2} />
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
            <div className="product-empty-state my-auto mx-auto p-12">
              <HugeiconsIcon icon={Task01Icon} size={36} className="text-primary mb-2" />
              <p className="font-heading text-sm font-extrabold text-on-surface">Nenhum envio selecionado</p>
              <p className="text-xs text-on-surface-variant mt-0.5 max-w-xs text-center">
                Selecione uma entrega na lista lateral para visualizar os detalhes e avaliar.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
