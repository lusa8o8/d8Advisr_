export const EVENT_PUBLISHING_POLICY_ID = 'partner-event-publishing-v1.1';
export const EVENT_PUBLISHING_POLICY_VERSION = '1.1';
export const EVENT_PUBLISHING_POLICY_APPROVED_DATE = '20 August 2026';
export const EVENT_PUBLISHING_POLICY_CONTENT_HASH = 'e3933f5bc2fdb5679e56a72e1393b79c457d4fa007a354ba2f94545c6438c71a';
export const EVENT_PUBLISHING_POLICY_PATH = '/partner-policies/event-publishing';

export const EVENT_PUBLISHING_ACKNOWLEDGEMENT =
  "I confirm that these event details are accurate. Material changes after publication require another confirmation and may notify interested consumers.";

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

export function toDateTimeLocalInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function alignEventEndWithStart(
  previousStart: string,
  previousEnd: string,
  nextStart: string,
  defaultDurationMinutes = 120,
): string {
  if (!nextStart) return '';
  const nextStartDate = new Date(nextStart);
  if (Number.isNaN(nextStartDate.getTime())) return previousEnd;

  const previousStartDate = previousStart ? new Date(previousStart) : null;
  const previousEndDate = previousEnd ? new Date(previousEnd) : null;
  const previousDuration = previousStartDate && previousEndDate
    ? previousEndDate.getTime() - previousStartDate.getTime()
    : 0;
  const duration = previousDuration > 0
    ? previousDuration
    : defaultDurationMinutes * 60_000;

  return toDateTimeLocalInput(new Date(nextStartDate.getTime() + duration));
}

export function canPublishedPriceChange(args: {
  previouslyPublished: boolean;
  currentIsFree: boolean;
  currentPrice: number;
  proposedIsFree: boolean;
  proposedPrice: number;
}) {
  const changed = args.currentIsFree !== args.proposedIsFree
    || args.currentPrice !== args.proposedPrice;
  return {
    allowed: true as const,
    requiresConfirmation: args.previouslyPublished && changed,
    reason: undefined,
  };
}
