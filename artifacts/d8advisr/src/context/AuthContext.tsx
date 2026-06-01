import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, nextPath?: string | null) => Promise<{ error: Error | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (nextPath?: string | null) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getAuthRedirectUrl(nextPath?: string | null) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const callbackUrl = new URL(`${window.location.origin}${basePath}/auth/callback`);
  if (nextPath) callbackUrl.searchParams.set('next', nextPath);
  return callbackUrl.toString();
}

function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
      } catch {
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);

      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(session.user);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, nextPath?: string | null) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeAuthEmail(email),
      password,
      options: { emailRedirectTo: getAuthRedirectUrl(nextPath) },
    });
    return { error, session: data.session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeAuthEmail(email),
      password,
    });
    return { error };
  };

  const signInWithGoogle = async (nextPath?: string | null) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(nextPath),
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
