import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { AuthProvider, useAuth } from '@workspace/d8-core/auth';
import {
  authPathWithNext,
  getSafeNextPathFromUrl,
  storeOAuthError,
} from '@workspace/d8-core/auth-redirect';
import {
  getCurrentAccountContext,
  type AccountContext,
} from '@workspace/d8-core/account-scope';
import {
  hasPartnerCapability,
  type PartnerCapability,
} from '@workspace/d8-core/partner-capabilities';
import { supabase } from '@workspace/d8-core/supabase';
import { PrivacyPolicyPage, TermsOfServicePage } from '@workspace/d8-core/legal';
import { PartnerPortal } from '@/pages/PartnerPortal';
import { PartnerDashboard } from '@/pages/PartnerDashboard';
import { PartnerNotifications } from '@/pages/PartnerNotifications';
import { PartnerEventEditor } from '@/pages/PartnerEventEditor';
import { PartnerVenueEditor } from '@/pages/PartnerVenueEditor';
import { PartnerSocialCompose } from '@/pages/PartnerSocialCompose';
import { SignIn } from '@/pages/SignIn';
import { SignUp } from '@/pages/SignUp';
import { PasswordResetRequest } from '@/pages/PasswordResetRequest';
import { PasswordUpdate } from '@/pages/PasswordUpdate';

const queryClient = new QueryClient();
const PASSWORD_RECOVERY_KEY = 'd8advisr_password_recovery';

function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#F7F7F7]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function consumerOrigin() {
  const configured = import.meta.env.VITE_CONSUMER_ORIGIN?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the local-development default.
    }
  }
  return import.meta.env.DEV ? 'http://localhost:3000' : 'https://d8advisr.com';
}

function redirectToConsumer(path: string) {
  window.location.replace(`${consumerOrigin()}${path}`);
}

