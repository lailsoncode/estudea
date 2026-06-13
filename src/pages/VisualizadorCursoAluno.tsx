import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  BookOpen01Icon,
  Tick01Icon,
  Alert01Icon,
  Task01Icon,
  CheckmarkCircle02Icon,
  Progress01Icon
} from '@hugeicons/core-free-icons';

interface VisualizadorCursoAlunoProps {
  userId: string;
  turmaId: string | null;
}

interface Curso {
  id: string;
  titulo: string;
  descricao: string | null;
}

interface Modulo {
  id: string;
  titulo: string;
  ordem: number;
}

interface Aula {
  id: string;
  numero_aula: number;
  titulo: string;
  conteudo: string;
  modulo_id: string | null;
  ordem: number;
  tipo: 'video' | 'texto' | 'quiz' | 'arquivo';
  video_url?: string;
  arquivo_url?: string | null;
  atividades?: {
    id: string;
    enunciado: string;
    tipo_entrega: 'texto' | 'imagem';
  }[];
}

interface Progresso {
  aula_id: string;
}

interface Entrega {
  atividade_id: string;
  resposta: string;
  nota: number | null;
  feedback_professor: string | null;
}

const renderFormattedText = (text: string) => {
  if (!text) return '';
  // Split by bold (**text**) or inline code (`code`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-200">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const parseLessonConteudo = (rawConteudo: string, tipo?: string) => {
  if (!rawConteudo) {
    return { descricao: '', conteudo: '' };
  }
  if (rawConteudo.includes('===DESCRIPTION_END===')) {
    const parts = rawConteudo.split('===DESCRIPTION_END===');
    return {
      descricao: parts[0] || '',
      conteudo: parts.slice(1).join('===DESCRIPTION_END===') || ''
    };
  }
  if (tipo && tipo !== 'texto') {
    return {
      descricao: rawConteudo,
      conteudo: ''
    };
  }
  return {
    descricao: '',
    conteudo: rawConteudo
  };
};

