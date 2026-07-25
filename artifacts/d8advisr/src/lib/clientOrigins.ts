export function getPartnerOrigin() {
  const configured = import.meta.env.VITE_PARTNER_ORIGIN?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the environment default.
    }
  }
  return import.meta.env.DEV ? 'http://localhost:3001' : 'https://partner.d8advisr.com';
}

export function redirectToPartner(status?: string | null) {
  const path = status === 'live' ? '/dashboard' : '/';
  window.location.replace(`${getPartnerOrigin()}${path}`);
}
