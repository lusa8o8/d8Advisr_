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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    setLocation('/');
    return null;
  }
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
      <Route path="/" component={Welcome} />
      <Route path="/signup" component={SignUp} />
      <Route path="/signin" component={SignIn} />
      <Route path="/preferences" component={InitialPreferences} />
      
      <Route path="/home" component={HomeDiscovery} />
      <Route path="/map" component={MapView} />
      <Route path="/venue/:id" component={VenueDetails} />
      <Route path="/event/:id" component={EventDetail} />
      <Route path="/submit" component={VenueSubmit} />
      
      <Route path="/plan/generate" component={PlanGenerator} />
      <Route path="/plan/overview" component={PlanOverview} />
      <Route path="/plan/:id" component={PlanDetail} />
      <Route path="/plan/:id/edit" component={PlanEdit} />
      
      <Route path="/tracker" component={ExecutionTracker} />
      
      <Route path="/plans" component={SavedPlans} />
      
      <Route path="/profile" component={ProfileOverview} />
      <Route path="/profile/badges" component={BadgesPage} />
      <Route path="/profile/preferences" component={PreferenceEdit} />
      <Route path="/profile/budget" component={BudgetDashboard} />
      
      <Route path="/group/create" component={CreateGroupPlan} />
      
      <Route path="/notifications" component={NotificationsCenter} />
      
      <Route path="/admin" component={AdminPanel} />
      
      {/* Partner onboarding — open to all authenticated users */}
      <Route path="/partner" component={PartnerPortal} />
      {/* Partner sub-routes — require an existing partner_application record */}
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
      
      <Route path="/review" component={PostDateReview} />
      <Route path="/review/complete" component={ReviewComplete} />
      
      <Route path="/settings" component={Settings} />
      
      {/* Fallback to Home if unknown route */}
      <Route component={HomeDiscovery} />
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
