import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Chat01Icon,
  SentIcon,
  Edit01Icon,
  Delete02Icon,
  UserGroupIcon,
  ArrowLeft01Icon,
  Search01Icon
} from '@hugeicons/core-free-icons';

interface StudentProfile {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  turma_id: string | null;
}

interface Turma {
  id: string;
  nome: string;
}

interface ChatMessage {
  id: string;
  aluno_id: string;
  remetente_id: string | null;
  texto: string;
  created_at: string;
}

interface ChatListItem {
  student: StudentProfile;
  turmaNome: string;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}
interface ChatProfessorProps {
  initialStudentId?: string | null;
  onClearInitialStudent?: () => void;
}

export const ChatProfessor: React.FC<ChatProfessorProps> = ({
  initialStudentId,
  onClearInitialStudent
}) => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('all');

  // Edit message state
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editMessageText, setEditMessageText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
      onClearInitialStudent?.();
    }
  }, [initialStudentId]);

  useEffect(() => {
    getCurrentTeacher();
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchMessages(selectedStudentId);
    } else {
      setMessages([]);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    const channel = supabase
      .channel('chat_professor_global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          handleRealtimePayload(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStudentId]);

  const getCurrentTeacher = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentTeacherId(session.user.id);
    }
  };

  const handleRealtimePayload = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newMsg = payload.new as ChatMessage;

      if (selectedStudentId && newMsg.aluno_id === selectedStudentId) {
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();
      }

      refreshChatListData();
    } else if (payload.eventType === 'UPDATE') {
      const updatedMsg = payload.new as ChatMessage;
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );
      refreshChatListData();
    } else if (payload.eventType === 'DELETE') {
      const deletedId = payload.old.id;
      setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      refreshChatListData();
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome')
        .order('nome', { ascending: true });

      setTurmas(turmasData || []);

      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, nome, email, avatar_url, turma_id')
        .eq('role', 'student')
        .order('nome', { ascending: true });

      setStudents(studentsData || []);
    } catch (err) {
      console.error('Error fetching chat initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);

  const fetchAllRecentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAllMessages(data || []);
    } catch (err) {
      console.error('Error fetching all messages for list overview:', err);
    }
  };

  useEffect(() => {
    fetchAllRecentMessages();
  }, []);

  const refreshChatListData = () => {
    fetchAllRecentMessages();
  };

  const fetchMessages = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('aluno_id', studentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      const teacherKey = currentTeacherId || 'current_teacher';
      localStorage.setItem(`chat_last_opened:${teacherKey}:${studentId}`, new Date().toISOString());

      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error fetching conversation:', err);
    }
  };

  const scrollToBottom = () => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  };

  const chatListItems: ChatListItem[] = useMemo(() => {
    const turmaMap = new Map(turmas.map((t) => [t.id, t.nome]));

    return students.map((student) => {
      const studentMessages = allMessages.filter((m) => m.aluno_id === student.id);
      const lastMessage = studentMessages.length > 0 ? studentMessages[studentMessages.length - 1] : null;

      const teacherKey = currentTeacherId || 'current_teacher';
      const lastOpenedStr = localStorage.getItem(`chat_last_opened:${teacherKey}:${student.id}`) || new Date(0).toISOString();
      const lastOpenedTime = new Date(lastOpenedStr).getTime();

      const unreadCount = studentMessages.filter(
        (m) => m.remetente_id === student.id && new Date(m.created_at).getTime() > lastOpenedTime
      ).length;

      return {
        student,
        turmaNome: student.turma_id ? turmaMap.get(student.turma_id) || 'Sem Turma' : 'Sem Turma',
        lastMessage,
        unreadCount
      };
    }).sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      }
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return a.student.nome.localeCompare(b.student.nome);
    });
  }, [students, turmas, allMessages, currentTeacherId]);

  const filteredChatList = useMemo(() => {
    return chatListItems.filter((item) => {
      const matchesSearch =
        item.student.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTurma =
        selectedTurmaId === 'all' || item.student.turma_id === selectedTurmaId;

      return matchesSearch && matchesTurma;
    });
  }, [chatListItems, searchTerm, selectedTurmaId]);

  const selectedItem = useMemo(() => {
    return chatListItems.find((item) => item.student.id === selectedStudentId) || null;
  }, [chatListItems, selectedStudentId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudentId || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const senderId = session?.user?.id || currentTeacherId;

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          aluno_id: selectedStudentId,
          remetente_id: senderId,
          texto: messageText
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();
        refreshChatListData();
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Erro ao enviar mensagem.');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Tem certeza que deseja apagar esta mensagem?')) return;

    setMessages((prev) => prev.filter((m) => m.id !== msgId));

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;
      refreshChatListData();
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Erro ao apagar mensagem.');
    }
  };

  const handleStartEditMessage = (msg: ChatMessage) => {
    setEditingMessage(msg);
    setEditMessageText(msg.texto);
  };

  const handleCancelEditMessage = () => {
    setEditingMessage(null);
    setEditMessageText('');
  };

  const handleSaveEditMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage || !editMessageText.trim()) return;

    const updatedText = editMessageText.trim();
    const msgId = editingMessage.id;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, texto: updatedText } : m))
    );
    setEditingMessage(null);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ texto: updatedText })
        .eq('id', msgId);

      if (error) throw error;
      refreshChatListData();
    } catch (err) {
      console.error('Error editing message:', err);
      alert('Erro ao salvar edições.');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatMessageDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (d.toDateString() === today.toDateString()) {
        return 'Hoje';
      } else if (d.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
      } else {
        return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
      }
    } catch {
      return '';
    }
  };

  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; msgs: ChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const label = formatMessageDate(msg.created_at);
      const existing = groups.find((g) => g.dateLabel === label);
      if (existing) {
        existing.msgs.push(msg);
      } else {
        groups.push({ dateLabel: label, msgs: [msg] });
      }
    });
    return groups;
  }, [messages]);

  return (
    <div className="product-page max-w-7xl mx-auto h-[calc(100vh-8.5rem)] flex flex-col animate-fade-in pb-2">
      <div className="product-card p-0 flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Students List */}
        <aside className={`w-full md:w-80 border-r border-outline-variant/70 flex flex-col bg-surface-container-lowest ${selectedStudentId ? 'hidden md:flex' : 'flex'}`}>
          {/* Header Controls */}
          <div className="p-3.5 border-b border-outline-variant/60 space-y-2.5">
            <h2 className="font-heading font-extrabold text-sm text-on-surface flex items-center gap-2">
              <HugeiconsIcon icon={Chat01Icon} size={18} className="text-primary" />
              <span>Mensagens dos Alunos</span>
            </h2>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar aluno..."
                className="product-control pl-8 pr-3 py-1.5 text-xs"
              />
              <HugeiconsIcon
                icon={Search01Icon}
                size={14}
                strokeWidth={2}
                className="text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2"
              />
            </div>

            {/* Turma Filter Selector */}
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={UserGroupIcon} size={14} className="text-on-surface-variant" />
              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold text-on-surface-variant focus:ring-0 p-0 pr-4 cursor-pointer select-none"
              >
                <option value="all">Todas as Turmas</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/30">
            {loading ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin mx-auto" />
                <p className="text-xs font-bold text-on-surface-variant">Carregando conversas...</p>
              </div>
            ) : filteredChatList.length === 0 ? (
              <div className="product-empty-state py-8">
                <HugeiconsIcon icon={Chat01Icon} size={24} className="text-primary mb-1" />
                <p className="text-xs font-bold text-on-surface">Nenhum aluno encontrado</p>
                <p className="text-[10px] text-on-surface-variant">Verifique os termos da busca.</p>
              </div>
            ) : (
              filteredChatList.map((item) => {
                const active = item.student.id === selectedStudentId;
                return (
                  <button
                    key={item.student.id}
                    onClick={() => setSelectedStudentId(item.student.id)}
                    className={`w-full text-left p-3 flex items-start gap-2.5 transition-all ${
                      active 
                        ? 'bg-primary/10 border-l-4 border-l-primary' 
                        : 'hover:bg-surface-container-low border-l-4 border-l-transparent'
                    }`}
                  >
                    {/* Student Avatar */}
                    {item.student.avatar_url ? (
                      <img
                        src={item.student.avatar_url}
                        alt={item.student.nome}
                        className="w-9 h-9 rounded-product-control object-cover border border-outline-variant/60 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-product-control bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                        {getInitials(item.student.nome)}
                      </div>
                    )}

                    {/* Metadata Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-heading font-extrabold text-xs text-on-surface truncate">
                          {item.student.nome}
                        </h4>
                        {item.lastMessage && (
                          <span className="text-[9px] font-bold text-on-surface-variant shrink-0">
                            {formatTime(item.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-primary font-bold truncate mt-0.5">
                        {item.turmaNome}
                      </p>

                      <p className="text-[11px] font-medium text-on-surface-variant truncate mt-0.5">
                        {item.lastMessage ? (
                          item.lastMessage.remetente_id === currentTeacherId ? (
                            <span className="text-primary font-bold mr-1">Você:</span>
                          ) : null
                        ) : null}
                        {item.lastMessage ? item.lastMessage.texto : 'Nenhuma mensagem trocada.'}
                      </p>
                    </div>

                    {/* Unread badge */}
                    {item.unreadCount > 0 && (
                      <span className="bg-error text-white text-[9px] font-black rounded-full h-4 min-w-4 px-1 flex items-center justify-center animate-pulse shrink-0 self-center shadow-xs">
                        {item.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Active Chat Window */}
        <section className={`flex-1 flex flex-col bg-surface-container-low/30 ${selectedStudentId ? 'flex' : 'hidden md:flex'}`}>
          {selectedItem ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 bg-surface-container-lowest border-b border-outline-variant/70 flex items-center justify-between shadow-xs select-none">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="md:hidden product-icon-action !h-8 !w-8 -ml-1"
                    title="Voltar para a lista"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} />
                  </button>
                  {selectedItem.student.avatar_url ? (
                    <img
                      src={selectedItem.student.avatar_url}
                      alt={selectedItem.student.nome}
                      className="w-9 h-9 rounded-product-control object-cover border border-outline-variant/60"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-product-control bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs select-none">
                      {getInitials(selectedItem.student.nome)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-heading font-extrabold text-xs text-on-surface">
                      {selectedItem.student.nome}
                    </h3>
                    <p className="text-[10px] font-bold text-primary flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{selectedItem.turmaNome}</span>
                      <span className="text-on-surface-variant font-normal">•</span>
                      <span className="text-on-surface-variant font-semibold">{selectedItem.student.email}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Listing */}
              <div
                ref={messagesAreaRef}
                className="flex-1 overflow-y-auto p-5 space-y-4"
              >
                {groupedMessages.map((group) => (
                  <div key={group.dateLabel} className="space-y-3">
                    {/* Date separator */}
                    <div className="flex justify-center my-2">
                      <span className="bg-surface-container-high text-on-surface-variant font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                        {group.dateLabel}
                      </span>
                    </div>

                    {/* Messages under this group */}
                    {group.msgs.map((msg) => {
                      const isProfessor = msg.remetente_id === currentTeacherId;
                      return (
                        <div key={msg.id} className={`flex ${isProfessor ? 'justify-end' : 'justify-start'} group`}>
                          <div className={`flex gap-2 max-w-[80%] ${isProfessor ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {!isProfessor && (
                              <div className="w-6 h-6 rounded-product-control bg-surface-container-high flex items-center justify-center font-bold text-on-surface text-[9px] self-end shrink-0 select-none">
                                {getInitials(selectedItem.student.nome)}
                              </div>
                            )}

                            {/* Bubble body */}
                            <div
                              className={`px-3.5 py-2.5 shadow-sm transition-all relative ${
                                isProfessor
                                  ? 'bg-brand-navy text-white rounded-product-card rounded-tr-xs'
                                  : 'bg-surface-container-lowest text-on-surface border border-outline-variant/60 rounded-product-card rounded-tl-xs'
                              }`}
                            >
                              <p className="text-xs leading-relaxed font-medium break-words whitespace-pre-wrap">
                                {msg.texto}
                              </p>
                              <span
                                className={`block text-[9px] mt-1 text-right font-medium ${
                                  isProfessor ? 'text-white/70' : 'text-on-surface-variant'
                                }`}
                              >
                                {formatTime(msg.created_at)}
                              </span>
                            </div>

                            {/* Actions for teacher messages */}
                            {isProfessor && (
                              <div className="flex gap-1 items-center self-center opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                                <button
                                  onClick={() => handleStartEditMessage(msg)}
                                  className="product-icon-action !h-7 !w-7"
                                  title="Editar mensagem"
                                >
                                  <HugeiconsIcon icon={Edit01Icon} size={13} strokeWidth={2} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="product-icon-action !h-7 !w-7 text-error hover:bg-error/10"
                                  title="Excluir mensagem"
                                >
                                  <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={2} />
                                </button>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Editing Notification */}
              {editingMessage && (
                <div className="px-4 py-1.5 bg-surface-container-low border-t border-outline-variant/60 flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
                  <span className="flex items-center gap-1.5 text-primary">
                    <HugeiconsIcon icon={Edit01Icon} size={12} strokeWidth={2} />
                    <span>Editando mensagem...</span>
                  </span>
                  <button
                    onClick={handleCancelEditMessage}
                    className="text-error hover:underline text-xs font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <div className="p-3 bg-surface-container-lowest border-t border-outline-variant/70">
                <form
                  onSubmit={editingMessage ? handleSaveEditMessage : handleSendMessage}
                  className="flex items-end gap-2 bg-surface-container-low border border-outline-variant/70 rounded-product-control p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
                >
                  <textarea
                    value={editingMessage ? editMessageText : newMessage}
                    onChange={(e) => {
                      if (editingMessage) {
                        setEditMessageText(e.target.value);
                      } else {
                        setNewMessage(e.target.value);
                      }
                    }}
                    placeholder={
                      editingMessage
                        ? 'Altere a mensagem...'
                        : `Digite sua mensagem para ${selectedItem.student.nome.split(' ')[0]}...`
                    }
                    rows={1}
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none text-xs font-medium text-on-surface placeholder:text-on-surface-variant py-1.5 px-2 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (editingMessage) {
                          handleSaveEditMessage(e);
                        } else {
                          handleSendMessage();
                        }
                      }
                    }}
                  />

                  <button
                    type="submit"
                    disabled={editingMessage ? !editMessageText.trim() : !newMessage.trim()}
                    className="product-primary-action !min-h-8 !w-8 !p-0 flex items-center justify-center shrink-0 disabled:opacity-40"
                    title={editingMessage ? 'Salvar' : 'Enviar'}
                  >
                    <HugeiconsIcon icon={editingMessage ? Edit01Icon : SentIcon} size={15} strokeWidth={2} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="product-empty-state flex-1 flex flex-col items-center justify-center p-8">
              <HugeiconsIcon icon={Chat01Icon} size={36} className="text-primary mb-2" strokeWidth={1.5} />
              <h2 className="font-heading font-extrabold text-sm text-on-surface">Canal de Mensagens</h2>
              <p className="text-xs text-on-surface-variant max-w-[280px] mx-auto text-center mt-1">
                Selecione um aluno na barra lateral para trocar mensagens em tempo real.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
