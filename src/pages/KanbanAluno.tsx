import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Task01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  LinkSquare01Icon,
  Edit01Icon,
  Delete01Icon,
  Search01Icon,
  PlusSignIcon,
  FireIcon,
  CheckListIcon
} from '@hugeicons/core-free-icons';

interface KanbanAlunoProps {
  session: Session;
}

export interface KanbanChecklistItem {
  id: string;
  texto: string;
  concluido: boolean;
}

export interface KanbanTarefa {
  id: string;
  aluno_id?: string;
  coluna_id: 'todo' | 'in_progress' | 'review' | 'done';
  titulo: string;
  descricao?: string | null;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  tag: 'estudos' | 'exercicios' | 'pi' | 'revisao' | 'prova' | 'geral';
  prazo?: string | null;
  checklist: KanbanChecklistItem[];
  link_url?: string | null;
  ordem: number;
  created_at?: string;
  updated_at?: string;
}

interface ColunaDef {
  id: 'todo' | 'in_progress' | 'review' | 'done';
  titulo: string;
  subtitulo: string;
  icone: string;
  corBorda: string;
  corBadge: string;
  corBg: string;
  corTexto: string;
}

const COLUNAS: ColunaDef[] = [
  {
    id: 'todo',
    titulo: 'A Fazer',
    subtitulo: 'Para Iniciar',
    icone: '📌',
    corBorda: 'border-sky-500/50 dark:border-sky-400/40',
    corBadge: 'bg-sky-500 text-white',
    corBg: 'bg-sky-500/5',
    corTexto: 'text-sky-700 dark:text-sky-400'
  },
  {
    id: 'in_progress',
    titulo: 'Em Andamento',
    subtitulo: 'Estudando Agora',
    icone: '⚡',
    corBorda: 'border-amber-500/50 dark:border-amber-400/40',
    corBadge: 'bg-amber-500 text-white',
    corBg: 'bg-amber-500/5',
    corTexto: 'text-amber-700 dark:text-amber-400'
  },
  {
    id: 'review',
    titulo: 'Dúvidas & Revisão',
    subtitulo: 'Aguardando Ajuda',
    icone: '❓',
    corBorda: 'border-purple-500/50 dark:border-purple-400/40',
    corBadge: 'bg-purple-500 text-white',
    corBg: 'bg-purple-500/5',
    corTexto: 'text-purple-700 dark:text-purple-400'
  },
  {
    id: 'done',
    titulo: 'Concluído',
    subtitulo: 'Finalizado com Sucesso',
    icone: '✅',
    corBorda: 'border-emerald-500/50 dark:border-emerald-400/40',
    corBadge: 'bg-emerald-500 text-white',
    corBg: 'bg-emerald-500/5',
    corTexto: 'text-emerald-700 dark:text-emerald-400'
  }
];

