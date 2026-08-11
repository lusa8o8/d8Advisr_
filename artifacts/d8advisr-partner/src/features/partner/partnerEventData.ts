import { supabase } from '@workspace/d8-core/supabase';
import { canManageEvents, type PartnerType } from '@workspace/d8-core/partner-capabilities';
import type { PartnerEvent, PartnerVenueOption } from '@workspace/d8-core/types';
import type { PartnerApplicationRow } from './partnerModels';
import { partnerEventFromRow } from './partnerModels';

export interface PartnerEventInput {
  title: string;
  category: string;
  description?: string;
  frequency: string;
  weekday?: string;
  date?: string;
  time: string;
  price: string;
  isFree: boolean;
  hasCapacity: boolean;
  capacity?: string;
  emoji?: string;
  publishNow: boolean;
  locationKind?: 'owned_venue' | 'existing_venue' | 'external' | 'undisclosed';
  venueId?: string;
  externalLocationName?: string;
  externalLocationAddress?: string;
  coverImage?: string | null;
  images?: string[];
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

function throwIfError(error: { message: string } | null) {
  if (error) throw error;
}

function buildNextStartsAt(eventData: PartnerEventInput) {
  const now = new Date();
  const [rawHours, rawMinutes] = eventData.time.split(':').map(part => Number.parseInt(part, 10));
  const hours = Number.isFinite(rawHours) ? rawHours : 0;
  const minutes = Number.isFinite(rawMinutes) ? rawMinutes : 0;

  if (eventData.frequency === 'one-off' && eventData.date) {
    const exact = new Date(`${eventData.date}T${eventData.time}`);
    if (!Number.isNaN(exact.getTime())) return exact.toISOString();
  }
  if (eventData.frequency === 'weekly' && eventData.weekday && eventData.weekday in WEEKDAY_INDEX) {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    next.setDate(next.getDate() + (WEEKDAY_INDEX[eventData.weekday] - next.getDay() + 7) % 7);
    if (next <= now) next.setDate(next.getDate() + 7);
    return next.toISOString();
  }
  if (eventData.frequency === 'monthly') {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    return next.toISOString();
  }
  if (eventData.frequency === 'annual' && eventData.date) {
    const annual = new Date(`${eventData.date}T${eventData.time}`);
    if (!Number.isNaN(annual.getTime())) {
      if (annual <= now) annual.setFullYear(annual.getFullYear() + 1);
      return annual.toISOString();
    }
  }
  const fallback = new Date(now);
  fallback.setHours(hours, minutes, 0, 0);
  if (fallback <= now) fallback.setDate(fallback.getDate() + 1);
  return fallback.toISOString();
}

export async function fetchPartnerEvents(userId: string): Promise<PartnerEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('partner_id', userId)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map(row => partnerEventFromRow(row as Record<string, unknown>));
}

export async function savePartnerEvent(
  userId: string,
  application: PartnerApplicationRow | null,
  venueOptions: PartnerVenueOption[],
  eventData: PartnerEventInput,
  editId?: string,
) {
  if (application?.status !== 'live') {
    throw new Error('Partner application must be approved before publishing events');
  }
  if (!canManageEvents(application.partner_type as PartnerType)) {
    throw new Error('Your partner type is not allowed to create events');
  }

  const city = application.city?.split(',')[0]?.trim() ?? 'Lusaka';
  const selectedVenue = eventData.venueId ? venueOptions.find(venue => venue.id === eventData.venueId) : null;
  const hasLinkedVenue = Boolean(selectedVenue);
  const locationKind = hasLinkedVenue ? 'd8_venue' : eventData.locationKind === 'external' ? 'external' : 'undisclosed';
  const venuePageStatus = hasLinkedVenue && selectedVenue?.isOwnedByCurrentPartner
    ? 'approved' : hasLinkedVenue ? 'requested' : 'hidden';
  const spotsTotal = eventData.hasCapacity ? (parseInt(eventData.capacity ?? '0') || 0) : 0;
  const pricePp = eventData.isFree ? 0 : parseFloat(eventData.price.replace(/[^0-9.]/g, '')) || 0;

  let nextOccurrence = '';
  if (eventData.frequency === 'weekly' && eventData.weekday) nextOccurrence = `${eventData.weekday}s · ${eventData.time}`;
  else if (eventData.frequency === 'one-off' && eventData.date) nextOccurrence = `${eventData.date} · ${eventData.time}`;
  else if (eventData.frequency === 'monthly') nextOccurrence = `Monthly · ${eventData.time}`;
  else if (eventData.frequency === 'annual' && eventData.date) nextOccurrence = `${eventData.date} · ${eventData.time}`;

  const now = new Date().toISOString();
  const payload = {
    title: eventData.title, category: eventData.category, description: eventData.description ?? null,
    frequency: eventData.frequency, weekday: eventData.weekday ?? null, next_occurrence: nextOccurrence,
    spots_total: spotsTotal, spots_filled: 0, price_pp: pricePp, is_free: eventData.isFree,
    emoji: eventData.emoji ?? '📅', cover_image: eventData.coverImage ?? eventData.images?.[0] ?? null,
    images: eventData.images ?? [], event_status: eventData.publishNow ? 'live' : 'draft',
    event_location_kind: locationKind, venue_id: selectedVenue?.id ?? null,
    external_location_name: locationKind === 'external' ? eventData.externalLocationName?.trim() || null : null,
    external_location_address: locationKind === 'external' ? eventData.externalLocationAddress?.trim() || null : null,
    venue_page_status: venuePageStatus, partner_id: userId, city, currency: city === 'Lusaka' ? 'K' : '₦',
    starts_at: buildNextStartsAt(eventData), vibes: [], updated_at: now,
  };

  if (editId) {
    const { error } = await supabase.from('events').update(payload).eq('id', editId);
    throwIfError(error);
  } else {
    const { error } = await supabase.from('events').insert({ ...payload, created_at: now });
    throwIfError(error);
  }
}

export async function setPartnerEventStatus(id: string, status: 'live' | 'paused') {
  const { error } = await supabase
    .from('events')
    .update({ event_status: status, updated_at: new Date().toISOString() })
    .eq('id', id);
  throwIfError(error);
}
