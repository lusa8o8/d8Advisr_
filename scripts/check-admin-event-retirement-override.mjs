import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

const migration = read('supabase/migrations/20260826130000_admin_event_retirement_visibility_override.sql');
const model = read('artifacts/d8advisr/src/features/admin/adminListingModel.ts');
const data = read('artifacts/d8advisr/src/features/admin/adminListingData.ts');
const admin = read('artifacts/d8advisr/src/pages/AdminPanel.tsx');

for (const fragment of [
  'p_override_cancellation_visibility boolean',
  'visibility_window_active and not visibility_override_applied',
  "raise exception 'event_cancellation_visibility_window_active'",
  "'cancellation_visibility_overridden', visibility_override_applied",
  'revoke execute on function public.admin_retire_event(uuid, timestamptz, text, uuid) from authenticated',
  'grant execute on function public.admin_retire_event(uuid, timestamptz, text, uuid, boolean) to authenticated',
]) requireText(migration, fragment, 'audited database override contract');

requireText(model, 'cancelledAt: string | null', 'admin cancellation timestamp model');
requireText(data, 'p_override_cancellation_visibility: overrideCancellationVisibility', 'explicit RPC override argument');

for (const fragment of [
  'retirementVisibilityOverrideAccepted',
  'Override the 24-hour cancellation notice.',
  'This override and my reason will be recorded.',
  'cancellationVisibilityOverrideRequired && !retirementVisibilityOverrideAccepted',
]) requireText(admin, fragment, 'admin override acknowledgement');

console.log('PASS audited admin event-retirement visibility override contract');
