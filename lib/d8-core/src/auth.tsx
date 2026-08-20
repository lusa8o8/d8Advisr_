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
  const baseUrl = import.meta.env.BASE_URL;
  if (!baseUrl.startsWith('/') || baseUrl.startsWith('//')) {
    console.warn('[D8 auth] Invalid Vite base path; falling back to the origin root');
    return '';
  }
  return baseUrl.replace(/\/$/, '');
}

function getRedirectOrigin() {
  const configuredOrigin = import.meta.env.VITE_AUTH_REDIRECT_ORIGIN?.trim();
  const fallbackOrigin = window.location.origin;
  let redirectOrigin = fallbackOrigin;

  if (configuredOrigin) {
    try {
      if (/\s/.test(configuredOrigin)) throw new Error('Origin cannot contain whitespace');

      const parsedOrigin = new URL(configuredOrigin);
      const isBareOrigin = parsedOrigin.pathname === '/'
        && !parsedOrigin.search
        && !parsedOrigin.hash
        && !parsedOrigin.username
        && !parsedOrigin.password;

      if (!isBareOrigin) throw new Error('Origin cannot contain a path or credentials');

      const canonicalOrigins = new Set([
        'https://d8advisr.com',
        'https://partner.d8advisr.com',
      ]);
      if (canonicalOrigins.has(fallbackOrigin) && parsedOrigin.origin !== fallbackOrigin) {
        throw new Error('Canonical deployments must redirect to their current origin');
      }

      redirectOrigin = parsedOrigin.origin;
    } catch {
      console.warn('[D8 auth] Invalid VITE_AUTH_REDIRECT_ORIGIN; falling back to current origin');
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

      // Visibility recovery and token refresh can emit a fresh User object for
      // the same authenticated identity. Preserve object identity so route
      // guards do not mistake a token refresh for an account change and
      // unmount protected forms.
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setUser(current => current?.id === session.user.id ? current : session.user);
      } else {
        setUser(session.user);
      }
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
    // The consumer and partner portals intentionally keep independent
    // origin-local sessions. Normal logout must not revoke the user's other
    // D8 portal sessions or devices.
    await supabase.auth.signOut({ scope: 'local' });
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
