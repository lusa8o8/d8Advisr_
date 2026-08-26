import { supabase } from '@/lib/supabase';

export type EventSourceType = 'organizer' | 'venue' | 'ticketing' | 'press' | 'calendar' | 'social';
export type EventSourceStatus = 'unverified' | 'verified' | 'stale' | 'rejected';
export type EventActionLinkType = 'tickets' | 'registration' | 'official';
export type EventActionLinkStatus = 'unverified' | 'active' | 'sold_out' | 'closed' | 'invalid';

export interface EventSourceDraft {
  clientId: string;
  sourceType: EventSourceType;
  publisherName: string;
  sourceTitle: string;
  url: string;
  verificationStatus: EventSourceStatus;
  isPrimary: boolean;
  showPublicly: boolean;
  observedAt: string;
  lastCheckedAt: string | null;
  internalNote: string;
}

export interface EventActionLinkDraft {
  clientId: string;
  linkType: EventActionLinkType;
  providerName: string;
  url: string;
  status: EventActionLinkStatus;
  isPrimary: boolean;
  lastCheckedAt: string | null;
}

export interface EventProvenanceDraft {
  isImported: boolean;
  sources: EventSourceDraft[];
  actionLinks: EventActionLinkDraft[];
}

interface EventSourceRow {
  id: string;
  source_type: EventSourceType;
  publisher_name: string;
  source_title: string | null;
  url: string;
  verification_status: EventSourceStatus;
  is_primary: boolean;
  show_publicly: boolean;
  observed_at: string | null;
  last_checked_at: string | null;
  internal_note: string | null;
}

interface EventActionLinkRow {
  id: string;
  link_type: EventActionLinkType;
  provider_name: string;
  url: string;
  status: EventActionLinkStatus;
  is_primary: boolean;
  last_checked_at: string | null;
}

export interface EventProvenanceResult {
  event_id: string;
  event_source: string | null;
  event_updated_at: string;
  sources: unknown[];
  action_links: unknown[];
}

function throwIfError(error: { message: string } | null) {
  if (!error) return;
  const messages: Record<string, string> = {
    event_changed_after_provenance_loaded: 'This event changed in another session. Reload before saving its sources.',
    event_provenance_request_key_reused: 'This save request was already used for a different event.',
    retired_event_provenance_cannot_change: 'Restore the event before changing its sources.',
    published_event_origin_cannot_change_to_import: 'A published event cannot be reclassified as an imported listing.',
    only_d8_admin_drafts_can_be_marked_as_imports: 'Only a D8-created draft can become an imported listing.',
  };
  throw new Error(messages[error.message] ?? error.message.replaceAll('_', ' '));
}

export function newEventSource(): EventSourceDraft {
  return {
    clientId: crypto.randomUUID(),
    sourceType: 'organizer',
    publisherName: '',
    sourceTitle: '',
    url: '',
    verificationStatus: 'unverified',
    isPrimary: false,
    showPublicly: false,
    observedAt: '',
    lastCheckedAt: null,
    internalNote: '',
  };
}

export function newEventActionLink(): EventActionLinkDraft {
  return {
    clientId: crypto.randomUUID(),
    linkType: 'official',
    providerName: '',
    url: '',
    status: 'unverified',
    isPrimary: false,
    lastCheckedAt: null,
  };
}

export function emptyEventProvenanceDraft(): EventProvenanceDraft {
  return { isImported: false, sources: [], actionLinks: [] };
}

export function hasEventProvenance(draft: EventProvenanceDraft) {
  return draft.isImported || draft.sources.length > 0 || draft.actionLinks.length > 0;
}

export async function fetchAdminEventVersion(eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('id,source,updated_at')
    .eq('id', eventId)
    .single();
  throwIfError(error);
  if (!data) throw new Error('Event could not be loaded after creation.');
  return { id: data.id as string, source: data.source as string | null, updatedAt: data.updated_at as string };
}

export async function fetchAdminEventProvenance(
  eventId: string,
  eventSource: string | null,
): Promise<EventProvenanceDraft> {
  const [sourcesResult, actionsResult] = await Promise.all([
    supabase
      .from('event_sources')
      .select('id,source_type,publisher_name,source_title,url,verification_status,is_primary,show_publicly,observed_at,last_checked_at,internal_note')
      .eq('event_id', eventId)
      .order('is_primary', { ascending: false })
      .order('updated_at', { ascending: false }),
    supabase
      .from('event_action_links')
      .select('id,link_type,provider_name,url,status,is_primary,last_checked_at')
      .eq('event_id', eventId)
      .order('is_primary', { ascending: false })
      .order('updated_at', { ascending: false }),
  ]);
  throwIfError(sourcesResult.error);
  throwIfError(actionsResult.error);

  return {
    isImported: eventSource === 'import',
    sources: ((sourcesResult.data ?? []) as EventSourceRow[]).map(row => ({
      clientId: row.id,
      sourceType: row.source_type,
      publisherName: row.publisher_name,
      sourceTitle: row.source_title ?? '',
      url: row.url,
      verificationStatus: row.verification_status,
      isPrimary: row.is_primary,
      showPublicly: row.show_publicly,
      observedAt: row.observed_at ? row.observed_at.slice(0, 16) : '',
      lastCheckedAt: row.last_checked_at,
      internalNote: row.internal_note ?? '',
    })),
    actionLinks: ((actionsResult.data ?? []) as EventActionLinkRow[]).map(row => ({
      clientId: row.id,
      linkType: row.link_type,
      providerName: row.provider_name,
      url: row.url,
      status: row.status,
      isPrimary: row.is_primary,
      lastCheckedAt: row.last_checked_at,
    })),
  };
}

export async function replaceAdminEventProvenance(
  eventId: string,
  draft: EventProvenanceDraft,
  expectedUpdatedAt: string,
  requestKey: string,
  markAsImport: boolean,
): Promise<EventProvenanceResult> {
  const { data, error } = await supabase.rpc('admin_replace_event_provenance', {
    p_event_id: eventId,
    p_sources: draft.sources.map(source => ({
      source_type: source.sourceType,
      publisher_name: source.publisherName.trim(),
      source_title: source.sourceTitle.trim() || null,
      url: source.url.trim(),
      verification_status: source.verificationStatus,
      is_primary: source.isPrimary,
      show_publicly: source.showPublicly,
      observed_at: source.observedAt ? new Date(source.observedAt).toISOString() : null,
      last_checked_at: source.lastCheckedAt,
      internal_note: source.internalNote.trim() || null,
    })),
    p_action_links: draft.actionLinks.map(link => ({
      link_type: link.linkType,
      provider_name: link.providerName.trim(),
      url: link.url.trim(),
      status: link.status,
      is_primary: link.isPrimary,
      last_checked_at: link.lastCheckedAt,
    })),
    p_expected_updated_at: expectedUpdatedAt,
    p_request_key: requestKey,
    p_mark_as_import: markAsImport,
  });
  throwIfError(error);
  if (!data || typeof data !== 'object') throw new Error('Event evidence update did not return a result.');
  return data as unknown as EventProvenanceResult;
}
