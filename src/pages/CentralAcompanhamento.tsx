import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Chat01Icon,
  EyeIcon,
  SentIcon,
  Attachment01Icon,
  KeyboardIcon,
  Alert01Icon,
  FireIcon,
  Edit01Icon,
  Delete02Icon
} from '@hugeicons/core-free-icons';

interface CentralAcompanhamentoProps {
  alunoId: string;
  onBack: () => void;
  initialTab?: 'chat' | 'ficha';
  onChangeStudent?: (id: string) => void;
}

interface StudentProfile {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  progresso_geral: number;
  frequencia: number;
  autonomia_digital: 'S' | 'P' | 'N';
  status_risco: 'Excelente' | 'No Caminho' | 'Alerta Médio' | 'Em Risco';
  media_digitacao: number;
  ofensiva_atual: number;
  tempo_resolucao: number;
  turma_nome?: string;
}

interface AutonomiaData {
  usa_computador: 'S' | 'P' | 'N';
  navega_internet: 'S' | 'P' | 'N';
  cria_salva_arquivos: 'S' | 'P' | 'N';
  organiza_pastas: 'S' | 'P' | 'N';
  copia_cola_links: 'S' | 'P' | 'N';
  conhece_redes_sociais: 'S' | 'P' | 'N';
  conhece_ferramentas: 'S' | 'P' | 'N';
  precisa_apoio: 'S' | 'N';
}

interface ChatMessage {
  id: string;
  aluno_id: string;
  remetente_id: string | null;
  texto: string;
  created_at: string;
}

const DEFAULT_AUTONOMIA: AutonomiaData = {
  usa_computador: 'S',
  navega_internet: 'S',
  cria_salva_arquivos: 'N',
  organiza_pastas: 'N',
  copia_cola_links: 'S',
  conhece_redes_sociais: 'S',
  conhece_ferramentas: 'P',
  precisa_apoio: 'S'
};

