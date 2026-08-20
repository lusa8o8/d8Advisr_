import { type ReactNode, useState, useEffect, useRef } from 'react';
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Layout & UI
import { MobileFrame } from "@/components/MobileFrame";
import { DesktopShell } from "@/components/DesktopShell";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useTheme } from "@/hooks/useTheme";

// Auth
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

// Pages
import { Welcome } from "@/pages/Welcome";
import { SignUp } from "@/pages/SignUp";
import { SignIn } from "@/pages/SignIn";
import { PasswordResetRequest } from "@/pages/PasswordResetRequest";
import { PasswordUpdate } from "@/pages/PasswordUpdate";
import { InitialPreferences } from "@/pages/InitialPreferences";
import { HomeDiscovery } from "@/pages/HomeDiscovery";
import { MapView } from "@/pages/MapView";
import { VenueDetails } from "@/pages/VenueDetails";
import { PlanGenerator } from "@/pages/PlanGenerator";
import { PlanOverview } from "@/pages/PlanOverview";
import { PlanDetail } from "@/pages/PlanDetail";
import { PlanEdit } from "@/pages/PlanEdit";
import { ExecutionTracker } from "@/pages/ExecutionTracker";
import { ProfileOverview } from "@/pages/ProfileOverview";
import { BadgesPage } from "@/pages/BadgesPage";
import { PreferenceEdit } from "@/pages/PreferenceEdit";
import { BudgetDashboard } from "@/pages/BudgetDashboard";
import { CreateGroupPlan } from "@/pages/CreateGroupPlan";
import { NotificationsCenter } from "@/pages/NotificationsCenter";
import { AdminPanel } from "@/pages/AdminPanel";
import { EventDetail } from "@/pages/EventDetail";
import { VenueSubmit } from "@/pages/VenueSubmit";
import { SavedPlans } from "@/pages/SavedPlans";
import { PostDateReview } from "@/pages/PostDateReview";
import { ReviewComplete } from "@/pages/ReviewComplete";
import { Settings } from "@/pages/Settings";
import { authPathWithNext, getPostAuthRedirectPath, storeOAuthError } from "@/lib/authRedirect";
import { getCurrentAccountContext } from "@workspace/d8-core/account-scope";
import { EventPublishingPolicyPage, PartnerPoliciesPage, PrivacyPolicyPage, TermsOfServicePage } from "@workspace/d8-core/legal";

const queryClient = new QueryClient();
const PASSWORD_RECOVERY_KEY = 'd8advisr_password_recovery';

function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

async function hasCompletedConsumerOnboarding(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('vibe_prefs')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[D8 onboarding] Could not read consumer preferences', { userId, error: error.message });
    }
    return true;
  }

  return Array.isArray(data?.vibe_prefs) && data.vibe_prefs.length > 0;
}

