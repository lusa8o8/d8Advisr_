export const DEFAULT_SETTINGS_RETURN_PATH = '/profile';

const DISALLOWED_RETURN_PREFIXES = ['/admin', '/auth', '/password', '/signin', '/signup'];

export function normalizeSettingsReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_SETTINGS_RETURN_PATH;

  const pathname = value.split(/[?#]/, 1)[0];
  if (
    pathname === '/'
    || pathname.startsWith('/settings')
    || DISALLOWED_RETURN_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return DEFAULT_SETTINGS_RETURN_PATH;
  }

  return value;
}

export function createSettingsPath(returnTo: string) {
  const params = new URLSearchParams({ returnTo: normalizeSettingsReturnPath(returnTo) });
  return `/settings?${params.toString()}`;
}

export function getSettingsReturnPath(search: string) {
  return normalizeSettingsReturnPath(new URLSearchParams(search).get('returnTo'));
}
