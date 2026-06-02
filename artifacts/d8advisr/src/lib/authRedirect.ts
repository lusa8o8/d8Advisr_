const DEFAULT_POST_AUTH_PATH = '/home';

const OAUTH_ERROR_KEY = 'd8advisr_oauth_error';

export function getSafeNextPath(search = window.location.search) {
  const next = new URLSearchParams(search).get('next');

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return null;
  }

  return next;
}

export function getSafeNextPathFromUrl(url = window.location) {
  return getSafeNextPath(url.search) ?? getSafeNextPath(url.hash.replace(/^#/, '?'));
}

export function getPostAuthRedirectPath() {
  return getSafeNextPathFromUrl() ?? import.meta.env.VITE_POST_AUTH_REDIRECT ?? DEFAULT_POST_AUTH_PATH;
}

export function authPathWithNext(path: '/signin' | '/signup', nextPath: string | null) {
  if (!nextPath) return path;
  return `${path}?next=${encodeURIComponent(nextPath)}`;
}

export function storeOAuthError(message: string) {
  sessionStorage.setItem(OAUTH_ERROR_KEY, message);
}

export function consumeOAuthError() {
  const message = sessionStorage.getItem(OAUTH_ERROR_KEY);
  if (message) sessionStorage.removeItem(OAUTH_ERROR_KEY);
  return message;
}
