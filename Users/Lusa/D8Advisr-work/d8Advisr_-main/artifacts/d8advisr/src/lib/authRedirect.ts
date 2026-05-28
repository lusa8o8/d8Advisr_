const DEFAULT_POST_AUTH_PATH = '/home';

export function getSafeNextPath(search = window.location.search) {
  const next = new URLSearchParams(search).get('next');

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return null;
  }

  return next;
}

export function getPostAuthRedirectPath() {
  return getSafeNextPath() ?? import.meta.env.VITE_POST_AUTH_REDIRECT ?? DEFAULT_POST_AUTH_PATH;
}

export function authPathWithNext(path: '/signin' | '/signup', nextPath: string | null) {
  if (!nextPath) return path;
  return `${path}?next=${encodeURIComponent(nextPath)}`;
}
