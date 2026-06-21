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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pendente: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  enviada: { label: 'Enviada', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  avaliada: { label: 'Avaliada', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  revisao: { label: 'Em Revisão', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
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

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Busca perfil do aluno para pegar turma_id
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('turma_id')
        .eq('id', userId)
        .single();
      if (pErr) throw pErr;
      if (!profile?.turma_id) { setLoading(false); return; }

      // 2. Busca turma para pegar curso_id
      const { data: turma, error: tErr } = await supabase
        .from('turmas')
        .select('curso_id')
        .eq('id', profile.turma_id)
        .single();
      if (tErr) throw tErr;
      if (!turma?.curso_id) { setLoading(false); return; }

      // 3. Busca PI do curso
      const { data: piData, error: piErr } = await supabase
        .from('projetos_integradores')
        .select('*')
        .eq('curso_id', turma.curso_id)
        .eq('ativo', true)
        .maybeSingle();
      if (piErr) throw piErr;
      if (!piData) { setLoading(false); return; }
      setPi(piData);

      // 4. Busca etapas do PI
      const { data: entregasDef, error: eErr } = await supabase
        .from('pi_entregas_definicoes')
        .select('*')
        .eq('projeto_id', piData.id)
        .order('ordem', { ascending: true });
      if (eErr) throw eErr;
      setEntregas(entregasDef || []);

      // 5. Busca grupo do aluno (se tipo = grupo)
      if (piData.tipo === 'grupo') {
        const { data: membroData } = await supabase
          .from('pi_grupo_membros')
          .select('grupo_id, pi_grupos(id, nome, projeto_id, turma_id)')
          .eq('aluno_id', userId)
          .maybeSingle();

        if (membroData?.pi_grupos) {
          const g = membroData.pi_grupos as unknown as Grupo;
          setGrupo(g);

          // Busca membros do grupo
          const { data: membrosData } = await supabase
            .from('pi_grupo_membros')
            .select('aluno_id, lider, profiles(nome, avatar_url)')
            .eq('grupo_id', g.id);
          setMembros(membrosData || []);

          // Busca submissões do grupo
          const { data: subData } = await supabase
            .from('pi_submissoes')
            .select('*')
            .eq('grupo_id', g.id);
          setSubmissoes(subData || []);
        }
      } else {
        // Busca submissões individuais
        const { data: subData } = await supabase
          .from('pi_submissoes')
          .select('*')
          .eq('aluno_id', userId);
        setSubmissoes(subData || []);
      }
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!pi) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center">
          <HugeiconsIcon icon={TaskDone01Icon} size={32} className="text-on-surface-variant" strokeWidth={1.5} />
        </div>
        <p className="text-on-surface-variant text-body-md">Nenhum Projeto Integrador configurado para o seu curso ainda.</p>
      </div>
    );
  }

  const completedCount = entregas.filter(e => {
    const sub = getSubmissao(e.id);
    return sub && ['enviada', 'avaliada'].includes(sub.status);
  }).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 border border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-2">
              <HugeiconsIcon icon={TaskDone01Icon} size={13} strokeWidth={2.5} />
              Projeto Integrador
            </span>
            <h1 className="text-title-lg font-heading font-extrabold text-on-surface">{pi.titulo}</h1>
            {pi.descricao && <p className="text-body-sm text-on-surface-variant mt-1">{pi.descricao}</p>}
          </div>
          <div className="text-center shrink-0">
            <p className="text-3xl font-extrabold text-primary">{completedCount}/{entregas.length}</p>
            <p className="text-xs text-on-surface-variant font-medium">entregas</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: entregas.length > 0 ? `${(completedCount / entregas.length) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Award01Icon} size={13} strokeWidth={2} />
            {pi.xp_por_entrega} XP por entrega aprovada
          </span>
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={UserGroupIcon} size={13} strokeWidth={2} />
            {pi.tipo === 'grupo' ? 'Em Grupo' : 'Individual'}
          </span>
        </div>
      </div>

      {/* Grupo info */}
      {pi.tipo === 'grupo' && (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4">
          {grupo ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={2} className="text-primary" />
                <span className="font-bold text-on-surface text-body-md">Grupo: {grupo.nome}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {membros.map((m: any) => (
                  <div key={m.aluno_id} className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-full text-xs text-on-surface">
                    {m.profiles?.avatar_url && (
                      <img src={m.profiles.avatar_url} className="w-4 h-4 rounded-full" alt="" />
                    )}
                    {m.profiles?.nome || 'Aluno'}
                    {m.lider && <span className="text-amber-500 text-[10px] font-bold">★</span>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <HugeiconsIcon icon={Alert01Icon} size={18} strokeWidth={2} />
              <p className="text-body-sm font-medium">Você ainda não foi adicionado a um grupo. Aguarde seu professor.</p>
            </div>
          )}
        </div>
      )}

      {/* Etapas */}
      <div className="space-y-3">
        <h2 className="text-title-sm font-heading font-bold text-on-surface px-1">Etapas do Projeto</h2>
        {entregas.map((entrega, idx) => {
          const sub = getSubmissao(entrega.id);
          const status = sub?.status || 'pendente';
          const cfg = statusConfig[status];
          const overdue = isOverdue(entrega.prazo) && status === 'pendente';
          const canSubmit = pi.tipo === 'individual' || !!grupo;

          return (
            <div
              key={entrega.id}
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Step number / status icon */}
                <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold ${
                  status === 'avaliada' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                  status === 'enviada' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                  'bg-surface-container text-on-surface-variant'
                }`}>
                  {status === 'avaliada'
                    ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2.5} />
                    : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-on-surface text-body-md">{entrega.titulo}</h3>
                      {entrega.descricao && (
                        <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">{entrega.descricao}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-on-surface-variant">
                    {entrega.prazo && (
                      <span className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-semibold' : ''}`}>
                        <HugeiconsIcon icon={Calendar01Icon} size={12} strokeWidth={2} />
                        {overdue ? 'Atrasado · ' : ''}{formatDate(entrega.prazo)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
                      Peso {entrega.peso}
                    </span>
                    <div className="flex items-center gap-1" title="Tipos aceitos">
                      {entrega.aceita_arquivo && <HugeiconsIcon icon={FileAttachmentIcon} size={12} strokeWidth={2} />}
                      {entrega.aceita_link && <HugeiconsIcon icon={LinkSquare01Icon} size={12} strokeWidth={2} />}
                      {entrega.aceita_texto && <HugeiconsIcon icon={TextIcon} size={12} strokeWidth={2} />}
                    </div>
                  </div>

                  {/* Nota/feedback */}
                  {sub?.nota !== null && sub?.nota !== undefined && (
                    <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-extrabold text-green-600">{sub.nota.toFixed(1)}</span>
                        <span className="text-xs text-green-600 font-medium">/10</span>
                        {sub.xp_concedido && (
                          <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                            +{pi.xp_por_entrega} XP ✨
                          </span>
                        )}
                      </div>
                      {sub.feedback_professor && (
                        <p className="text-xs text-on-surface-variant italic">"{sub.feedback_professor}"</p>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  {canSubmit && status !== 'avaliada' && (
                    <button
                      onClick={() => handleOpenModal(entrega)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <HugeiconsIcon icon={sub ? Edit01Icon : Upload01Icon} size={14} strokeWidth={2.5} />
                      {sub ? 'Editar entrega' : 'Enviar entrega'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-error-container/20 border border-error/30 text-error rounded-xl p-3 text-body-sm">
          {error}
        </div>
      )}

      {/* Modal de submissão */}
      {modalEntrega && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg border border-outline-variant/30">
            <div className="p-5 border-b border-outline-variant/30">
              <h2 className="font-heading font-bold text-title-sm text-on-surface">Enviar Entrega</h2>
              <p className="text-body-sm text-on-surface-variant mt-0.5">{modalEntrega.titulo}</p>
            </div>

            <div className="p-5 space-y-4">
              {successMsg ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={28} className="text-green-600" strokeWidth={2} />
                  </div>
                  <p className="font-bold text-on-surface">{successMsg}</p>
                </div>
              ) : (
                <>
                  {modalEntrega.aceita_texto && (
                    <div>
                      <label className="block text-label-sm font-semibold text-on-surface-variant mb-1.5">Descrição / Texto</label>
                      <textarea
                        value={formDescricao}
                        onChange={e => setFormDescricao(e.target.value)}
                        rows={4}
                        placeholder="Descreva seu projeto, decisões técnicas, resultados..."
                        className="w-full rounded-xl border border-outline-variant/50 bg-surface-container px-3 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                  )}

                  {modalEntrega.aceita_link && (
                    <div>
                      <label className="block text-label-sm font-semibold text-on-surface-variant mb-1.5">Link do Projeto</label>
                      <div className="relative">
                        <HugeiconsIcon icon={LinkSquare01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" strokeWidth={2} />
                        <input
                          type="url"
                          value={formLink}
                          onChange={e => setFormLink(e.target.value)}
                          placeholder="https://github.com/usuario/projeto"
                          className="w-full rounded-xl border border-outline-variant/50 bg-surface-container pl-9 pr-3 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                  )}

                  {modalEntrega.aceita_arquivo && (
                    <div>
                      <label className="block text-label-sm font-semibold text-on-surface-variant mb-1.5">Arquivo</label>
                      <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-outline-variant/50 rounded-xl p-4 hover:border-primary/40 hover:bg-primary/5 transition-all">
                        <HugeiconsIcon icon={Upload01Icon} size={20} className="text-primary" strokeWidth={2} />
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium text-on-surface truncate">
                            {formFile ? formFile.name : 'Clique para selecionar um arquivo'}
                          </p>
                          <p className="text-xs text-on-surface-variant">PDF, ZIP, imagens, etc.</p>
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
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant/50 text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || (!formDescricao.trim() && !formLink.trim() && !formFile)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-body-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
