import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@workspace/d8-core/auth';
import type { ConsumerNotification } from '@workspace/d8-core/types';

export function useConsumerNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ConsumerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

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
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    if (!user?.id) return;
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('consumer_notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, readAt: now } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('consumer_notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (updateError) throw updateError;

      setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? now })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [user?.id]);

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