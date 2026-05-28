import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useAdminStatus() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      setIsAdmin(false);
      setError(error.message);
      if (import.meta.env.DEV) {
        console.warn('[D8 auth] Could not load admin status', error.message);
      }
    } else {
      setIsAdmin(Boolean(data?.is_admin));
    }
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { isAdmin, loading: authLoading || loading, error, reload: load };
}
