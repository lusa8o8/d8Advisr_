import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  markPasswordRecovery: () => void;
  clearPasswordRecovery: () => void;
  signUp: (email: string, password: string, nextPath?: string | null) => Promise<{ error: Error | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (nextPath?: string | null) => Promise<{ error: Error | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PASSWORD_RECOVERY_KEY = 'd8advisr_password_recovery';
const PASSWORD_RECOVERY_REQUESTED_KEY = 'd8advisr_password_recovery_requested';

function getAuthRedirectUrl(nextPath?: string | null) {
  const callbackUrl = new URL(`${getRedirectOrigin()}${getBasePath()}/auth/callback`);
  if (nextPath) callbackUrl.searchParams.set('next', nextPath);
  return callbackUrl.toString();
}

function getAppRedirectUrl(path: string) {
  return `${getRedirectOrigin()}${getBasePath()}${path.startsWith('/') ? path : `/${path}`}`;
}

function getBasePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}

function getRedirectOrigin() {
  const configuredOrigin = import.meta.env.VITE_AUTH_REDIRECT_ORIGIN?.trim();
  const fallbackOrigin = window.location.origin;
  let redirectOrigin = fallbackOrigin;

  if (configuredOrigin) {
    try {
      redirectOrigin = new URL(configuredOrigin).origin;
    } catch {
      if (import.meta.env.DEV) {
        console.warn('[D8 auth] Invalid VITE_AUTH_REDIRECT_ORIGIN; falling back to current origin');
      }
    }
  }

  return redirectOrigin;
}

function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    return Boolean(
      sessionStorage.getItem(PASSWORD_RECOVERY_KEY)
      || sessionStorage.getItem(PASSWORD_RECOVERY_REQUESTED_KEY),
    );
  });

  const markPasswordRecovery = () => {
    sessionStorage.setItem(PASSWORD_RECOVERY_KEY, 'true');
    setIsPasswordRecovery(true);
  };

  const clearPasswordRecovery = () => {
    sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
    sessionStorage.removeItem(PASSWORD_RECOVERY_REQUESTED_KEY);
    setIsPasswordRecovery(false);
  };

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        markPasswordRecovery();
      }

      if (event === 'SIGNED_OUT') {
        clearPasswordRecovery();
      }

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

  const sendPasswordReset = async (email: string) => {
    sessionStorage.setItem(PASSWORD_RECOVERY_REQUESTED_KEY, 'true');
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeAuthEmail(email), {
      redirectTo: getAppRedirectUrl('/password/update'),
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const signOut = async () => {
    clearPasswordRecovery();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      loading,
      isPasswordRecovery,
      markPasswordRecovery,
      clearPasswordRecovery,
      signUp,
      signIn,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
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
