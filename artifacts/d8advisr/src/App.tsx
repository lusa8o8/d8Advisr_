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
import { PartnerEventEditor } from "@/pages/PartnerEventEditor";
import { PartnerVenueEditor } from "@/pages/PartnerVenueEditor";
import { PartnerSocialCompose } from "@/pages/PartnerSocialCompose";
import { SavedPlans } from "@/pages/SavedPlans";
import { PostDateReview } from "@/pages/PostDateReview";
import { ReviewComplete } from "@/pages/ReviewComplete";
import { Settings } from "@/pages/Settings";

const queryClient = new QueryClient();

// Redirect unauthenticated users to welcome screen
function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) setLocation('/');
  }, [user, loading, setLocation]);

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

// Blocks access to partner sub-routes unless the user has a partner_application record.
// /partner (onboarding) is intentionally NOT wrapped — anyone can start the application.
function PartnerGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLocation('/'); return; }

    supabase
      .from('partner_applications')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAllowed(true);
        } else {
          // No application — send to onboarding
          setLocation('/partner');
        }
        setChecking(false);
      });
  }, [user, authLoading, setLocation]);

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

function Router() {
  return (
    <Switch>
      {/* ── Public routes ─────────────────────────────────────── */}
      <Route path="/" component={Welcome} />
      <Route path="/signup" component={SignUp} />
      <Route path="/signin" component={SignIn} />

      {/* ── Authenticated routes ──────────────────────────────── */}
      <Route path="/preferences"><AuthGuard><InitialPreferences /></AuthGuard></Route>

      <Route path="/home"><AuthGuard><HomeDiscovery /></AuthGuard></Route>
      <Route path="/map"><AuthGuard><MapView /></AuthGuard></Route>
      <Route path="/venue/:id"><AuthGuard><VenueDetails /></AuthGuard></Route>
      <Route path="/event/:id"><AuthGuard><EventDetail /></AuthGuard></Route>
      <Route path="/submit"><AuthGuard><VenueSubmit /></AuthGuard></Route>

      <Route path="/plan/generate"><AuthGuard><PlanGenerator /></AuthGuard></Route>
      <Route path="/plan/overview"><AuthGuard><PlanOverview /></AuthGuard></Route>
      <Route path="/plan/:id/edit"><AuthGuard><PlanEdit /></AuthGuard></Route>
      <Route path="/plan/:id"><AuthGuard><PlanDetail /></AuthGuard></Route>

      <Route path="/tracker"><AuthGuard><ExecutionTracker /></AuthGuard></Route>
      <Route path="/plans"><AuthGuard><SavedPlans /></AuthGuard></Route>

      <Route path="/profile/badges"><AuthGuard><BadgesPage /></AuthGuard></Route>
      <Route path="/profile/preferences"><AuthGuard><PreferenceEdit /></AuthGuard></Route>
      <Route path="/profile/budget"><AuthGuard><BudgetDashboard /></AuthGuard></Route>
      <Route path="/profile"><AuthGuard><ProfileOverview /></AuthGuard></Route>

      <Route path="/group/create"><AuthGuard><CreateGroupPlan /></AuthGuard></Route>
      <Route path="/notifications"><AuthGuard><NotificationsCenter /></AuthGuard></Route>
      <Route path="/admin"><AuthGuard><AdminPanel /></AuthGuard></Route>

      {/* Partner onboarding — authenticated but no application required */}
      <Route path="/partner"><AuthGuard><PartnerPortal /></AuthGuard></Route>
      {/* Partner sub-routes — also require an existing partner_application record */}
      <Route path="/partner/dashboard">
        <PartnerGuard><PartnerDashboard /></PartnerGuard>
      </Route>
      <Route path="/partner/event/new">
        <PartnerGuard><PartnerEventEditor /></PartnerGuard>
      </Route>
      <Route path="/partner/event/:id/edit">
        <PartnerGuard><PartnerEventEditor /></PartnerGuard>
      </Route>
      <Route path="/partner/venue/edit">
        <PartnerGuard><PartnerVenueEditor /></PartnerGuard>
      </Route>
      <Route path="/partner/social/compose">
        <PartnerGuard><PartnerSocialCompose /></PartnerGuard>
      </Route>

      <Route path="/review/complete"><AuthGuard><ReviewComplete /></AuthGuard></Route>
      <Route path="/review"><AuthGuard><PostDateReview /></AuthGuard></Route>

      <Route path="/settings"><AuthGuard><Settings /></AuthGuard></Route>

      {/* Fallback — unauthenticated users see Welcome, authenticated see Home */}
      <Route><AuthGuard><HomeDiscovery /></AuthGuard></Route>
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
