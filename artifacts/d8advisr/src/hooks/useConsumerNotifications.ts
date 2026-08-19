import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@workspace/d8-core/auth';
import type { ConsumerNotification } from '@workspace/d8-core/types';

const NOTIFICATIONS_CHANGED_EVENT = 'd8:consumer-notifications-changed';

export function useConsumerNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ConsumerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('consumer_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped: ConsumerNotification[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        type: row.type as ConsumerNotification['type'],
        title: row.title,
        body: row.body,
        metadata: (row.metadata || {}) as Record<string, unknown>,
        readAt: row.read_at,
        createdAt: row.created_at,
      }));

      setNotifications(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();

    // Listen for local notifications change events across components
    const handleLocalChange = () => {
      void load(true);
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleLocalChange);

    // Listen for visibility changes
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    document.addEventListener('visibilitychange', onVisible);

    // Supabase Realtime channel subscription
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (user?.id) {
      channel = supabase
        .channel(`consumer-notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'consumer_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void load(true);
            window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleLocalChange);
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [load, user?.id]);

  const markRead = useCallback(async (id: string) => {
    if (!user?.id) return;
    const now = new Date().toISOString();

    // Optimistically update local state immediately
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, readAt: now } : n))
    );
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));

    try {
      const { error: updateError } = await supabase
        .from('consumer_notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      void load(true);
    }
  }, [user?.id, load]);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();

    // Optimistically update local state immediately
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? now })));
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));

    try {
      const { error: updateError } = await supabase
        .from('consumer_notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      void load(true);
    }
  }, [user?.id, load]);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    reload: load,
    markRead,
    markAllRead,
  };
}