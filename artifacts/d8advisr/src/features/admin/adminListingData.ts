import { supabase } from '@/lib/supabase';
import {
  type AdminVenueRow,
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
  type VenuePlacementAdminRequest,
  type VenuePlacementAdminRow,
  adminVenueFromRow,
  partnerApplicationToSubmission,
  reverificationTaskFromRow,
  venueListingReviewFromRow,
  venuePlacementAdminRequestFromRow,
} from './adminListingModel';

function throwIfError(error: { message: string } | null) {
  if (error) throw error;
}

export async function fetchAdminVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,category,city,area,address,tier,price_tier,description,cover_image,images,rating,review_count,avg_cost_pp,open_hours,listing_status,verification_status,reverification_reason,last_verified_at,next_verification_due_at,is_active,is_hidden_gem,created_at,updated_at')
    .order('updated_at', { ascending: false });
  throwIfError(error);
  return ((data ?? []) as AdminVenueRow[]).map(adminVenueFromRow);
}

export async function fetchPartnerSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('partner_applications')
    .select('id,name,partner_type,city,contact,status,created_at,updated_at')
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
    .select('id,venue_id,reason,status,triggered_by,created_at,resolved_at,notes,venues(id,name,category,city,area,tier,listing_status,verification_status,cover_image)')
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

export async function setPartnerApplicationStatus(id: string, status: PartnerApplicationStatus) {
  const { error } = await supabase.rpc('admin_update_partner_application_status', {
    application_id: id,
    new_status: status,
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
