import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Chat01Icon,
  SentIcon,
  Cancel01Icon,
  Attachment01Icon
} from '@hugeicons/core-free-icons';

interface ChatMessage {
  id: string;
  aluno_id: string;
  remetente_id: string | null;
  texto: string;
  created_at: string;
}

interface StudentChatWidgetProps {
  studentId: string;
}

export const StudentChatWidget: React.FC<StudentChatWidgetProps> = ({
  studentId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastOpened, setLastOpened] = useState<string>(
    localStorage.getItem(`chat_last_opened:${studentId}`) || new Date(0).toISOString()
  );

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);

  // Fetch initial chat messages
  useEffect(() => {
    if (!studentId) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('aluno_id', studentId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (data) {
          setMessages(data);
          calculateUnread(data, lastOpened);
        }
      } catch (err) {
        console.error('Error fetching chat messages:', err);
      }
    };

    fetchMessages();
  }, [studentId, lastOpened]);

  // Real-time listener for new chat messages
  useEffect(() => {
    if (!studentId) return;

    const channel = supabase
      .channel(`student-chat:${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `aluno_id=eq.${studentId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const updated = [...prev, newMsg];
              if (!isOpen) {
                calculateUnread(updated, lastOpened);
              }
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as ChatMessage;
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, isOpen, lastOpened]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const calculateUnread = (msgs: ChatMessage[], lastOpenTime: string) => {
    const unread = msgs.filter(
      (m) => m.remetente_id !== studentId && m.created_at > lastOpenTime
    );
    setUnreadCount(unread.length);
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setUnreadCount(0);
    const now = new Date().toISOString();
    setLastOpened(now);
    localStorage.setItem(`chat_last_opened:${studentId}`, now);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    const now = new Date().toISOString();
    setLastOpened(now);
    localStorage.setItem(`chat_last_opened:${studentId}`, now);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    // Optimistic Update
    const tempId = Math.random().toString();
    const tempMsg: ChatMessage = {
      id: tempId,
      aluno_id: studentId,
      remetente_id: studentId,
      texto: msgText,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          aluno_id: studentId,
          remetente_id: studentId,
          texto: msgText
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        // Replace optimistic message with actual DB message
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      }
    } catch (err) {
      console.error('Error sending message from student:', err);
      // Revert optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(msgText);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 group"
          title="Falar com o Professor"
        >
          <HugeiconsIcon
            icon={Chat01Icon}
            size={24}
            strokeWidth={2}
            className="group-hover:rotate-12 transition-transform duration-200"
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-error text-on-error rounded-full flex items-center justify-center font-bold text-xs animate-bounce shadow-md border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat window panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[550px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] bg-white border border-outline-variant/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Header */}
          <div className="p-4 bg-secondary text-white flex items-center justify-between shadow-sm select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <HugeiconsIcon icon={Chat01Icon} size={20} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm leading-tight">Falar com o Professor</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-white/80 font-medium">Canal de Dúvidas e Suporte</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleCloseChat}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Fechar chat"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesAreaRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50"
          >
            {messages.length > 0 ? (
              messages.map((msg) => {
                const isStudent = msg.remetente_id === studentId;
                return (
                  <div key={msg.id} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 max-w-[85%] ${isStudent ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isStudent && (
                        <div className="w-7 h-7 rounded-full bg-secondary/15 flex items-center justify-center font-bold text-secondary text-[10px] self-end shrink-0 border border-secondary/10 select-none">
                          PR
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 shadow-sm border transition-all relative ${
                          isStudent
                            ? 'bg-secondary text-white border-secondary-container rounded-tr-sm'
                            : 'bg-white text-on-surface border-slate-100 rounded-tl-sm'
                        }`}
                      >
                        <p className="text-xs leading-relaxed font-semibold break-words whitespace-pre-wrap">
                          {msg.texto}
                        </p>
                        <span
                          className={`block text-[9px] mt-1 text-right font-medium ${
                            isStudent ? 'text-white/70' : 'text-on-surface-variant/50'
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant/40 space-y-3 py-12">
                <HugeiconsIcon icon={Chat01Icon} size={32} strokeWidth={1.5} className="text-secondary/50" />
                <div>
                  <p className="text-xs font-bold text-on-surface/80">Tem alguma dúvida?</p>
                  <p className="text-[10px] max-w-[200px] mx-auto mt-1 leading-normal">
                    Envie uma mensagem para o seu professor por aqui. O histórico ficará salvo!
                  </p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white">
            <div className="flex items-end gap-2 bg-slate-50 border border-outline-variant/30 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-secondary/20 focus-within:border-secondary transition-all">
              <button
                type="button"
                className="p-2 text-on-surface-variant/40 hover:text-secondary hover:bg-slate-200/50 transition-colors rounded-lg shrink-0"
                title="Anexar arquivo"
              >
                <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={2} />
              </button>
              <textarea
                className="w-full bg-transparent border-0 focus:ring-0 resize-none text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/30 py-1.5 outline-none"
                placeholder="Escreva sua mensagem para o professor..."
                rows={1}
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
                className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center shrink-0 hover:bg-secondary/90 disabled:opacity-40 disabled:hover:bg-secondary transition-all shadow-sm"
                title="Enviar mensagem"
              >
                <HugeiconsIcon icon={SentIcon} size={16} strokeWidth={2} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