function ConsumerGuard({ children }: { children: ReactNode }) {
  const { user, loading, isPasswordRecovery } = useAuth();
  const [location, setLocation] = useLocation();
  const [checkingScope, setCheckingScope] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkScope() {
      if (loading) return;

      if (isPasswordRecovery) {
        setLocation('/password/update');
        return;
      }

      if (!user) {
        setLocation(authPathWithNext('/signin', location));
        return;
      }

      const context = await getCurrentAccountContext();
      if (!active) return;

      if (context.scope === 'admin') {
        setLocation('/admin');
        return;
      }

      const completedOnboarding = await hasCompletedConsumerOnboarding(user.id);
      if (!active) return;

      if (!completedOnboarding && location !== '/preferences') {
        // Wouter can reconcile protected routes through the same ConsumerGuard
        // instance. Clear the current check before navigating so an account
        // without consumer preferences cannot remain behind the loading screen
        // while the guard instance is reused for /preferences.
        setAllowed(true);
        setCheckingScope(false);
        setLocation('/preferences');
        return;
      }

      setAllowed(true);
      setCheckingScope(false);
    }

    setAllowed(false);
    setCheckingScope(true);
    setScopeError(null);
    void checkScope().catch(error => {
      if (!active) return;
      setScopeError(error instanceof Error ? error.message : 'Could not resolve account access');
      setCheckingScope(false);
    });

    return () => { active = false; };
  }, [isPasswordRecovery, loading, setLocation, user?.id]);

  if (loading || checkingScope) return <LoadingScreen />;
  if (scopeError) {
    return <div className="flex-1 grid place-items-center p-6 text-sm text-red-600">{scopeError}</div>;
  }

  if (!allowed) return null;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading, isPasswordRecovery } = useAuth();
  const [location, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      if (loading) return;
      if (isPasswordRecovery) {
        setLocation('/password/update');
        return;
      }
      if (!user) {
        setLocation(authPathWithNext('/signin', location));
        return;
      }

      const context = await getCurrentAccountContext();
      if (!active) return;
      if (context.scope === 'admin') {
        setAllowed(true);
        setChecking(false);
      } else {
        setLocation('/home');
      }
    }

    setAllowed(false);
    setChecking(true);
    setScopeError(null);
    void checkAdmin().catch(error => {
      if (!active) return;
      setScopeError(error instanceof Error ? error.message : 'Could not resolve admin access');
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [user?.id, isPasswordRecovery, loading, setLocation]);

  if (loading || checking) return <LoadingScreen />;
  if (scopeError) {
    return <div className="flex-1 grid place-items-center p-6 text-sm text-red-600">{scopeError}</div>;
  }

  if (!allowed) return null;
  return <>{children}</>;
}

function AuthCallback() {
  const { session, user, loading, markPasswordRecovery, clearPasswordRecovery } = useAuth();
  const [, setLocation] = useLocation();
  const [exchangingCode, setExchangingCode] = useState(false);
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
      setLocation(authPathWithNext('/signin', getPostAuthRedirectPath()));
      return;
    }

    const redirectPath = getPostAuthRedirectPath();
    const code = params.get('code');
    const isPasswordRecoveryTarget =
      redirectPath === '/password/update'
      || params.get('type') === 'recovery'
      || hashParams.get('type') === 'recovery'
      || sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === 'true';

    if (code && exchangedCodeRef.current !== code) {
      exchangedCodeRef.current = code;
      setExchangingCode(true);
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!active) return;
        setExchangingCode(false);

        if (error) {
          if (isPasswordRecoveryTarget) {
            setLocation('/password/update');
            return;
          }
          storeOAuthError(error.message);
          setLocation(authPathWithNext('/signin', redirectPath));
          return;
        }

        if (isPasswordRecoveryTarget) sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
        if (isPasswordRecoveryTarget) {
          markPasswordRecovery();
        } else {
          clearPasswordRecovery();
        }
        setLocation(isPasswordRecoveryTarget ? '/password/update' : redirectPath);
      });
      return () => { active = false; };
    }

    if (loading) return;
    const isPasswordRecovery =
      isPasswordRecoveryTarget
      || sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === 'true';
    if (isPasswordRecovery) sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
    if (isPasswordRecovery) {
      markPasswordRecovery();
      setLocation('/password/update');
      return;
    }
    setLocation(user ? redirectPath : authPathWithNext('/signin', redirectPath));
    return () => { active = false; };
  }, [session, user, loading, markPasswordRecovery, clearPasswordRecovery, setLocation]);

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        {exchangingCode && <p className="text-sm text-muted-foreground">Completing sign-in...</p>}
      </div>
    </div>
  );
}

