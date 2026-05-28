import { type ReactNode, useState, useEffect } from 'react';
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
import { PartnerPortal } from "@/pages/PartnerPortal";
import { PartnerDashboard } from "@/pages/PartnerDashboard";
import { PartnerNotifications } from "@/pages/PartnerNotifications";
import { PartnerEventEditor } from "@/pages/PartnerEventEditor";
import { PartnerVenueEditor } from "@/pages/PartnerVenueEditor";
import { PartnerSocialCompose } from "@/pages/PartnerSocialCompose";
import { SavedPlans } from "@/pages/SavedPlans";
import { PostDateReview } from "@/pages/PostDateReview";
import { ReviewComplete } from "@/pages/ReviewComplete";
import { Settings } from "@/pages/Settings";
import { hasPartnerCapability, type PartnerCapability, type PartnerType } from "@/lib/partnerCapabilities";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { authPathWithNext, getPostAuthRedirectPath, storeOAuthError } from "@/lib/authRedirect";

const queryClient = new QueryClient();

// Redirect unauthenticated users to welcome screen
function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) setLocation(authPathWithNext('/signin', location));
  }, [user, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

async function getScopedHome(userId: string) {
  const { data, error } = await supabase.rpc('get_current_account_scope');
  if (error && import.meta.env.DEV) {
    console.warn('[D8 scope] Could not resolve account scope', { userId, error: error.message });
  }

  const scope = Array.isArray(data) ? data[0] : null;
  return typeof scope?.home_path === 'string' ? scope.home_path : '/home';
}

function ConsumerGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [location, setLocation] = useLocation();
  const [checkingScope, setCheckingScope] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkScope() {
      if (loading || adminLoading) return;

      if (!user) {
        setLocation(authPathWithNext('/signin', location));
        return;
      }

      if (isAdmin) {
        setLocation('/admin');
        return;
      }

      const destination = await getScopedHome(user.id);
      if (!active) return;

      if (destination !== '/home') {
        setLocation(destination);
        return;
      }

      setAllowed(true);
      setCheckingScope(false);
    }

    setAllowed(false);
    setCheckingScope(true);
    void checkScope();

    return () => { active = false; };
  }, [adminLoading, isAdmin, loading, location, setLocation, user]);

  if (loading || adminLoading || checkingScope) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [location, setLocation] = useLocation();
  const checking = loading || adminLoading;
  const allowed = Boolean(user && isAdmin);

  useEffect(() => {
    if (checking) return;
    if (!user) {
      setLocation(authPathWithNext('/signin', location));
      return;
    }
    if (!allowed) {
      void getScopedHome(user.id).then(destination => setLocation(destination));
    }
  }, [allowed, user, checking, location, setLocation]);

  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}

// Blocks access to partner sub-routes unless the user has a partner_application record.
// /partner (onboarding) is intentionally NOT wrapped — anyone can start the application.
function PartnerGuard({
  children,
  capability,
}: {
  children: ReactNode;
  capability?: PartnerCapability;
}) {
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLocation(authPathWithNext('/signin', location)); return; }

    supabase
      .from('partner_applications')
      .select('id,status,partner_type')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.status === 'live' && hasPartnerCapability(data.partner_type as PartnerType, capability)) {
          setAllowed(true);
        } else if (data?.status === 'live') {
          setLocation('/partner/dashboard');
        } else {
          // No application — send to onboarding
          setLocation('/partner');
        }
        setChecking(false);
      });
  }, [user, authLoading, location, setLocation, capability]);

  if (authLoading || checking) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}

function AuthCallback() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
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

    if (loading) return;
    setLocation(user ? getPostAuthRedirectPath() : authPathWithNext('/signin', getPostAuthRedirectPath()));
  }, [user, loading, setLocation]);

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* ── Public routes ─────────────────────────────────────── */}
      <Route path="/" component={Welcome} />
      <Route path="/signup" component={SignUp} />
      <Route path="/signin" component={SignIn} />
      <Route path="/auth/callback" component={AuthCallback} />

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

      {/* Partner onboarding — authenticated but no application required */}
      <Route path="/partner"><AuthGuard><PartnerPortal /></AuthGuard></Route>
      {/* Partner sub-routes — also require an existing partner_application record */}
      <Route path="/partner/dashboard">
        <PartnerGuard><PartnerDashboard /></PartnerGuard>
      </Route>
      <Route path="/partner/notifications">
        <PartnerGuard><PartnerNotifications /></PartnerGuard>
      </Route>
      <Route path="/partner/event/new">
        <PartnerGuard capability="events"><PartnerEventEditor /></PartnerGuard>
      </Route>
      <Route path="/partner/event/:id/edit">
        <PartnerGuard capability="events"><PartnerEventEditor /></PartnerGuard>
      </Route>
      <Route path="/partner/venue/edit">
        <PartnerGuard capability="venues"><PartnerVenueEditor /></PartnerGuard>
      </Route>
      <Route path="/partner/social/compose">
        <PartnerGuard capability="events"><PartnerSocialCompose /></PartnerGuard>
      </Route>

      <Route path="/review/complete"><ConsumerGuard><ReviewComplete /></ConsumerGuard></Route>
      <Route path="/review"><ConsumerGuard><PostDateReview /></ConsumerGuard></Route>

      <Route path="/settings"><ConsumerGuard><Settings /></ConsumerGuard></Route>

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
