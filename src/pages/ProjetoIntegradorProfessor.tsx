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
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      {selectedCurso ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header with back button */}
          <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCurso(null)}
                className="product-secondary-action text-xs !min-h-7 !px-2"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
                <span>Voltar para Cursos</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-product-control bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                  <HugeiconsIcon icon={TaskDone01Icon} size={20} strokeWidth={2} />
                </div>
                <div>
                  <span className="product-section-kicker">Gestão do Projeto Integrador</span>
                  <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">{selectedCurso.titulo}</h1>
                  <p className="product-subtitle">
                    Configurações, etapas, equipes e central de avaliação de entregas.
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Render the manager */}
          <div className="product-card p-5 sm:p-6">
            <ProjetoIntegradorManager courseId={selectedCurso.id} />
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Selection Header */}
          <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="product-section-kicker">Extensão & Prática</span>
              <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">Projetos Integradores</h1>
              <p className="product-subtitle">
                Selecione um curso para gerenciar o Projeto Integrador, configurar etapas, formar grupos e avaliar entregas finais.
              </p>
            </div>
          </header>

          {error && (
            <div className="p-4 bg-error/10 border border-error/20 text-error rounded-product-control text-xs font-semibold flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="product-card p-12 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-xs text-on-surface-variant font-semibold animate-pulse">Carregando cursos...</p>
            </div>
          ) : cursos.length === 0 ? (
            <div className="product-empty-state space-y-3 p-10">
              <HugeiconsIcon icon={BookOpen01Icon} size={40} className="mx-auto text-primary" strokeWidth={2} />
              <h3 className="font-heading font-extrabold text-sm text-on-surface">Nenhum curso encontrado</h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                Crie um curso no Criador de Cursos para poder inicializar e gerenciar um Projeto Integrador.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cursos.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCurso(c)}
                  className="product-card-interactive p-5 flex flex-col justify-between h-52 relative cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-product-control bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                      <HugeiconsIcon icon={BookOpen01Icon} size={20} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-heading font-extrabold text-sm text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                        {c.titulo}
                      </h3>
                      {c.descricao && (
                        <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed font-medium">
                          {c.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-outline-variant/60">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <HugeiconsIcon icon={Settings01Icon} size={14} strokeWidth={2} />
                      <span>Gerenciar Projeto</span>
                    </span>
                    <span className="text-primary font-bold text-sm group-hover:translate-x-1 transition-transform">
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