// Redirect authenticated users away from public-only screens (e.g. Welcome).
// Waits for auth to resolve, then sends logged-in users to their scoped home.
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [checkingScope, setCheckingScope] = useState(false);

  useEffect(() => {
    let active = true;
    if (loading) return;
    if (!user) return;

    setCheckingScope(true);
    void getCurrentAccountContext()
      .then(context => {
        if (!active) return;
        if (context.scope === 'admin') {
          setLocation('/admin');
        } else {
          setLocation('/home');
        }
      })
      .catch(() => {
        if (active) setLocation('/home');
      })
      .finally(() => {
        if (active) setCheckingScope(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, loading, setLocation]);

  if (loading || checkingScope) return <LoadingScreen />;

  if (user) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* ── Public routes ─────────────────────────────────────── */}
      <Route path="/"><PublicOnlyRoute><Welcome /></PublicOnlyRoute></Route>
      <Route path="/signup" component={SignUp} />
      <Route path="/signin" component={SignIn} />
      <Route path="/password/reset" component={PasswordResetRequest} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/privacy"><PrivacyPolicyPage /></Route>
      <Route path="/terms"><TermsOfServicePage /></Route>
      <Route path="/partner-policies"><PartnerPoliciesPage /></Route>
      <Route path="/partner-policies/event-publishing"><EventPublishingPolicyPage /></Route>

      {/* ── Authenticated routes ──────────────────────────────── */}
      <Route path="/preferences"><ConsumerGuard><InitialPreferences /></ConsumerGuard></Route>

      <Route path="/home"><ConsumerGuard><HomeDiscovery /></ConsumerGuard></Route>
      <Route path="/map"><ConsumerGuard><MapView /></ConsumerGuard></Route>
      <Route path="/venue/:id"><ConsumerGuard><VenueDetails /></ConsumerGuard></Route>
      <Route path="/event/:id"><ConsumerGuard><EventDetail /></ConsumerGuard></Route>
      <Route path="/submit"><ConsumerGuard><VenueSubmit /></ConsumerGuard></Route>

      <Route path="/plan/generate"><ConsumerGuard><PlanGenerator /></ConsumerGuard></Route>
      <Route path="/plan/overview"><ConsumerGuard><PlanOverview /></ConsumerGuard></Route>
      <Route path="/plan/:id/edit"><ConsumerGuard><PlanEdit /></ConsumerGuard></Route>
      <Route path="/plan/:id"><ConsumerGuard><PlanDetail /></ConsumerGuard></Route>

      <Route path="/tracker"><ConsumerGuard><ExecutionTracker /></ConsumerGuard></Route>
      <Route path="/plans"><ConsumerGuard><SavedPlans /></ConsumerGuard></Route>

      <Route path="/profile/badges"><ConsumerGuard><BadgesPage /></ConsumerGuard></Route>
      <Route path="/profile/preferences"><ConsumerGuard><PreferenceEdit /></ConsumerGuard></Route>
      <Route path="/profile/budget"><ConsumerGuard><BudgetDashboard /></ConsumerGuard></Route>
      <Route path="/profile"><ConsumerGuard><ProfileOverview /></ConsumerGuard></Route>

      <Route path="/group/create"><ConsumerGuard><CreateGroupPlan /></ConsumerGuard></Route>
      <Route path="/notifications"><ConsumerGuard><NotificationsCenter /></ConsumerGuard></Route>
      <Route path="/admin"><AdminGuard><AdminPanel /></AdminGuard></Route>

      <Route path="/review/complete"><ConsumerGuard><ReviewComplete /></ConsumerGuard></Route>
      <Route path="/review"><ConsumerGuard><PostDateReview /></ConsumerGuard></Route>

      <Route path="/settings"><ConsumerGuard><Settings /></ConsumerGuard></Route>
      <Route path="/password/update" component={PasswordUpdate} />

      {/* Fallback — unauthenticated users see Welcome, authenticated see Home */}
      <Route><ConsumerGuard><HomeDiscovery /></ConsumerGuard></Route>
    </Switch>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  return isDesktop
    ? <DesktopShell>{children}</DesktopShell>
    : <MobileFrame>{children}</MobileFrame>;
}

function App() {
  useTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppShell>
              <Router />
            </AppShell>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
