import React, { useState, useEffect, useMemo } from 'react';
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
  session: any;
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
    corBorda: 'border-sky-500/30 dark:border-sky-500/20',
    corBadge: 'bg-sky-500 text-white',
    corBg: 'bg-sky-500/5',
    corTexto: 'text-sky-700 dark:text-sky-400'
  },
  {
    id: 'in_progress',
    titulo: 'Em Andamento',
    subtitulo: 'Estudando Agora',
    icone: '⚡',
    corBorda: 'border-amber-500/30 dark:border-amber-500/20',
    corBadge: 'bg-amber-500 text-white',
    corBg: 'bg-amber-500/5',
    corTexto: 'text-amber-700 dark:text-amber-400'
  },
  {
    id: 'review',
    titulo: 'Dúvidas & Revisão',
    subtitulo: 'Aguardando Ajuda',
    icone: '❓',
    corBorda: 'border-purple-500/30 dark:border-purple-500/20',
    corBadge: 'bg-purple-500 text-white',
    corBg: 'bg-purple-500/5',
    corTexto: 'text-purple-700 dark:text-purple-400'
  },
  {
    id: 'done',
    titulo: 'Concluído',
    subtitulo: 'Finalizado com Sucesso',
    icone: '✅',
    corBorda: 'border-emerald-500/30 dark:border-emerald-500/20',
    corBadge: 'bg-emerald-500 text-white',
    corBg: 'bg-emerald-500/5',
    corTexto: 'text-emerald-700 dark:text-emerald-400'
  }
];

