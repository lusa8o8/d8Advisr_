export const DEFAULT_PLAN_RETURN_PATH = '/plans';

const DISALLOWED_RETURN_PREFIXES = [
  '/admin',
  '/auth',
  '/password',
  '/signin',
  '/signup',
];

export function normalizePlanReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_PLAN_RETURN_PATH;
  }

  const pathname = value.split(/[?#]/, 1)[0];
  if (
    pathname === '/'
    || pathname.startsWith('/plan/generate')
    || DISALLOWED_RETURN_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return DEFAULT_PLAN_RETURN_PATH;
  }

  return value;
}

export function createPlanGeneratorPath(
  returnTo: string,
  existingParams?: URLSearchParams,
) {
  const params = new URLSearchParams(existingParams);
  params.set('returnTo', normalizePlanReturnPath(returnTo));
  return `/plan/generate?${params.toString()}`;
}

export function getPlanGeneratorReturnPath(search: string) {
  return normalizePlanReturnPath(new URLSearchParams(search).get('returnTo'));
}
