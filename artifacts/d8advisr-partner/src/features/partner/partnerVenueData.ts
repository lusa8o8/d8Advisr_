import { supabase } from '@workspace/d8-core/supabase';
import { canManageVenues, type PartnerType } from '@workspace/d8-core/partner-capabilities';
import type { PartnerEventVenueWorkflow, PartnerVenueListing, PartnerVenueOption } from '@workspace/d8-core/types';
import type { PartnerApplicationRow, PartnerEventVenueWorkflowRow } from './partnerModels';
import { partnerEventVenueWorkflowFromRow } from './partnerModels';

export interface PartnerVenueInput {
  name: string;
  category: string;
  description?: string;
  address: string;
  area?: string;
  priceTier?: string;
  averageCostPerPerson?: number;
  vibes: string[];
  phone?: string;
  website?: string;
  openHours: Record<string, string>;
  coverImage?: string | null;
  images?: string[];
}

function throwIfError(error: { message: string } | null) {
  if (error) throw error;
}

export async function fetchOwnedVenue(userId: string): Promise<PartnerVenueListing | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,category,description,address,area,price_tier,avg_cost_pp,vibes,open_hours,contact_phone,website_url,cover_image,images,listing_status,verification_status,reverification_reason,is_active,updated_at')
    .eq('partner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  if (!data) return null;
  const { data: pendingRevision, error: pendingError } = await supabase
    .from('venue_live_revisions')
    .select('id')
    .eq('venue_id', data.id)
    .eq('revision_source', 'partner')
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  throwIfError(pendingError);
  return {
    id: data.id, name: data.name, status: data.listing_status,
    verificationStatus: data.verification_status, reverificationReason: data.reverification_reason,
    isActive: data.is_active, category: data.category, description: data.description,
    address: data.address, area: data.area, priceTier: data.price_tier,
    averageCostPerPerson: data.avg_cost_pp, vibes: data.vibes ?? [],
    openHours: data.open_hours as Record<string, string> | null,
    contactPhone: data.contact_phone, websiteUrl: data.website_url,
    coverImage: data.cover_image, images: data.images ?? [],
    updatedAt: data.updated_at,
    hasPendingRevision: Boolean(pendingRevision),
  };
}

export async function fetchVenueOptions(userId: string, regionId: string): Promise<PartnerVenueOption[]> {
  const query = supabase
    .from('venues')
    .select('id,name,city,area,partner_id')
    .eq('is_active', true)
    .eq('listing_status', 'live')
    .eq('region_id', regionId)
    .order('name', { ascending: true });
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []).map(row => ({
    id: row.id, name: row.name, city: row.city, area: row.area, partnerId: row.partner_id,
    isOwnedByCurrentPartner: row.partner_id === userId,
  }));
}

export async function fetchPartnerEventVenueWorkflows(): Promise<PartnerEventVenueWorkflow[]> {
  const { data, error } = await supabase.rpc('get_partner_event_venue_workflows');
  throwIfError(error);
  return ((data ?? []) as PartnerEventVenueWorkflowRow[]).map(partnerEventVenueWorkflowFromRow);
}

export async function decidePartnerEventVenuePlacement(
  relationshipId: string,
  decision: 'approved' | 'declined' | 'revoked',
  expectedVersion: number,
  reason?: string,
) {
  const { error } = await supabase.rpc('decide_event_venue_placement', {
    p_relationship_id: relationshipId,
    p_decision: decision,
    p_reason: reason?.trim() || null,
    p_expected_version: expectedVersion,
  });
  throwIfError(error);
}

export async function resubmitPartnerEventVenuePlacement(
  relationshipId: string,
  expectedVersion: number,
  reason?: string,
) {
  const { error } = await supabase.rpc('resubmit_event_venue_placement', {
    p_relationship_id: relationshipId,
    p_reason: reason?.trim() || null,
    p_expected_version: expectedVersion,
  });
  throwIfError(error);
}

export async function reportPartnerEventVenueAttribution(
  relationshipId: string,
  expectedVersion: number,
  reason: string,
) {
  const { error } = await supabase.rpc('report_event_venue_attribution', {
    p_relationship_id: relationshipId,
    p_reason: reason.trim(),
    p_expected_version: expectedVersion,
  });
  throwIfError(error);
}

export async function respondToPartnerEventVenueDispute(
  relationshipId: string,
  expectedVersion: number,
  response: string,
) {
  const { error } = await supabase.rpc('respond_event_venue_dispute', {
    p_relationship_id: relationshipId,
    p_response: response.trim(),
    p_expected_version: expectedVersion,
  });
  throwIfError(error);
}

export async function savePartnerVenue(
  userId: string,
  application: PartnerApplicationRow | null,
  venueData: PartnerVenueInput,
) {
  if (application?.status !== 'live') {
    throw new Error('Partner application must be approved before managing venues');
  }
  if (!canManageVenues(application.partner_type as PartnerType)) {
    throw new Error('Your partner type is not allowed to manage venues');
  }
  if (!application.region_id) {
    throw new Error('Choose a valid discovery market before creating a venue');
  }

  const city = application.city?.split(',')[0]?.trim() ?? 'Lusaka';
  const { data: existing, error: lookupError } = await supabase
    .from('venues')
    .select('id,listing_status,updated_at')
    .eq('partner_id', userId)
    .maybeSingle();
  throwIfError(lookupError);

  const editable = {
    name: venueData.name, category: venueData.category, description: venueData.description ?? null,
    address: venueData.address, area: venueData.area ?? null,
    price_tier: venueData.priceTier ?? null,
    avg_cost_pp: venueData.averageCostPerPerson ?? null,
    vibes: venueData.vibes,
    contact_phone: venueData.phone ?? null,
    website_url: venueData.website ?? null,
    open_hours: venueData.openHours,
    cover_image: venueData.coverImage ?? venueData.images?.[0] ?? null,
    images: venueData.images ?? [],
  };

  if (existing) {
    if (existing.listing_status === 'live') {
      const { error } = await supabase.rpc('partner_submit_live_venue_revision', {
        p_venue_id: existing.id,
        p_expected_updated_at: existing.updated_at,
        p_payload: editable,
      });
      throwIfError(error);
      return;
    }
    const { error } = await supabase.from('venues').update({
      ...editable,
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id);
    throwIfError(error);
    return;
  }

  const { error } = await supabase.from('venues').insert({
    ...editable, city, region_id: application.region_id,
    partner_id: userId, review_count: 0, created_at: new Date().toISOString(),
  });
  throwIfError(error);
}
