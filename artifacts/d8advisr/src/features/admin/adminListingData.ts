import { supabase } from '@/lib/supabase';
import { EVENT_PUBLISHING_POLICY_ID, EVENT_PUBLISHING_POLICY_VERSION } from '@workspace/d8-core/event-policy';
import {
  type AdminVenueRow,
  type AdminEventRow,
  type AdminEvent,
  adminEventFromRow,
  type PartnerApplicationRow,
  type PartnerApplicationStatus,
  type ReverificationTask,
  type ReverificationTaskRow,
  type ReverificationTaskStatus,
  type Submission,
  type Tier,
  type Venue,
  type VenueChangeLogRow,
  type VenueInspectionRow,
  type VenueListingReview,
  type VenueListingReviewRow,
  type VenueLiveRevision,
  type VenueLiveRevisionRow,
  type VenuePlacementAdminRequest,
  type VenuePlacementAdminRow,
  type AdminEventLiveRevision,
  type EventLiveRevisionRow,
  adminEventLiveRevisionFromRow,
  adminVenueFromRow,
  partnerApplicationToSubmission,
  reverificationTaskFromRow,
  venueListingReviewFromRow,
  venueLiveRevisionFromRow,
  venuePlacementAdminRequestFromRow,
} from './adminListingModel';

function throwIfError(error: { message: string } | null) {
  if (error) throw error;
}

export async function fetchAdminVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,category,city,region_id,area,address,tier,price_tier,description,cover_image,images,vibes,rating,review_count,avg_cost_pp,open_hours,listing_status,verification_status,reverification_reason,last_verified_at,next_verification_due_at,is_active,is_hidden_gem,partner_id,operator_organization_id,source,created_at,updated_at')
    .order('updated_at', { ascending: false });
  throwIfError(error);
  return ((data ?? []) as AdminVenueRow[]).map(adminVenueFromRow);
}

export async function fetchPartnerSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('partner_applications')
    .select('id,name,partner_type,city,region_id,contact,status,review_reason,reviewed_at,submitted_at,created_at,updated_at')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return ((data ?? []) as PartnerApplicationRow[]).map(partnerApplicationToSubmission);
}

export async function fetchVenuePlacementRequests(): Promise<VenuePlacementAdminRequest[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id,title,category,cover_image,starts_at,event_status,venue_id,venue_page_status,partner_id,created_at,venues(id,name,city,area)')
    .eq('venue_page_status', 'requested')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return ((data ?? []) as VenuePlacementAdminRow[]).map(venuePlacementAdminRequestFromRow);
}

export async function fetchVenueListingReviews(): Promise<VenueListingReview[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,category,city,area,address,cover_image,images,partner_id,listing_status,verification_status,reverification_reason,created_at,updated_at')
    .in('listing_status', ['draft', 'submitted', 'under_review', 'needs_update'])
    .order('updated_at', { ascending: false });
  throwIfError(error);
  return ((data ?? []) as VenueListingReviewRow[]).map(venueListingReviewFromRow);
}

export async function fetchReverificationTasks(): Promise<ReverificationTask[]> {
  const { data, error } = await supabase
    .from('venue_reverification_tasks')
    .select('id,venue_id,reason,status,triggered_by,created_at,resolved_at,notes,live_revision_id,venues(id,name,category,city,area,tier,listing_status,verification_status,cover_image)')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return ((data ?? []) as ReverificationTaskRow[]).map(reverificationTaskFromRow);
}

export async function fetchLatestVenueInspections(): Promise<VenueInspectionRow[]> {
  const { data, error } = await supabase
    .from('venue_inspections')
    .select('id,venue_id,inspector_id,atmosphere_score,lighting_score,noise_level,occasion_fit,inspector_notes,inspected_at,created_at,updated_at')
    .order('inspected_at', { ascending: false });
  throwIfError(error);

  const latestByVenue = new Map<string, VenueInspectionRow>();
  ((data ?? []) as VenueInspectionRow[]).forEach(row => {
    if (!latestByVenue.has(row.venue_id)) latestByVenue.set(row.venue_id, row);
  });
  return Array.from(latestByVenue.values());
}

export async function fetchVenueChangeLog(venueId: string): Promise<VenueChangeLogRow[]> {
  const { data, error } = await supabase.rpc('admin_get_venue_change_log', {
    p_venue_id: venueId,
  });
  throwIfError(error);
  return (data ?? []) as VenueChangeLogRow[];
}

