import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';

export interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string;
  vibe_prefs: string[];
  budget_pref: number;
  created_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      return data as UserProfile;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const profile = query.data;

  let displayName = 'User';
  if (profile?.display_name) {
    displayName = profile.display_name;
  } else if (profile?.username) {
    displayName = profile.username;
  } else if (user?.email) {
    displayName = user.email.split('@')[0];
  }

  return {
    profile,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    displayName,
    avatarUrl: profile?.avatar_url || null,
  };
}
