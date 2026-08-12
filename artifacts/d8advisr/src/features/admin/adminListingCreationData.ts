import { supabase } from '@/lib/supabase';

export type AdminListingAttribution = 'unclaimed' | 'd8advisr';
export type AdminPublicationStatus = 'draft' | 'live';

export interface AdminVenueCreationInput {
  requestKey: string;
  name: string;
  city: string;
  category: string;
  attribution: AdminListingAttribution;
  publicationStatus: AdminPublicationStatus;
  area?: string;
  address?: string;
  description?: string;
  tier?: 'Verified' | 'D8 Approved' | 'Hidden Gem';
  priceTier?: string;
  averageCostPerPerson?: number;
  coverImage?: string;
  images?: string[];
  vibes?: string[];
}

export interface AdminEventCreationInput {
  requestKey: string;
  title: string;
  city: string;
  startsAt: string;
  attribution: AdminListingAttribution;
  publicationStatus: AdminPublicationStatus;
  category?: string;
  description?: string;
  endsAt?: string;
  locationKind: 'd8_venue' | 'external' | 'undisclosed';
  venueId?: string;
  externalLocationName?: string;
  externalLocationAddress?: string;
  pricePerPerson?: number;
  currency?: string;
  capacity?: number;
  isFree?: boolean;
  isFeatured?: boolean;
  coverImage?: string;
  images?: string[];
  vibes?: string[];
  emoji?: string;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw error;
}

export async function createAdminVenue(input: AdminVenueCreationInput): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_venue', {
    p_payload: {
      request_key: input.requestKey,
      name: input.name.trim(),
      city: input.city.trim(),
      category: input.category.trim(),
      attribution: input.attribution,
      publication_status: input.publicationStatus,
      area: input.area?.trim() || null,
      address: input.address?.trim() || null,
      description: input.description?.trim() || null,
      tier: input.tier ?? 'Verified',
      price_tier: input.priceTier?.trim() || null,
      avg_cost_pp: input.averageCostPerPerson ?? null,
      cover_image: input.coverImage?.trim() || null,
      images: input.images ?? [],
      vibes: input.vibes ?? [],
    },
  });
  throwIfError(error);
  if (typeof data !== 'string') throw new Error('Admin venue creation did not return an ID');
  return data;
}

export async function createAdminEvent(input: AdminEventCreationInput): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_event', {
    p_payload: {
      request_key: input.requestKey,
      title: input.title.trim(),
      city: input.city.trim(),
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt || null,
      attribution: input.attribution,
      publication_status: input.publicationStatus,
      event_location_kind: input.locationKind,
      venue_id: input.locationKind === 'd8_venue' ? input.venueId || null : null,
      external_location_name: input.locationKind === 'external' ? input.externalLocationName?.trim() || null : null,
      external_location_address: input.locationKind === 'external' ? input.externalLocationAddress?.trim() || null : null,
      price_pp: input.isFree ? 0 : input.pricePerPerson ?? 0,
      currency: input.currency?.trim() || 'K',
      capacity: input.capacity ?? 0,
      is_free: Boolean(input.isFree),
      is_featured: Boolean(input.isFeatured),
      cover_image: input.coverImage?.trim() || null,
      images: input.images ?? [],
      vibes: input.vibes ?? [],
      emoji: input.emoji?.trim() || '📅',
      frequency: 'one-off',
    },
  });
  throwIfError(error);
  if (typeof data !== 'string') throw new Error('Admin event creation did not return an ID');
  return data;
}