export async function fetchPendingVenueLiveRevisions(): Promise<VenueLiveRevision[]> {
  const { data, error } = await supabase
    .from('venue_live_revisions')
    .select('id,venue_id,status,previous_values,proposed_values,submitted_by,reviewed_by,review_note,created_at,updated_at,revision_source')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return ((data ?? []) as VenueLiveRevisionRow[]).map(venueLiveRevisionFromRow);
}

export async function setPartnerApplicationStatus(id: string, status: PartnerApplicationStatus, reason?: string) {
  const { error } = await supabase.rpc('admin_update_partner_application_status', {
    application_id: id,
    new_status: status,
    p_review_reason: reason?.trim() || null,
    p_internal_note: null,
  });
  throwIfError(error);
}

export async function setVenuePlacementStatus(eventId: string, status: 'approved' | 'rejected') {
  const { error } = await supabase.rpc('set_event_venue_page_status', {
    p_event_id: eventId,
    p_status: status,
  });
  throwIfError(error);
}

export async function setVenueListingStatus(
  venueId: string,
  status: 'live' | 'needs_update' | 'hidden',
  reason: string | null,
) {
  const { error } = await supabase.rpc('admin_update_venue_listing_status', {
    venue_id: venueId,
    new_status: status,
    reason,
  });
  throwIfError(error);
}

export interface AdminDraftVenueUpdateInput {
  name: string;
  regionId: string;
  city: string;
  category: string;
  area?: string;
  address?: string;
  description?: string;
  priceTier?: string;
  averageCostPerPerson?: number;
  coverImage?: string;
  images: string[];
  vibes: string[];
}

export async function updateAdminDraftVenue(
  venueId: string,
  expectedUpdatedAt: string,
  input: AdminDraftVenueUpdateInput,
) {
  const { error } = await supabase.rpc('admin_update_draft_venue', {
    p_venue_id: venueId,
    p_expected_updated_at: expectedUpdatedAt,
    p_payload: {
      name: input.name.trim(),
      region_id: input.regionId,
      city: input.city.trim(),
      category: input.category.trim(),
      area: input.area?.trim() || null,
      address: input.address?.trim() || null,
      description: input.description?.trim() || null,
      price_tier: input.priceTier?.trim() || null,
      avg_cost_pp: input.averageCostPerPerson ?? null,
      cover_image: input.coverImage?.trim() || null,
      images: input.images,
      vibes: input.vibes,
    },
  });
  throwIfError(error);
}

export interface AdminLiveVenueUpdateInput extends AdminDraftVenueUpdateInput {}

export async function submitAdminLiveVenueRevision(
  venueId: string,
  expectedUpdatedAt: string,
  input: AdminLiveVenueUpdateInput,
) {
  const { data, error } = await supabase.rpc('admin_submit_live_venue_revision', {
    p_venue_id: venueId,
    p_expected_updated_at: expectedUpdatedAt,
    p_payload: {
      name: input.name.trim(), region_id: input.regionId, city: input.city.trim(), category: input.category.trim(),
      area: input.area?.trim() || null, address: input.address?.trim() || null,
      description: input.description?.trim() || null, price_tier: input.priceTier?.trim() || null,
      avg_cost_pp: input.averageCostPerPerson ?? null, cover_image: input.coverImage?.trim() || null,
      images: input.images,
      vibes: input.vibes,
    },
  });
  throwIfError(error);
  return data as { venue_id: string; revision_id: string | null; immediate_fields: string[]; pending_fields: string[]; updated_at: string };
}

export async function reviewAdminLiveVenueRevision(
  revisionId: string,
  decision: 'approved' | 'rejected',
  note?: string,
  source: 'admin' | 'partner' = 'admin',
) {
  const rpcName = source === 'partner'
    ? 'admin_review_partner_live_venue_revision'
    : 'admin_review_live_venue_revision';
  const { data, error } = await supabase.rpc(rpcName, {
    p_revision_id: revisionId,
    p_decision: decision,
    p_note: note?.trim() || null,
  });
  throwIfError(error);
  return data as { revision_id: string; venue_id: string; status: typeof decision; updated_at: string };
}

export async function setVenueTier(venueId: string, tier: Tier, reason: string) {
  const { error } = await supabase.rpc('admin_update_venue_tier', {
    p_venue_id: venueId,
    new_tier: tier,
    reason,
  });
  throwIfError(error);
}

export async function markVenueVerified(venueId: string) {
  const { error } = await supabase.rpc('admin_mark_venue_verified', {
    p_venue_id: venueId,
    reason: 'admin_verified',
  });
  throwIfError(error);
}

