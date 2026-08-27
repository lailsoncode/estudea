import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  BookOpen01Icon,
  Tick01Icon,
  Alert01Icon,
  Task01Icon,
  CheckmarkCircle02Icon,
  Progress01Icon,
  Attachment01Icon,
  Cancel01Icon
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
      tipo_entrega: 'texto' | 'imagem' | 'quiz' | 'multipla' | 'arquivo';
      pontua?: boolean;
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
  const [respostaForm, setRespostaForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, atividadeId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [atividadeId]: file }));
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setSelectedFilePreviews(prev => ({ ...prev, [atividadeId]: previewUrl }));
      } else {
        setSelectedFilePreviews(prev => {
          const next = { ...prev };
          delete next[atividadeId];
          return next;
        });
      }
    }
  };

  const handleRemoveFile = (atividadeId: string) => {
    setSelectedFiles(prev => {
      const next = { ...prev };
      delete next[atividadeId];
      return next;
    });
    setSelectedFilePreviews(prev => {
      const next = { ...prev };
      delete next[atividadeId];
      return next;
    });
  };

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

      if (entregasData) {
        const newAnswers: Record<string, string> = {};
        entregasData.forEach(e => {
          newAnswers[e.atividade_id] = e.resposta;
        });
        setRespostaForm(newAnswers);
      }
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
    const activity = selectedAula?.atividades?.find(a => a.id === atividadeId);
    if (!activity) {
      setError('Atividade não encontrada.');
      return;
    }

    const tipoEntrega = activity.tipo_entrega;
    const currentResposta = (respostaForm[atividadeId] || '').trim();
    const file = selectedFiles[atividadeId];

    if (tipoEntrega === 'texto') {
      if (!currentResposta) {
        setError('Por favor, digite sua resposta.');
        return;
      }
    } else if (tipoEntrega === 'multipla') {
      if (!currentResposta) {
        setError('Por favor, digite a parte de texto da sua resposta.');
        return;
      }
    } else if (tipoEntrega === 'imagem' || tipoEntrega === 'arquivo') {
      if (!file && !currentResposta) {
        setError('Por favor, selecione um arquivo ou insira uma resposta.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let finalResposta = currentResposta;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${atividadeId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('atividades')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('atividades')
          .getPublicUrl(fileName);

        finalResposta = publicUrlData.publicUrl;
      }

      if (tipoEntrega === 'multipla') {
        const payload = {
          texto: currentResposta,
          imagem: file ? finalResposta : null
        };
        finalResposta = JSON.stringify(payload);
      }

      const { error: submitError } = await supabase
        .from('entregas_atividades')
        .upsert({
          aluno_id: userId,
          atividade_id: atividadeId,
          resposta: finalResposta,
          updated_at: new Date().toISOString()
        }, { onConflict: 'aluno_id,atividade_id' });

      if (submitError) throw submitError;

      setSelectedFiles(prev => {
        const next = { ...prev };
        delete next[atividadeId];
        return next;
      });
      setSelectedFilePreviews(prev => {
        const next = { ...prev };
        delete next[atividadeId];
        return next;
      });

      const allActs = selectedAula?.atividades || [];
      const allSubmitted = allActs.every(act =>
        act.id === atividadeId || entregas.some(ent => ent.atividade_id === act.id)
      );

      if (allSubmitted) {
        await supabase
          .from('progresso_alunos')
          .upsert({
            aluno_id: userId,
            aula_id: aulaId,
            concluido_em: new Date().toISOString()
          }, { onConflict: 'aluno_id,aula_id' });
      }

      setSuccess('Atividade enviada com sucesso para o professor!');
      fetchStudentProgress();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar atividade.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="product-card p-12 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-on-surface-variant font-semibold animate-pulse">Buscando conteúdo do curso...</p>
      </div>
    );
  }

  if (!turmaId) {
    return (
      <div className="product-empty-state space-y-3 p-10">
        <HugeiconsIcon icon={Alert01Icon} size={40} className="text-amber-500 mx-auto" />
        <h3 className="font-heading font-extrabold text-sm text-on-surface">Turma não encontrada</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
          Você não está enturmado em nenhuma classe ativa. Por favor, fale com a secretaria do curso para obter o código de acesso.
        </p>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="product-empty-state space-y-3 p-10">
        <HugeiconsIcon icon={BookOpen01Icon} size={40} className="text-primary mx-auto" />
        <h3 className="font-heading font-extrabold text-sm text-on-surface">Nenhum curso associado</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
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
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      
      {/* Course Header & Progress */}
      <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="product-section-kicker">Meu Curso</span>
          <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">{curso.titulo}</h1>
          <p className="product-subtitle">{curso.descricao || 'Estude no seu ritmo e conclua as tarefas abaixo.'}</p>
        </div>

        {/* Progress percent widget */}
        <div className="w-full md:w-64 space-y-2 shrink-0 bg-surface-container-low p-3.5 rounded-product-control border border-outline-variant/60">
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant font-semibold flex items-center gap-1">
              <HugeiconsIcon icon={Progress01Icon} size={15} className="text-primary" strokeWidth={2} />
              Progresso
            </span>
            <span className="font-extrabold text-primary font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="text-[10px] text-on-surface-variant text-center font-medium">
            {completedLessons} de {totalLessons} aulas concluídas
          </div>
        </div>
      </header>

      {/* Main Study Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Index / Sidebar list of classes */}
        <div className="xl:col-span-1 product-card p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-3">
            <HugeiconsIcon icon={BookOpen01Icon} size={18} className="text-primary" strokeWidth={2} />
            <h3 className="font-heading font-extrabold text-sm text-on-surface">Conteúdo Programático</h3>
          </div>

          <div className="space-y-5">
            {modulos.map((modulo) => {
              const moduloAulas = aulas.filter(a => a.modulo_id === modulo.id);
              
              if (moduloAulas.length === 0) return null;

              return (
                <div key={modulo.id} className="space-y-2">
                  <h4 className="font-heading font-extrabold text-[11px] text-on-surface-variant uppercase tracking-wider">
                    {modulo.titulo}
                  </h4>
                  <div className="space-y-1.5 pl-1">
                    {moduloAulas.map((aula) => {
                      const isSelected = selectedAula?.id === aula.id;
                      const hasCompleted = progresso.some(p => p.aula_id === aula.id);
                      
                      const activities = aula.atividades || [];
                      let statusBadge = null;

                      if (hasCompleted) {
                        if (activities.length > 0) {
                          const deliveries = activities.map(act => entregas.find(e => e.atividade_id === act.id)).filter((e): e is Entrega => e !== undefined);
                          const allDelivered = deliveries.length === activities.length;
                          
                          if (allDelivered) {
                            const gradedActivities = activities.filter(act => act.pontua !== false);
                            if (gradedActivities.length > 0) {
                              const gradedDeliveries = gradedActivities.map(act => entregas.find(e => e.atividade_id === act.id)).filter((e): e is Entrega => e !== undefined);
                              const allGraded = gradedDeliveries.length === gradedActivities.length && gradedDeliveries.every(d => d.nota !== null);
                              
                              if (allGraded) {
                                const totalGrade = gradedDeliveries.reduce((sum, d) => sum + (d.nota || 0), 0) / gradedDeliveries.length;
                                statusBadge = (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                    Nota {Math.round(totalGrade)}
                                  </span>
                                );
                              } else {
                                statusBadge = (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                    Entregue
                                  </span>
                                );
                              }
                            } else {
                              statusBadge = (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                  Concluída
                                </span>
                              );
                            }
                          } else {
                            statusBadge = (
                              <span className="text-[10px] font-bold text-secondary bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-full">
                                Pendente
                              </span>
                            );
                          }
                        } else {
                          statusBadge = (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              Concluída
                            </span>
                          );
                        }
                      }

                      return (
                        <button
                          key={aula.id}
                          onClick={() => setSelectedAula(aula)}
                          className={`w-full text-left p-3 rounded-product-control border transition-all text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                              : 'bg-surface-container-low border-outline-variant/60 text-on-surface hover:border-primary/40 hover:bg-surface-container'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              hasCompleted
                                ? 'bg-emerald-500 text-white'
                                : isSelected
                                ? 'bg-primary text-white'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {hasCompleted ? '✓' : aula.numero_aula}
                            </span>
                            <span className="truncate">{aula.titulo}</span>
                          </div>
                          {statusBadge}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Lesson Workspace */}
        <div className="xl:col-span-2 space-y-6">
          {selectedAula ? (
            <div className="product-card p-5 sm:p-6 space-y-5 animate-in fade-in duration-300">
              
              {/* Messages */}
              {error && (
                <div className="p-4 bg-error/10 border border-error/20 rounded-product-control text-error text-xs font-semibold flex items-start gap-2">
                  <HugeiconsIcon icon={Alert01Icon} size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-product-control text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2">
                  <HugeiconsIcon icon={Tick01Icon} size={18} className="mt-0.5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Lesson Title */}
              <div className="border-b border-outline-variant/60 pb-4 flex justify-between items-start flex-wrap gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest font-mono">
                    Aula {selectedAula.numero_aula} • {selectedAula.tipo === 'video' ? 'Vídeoula' : 'Material de Leitura'}
                  </span>
                  <h3 className="font-heading font-extrabold text-base text-on-surface">
                    {selectedAula.titulo}
                  </h3>
                </div>

                {progresso.some(p => p.aula_id === selectedAula.id) && !selectedAula.atividades?.[0] && (
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
                    <HugeiconsIcon icon={Tick01Icon} size={14} strokeWidth={2} />
                    Concluída
                  </span>
                )}
              </div>

              {!aulasLiberadas.includes(selectedAula.id) ? (
                <div className="bg-surface-container-low border border-outline-variant/60 rounded-product-control p-10 text-center space-y-4 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center shadow-inner">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="max-w-md space-y-1">
                    <h4 className="font-heading font-extrabold text-sm text-on-surface">Conteúdo Bloqueado</h4>
                    <p className="text-xs text-on-surface-variant font-medium">
                      Esta aula foi cadastrada pelo professor, mas ainda não está liberada para acesso. Aguarde a liberação.
                    </p>
                  </div>
                </div>
              ) : (
                 <>
                   {/* Video Embed if present */}
                   {selectedAula.video_url && (
                     <div className="aspect-video w-full rounded-product-control border border-outline-variant/60 overflow-hidden bg-black shadow-inner">
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
                            <div className="bg-surface-container-low border border-outline-variant/60 rounded-product-control p-4 space-y-2 shadow-xs">
                              <p className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Descrição & Objetivos da Aula
                              </p>
                              <p className="text-xs text-on-surface-variant font-medium leading-relaxed whitespace-pre-wrap">
                                {parsed.descricao}
                              </p>
                            </div>
                          )}

                          {/* Lesson Text Content */}
                          {(parsed.conteudo || selectedAula.tipo === 'texto') && (
                            <div className="prose max-w-none text-xs text-on-surface leading-relaxed bg-surface-container-low/50 p-5 rounded-product-control border border-outline-variant/60 font-sans space-y-2">
                              {parsed.conteudo ? (
                                parsed.conteudo.split('\n').map((paragraph, pIdx) => {
                                  const trimmed = paragraph.trim();
                                  if (!trimmed) return null;

                                  if (trimmed.startsWith('###')) {
                                    return (
                                      <h5 key={pIdx} className="font-heading font-extrabold text-sm text-on-surface pt-3">
                                        {renderFormattedText(trimmed.replace('###', '').trim())}
                                      </h5>
                                    );
                                  }
                                  if (trimmed.startsWith('##')) {
                                    return (
                                      <h4 key={pIdx} className="font-heading font-extrabold text-base text-on-surface pt-4 pb-1.5 border-b border-outline-variant/60">
                                        {renderFormattedText(trimmed.replace('##', '').trim())}
                                      </h4>
                                    );
                                  }
                                  if (trimmed.startsWith('-') || (trimmed.startsWith('*') && !trimmed.startsWith('**'))) {
                                    return (
                                      <ul key={pIdx} className="list-disc pl-5 space-y-1 my-1">
                                        <li className="text-xs text-on-surface-variant font-medium">
                                          {renderFormattedText(trimmed.substring(1).trim())}
                                        </li>
                                      </ul>
                                    );
                                  }
                                  return (
                                    <p key={pIdx} className="my-1.5 leading-relaxed text-justify text-on-surface-variant font-medium">
                                      {renderFormattedText(paragraph)}
                                    </p>
                                  );
                                })
                              ) : (
                                <p className="italic text-on-surface-variant text-xs font-medium">Nenhum conteúdo complementar para esta aula.</p>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                   {/* File Download if present */}
                   {selectedAula.arquivo_url && (
                     <div className="bg-surface-container-low border border-outline-variant/60 rounded-product-control p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                       <div className="flex items-center gap-2.5">
                         <HugeiconsIcon icon={Attachment01Icon} size={18} className="text-primary shrink-0" strokeWidth={2} />
                         <span className="text-xs text-on-surface-variant font-medium">Esta aula contém material complementar para download.</span>
                       </div>
                       <a
                         href={selectedAula.arquivo_url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="product-primary-action text-xs"
                       >
                         Download do Arquivo
                       </a>
                     </div>
                   )}

                   {/* Link Activity / Project submission */}
                   {selectedAula.atividades && selectedAula.atividades.length > 0 ? (
                     <div className="border-t border-outline-variant/60 pt-5 space-y-4">
                       <h4 className="font-heading font-extrabold text-sm text-secondary flex items-center gap-2">
                         <HugeiconsIcon icon={Task01Icon} size={18} strokeWidth={2} />
                         <span>Atividade Prática</span>
                       </h4>

                       {selectedAula.atividades.map((atividade) => {
                         const studentDelivery = entregas.find(e => e.atividade_id === atividade.id);

                         return (
                           <div key={atividade.id} className="bg-surface-container-low border border-outline-variant/60 rounded-product-control p-4 sm:p-5 space-y-4">
                             <div className="space-y-1.5">
                               <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Instruções do Exercício</p>
                               <p className="text-xs text-on-surface leading-relaxed font-semibold">
                                 {atividade.enunciado}
                               </p>
                               <p className="text-[11px] text-on-surface-variant font-medium">
                                 Tipo de entrega exigida: <strong className="text-primary uppercase font-bold">{atividade.tipo_entrega}</strong>
                               </p>
                             </div>

                             {/* Grading Box if Graded */}
                              {studentDelivery && studentDelivery.nota !== null && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-product-control p-4 text-xs text-emerald-800 dark:text-emerald-300 space-y-2 shadow-xs">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} />
                                    <span>Atividade Avaliada — Nota: {studentDelivery.nota}/100</span>
                                  </div>
                                  
                                  {/* User submission preview */}
                                  <div className="bg-surface-container-lowest p-3 rounded-product-control border border-emerald-500/20 font-sans text-xs text-on-surface max-h-32 overflow-y-auto">
                                    {(() => {
                                      const isImage = (url: string) => {
                                        return url.match(/\.(jpeg|jpg|gif|png|webp)/i) || url.includes('atividades');
                                      };

                                      if (atividade.tipo_entrega === 'imagem' && (studentDelivery.resposta.startsWith('http://') || studentDelivery.resposta.startsWith('https://'))) {
                                        return (
                                          <div className="space-y-2 text-left">
                                            {isImage(studentDelivery.resposta) ? (
                                              <>
                                                <img src={studentDelivery.resposta} alt="Envio" className="max-h-24 object-contain rounded border border-outline-variant/60" />
                                                <a href={studentDelivery.resposta} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-[11px] block">Abrir imagem em nova guia ↗</a>
                                              </>
                                            ) : (
                                              <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border border-outline-variant/60 text-xs">
                                                <span className="text-xs text-on-surface-variant font-mono truncate max-w-xs">{studentDelivery.resposta}</span>
                                                <a href={studentDelivery.resposta} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs whitespace-nowrap shrink-0">Baixar arquivo ↗</a>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                      if (atividade.tipo_entrega === 'arquivo' && (studentDelivery.resposta.startsWith('http://') || studentDelivery.resposta.startsWith('https://'))) {
                                        return (
                                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-surface-container-low p-2 rounded border border-outline-variant/60 text-left text-xs">
                                            <span className="text-xs text-on-surface-variant font-mono truncate max-w-xs">{studentDelivery.resposta}</span>
                                            <a href={studentDelivery.resposta} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs whitespace-nowrap shrink-0">Baixar arquivo ↗</a>
                                          </div>
                                        );
                                      }
                                      if (atividade.tipo_entrega === 'multipla') {
                                        try {
                                          const payload = JSON.parse(studentDelivery.resposta);
                                          return (
                                            <div className="space-y-3 text-left">
                                              {payload.texto && <p className="whitespace-pre-wrap">{payload.texto}</p>}
                                              {payload.imagem && (
                                                <div className="space-y-1">
                                                  {isImage(payload.imagem) ? (
                                                    <>
                                                      <img src={payload.imagem} alt="Envio" className="max-h-24 object-contain rounded border border-outline-variant/60" />
                                                      <a href={payload.imagem} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-[11px] block">Abrir imagem em nova guia ↗</a>
                                                    </>
                                                  ) : (
                                                    <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border border-outline-variant/60 text-xs">
                                                      <span className="text-xs text-on-surface-variant font-mono truncate max-w-xs font-bold">{payload.imagem}</span>
                                                      <a href={payload.imagem} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs whitespace-nowrap shrink-0">Baixar arquivo ↗</a>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        } catch (e) {
                                          return <span className="whitespace-pre-wrap text-left block">{studentDelivery.resposta}</span>;
                                        }
                                      }
                                      return <span className="whitespace-pre-wrap text-left block">{studentDelivery.resposta}</span>;
                                    })()}
                                  </div>

                                  {studentDelivery.feedback_professor && (
                                    <p className="text-on-surface text-xs leading-relaxed border-t border-emerald-500/20 pt-2 text-left font-medium">
                                      <strong className="text-emerald-700 dark:text-emerald-300 font-bold">Feedback do Professor: </strong>
                                      {studentDelivery.feedback_professor}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Submitted and pending review */}
                              {studentDelivery && studentDelivery.nota === null && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-product-control p-4 text-xs text-amber-800 dark:text-amber-300 space-y-2 shadow-xs">
                                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                                    <HugeiconsIcon icon={Progress01Icon} size={16} className="animate-spin" strokeWidth={2} />
                                    <span>Resposta Enviada — Aguardando Avaliação</span>
                                  </div>
                                  <div className="bg-surface-container-lowest p-3 rounded-product-control border border-amber-500/20 font-sans text-xs text-on-surface max-h-32 overflow-y-auto">
                                    {(() => {
                                      const isImage = (url: string) => {
                                        return url.match(/\.(jpeg|jpg|gif|png|webp)/i) || url.includes('atividades');
                                      };

                                      if (atividade.tipo_entrega === 'imagem' && (studentDelivery.resposta.startsWith('http://') || studentDelivery.resposta.startsWith('https://'))) {
                                        return (
                                          <div className="space-y-2 text-left">
                                            {isImage(studentDelivery.resposta) ? (
                                              <>
                                                <img src={studentDelivery.resposta} alt="Envio" className="max-h-24 object-contain rounded border border-outline-variant/60" />
                                                <a href={studentDelivery.resposta} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-[11px] block">Abrir imagem em nova guia ↗</a>
                                              </>
                                            ) : (
                                              <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border border-outline-variant/60 text-xs">
                                                <span className="text-xs text-on-surface-variant font-mono truncate max-w-xs">{studentDelivery.resposta}</span>
                                                <a href={studentDelivery.resposta} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs whitespace-nowrap shrink-0">Baixar arquivo ↗</a>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                      if (atividade.tipo_entrega === 'arquivo' && (studentDelivery.resposta.startsWith('http://') || studentDelivery.resposta.startsWith('https://'))) {
                                        return (
                                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-surface-container-low p-2 rounded border border-outline-variant/60 text-left text-xs">
                                            <span className="text-xs text-on-surface-variant font-mono truncate max-w-xs">{studentDelivery.resposta}</span>
                                            <a href={studentDelivery.resposta} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs whitespace-nowrap shrink-0">Baixar arquivo ↗</a>
                                          </div>
                                        );
                                      }
                                      if (atividade.tipo_entrega === 'multipla') {
                                        try {
                                          const payload = JSON.parse(studentDelivery.resposta);
                                          return (
                                            <div className="space-y-3 text-left">
                                              {payload.texto && <p className="whitespace-pre-wrap">{payload.texto}</p>}
                                              {payload.imagem && (
                                                <div className="space-y-1">
                                                  {isImage(payload.imagem) ? (
                                                    <>
                                                      <img src={payload.imagem} alt="Envio" className="max-h-24 object-contain rounded border border-outline-variant/60" />
                                                      <a href={payload.imagem} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-[11px] block">Abrir imagem em nova guia ↗</a>
                                                    </>
                                                  ) : (
                                                    <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border border-outline-variant/60 text-xs">
                                                      <span className="text-xs text-on-surface-variant font-mono truncate max-w-xs font-bold">{payload.imagem}</span>
                                                      <a href={payload.imagem} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs whitespace-nowrap shrink-0">Baixar arquivo ↗</a>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        } catch (e) {
                                          return <span className="whitespace-pre-wrap text-left block">{studentDelivery.resposta}</span>;
                                        }
                                      }
                                      return <span className="whitespace-pre-wrap text-left block">{studentDelivery.resposta}</span>;
                                    })()}
                                  </div>
                                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold text-left">
                                    Você pode reenviar a atividade enviando uma nova resposta abaixo a qualquer momento.
                                  </p>
                                </div>
                              )}

                              {/* Form to submit or resubmit */}
                              {(!studentDelivery || studentDelivery.nota === null) && (
                                <form onSubmit={(e) => handleSendAssignment(e, atividade.id, selectedAula.id)} className="space-y-3 pt-2 text-left">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-on-surface">
                                      {studentDelivery ? 'Atualizar minha resposta' : 'Minha resposta'}
                                    </label>

                                    {/* If tipo_entrega is 'texto' or 'multipla' */}
                                    {(atividade.tipo_entrega === 'texto' || atividade.tipo_entrega === 'multipla') && (
                                      <textarea
                                        rows={4}
                                        required={atividade.tipo_entrega === 'texto'}
                                        value={respostaForm[atividade.id] || ''}
                                        onChange={(e) => setRespostaForm(prev => ({ ...prev, [atividade.id]: e.target.value }))}
                                        disabled={submitting}
                                        placeholder="Escreva a solução da sua atividade prática aqui..."
                                        className="product-control text-xs leading-relaxed"
                                      />
                                    )}

                                    {/* If tipo_entrega is 'imagem', 'arquivo' or 'multipla' */}
                                    {(atividade.tipo_entrega === 'imagem' || atividade.tipo_entrega === 'arquivo' || atividade.tipo_entrega === 'multipla') && (
                                      <div className="space-y-3">
                                        {/* Dropzone / File Selection Area */}
                                        {!selectedFiles[atividade.id] ? (
                                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/70 hover:border-primary rounded-product-control p-6 bg-surface-container-low hover:bg-surface-container cursor-pointer transition-all">
                                            <div className="p-2.5 bg-surface-container-lowest rounded-product-control border border-outline-variant/60 shadow-xs text-on-surface-variant group-hover:text-primary">
                                              <HugeiconsIcon icon={Attachment01Icon} size={22} strokeWidth={2} />
                                            </div>
                                            <span className="text-xs font-bold text-on-surface mt-2.5">
                                              {atividade.tipo_entrega === 'imagem' ? 'Fazer upload de Imagem' : 'Fazer upload de Arquivo'}
                                            </span>
                                            <span className="text-[10px] text-on-surface-variant mt-0.5">
                                              {atividade.tipo_entrega === 'imagem' 
                                                ? 'Arraste ou clique para selecionar imagem (PNG, JPG, etc.)' 
                                                : 'Arraste ou clique para selecionar arquivo (PDF, ZIP, DOCX, etc.)'}
                                            </span>
                                            <input
                                              type="file"
                                              className="hidden"
                                              accept={atividade.tipo_entrega === 'imagem' ? "image/*" : "*/*"}
                                              onChange={(e) => handleFileChange(e, atividade.id)}
                                              disabled={submitting}
                                            />
                                          </label>
                                        ) : (
                                          <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant/60 p-3 rounded-product-control shadow-xs">
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                              {selectedFilePreviews[atividade.id] ? (
                                                <img 
                                                  src={selectedFilePreviews[atividade.id]} 
                                                  alt="Preview" 
                                                  className="w-10 h-10 rounded-product-control object-cover border border-outline-variant/60 shrink-0" 
                                                />
                                              ) : (
                                                <div className="w-10 h-10 rounded-product-control bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                                                  <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={2} />
                                                </div>
                                              )}
                                              <div className="text-left overflow-hidden">
                                                <span className="text-xs font-bold text-on-surface block truncate">{selectedFiles[atividade.id].name}</span>
                                                <span className="text-[10px] text-on-surface-variant block">{(selectedFiles[atividade.id].size / 1024 / 1024).toFixed(2)} MB</span>
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveFile(atividade.id)}
                                              disabled={submitting}
                                              className="product-icon-action !h-7 !w-7 text-error hover:bg-error/10"
                                              title="Remover arquivo"
                                            >
                                              <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2} />
                                            </button>
                                          </div>
                                        )}

                                        {/* Fallback Text Input for image link, ONLY if tipo_entrega is 'imagem' */}
                                        {atividade.tipo_entrega === 'imagem' && !selectedFiles[atividade.id] && (
                                          <div className="flex flex-col gap-1 pt-1">
                                            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block text-center">Ou cole um link público da imagem</span>
                                            <input
                                              type="url"
                                              value={respostaForm[atividade.id] || ''}
                                              onChange={(e) => setRespostaForm(prev => ({ ...prev, [atividade.id]: e.target.value }))}
                                              disabled={submitting}
                                              placeholder="https://exemplo.com/imagem.png"
                                              className="product-control text-xs"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={submitting}
                                    className="product-primary-action text-xs"
                                  >
                                    <HugeiconsIcon icon={Task01Icon} size={15} strokeWidth={2} />
                                    <span>{submitting ? 'Enviando...' : (studentDelivery ? 'Reenviar Resposta' : 'Enviar Resposta')}</span>
                                  </button>
                                </form>
                              )}
                           </div>
                         );
                       })}
                     </div>
                   ) : (
                     /* Regular class without activity: can mark as read/complete directly */
                     <div className="border-t border-outline-variant/60 pt-5 flex justify-end">
                       {!progresso.some(p => p.aula_id === selectedAula.id) ? (
                         <button
                           onClick={() => handleMarkAsCompleted(selectedAula.id)}
                           className="product-primary-action text-xs"
                         >
                           <HugeiconsIcon icon={Tick01Icon} size={16} strokeWidth={2} />
                           <span>Marcar Aula como Concluída</span>
                         </button>
                       ) : (
                         <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-product-control">
                           <HugeiconsIcon icon={Tick01Icon} size={15} strokeWidth={2} />
                           <span>Você concluiu esta aula!</span>
                         </div>
                       )}
                     </div>
                   )}
                 </>
               )}

            </div>
          ) : (
            <div className="product-empty-state space-y-3 p-12">
              <HugeiconsIcon icon={BookOpen01Icon} size={40} className="mx-auto text-primary" strokeWidth={2} />
              <p className="font-heading font-extrabold text-sm text-on-surface">Selecione uma aula à esquerda</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
