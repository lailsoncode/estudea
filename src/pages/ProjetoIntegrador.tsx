import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  TaskDone01Icon,
  Calendar01Icon,
  Upload01Icon,
  LinkSquare01Icon,
  TextIcon,
  Award01Icon,
  UserGroupIcon,
  Alert01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  FileAttachmentIcon,
  Edit01Icon,
  StarIcon,
  ChartHistogramIcon,
  Cancel01Icon,
  Rocket01Icon,
  BriefcaseIcon,
} from '@hugeicons/core-free-icons';

interface ProjetoIntegradorProps {
  session: any;
}

interface PI {
  id: string;
  curso_id: string;
  titulo: string;
  descricao: string | null;
  tipo: 'individual' | 'grupo';
  xp_por_entrega: number;
  nota_minima_xp: number;
  ativo: boolean;
}

interface EntregaDef {
  id: string;
  projeto_id: string;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  peso: number;
  ordem: number;
  aceita_arquivo: boolean;
  aceita_link: boolean;
  aceita_texto: boolean;
}

interface Submissao {
  id: string;
  entrega_def_id: string;
  aluno_id: string | null;
  grupo_id: string | null;
  descricao: string | null;
  arquivo_url: string | null;
  link_url: string | null;
  nota: number | null;
  feedback_professor: string | null;
  status: string;
  xp_concedido: boolean;
}

