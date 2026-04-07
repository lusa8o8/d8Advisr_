import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Layout & UI
import { MobileFrame } from "@/components/MobileFrame";

// Pages
import { Welcome } from "@/pages/Welcome";
import { SignUp } from "@/pages/SignUp";
import { InitialPreferences } from "@/pages/InitialPreferences";
import { HomeDiscovery } from "@/pages/HomeDiscovery";
import { MapView } from "@/pages/MapView";
import { VenueDetails } from "@/pages/VenueDetails";
import { PlanGenerator } from "@/pages/PlanGenerator";
import { PlanOverview } from "@/pages/PlanOverview";
import { PlanDetail } from "@/pages/PlanDetail";
import { PlanEdit } from "@/pages/PlanEdit";
import { ExecutionTracker } from "@/pages/ExecutionTracker";
import { Feedback } from "@/pages/Feedback";
import { ProfileOverview } from "@/pages/ProfileOverview";
import { BadgesPage } from "@/pages/BadgesPage";
import { PreferenceEdit } from "@/pages/PreferenceEdit";
import { BudgetDashboard } from "@/pages/BudgetDashboard";
import { CreateGroupPlan } from "@/pages/CreateGroupPlan";
import { NotificationsCenter } from "@/pages/NotificationsCenter";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/signup" component={SignUp} />
      <Route path="/preferences" component={InitialPreferences} />
      
      <Route path="/home" component={HomeDiscovery} />
      <Route path="/map" component={MapView} />
      <Route path="/venue/:id" component={VenueDetails} />
      
      <Route path="/plan/generate" component={PlanGenerator} />
      <Route path="/plan/overview" component={PlanOverview} />
      <Route path="/plan/:id" component={PlanDetail} />
      <Route path="/plan/:id/edit" component={PlanEdit} />
      
      <Route path="/tracker" component={ExecutionTracker} />
      <Route path="/feedback" component={Feedback} />
      
      <Route path="/profile" component={ProfileOverview} />
      <Route path="/profile/badges" component={BadgesPage} />
      <Route path="/profile/preferences" component={PreferenceEdit} />
      <Route path="/profile/budget" component={BudgetDashboard} />
      
      <Route path="/group/create" component={CreateGroupPlan} />
      
      <Route path="/notifications" component={NotificationsCenter} />
      
      {/* Fallback to Home if unknown route */}
      <Route component={HomeDiscovery} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <MobileFrame>
             <Router />
          </MobileFrame>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
