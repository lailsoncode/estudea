import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon, Copy01Icon, SparklesIcon, Upload01Icon } from '@hugeicons/core-free-icons';
import { supabase } from '../lib/supabaseClient';

type Course = { id: string; titulo: string; descricao: string | null };
type ClassGroup = { id: string; nome: string; curso_id: string | null };
type Lesson = { id: string; titulo: string; conteudo: string; numero_aula: number; ordem: number; modulo_id: string | null };
type Module = { id: string; titulo: string; ordem: number };

type PtdLesson = {
  aulaId?: string;
  titulo: string;
  data: string;
  inicio: string;
  fim: string;
  tipo: string;
  atividades: string;
  odas: string;
  registro: string;
  marcasFormativas: string[];
};

type PtdDraft = {
  situacaoAprendizagem: string;
  conhecimentos: string;
  habilidades: string;
  atitudesValores: string;
  indicadores: string[];
  aulas: PtdLesson[];
};

const marcasFormativas = ['Domínio técnico-científico', 'Visão crítica', 'Criatividade e atitude empreendedora', 'Atitude sustentável', 'Colaboração e comunicação', 'Autonomia digital'];
const emptyDraft: PtdDraft = { situacaoAprendizagem: '', conhecimentos: '', habilidades: '', atitudesValores: '', indicadores: [], aulas: [] };

const CopyBlock: React.FC<{ label: string; value: string; onCopy: () => void }> = ({ label, value, onCopy }) => (
  <button
    type="button"
    onClick={onCopy}
    className="group w-full rounded-product-control border border-outline-variant/60 bg-surface-container-low p-3.5 text-left transition hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
  >
    <span className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
      <span>{label}</span>
      <HugeiconsIcon icon={Copy01Icon} size={14} className="opacity-50 transition group-hover:text-primary group-hover:opacity-100" strokeWidth={2} />
    </span>
    <span className="block whitespace-pre-wrap text-xs leading-relaxed text-on-surface font-medium">{value || 'Ainda não gerado.'}</span>
  </button>
);

const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
  reader.readAsDataURL(file);
});

const normalizeDraft = (value: Partial<PtdDraft>, lessons: Lesson[]): PtdDraft => ({
  situacaoAprendizagem: value.situacaoAprendizagem || '',
  conhecimentos: value.conhecimentos || '',
  habilidades: value.habilidades || '',
  atitudesValores: value.atitudesValores || '',
  indicadores: Array.isArray(value.indicadores) ? value.indicadores.filter(Boolean) : [],
  aulas: lessons.map((lesson, index) => {
    const generated = value.aulas?.[index];
    return {
      aulaId: lesson.id,
      titulo: generated?.titulo || lesson.titulo,
      data: generated?.data || '', inicio: generated?.inicio || '', fim: generated?.fim || '',
      tipo: generated?.tipo || 'Presencial',
      atividades: generated?.atividades || lesson.conteudo?.slice(0, 500) || '',
      odas: generated?.odas || '', registro: generated?.registro || '',
      marcasFormativas: Array.isArray(generated?.marcasFormativas)
        ? generated.marcasFormativas
        : [((generated as PtdLesson & { marcaFormativa?: string })?.marcaFormativa || marcasFormativas[index % marcasFormativas.length])],
    };
  }),
});