export async function setReverificationTaskStatus(
  taskId: string,
  status: ReverificationTaskStatus | 'needs_update',
  note?: string,
) {
  const { error } = await supabase.rpc('admin_update_reverification_task_status', {
    p_task_id: taskId,
    new_status: status,
    note: note ?? null,
  });
  throwIfError(error);
}

export async function insertVenueInspection(input: {
  venueId: string;
  inspectorId: string | null;
  atmosphereScore: number;
  lightingScore: number;
  noiseLevel: VenueInspectionRow['noise_level'];
  occasionFit: string[];
  inspectorNotes: string;
}) {
  const { error } = await supabase.from('venue_inspections').insert({
    venue_id: input.venueId,
    inspector_id: input.inspectorId,
    atmosphere_score: input.atmosphereScore,
    lighting_score: input.lightingScore,
    noise_level: input.noiseLevel,
    occasion_fit: input.occasionFit,
    inspector_notes: input.inspectorNotes,
  });
  throwIfError(error);
}

export async function fetchAdminEvents(): Promise<AdminEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id,venue_id,partner_id,organizer_organization_id,source,title,description,category,vibes,cover_image,images,starts_at,ends_at,price_pp,currency,capacity,is_free,is_featured,city,event_location_kind,external_location_name,external_location_address,emoji,event_status,created_at,updated_at,venues(name)')
    .order('updated_at', { ascending: false });
  throwIfError(error);
  return ((data ?? []) as unknown as AdminEventRow[]).map(adminEventFromRow);
}

export async function updateAdminDraftEvent(
  eventId: string,
  payload: Record<string, unknown>,
  expectedUpdatedAt: string
): Promise<AdminEvent> {
  const { data, error } = await supabase.rpc('admin_update_draft_event', {
    p_event_id: eventId,
    p_payload: payload,
    p_expected_updated_at: expectedUpdatedAt,
  });
  throwIfError(error);
  if (!data) throw new Error('Update failed');
  return adminEventFromRow(data as unknown as AdminEventRow);
}

export async function publishAdminEvent(eventId: string): Promise<AdminEvent> {
  const requestKey = crypto.randomUUID();
  const { data, error } = await supabase.rpc('publish_event_with_policy', {
    p_event_id: eventId,
    p_policy_id: EVENT_PUBLISHING_POLICY_ID,
    p_policy_version: EVENT_PUBLISHING_POLICY_VERSION,
    p_acknowledged: true,
    p_request_key: requestKey,
  });
  throwIfError(error);
  if (!data) throw new Error('Publish failed');
  return adminEventFromRow(data as unknown as AdminEventRow);
}

export async function updateAdminLiveEvent(
  eventId: string,
  payload: Record<string, unknown>,
  expectedUpdatedAt: string,
  confirmed = false,
  adminReason?: string,
): Promise<AdminEventPolicyResult> {
  const { data, error } = await supabase.rpc('admin_apply_event_revision_v11', {
    p_event_id: eventId,
    p_payload: payload,
    p_expected_updated_at: expectedUpdatedAt,
    p_confirmed: confirmed,
    p_admin_reason: adminReason?.trim() || null,
  });
  throwIfError(error);
  if (!data) throw new Error('Update failed');
  return data as AdminEventPolicyResult;
}

export interface AdminEventPolicyResult {
  status: 'applied' | 'confirmation_required';
  revision_id?: string;
  changed_fields?: string[];
  material_fields?: string[];
  previous_values?: Record<string, unknown>;
  proposed_values?: Record<string, unknown>;
  interested_count?: number;
  notification_count?: number;
  message?: string;
}

export async function cancelAdminEvent(
  eventId: string,
  expectedUpdatedAt: string,
  confirmed: boolean,
  reason?: string,
): Promise<AdminEventPolicyResult> {
  const { data, error } = await supabase.rpc('admin_cancel_event_v11', {
    p_event_id: eventId,
    p_expected_updated_at: expectedUpdatedAt,
    p_confirmed: confirmed,
    p_reason: reason?.trim() || null,
  });
  throwIfError(error);
  if (!data) throw new Error('Cancellation failed');
  return data as AdminEventPolicyResult;
}

export async function fetchEventRevisionHistory(eventId: string): Promise<AdminEventLiveRevision[]> {
  const { data, error } = await supabase
    .from('event_revisions')
    .select('*, events(title, category, city)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return ((data ?? []) as unknown as EventLiveRevisionRow[]).map(adminEventLiveRevisionFromRow);
}



