import {
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_MIN_WIDTH,
  LISTING_IMAGE_TYPES,
  uploadListingImage,
  validateListingImage,
} from '@workspace/d8-core/supabase';

export type PartnerMediaScope = 'events' | 'venues';

export const PARTNER_IMAGE_MAX_BYTES = LISTING_IMAGE_MAX_BYTES;
export const PARTNER_IMAGE_MIN_WIDTH = LISTING_IMAGE_MIN_WIDTH;
export const PARTNER_IMAGE_TYPES = LISTING_IMAGE_TYPES;

export function isPartnerImageUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

export async function validatePartnerImage(file: File, minWidth = PARTNER_IMAGE_MIN_WIDTH) {
  return validateListingImage(file, minWidth);
}

export async function uploadPartnerImage(file: File, scope: PartnerMediaScope) {
  return uploadListingImage(file, scope);
}