const PRIORIDADES = {
  baixa: { label: 'Baixa', cor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
  media: { label: 'Média', cor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30', dot: 'bg-sky-500' },
  alta: { label: 'Alta', cor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30', dot: 'bg-orange-500' },
  urgente: { label: 'Urgente', cor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30', dot: 'bg-rose-500 animate-pulse' }
};

const TAGS = {
  estudos: { label: 'Aulas & Teoria', cor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30', emoji: '📚' },
  exercicios: { label: 'Exercícios', cor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', emoji: '✏️' },
  pi: { label: 'Projeto Integrador', cor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30', emoji: '🚀' },
  revisao: { label: 'Revisão', cor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', emoji: '🔍' },
  prova: { label: 'Avaliação / Prova', cor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30', emoji: '📝' },
  geral: { label: 'Geral', cor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30', emoji: '📌' }
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

  // Fetch tasks from Supabase
  useEffect(() => {
    if (userId) {
      fetchTarefas();
    }
  }, [userId]);

  // Sync to local cache
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`estudea_kanban_cache_${userId}`, JSON.stringify(tarefas));
    }
  }, [tarefas, userId]);

  const fetchTarefas = async () => {
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
    } catch (err: any) {
      console.error('Erro ao buscar tarefas do Kanban:', err.message);
      // Fallback sample tasks on fresh start if table is completely empty
      if (tarefas.length === 0) {
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
        setTarefas(initialSamples);
      }
    }
  };

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
    <div className="app-page space-y-6 max-w-7xl mx-auto font-sans relative">
      
      {/* ——————————————————————————————
          1. CABEÇALHO & HUD DE PRODUTIVIDADE
         —————————————————————————————— */}
      <div className="app-page-header app-page-header-row flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-[#004A8D] to-secondary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <HugeiconsIcon icon={CheckListIcon} size={26} />
          </div>
          <div>
            <h1 className="app-title flex items-center gap-2">
              Meu Kanban de Estudos
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Ágil & Descomplicado
              </span>
            </h1>
            <p className="app-subtitle">
              Organize suas matérias, exercícios, entregas do Projeto Integrador e revisões sem burocracia.
            </p>
          </div>
        </div>

        {/* Telemetry Stats Badges */}
        <div className="flex items-center gap-3 flex-wrap self-end md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <HugeiconsIcon icon={Task01Icon} size={16} className="text-primary" />
            <div>
              <span className="text-[10px] text-on-surface-variant font-bold block uppercase leading-none">Tarefas</span>
              <span className="font-mono font-extrabold text-body-md text-on-surface leading-tight">
                {totalTarefas}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <HugeiconsIcon icon={FireIcon} size={16} className="text-amber-500" />
            <div>
              <span className="text-[10px] text-on-surface-variant font-bold block uppercase leading-none">Em Foco</span>
              <span className="font-mono font-extrabold text-body-md text-on-surface leading-tight">
                {emAndamentoCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-emerald-500" />
            <div>
              <span className="text-[10px] text-on-surface-variant font-bold block uppercase leading-none">Progresso</span>
              <span className="font-mono font-extrabold text-body-md text-emerald-600 dark:text-emerald-400 leading-tight">
                {percentConcluidas}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ——————————————————————————————
          2. BARRA DE BUSCA E FILTROS RÁPIDOS
         —————————————————————————————— */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefa ou anotação..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority Pill Filters */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
            {['all', 'urgente', 'alta', 'media', 'baixa'].map(p => (
              <button
                key={p}
                onClick={() => setFilterPrioridade(p)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold capitalize transition-all ${
                  filterPrioridade === p
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-black'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {p === 'all' ? 'Todas' : p}
              </button>
            ))}
          </div>

          {/* Tag Dropdown */}
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            {Object.entries(TAGS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.emoji} {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ——————————————————————————————
          3. O QUADRO KANBAN (4 COLUNAS)
         —————————————————————————————— */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {COLUNAS.map(coluna => {
          const colTarefas = filteredTarefas.filter(t => t.coluna_id === coluna.id);
          const isOver = dragOverColumn === coluna.id;

          return (
            <div
              key={coluna.id}
              onDragOver={(e) => handleDragOver(e, coluna.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, coluna.id)}
              className={`rounded-3xl p-4 border-2 transition-all duration-200 flex flex-col gap-3 min-h-[500px] ${
                coluna.corBorda
              } ${isOver ? 'bg-primary/10 border-primary shadow-lg ring-4 ring-primary/20 scale-[1.01]' : 'bg-surface-container-lowest dark:bg-slate-900 shadow-sm'}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{coluna.icone}</span>
                  <div>
                    <h3 className="font-heading font-extrabold text-xs text-on-surface flex items-center gap-1.5">
                      {coluna.titulo}
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold ${coluna.corBadge}`}>
                        {colTarefas.length}
                      </span>
                    </h3>
                    <span className="text-[10px] text-on-surface-variant font-medium block">
                      {coluna.subtitulo}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setQuickAddColumn(coluna.id);
                    setQuickAddTitle('');
                  }}
                  className="p-1.5 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
                  title={`Adicionar tarefa em ${coluna.titulo}`}
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                </button>
              </div>

              {/* 1-Click Fast Inline Add Form */}
              {quickAddColumn === coluna.id && (
                <div className="p-3 bg-surface-container-low rounded-2xl border border-primary/40 space-y-2 animate-in fade-in zoom-in-95">
                  <input
                    type="text"
                    autoFocus
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd(coluna.id);
                      if (e.key === 'Escape') setQuickAddColumn(null);
                    }}
                    placeholder="Título da tarefa e pressione Enter..."
                    className="w-full p-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setQuickAddColumn(null)}
                      className="px-2.5 py-1 text-on-surface-variant hover:text-on-surface font-bold text-[11px]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleQuickAdd(coluna.id)}
                      className="px-3 py-1 bg-primary text-white rounded-lg font-bold text-[11px] shadow-xs"
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
                      className="p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-primary/40 shadow-xs hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing space-y-2.5 group select-none"
                    >
                      {/* Card Top: Tag + Priority */}
                      <div className="flex items-center justify-between gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${tagDef.cor}`}>
                          {tagDef.emoji} {tagDef.label}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border flex items-center gap-1 ${prioridadeDef.cor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${prioridadeDef.dot}`} />
                          {prioridadeDef.label}
                        </span>
                      </div>

                      {/* Card Title */}
                      <h4 className="font-heading font-extrabold text-xs text-on-surface line-clamp-2 leading-snug">
                        {tarefa.titulo}
                      </h4>

                      {/* Card Description preview if exists */}
                      {tarefa.descricao && (
                        <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                          {tarefa.descricao}
                        </p>
                      )}

                      {/* Checklist Progress if items exist */}
                      {checklistTotal > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-on-surface-variant/80">
                            <span className="flex items-center gap-1">
                              <HugeiconsIcon icon={CheckListIcon} size={12} />
                              {checklistDone}/{checklistTotal} concluídos
                            </span>
                            <span>{checklistPercent}%</span>
                          </div>
                          <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
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
                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-[10px] text-on-surface-variant font-semibold">
                        <div className="flex items-center gap-2 flex-wrap">
                          {tarefa.prazo && (
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                              overdue && tarefa.coluna_id !== 'done'
                                ? 'bg-rose-500/10 text-rose-600 font-bold'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}>
                              <HugeiconsIcon icon={Calendar01Icon} size={11} />
                              {new Date(`${tarefa.prazo}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}

                          {tarefa.link_url && (
                            <a
                              href={tarefa.link_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline flex items-center gap-0.5"
                              title="Abrir Link Anexo"
                            >
                              <HugeiconsIcon icon={LinkSquare01Icon} size={12} />
                              <span>Link</span>
                            </a>
                          )}
                        </div>

                        {/* Card Edit & Move Buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingTask(tarefa);
                              setIsModalOpen(true);
                            }}
                            className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container"
                            title="Editar Detalhes"
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={13} />
                          </button>

                          {/* Quick Next Column Arrow */}
                          {coluna.id !== 'done' && (
                            <button
                              onClick={() => {
                                const nextCols: Record<string, 'todo' | 'in_progress' | 'review' | 'done'> = {
                                  todo: 'in_progress',
                                  in_progress: 'review',
                                  review: 'done'
                                };
                                handleMoveTask(tarefa.id, nextCols[coluna.id]);
                              }}
                              className="p-1 rounded-lg text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-500/10"
                              title="Avançar para próxima coluna"
                            >
                              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTarefas.length === 0 && quickAddColumn !== coluna.id && (
                  <div className="h-32 border border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center text-on-surface-variant/40 p-4 text-center">
                    <span className="text-xl mb-1">{coluna.icone}</span>
                    <span className="text-[11px] font-bold">Nenhuma tarefa aqui</span>
                    <button
                      onClick={() => {
                        setQuickAddColumn(coluna.id);
                        setQuickAddTitle('');
                      }}
                      className="text-[10px] text-primary font-bold hover:underline mt-1"
                    >
                      + Criar tarefa rápida
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-outline-variant/30 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Edit01Icon} size={18} className="text-primary" />
                <h3 className="text-body-md font-heading font-extrabold text-on-surface">
                  Detalhes da Tarefa
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                  Título da Tarefa
                </label>
                <input
                  type="text"
                  value={editingTask.titulo}
                  onChange={(e) => setEditingTask({ ...editingTask, titulo: e.target.value })}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Ex: Fazer exercícios da Aula 04..."
                />
              </div>

              {/* Column Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                  Coluna / Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLUNAS.map(col => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setEditingTask({ ...editingTask, coluna_id: col.id })}
                      className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all flex items-center justify-center gap-1 ${
                        editingTask.coluna_id === col.id
                          ? `${col.corBadge} border-transparent shadow-xs`
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span>{col.icone}</span>
                      <span>{col.titulo}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority & Tag Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Priority */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                    Prioridade
                  </label>
                  <select
                    value={editingTask.prioridade}
                    onChange={(e) => setEditingTask({ ...editingTask, prioridade: e.target.value as any })}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface focus:outline-none"
                  >
                    <option value="baixa">🟢 Baixa</option>
                    <option value="media">🔵 Média</option>
                    <option value="alta">🟠 Alta</option>
                    <option value="urgente">🔴 Urgente</option>
                  </select>
                </div>

                {/* Tag */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                    Categoria / Tag
                  </label>
                  <select
                    value={editingTask.tag}
                    onChange={(e) => setEditingTask({ ...editingTask, tag: e.target.value as any })}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface focus:outline-none"
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
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                    Data de Entrega / Prazo
                  </label>
                  <input
                    type="date"
                    value={editingTask.prazo || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, prazo: e.target.value || null })}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                    Link Anexo (Drive / Notion / Material)
                  </label>
                  <input
                    type="url"
                    value={editingTask.link_url || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, link_url: e.target.value || null })}
                    placeholder="https://drive.google.com/..."
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-semibold text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              {/* Description / Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                  Anotações & Detalhes
                </label>
                <textarea
                  rows={3}
                  value={editingTask.descricao || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, descricao: e.target.value })}
                  placeholder="Escreva anotações livres, dúvidas para o professor ou instruções..."
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Subtasks Checklist */}
              <div className="space-y-2 pt-2 border-t border-outline-variant/20">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
                  <span>Subtarefas (Checklist)</span>
                  <span className="font-mono text-primary font-bold">
                    {editingTask.checklist.filter(c => c.concluido).length} / {editingTask.checklist.length}
                  </span>
                </label>

                {/* Subtasks List */}
                <div className="space-y-1.5">
                  {editingTask.checklist.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-outline-variant/20"
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={item.concluido}
                          onChange={() => handleToggleChecklistItem(editingTask.id, item.id)}
                          className="w-3.5 h-3.5 rounded text-primary cursor-pointer"
                        />
                        <span className={`text-xs font-semibold ${item.concluido ? 'line-through text-on-surface-variant/50' : 'text-on-surface'}`}>
                          {item.texto}
                        </span>
                      </label>
                      <button
                        onClick={() => handleRemoveSubtask(item.id)}
                        className="text-on-surface-variant/40 hover:text-rose-600 p-1"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Subtask input */}
                <div className="flex gap-2 pt-1">
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
                    className="flex-1 p-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-semibold text-on-surface focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl border border-outline-variant/30"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/30 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteTask(editingTask.id)}
                className="px-3 py-2 text-rose-600 hover:bg-rose-500/10 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <HugeiconsIcon icon={Delete01Icon} size={14} />
                <span>Excluir</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant/30 text-on-surface hover:bg-surface-container font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  className="px-5 py-2 bg-primary text-white font-heading font-bold text-xs rounded-xl shadow-xs"
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
