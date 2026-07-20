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
  <button type="button" onClick={onCopy} className="group w-full rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 text-left transition hover:border-primary/50 hover:bg-primary/5">
    <span className="mb-2 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}<HugeiconsIcon icon={Copy01Icon} size={16} className="opacity-50 transition group-hover:text-primary group-hover:opacity-100" /></span>
    <span className="block whitespace-pre-wrap text-sm leading-relaxed text-on-surface">{value || 'Ainda não gerado.'}</span>
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
  // A saved draft is intentionally loaded only when its context changes.
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

  return <div className="space-y-6 pb-10">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div><div className="flex items-center gap-2 text-primary"><HugeiconsIcon icon={SparklesIcon} size={22} /><span className="font-bold text-sm">Planejamento inteligente</span></div><h1 className="mt-1 text-headline-lg font-heading font-extrabold text-on-surface">Plano de Trabalho Docente</h1><p className="mt-1 text-on-surface-variant">Um PTD armazenado por unidade curricular. Clique em qualquer conteúdo para copiar.</p></div>
      <div className="flex flex-wrap gap-2"><span className="inline-flex items-center text-sm font-semibold text-on-surface-variant">{isSaving ? 'Armazenando...' : planId ? 'Salvo automaticamente' : 'Ainda não gerado'}</span><button onClick={copyAll} disabled={!draft.aulas.length} className="app-button-primary"><HugeiconsIcon icon={Copy01Icon} size={17} />Copiar PTD</button></div>
    </div>

    {feedback && <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${feedback.type === 'error' ? 'bg-error/10 border-error/20 text-error' : 'bg-primary/10 border-primary/20 text-primary'}`}>{feedback.text}</div>}

    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4"><HugeiconsIcon icon={BookOpen01Icon} size={20} className="text-primary" /><h2 className="font-heading font-bold text-on-surface">1. Contexto da unidade</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <label className="app-field-label">Turma<select className="app-input mt-1" value={classId} onChange={e => setClassId(e.target.value)}><option value="">Selecione (opcional)</option>{classes.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label className="app-field-label">Unidade curricular<select className="app-input mt-1" value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">Selecione a unidade</option>{courses.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select></label>
        <label className="app-field-label">Instrutor(a)<input className="app-input mt-1" value={courseInfo.instrutor} onChange={e => setCourseInfo({ ...courseInfo, instrutor: e.target.value })} placeholder="Nome do docente" /></label>
        <label className="app-field-label">Data de início<input type="date" className="app-input mt-1" value={courseInfo.inicio} onChange={e => setCourseInfo({ ...courseInfo, inicio: e.target.value })} /></label>
        <label className="app-field-label">Data de término<input type="date" className="app-input mt-1" value={courseInfo.termino} onChange={e => setCourseInfo({ ...courseInfo, termino: e.target.value })} /></label>
        <label className="app-field-label">Horário<input className="app-input mt-1" value={courseInfo.horario} onChange={e => setCourseInfo({ ...courseInfo, horario: e.target.value })} placeholder="Ex.: 08h às 12h" /></label>
      </div>
    </section>

    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h2 className="font-heading font-bold text-on-surface">2. Gerar com IA</h2><p className="text-sm text-on-surface-variant mt-1">Gera relatos objetivos para todas as aulas e armazena o resultado automaticamente.</p></div><div className="flex items-center gap-2"><input ref={fileRef} className="hidden" type="file" accept=".pdf,.doc,.docx,.txt,.md,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /><button onClick={() => fileRef.current?.click()} className="app-button-secondary"><HugeiconsIcon icon={Upload01Icon} size={17} />{file ? 'Trocar documento' : 'Anexar documento'}</button><button onClick={generate} disabled={isGenerating || !courseId} className="app-button-primary"><HugeiconsIcon icon={SparklesIcon} size={17} />{isGenerating ? generationProgress || 'Gerando...' : planId ? 'Atualizar PTD completo' : 'Gerar PTD completo'}</button></div></div>
      {file && <p className="mt-3 text-sm text-primary font-semibold">Anexo: {file.name}</p>}
    </section>

    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 space-y-4">
      <div><h2 className="font-heading font-bold text-on-surface">3. Situação de aprendizagem e competências</h2><p className="text-sm text-on-surface-variant">Conteúdos armazenados. Clique em um bloco para copiar somente aquele campo.</p></div>
      <CopyBlock label="Situação de aprendizagem" value={draft.situacaoAprendizagem} onCopy={() => copy(draft.situacaoAprendizagem, 'Situação de aprendizagem copiada.')} />
      <div className="grid md:grid-cols-3 gap-4"><CopyBlock label="Conhecimentos" value={draft.conhecimentos} onCopy={() => copy(draft.conhecimentos)} /><CopyBlock label="Habilidades" value={draft.habilidades} onCopy={() => copy(draft.habilidades)} /><CopyBlock label="Atitudes/Valores" value={draft.atitudesValores} onCopy={() => copy(draft.atitudesValores)} /></div>
      <CopyBlock label="Indicadores" value={draft.indicadores.map((item, index) => `${index + 1}. ${item}`).join('\n')} onCopy={() => copy(draft.indicadores.join('\n'), 'Indicadores copiados.')} />
    </section>

    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5">
      <div className="flex items-center justify-between gap-3 mb-5"><div><h2 className="font-heading font-bold text-on-surface">4. Relatos aula a aula</h2><p className="text-sm text-on-surface-variant">Você pode preparar tudo antes ou atualizar somente uma aula depois de ministrá-la.</p></div><span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-bold">{draft.aulas.length} aulas</span></div>
      <div className="space-y-4">{draft.aulas.map((lesson, index) => <article key={lesson.aulaId || index} className="rounded-xl border border-outline-variant/30 p-4 bg-surface-container-low">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3"><h3 className="font-bold text-on-surface">Aula {index + 1} · {lesson.titulo}</h3><div className="flex gap-2"><button disabled={isGenerating} className="app-button-secondary !px-3 !py-2" onClick={() => generateLesson(index)}><HugeiconsIcon icon={SparklesIcon} size={16} />Atualizar esta aula</button><button className="app-icon-button" onClick={() => copy(`Data: ${lesson.data}\nAtividades: ${lesson.atividades}\nODAs: ${lesson.odas}\nRegistro: ${lesson.registro}\nMarcas formativas: ${lesson.marcasFormativas.join(', ')}`, 'Aula copiada.')}><HugeiconsIcon icon={Copy01Icon} size={17} /></button></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"><label className="app-field-label">Data<input type="date" className="app-input mt-1" value={lesson.data} onChange={e => updateLesson(index, 'data', e.target.value)} /></label><label className="app-field-label">Horário início<input type="time" className="app-input mt-1" value={lesson.inicio} onChange={e => updateLesson(index, 'inicio', e.target.value)} /></label><label className="app-field-label">Horário fim<input type="time" className="app-input mt-1" value={lesson.fim} onChange={e => updateLesson(index, 'fim', e.target.value)} /></label><label className="app-field-label">Tipo da aula<select className="app-input mt-1" value={lesson.tipo} onChange={e => updateLesson(index, 'tipo', e.target.value)}><option>Presencial</option><option>Remota</option><option>Híbrida</option></select></label></div>
        <div className="grid md:grid-cols-3 gap-3 mt-3"><CopyBlock label="Atividades" value={lesson.atividades} onCopy={() => copy(lesson.atividades, 'Atividades copiadas.')} /><CopyBlock label="ODAs" value={lesson.odas} onCopy={() => copy(lesson.odas, 'ODAs copiados.')} /><CopyBlock label="Registro participação/avaliação" value={lesson.registro} onCopy={() => copy(lesson.registro, 'Registro copiado.')} /></div>
        <div className="mt-3"><span className="app-field-label">Marcas formativas sugeridas</span><div className="mt-2 flex flex-wrap gap-2">{lesson.marcasFormativas.map(marca => <button key={marca} onClick={() => copy(marca, 'Marca formativa copiada.')} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20">{marca}</button>)}</div></div>
      </article>)}</div>
      {!courseId && <p className="py-8 text-center text-on-surface-variant">Selecione uma unidade curricular para listar as aulas.</p>}
    </section>
  </div>;
};
