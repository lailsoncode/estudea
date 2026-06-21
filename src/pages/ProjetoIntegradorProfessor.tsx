import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  BookOpen01Icon,
  TaskDone01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { ProjetoIntegradorManager } from '../components/ProjetoIntegradorManager';

interface Curso {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_capa?: string | null;
}

export const ProjetoIntegradorProfessor: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCursos = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('cursos')
        .select('id, titulo, descricao, imagem_capa')
        .order('titulo', { ascending: true });
      if (err) throw err;
      setCursos(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar cursos:', err);
      setError(err.message || 'Não foi possível carregar os cursos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  return (
    <div className="app-page relative overflow-hidden space-y-6">
      {selectedCurso ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header with back button */}
          <div className="app-page-header app-page-header-row justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCurso(null)}
                className="flex items-center gap-2 text-slate-500 hover:text-primary font-heading font-bold text-label-sm transition-all"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.5} />
                Voltar para Cursos
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <HugeiconsIcon icon={TaskDone01Icon} size={22} />
                </div>
                <div>
                  <h2 className="app-title text-title-md">{selectedCurso.titulo}</h2>
                  <p className="app-subtitle text-body-sm">
                    Gestão Completa de Projeto Integrador: configurações, etapas, equipes e central de avaliação.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Render the manager */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <ProjetoIntegradorManager courseId={selectedCurso.id} />
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Selection Header */}
          <div className="app-page-header">
            <h2 className="app-title">Projetos Integradores</h2>
            <p className="app-subtitle">
              Selecione um curso para gerenciar o Projeto Integrador, configurar etapas, formar grupos e avaliar entregas finais.
            </p>
          </div>

          {error && (
            <div className="bg-error-container/20 border border-error/30 text-error rounded-xl p-4 text-body-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-slate-400 font-medium text-label-md">Carregando cursos...</p>
            </div>
          ) : cursos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <HugeiconsIcon icon={BookOpen01Icon} size={40} className="mx-auto text-slate-300" />
              <h3 className="font-heading font-extrabold text-body-lg text-on-surface">Nenhum curso encontrado</h3>
              <p className="text-slate-400 text-body-sm max-w-md mx-auto">
                Crie um curso no Criador de Cursos para poder inicializar e gerenciar um Projeto Integrador.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursos.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCurso(c)}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-300 cursor-pointer flex flex-col justify-between h-52 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 group-hover:bg-primary text-primary group-hover:text-on-primary flex items-center justify-center transition-all duration-300">
                      <HugeiconsIcon icon={BookOpen01Icon} size={22} />
                    </div>
                    <div>
                      <h3 className="font-heading font-extrabold text-body-lg text-on-surface line-clamp-1 group-hover:text-primary transition-all">
                        {c.titulo}
                      </h3>
                      {c.descricao && (
                        <p className="text-slate-400 text-body-sm line-clamp-2 mt-1 leading-relaxed">
                          {c.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-400 group-hover:text-primary transition-all flex items-center gap-1">
                      <HugeiconsIcon icon={Settings01Icon} size={14} />
                      Gerenciar Projeto
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-all">
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