export const CentralAcompanhamento: React.FC<CentralAcompanhamentoProps> = ({
  alunoId,
  onBack,
  initialTab = 'ficha',
  onChangeStudent
}) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [autonomia, setAutonomia] = useState<AutonomiaData>(DEFAULT_AUTONOMIA);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<{ id: string; nome: string }[]>([]);

  // Chat CRUD state
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    getCurrentUser();
  }, [alunoId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentTeacherId(session.user.id);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  useEffect(() => {
    if (initialTab === 'chat') {
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    }
  }, [initialTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Student Profile with Turma join
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, turmas(nome)')
        .eq('id', alunoId)
        .single();

      if (profileError) throw profileError;

      let tName = 'Sem Turma';
      if (profileData) {
        const associatedTurma = profileData.turmas;
        if (associatedTurma) {
          tName = Array.isArray(associatedTurma)
            ? associatedTurma[0]?.nome || 'Sem Turma'
            : (associatedTurma as any).nome || 'Sem Turma';
        }

        setProfile({
          id: profileData.id,
          nome: profileData.nome || 'João da Silva',
          email: profileData.email || 'joao.silva@edu.com',
          avatar_url: profileData.avatar_url,
          progresso_geral: profileData.progresso_geral || 15,
          frequencia: profileData.frequencia || 82,
          autonomia_digital: profileData.autonomia_digital || 'P',
          status_risco: profileData.status_risco || 'No Caminho',
          media_digitacao: profileData.media_digitacao || 450,
          ofensiva_atual: profileData.ofensiva_atual || 12,
          tempo_resolucao: profileData.tempo_resolucao || 25,
          turma_nome: tName
        });
      }

      // Fetch other students from the same class
      if (profileData && profileData.turma_id) {
        const { data: listData, error: listError } = await supabase
          .from('profiles')
          .select('id, nome')
          .eq('role', 'student')
          .eq('turma_id', profileData.turma_id)
          .order('nome', { ascending: true });

        if (!listError && listData) {
          setClassStudents(listData);
        }
      } else {
        setClassStudents([]);
      }

      // 2. Fetch Autonomia Criteria
      const { data: autoData, error: autoError } = await supabase
        .from('observacoes_autonomia')
        .select('*')
        .eq('aluno_id', alunoId)
        .maybeSingle();

      if (autoError) throw autoError;

      if (autoData) {
        setAutonomia({
          usa_computador: autoData.usa_computador || 'S',
          navega_internet: autoData.navega_internet || 'S',
          cria_salva_arquivos: autoData.cria_salva_arquivos || 'S',
          organiza_pastas: autoData.organiza_pastas || 'S',
          copia_cola_links: autoData.copia_cola_links || 'S',
          conhece_redes_sociais: autoData.conhece_redes_sociais || 'S',
          conhece_ferramentas: autoData.conhece_ferramentas || 'S',
          precisa_apoio: autoData.precisa_apoio || 'N'
        });
      } else {
        setAutonomia(DEFAULT_AUTONOMIA);
      }

      // 3. Fetch Chat Messages
      const { data: chatData, error: chatError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('created_at', { ascending: true });

      if (chatError) throw chatError;

      if (chatData) {
        setMessages(chatData);
      }
    } catch (err: any) {
      console.error('Error fetching student details:', err);
      setError(err.message || 'Erro ao carregar dados do aluno');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAutonomia = async (criterio: keyof AutonomiaData, valor: 'S' | 'P' | 'N') => {
    // Optimistic UI Update
    const previousValue = autonomia[criterio];
    setAutonomia((prev) => ({
      ...prev,
      [criterio]: valor
    }));

    try {
      const { error } = await supabase
        .from('observacoes_autonomia')
        .upsert({
          aluno_id: alunoId,
          [criterio]: valor,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'aluno_id'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error updating autonomy criteria:', err);
      // Revert state if error
      setAutonomia((prev) => ({
        ...prev,
        [criterio]: previousValue
      }));
    }
  };

  // Start editing a chat message
  const handleStartEditMessage = (msg: ChatMessage) => {
    setEditingMessage(msg);
    setNewMessage(msg.texto);
  };

  // Cancel editing chat message
  const handleCancelEditMessage = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  // Delete chat message
  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Deseja excluir esta mensagem permanentemente?')) return;

    // Optimistic UI
    const previousMessages = [...messages];
    setMessages((prev) => prev.filter((m) => m.id !== msgId));

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting message:', err);
      // Revert in case of error
      setMessages(previousMessages);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    if (editingMessage) {
      // UPDATE operation on chat message
      const msgId = editingMessage.id;
      const originalText = editingMessage.texto;

      // Optimistic UI
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, texto: msgText } : m))
      );
      setEditingMessage(null);

      try {
        const { error } = await supabase
          .from('chat_messages')
          .update({ texto: msgText })
          .eq('id', msgId);

        if (error) throw error;
      } catch (err) {
        console.error('Error updating message:', err);
        // Revert
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, texto: originalText } : m))
        );
      }
    } else {
      // CREATE operation on chat message
      const tempId = Math.random().toString();
      const tempMsg: ChatMessage = {
        id: tempId,
        aluno_id: alunoId,
        remetente_id: currentTeacherId,
        texto: msgText,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, tempMsg]);

      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            aluno_id: alunoId,
            remetente_id: currentTeacherId,
            texto: msgText
          })
          .select()
          .single();

        if (error) throw error;

        // Replace optimistic message with actual db message
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      } catch (err) {
        console.error('Error sending message:', err);
        // Remove the message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setNewMessage(msgText); // Restore input value
      }
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get initials for profile placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Format message time
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (loading && !profile) {
    return (
      <div className="w-full space-y-8 animate-fade-in py-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
          <div className="w-48 h-6 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="w-full h-32 bg-white rounded-2xl border border-outline-variant/30 animate-pulse"></div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="h-96 bg-white rounded-2xl border border-outline-variant/30 animate-pulse"></div>
          <div className="h-96 bg-white rounded-2xl border border-outline-variant/30 animate-pulse"></div>
          <div className="h-96 bg-white rounded-2xl border border-outline-variant/30 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      {error && (
        <div className="bg-red-50 border border-red-200 text-error px-4 py-3 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}
      {/* Page Breadcrumb and Header */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors w-fit group"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span>Voltar para Lista de Alunos</span>
        </button>
        <h2 className="font-heading font-extrabold text-2xl text-on-surface">Central de Acompanhamento</h2>
      </div>

      {/* Hero Card */}
      {profile && (
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Student Info */}
            <div className="flex items-center gap-4.5 min-w-max">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.nome}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-inner"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-heading text-xl font-bold shadow-inner">
                  {getInitials(profile.nome)}
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-heading font-extrabold text-[22px] text-on-surface leading-tight">
                    {profile.nome}
                  </h3>
                  {classStudents.length > 1 && onChangeStudent && (
                    <div className="relative">
                      <select
                        value={profile.id}
                        onChange={(e) => onChangeStudent(e.target.value)}
                        className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold rounded-lg px-2.5 py-1 pr-7 cursor-pointer focus:outline-none appearance-none transition-colors"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23004ac6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 6px center',
                          backgroundSize: '10px'
                        }}
                      >
                        {classStudents.map((std) => (
                          <option key={std.id} value={std.id} className="text-on-surface bg-white font-sans text-xs">
                            {std.nome} {std.id === profile.id ? ' (Atual)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-bold text-on-surface-variant/70 bg-slate-50 border border-outline-variant/40 px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span>{profile.turma_nome || 'Sem Turma'}</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 lg:gap-8 flex-1 justify-start lg:justify-end">
              {/* Progress */}
              <div className="w-full lg:w-48 space-y-2 border-r-0 lg:border-r border-slate-100 lg:pr-8">
                <div className="flex justify-between font-label-sm text-xs font-bold">
                  <span className="text-on-surface-variant/60 uppercase tracking-wider">Progresso da Trilha</span>
                  <span className="text-secondary">{profile.progresso_geral}% - Aula 6/40</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${profile.progresso_geral}%` }}
                  ></div>
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-outline-variant/30 flex items-center justify-center text-secondary">
                  <HugeiconsIcon icon={FireIcon} size={20} strokeWidth={2} className="text-secondary" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest leading-none mb-1">Dias Ofensiva</p>
                  <p className="text-sm font-extrabold text-on-surface">
                    {profile.ofensiva_atual} <span className="text-xs font-semibold text-on-surface-variant/60">dias</span>
                  </p>
                </div>
              </div>

              {/* Typing Speed */}
              <div className="flex items-center gap-3 lg:border-l border-slate-100 lg:pl-8">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-outline-variant/30 flex items-center justify-center text-primary">
                  <HugeiconsIcon icon={KeyboardIcon} size={20} strokeWidth={2} className="text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest leading-none mb-1">Média Digitação</p>
                  <p className="text-sm font-extrabold text-on-surface">
                    {profile.media_digitacao} <span className="text-xs font-semibold text-on-surface-variant/60">pal/m</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Column 1: Ficha de Observação Prática */}
        <div className="xl:col-span-4 flex flex-col">
          <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-heading font-bold text-sm text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={EyeIcon} size={18} strokeWidth={2} className="text-primary" />
                <span>Ficha de Observação Prática</span>
              </h4>
            </div>

            <div className="p-5 flex-1 space-y-4">
              {[
                { label: 'Usa computador', key: 'usa_computador', hasP: true },
                { label: 'Navega na internet', key: 'navega_internet', hasP: true },
                { label: 'Cria e salva arquivos', key: 'cria_salva_arquivos', hasP: true },
                { label: 'Organiza pastas', key: 'organiza_pastas', hasP: true },
                { label: 'Copia e cola links', key: 'copia_cola_links', hasP: true },
                { label: 'Conhece redes sociais', key: 'conhece_redes_sociais', hasP: true },
                { label: 'Conhece ferramentas', key: 'conhece_ferramentas', hasP: true },
                { label: 'Precisa de apoio', key: 'precisa_apoio', hasP: false }
              ].map((item) => {
                const key = item.key as keyof AutonomiaData;
                const value = autonomia[key];

                return (
                  <div key={item.key} className="flex items-center justify-between group py-0.5">
                    <span className={`text-xs font-semibold ${item.key === 'precisa_apoio' ? 'font-bold text-on-surface' : 'text-on-surface/80'}`}>
                      {item.label}
                    </span>
                    <div className="flex gap-1 bg-slate-50 p-1 rounded-full border border-slate-100">
                      {item.hasP ? (
                        <>
                          <button
                            onClick={() => handleUpdateAutonomia(key, 'S')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              value === 'S'
                                ? 'bg-emerald-500 text-white shadow-sm scale-105'
                                : 'text-on-surface-variant/40 hover:bg-slate-200/50'
                            }`}
                          >
                            S
                          </button>
                          <button
                            onClick={() => handleUpdateAutonomia(key, 'P')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              value === 'P'
                                ? 'bg-amber-500 text-white shadow-sm scale-105'
                                : 'text-on-surface-variant/40 hover:bg-slate-200/50'
                            }`}
                          >
                            P
                          </button>
                          <button
                            onClick={() => handleUpdateAutonomia(key, 'N')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              value === 'N'
                                ? 'bg-red-500 text-white shadow-sm scale-105'
                                : 'text-on-surface-variant/40 hover:bg-slate-200/50'
                            }`}
                          >
                            N
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdateAutonomia(key, 'S')}
                            className={`w-9 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              value === 'S'
                                ? 'bg-red-500 text-white shadow-sm scale-105'
                                : 'text-on-surface-variant/40 hover:bg-slate-200/50'
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => handleUpdateAutonomia(key, 'N')}
                            className={`w-9 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              value === 'N'
                                ? 'bg-slate-300 text-on-surface shadow-sm scale-105'
                                : 'text-on-surface-variant/40 hover:bg-slate-200/50'
                            }`}
                          >
                            Não
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: Inteligência Pedagógica */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <h4 className="font-heading font-bold text-sm text-on-surface flex items-center gap-2">
              <svg className="w-5 h-5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <span>Inteligência Pedagógica</span>
            </h4>

            {/* Dominio Card */}
            <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-4 border-l-4 border-l-emerald-500">
              <h5 className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Zonas de Domínio
              </h5>
              <div className="flex flex-wrap gap-2">
                {autonomia.navega_internet === 'S' || autonomia.usa_computador === 'S' ? (
                  <span className="px-3 py-1 bg-white rounded-full font-bold text-[10px] text-emerald-700 border border-emerald-100/50 shadow-sm">
                    Frequência
                  </span>
                ) : null}
                {autonomia.conhece_redes_sociais === 'S' || autonomia.conhece_redes_sociais === 'P' ? (
                  <span className="px-3 py-1 bg-white rounded-full font-bold text-[10px] text-emerald-700 border border-emerald-100/50 shadow-sm">
                    Redes Sociais
                  </span>
                ) : null}
                {autonomia.copia_cola_links === 'S' || autonomia.conhece_ferramentas === 'P' ? (
                  <span className="px-3 py-1 bg-white rounded-full font-bold text-[10px] text-emerald-700 border border-emerald-100/50 shadow-sm">
                    Interação
                  </span>
                ) : null}
                {/* Fallback baseline labels if student has poor autonomy score */}
                {!(autonomia.navega_internet === 'S' || autonomia.conhece_redes_sociais === 'S' || autonomia.copia_cola_links === 'S') && (
                  <span className="px-3 py-1 bg-white rounded-full font-bold text-[10px] text-emerald-700 border border-emerald-100/50 shadow-sm">
                    Interação Básica
                  </span>
                )}
              </div>
            </div>

            {/* Pontos de Atenção Card */}
            <div className="bg-red-50/20 border border-red-100 rounded-xl p-4 border-l-4 border-l-red-500">
              <h5 className="text-[11px] font-extrabold text-red-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={2.5} className="text-red-600" />
                Pontos de Atenção
              </h5>
              <div className="flex flex-wrap gap-2">
                {autonomia.cria_salva_arquivos === 'N' || autonomia.organiza_pastas === 'N' ? (
                  <span className="px-3 py-1 bg-white rounded-full font-bold text-[10px] text-red-700 border border-red-100/50 shadow-sm">
                    Gestão de Arquivos
                  </span>
                ) : null}
                {autonomia.precisa_apoio === 'S' ? (
                  <span className="px-3 py-1 bg-white rounded-full font-bold text-[10px] text-red-700 border border-red-100/50 shadow-sm">
                    Prazos
                  </span>
                ) : null}
                {/* Fallback baseline labels */}
                {!(autonomia.cria_salva_arquivos === 'N' || autonomia.precisa_apoio === 'S') && (
                  <span className="px-3 py-1 bg-white rounded-full font-bold text-[10px] text-red-700 border border-red-100/50 shadow-sm">
                    Acompanhar Autonomia
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Comunicação Direta (Chat) */}
        <div className="xl:col-span-4 flex flex-col h-[500px]">
          <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden border-t-4 border-t-secondary">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="font-heading font-bold text-sm text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={Chat01Icon} size={18} strokeWidth={2} className="text-secondary" />
                <span>Comunicação Direta</span>
              </h4>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Online"></span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isProfessor = msg.remetente_id === currentTeacherId || (msg.remetente_id !== null && msg.remetente_id !== alunoId);
                  return (
                    <div key={msg.id} className={`flex ${isProfessor ? 'justify-end' : 'justify-start'} group`}>
                      <div className={`flex gap-2 max-w-[85%] ${isProfessor ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isProfessor && (
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-on-surface-variant text-[10px] self-end shrink-0 border border-outline-variant/20 select-none">
                            {profile ? getInitials(profile.nome) : 'AL'}
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 shadow-sm border transition-all relative ${
                            isProfessor
                              ? 'bg-secondary text-white border-secondary-container rounded-tr-sm'
                              : 'bg-white text-on-surface border-slate-100 rounded-tl-sm'
                          }`}
                        >
                          <p className="text-xs leading-relaxed font-semibold break-words whitespace-pre-wrap">
                            {msg.texto}
                          </p>
                          <span
                            className={`block text-[9px] mt-1 text-right font-medium ${
                              isProfessor ? 'text-white/70' : 'text-on-surface-variant/50'
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </span>
                        </div>

                        {/* Edit and Delete actions for teacher messages */}
                        {isProfessor && (
                          <div className="flex gap-1 items-center self-center opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                            <button
                              onClick={() => handleStartEditMessage(msg)}
                              className="p-1 text-on-surface-variant/40 hover:text-primary transition-colors"
                              title="Editar mensagem"
                            >
                              <HugeiconsIcon icon={Edit01Icon} size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 text-on-surface-variant/40 hover:text-error transition-colors"
                              title="Excluir mensagem"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant/40 space-y-2">
                  <HugeiconsIcon icon={Chat01Icon} size={28} strokeWidth={1.5} />
                  <p className="text-xs font-bold">Nenhuma mensagem trocada ainda.</p>
                  <p className="text-[10px]">Envie uma mensagem abaixo para iniciar a conversa.</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Editing Message Header Bar */}
            {editingMessage && (
              <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-on-surface-variant/80">
                <span>Editando mensagem...</span>
                <button
                  onClick={handleCancelEditMessage}
                  className="text-error hover:underline"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white">
              <div className="flex items-end gap-2 bg-slate-50 border border-outline-variant/50 rounded-xl p-2 focus-within:ring-2 focus-within:ring-secondary/20 focus-within:border-secondary transition-all">
                <button
                  type="button"
                  className="p-2 text-on-surface-variant/50 hover:text-secondary hover:bg-slate-200/50 transition-colors rounded-lg shrink-0"
                  title="Anexar arquivo"
                >
                  <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={2} />
                </button>
                <textarea
                  className="w-full bg-transparent border-0 focus:ring-0 resize-none text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/30 py-1.5"
                  placeholder={
                    editingMessage
                      ? 'Edite sua mensagem...'
                      : `Digite sua mensagem para ${profile ? profile.nome.split(' ')[0] : 'o aluno'}...`
                  }
                  rows={2}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-9 h-9 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0 hover:bg-secondary/90 disabled:opacity-40 disabled:hover:bg-secondary transition-all shadow-sm"
                  title={editingMessage ? 'Atualizar mensagem' : 'Enviar mensagem'}
                >
                  <HugeiconsIcon icon={SentIcon} size={18} strokeWidth={2} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