function useAccountContext(userId?: string) {
  const [context, setContext] = useState<AccountContext | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setContext(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    void getCurrentAccountContext()
      .then(value => {
        if (active) setContext(value);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not resolve account access');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return { context, loading, error };
}

function PartnerEntryGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isPasswordRecovery } = useAuth();
  const [location, setLocation] = useLocation();
  const { context, loading: scopeLoading, error } = useAccountContext(user?.id);

  useEffect(() => {
    if (authLoading || scopeLoading) return;
    if (isPasswordRecovery) {
      setLocation('/password/update');
      return;
    }
    if (!user) {
      setLocation(authPathWithNext('/signin', location));
      return;
    }
    if (context?.scope === 'admin') {
      redirectToConsumer('/admin');
      return;
    }
    if (context?.scope === 'partner' && context.partnerStatus === 'live') {
      setLocation('/dashboard');
    }
  }, [authLoading, context, isPasswordRecovery, location, scopeLoading, setLocation, user?.id]);

  if (authLoading || scopeLoading) return <LoadingScreen />;
  if (error) {
    return <div className="flex-1 grid place-items-center p-6 text-sm text-red-600">{error}</div>;
  }
  if (!user || context?.scope === 'admin' || context?.partnerStatus === 'live') return null;
  return <>{children}</>;
}

function PartnerGuard({
  children,
  capability,
}: {
  children: ReactNode;
  capability?: PartnerCapability;
}) {
  const { user, loading: authLoading, isPasswordRecovery } = useAuth();
  const [location, setLocation] = useLocation();
  const { context, loading: scopeLoading, error } = useAccountContext(user?.id);
  const allowed = Boolean(
    context?.scope === 'partner'
    && context.partnerStatus === 'live'
    && hasPartnerCapability(context.partnerType, capability),
  );

  useEffect(() => {
    if (authLoading || scopeLoading) return;
    if (isPasswordRecovery) {
      setLocation('/password/update');
      return;
    }
    if (!user) {
      setLocation(authPathWithNext('/signin', location));
      return;
    }
    if (context?.scope === 'admin') {
      redirectToConsumer('/admin');
      return;
    }
    if (!allowed) setLocation('/');
  }, [allowed, authLoading, context?.scope, isPasswordRecovery, location, scopeLoading, setLocation, user?.id]);

  if (authLoading || scopeLoading) return <LoadingScreen />;
  if (error) {
    return <div className="flex-1 grid place-items-center p-6 text-sm text-red-600">{error}</div>;
  }
  if (!allowed) return null;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { context, loading: scopeLoading, error } = useAccountContext(user?.id);

  useEffect(() => {
    if (authLoading || scopeLoading || !user || !context) return;
    if (context.scope === 'admin') {
      redirectToConsumer('/admin');
    } else if (context.scope === 'partner' && context.partnerStatus === 'live') {
      setLocation('/dashboard');
    } else {
      setLocation('/');
    }
  }, [authLoading, context, scopeLoading, setLocation, user?.id]);

  if (authLoading || (user && scopeLoading)) return <LoadingScreen />;
  if (error) {
    return <div className="flex-1 grid place-items-center p-6 text-sm text-red-600">{error}</div>;
  }
  if (user) return null;
  return <>{children}</>;
}

function AuthCallback() {
  const { user, loading, markPasswordRecovery, clearPasswordRecovery } = useAuth();
  const [, setLocation] = useLocation();
  const exchangedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthError = params.get('error_description')
      ?? hashParams.get('error_description')
      ?? params.get('error')
      ?? hashParams.get('error');

    if (oauthError) {
      storeOAuthError(oauthError);
      setLocation(authPathWithNext('/signin', getSafeNextPathFromUrl() ?? '/'));
      return;
    }

    const redirectPath = getSafeNextPathFromUrl() ?? '/';
    const code = params.get('code');
    const isRecovery =
      redirectPath === '/password/update'
      || params.get('type') === 'recovery'
      || hashParams.get('type') === 'recovery'
      || sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === 'true';

    if (code && exchangedCodeRef.current !== code) {
      exchangedCodeRef.current = code;
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!active) return;
        if (error) {
          storeOAuthError(error.message);
          setLocation(authPathWithNext('/signin', redirectPath));
          return;
        }
        if (isRecovery) {
          sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
          markPasswordRecovery();
          setLocation('/password/update');
        } else {
          clearPasswordRecovery();
          setLocation(redirectPath);
        }
      });
      return () => {
        active = false;
      };
    }

    if (!loading) {
      setLocation(
        isRecovery
          ? '/password/update'
          : user
            ? redirectPath
            : authPathWithNext('/signin', redirectPath),
      );
    }
    return () => {
      active = false;
    };
  }, [clearPasswordRecovery, loading, markPasswordRecovery, setLocation, user]);

  return <LoadingScreen />;
}

function Router() {
  return (
    <Switch>
      <Route path="/signin"><PublicOnlyRoute><SignIn /></PublicOnlyRoute></Route>
      <Route path="/signup"><PublicOnlyRoute><SignUp /></PublicOnlyRoute></Route>
      <Route path="/password/reset" component={PasswordResetRequest} />
      <Route path="/password/update" component={PasswordUpdate} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/privacy"><PrivacyPolicyPage /></Route>
      <Route path="/terms"><TermsOfServicePage /></Route>

      <Route path="/dashboard"><PartnerGuard><PartnerDashboard /></PartnerGuard></Route>
      <Route path="/notifications"><PartnerGuard><PartnerNotifications /></PartnerGuard></Route>
      <Route path="/event/new"><PartnerGuard capability="events"><PartnerEventEditor /></PartnerGuard></Route>
      <Route path="/event/:id/edit"><PartnerGuard capability="events"><PartnerEventEditor /></PartnerGuard></Route>
      <Route path="/venue/edit"><PartnerGuard capability="venues"><PartnerVenueEditor /></PartnerGuard></Route>
      <Route path="/social/compose"><PartnerGuard capability="events"><PartnerSocialCompose /></PartnerGuard></Route>

      <Route path="/"><PartnerEntryGuard><PartnerPortal /></PartnerEntryGuard></Route>
      <Route><PartnerEntryGuard><PartnerPortal /></PartnerEntryGuard></Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter>
          <div className="min-h-screen flex flex-col bg-[#F7F7F7]">
            <Router />
          </div>
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
