import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Notification01Icon } from '@hugeicons/core-free-icons';
import { useStudentNotifications } from '../../hooks/useStudentNotifications';

interface NotificationBellProps {
  userId: string | undefined;
  enabled: boolean;
}

const formatNotificationDate = (value: string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const NotificationBell = ({ userId, enabled }: NotificationBellProps) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useStudentNotifications(userId, enabled);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    setOpen((current) => {
      const nextOpen = !current;
      if (nextOpen) refresh();
      return nextOpen;
    });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 transition-all relative"
        title="Notificações"
      >
        <HugeiconsIcon icon={Notification01Icon} size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-error text-on-error text-[10px] leading-5 font-bold text-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-[min(22rem,calc(100vw-2rem))] bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-extrabold text-body-md text-on-surface">Notificações</h3>
              <p className="text-label-sm text-on-surface-variant">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-label-sm font-bold text-primary hover:bg-primary/5 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                Marcar lidas
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="p-5 text-center text-label-md text-on-surface-variant">Carregando...</div>
            ) : error ? (
              <div className="p-4 text-label-md text-error bg-error-container/20 border-b border-error/10">
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-11 h-11 rounded-full bg-surface-container-low text-on-surface-variant mx-auto flex items-center justify-center">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} strokeWidth={2} />
                </div>
                <p className="text-label-md text-on-surface-variant">Nenhuma notificação por enquanto.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markAsRead(notification.id)}
                  className="w-full text-left px-4 py-3.5 border-b border-outline-variant/20 last:border-b-0 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${notification.read_at ? 'bg-outline-variant' : 'bg-primary'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-heading font-bold text-label-md text-on-surface truncate">
                          {notification.titulo}
                        </h4>
                        <span className="text-[11px] font-semibold text-on-surface-variant shrink-0">
                          {formatNotificationDate(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-label-sm text-on-surface-variant mt-1 leading-relaxed line-clamp-3">
                        {notification.mensagem}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