const PRIORIDADES = {
  baixa: { label: 'Baixa', cor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-500' },
  media: { label: 'Média', cor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/40', dot: 'bg-sky-500' },
  alta: { label: 'Alta', cor: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/40', dot: 'bg-orange-500' },
  urgente: { label: 'Urgente', cor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40', dot: 'bg-rose-500 animate-pulse' }
};

const TAGS = {
  estudos: { label: 'Aulas & Teoria', cor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/40', emoji: '📚' },
  exercicios: { label: 'Exercícios', cor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40', emoji: '✏️' },
  pi: { label: 'Projeto Integrador', cor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/40', emoji: '🚀' },
  revisao: { label: 'Revisão', cor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40', emoji: '🔍' },
  prova: { label: 'Avaliação / Prova', cor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40', emoji: '📝' },
  geral: { label: 'Geral', cor: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/40', emoji: '📌' }
};

export const KanbanAluno: React.FC<KanbanAlunoProps> = ({ session }) => {
  const userId = session?.user?.id;

  // Task list state
  const [tarefas, setTarefas] = useState<KanbanTarefa[]>(() => {
    if (!userId) return [];
    try {
      const cached = localStorage.getItem(`estudea_kanban_cache_${userId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [syncStatus, setSyncStatus] = useState<'loading' | 'ready' | 'offline'>('loading');

  // Inline fast add state per column
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');

  // Edit / Details Modal State
  const [editingTask, setEditingTask] = useState<KanbanTarefa | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Sync to local cache
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`estudea_kanban_cache_${userId}`, JSON.stringify(tarefas));
    }
  }, [tarefas, userId]);

  useEffect(() => {
    if (!isModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  const fetchTarefas = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('kanban_tarefas')
        .select('*')
        .eq('aluno_id', userId)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const formatted: KanbanTarefa[] = data.map(item => ({
          ...item,
          checklist: Array.isArray(item.checklist) ? item.checklist : []
        }));
        setTarefas(formatted);
      }
      setSyncStatus('ready');
    } catch (err: unknown) {
      console.error('Erro ao buscar tarefas do Kanban:', err instanceof Error ? err.message : err);
      setSyncStatus('offline');
      // Fallback sample tasks on fresh start if table is completely empty
      const initialSamples: KanbanTarefa[] = [
          {
            id: 'sample-1',
            aluno_id: userId,
            coluna_id: 'todo',
            titulo: 'Revisar conteúdo da Aula 04 de Informática',
            descricao: 'Revisar os slides sobre periféricos de entrada e saída.',
            prioridade: 'media',
            tag: 'estudos',
            checklist: [
              { id: 'c1', texto: 'Ler slides 1 a 15', concluido: true },
              { id: 'c2', texto: 'Fazer o quiz de fixação', concluido: false }
            ],
            ordem: 0
          },
          {
            id: 'sample-2',
            aluno_id: userId,
            coluna_id: 'in_progress',
            titulo: 'Praticar no Treino de Digitação (Meta: 40 WPM)',
            descricao: 'Fazer 10 minutos de prática diária no Treinador Pro.',
            prioridade: 'alta',
            tag: 'exercicios',
            checklist: [],
            ordem: 1
          },
          {
            id: 'sample-3',
            aluno_id: userId,
            coluna_id: 'done',
            titulo: 'Concluir cadastro no Estudea',
            descricao: 'Perfil configurado com sucesso.',
            prioridade: 'baixa',
            tag: 'geral',
            checklist: [],
            ordem: 2
          }
      ];
      setTarefas(current => current.length === 0 ? initialSamples : current);
    }
  }, [userId]);

  // Fetch tasks from Supabase
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTarefas();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchTarefas]);

  // 1-Click Fast Inline Add
  const handleQuickAdd = async (colunaId: 'todo' | 'in_progress' | 'review' | 'done') => {
    if (!quickAddTitle.trim() || !userId) return;

    const newTask: KanbanTarefa = {
      id: crypto.randomUUID(),
      aluno_id: userId,
      coluna_id: colunaId,
      titulo: quickAddTitle.trim(),
      descricao: '',
      prioridade: 'media',
      tag: 'estudos',
      checklist: [],
      ordem: tarefas.filter(t => t.coluna_id === colunaId).length,
      created_at: new Date().toISOString()
    };

    setTarefas(prev => [newTask, ...prev]);
    setQuickAddTitle('');
    setQuickAddColumn(null);

    // Save to Supabase
    try {
      await supabase.from('kanban_tarefas').insert({
        id: newTask.id,
        aluno_id: userId,
        coluna_id: newTask.coluna_id,
        titulo: newTask.titulo,
        prioridade: newTask.prioridade,
        tag: newTask.tag,
        checklist: newTask.checklist,
        ordem: newTask.ordem
      });
    } catch (err) {
      console.error('Erro ao salvar nova tarefa:', err);
    }
  };

  // Move task to a column (via Drag or Button)
  const handleMoveTask = async (taskId: string, targetColunaId: 'todo' | 'in_progress' | 'review' | 'done') => {
    setTarefas(prev =>
      prev.map(t => (t.id === taskId ? { ...t, coluna_id: targetColunaId, updated_at: new Date().toISOString() } : t))
    );

    try {
      await supabase
        .from('kanban_tarefas')
        .update({ coluna_id: targetColunaId, updated_at: new Date().toISOString() })
        .eq('id', taskId);
    } catch (err) {
      console.error('Erro ao atualizar coluna da tarefa:', err);
    }
  };

  // Save / Update Task from Modal
  const handleSaveModal = async () => {
    if (!editingTask || !userId) return;

    setTarefas(prev => prev.map(t => (t.id === editingTask.id ? { ...editingTask, updated_at: new Date().toISOString() } : t)));
    setIsModalOpen(false);

    try {
      await supabase
        .from('kanban_tarefas')
        .upsert({
          id: editingTask.id,
          aluno_id: userId,
          coluna_id: editingTask.coluna_id,
          titulo: editingTask.titulo,
          descricao: editingTask.descricao,
          prioridade: editingTask.prioridade,
          tag: editingTask.tag,
          prazo: editingTask.prazo || null,
          checklist: editingTask.checklist,
          link_url: editingTask.link_url || null,
          updated_at: new Date().toISOString()
        });
    } catch (err) {
      console.error('Erro ao salvar alterações da tarefa:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    setTarefas(prev => prev.filter(t => t.id !== taskId));
    if (editingTask?.id === taskId) {
      setIsModalOpen(false);
      setEditingTask(null);
    }

    try {
      await supabase.from('kanban_tarefas').delete().eq('id', taskId);
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
    }
  };

  // Toggle checklist item directly from card or modal
  const handleToggleChecklistItem = async (taskId: string, itemId: string) => {
    setTarefas(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const updatedChecklist = t.checklist.map(item =>
            item.id === itemId ? { ...item, concluido: !item.concluido } : item
          );
          return { ...t, checklist: updatedChecklist };
        }
        return t;
      })
    );

    if (editingTask && editingTask.id === taskId) {
      setEditingTask(prev => {
        if (!prev) return null;
        return {
          ...prev,
          checklist: prev.checklist.map(item =>
            item.id === itemId ? { ...item, concluido: !item.concluido } : item
          )
        };
      });
    }

    const currentTask = tarefas.find(t => t.id === taskId);
    if (currentTask) {
      const updatedChecklist = currentTask.checklist.map(item =>
        item.id === itemId ? { ...item, concluido: !item.concluido } : item
      );
      try {
        await supabase
          .from('kanban_tarefas')
          .update({ checklist: updatedChecklist, updated_at: new Date().toISOString() })
          .eq('id', taskId);
      } catch (err) {
        console.error('Erro ao atualizar checklist:', err);
      }
    }
  };

  // Add subtask inside edit modal
  const handleAddSubtask = () => {
    if (!newChecklistText.trim() || !editingTask) return;
    const newItem: KanbanChecklistItem = {
      id: crypto.randomUUID(),
      texto: newChecklistText.trim(),
      concluido: false
    };
    setEditingTask(prev => {
      if (!prev) return null;
      return { ...prev, checklist: [...prev.checklist, newItem] };
    });
    setNewChecklistText('');
  };

  // Remove subtask inside edit modal
  const handleRemoveSubtask = (itemId: string) => {
    if (!editingTask) return;
    setEditingTask(prev => {
      if (!prev) return null;
      return { ...prev, checklist: prev.checklist.filter(i => i.id !== itemId) };
    });
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColumn(colId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, colId: 'todo' | 'in_progress' | 'review' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      handleMoveTask(taskId, colId);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  // Filtered tasks computation
  const filteredTarefas = useMemo(() => {
    return tarefas.filter(t => {
      const matchSearch =
        searchQuery === '' ||
        t.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.descricao && t.descricao.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchPrioridade = filterPrioridade === 'all' || t.prioridade === filterPrioridade;
      const matchTag = filterTag === 'all' || t.tag === filterTag;

      return matchSearch && matchPrioridade && matchTag;
    });
  }, [tarefas, searchQuery, filterPrioridade, filterTag]);

  const filtersActive = searchQuery.trim() !== '' || filterPrioridade !== 'all' || filterTag !== 'all';

  // Telemetry HUD stats
  const totalTarefas = tarefas.length;
  const concluidasCount = tarefas.filter(t => t.coluna_id === 'done').length;
  const emAndamentoCount = tarefas.filter(t => t.coluna_id === 'in_progress').length;
  const percentConcluidas = totalTarefas > 0 ? Math.round((concluidasCount / totalTarefas) * 100) : 0;

  const isOverdue = (prazo?: string | null) => {
    if (!prazo) return false;
    const today = new Date().toISOString().split('T')[0];
    return prazo < today;
  };

  return (
    <div className="app-page max-w-7xl mx-auto font-sans relative">
      
      {/* ——————————————————————————————
          1. CABEÇALHO & HUD DE PRODUTIVIDADE
         —————————————————————————————— */}
      <div className="app-page-header flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary via-[#004A8D] to-secondary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <HugeiconsIcon icon={CheckListIcon} size={28} />
          </div>
          <div className="min-w-0">
            <span className="inline-flex mb-1.5 text-xs font-extrabold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/25">
              Organização pessoal
            </span>
            <h1 className="app-title text-[26px] sm:text-headline-lg">Meu Kanban de Estudos</h1>
            <p className="app-subtitle">
              Organize suas matérias, exercícios, entregas do Projeto Integrador e revisões sem burocracia.
            </p>
          </div>
        </div>

        {/* Telemetry Stats Badges */}
        <div className="grid w-full grid-cols-3 gap-2 sm:gap-3 lg:w-auto" aria-label="Resumo das tarefas">
          <div className="flex min-h-[68px] items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/70">
            <HugeiconsIcon icon={Task01Icon} size={18} className="text-primary shrink-0" />
            <div>
              <span className="text-[11px] text-on-surface-variant font-extrabold block uppercase leading-tight">Tarefas</span>
              <span className="font-heading font-extrabold text-xl text-on-surface leading-tight">
                {totalTarefas}
              </span>
            </div>
          </div>

          <div className="flex min-h-[68px] items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/70">
            <HugeiconsIcon icon={FireIcon} size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="text-[11px] text-on-surface-variant font-extrabold block uppercase leading-tight">Em foco</span>
              <span className="font-heading font-extrabold text-xl text-on-surface leading-tight">
                {emAndamentoCount}
              </span>
            </div>
          </div>

          <div className="flex min-h-[68px] items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/70">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="text-[11px] text-on-surface-variant font-extrabold block uppercase leading-tight">Progresso</span>
              <span className="font-heading font-extrabold text-xl text-emerald-700 dark:text-emerald-400 leading-tight">
                {percentConcluidas}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ——————————————————————————————
          2. BARRA DE BUSCA E FILTROS RÁPIDOS
         —————————————————————————————— */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl border border-outline-variant/70 shadow-sm flex flex-col gap-4" aria-label="Busca e filtros do quadro">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-sm font-extrabold text-on-surface">Encontre suas tarefas</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">Busque por nome, anotação, prioridade ou categoria.</p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
            syncStatus === 'ready'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : syncStatus === 'offline'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                : 'bg-primary/10 text-primary'
          }`} role="status" aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${syncStatus === 'ready' ? 'bg-emerald-500' : syncStatus === 'offline' ? 'bg-amber-500' : 'bg-primary animate-pulse'}`} />
            {syncStatus === 'ready' ? 'Sincronizado' : syncStatus === 'offline' ? 'Disponível neste dispositivo' : 'Sincronizando...'}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        {/* Search Input */}
        <label className="block flex-1 lg:max-w-md">
          <span className="mb-1.5 block text-xs font-extrabold text-on-surface">Buscar</span>
          <div className="relative">
          <HugeiconsIcon icon={Search01Icon} size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefa ou anotação..."
            className="min-h-11 w-full pl-11 pr-11 py-2.5 bg-surface-container-low border border-outline-variant/70 rounded-xl text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              aria-label="Limpar busca"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          )}
          </div>
        </label>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Priority Pill Filters */}
          <div className="min-w-0">
            <span className="mb-1.5 block text-xs font-extrabold text-on-surface">Prioridade</span>
            <div className="flex max-w-full items-center gap-1 overflow-x-auto bg-surface-container-low p-1 rounded-xl border border-outline-variant/70" aria-label="Filtrar por prioridade">
            {['all', 'urgente', 'alta', 'media', 'baixa'].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPrioridade(p)}
                aria-pressed={filterPrioridade === p}
                className={`min-h-9 shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold capitalize transition-all ${
                  filterPrioridade === p
                    ? 'bg-surface-container-lowest text-primary shadow-sm ring-1 ring-primary/15'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {p === 'all' ? 'Todas' : p}
              </button>
            ))}
            </div>
          </div>

          {/* Tag Dropdown */}
          <label className="block sm:min-w-52">
          <span className="mb-1.5 block text-xs font-extrabold text-on-surface">Categoria</span>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="min-h-11 w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant/70 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            {Object.entries(TAGS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.emoji} {item.label}
              </option>
            ))}
          </select>
          </label>

          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterPrioridade('all');
                setFilterTag('all');
              }}
              className="min-h-11 px-4 rounded-xl border border-outline-variant/70 bg-surface-container-lowest text-sm font-bold text-primary hover:bg-primary/5"
            >
              Limpar filtros
            </button>
          )}
        </div>
        </div>
      </div>

      {/* ——————————————————————————————
          3. O QUADRO KANBAN (4 COLUNAS)
         —————————————————————————————— */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-extrabold text-on-surface">Quadro de tarefas</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {filtersActive ? `${filteredTarefas.length} de ${totalTarefas} tarefas visíveis` : 'Arraste os cartões ou use a seta para avançar.'}
          </p>
        </div>
        <span className="text-xs font-bold text-primary sm:hidden">Deslize para ver →</span>
        <span className="hidden text-xs font-bold text-on-surface-variant sm:inline">4 etapas</span>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4 xl:gap-5 items-start" aria-label="Quadro Kanban com quatro etapas">
        {COLUNAS.map(coluna => {
          const colTarefas = filteredTarefas.filter(t => t.coluna_id === coluna.id);
          const isOver = dragOverColumn === coluna.id;

          return (
            <div
              key={coluna.id}
              onDragOver={(e) => handleDragOver(e, coluna.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, coluna.id)}
              className={`w-[min(86vw,340px)] min-w-[280px] shrink-0 snap-start rounded-3xl p-4 border-2 transition-all duration-200 flex flex-col gap-3 min-h-[440px] sm:w-auto sm:min-w-0 ${
                coluna.corBorda
              } ${isOver ? 'bg-primary/10 border-primary shadow-lg ring-4 ring-primary/20 scale-[1.01]' : 'bg-surface-container-lowest shadow-sm'}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{coluna.icone}</span>
                  <div>
                    <h3 className="font-heading font-extrabold text-sm text-on-surface flex items-center gap-1.5">
                      {coluna.titulo}
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold ${coluna.corBadge}`}>
                        {colTarefas.length}
                      </span>
                    </h3>
                    <span className="text-xs text-on-surface-variant font-semibold block mt-0.5">
                      {coluna.subtitulo}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setQuickAddColumn(coluna.id);
                    setQuickAddTitle('');
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
                  title={`Adicionar tarefa em ${coluna.titulo}`}
                  aria-label={`Adicionar tarefa em ${coluna.titulo}`}
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={18} />
                </button>
              </div>

              {/* 1-Click Fast Inline Add Form */}
              {quickAddColumn === coluna.id && (
                <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/45 space-y-3 animate-in fade-in zoom-in-95">
                  <label htmlFor={`quick-add-${coluna.id}`} className="block text-xs font-extrabold text-on-surface">
                    Nova tarefa em {coluna.titulo}
                  </label>
                  <input
                    id={`quick-add-${coluna.id}`}
                    type="text"
                    autoFocus
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd(coluna.id);
                      if (e.key === 'Escape') setQuickAddColumn(null);
                    }}
                    placeholder="Título da tarefa e pressione Enter..."
                    className="min-h-11 w-full p-3 bg-surface-container-lowest border border-outline-variant/70 rounded-xl text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickAddColumn(null)}
                      className="min-h-10 px-3 text-on-surface-variant hover:text-on-surface font-bold text-xs rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(coluna.id)}
                      disabled={!quickAddTitle.trim()}
                      className="min-h-10 px-4 bg-primary text-white rounded-lg font-bold text-xs shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

              {/* Task Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTarefas.map(tarefa => {
                  const prioridadeDef = PRIORIDADES[tarefa.prioridade] || PRIORIDADES.media;
                  const tagDef = TAGS[tarefa.tag] || TAGS.estudos;
                  const checklistTotal = tarefa.checklist?.length || 0;
                  const checklistDone = tarefa.checklist?.filter(c => c.concluido).length || 0;
                  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
                  const overdue = isOverdue(tarefa.prazo);

                  return (
                    <div
                      key={tarefa.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, tarefa.id)}
                      className="p-4 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/70 hover:border-primary/45 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing space-y-3 group select-none"
                    >
                      {/* Card Top: Tag + Priority */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border leading-tight ${tagDef.cor}`}>
                          {tagDef.emoji} {tagDef.label}
                        </span>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border flex items-center gap-1.5 leading-tight ${prioridadeDef.cor}`}>
                          <span className={`w-2 h-2 rounded-full ${prioridadeDef.dot}`} />
                          {prioridadeDef.label}
                        </span>
                      </div>

                      {/* Card Title */}
                      <h4 className="font-heading font-extrabold text-sm text-on-surface line-clamp-2 leading-snug">
                        {tarefa.titulo}
                      </h4>

                      {/* Card Description preview if exists */}
                      {tarefa.descricao && (
                        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                          {tarefa.descricao}
                        </p>
                      )}

                      {/* Checklist Progress if items exist */}
                      {checklistTotal > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <HugeiconsIcon icon={CheckListIcon} size={14} />
                              {checklistDone}/{checklistTotal} concluídos
                            </span>
                            <span>{checklistPercent}%</span>
                          </div>
                          <div className="h-2 bg-surface-container rounded-full overflow-hidden" role="progressbar" aria-label={`Progresso da tarefa ${tarefa.titulo}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={checklistPercent}>
                            <div
                              className={`h-full rounded-full transition-all ${
                                checklistPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                              }`}
                              style={{ width: `${checklistPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Card Footer: Due Date, Link & Action buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/60 text-xs text-on-surface-variant font-semibold">
                        <div className="flex items-center gap-2 flex-wrap">
                          {tarefa.prazo && (
                            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                              overdue && tarefa.coluna_id !== 'done'
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 font-extrabold'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}>
                              <HugeiconsIcon icon={Calendar01Icon} size={14} />
                              {new Date(`${tarefa.prazo}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}

                          {tarefa.link_url && (
                            <a
                              href={tarefa.link_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="min-h-9 px-2 text-primary hover:underline flex items-center gap-1 rounded-lg hover:bg-primary/5"
                              title="Abrir Link Anexo"
                              aria-label={`Abrir link anexo da tarefa ${tarefa.titulo}`}
                            >
                              <HugeiconsIcon icon={LinkSquare01Icon} size={15} />
                              <span>Link</span>
                            </a>
                          )}
                        </div>

                        {/* Card Edit & Move Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask(tarefa);
                              setIsModalOpen(true);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container"
                            title="Editar Detalhes"
                            aria-label={`Editar tarefa ${tarefa.titulo}`}
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={16} />
                          </button>

                          {/* Quick Next Column Arrow */}
                          {coluna.id !== 'done' && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextCols: Record<string, 'todo' | 'in_progress' | 'review' | 'done'> = {
                                  todo: 'in_progress',
                                  in_progress: 'review',
                                  review: 'done'
                                };
                                handleMoveTask(tarefa.id, nextCols[coluna.id]);
                              }}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-500/10"
                              title="Avançar para próxima coluna"
                              aria-label={`Avançar tarefa ${tarefa.titulo} para a próxima coluna`}
                            >
                              <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTarefas.length === 0 && quickAddColumn !== coluna.id && (
                  <div className="min-h-40 border border-dashed border-outline-variant/70 bg-surface-container-low/50 rounded-2xl flex flex-col items-center justify-center text-on-surface-variant p-5 text-center">
                    <span className="text-2xl mb-2" aria-hidden="true">{filtersActive ? '🔎' : coluna.icone}</span>
                    <span className="text-sm font-extrabold text-on-surface">{filtersActive ? 'Nenhum resultado nesta etapa' : 'Nenhuma tarefa aqui'}</span>
                    <span className="mt-1 text-xs">{filtersActive ? 'Tente alterar ou limpar os filtros.' : `Adicione uma tarefa em ${coluna.titulo}.`}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (filtersActive) {
                          setSearchQuery('');
                          setFilterPrioridade('all');
                          setFilterTag('all');
                        } else {
                          setQuickAddColumn(coluna.id);
                          setQuickAddTitle('');
                        }
                      }}
                      className="min-h-10 px-3 text-xs text-primary font-extrabold hover:underline mt-2 rounded-lg"
                    >
                      {filtersActive ? 'Limpar filtros' : '+ Criar tarefa rápida'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ——————————————————————————————
          4. MODAL DE EDIÇÃO & DETALHES RICOS
         —————————————————————————————— */}
      {isModalOpen && editingTask && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div
            className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl border border-outline-variant/70 overflow-hidden font-sans max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kanban-task-dialog-title"
          >
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-outline-variant/70 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <HugeiconsIcon icon={Edit01Icon} size={20} />
                </span>
                <div>
                <h3 id="kanban-task-dialog-title" className="text-lg font-heading font-extrabold text-on-surface">
                  Detalhes da Tarefa
                </h3>
                <p className="mt-0.5 text-xs text-on-surface-variant">Atualize o status, prazo e os passos necessários.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl"
                aria-label="Fechar detalhes da tarefa"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-sm">
              {/* Title */}
              <div className="space-y-1.5">
                <label htmlFor="kanban-task-title" className="text-xs font-extrabold text-on-surface block">
                  Título da Tarefa
                </label>
                <input
                  id="kanban-task-title"
                  type="text"
                  value={editingTask.titulo}
                  onChange={(e) => setEditingTask({ ...editingTask, titulo: e.target.value })}
                  className="min-h-11 w-full p-3 bg-surface-container-low border border-outline-variant/70 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Ex: Fazer exercícios da Aula 04..."
                />
              </div>

              {/* Column Selection */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-extrabold text-on-surface">Status da tarefa</legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLUNAS.map(col => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setEditingTask({ ...editingTask, coluna_id: col.id })}
                      aria-pressed={editingTask.coluna_id === col.id}
                      className={`min-h-11 p-2.5 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        editingTask.coluna_id === col.id
                          ? `${col.corBadge} border-transparent shadow-xs`
                          : 'bg-surface-container-low border-outline-variant/70 text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span>{col.icone}</span>
                      <span>{col.titulo}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Priority & Tag Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Priority */}
                <div className="space-y-1.5">
                  <label htmlFor="kanban-task-priority" className="text-xs font-extrabold text-on-surface block">
                    Prioridade
                  </label>
                  <select
                    id="kanban-task-priority"
                    value={editingTask.prioridade}
                    onChange={(e) => setEditingTask({ ...editingTask, prioridade: e.target.value as KanbanTarefa['prioridade'] })}
                    className="min-h-11 w-full p-3 bg-surface-container-low border border-outline-variant/70 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="baixa">🟢 Baixa</option>
                    <option value="media">🔵 Média</option>
                    <option value="alta">🟠 Alta</option>
                    <option value="urgente">🔴 Urgente</option>
                  </select>
                </div>

                {/* Tag */}
                <div className="space-y-1.5">
                  <label htmlFor="kanban-task-tag" className="text-xs font-extrabold text-on-surface block">
                    Categoria / Tag
                  </label>
                  <select
                    id="kanban-task-tag"
                    value={editingTask.tag}
                    onChange={(e) => setEditingTask({ ...editingTask, tag: e.target.value as KanbanTarefa['tag'] })}
                    className="min-h-11 w-full p-3 bg-surface-container-low border border-outline-variant/70 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {Object.entries(TAGS).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.emoji} {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Link URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="kanban-task-date" className="text-xs font-extrabold text-on-surface block">
                    Data de Entrega / Prazo
                  </label>
                  <input
                    id="kanban-task-date"
                    type="date"
                    value={editingTask.prazo || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, prazo: e.target.value || null })}
                    className="min-h-11 w-full p-3 bg-surface-container-low border border-outline-variant/70 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="kanban-task-link" className="text-xs font-extrabold text-on-surface block">
                    Link Anexo (Drive / Notion / Material)
                  </label>
                  <input
                    id="kanban-task-link"
                    type="url"
                    value={editingTask.link_url || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, link_url: e.target.value || null })}
                    placeholder="https://drive.google.com/..."
                    className="min-h-11 w-full p-3 bg-surface-container-low border border-outline-variant/70 rounded-xl text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Description / Notes */}
              <div className="space-y-1.5">
                <label htmlFor="kanban-task-description" className="text-xs font-extrabold text-on-surface block">
                  Anotações & Detalhes
                </label>
                <textarea
                  id="kanban-task-description"
                  rows={3}
                  value={editingTask.descricao || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, descricao: e.target.value })}
                  placeholder="Escreva anotações livres, dúvidas para o professor ou instruções..."
                  className="w-full p-3 bg-surface-container-low border border-outline-variant/70 rounded-xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y"
                />
              </div>

              {/* Subtasks Checklist */}
              <div className="space-y-3 pt-4 border-t border-outline-variant/70">
                <div className="text-xs font-extrabold text-on-surface flex items-center justify-between">
                  <span>Subtarefas (Checklist)</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary font-extrabold">
                    {editingTask.checklist.filter(c => c.concluido).length} / {editingTask.checklist.length}
                  </span>
                </div>

                {/* Subtasks List */}
                <div className="space-y-1.5">
                  {editingTask.checklist.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60"
                    >
                      <label className="flex min-h-9 items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={item.concluido}
                          onChange={() => handleToggleChecklistItem(editingTask.id, item.id)}
                          className="w-5 h-5 rounded text-primary cursor-pointer shrink-0"
                        />
                        <span className={`text-sm font-semibold ${item.concluido ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                          {item.texto}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(item.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-400"
                        aria-label={`Remover subtarefa ${item.texto}`}
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Subtask input */}
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder="Adicionar item à checklist e Enter..."
                    className="min-h-11 flex-1 p-3 bg-surface-container-low border border-outline-variant/70 rounded-xl text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={!newChecklistText.trim()}
                    className="min-h-11 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-sm rounded-xl border border-outline-variant/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-outline-variant/70 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 bg-surface-container-lowest">
              <button
                type="button"
                onClick={() => handleDeleteTask(editingTask.id)}
                className="min-h-11 px-4 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <HugeiconsIcon icon={Delete01Icon} size={17} />
                <span>Excluir</span>
              </button>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-11 px-5 border border-outline-variant/70 text-on-surface hover:bg-surface-container font-bold text-sm rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={!editingTask.titulo.trim()}
                  className="min-h-11 px-6 bg-primary text-white font-heading font-bold text-sm rounded-xl shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