interface Grupo {
  id: string;
  nome: string;
  projeto_id: string;
  turma_id: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pendente: { label: 'Pendente', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30', dot: 'bg-amber-500' },
  enviada: { label: 'Enviada', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30', dot: 'bg-blue-500' },
  avaliada: { label: 'Avaliada', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30', dot: 'bg-green-500' },
  revisao: { label: 'Em Revisão', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/30', dot: 'bg-orange-500' },
};

const formatDate = (d: string | null) => {
  if (!d) return null;
  return new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isOverdue = (prazo: string | null) => {
  if (!prazo) return false;
  return new Date(prazo) < new Date();
};

export const ProjetoIntegrador: React.FC<ProjetoIntegradorProps> = ({ session }) => {
  const userId = session?.user?.id;

  const [pi, setPi] = useState<PI | null>(null);
  const [entregas, setEntregas] = useState<EntregaDef[]>([]);
  const [submissoes, setSubmissoes] = useState<Submissao[]>([]);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [membros, setMembros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de submissão
  const [modalEntrega, setModalEntrega] = useState<EntregaDef | null>(null);
  const [formDescricao, setFormDescricao] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mídias Digitais Custom Template States
  const [activeTab, setActiveTab] = useState<'etapas' | 'ficha'>('etapas');
  const [cursoTitulo, setCursoTitulo] = useState<string>('');
  const [marcaDetalhes, setMarcaDetalhes] = useState<any | null>(null);
  const [loadingMarca, setLoadingMarca] = useState(false);
  const [savingMarca, setSavingMarca] = useState(false);
  const [marcaError, setMarcaError] = useState<string | null>(null);
  const [marcaSuccess, setMarcaSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'id' | 'publico' | 'diag' | 'pos' | null>('id');

  const defaultCanais = [
    { canal: 'Instagram', url: '' },
    { canal: 'Facebook', url: '' },
    { canal: 'Google Meu Negócio', url: '' },
    { canal: 'WhatsApp', url: '' },
    { canal: 'Website', url: '' },
    { canal: 'TikTok / YouTube', url: '' },
  ];

  const [formMarca, setFormMarca] = useState<any>({
    nome_marca: '',
    segmento: '',
    justificativa: '',
    canais_digitais: defaultCanais,
    publico_alvo: '',
    persona_nome: '',
    persona_idade: '',
    persona_dores: '',
    persona_desejos: '',
    persona_necessidades: '',
    persona_comportamento: '',
    pontos_fortes: '',
    pontos_fracos: '',
    oportunidades: '',
    concorrentes: '',
    palavras_chave: '',
    frase_posicionamento: '',
    tom_voz: '',
    projeto_id: '',
  });

  const fetchMarcaDetails = async (projetoId: string, groupId: string | null) => {
    try {
      setLoadingMarca(true);
      let query = supabase
        .from('pi_marca_detalhes')
        .select('*')
        .eq('projeto_id', projetoId);

      if (groupId) {
        query = query.eq('grupo_id', groupId);
      } else {
        query = query.eq('aluno_id', userId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      if (data) {
        setMarcaDetalhes(data);
        setFormMarca({
          nome_marca: data.nome_marca || '',
          segmento: data.segmento || '',
          justificativa: data.justificativa || '',
          canais_digitais: Array.isArray(data.canais_digitais) && data.canais_digitais.length > 0 ? data.canais_digitais : defaultCanais,
          publico_alvo: data.publico_alvo || '',
          persona_nome: data.persona_nome || '',
          persona_idade: data.persona_idade || '',
          persona_dores: data.persona_dores || '',
          persona_desejos: data.persona_desejos || '',
          persona_necessidades: data.persona_necessidades || '',
          persona_comportamento: data.persona_comportamento || '',
          pontos_fortes: data.pontos_fortes || '',
          pontos_fracos: data.pontos_fracos || '',
          oportunidades: data.oportunidades || '',
          concorrentes: data.concorrentes || '',
          palavras_chave: data.palavras_chave || '',
          frase_posicionamento: data.frase_posicionamento || '',
          tom_voz: data.tom_voz || '',
          projeto_id: projetoId,
        });
      } else {
        setMarcaDetalhes(null);
        setFormMarca({
          nome_marca: '',
          segmento: '',
          justificativa: '',
          canais_digitais: defaultCanais,
          publico_alvo: '',
          persona_nome: '',
          persona_idade: '',
          persona_dores: '',
          persona_desejos: '',
          persona_necessidades: '',
          persona_comportamento: '',
          pontos_fortes: '',
          pontos_fracos: '',
          oportunidades: '',
          concorrentes: '',
          palavras_chave: '',
          frase_posicionamento: '',
          tom_voz: '',
          projeto_id: projetoId,
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes da marca:', err);
    } finally {
      setLoadingMarca(false);
    }
  };

  const handleUpdateCanalUrl = (index: number, url: string) => {
    const list = [...formMarca.canais_digitais];
    list[index] = { ...list[index], url };
    setFormMarca({ ...formMarca, canais_digitais: list });
  };

  const handleAddCustomCanal = () => {
    const list = [...formMarca.canais_digitais];
    list.push({ canal: '', url: '' });
    setFormMarca({ ...formMarca, canais_digitais: list });
  };

  const handleRemoveCustomCanal = (index: number) => {
    const list = [...formMarca.canais_digitais];
    list.splice(index, 1);
    setFormMarca({ ...formMarca, canais_digitais: list });
  };

  const handleUpdateCustomCanalName = (index: number, canalName: string) => {
    const list = [...formMarca.canais_digitais];
    list[index] = { ...list[index], canal: canalName };
    setFormMarca({ ...formMarca, canais_digitais: list });
  };

  const handleSaveMarca = async () => {
    if (!pi || !userId) return;
    setSavingMarca(true);
    setMarcaError(null);
    setMarcaSuccess(null);
    try {
      if (!formMarca.nome_marca.trim()) {
        throw new Error('O nome da marca/empresa é obrigatório.');
      }

      const payload: any = {
        projeto_id: pi.id,
        nome_marca: formMarca.nome_marca.trim(),
        segmento: formMarca.segmento.trim() || null,
        justificativa: formMarca.justificativa.trim() || null,
        canais_digitais: formMarca.canais_digitais,
        publico_alvo: formMarca.publico_alvo.trim() || null,
        persona_nome: formMarca.persona_nome.trim() || null,
        persona_idade: formMarca.persona_idade.trim() || null,
        persona_dores: formMarca.persona_dores.trim() || null,
        persona_desejos: formMarca.persona_desejos.trim() || null,
        persona_necessidades: formMarca.persona_necessidades.trim() || null,
        persona_comportamento: formMarca.persona_comportamento.trim() || null,
        pontos_fortes: formMarca.pontos_fortes.trim() || null,
        pontos_fracos: formMarca.pontos_fracos.trim() || null,
        oportunidades: formMarca.oportunidades.trim() || null,
        concorrentes: formMarca.concorrentes.trim() || null,
        palavras_chave: formMarca.palavras_chave.trim() || null,
        frase_posicionamento: formMarca.frase_posicionamento.trim() || null,
        tom_voz: formMarca.tom_voz.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (pi.tipo === 'grupo') {
        if (!grupo) throw new Error('Você precisa estar em um grupo para salvar esta ficha.');
        payload.grupo_id = grupo.id;
      } else {
        payload.aluno_id = userId;
      }

      if (marcaDetalhes?.id) {
        const { error } = await supabase
          .from('pi_marca_detalhes')
          .update(payload)
          .eq('id', marcaDetalhes.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pi_marca_detalhes')
          .insert(payload);
        if (error) throw error;
      }

      setMarcaSuccess('Ficha da Marca salva com sucesso! 🚀');
      await fetchMarcaDetails(pi.id, pi.tipo === 'grupo' ? grupo?.id || null : null);
      setTimeout(() => setMarcaSuccess(null), 3000);
    } catch (err: any) {
      setMarcaError(err.message || 'Falha ao salvar a ficha da marca.');
    } finally {
      setSavingMarca(false);
    }
  };

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('turma_id')
        .eq('id', userId)
        .single();
      if (pErr) throw pErr;
      if (!profile?.turma_id) { setLoading(false); return; }

      const { data: turma, error: tErr } = await supabase
        .from('turmas')
        .select('curso_id')
        .eq('id', profile.turma_id)
        .single();
      if (tErr) throw tErr;
      if (!turma?.curso_id) { setLoading(false); return; }

      const { data: cursoData } = await supabase
        .from('cursos')
        .select('titulo')
        .eq('id', turma.curso_id)
        .single();
      if (cursoData) {
        setCursoTitulo(cursoData.titulo);
      }

      const { data: piData, error: piErr } = await supabase
        .from('projetos_integradores')
        .select('*')
        .eq('curso_id', turma.curso_id)
        .eq('ativo', true)
        .maybeSingle();
      if (piErr) throw piErr;
      if (!piData) { setLoading(false); return; }
      setPi(piData);

      const { data: entregasDef, error: eErr } = await supabase
        .from('pi_entregas_definicoes')
        .select('*')
        .eq('projeto_id', piData.id)
        .order('ordem', { ascending: true });
      if (eErr) throw eErr;
      setEntregas(entregasDef || []);

      let resolvedGroupId: string | null = null;
      if (piData.tipo === 'grupo') {
        const { data: membroData } = await supabase
          .from('pi_grupo_membros')
          .select('grupo_id, pi_grupos(id, nome, projeto_id, turma_id)')
          .eq('aluno_id', userId)
          .maybeSingle();

        if (membroData?.pi_grupos) {
          const g = membroData.pi_grupos as unknown as Grupo;
          setGrupo(g);
          resolvedGroupId = g.id;

          const { data: membrosData } = await supabase
            .from('pi_grupo_membros')
            .select('aluno_id, lider, profiles(nome, avatar_url)')
            .eq('grupo_id', g.id);
          setMembros(membrosData || []);

          const { data: subData } = await supabase
            .from('pi_submissoes')
            .select('*')
            .eq('grupo_id', g.id);
          setSubmissoes(subData || []);
        }
      } else {
        const { data: subData } = await supabase
          .from('pi_submissoes')
          .select('*')
          .eq('aluno_id', userId);
        setSubmissoes(subData || []);
      }

      await fetchMarcaDetails(piData.id, resolvedGroupId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [userId]);

  const getSubmissao = (entregaId: string) =>
    submissoes.find(s => s.entrega_def_id === entregaId) || null;

  const handleOpenModal = (entrega: EntregaDef) => {
    const sub = getSubmissao(entrega.id);
    setModalEntrega(entrega);
    setFormDescricao(sub?.descricao || '');
    setFormLink(sub?.link_url || '');
    setFormFile(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async () => {
    if (!modalEntrega || !userId) return;
    setSubmitting(true);
    try {
      let arquivoUrl: string | null = null;

      if (formFile) {
        const ext = formFile.name.split('.').pop();
        const path = `pi/${userId}/${modalEntrega.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('atividades')
          .upload(path, formFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('atividades').getPublicUrl(path);
        arquivoUrl = urlData.publicUrl;
      }

      const sub = getSubmissao(modalEntrega.id);
      const payload: any = {
        entrega_def_id: modalEntrega.id,
        descricao: formDescricao || null,
        link_url: formLink || null,
        status: 'enviada',
        updated_at: new Date().toISOString(),
      };
      if (arquivoUrl) payload.arquivo_url = arquivoUrl;

      if (pi?.tipo === 'grupo' && grupo) {
        payload.grupo_id = grupo.id;
      } else {
        payload.aluno_id = userId;
      }

      if (sub) {
        const { error: upErr } = await supabase
          .from('pi_submissoes')
          .update(payload)
          .eq('id', sub.id);
        if (upErr) throw upErr;
      } else {
        const { error: inErr } = await supabase
          .from('pi_submissoes')
          .insert(payload);
        if (inErr) throw inErr;
      }

      setSuccessMsg('Entrega enviada com sucesso! 🎉');
      await fetchData();
      setTimeout(() => { setModalEntrega(null); setSuccessMsg(null); }, 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse bg-surface-container-low border border-outline-variant/20 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => (
            <div key={i} className="h-20 animate-pulse bg-surface-container-low border border-outline-variant/20 rounded-xl" />
          ))}
        </div>
        {[0,1,2].map(i => (
          <div key={i} className="h-24 animate-pulse bg-surface-container-low border border-outline-variant/20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!pi) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center">
          <HugeiconsIcon icon={TaskDone01Icon} size={32} className="text-on-surface-variant" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-heading font-black text-lg text-on-surface mb-1">Nenhum Projeto Integrador ativo</h3>
          <p className="text-on-surface-variant text-sm max-w-xs">Seu professor ainda não configurou o Projeto Integrador para este curso.</p>
        </div>
      </div>
    );
  }

  const completedCount = entregas.filter(e => {
    const sub = getSubmissao(e.id);
    return sub && ['enviada', 'avaliada'].includes(sub.status);
  }).length;

  const approvedCount = entregas.filter(e => {
    const sub = getSubmissao(e.id);
    return sub?.status === 'avaliada';
  }).length;

  const progressPercent = entregas.length > 0 ? (completedCount / entregas.length) * 100 : 0;

  const isMidiasDigitais =
    cursoTitulo.toLowerCase().includes('mídia') ||
    cursoTitulo.toLowerCase().includes('midia') ||
    pi.titulo.toLowerCase().includes('mídia') ||
    pi.titulo.toLowerCase().includes('midia');

  const accordionSections = [
    {
      key: 'id' as const,
      number: '01',
      title: 'Identificação da Marca / Empresa',
      subtitle: 'Nome, segmento, justificativa e canais digitais',
      color: 'from-violet-600 to-purple-600',
    },
    {
      key: 'publico' as const,
      number: '02',
      title: 'Público-Alvo e Persona',
      subtitle: 'Perfil de cliente ideal e persona detalhada',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      key: 'diag' as const,
      number: '03',
      title: 'Diagnóstico e Concorrência',
      subtitle: 'Pontos fortes, fracos, oportunidades e concorrentes',
      color: 'from-rose-600 to-orange-600',
    },
    {
      key: 'pos' as const,
      number: '04',
      title: 'Posicionamento e Identidade Digital',
      subtitle: 'Palavras-chave, frase de posicionamento e tom de voz',
      color: 'from-green-600 to-teal-600',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 border border-violet-800/30 shadow-xl">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -left-10 w-56 h-56 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-40 h-40 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 px-5 py-4">
          {/* Main row: icon + title + stats */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
              <HugeiconsIcon icon={Rocket01Icon} size={18} strokeWidth={2} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-violet-400 leading-none mb-0.5">Projeto Integrador</div>
              <h1 className="font-heading font-black text-base text-white leading-tight truncate">{pi.titulo}</h1>
            </div>
            {/* Inline stats */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-center min-w-[52px]">
                <div className="text-base font-heading font-black text-white leading-none">{completedCount}/{entregas.length}</div>
                <div className="text-[9px] text-violet-300 font-bold uppercase tracking-widest mt-0.5">Enviadas</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-center min-w-[52px]">
                <div className="text-base font-heading font-black text-amber-400 leading-none">{approvedCount}</div>
                <div className="text-[9px] text-violet-300 font-bold uppercase tracking-widest mt-0.5">Aprovadas</div>
              </div>
            </div>
          </div>

          {/* Progress bar row */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] text-white font-black shrink-0">{Math.round(progressPercent)}%</span>
          </div>

          {/* Meta chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 text-[11px] text-indigo-200 font-semibold">
              <HugeiconsIcon icon={Award01Icon} size={11} strokeWidth={2} />
              {pi.xp_por_entrega} XP por aprovação
            </span>
            <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 text-[11px] text-indigo-200 font-semibold">
              <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
              {pi.tipo === 'grupo' ? 'Em Grupo' : 'Individual'}
            </span>
            {pi.tipo === 'grupo' && grupo && (
              <span className="inline-flex items-center gap-1 bg-violet-500/20 border border-violet-400/30 rounded-full px-2.5 py-0.5 text-[11px] text-violet-200 font-bold">
                <HugeiconsIcon icon={StarIcon} size={11} strokeWidth={2} />
                {grupo.nome}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Nav (Mídias Digitais only) ── */}
      {isMidiasDigitais && (
        <div className="flex bg-surface-container-low border border-outline-variant/30 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('etapas')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'etapas'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <HugeiconsIcon icon={TaskDone01Icon} size={16} strokeWidth={2} />
            Etapas e Entregas
          </button>
          <button
            onClick={() => setActiveTab('ficha')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'ficha'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <HugeiconsIcon icon={BriefcaseIcon} size={16} strokeWidth={2} />
            Ficha da Marca
          </button>
        </div>
      )}

      {/* ── Ficha da Marca Tab ── */}
      {activeTab === 'ficha' && isMidiasDigitais ? (
        <div className="space-y-4">
          {loadingMarca ? (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-10 flex flex-col items-center justify-center gap-3">
              <div className="w-9 h-9 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-sm text-on-surface-variant font-semibold">Carregando ficha da marca...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Ficha header card */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-violet-950 to-indigo-950 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                      <HugeiconsIcon icon={BriefcaseIcon} size={18} strokeWidth={2} className="text-violet-200" />
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-white text-base">Ficha da Marca / Empresa</h3>
                      <p className="text-violet-300 text-xs font-medium">Defina a marca e estratégias do projeto integrador</p>
                    </div>
                  </div>
                  {pi.tipo === 'grupo' && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-300 bg-violet-500/20 border border-violet-400/30 px-2.5 py-1 rounded-full">
                      Compartilhado
                    </span>
                  )}
                </div>

                {/* Alerts */}
                {(marcaError || marcaSuccess) && (
                  <div className="px-5 pt-4">
                    {marcaError && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm flex items-start gap-2">
                        <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                        {marcaError}
                      </div>
                    )}
                    {marcaSuccess && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-400 rounded-xl p-3 text-sm flex items-center gap-2">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} className="shrink-0" />
                        {marcaSuccess}
                      </div>
                    )}
                  </div>
                )}

                {/* Accordion sections */}
                <div className="p-4 space-y-2">
                  {accordionSections.map((section) => (
                    <div key={section.key} className="border border-outline-variant/30 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setActiveSection(activeSection === section.key ? null : section.key)}
                        className="w-full px-4 py-3.5 bg-surface-container-low hover:bg-surface-container text-left flex items-center gap-3 transition-all"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center shrink-0 shadow-sm`}>
                          <span className="text-white text-[10px] font-black">{section.number}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-on-surface text-sm">{section.title}</div>
                          <div className="text-[11px] text-on-surface-variant mt-0.5">{section.subtitle}</div>
                        </div>
                        <span className={`text-on-surface-variant transition-transform duration-200 ${activeSection === section.key ? 'rotate-180' : ''}`}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </button>

                      {activeSection === section.key && (
                        <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/20 space-y-3">
                          {/* Section 1: Identification */}
                          {section.key === 'id' && (
                            <>
                              <div>
                                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Nome da Marca *</label>
                                <input
                                  type="text"
                                  value={formMarca.nome_marca}
                                  onChange={e => setFormMarca({ ...formMarca, nome_marca: e.target.value })}
                                  placeholder="Ex: Padaria Pão de Mel, Fictícia, etc."
                                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Segmento / Ramo de Atuação</label>
                                <input
                                  type="text"
                                  value={formMarca.segmento}
                                  onChange={e => setFormMarca({ ...formMarca, segmento: e.target.value })}
                                  placeholder="Ex: Alimentação, Estética, Vestuário"
                                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Justificativa da Escolha da Marca</label>
                                <textarea
                                  value={formMarca.justificativa}
                                  onChange={e => setFormMarca({ ...formMarca, justificativa: e.target.value })}
                                  placeholder="Por que o grupo escolheu essa marca? Qual a relevância?"
                                  rows={3}
                                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-xs font-bold text-on-surface-variant">Canais de Presença Digital Atuais</label>
                                <p className="text-[11px] text-on-surface-variant">Insira a URL dos perfis que a marca já possui (deixe em branco se não houver):</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {formMarca.canais_digitais.map((canalObj: any, index: number) => (
                                    <div key={index} className="flex gap-2 items-center bg-surface-container rounded-lg px-2 py-1.5">
                                      <div className="w-24 text-[11px] font-bold text-on-surface-variant shrink-0 truncate">
                                        {canalObj.canal !== undefined && canalObj.canal !== '' ? canalObj.canal : (
                                          <input
                                            type="text"
                                            placeholder="Nome do Canal"
                                            value={canalObj.canal}
                                            onChange={e => handleUpdateCustomCanalName(index, e.target.value)}
                                            className="w-full bg-transparent text-[11px] text-on-surface border-none outline-none"
                                          />
                                        )}
                                      </div>
                                      <input
                                        type="url"
                                        value={canalObj.url}
                                        onChange={e => handleUpdateCanalUrl(index, e.target.value)}
                                        placeholder="https://..."
                                        className="flex-1 bg-transparent text-xs text-on-surface focus:outline-none min-w-0"
                                      />
                                      {index >= 6 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCustomCanal(index)}
                                          className="text-red-500 hover:text-red-600 p-0.5 shrink-0"
                                        >
                                          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2.5} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={handleAddCustomCanal}
                                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-1"
                                >
                                  + Adicionar Canal Personalizado
                                </button>
                              </div>
                            </>
                          )}

                          {/* Section 2: Público e Persona */}
                          {section.key === 'publico' && (
                            <>
                              <div>
                                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Público-Alvo da Marca</label>
                                <textarea
                                  value={formMarca.publico_alvo}
                                  onChange={e => setFormMarca({ ...formMarca, publico_alvo: e.target.value })}
                                  placeholder="Quem são os clientes ideais? Gênero, idade, localização, hábitos de compra..."
                                  rows={3}
                                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Nome fictício da Persona</label>
                                  <input
                                    type="text"
                                    value={formMarca.persona_nome}
                                    onChange={e => setFormMarca({ ...formMarca, persona_nome: e.target.value })}
                                    placeholder="Ex: Mariana Silva"
                                    className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Idade/Ocupação</label>
                                  <input
                                    type="text"
                                    value={formMarca.persona_idade}
                                    onChange={e => setFormMarca({ ...formMarca, persona_idade: e.target.value })}
                                    placeholder="Ex: 28 anos, microempreendedora"
                                    className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </div>
                              </div>
                              {[
                                { key: 'persona_dores', label: 'Dores (frustrações, problemas que enfrenta)', placeholder: 'O que incomoda essa pessoa no dia a dia?' },
                                { key: 'persona_desejos', label: 'Desejos (sonhos, objetivos de vida)', placeholder: 'O que essa pessoa quer alcançar?' },
                                { key: 'persona_necessidades', label: 'Necessidades (o que ela espera de marcas como a sua)', placeholder: 'Qual problema o produto resolve para ela?' },
                                { key: 'persona_comportamento', label: 'Comportamento Digital', placeholder: 'Quais redes sociais ela acessa? Compra online?' },
                              ].map(field => (
                                <div key={field.key}>
                                  <label className="block text-xs font-bold text-on-surface-variant mb-1.5">{field.label}</label>
                                  <textarea
                                    value={formMarca[field.key]}
                                    onChange={e => setFormMarca({ ...formMarca, [field.key]: e.target.value })}
                                    placeholder={field.placeholder}
                                    rows={2}
                                    className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                  />
                                </div>
                              ))}
                            </>
                          )}

                          {/* Section 3: Diagnóstico */}
                          {section.key === 'diag' && (
                            <>
                              {[
                                { key: 'pontos_fortes', label: 'Pontos Fortes da Presença Digital Atual', placeholder: 'O que a empresa já faz bem no meio digital? Ex: Bio organizada, fotos boas...' },
                                { key: 'pontos_fracos', label: 'Pontos Fracos / Problemas Identificados', placeholder: 'Quais os principais gargalos? Ex: Posts inconsistentes, falta de link na bio...' },
                                { key: 'oportunidades', label: 'Oportunidades de Conteúdo / Estratégia', placeholder: 'Quais oportunidades o grupo identificou? Ex: Fazer Reels dos bastidores...' },
                                { key: 'concorrentes', label: 'Concorrentes Analisados e Referências de Mercado', placeholder: 'Quais os concorrentes diretos analisados? Quais perfis servem de inspiração?', rows: 3 },
                              ].map(field => (
                                <div key={field.key}>
                                  <label className="block text-xs font-bold text-on-surface-variant mb-1.5">{field.label}</label>
                                  <textarea
                                    value={formMarca[field.key]}
                                    onChange={e => setFormMarca({ ...formMarca, [field.key]: e.target.value })}
                                    placeholder={field.placeholder}
                                    rows={(field as any).rows || 2}
                                    className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                  />
                                </div>
                              ))}
                            </>
                          )}

                          {/* Section 4: Posicionamento */}
                          {section.key === 'pos' && (
                            <>
                              <div>
                                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">3 Palavras-chave da Marca (Valores/Branding)</label>
                                <input
                                  type="text"
                                  value={formMarca.palavras_chave}
                                  onChange={e => setFormMarca({ ...formMarca, palavras_chave: e.target.value })}
                                  placeholder="Ex: Acolhimento, Rapidez, Sabor"
                                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Frase de Posicionamento</label>
                                <textarea
                                  value={formMarca.frase_posicionamento}
                                  onChange={e => setFormMarca({ ...formMarca, frase_posicionamento: e.target.value })}
                                  placeholder="Ex: 'Oferecemos o pão de queijo mais quentinho e artesanal do bairro de forma rápida e prática.'"
                                  rows={2}
                                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Tom de Voz (Como a marca se comunica)</label>
                                <textarea
                                  value={formMarca.tom_voz}
                                  onChange={e => setFormMarca({ ...formMarca, tom_voz: e.target.value })}
                                  placeholder="Ex: Amigável, instrutivo, descontraído mas respeitoso. Usa gírias locais? Usa emojis?"
                                  rows={2}
                                  className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Save button */}
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={handleSaveMarca}
                    disabled={savingMarca || !formMarca.nome_marca.trim()}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-heading font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                  >
                    {savingMarca ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2.5} />
                    )}
                    Salvar Ficha da Marca
                  </button>
                  {pi.tipo === 'grupo' && (
                    <p className="text-[11px] text-on-surface-variant text-center mt-2 font-medium">
                      Qualquer integrante do grupo pode atualizar estas informações.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Etapas Tab ── */
        <>
          {/* Grupo Info Card */}
          {pi.tipo === 'grupo' && (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4">
              {grupo ? (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={2} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-on-surface text-sm">Grupo: {grupo.nome}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {membros.map((m: any) => (
                        <div key={m.aluno_id} className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-full text-xs text-on-surface">
                          {m.profiles?.avatar_url ? (
                            <img src={m.profiles.avatar_url} className="w-4 h-4 rounded-full" alt="" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-[8px] font-black text-primary">{(m.profiles?.nome || 'A')[0].toUpperCase()}</span>
                            </div>
                          )}
                          <span className="font-medium">{m.profiles?.nome || 'Aluno'}</span>
                          {m.lider && <span className="text-amber-500 text-[10px] font-black">★</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Alert01Icon} size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Aguardando alocação em grupo</p>
                    <p className="text-xs opacity-80 mt-0.5">Você ainda não foi adicionado a um grupo. Aguarde seu professor.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats summary row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total de Etapas', value: entregas.length, icon: ChartHistogramIcon, color: 'text-on-surface' },
              { label: 'Enviadas', value: completedCount, icon: Upload01Icon, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Aprovadas', value: approvedCount, icon: CheckmarkCircle02Icon, color: 'text-green-600 dark:text-green-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 text-center">
                <HugeiconsIcon icon={stat.icon} size={18} strokeWidth={2} className={`${stat.color} mx-auto mb-1`} />
                <div className={`text-xl font-heading font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Entregas list */}
          <div className="space-y-3">
            <h2 className="text-sm font-heading font-black text-on-surface px-1 uppercase tracking-widest text-on-surface-variant">Etapas do Projeto</h2>
            {entregas.map((entrega, idx) => {
              const sub = getSubmissao(entrega.id);
              const status = sub?.status || 'pendente';
              const cfg = statusConfig[status];
              const overdue = isOverdue(entrega.prazo) && status === 'pendente';
              const canSubmit = pi.tipo === 'individual' || !!grupo;

              return (
                <div
                  key={entrega.id}
                  className={`bg-surface-container-lowest border rounded-xl overflow-hidden transition-all ${
                    status === 'avaliada' ? 'border-green-200 dark:border-green-800/30' :
                    overdue ? 'border-red-200 dark:border-red-800/30' :
                    'border-outline-variant/30 hover:border-primary/30'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Step indicator */}
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-heading font-black text-sm shadow-sm ${
                        status === 'avaliada' ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-500/20' :
                        status === 'enviada' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20' :
                        overdue ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/20' :
                        'bg-surface-container text-on-surface-variant'
                      }`}>
                        {status === 'avaliada'
                          ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} strokeWidth={2.5} />
                          : idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-on-surface text-sm leading-tight">{entrega.titulo}</h3>
                            {entrega.descricao && (
                              <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">{entrega.descricao}</p>
                            )}
                          </div>
                          <span className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>

                        {/* Meta info chips */}
                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                          {entrega.prazo && (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              overdue
                                ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}>
                              <HugeiconsIcon icon={Calendar01Icon} size={11} strokeWidth={2} />
                              {overdue ? 'Atrasado · ' : ''}{formatDate(entrega.prazo)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">
                            <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
                            Peso {entrega.peso}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                            {entrega.aceita_arquivo && <HugeiconsIcon icon={FileAttachmentIcon} size={12} strokeWidth={2} title="Aceita arquivo" />}
                            {entrega.aceita_link && <HugeiconsIcon icon={LinkSquare01Icon} size={12} strokeWidth={2} title="Aceita link" />}
                            {entrega.aceita_texto && <HugeiconsIcon icon={TextIcon} size={12} strokeWidth={2} title="Aceita texto" />}
                          </span>
                        </div>

                        {/* Nota / feedback */}
                        {sub?.nota !== null && sub?.nota !== undefined && (
                          <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl p-3">
                            <div className="flex items-center gap-3">
                              <div>
                                <span className="text-2xl font-heading font-black text-green-600 dark:text-green-400">{sub.nota.toFixed(1)}</span>
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium ml-1">/10</span>
                              </div>
                              {sub.xp_concedido && (
                                <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30 px-2.5 py-1 rounded-full font-bold">
                                  +{pi.xp_por_entrega} XP ✨
                                </span>
                              )}
                            </div>
                            {sub.feedback_professor && (
                              <p className="text-xs text-on-surface-variant italic mt-2 leading-relaxed">"{sub.feedback_professor}"</p>
                            )}
                          </div>
                        )}

                        {/* Action */}
                        {canSubmit && status !== 'avaliada' && (
                          <div className="mt-3">
                            <button
                              onClick={() => handleOpenModal(entrega)}
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                                sub
                                  ? 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                              }`}
                            >
                              <HugeiconsIcon icon={sub ? Edit01Icon : Upload01Icon} size={13} strokeWidth={2.5} />
                              {sub ? 'Editar entrega' : 'Enviar entrega'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm flex items-start gap-2">
          <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Modal de Submissão ── */}
      {modalEntrega && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border border-outline-variant/30 overflow-hidden">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-outline-variant/30 flex items-start justify-between gap-3 bg-surface-container-low">
              <div>
                <h2 className="font-heading font-bold text-base text-on-surface">Enviar Entrega</h2>
                <p className="text-xs text-on-surface-variant mt-0.5 font-medium">{modalEntrega.titulo}</p>
              </div>
              <button
                onClick={() => setModalEntrega(null)}
                className="w-8 h-8 rounded-lg border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all shrink-0"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {successMsg ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} className="text-green-600 dark:text-green-400" strokeWidth={2} />
                  </div>
                  <p className="font-bold text-on-surface text-base">{successMsg}</p>
                </div>
              ) : (
                <>
                  {modalEntrega.aceita_texto && (
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Descrição / Texto</label>
                      <textarea
                        value={formDescricao}
                        onChange={e => setFormDescricao(e.target.value)}
                        rows={4}
                        placeholder="Descreva seu projeto, decisões técnicas, resultados..."
                        className="w-full rounded-xl border border-outline-variant/50 bg-surface-container px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                  )}

                  {modalEntrega.aceita_link && (
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Link do Projeto</label>
                      <div className="relative">
                        <HugeiconsIcon icon={LinkSquare01Icon} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" strokeWidth={2} />
                        <input
                          type="url"
                          value={formLink}
                          onChange={e => setFormLink(e.target.value)}
                          placeholder="https://github.com/usuario/projeto"
                          className="w-full rounded-xl border border-outline-variant/50 bg-surface-container pl-9 pr-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                  )}

                  {modalEntrega.aceita_arquivo && (
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Arquivo</label>
                      <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-outline-variant/40 rounded-xl p-4 hover:border-primary/50 hover:bg-primary/5 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-all">
                          <HugeiconsIcon icon={Upload01Icon} size={20} className="text-primary" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {formFile ? formFile.name : 'Clique para selecionar um arquivo'}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">PDF, ZIP, imagens, etc.</p>
                        </div>
                        <input type="file" className="hidden" onChange={e => setFormFile(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>

            {!successMsg && (
              <div className="p-5 border-t border-outline-variant/30 flex gap-3">
                <button
                  onClick={() => setModalEntrega(null)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant/50 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || (!formDescricao.trim() && !formLink.trim() && !formFile)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  ) : (
                    <HugeiconsIcon icon={Upload01Icon} size={16} strokeWidth={2.5} />
                  )}
                  Enviar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
