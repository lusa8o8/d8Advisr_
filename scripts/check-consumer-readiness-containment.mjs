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

assert(sharedUi.includes("onClick={() => setLocation('/settings')}"), 'Mobile Settings action must route to /settings');
assert(sharedUi.includes('aria-label="Settings"'), 'Mobile Settings action must have an accessible name');

assert(home.includes('<FAB type="home" />'), 'Discovery feed must retain the mobile Surprise Me FAB');
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

console.log('PASS bounded consumer readiness navigation and currency containment');