export const VisualizadorCursoAluno: React.FC<VisualizadorCursoAlunoProps> = ({ userId, turmaId }) => {
  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [selectedAula, setSelectedAula] = useState<Aula | null>(null);
  const [aulasLiberadas, setAulasLiberadas] = useState<string[]>([]);
  
  // Student states
  const [progresso, setProgresso] = useState<Progresso[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [respostaForm, setRespostaForm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (turmaId) {
      loadCourseAndData();
    } else {
      setLoading(false);
    }
  }, [turmaId]);

  const loadCourseAndData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Resolve course linked to student class
      const { data: turmaData, error: turmaError } = await supabase
        .from('turmas')
        .select('curso_id')
        .eq('id', turmaId!)
        .single();
      if (turmaError) throw turmaError;

      if (!turmaData?.curso_id) {
        setCurso(null);
        setLoading(false);
        return;
      }

      // 2. Fetch Course Info
      const { data: cursoData, error: cursoError } = await supabase
        .from('cursos')
        .select('*')
        .eq('id', turmaData.curso_id)
        .single();
      if (cursoError) throw cursoError;
      setCurso(cursoData);

      // 3. Fetch Modulos of this course
      const { data: modulosData, error: modulosError } = await supabase
        .from('modulos')
        .select('*')
        .eq('curso_id', turmaData.curso_id)
        .order('ordem', { ascending: true });
      if (modulosError) throw modulosError;
      setModulos(modulosData || []);

      if (modulosData && modulosData.length > 0) {
        const moduloIds = modulosData.map(m => m.id);
        // Fetch Lessons for these modules
        const { data: aulasData, error: aulasError } = await supabase
          .from('aulas')
          .select('*, atividades(*)')
          .in('modulo_id', moduloIds);
        if (aulasError) throw aulasError;

        // Sort lessons client-side
        const modIdToOrder = new Map(modulosData.map((m, idx) => [m.id, idx]));
        const sortedAulas = (aulasData || []).sort((a, b) => {
          const orderA = modIdToOrder.get(a.modulo_id!) ?? 999;
          const orderB = modIdToOrder.get(b.modulo_id!) ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.ordem ?? 0) - (b.ordem ?? 0);
        });

        setAulas(sortedAulas);
        if (sortedAulas.length > 0) {
          setSelectedAula(sortedAulas[0]);
        }
      }

      // 4. Fetch student progress and submissions
      await fetchStudentProgress();

      // 5. Fetch released lessons for this class
      const { data: liberadasData, error: liberadasError } = await supabase
        .from('turma_aulas_liberadas')
        .select('aula_id')
        .eq('turma_id', turmaId!);

      if (liberadasError) throw liberadasError;
      setAulasLiberadas((liberadasData || []).map(r => r.aula_id));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do curso.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = async () => {
    try {
      const { data: progressoData } = await supabase
        .from('progresso_alunos')
        .select('aula_id')
        .eq('aluno_id', userId);
      setProgresso(progressoData || []);

      const { data: entregasData } = await supabase
        .from('entregas_atividades')
        .select('atividade_id, resposta, nota, feedback_professor')
        .eq('aluno_id', userId);
      setEntregas(entregasData || []);
    } catch (err) {
      console.error('Erro ao carregar progresso do aluno:', err);
    }
  };

  const handleMarkAsCompleted = async (aulaId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const { error: progressError } = await supabase
        .from('progresso_alunos')
        .upsert({
          aluno_id: userId,
          aula_id: aulaId,
          concluido_em: new Date().toISOString()
        }, { onConflict: 'aluno_id,aula_id' });

      if (progressError) throw progressError;

      setSuccess('Aula concluída com sucesso!');
      fetchStudentProgress();
    } catch (err: any) {
      setError(err.message || 'Erro ao concluir aula.');
    }
  };

  const handleSendAssignment = async (e: React.FormEvent, atividadeId: string, aulaId: string) => {
    e.preventDefault();
    if (!respostaForm.trim()) {
      setError('Por favor, digite sua resposta.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: submitError } = await supabase
        .from('entregas_atividades')
        .upsert({
          aluno_id: userId,
          atividade_id: atividadeId,
          resposta: respostaForm.trim(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'aluno_id,atividade_id' });

      if (submitError) throw submitError;

      // Automatically register class progress when submitting activity
      await supabase
        .from('progresso_alunos')
        .upsert({
          aluno_id: userId,
          aula_id: aulaId,
          concluido_em: new Date().toISOString()
        }, { onConflict: 'aluno_id,aula_id' });

      setSuccess('Atividade enviada com sucesso para o professor!');
      setRespostaForm('');
      fetchStudentProgress();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar atividade.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-card-padded text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500">Buscando conteúdo do curso...</p>
      </div>
    );
  }

  if (!turmaId) {
    return (
      <div className="app-card-padded text-center space-y-3">
        <HugeiconsIcon icon={Alert01Icon} size={40} className="text-amber-500 mx-auto" />
        <h3 className="font-heading font-extrabold text-body-lg text-on-surface">Turma não encontrada</h3>
        <p className="text-label-sm text-slate-500 max-w-sm mx-auto">
          Você não está enturmado em nenhuma classe ativa. Por favor, fale com a secretaria do curso para obter o código de acesso.
        </p>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="app-card-padded text-center space-y-3">
        <HugeiconsIcon icon={BookOpen01Icon} size={40} className="text-slate-400 mx-auto" />
        <h3 className="font-heading font-extrabold text-body-lg text-on-surface">Nenhum curso associado</h3>
        <p className="text-label-sm text-slate-500 max-w-sm mx-auto">
          Sua turma ainda não foi vinculada a um curso pelo professor. Entre em contato com ele para liberar os materiais de estudos.
        </p>
      </div>
    );
  }

  // Calculate completion percentage
  const totalLessons = aulas.length;
  const completedLessons = progresso.filter(p => aulas.some(a => a.id === p.aula_id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="app-page">
      
      {/* Course Header & Progress */}
      <div className="app-page-header app-page-header-row">
        <div>
          <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Meu Curso
          </span>
          <h2 className="app-title mt-2">{curso.titulo}</h2>
          <p className="text-on-surface-variant text-label-sm mt-1">{curso.descricao || 'Estude no seu ritmo e conclua as tarefas abaixo.'}</p>
        </div>

        {/* Progress percent widget */}
        <div className="w-full md:w-64 space-y-2 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center text-label-sm">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <HugeiconsIcon icon={Progress01Icon} size={16} className="text-primary" />
              Progresso
            </span>
            <span className="font-bold text-primary">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 text-center font-semibold">
            {completedLessons} de {totalLessons} aulas concluídas
          </div>
        </div>
      </div>

      {/* Main Study Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Index / Sidebar list of classes */}
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 max-h-[70vh] overflow-y-auto">
          <h3 className="app-section-title pb-2 border-b border-slate-100 flex items-center gap-2">
            <HugeiconsIcon icon={BookOpen01Icon} size={18} className="text-primary" />
            Conteúdo Programático
          </h3>

          <div className="space-y-6">
            {modulos.map((modulo) => {
              const moduloAulas = aulas.filter(a => a.modulo_id === modulo.id);
              
              if (moduloAulas.length === 0) return null;

              return (
                <div key={modulo.id} className="space-y-2">
                  <h4 className="font-heading font-bold text-label-md text-slate-500 uppercase tracking-wider">
                    {modulo.titulo}
                  </h4>
                  <div className="space-y-1.5 pl-1">
                    {moduloAulas.map((aula) => {
                      const isSelected = selectedAula?.id === aula.id;
                      const hasCompleted = progresso.some(p => p.aula_id === aula.id);
                      
                      // Check assignment status if there is one
                      const activity = aula.atividades?.[0];
                      const delivery = activity 
                        ? entregas.find(e => e.atividade_id === activity.id)
                        : null;

                      let statusBadge = null;
                      if (hasCompleted) {
                        if (activity) {
                          if (delivery) {
                            if (delivery.nota !== null) {
                              statusBadge = <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded font-sans uppercase">Nota: {delivery.nota}</span>;
                            } else {
                              statusBadge = <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded font-sans uppercase">Pendente</span>;
                            }
                          } else {
                            statusBadge = <HugeiconsIcon icon={Tick01Icon} size={14} className="text-emerald-500 shrink-0" />;
                          }
                        } else {
                          statusBadge = <HugeiconsIcon icon={Tick01Icon} size={14} className="text-emerald-500 shrink-0" />;
                        }
                      }

                      const isLiberada = aulasLiberadas.includes(aula.id);
                      return (
                        <button
                          key={aula.id}
                          disabled={!isLiberada}
                          onClick={() => {
                            setSelectedAula(aula);
                            setError(null);
                            setSuccess(null);
                          }}
                          className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            !isLiberada
                              ? 'bg-slate-50 border-transparent opacity-50 cursor-not-allowed'
                              : isSelected
                                ? 'bg-primary/5 border-primary/20 text-primary font-bold shadow-sm'
                                : 'bg-white border-slate-100 hover:border-slate-200 text-on-surface-variant'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="font-mono text-xs text-slate-400 font-bold shrink-0">
                              {aula.numero_aula.toString().padStart(2, '0')}
                            </span>
                            <span className="truncate text-label-md">{aula.titulo}</span>
                          </div>
                          <div className="shrink-0 flex items-center gap-1">
                            {!isLiberada && (
                              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                            {statusBadge}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {aulas.length === 0 && (
              <p className="text-slate-400 text-center py-6 text-label-sm">Nenhuma aula cadastrada neste curso.</p>
            )}
          </div>
        </div>

        {/* Right Side: Lesson Viewer */}
        <div className="xl:col-span-2 space-y-6">
          {selectedAula ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              
              {/* Notifications */}
              {error && (
                <div className="p-4 bg-error-container/30 border border-error/20 rounded-xl text-error text-label-md flex items-start gap-2">
                  <HugeiconsIcon icon={Alert01Icon} size={20} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-4 bg-secondary-container/10 border border-secondary/20 rounded-xl text-secondary text-label-md flex items-start gap-2">
                  <HugeiconsIcon icon={Tick01Icon} size={20} className="mt-0.5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Lesson Title */}
              <div className="border-b border-slate-100 pb-4 flex justify-between items-start flex-wrap gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Aula {selectedAula.numero_aula} • {selectedAula.tipo === 'video' ? 'Vídeoula' : 'Material de Leitura'}
                  </span>
                  <h3 className="app-title">
                    {selectedAula.titulo}
                  </h3>
                </div>

                {progresso.some(p => p.aula_id === selectedAula.id) && !selectedAula.atividades?.[0] && (
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-label-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
                    <HugeiconsIcon icon={Tick01Icon} size={14} />
                    Concluída
                  </span>
                )}
              </div>

              {!aulasLiberadas.includes(selectedAula.id) ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center space-y-4 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-500 rounded-full flex items-center justify-center shadow-inner">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="max-w-md space-y-1.5">
                    <h4 className="app-section-title">Conteúdo Bloqueado</h4>
                    <p className="text-body-md text-on-surface-variant font-medium">
                      Esta aula foi cadastrada pelo professor, mas ainda não está liberada para acesso. Aguarde a liberação.
                    </p>
                  </div>
                </div>
              ) : (
                 <>
                   {/* Video Embed if present */}
                   {selectedAula.video_url && (
                     <div className="aspect-video w-full rounded-2xl border border-slate-200 overflow-hidden bg-black shadow-inner">
                       {selectedAula.video_url.includes('youtube.com') || selectedAula.video_url.includes('youtu.be') ? (
                         <iframe
                           src={selectedAula.video_url.replace('watch?v=', 'embed/').split('&')[0]}
                           title={selectedAula.titulo}
                           className="w-full h-full"
                           allowFullScreen
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                         />
                       ) : (
                         <video
                           src={selectedAula.video_url}
                           controls
                           className="w-full h-full"
                         />
                       )}
                     </div>
                   )}

                    {/* Description & Theoretical Content parsed */}
                    {(() => {
                      const parsed = parseLessonConteudo(selectedAula.conteudo || '', selectedAula.tipo);
                      return (
                        <>
                          {/* Description / Objectives block */}
                          {parsed.descricao && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                              <p className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Descrição & Objetivos da Aula
                              </p>
                              <p className="text-body-md text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                {parsed.descricao}
                              </p>
                            </div>
                          )}

                          {/* Lesson Text Content */}
                          {(parsed.conteudo || selectedAula.tipo === 'texto') && (
                            <div className="prose max-w-none text-body-lg text-on-surface leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-100 font-sans space-y-2">
                              {parsed.conteudo ? (
                                parsed.conteudo.split('\n').map((paragraph, pIdx) => {
                                  const trimmed = paragraph.trim();
                                  if (!trimmed) return null;

                                  if (trimmed.startsWith('###')) {
                                    return (
                                      <h5 key={pIdx} className="font-heading font-extrabold text-lg text-slate-900 pt-4">
                                        {renderFormattedText(trimmed.replace('###', '').trim())}
                                      </h5>
                                    );
                                  }
                                  if (trimmed.startsWith('##')) {
                                    return (
                                      <h4 key={pIdx} className="font-heading font-extrabold text-xl text-slate-950 pt-6 pb-2 border-b border-slate-200">
                                        {renderFormattedText(trimmed.replace('##', '').trim())}
                                      </h4>
                                    );
                                  }
                                  if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                                    return (
                                      <ul key={pIdx} className="list-disc pl-6 space-y-1 my-1">
                                        <li className="text-body-md text-slate-700">
                                          {renderFormattedText(trimmed.substring(1).trim())}
                                        </li>
                                      </ul>
                                    );
                                  }
                                  return (
                                    <p key={pIdx} className="my-2 leading-relaxed text-justify text-slate-700">
                                      {renderFormattedText(paragraph)}
                                    </p>
                                  );
                                })
                              ) : (
                                <p className="italic text-slate-400">Nenhum conteúdo complementar para esta aula.</p>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                   {/* File Download if present */}
                   {selectedAula.arquivo_url && (
                     <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                       <div className="flex items-center gap-3">
                         <span className="text-primary font-bold">Material de Apoio:</span>
                         <span className="text-body-md text-on-surface-variant font-medium">Esta aula contém material complementar para download.</span>
                       </div>
                       <a
                         href={selectedAula.arquivo_url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-heading font-bold text-label-sm shadow-sm transition-all"
                       >
                         Download do Arquivo
                       </a>
                     </div>
                   )}

                   {/* Link Activity / Project submission */}
                   {selectedAula.atividades && selectedAula.atividades.length > 0 ? (
                     <div className="border-t border-slate-100 pt-6 space-y-4">
                       <h4 className="font-heading font-extrabold text-body-lg text-secondary flex items-center gap-2">
                         <HugeiconsIcon icon={Task01Icon} size={20} />
                         Atividade Prática
                       </h4>

                       {selectedAula.atividades.map((atividade) => {
                         const studentDelivery = entregas.find(e => e.atividade_id === atividade.id);

                         return (
                           <div key={atividade.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                             <div className="space-y-1.5">
                               <p className="text-label-sm font-bold text-slate-400 uppercase tracking-wider">Instruções do Exercício</p>
                               <p className="text-body-md text-on-surface leading-relaxed font-semibold">
                                 {atividade.enunciado}
                               </p>
                               <p className="text-[11px] text-slate-400 font-semibold">
                                 Tipo de entrega exigida: <strong className="text-primary uppercase">{atividade.tipo_entrega}</strong>
                               </p>
                             </div>

                             {/* Grading Box if Graded */}
                             {studentDelivery && studentDelivery.nota !== null && (
                               <div className="bg-emerald-50 border border-emerald-200/50 rounded-xl p-4 text-label-md text-emerald-800 space-y-1 shadow-sm">
                                 <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                                   <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                                   <span>Atividade Avaliada — Nota: {studentDelivery.nota}/100</span>
                                 </div>
                                 {studentDelivery.feedback_professor && (
                                   <p className="text-slate-600 text-body-md leading-relaxed">
                                     <strong className="text-emerald-700 font-bold">Feedback do Professor: </strong>
                                     {studentDelivery.feedback_professor}
                                   </p>
                                 )}
                               </div>
                             )}

                             {/* Submitted and pending review */}
                             {studentDelivery && studentDelivery.nota === null && (
                               <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-4 text-label-md text-amber-800 space-y-2 shadow-sm">
                                 <div className="flex items-center gap-1.5 font-bold text-amber-700">
                                   <HugeiconsIcon icon={Progress01Icon} size={16} className="animate-spin" />
                                   <span>Resposta Enviada — Aguardando Avaliação</span>
                                 </div>
                                 <div className="bg-white/80 p-3 rounded-lg border border-amber-100 font-sans text-body-md text-slate-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                   {studentDelivery.resposta}
                                 </div>
                                 <p className="text-[10px] text-amber-600/90 font-semibold">
                                   Você pode reenviar a atividade digitando e enviando uma nova resposta abaixo a qualquer momento.
                                 </p>
                               </div>
                             )}

                             {/* Form to submit or resubmit */}
                             {(!studentDelivery || studentDelivery.nota === null) && (
                               <form onSubmit={(e) => handleSendAssignment(e, atividade.id, selectedAula.id)} className="space-y-3 pt-2">
                                 <div className="flex flex-col gap-1.5">
                                   <label className="text-label-sm font-bold text-slate-600">
                                     {studentDelivery ? 'Atualizar minha resposta' : 'Minha resposta'}
                                   </label>
                                   <textarea
                                     rows={4}
                                     required
                                     value={respostaForm}
                                     onChange={(e) => setRespostaForm(e.target.value)}
                                     disabled={submitting}
                                     placeholder={
                                       atividade.tipo_entrega === 'imagem'
                                         ? 'Cole o link público da imagem da sua atividade (ex: Imgur, Google Drive público)...'
                                         : 'Escreva a solução da sua atividade prática aqui...'
                                     }
                                     className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-body-md leading-relaxed font-sans"
                                   />
                                 </div>
                                 <button
                                   type="submit"
                                   disabled={submitting}
                                   className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-heading font-bold text-label-sm shadow-sm transition-all flex items-center gap-1.5"
                                 >
                                   <HugeiconsIcon icon={Task01Icon} size={16} />
                                   {submitting ? 'Enviando...' : (studentDelivery ? 'Reenviar Resposta' : 'Enviar Resposta')}
                                 </button>
                               </form>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   ) : (
                     /* Regular class without activity: can mark as read/complete directly */
                     <div className="border-t border-slate-100 pt-6 flex justify-end">
                       {!progresso.some(p => p.aula_id === selectedAula.id) ? (
                         <button
                           onClick={() => handleMarkAsCompleted(selectedAula.id)}
                           className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-heading font-bold text-label-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
                         >
                           <HugeiconsIcon icon={Tick01Icon} size={18} />
                           Marcar Aula como Concluída
                         </button>
                       ) : (
                         <div className="text-label-sm text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">
                           <HugeiconsIcon icon={Tick01Icon} size={16} />
                           Você concluiu esta aula!
                         </div>
                       )}
                     </div>
                   )}
                 </>
               )}

            </div>
          ) : (
            <div className="app-card-padded text-center text-slate-400 space-y-3">
              <HugeiconsIcon icon={BookOpen01Icon} size={48} className="mx-auto text-slate-300" />
              <p className="text-body-md font-bold text-on-surface">Selecione uma aula à esquerda</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
