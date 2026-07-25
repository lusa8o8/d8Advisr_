export type PartnerType = 'venue' | 'organizer' | 'both';
export type PartnerCapability = 'events' | 'venues';

export function canManageEvents(partnerType: PartnerType | null | undefined) {
  return partnerType === 'organizer' || partnerType === 'both';
}

export function canManageVenues(partnerType: PartnerType | null | undefined) {
  return partnerType === 'venue' || partnerType === 'both';
}

export function hasPartnerCapability(
  partnerType: PartnerType | null | undefined,
  capability?: PartnerCapability,
) {
  if (!capability) return true;
  return capability === 'events'
    ? canManageEvents(partnerType)
    : canManageVenues(partnerType);
}