export const PlanoTrabalhoDocente: React.FC<{ teacherId: string }> = ({ teacherId }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courseId, setCourseId] = useState('');
  const [classId, setClassId] = useState('');
  const [courseInfo, setCourseInfo] = useState({ inicio: '', termino: '', horario: '', instrutor: '', supervisor: '' });
  const [draft, setDraft] = useState<PtdDraft>(emptyDraft);
  const [planId, setPlanId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCourse = useMemo(() => courses.find(course => course.id === courseId), [courses, courseId]);
  const selectedClass = useMemo(() => classes.find(item => item.id === classId), [classes, classId]);

  useEffect(() => {
    const loadInitial = async () => {
      const [{ data: courseData, error: courseError }, { data: classData, error: classError }] = await Promise.all([
        supabase.from('cursos').select('id, titulo, descricao').order('titulo'),
        supabase.from('turmas').select('id, nome, curso_id').order('nome'),
      ]);
      if (courseError || classError) setFeedback({ type: 'error', text: 'Não foi possível carregar cursos e turmas.' });
      setCourses((courseData || []) as Course[]);
      setClasses((classData || []) as ClassGroup[]);
    };
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedClass?.curso_id && selectedClass.curso_id !== courseId) setCourseId(selectedClass.curso_id);
  }, [selectedClass, courseId]);

  useEffect(() => {
    const loadLessons = async () => {
      if (!courseId) { setLessons([]); setDraft(emptyDraft); setPlanId(null); return; }
      const { data: modules, error: modulesError } = await supabase.from('modulos').select('id, titulo, ordem').eq('curso_id', courseId).order('ordem');
      if (modulesError) { setFeedback({ type: 'error', text: 'Não foi possível carregar as aulas da unidade.' }); return; }
      const moduleRows = (modules || []) as Module[];
      if (!moduleRows.length) { setLessons([]); setDraft(emptyDraft); return; }
      const { data, error } = await supabase.from('aulas').select('id, titulo, conteudo, numero_aula, ordem, modulo_id').in('modulo_id', moduleRows.map(item => item.id)).order('numero_aula');
      if (error) { setFeedback({ type: 'error', text: 'Não foi possível carregar as aulas da unidade.' }); return; }
      const ordered = [...((data || []) as Lesson[])].sort((a, b) => (moduleRows.find(m => m.id === a.modulo_id)?.ordem || 0) - (moduleRows.find(m => m.id === b.modulo_id)?.ordem || 0) || a.ordem - b.ordem);
      setLessons(ordered);
      setDraft(current => normalizeDraft(current, ordered));
    };
    loadLessons();
  }, [courseId]);

  useEffect(() => {
    const loadSavedDraft = async () => {
      if (!courseId || !lessons.length) return;
      const baseQuery = supabase
        .from('ptd_planos')
        .select('id, dados')
        .eq('professor_id', teacherId)
        .eq('curso_id', courseId)
        .order('updated_at', { ascending: false })
        .limit(1);
      const { data, error } = classId
        ? await baseQuery.eq('turma_id', classId).maybeSingle()
        : await baseQuery.is('turma_id', null).maybeSingle();
      if (error || !data) { setPlanId(null); return; }
      const saved = (data.dados || {}) as { courseInfo?: typeof courseInfo; draft?: Partial<PtdDraft> };
      if (saved.courseInfo) setCourseInfo(saved.courseInfo);
      if (saved.draft) setDraft(normalizeDraft(saved.draft, lessons));
      setPlanId(data.id);
      setFeedback({ type: 'success', text: 'Rascunho salvo carregado.' });
    };
    loadSavedDraft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, classId, lessons.length, teacherId]);

  useEffect(() => {
    if (!planId || isGenerating || !draft.aulas.some(item => item.atividades || item.registro)) return;
    const timer = window.setTimeout(() => {
      supabase.from('ptd_planos').update({ dados: { courseInfo, draft } }).eq('id', planId).then(({ error }) => {
        if (error) console.error('Erro ao salvar automaticamente o PTD:', error);
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [courseInfo, draft, isGenerating, planId]);

  const updateLesson = (index: number, key: keyof PtdLesson, value: string) => setDraft(current => ({ ...current, aulas: current.aulas.map((lesson, lessonIndex) => lessonIndex === index ? { ...lesson, [key]: value } : lesson) }));

  const createPrompt = (lessonBatch: Lesson[]) => JSON.stringify({
    unidade_curricular: selectedCourse?.titulo, descricao_unidade: selectedCourse?.descricao,
    turma: selectedClass?.nome || null, periodo: courseInfo,
    aulas: lessonBatch.map(lesson => ({ numero: lessons.findIndex(item => item.id === lesson.id) + 1, titulo: lesson.titulo, conteudo: lesson.conteudo })),
  });

  const invokeGeneration = async (lessonBatch: Lesson[], document?: { name: string; mimeType: string; data: string }, attempt = 0): Promise<Partial<PtdDraft>> => {
      const { data, error } = await supabase.functions.invoke('gemini-generate', { body: { mode: 'ptd', input: createPrompt(lessonBatch), document } });
      if (error) {
        let detail = error.message;
        const response = (error as { context?: Response }).context;
        if (response) {
          const payload = await response.clone().json().catch(() => null) as { error?: string } | null;
          const messages: Record<string, string> = {
            invalid_payload: 'A função publicada ainda não reconhece o gerador de PTD.',
            invalid_document: 'O documento não pôde ser processado. Tente um PDF ou TXT de até 8 MB.',
            not_authenticated: 'Sua sessão expirou. Entre novamente na plataforma.',
            forbidden: 'Seu perfil não possui permissão de professor para usar a IA.',
            server_not_configured: 'A chave do Gemini não está configurada no Supabase.',
          };
          if (payload?.error?.startsWith('generation_incomplete_') && attempt < 1) return invokeGeneration(lessonBatch, document, attempt + 1);
          detail = messages[payload?.error || ''] || payload?.error || detail;
        }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      const raw = String(data?.text || '').replace(/^```json\s*|```$/g, '').trim();
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace < 0 || lastBrace <= firstBrace) {
        if (attempt < 1) return invokeGeneration(lessonBatch, document, attempt + 1);
        throw new Error('A IA não concluiu este bloco após duas tentativas.');
      }
      try { return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as Partial<PtdDraft>; }
      catch {
        if (attempt < 1) return invokeGeneration(lessonBatch, document, attempt + 1);
        throw new Error('A IA devolveu um bloco incompleto após duas tentativas.');
      }
  };

  const persistDraft = async (nextDraft: PtdDraft, showMessage = true) => {
    if (!courseId) return false;
    setIsSaving(true);
    const payload = { professor_id: teacherId, curso_id: courseId, turma_id: classId || null, titulo: `PTD — ${selectedCourse?.titulo || 'Unidade curricular'}`, dados: { courseInfo, draft: nextDraft } };
    const query = planId ? supabase.from('ptd_planos').update(payload).eq('id', planId).select('id').single() : supabase.from('ptd_planos').insert(payload).select('id').single();
    const { data, error } = await query;
    setIsSaving(false);
    if (error) { setFeedback({ type: 'error', text: 'O PTD foi gerado, mas não pôde ser armazenado.' }); return false; }
    setPlanId((data as { id: string }).id);
    if (showMessage) setFeedback({ type: 'success', text: 'PTD armazenado. Clique em qualquer conteúdo para copiar.' });
    return true;
  };

  const generate = async () => {
    if (!courseId || !lessons.length) { setFeedback({ type: 'error', text: 'Selecione uma unidade curricular com aulas cadastradas.' }); return; }
    if (file && file.size > 8 * 1024 * 1024) { setFeedback({ type: 'error', text: 'Envie um arquivo de até 8 MB.' }); return; }
    setIsGenerating(true); setFeedback(null);
    try {
      const document = file ? { name: file.name, mimeType: file.type || 'application/octet-stream', data: await toBase64(file) } : undefined;
      const batches: Lesson[][] = [];
      for (let index = 0; index < lessons.length; index += 3) batches.push(lessons.slice(index, index + 3));
      setGenerationProgress(`Gerando bloco 1 de ${batches.length}...`);
      const first = await invokeGeneration(batches[0], document);
      const generatedLessons = normalizeDraft(first, batches[0]).aulas;
      for (let start = 1; start < batches.length; start += 2) {
        const group = batches.slice(start, start + 2);
        setGenerationProgress(`Gerando blocos ${start + 1}–${Math.min(start + group.length, batches.length)} de ${batches.length}...`);
        const results = await Promise.all(group.map(batch => invokeGeneration(batch)));
        results.forEach((result, index) => generatedLessons.push(...normalizeDraft(result, group[index]).aulas));
      }
      const nextDraft: PtdDraft = { ...normalizeDraft(first, batches[0]), aulas: generatedLessons };
      setDraft(nextDraft);
      await persistDraft(nextDraft);
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível gerar o PTD.' });
    } finally { setIsGenerating(false); setGenerationProgress(''); }
  };

  const generateLesson = async (lessonIndex: number) => {
    setIsGenerating(true); setGenerationProgress(`Atualizando aula ${lessonIndex + 1}...`); setFeedback(null);
    try {
      const result = await invokeGeneration([lessons[lessonIndex]]);
      const generated = normalizeDraft(result, [lessons[lessonIndex]]).aulas[0];
      const nextDraft = { ...draft, aulas: draft.aulas.map((item, index) => index === lessonIndex ? { ...generated, data: item.data, inicio: item.inicio, fim: item.fim, tipo: item.tipo } : item) };
      setDraft(nextDraft);
      await persistDraft(nextDraft);
    } catch (error) { setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível atualizar a aula.' }); }
    finally { setIsGenerating(false); setGenerationProgress(''); }
  };

  const copy = async (text: string, label = 'Conteúdo copiado.') => {
    try { await navigator.clipboard.writeText(text); setFeedback({ type: 'success', text: label }); }
    catch { setFeedback({ type: 'error', text: 'Não foi possível copiar automaticamente.' }); }
  };

  const copyAll = () => copy([
    `SITUAÇÃO DE APRENDIZAGEM\n${draft.situacaoAprendizagem}`,
    `CONHECIMENTOS\n${draft.conhecimentos}`, `HABILIDADES\n${draft.habilidades}`, `ATITUDES/VALORES\n${draft.atitudesValores}`,
    `INDICADORES\n${draft.indicadores.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
    `AULAS\n${draft.aulas.map((lesson, index) => `${index + 1}. ${lesson.titulo}\nData: ${lesson.data} | ${lesson.inicio}–${lesson.fim} | ${lesson.tipo}\nAtividades: ${lesson.atividades}\nODAs: ${lesson.odas}\nRegistro: ${lesson.registro}\nMarcas formativas: ${lesson.marcasFormativas.join(', ')}`).join('\n\n')}`,
  ].join('\n\n'), 'PTD completo copiado.');

  return (
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      
      {/* Header Panel */}
      <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="product-section-kicker">Planejamento Pedagógico</span>
          <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">Plano de Trabalho Docente (PTD)</h1>
          <p className="product-subtitle">Um PTD estruturado por unidade curricular com apoio de IA. Clique em qualquer bloco para copiar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center text-xs font-semibold text-on-surface-variant mr-2">
            {isSaving ? 'Armazenando...' : planId ? 'Salvo automaticamente' : 'Ainda não gerado'}
          </span>
          <button
            onClick={copyAll}
            disabled={!draft.aulas.length}
            className="product-primary-action text-xs"
          >
            <HugeiconsIcon icon={Copy01Icon} size={15} strokeWidth={2} />
            <span>Copiar PTD Completo</span>
          </button>
        </div>
      </header>

      {feedback && (
        <div className={`p-4 rounded-product-control text-xs font-semibold flex items-center gap-2 border ${
          feedback.type === 'error' ? 'bg-error/10 border-error/20 text-error' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
        }`}>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 1. Contexto da Unidade */}
      <section className="product-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-3">
          <HugeiconsIcon icon={BookOpen01Icon} size={18} className="text-primary" strokeWidth={2} />
          <h2 className="font-heading font-extrabold text-sm text-on-surface">1. Contexto da Unidade Curricular</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
            Turma
            <select className="product-control text-xs" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Selecione (opcional)</option>
              {classes.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
            Unidade Curricular
            <select className="product-control text-xs" value={courseId} onChange={e => setCourseId(e.target.value)}>
              <option value="">Selecione a unidade</option>
              {courses.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
            Instrutor(a)
            <input className="product-control text-xs" value={courseInfo.instrutor} onChange={e => setCourseInfo({ ...courseInfo, instrutor: e.target.value })} placeholder="Nome do docente" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
            Data de Início
            <input type="date" className="product-control text-xs" value={courseInfo.inicio} onChange={e => setCourseInfo({ ...courseInfo, inicio: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
            Data de Término
            <input type="date" className="product-control text-xs" value={courseInfo.termino} onChange={e => setCourseInfo({ ...courseInfo, termino: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
            Horário
            <input className="product-control text-xs" value={courseInfo.horario} onChange={e => setCourseInfo({ ...courseInfo, horario: e.target.value })} placeholder="Ex.: 08h às 12h" />
          </label>
        </div>
      </section>

      {/* 2. Gerar com IA */}
      <section className="product-card p-4 sm:p-5 bg-gradient-to-br from-primary/10 via-surface-container-lowest to-secondary/10 border border-primary/20 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-sm text-on-surface flex items-center gap-2">
              <HugeiconsIcon icon={SparklesIcon} size={18} className="text-primary animate-pulse" />
              <span>2. Gerador com IA</span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5 font-medium">Gera relatos objetivos para todas as aulas e armazena o resultado automaticamente.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} className="hidden" type="file" accept=".pdf,.doc,.docx,.txt,.md,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
            <button
              onClick={() => fileRef.current?.click()}
              className="product-secondary-action text-xs"
            >
              <HugeiconsIcon icon={Upload01Icon} size={15} strokeWidth={2} />
              <span>{file ? 'Trocar documento' : 'Anexar Plano/PDF'}</span>
            </button>
            <button
              onClick={generate}
              disabled={isGenerating || !courseId}
              className="product-primary-action text-xs"
            >
              <HugeiconsIcon icon={SparklesIcon} size={15} strokeWidth={2} />
              <span>{isGenerating ? generationProgress || 'Gerando...' : planId ? 'Atualizar PTD Completo' : 'Gerar PTD Completo'}</span>
            </button>
          </div>
        </div>
        {file && <p className="text-xs text-primary font-semibold">Anexo carregado: {file.name}</p>}
      </section>

      {/* 3. Situação de Aprendizagem e Competências */}
      <section className="product-card p-4 sm:p-5 space-y-4">
        <div className="border-b border-outline-variant/60 pb-3">
          <h2 className="font-heading font-extrabold text-sm text-on-surface">3. Situação de Aprendizagem e Competências</h2>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">Conteúdos armazenados. Clique em um bloco para copiar somente aquele campo.</p>
        </div>
        <CopyBlock label="Situação de Aprendizagem" value={draft.situacaoAprendizagem} onCopy={() => copy(draft.situacaoAprendizagem, 'Situação de aprendizagem copiada.')} />
        <div className="grid md:grid-cols-3 gap-3">
          <CopyBlock label="Conhecimentos" value={draft.conhecimentos} onCopy={() => copy(draft.conhecimentos)} />
          <CopyBlock label="Habilidades" value={draft.habilidades} onCopy={() => copy(draft.habilidades)} />
          <CopyBlock label="Atitudes / Valores" value={draft.atitudesValores} onCopy={() => copy(draft.atitudesValores)} />
        </div>
        <CopyBlock label="Indicadores" value={draft.indicadores.map((item, index) => `${index + 1}. ${item}`).join('\n')} onCopy={() => copy(draft.indicadores.join('\n'), 'Indicadores copiados.')} />
      </section>

      {/* 4. Relatos Aula a Aula */}
      <section className="product-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
          <div>
            <h2 className="font-heading font-extrabold text-sm text-on-surface">4. Relatos Aula a Aula</h2>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">Você pode preparar tudo antes ou atualizar somente uma aula depois de ministrá-la.</p>
          </div>
          <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-[10px] font-extrabold">{draft.aulas.length} Aulas</span>
        </div>
        
        <div className="space-y-4">
          {draft.aulas.map((lesson, index) => (
            <article key={lesson.aulaId || index} className="rounded-product-control border border-outline-variant/60 p-4 bg-surface-container-low space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/50 pb-2.5">
                <h3 className="font-heading font-extrabold text-xs text-on-surface">Aula {index + 1} · {lesson.titulo}</h3>
                <div className="flex gap-2">
                  <button
                    disabled={isGenerating}
                    className="product-secondary-action text-xs !min-h-7 !px-2.5"
                    onClick={() => generateLesson(index)}
                  >
                    <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={2} />
                    <span>Atualizar Esta Aula</span>
                  </button>
                  <button
                    className="product-icon-action !h-7 !w-7"
                    onClick={() => copy(`Data: ${lesson.data}\nAtividades: ${lesson.atividades}\nODAs: ${lesson.odas}\nRegistro: ${lesson.registro}\nMarcas formativas: ${lesson.marcasFormativas.join(', ')}`, 'Aula copiada.')}
                    title="Copiar dados da aula"
                  >
                    <HugeiconsIcon icon={Copy01Icon} size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
                  Data
                  <input type="date" className="product-control text-xs" value={lesson.data} onChange={e => updateLesson(index, 'data', e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
                  Horário Início
                  <input type="time" className="product-control text-xs" value={lesson.inicio} onChange={e => updateLesson(index, 'inicio', e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
                  Horário Fim
                  <input type="time" className="product-control text-xs" value={lesson.fim} onChange={e => updateLesson(index, 'fim', e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-on-surface">
                  Tipo da Aula
                  <select className="product-control text-xs" value={lesson.tipo} onChange={e => updateLesson(index, 'tipo', e.target.value)}>
                    <option>Presencial</option>
                    <option>Remota</option>
                    <option>Híbrida</option>
                  </select>
                </label>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <CopyBlock label="Atividades" value={lesson.atividades} onCopy={() => copy(lesson.atividades, 'Atividades copiadas.')} />
                <CopyBlock label="ODAs" value={lesson.odas} onCopy={() => copy(lesson.odas, 'ODAs copiados.')} />
                <CopyBlock label="Registro Participação / Avaliação" value={lesson.registro} onCopy={() => copy(lesson.registro, 'Registro copiado.')} />
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block mb-1.5">Marcas Formativas Sugeridas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {lesson.marcasFormativas.map(marca => (
                    <button
                      key={marca}
                      onClick={() => copy(marca, 'Marca formativa copiada.')}
                      className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {marca}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!courseId && <p className="py-8 text-center text-xs text-on-surface-variant font-medium">Selecione uma unidade curricular para listar as aulas.</p>}
      </section>
    </div>
  );
};
