import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook centralizado para buscar e monitorar correções pendentes.
 *
 * Elimina a triplicação de queries que existia em:
 *   - App.tsx (L83-113)
 *   - DashboardProfessorOverview.tsx (L131-135)
 *   - DashboardProfessor.tsx (implícito nos cálculos de pendências)
 *
 * Usa um canal Realtime do Supabase para atualização automática
 * sempre que há nova entrega ou nota registrada.
 *
 * NOTA: Cada instância gera um channelId único para evitar conflito
 * quando o hook é montado em múltiplos componentes simultaneamente.
 */
export const usePendingCorrections = (enabled: boolean = true) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // ID único e estável por instância do hook — evita colisão de canais
  const channelIdRef = useRef(`pending-corrections-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchCount = async () => {
      try {
        const { count: pendingCount, error } = await supabase
          .from('entregas_atividades')
          .select('id', { count: 'exact', head: true })
          .is('nota', null);

        if (error) throw error;
        setCount(pendingCount ?? 0);
      } catch (err) {
        console.error('[usePendingCorrections] Erro ao buscar pendentes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    // Subscription em tempo real com nome de canal único por instância
    const channel = supabase
      .channel(channelIdRef.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entregas_atividades' },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return { count, loading };
};
