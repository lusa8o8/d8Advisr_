export const DEFAULT_EVENT_RETURN_PATH = '/home';

const ALLOWED_RETURN_PATHS = new Set(['/home', '/map', '/notifications', '/plans']);

export function normalizeEventReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_EVENT_RETURN_PATH;

  const pathname = value.split(/[?#]/, 1)[0];
  if (ALLOWED_RETURN_PATHS.has(pathname) || pathname.startsWith('/venue/')) return value;

  return DEFAULT_EVENT_RETURN_PATH;
}

export function createEventDetailPath(eventId: string, returnTo: string) {
  const params = new URLSearchParams({ returnTo: normalizeEventReturnPath(returnTo) });
  return `/event/${encodeURIComponent(eventId)}?${params.toString()}`;
}

export function getEventReturnPath(search: string) {
  return normalizeEventReturnPath(new URLSearchParams(search).get('returnTo'));
}
