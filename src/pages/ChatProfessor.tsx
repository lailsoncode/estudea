import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Chat01Icon,
  SentIcon,
  Attachment01Icon,
  Edit01Icon,
  Delete02Icon,
  UserGroupIcon
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

export const ChatProfessor: React.FC = () => {
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
    getCurrentTeacher();
    fetchInitialData();
  }, []);

  // Fetch messages when selected student changes
  useEffect(() => {
    if (selectedStudentId) {
      fetchMessages(selectedStudentId);
    } else {
      setMessages([]);
    }
  }, [selectedStudentId]);

  // Handle message updates/inserts via Realtime
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
          const newMsg = payload.new as ChatMessage;
          const oldMsg = payload.old as ChatMessage;

          // 1. If message belongs to selected student, update active chat list
          if (selectedStudentId) {
            if (payload.eventType === 'INSERT' && newMsg.aluno_id === selectedStudentId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            } else if (payload.eventType === 'UPDATE' && newMsg.aluno_id === selectedStudentId) {
              setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? newMsg : m)));
            } else if (payload.eventType === 'DELETE' && oldMsg) {
              setMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
            }
          }

          // 2. Trigger a refresh of student list states to update snippets & unread counts
          refreshChatListData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStudentId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getCurrentTeacher = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentTeacherId(session.user.id);
      }
    } catch (err) {
      console.error('Error fetching teacher session:', err);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome');
      setTurmas(turmasData || []);

      // Fetch student profiles
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, nome, email, avatar_url, turma_id')
        .eq('role', 'student')
        .order('nome', { ascending: true });
      
      setStudents(studentsData || []);
    } catch (err) {
      console.error('Error fetching initial chat data:', err);
    } finally {
      setLoading(false);
    }
  };

  // State to refresh snippets / unread counts
  const [chatMessagesCache, setChatMessagesCache] = useState<ChatMessage[]>([]);

  const fetchAllMessagesCache = async () => {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (data) {
        setChatMessagesCache(data);
      }
    } catch (err) {
      console.error('Error caching messages:', err);
    }
  };

  useEffect(() => {
    fetchAllMessagesCache();
  }, [students]);

  const refreshChatListData = () => {
    fetchAllMessagesCache();
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

      // Mark as read
      if (currentTeacherId) {
        localStorage.setItem(`chat_last_opened:${currentTeacherId}:${studentId}`, new Date().toISOString());
        refreshChatListData();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Process list items with last message & unread counts
  const chatListItems = useMemo<ChatListItem[]>(() => {
    const turmaMap = new Map(turmas.map((t) => [t.id, t.nome]));
    
    return students.map((student) => {
      const studentMessages = chatMessagesCache.filter((m) => m.aluno_id === student.id);
      const lastMessage = studentMessages.length > 0 ? studentMessages[studentMessages.length - 1] : null;

      // Count unread (only messages sent by student)
      let unreadCount = 0;
      if (currentTeacherId) {
        const lastOpenedKey = `chat_last_opened:${currentTeacherId}:${student.id}`;
        const lastOpenedStr = localStorage.getItem(lastOpenedKey) || new Date(0).toISOString();
        const lastOpenedTime = new Date(lastOpenedStr).getTime();

        unreadCount = studentMessages.filter(
          (m) => m.remetente_id === student.id && new Date(m.created_at).getTime() > lastOpenedTime
        ).length;
      }

      return {
        student,
        turmaNome: student.turma_id ? (turmaMap.get(student.turma_id) || 'Sem Turma') : 'Sem Turma',
        lastMessage,
        unreadCount
      };
    });
  }, [students, turmas, chatMessagesCache, currentTeacherId, selectedStudentId]);

  // Filter and sort items
  const filteredChatList = useMemo(() => {
    let result = chatListItems;

    // Search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.student.nome.toLowerCase().includes(searchLower) ||
          item.student.email.toLowerCase().includes(searchLower)
      );
    }

    // Turma filter
    if (selectedTurmaId !== 'all') {
      result = result.filter((item) => item.student.turma_id === selectedTurmaId);
    }

    // Sort: most recent message first, followed by alphabetical order for those without messages
    return [...result].sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      }
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return a.student.nome.localeCompare(b.student.nome);
    });
  }, [chatListItems, searchTerm, selectedTurmaId]);

  const selectedItem = useMemo(() => {
    return chatListItems.find((item) => item.student.id === selectedStudentId) || null;
  }, [chatListItems, selectedStudentId]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedStudentId || !currentTeacherId) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    const tempId = crypto.randomUUID();
    const tempMsg: ChatMessage = {
      id: tempId,
      aluno_id: selectedStudentId,
      remetente_id: currentTeacherId,
      texto: msgText,
      created_at: new Date().toISOString()
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          aluno_id: selectedStudentId,
          remetente_id: currentTeacherId,
          texto: msgText
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with actual db message
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      
      // Mark as read immediately
      localStorage.setItem(`chat_last_opened:${currentTeacherId}:${selectedStudentId}`, new Date().toISOString());
      refreshChatListData();
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove the message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Deseja realmente excluir esta mensagem?')) return;

    const previousMessages = [...messages];
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
      setMessages(previousMessages);
      alert('Erro ao excluir mensagem.');
    }
  };

  // Edit message
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

  // Group messages by day
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
    <div className="bg-background w-full flex flex-col h-full rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Students List */}
        <aside className="w-80 md:w-96 border-r border-outline-variant/30 flex flex-col bg-white">
          {/* Header Controls */}
          <div className="p-4 border-b border-slate-100/80 space-y-3">
            <h3 className="font-heading font-extrabold text-body-lg text-on-surface flex items-center gap-2">
              <HugeiconsIcon icon={Chat01Icon} size={20} className="text-secondary" />
              <span>Mensagens dos Alunos</span>
            </h3>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar aluno..."
                className="w-full bg-slate-50 border border-outline-variant/55 rounded-xl py-2 px-3 pl-9 text-xs font-semibold placeholder:text-on-surface-variant/35 focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
              />
              <svg className="w-4 h-4 text-on-surface-variant/40 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Turma Filter Selector */}
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={UserGroupIcon} size={15} className="text-on-surface-variant/50" />
              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold text-on-surface-variant/80 focus:ring-0 p-0 pr-6 cursor-pointer select-none"
              >
                <option value="all">Todas as Turmas</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin mx-auto" />
                <p className="text-xs font-bold text-on-surface-variant">Carregando conversas...</p>
              </div>
            ) : filteredChatList.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant/40 space-y-2">
                <HugeiconsIcon icon={Chat01Icon} size={28} className="mx-auto" />
                <p className="text-xs font-bold">Nenhum aluno encontrado</p>
                <p className="text-[10px]">Verifique os termos da busca ou filtro de turma.</p>
              </div>
            ) : (
              filteredChatList.map((item) => {
                const active = item.student.id === selectedStudentId;
                return (
                  <button
                    key={item.student.id}
                    onClick={() => setSelectedStudentId(item.student.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-all ${
                      active 
                        ? 'bg-secondary/5 border-l-4 border-l-secondary' 
                        : 'hover:bg-slate-50/70 border-l-4 border-l-transparent'
                    }`}
                  >
                    {/* Student Avatar */}
                    {item.student.avatar_url ? (
                      <img
                        src={item.student.avatar_url}
                        alt={item.student.nome}
                        className="w-10 h-10 rounded-full object-cover border border-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary border border-secondary/15 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                        {getInitials(item.student.nome)}
                      </div>
                    )}

                    {/* Metadata Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-heading font-bold text-xs text-on-surface truncate">
                          {item.student.nome}
                        </h4>
                        {item.lastMessage && (
                          <span className="text-[9px] font-bold text-on-surface-variant/50 shrink-0">
                            {formatTime(item.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-secondary font-bold truncate mt-0.5">
                        {item.turmaNome}
                      </p>

                      <p className="text-[11px] font-semibold text-on-surface-variant/70 truncate mt-1">
                        {item.lastMessage ? (
                          item.lastMessage.remetente_id === currentTeacherId ? (
                            <span className="text-secondary/80 font-bold mr-1">Você:</span>
                          ) : null
                        ) : null}
                        {item.lastMessage ? item.lastMessage.texto : 'Nenhuma mensagem trocada.'}
                      </p>
                    </div>

                    {/* Unread badge indicator */}
                    {item.unreadCount > 0 && (
                      <span className="bg-error text-white text-[9px] font-black rounded-full h-4 min-w-4 px-1 flex items-center justify-center animate-pulse shrink-0 self-center shadow-sm">
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
        <section className="flex-1 flex flex-col bg-slate-50/30">
          {selectedItem ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 bg-white border-b border-outline-variant/30 flex items-center justify-between shadow-xs select-none">
                <div className="flex items-center gap-3">
                  {selectedItem.student.avatar_url ? (
                    <img
                      src={selectedItem.student.avatar_url}
                      alt={selectedItem.student.nome}
                      className="w-10 h-10 rounded-full object-cover border border-slate-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary border border-secondary/15 flex items-center justify-center font-bold text-sm select-none">
                      {getInitials(selectedItem.student.nome)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-heading font-extrabold text-sm text-on-surface">
                      {selectedItem.student.nome}
                    </h3>
                    <p className="text-[10px] font-bold text-secondary flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{selectedItem.turmaNome}</span>
                      <span className="text-on-surface-variant/40 font-normal">•</span>
                      <span className="text-on-surface-variant/70 font-semibold">{selectedItem.student.email}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Listing */}
              <div
                ref={messagesAreaRef}
                className="flex-1 overflow-y-auto p-6 space-y-6"
              >
                {groupedMessages.map((group) => (
                  <div key={group.dateLabel} className="space-y-4">
                    {/* Date separator */}
                    <div className="flex justify-center my-3">
                      <span className="bg-slate-100 text-on-surface-variant/70 font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                        {group.dateLabel}
                      </span>
                    </div>

                    {/* Messages under this group */}
                    {group.msgs.map((msg) => {
                      const isProfessor = msg.remetente_id === currentTeacherId;
                      return (
                        <div key={msg.id} className={`flex ${isProfessor ? 'justify-end' : 'justify-start'} group`}>
                          <div className={`flex gap-2 max-w-[75%] ${isProfessor ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {/* Student initial (if not teacher) */}
                            {!isProfessor && (
                              <div className="w-7 h-7 rounded-full bg-slate-200/60 flex items-center justify-center font-bold text-on-surface-variant text-[10px] self-end shrink-0 border border-outline-variant/10 select-none">
                                {getInitials(selectedItem.student.nome)}
                              </div>
                            )}

                            {/* Bubble body */}
                            <div
                              className={`rounded-2xl px-4 py-3 shadow-sm border transition-all relative ${
                                isProfessor
                                  ? 'bg-secondary text-white border-secondary-container rounded-tr-sm'
                                  : 'bg-white text-on-surface border-slate-100 rounded-tl-sm'
                              }`}
                            >
                              <p className="text-xs leading-relaxed font-semibold break-words whitespace-pre-wrap">
                                {msg.texto}
                              </p>
                              <span
                                className={`block text-[9px] mt-1.5 text-right font-medium ${
                                  isProfessor ? 'text-white/70' : 'text-on-surface-variant/50'
                                }`}
                              >
                                {formatTime(msg.created_at)}
                              </span>
                            </div>

                            {/* Hover Actions for teacher messages */}
                            {isProfessor && (
                              <div className="flex gap-1 items-center self-center opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                                <button
                                  onClick={() => handleStartEditMessage(msg)}
                                  className="p-1.5 text-on-surface-variant/40 hover:text-primary hover:bg-slate-100 rounded transition-colors"
                                  title="Editar mensagem"
                                >
                                  <HugeiconsIcon icon={Edit01Icon} size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1.5 text-on-surface-variant/40 hover:text-error hover:bg-slate-100 rounded transition-colors"
                                  title="Excluir mensagem"
                                >
                                  <HugeiconsIcon icon={Delete02Icon} size={14} />
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

              {/* Editing Action Bar */}
              {editingMessage && (
                <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-on-surface-variant/80">
                  <span className="flex items-center gap-1.5">
                    <HugeiconsIcon icon={Edit01Icon} size={12} className="text-primary" />
                    <span>Editando mensagem selecionada...</span>
                  </span>
                  <button
                    onClick={handleCancelEditMessage}
                    className="text-error hover:underline text-xs font-black uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <div className="p-4 bg-white border-t border-outline-variant/30">
                <form
                  onSubmit={editingMessage ? handleSaveEditMessage : handleSendMessage}
                  className="flex items-end gap-3 bg-slate-50 border border-outline-variant/55 rounded-xl p-2 focus-within:ring-2 focus-within:ring-secondary/20 focus-within:border-secondary transition-all"
                >
                  <button
                    type="button"
                    className="p-2 text-on-surface-variant/40 hover:text-secondary hover:bg-slate-200/50 transition-colors rounded-lg shrink-0"
                    title="Anexar arquivo"
                  >
                    <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={2} />
                  </button>
                  
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
                        ? 'Altere o conteúdo da mensagem...'
                        : `Digite sua mensagem para ${selectedItem.student.nome.split(' ')[0]}...`
                    }
                    rows={1}
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/30 py-2 outline-none"
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
                    className="w-9 h-9 rounded-lg bg-secondary text-white flex items-center justify-center shrink-0 hover:bg-secondary/90 disabled:opacity-40 disabled:hover:bg-secondary transition-all shadow-sm"
                    title={editingMessage ? 'Salvar alterações' : 'Enviar mensagem'}
                  >
                    <HugeiconsIcon icon={editingMessage ? Edit01Icon : SentIcon} size={16} strokeWidth={2} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-on-surface-variant/40 space-y-4 select-none">
              <div className="w-16 h-16 rounded-full bg-secondary/5 text-secondary flex items-center justify-center shadow-xs">
                <HugeiconsIcon icon={Chat01Icon} size={32} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading font-extrabold text-sm text-on-surface/80">Canal Integrado de Mensagens</h3>
                <p className="text-xs max-w-[280px] mx-auto leading-relaxed">
                  Selecione um aluno na barra lateral para carregar a conversa e trocar mensagens em tempo real.
                </p>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
