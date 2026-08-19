export const EVENT_PUBLISHING_POLICY_ID = 'partner-event-publishing-v1.0';
export const EVENT_PUBLISHING_POLICY_VERSION = '1.0';
export const EVENT_PUBLISHING_POLICY_APPROVED_DATE = '18 August 2026';
export const EVENT_PUBLISHING_POLICY_CONTENT_HASH = '749f2d5c230588a3b540c5b69e774d816cfb79810ebc58d899b697a7d6fd226e';
export const EVENT_PUBLISHING_POLICY_PATH = '/partner-policies/event-publishing';

export const EVENT_PUBLISHING_ACKNOWLEDGEMENT =
  "I confirm that the event's commercial details are correct. I understand that a free event cannot later become paid and that a published mandatory price cannot be increased.";

export const EVENT_EMOJI_OPTIONS = ['📅', '🎷', '🍳', '🎤', '🏃', '🎵', '🍷', '🎭', '🏋️', '🎨', '🎪', '🌟'] as const;

const DECIMAL_PRICE = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function parseEventPriceInput(value: string, isFree: boolean): number {
  if (isFree) return 0;
  const normalized = value.trim();
  if (normalized === '' || normalized === '0' || normalized === '0.00' || normalized === '0.0') {
    return 0;
  }
  if (!DECIMAL_PRICE.test(normalized)) {
    throw new Error('Enter a valid entry price with no more than two decimal places.');
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Paid events require an entry price greater than zero.');
  }
  if (parsed > 9_999_999_999.99) {
    throw new Error('Entry price is above the supported maximum.');
  }
  return parsed;
}

export function parseEventCapacityInput(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!/^\d+$/.test(normalized) || Number(normalized) <= 0) {
    throw new Error('Leave attendance blank for open attendance, or enter a whole number greater than zero.');
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error('Attendance is above the supported maximum.');
  }
  return parsed;
}

export function canPublishedPriceChange(args: {
  previouslyPublished: boolean;
  currentIsFree: boolean;
  currentPrice: number;
  proposedIsFree: boolean;
  proposedPrice: number;
}) {
  if (!args.previouslyPublished) return { allowed: true as const };
  if (args.currentIsFree && !args.proposedIsFree) {
    return { allowed: false as const, reason: 'A published free event cannot become paid.' };
  }
  if (!args.currentIsFree && !args.proposedIsFree && args.proposedPrice > args.currentPrice) {
    return { allowed: false as const, reason: 'A published event price cannot be increased.' };
  }
  return { allowed: true as const };
}
