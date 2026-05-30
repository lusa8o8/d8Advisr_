import { supabase } from '@/lib/supabase';

export type PartnerMediaScope = 'events' | 'venues';

export const PARTNER_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const PARTNER_IMAGE_MIN_WIDTH = 800;
export const PARTNER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function isPartnerImageUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

export async function validatePartnerImage(file: File, minWidth = PARTNER_IMAGE_MIN_WIDTH) {
  if (!PARTNER_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Use JPG, PNG, or WebP images only.');
  }

  if (file.size > PARTNER_IMAGE_MAX_BYTES) {
    throw new Error('Images must be 3 MB or smaller.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const width = await new Promise<number>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth);
      image.onerror = () => reject(new Error('Could not read image dimensions.'));
      image.src = objectUrl;
    });

    if (width < minWidth) {
      throw new Error(`Images must be at least ${minWidth}px wide.`);
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fileExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadPartnerImage(file: File, scope: PartnerMediaScope) {
  await validatePartnerImage(file);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const path = [
    user.id,
    scope,
    `${Date.now()}-${crypto.randomUUID()}.${fileExtension(file)}`,
  ].join('/');

  const { error } = await supabase.storage
    .from('partner-media')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('partner-media').getPublicUrl(path);
  return data.publicUrl;
}
