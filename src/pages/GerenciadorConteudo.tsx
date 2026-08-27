import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  TeacherIcon,
  BookOpen01Icon,
  AddCircleIcon,
  Folder01Icon,
  Alert01Icon,
  Tick01Icon
} from '@hugeicons/core-free-icons';

interface Turma {
  id: string;
  nome: string;
  codigo_acesso: string;
  created_at: string;
}

export const GerenciadorConteudo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'turmas' | 'aulas'>('turmas');

  // Turmas State
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [showModalNovaTurma, setShowModalNovaTurma] = useState(false);
  const [nomeTurma, setNomeTurma] = useState('');
  const [codigoTurma, setCodigoTurma] = useState('');
  const [salvandoTurma, setSalvandoTurma] = useState(false);
  const [errorTurma, setErrorTurma] = useState<string | null>(null);
  const [successTurma, setSuccessTurma] = useState<string | null>(null);

  // Aulas State
  const [numeroAula, setNumeroAula] = useState<number>(1);
  const [tituloAula, setTituloAula] = useState('');
  const [conteudoAula, setConteudoAula] = useState('');
  const [enunciadoAtividade, setEnunciadoAtividade] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'texto' | 'imagem'>('texto');
  const [salvandoAula, setSalvandoAula] = useState(false);
  const [errorAula, setErrorAula] = useState<string | null>(null);
  const [successAula, setSuccessAula] = useState<string | null>(null);

  // Load classes
  const fetchTurmas = async () => {
    setLoadingTurmas(true);
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTurmas(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar turmas:', err);
    } finally {
      setLoadingTurmas(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'turmas') {
      fetchTurmas();
    }
  }, [activeTab]);

  // Generate random 6-digit access code
  const handleOpenNovaTurma = () => {
    setNomeTurma('');
    setErrorTurma(null);
    setSuccessTurma(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setCodigoTurma(code);
    setShowModalNovaTurma(true);
  };

  const handleSalvarTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorTurma(null);
    setSuccessTurma(null);

    if (!nomeTurma.trim()) {
      setErrorTurma('Por favor, informe o nome da turma.');
      return;
    }

    setSalvandoTurma(true);

    try {
      const { error } = await supabase
        .from('turmas')
        .insert({
          nome: nomeTurma.trim(),
          codigo_acesso: codigoTurma
        });

      if (error) throw error;

      setSuccessTurma('Turma criada com sucesso!');
      setTimeout(() => {
        setShowModalNovaTurma(false);
        fetchTurmas();
      }, 1200);
    } catch (err: any) {
      setErrorTurma(err.message || 'Erro ao criar turma.');
    } finally {
      setSalvandoTurma(false);
    }
  };

  const handleSalvarAula = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAula(null);
    setSuccessAula(null);

    if (numeroAula < 1 || numeroAula > 40) {
      setErrorAula('O número da aula deve estar entre 1 e 40.');
      return;
    }
    if (!tituloAula.trim()) {
      setErrorAula('O título da aula é obrigatório.');
      return;
    }
    if (!conteudoAula.trim()) {
      setErrorAula('O conteúdo da aula é obrigatório.');
      return;
    }
    if (!enunciadoAtividade.trim()) {
      setErrorAula('O enunciado da atividade é obrigatório.');
      return;
    }

    setSalvandoAula(true);

    try {
      // 1. Insert Aula
      const { data: aulaData, error: aulaError } = await supabase
        .from('aulas')
        .insert({
          numero_aula: numeroAula,
          titulo: tituloAula.trim(),
          conteudo: conteudoAula.trim()
        })
        .select('id')
        .single();

      if (aulaError) throw aulaError;
      if (!aulaData) throw new Error('Falha ao retornar dados da aula cadastrada.');

      // 2. Insert Atividade linked to the Aula
      const { error: atividadeError } = await supabase
        .from('atividades')
        .insert({
          aula_id: aulaData.id,
          enunciado: enunciadoAtividade.trim(),
          tipo_entrega: tipoEntrega
        });

      if (atividadeError) throw atividadeError;

      setSuccessAula(`Aula nº ${numeroAula} e Atividade cadastrados com sucesso!`);
      
      // Reset form
      setNumeroAula(prev => Math.min(prev + 1, 40));
      setTituloAula('');
      setConteudoAula('');
      setEnunciadoAtividade('');
      setTipoEntrega('texto');
    } catch (err: any) {
      setErrorAula(err.message || 'Erro ao cadastrar aula e atividade.');
    } finally {
      setSalvandoAula(false);
    }
  };

  return (
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      {/* Tab Navigation header */}
      <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-product-control border border-outline-variant/60 text-xs">
          <button
            onClick={() => setActiveTab('turmas')}
            className={`py-1.5 px-3 rounded-product-control font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'turmas'
                ? 'bg-brand-navy text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <HugeiconsIcon icon={TeacherIcon} size={15} strokeWidth={2} />
            <span>Gerenciar Turmas</span>
          </button>
          <button
            onClick={() => setActiveTab('aulas')}
            className={`py-1.5 px-3 rounded-product-control font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'aulas'
                ? 'bg-brand-navy text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <HugeiconsIcon icon={BookOpen01Icon} size={15} strokeWidth={2} />
            <span>Cadastrar Aula e Atividade</span>
          </button>
        </div>

        {activeTab === 'turmas' && (
          <button
            onClick={handleOpenNovaTurma}
            className="product-primary-action text-xs"
          >
            <HugeiconsIcon icon={AddCircleIcon} size={15} strokeWidth={2} />
            <span>Nova Turma</span>
          </button>
        )}
      </header>

      {/* Tab Content 1: Gerenciar Turmas */}
      {activeTab === 'turmas' ? (
        <div className="product-card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/60">
            <HugeiconsIcon icon={Folder01Icon} size={18} className="text-primary" strokeWidth={2} />
            <h3 className="font-heading font-extrabold text-sm text-on-surface">
              Turmas Cadastradas
            </h3>
          </div>

          {loadingTurmas ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-xs text-on-surface-variant font-semibold animate-pulse">Buscando turmas...</p>
            </div>
          ) : turmas.length === 0 ? (
            <div className="product-empty-state space-y-2 p-10">
              <p className="text-sm font-extrabold text-on-surface">Nenhuma turma cadastrada no momento.</p>
              <p className="text-xs text-on-surface-variant">Clique em "Nova Turma" acima para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {turmas.map((turma) => (
                <div
                  key={turma.id}
                  className="product-card-interactive p-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h4 className="font-heading font-extrabold text-sm text-on-surface">
                      {turma.nome}
                    </h4>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant font-medium">Código de Acesso:</span>
                      <span className="bg-surface-container-low border border-outline-variant/60 px-2.5 py-0.5 rounded-product-control font-mono font-extrabold text-primary">
                        {turma.codigo_acesso}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-4 text-right font-medium">
                    Criado em {new Date(turma.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tab Content 2: Cadastrar Aula e Atividade Form */
        <div className="product-card p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/60">
            <HugeiconsIcon icon={BookOpen01Icon} size={18} className="text-primary" strokeWidth={2} />
            <h3 className="font-heading font-extrabold text-sm text-on-surface">
              Cadastrar Nova Aula e Atividade
            </h3>
          </div>

          <form onSubmit={handleSalvarAula} className="space-y-5">
            {/* Form Warnings/Alerts */}
            {errorAula && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-product-control text-error text-xs font-semibold flex items-start gap-2">
                <HugeiconsIcon icon={Alert01Icon} size={16} className="mt-0.5 shrink-0" strokeWidth={2} />
                <span>{errorAula}</span>
              </div>
            )}

            {successAula && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-product-control text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2">
                <HugeiconsIcon icon={Tick01Icon} size={16} className="mt-0.5 shrink-0" strokeWidth={2} />
                <span>{successAula}</span>
              </div>
            )}

            {/* Lesson Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">Número da Aula (1 a 40)</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={numeroAula}
                  onChange={(e) => setNumeroAula(Number(e.target.value))}
                  disabled={salvandoAula}
                  className="product-control text-xs font-mono font-bold"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-bold text-on-surface">Título da Aula</label>
                <input
                  type="text"
                  placeholder="Ex: Introdução ao HTML e Estruturas de Tags"
                  value={tituloAula}
                  onChange={(e) => setTituloAula(e.target.value)}
                  disabled={salvandoAula}
                  className="product-control text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface">Conteúdo da Aula (Markdown ou texto corrido)</label>
              <textarea
                rows={5}
                placeholder="Insira as explicações, exemplos de código ou instruções gerais da aula..."
                value={conteudoAula}
                onChange={(e) => setConteudoAula(e.target.value)}
                disabled={salvandoAula}
                className="product-control text-xs font-mono"
              />
            </div>

            {/* Linked Activity Fields */}
            <div className="border-t border-outline-variant/60 pt-5 space-y-4">
              <h4 className="font-heading font-extrabold text-sm text-secondary flex items-center gap-1.5">
                <HugeiconsIcon icon={TeacherIcon} size={16} strokeWidth={2} />
                <span>Atividade Prática Vinculada</span>
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">Enunciado da Atividade</label>
                <input
                  type="text"
                  placeholder="Descreva o que o aluno deve fazer e entregar..."
                  value={enunciadoAtividade}
                  onChange={(e) => setEnunciadoAtividade(e.target.value)}
                  disabled={salvandoAula}
                  className="product-control text-xs"
                />
              </div>

              <div className="w-full md:w-1/3 space-y-1">
                <label className="text-xs font-bold text-on-surface">Tipo de Entrega</label>
                <select
                  value={tipoEntrega}
                  onChange={(e) => setTipoEntrega(e.target.value as 'texto' | 'imagem')}
                  disabled={salvandoAula}
                  className="product-control text-xs"
                >
                  <option value="texto">Texto Corrido</option>
                  <option value="imagem">Upload de Imagem</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={salvandoAula}
                className="product-primary-action text-xs"
              >
                <span>{salvandoAula ? 'Salvando...' : 'Salvar Aula e Atividade'}</span>
                <HugeiconsIcon icon={AddCircleIcon} size={16} strokeWidth={2} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Nova Turma */}
      {showModalNovaTurma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="product-dialog max-w-md w-full p-0 overflow-hidden">
            {/* Modal Header */}
            <div className="product-dialog-header">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={TeacherIcon} size={18} className="text-primary" strokeWidth={2} />
                <h3 className="font-heading font-extrabold text-sm text-on-surface">
                  Cadastrar Nova Turma
                </h3>
              </div>
              <button
                onClick={() => setShowModalNovaTurma(false)}
                className="product-icon-action !h-6 !w-6"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSalvarTurma} className="p-5 space-y-4">
              {errorTurma && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-product-control text-error text-xs font-semibold flex items-start gap-2">
                  <HugeiconsIcon icon={Alert01Icon} size={15} className="mt-0.5 shrink-0" strokeWidth={2} />
                  <span>{errorTurma}</span>
                </div>
              )}

              {successTurma && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-product-control text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2">
                  <HugeiconsIcon icon={Tick01Icon} size={15} className="mt-0.5 shrink-0" strokeWidth={2} />
                  <span>{successTurma}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">Nome da Turma</label>
                <input
                  type="text"
                  placeholder="Ex: Desenvolvimento Web - Noturno"
                  value={nomeTurma}
                  onChange={(e) => setNomeTurma(e.target.value)}
                  disabled={salvandoTurma}
                  className="product-control text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">Código de Acesso (Gerado automaticamente)</label>
                <input
                  type="text"
                  value={codigoTurma}
                  disabled
                  className="product-control text-xs text-primary font-mono font-bold select-all tracking-wider text-center bg-surface-container-low"
                />
              </div>

              {/* Action Buttons */}
              <div className="product-dialog-footer">
                <button
                  type="button"
                  onClick={() => setShowModalNovaTurma(false)}
                  className="product-secondary-action text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoTurma}
                  className="product-primary-action text-xs"
                >
                  {salvandoTurma ? 'Salvando...' : 'Salvar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
