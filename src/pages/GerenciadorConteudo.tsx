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
    <div className="app-page">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('turmas')}
            className={`px-5 py-2.5 rounded-md font-heading font-bold text-label-md flex items-center gap-2 transition-all ${
              activeTab === 'turmas'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <HugeiconsIcon icon={TeacherIcon} size={20} />
            Gerenciar Turmas
          </button>
          <button
            onClick={() => setActiveTab('aulas')}
            className={`px-5 py-2.5 rounded-md font-heading font-bold text-label-md flex items-center gap-2 transition-all ${
              activeTab === 'aulas'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <HugeiconsIcon icon={BookOpen01Icon} size={20} />
            Cadastrar Aula e Atividade
          </button>
        </div>

        {activeTab === 'turmas' && (
          <button
            onClick={handleOpenNovaTurma}
            className="px-4 py-2.5 rounded-md bg-gradient-to-r from-primary to-primary-container text-on-primary font-heading font-bold text-label-md flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <HugeiconsIcon icon={AddCircleIcon} size={20} />
            Nova Turma
          </button>
        )}
      </div>

      {/* Tab Content 1: Gerenciar Turmas */}
      {activeTab === 'turmas' ? (
        <div className="bg-white border border-slate-200/80 rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <HugeiconsIcon icon={Folder01Icon} size={20} className="text-primary" />
            <h3 className="app-section-title">
              Turmas Cadastradas
            </h3>
          </div>

          {loadingTurmas ? (
            <p className="text-center text-slate-500 py-8">Buscando turmas...</p>
          ) : turmas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <p className="text-body-lg">Nenhuma turma cadastrada no momento.</p>
              <p className="text-label-sm">Clique em "Nova Turma" acima para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {turmas.map((turma) => (
                <div
                  key={turma.id}
                  className="bg-slate-50 border border-slate-200 hover:border-primary/30 p-5 rounded-lg transition-all shadow-sm hover:shadow flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h4 className="text-body-lg font-heading font-bold text-on-background">
                      {turma.nome}
                    </h4>
                    <div className="flex items-center justify-between text-label-sm">
                      <span className="text-slate-500 font-semibold">Código de Acesso:</span>
                      <span className="bg-white border border-slate-200 px-3 py-1 rounded font-mono font-bold text-secondary">
                        {turma.codigo_acesso}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-4 text-right">
                    Criado em {new Date(turma.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tab Content 2: Cadastrar Aula e Atividade Form */
        <div className="bg-white border border-slate-200/80 rounded-lg shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <HugeiconsIcon icon={BookOpen01Icon} size={20} className="text-primary" />
            <h3 className="app-section-title">
              Cadastrar Nova Aula e Atividade
            </h3>
          </div>

          <form onSubmit={handleSalvarAula} className="space-y-6">
            {/* Form Warnings/Alerts */}
            {errorAula && (
              <div className="p-4 bg-error-container/30 border border-error/20 rounded text-error text-label-md flex items-start gap-2">
                <HugeiconsIcon icon={Alert01Icon} size={20} className="mt-0.5 shrink-0" />
                <span>{errorAula}</span>
              </div>
            )}

            {successAula && (
              <div className="p-4 bg-secondary-container/30 border border-secondary/20 rounded text-secondary text-label-md flex items-start gap-2">
                <HugeiconsIcon icon={Tick01Icon} size={20} className="mt-0.5 shrink-0" />
                <span>{successAula}</span>
              </div>
            )}

            {/* Lesson Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">Número da Aula (1 a 40)</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={numeroAula}
                  onChange={(e) => setNumeroAula(Number(e.target.value))}
                  disabled={salvandoAula}
                  className="w-full p-3 text-body-md rounded border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none bg-slate-50 transition-all font-mono font-bold"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">Título da Aula</label>
                <input
                  type="text"
                  placeholder="Ex: Introdução ao HTML e Estruturas de Tags"
                  value={tituloAula}
                  onChange={(e) => setTituloAula(e.target.value)}
                  disabled={salvandoAula}
                  className="w-full p-3 text-body-md rounded border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none bg-slate-50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface">Conteúdo da Aula (Markdown ou texto corrido)</label>
              <textarea
                rows={5}
                placeholder="Insira as explicações, exemplos de código ou instruções gerais da aula..."
                value={conteudoAula}
                onChange={(e) => setConteudoAula(e.target.value)}
                disabled={salvandoAula}
                className="w-full p-3 text-body-md rounded border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none bg-slate-50 transition-all font-mono"
              />
            </div>

            {/* Linked Activity Fields */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="font-heading font-bold text-body-lg text-secondary flex items-center gap-1.5">
                <HugeiconsIcon icon={TeacherIcon} size={18} />
                Atividade Prática Vinculada
              </h4>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">Enunciado da Atividade</label>
                <input
                  type="text"
                  placeholder="Descreva o que o aluno deve fazer e entregar..."
                  value={enunciadoAtividade}
                  onChange={(e) => setEnunciadoAtividade(e.target.value)}
                  disabled={salvandoAula}
                  className="w-full p-3 text-body-md rounded border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none bg-slate-50 transition-all"
                />
              </div>

              <div className="w-full md:w-1/3 space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">Tipo de Entrega</label>
                <select
                  value={tipoEntrega}
                  onChange={(e) => setTipoEntrega(e.target.value as 'texto' | 'imagem')}
                  disabled={salvandoAula}
                  className="w-full p-3 text-body-md rounded border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none bg-slate-50 transition-all"
                >
                  <option value="texto">Texto Corrido</option>
                  <option value="imagem">Upload de Imagem</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={salvandoAula}
                className={`px-6 py-3 rounded font-heading font-bold text-body-lg flex items-center gap-2 transition-all duration-300 ${
                  salvandoAula
                    ? 'bg-slate-300 text-slate-500 cursor-wait border border-slate-200'
                    : 'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5'
                }`}
              >
                {salvandoAula ? 'Salvando...' : 'Salvar Aula e Atividade'}
                <HugeiconsIcon icon={AddCircleIcon} size={20} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Nova Turma */}
      {showModalNovaTurma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md border border-slate-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="app-section-title flex items-center gap-2">
                <HugeiconsIcon icon={TeacherIcon} size={20} className="text-primary" />
                Cadastrar Nova Turma
              </h3>
              <button
                onClick={() => setShowModalNovaTurma(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSalvarTurma} className="p-5 space-y-4">
              {errorTurma && (
                <div className="p-3 bg-error-container/30 border border-error/20 rounded text-error text-label-sm flex items-start gap-2">
                  <HugeiconsIcon icon={Alert01Icon} size={16} className="mt-0.5 shrink-0" />
                  <span>{errorTurma}</span>
                </div>
              )}

              {successTurma && (
                <div className="p-3 bg-secondary-container/30 border border-secondary/20 rounded text-secondary text-label-sm flex items-start gap-2">
                  <HugeiconsIcon icon={Tick01Icon} size={16} className="mt-0.5 shrink-0" />
                  <span>{successTurma}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">Nome da Turma</label>
                <input
                  type="text"
                  placeholder="Ex: Desenvolvimento Web - Noturno"
                  value={nomeTurma}
                  onChange={(e) => setNomeTurma(e.target.value)}
                  disabled={salvandoTurma}
                  className="w-full p-3 text-body-md rounded border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none bg-slate-50 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">Código de Acesso (Gerado automaticamente)</label>
                <input
                  type="text"
                  value={codigoTurma}
                  disabled
                  className="w-full p-3 text-body-md rounded border border-outline-variant/60 bg-slate-100 text-secondary font-mono font-bold select-all tracking-wider text-center"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalNovaTurma(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded hover:bg-slate-50 font-heading font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoTurma}
                  className="px-5 py-2 bg-primary text-on-primary rounded font-heading font-bold shadow-sm hover:shadow hover:bg-primary-container transition-all"
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
