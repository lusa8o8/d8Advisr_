import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@workspace/d8-core/supabase';
import type { Database } from '@workspace/d8-core/supabase';

export type PartnerNotification = Database['public']['Tables']['partner_notifications']['Row'];

export function usePartnerNotifications() {
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from('partner_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load partner notifications';
      setError(message);
      if (import.meta.env.DEV) {
        console.warn('[D8 partner notifications] Could not load notifications', message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = useCallback(async (id: string) => {
    const readAt = new Date().toISOString();
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, read_at: readAt } : item));

    const { error } = await supabase
      .from('partner_notifications')
      .update({ read_at: readAt })
      .eq('id', id);

    if (error) {
      await load();
      throw error;
    }
  }, [load]);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(item => !item.read_at).map(item => item.id);
    if (unreadIds.length === 0) return;

    const readAt = new Date().toISOString();
    setNotifications(prev => prev.map(item => item.read_at ? item : { ...item, read_at: readAt }));

    const { error } = await supabase
      .from('partner_notifications')
      .update({ read_at: readAt })
      .in('id', unreadIds);

    if (error) {
      await load();
      throw error;
    }
  }, [load, notifications]);

  const unreadCount = useMemo(
    () => notifications.filter(item => !item.read_at).length,
    [notifications],
  );

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
