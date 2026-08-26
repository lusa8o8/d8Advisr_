export type PublicEventSource = {
  id: string;
  publisher_name: string;
  source_title: string | null;
  url: string;
  is_primary: boolean;
  last_checked_at: string | null;
  created_at: string;
};

export type PublicEventAction = {
  id: string;
  provider_name: string;
  label: 'Get tickets' | 'Register' | 'View official details';
  url: string;
  status: 'unverified' | 'active' | 'sold_out' | 'closed' | 'invalid';
  is_primary: boolean;
  last_checked_at: string | null;
  created_at: string;
};

export type EventTrustPresentation = {
  citation: PublicEventSource | null;
  action:
    | { kind: 'active'; label: PublicEventAction['label']; providerName: string; url: string }
    | { kind: 'sold_out'; providerName: string }
    | { kind: 'closed'; providerName: string }
    | { kind: 'cancelled' }
    | { kind: 'unavailable' }
    | { kind: 'hidden' };
};

function newestFirst(a: { last_checked_at: string | null; created_at: string }, b: { last_checked_at: string | null; created_at: string }) {
  return Date.parse(b.last_checked_at ?? b.created_at) - Date.parse(a.last_checked_at ?? a.created_at);
}

function primaryThenNewest<T extends { is_primary: boolean; last_checked_at: string | null; created_at: string }>(rows: T[]) {
  return [...rows].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || newestFirst(a, b));
}

export function presentEventTrust(input: {
  eventStatus: 'live' | 'cancelled';
  isImported: boolean;
  sources: PublicEventSource[];
  actions: PublicEventAction[];
}): EventTrustPresentation {
  const citation = primaryThenNewest(input.sources)[0] ?? null;

  if (input.eventStatus === 'cancelled') {
    return { citation, action: { kind: 'cancelled' } };
  }

  const actions = primaryThenNewest(input.actions);
  const active = actions.find(action => action.status === 'active');
  if (active) {
    return {
      citation,
      action: {
        kind: 'active',
        label: active.label,
        providerName: active.provider_name,
        url: active.url,
      },
    };
  }

  const soldOut = actions.find(action => action.status === 'sold_out');
  if (soldOut) return { citation, action: { kind: 'sold_out', providerName: soldOut.provider_name } };

  const closed = actions.find(action => action.status === 'closed');
  if (closed) return { citation, action: { kind: 'closed', providerName: closed.provider_name } };

  if (input.isImported || citation || actions.length > 0) {
    return { citation, action: { kind: 'unavailable' } };
  }

  return { citation, action: { kind: 'hidden' } };
}
