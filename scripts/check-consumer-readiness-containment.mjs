import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sharedUi = read('artifacts/d8advisr/src/components/SharedUI.tsx');
const home = read('artifacts/d8advisr/src/pages/HomeDiscovery.tsx');
const map = read('artifacts/d8advisr/src/pages/MapView.tsx');
const plans = read('artifacts/d8advisr/src/pages/SavedPlans.tsx');
const overview = read('artifacts/d8advisr/src/pages/PlanOverview.tsx');
const profile = read('artifacts/d8advisr/src/pages/ProfileOverview.tsx');
const generator = read('artifacts/d8advisr/src/pages/PlanGenerator.tsx');
const desktopShell = read('artifacts/d8advisr/src/components/DesktopShell.tsx');
const notifications = read('artifacts/d8advisr/src/pages/NotificationsCenter.tsx');
const budget = read('artifacts/d8advisr/src/pages/BudgetDashboard.tsx');
const settings = read('artifacts/d8advisr/src/pages/Settings.tsx');
const onboarding = read('artifacts/d8advisr/src/pages/InitialPreferences.tsx');
const preferenceEditor = read('artifacts/d8advisr/src/pages/PreferenceEdit.tsx');
const preferenceContract = read('artifacts/d8advisr/src/lib/consumerPreferences.ts');
const app = read('artifacts/d8advisr/src/App.tsx');
const planDetail = read('artifacts/d8advisr/src/pages/PlanDetail.tsx');
const planEdit = read('artifacts/d8advisr/src/pages/PlanEdit.tsx');

assert(sharedUi.includes("onClick={() => setLocation('/settings')}"), 'Mobile Settings action must route to /settings');
assert(sharedUi.includes('aria-label="Settings"'), 'Mobile Settings action must have an accessible name');

assert(home.includes('<FAB type="home" />'), 'Discovery feed must retain the mobile Surprise Me FAB');
assert(!home.includes('Add to Plan'), 'Home feed cards must not expose card-level Add to Plan actions');
assert(!home.includes('venue.rating'), 'Home feed cards must not expose venue ratings');
assert(!home.includes('venue.reviews'), 'Home feed cards must not expose venue review counts');
assert(!home.includes('<Star'), 'Home feed cards must not render rating stars');
for (const [label, source] of [['Map', map], ['My Plans', plans]]) {
  assert(!source.includes('<FAB'), `${label} must not render the Surprise Me FAB`);
  assert(!source.includes('BottomNav, FAB'), `${label} must not import the Surprise Me FAB`);
}

assert(overview.includes('const { formatPrice } = useRegion();'), 'Plan Overview must use the global region price formatter');
assert(!overview.includes('₦'), 'Plan Overview must not hardcode the naira symbol');
for (const expression of [
  'formatPrice(stopCostAmount(stop))',
  'formatPrice(transportCostAmount(TRANSPORTS[idx]))',
  'formatPrice(grandTotal)',
]) assert(overview.includes(expression), `Plan Overview is missing regional formatting: ${expression}`);

assert(profile.includes("import { useAuth } from \"@workspace/d8-core/auth\";"), 'Profile must use the shared auth context');
assert(profile.includes('const { signOut } = useAuth();'), 'Profile must obtain the shared sign-out handler');
assert(profile.includes('await signOut();'), 'Profile logout must revoke the local auth session');
assert(profile.includes('onClick={() => void handleSignOut()}'), 'Profile logout button must call its sign-out handler');
assert(!profile.includes("onClick={() => setLocation('/')"), 'Profile logout must not only navigate without signing out');

assert(sharedUi.includes("setLocation('/plan/generate')"), 'Mobile Surprise Me must route to the plan builder');
assert(desktopShell.includes("setLocation('/plan/generate')"), 'Desktop Surprise Me must route to the plan builder');
assert(generator.includes('<PlanBuilderMode'), 'Plan generation must render the current compact builder');
assert(!generator.includes('FullFormMode'), 'The legacy full plan form must remain removed');
assert(!generator.includes('Build Your Plan'), 'The legacy plan-builder heading must remain removed');
assert(notifications.includes('flex flex-col px-4 lg:px-10 pb-10'), 'Notifications must retain the reading-width inner inset');
assert(notifications.includes('overflow-hidden rounded-3xl border border-border bg-card shadow-sm'), 'Notifications must retain a rounded grouped card surface');
assert(sharedUi.includes('consumerSheetWidthClass'), 'Consumer drawers must share the bounded desktop width contract');
assert(budget.includes('bg: "bg-card"'), 'Cold Stash cards must retain a semantic theme surface');
assert(budget.includes('consumerSheetWidthClass'), 'The new-Stash drawer must use the shared desktop width');
assert(settings.includes("bg-foreground text-background border-foreground"), 'Selected Settings controls must retain semantic contrast');
assert(settings.includes('consumerSheetWidthClass'), 'Personal Info drawers must use the shared desktop width');
for (const consumer of [onboarding, preferenceEditor]) {
  assert(consumer.includes('CONSUMER_PLAN_TYPES'), 'Onboarding and profile editing must share plan types');
  assert(consumer.includes('CONSUMER_VIBES'), 'Onboarding and profile editing must share vibes');
  assert(consumer.includes('CONSUMER_BUDGET_RANGE'), 'Onboarding and profile editing must share the budget range');
}
assert(preferenceContract.includes('Romantic Dates'), 'The shared preference contract must retain plan intent labels');
assert(!preferenceEditor.includes('Favorite Cuisine'), 'The legacy cuisine preference section must remain removed');
assert(!preferenceEditor.includes('Vegetarian / Vegan'), 'The unimplemented dietary preference must remain removed');
assert(!preferenceEditor.includes('supabase'), 'The front-end preference editor must not introduce server persistence yet');
assert(overview.includes("setLocation('/plan/1')"), 'Saving the demo overview must still finish on the canonical saved-plan detail');
assert(planDetail.includes("setLocation('/plans')"), 'Saved-plan detail must return to My Plans');
assert(planDetail.includes('shadow-sm z-20 sticky top-0'), 'Saved-plan header must stay above positioned itinerary rows');
assert(planDetail.includes('consumerSheetWidthClass'), 'Plan funding drawer must use the shared consumer drawer width');
assert(planDetail.includes('lg:rounded-3xl'), 'Plan funding drawer must retain the shared desktop framing');
assert(!planDetail.includes('max-w-[430px] mx-auto'), 'Plan funding drawer must not retain the legacy mobile-only width cap');
assert(!planDetail.includes("Let's Go!"), 'Saved-plan detail must not imply an immediate execution mode');
assert(!planDetail.includes("setLocation('/tracker')"), 'Saved-plan detail must not route to the removed execution mode');
assert(!app.includes('ExecutionTracker'), 'The legacy execution screen must not remain mounted');
assert(!app.includes('path="/tracker"'), 'The legacy /tracker route must remain removed');
assert(planEdit.includes("consumerDesktopClass('reading'), \"px-6 flex items-center gap-4\""), 'Plan editor action bar must share the page reading width');
assert(!planEdit.includes('max-w-[430px]'), 'Plan editor action bar must not retain the legacy mobile-only width cap');
assert(planEdit.includes('className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24"'), 'Plan editor page surface must remain full width');
assert(planEdit.includes("consumerDesktopClass('reading'), \"px-6 flex justify-between items-center\""), 'Plan editor header content must use the reading width');
assert(planEdit.includes("consumerDesktopClass('reading'), \"px-6 py-6 pb-28 flex flex-col gap-8\""), 'Plan editor form content must use the reading width');

console.log('PASS bounded consumer readiness navigation and currency containment');
