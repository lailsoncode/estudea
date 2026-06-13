import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface StudentNotification {
  id: string;
  turma_id: string;
  titulo: string;
  mensagem: string;
  remetente_id: string | null;
  created_at: string;
  read_at: string | null;
}

interface NotificationRow {
  id: string;
  turma_id: string;
  titulo: string;
  mensagem: string;
  remetente_id: string | null;
  created_at: string;
}

interface NotificationReadRow {
  notificacao_id: string;
  lida_em: string;
}

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

export const useStudentNotifications = (userId: string | undefined, enabled: boolean) => {
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!enabled || !userId) {
      setNotifications([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('turma_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (!profileData?.turma_id) {
        setNotifications([]);
        return;
      }

      const { data: notificationData, error: notificationError } = await supabase
        .from('notificacoes')
        .select('id, turma_id, titulo, mensagem, remetente_id, created_at')
        .eq('turma_id', profileData.turma_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notificationError) throw notificationError;

      const rows = (notificationData || []) as NotificationRow[];
      const notificationIds = rows.map((notification) => notification.id);
      let readMap = new Map<string, string>();

      if (notificationIds.length > 0) {
        const { data: readData, error: readError } = await supabase
          .from('notificacao_leituras')
          .select('notificacao_id, lida_em')
          .eq('aluno_id', userId)
          .in('notificacao_id', notificationIds);

        if (readError) throw readError;

        readMap = new Map(
          ((readData || []) as NotificationReadRow[]).map((read) => [read.notificacao_id, read.lida_em])
        );
      }

      setNotifications(rows.map((notification) => ({
        ...notification,
        read_at: readMap.get(notification.id) || null,
      })));
    } catch (err: unknown) {
      console.error('Erro ao carregar notificacoes:', err);
      setError(getErrorMessage(err, 'Nao foi possivel carregar as notificacoes.'));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;

    const now = new Date().toISOString();
    setNotifications((current) => current.map((notification) => (
      notification.id === notificationId
        ? { ...notification, read_at: notification.read_at || now }
        : notification
    )));

    const { error: readError } = await supabase
      .from('notificacao_leituras')
      .upsert({
        notificacao_id: notificationId,
        aluno_id: userId,
        lida_em: now,
      }, { onConflict: 'notificacao_id,aluno_id' });

    if (readError) {
      console.error('Erro ao marcar notificacao como lida:', readError);
      setError(readError.message || 'Nao foi possivel marcar a notificacao como lida.');
      await fetchNotifications();
    }
  }, [fetchNotifications, userId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const unread = notifications.filter((notification) => !notification.read_at);
    if (unread.length === 0) return;

    const now = new Date().toISOString();
    setNotifications((current) => current.map((notification) => ({
      ...notification,
      read_at: notification.read_at || now,
    })));

    const { error: readError } = await supabase
      .from('notificacao_leituras')
      .upsert(
        unread.map((notification) => ({
          notificacao_id: notification.id,
          aluno_id: userId,
          lida_em: now,
        })),
        { onConflict: 'notificacao_id,aluno_id' }
      );

    if (readError) {
      console.error('Erro ao marcar notificacoes como lidas:', readError);
      setError(readError.message || 'Nao foi possivel marcar as notificacoes como lidas.');
      await fetchNotifications();
    }
  }, [fetchNotifications, notifications, userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};
