import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, FileCheck2, Link2, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { AdminEvent } from './adminListingModel';
import {
  emptyEventProvenanceDraft,
  fetchAdminEventProvenance,
  newEventActionLink,
  newEventSource,
  replaceAdminEventProvenance,
  type EventActionLinkDraft,
  type EventProvenanceDraft,
  type EventSourceDraft,
} from './adminEventProvenanceData';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-900 outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F]';

export function validateEventProvenanceDraft(draft: EventProvenanceDraft) {
  if (draft.sources.length > 10) throw new Error('Events can have at most 10 evidence sources.');
  if (draft.actionLinks.length > 5) throw new Error('Events can have at most 5 external actions.');
  if (draft.isImported && draft.sources.length === 0) {
    throw new Error('Imported events need at least one evidence source before saving.');
  }
  for (const source of draft.sources) {
    if (!source.publisherName.trim()) throw new Error('Every source needs a publisher name.');
    if (!/^https?:\/\/\S+$/i.test(source.url.trim())) throw new Error('Every source needs a valid HTTP(S) URL.');
    if (source.verificationStatus !== 'verified' && (source.showPublicly || source.isPrimary)) {
      throw new Error('Only verified sources can be public or primary.');
    }
    if (source.isPrimary && !source.showPublicly) throw new Error('The primary source must be public.');
  }
  for (const link of draft.actionLinks) {
    if (!link.providerName.trim()) throw new Error('Every action link needs a provider name.');
    if (!/^https?:\/\/\S+$/i.test(link.url.trim())) throw new Error('Every action link needs a valid HTTP(S) URL.');
    if (link.isPrimary && !['active', 'sold_out'].includes(link.status)) {
      throw new Error('Only active or sold-out action links can be primary.');
    }
  }
}

function updateSource(
  draft: EventProvenanceDraft,
  clientId: string,
  patch: Partial<EventSourceDraft>,
): EventProvenanceDraft {
  const nextPatch = { ...patch };
  if (patch.verificationStatus && patch.verificationStatus !== 'verified') {
    nextPatch.showPublicly = false;
    nextPatch.isPrimary = false;
  }
  return {
    ...draft,
    sources: draft.sources.map(source => source.clientId === clientId
      ? { ...source, ...nextPatch }
      : patch.isPrimary ? { ...source, isPrimary: false } : source),
  };
}

function updateAction(
  draft: EventProvenanceDraft,
  clientId: string,
  patch: Partial<EventActionLinkDraft>,
): EventProvenanceDraft {
  const nextPatch = { ...patch };
  if (patch.status && !['active', 'sold_out'].includes(patch.status)) nextPatch.isPrimary = false;
  return {
    ...draft,
    actionLinks: draft.actionLinks.map(link => link.clientId === clientId
      ? { ...link, ...nextPatch }
      : patch.isPrimary ? { ...link, isPrimary: false } : link),
  };
}

export function AdminEventProvenanceFields({
  value,
  onChange,
  allowImportToggle = true,
  importLocked = false,
  importedSchedule,
}: {
  value: EventProvenanceDraft;
  onChange: (next: EventProvenanceDraft) => void;
  allowImportToggle?: boolean;
  importLocked?: boolean;
  importedSchedule?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {allowImportToggle && (
        <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={value.isImported}
            disabled={importLocked}
            onChange={event => onChange({ ...value, isImported: event.target.checked })}
          />
          <span>
            <span className="block text-[12px] font-bold text-amber-900">Researched/imported event</span>
            <span className="mt-0.5 block text-[10px] leading-relaxed text-amber-700">
              Imported events stay in draft until at least one source is verified. This label cannot be removed after publication.
            </span>
          </span>
        </label>
      )}

      {value.isImported && importedSchedule}

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-black text-gray-900">Evidence sources</p>
            <p className="text-[10px] text-gray-500">Where the event facts were confirmed.</p>
          </div>
          <button type="button" disabled={value.sources.length >= 10} onClick={() => onChange({ ...value, sources: [...value.sources, newEventSource()] })} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-2 text-[10px] font-bold text-gray-700 disabled:opacity-40"><Plus size={12} /> Add source</button>
        </div>
        <div className="space-y-3">
          {value.sources.length === 0 && <p className="rounded-xl border border-dashed border-gray-200 p-3 text-[11px] text-gray-400">No research evidence added.</p>}
          {value.sources.map((source, index) => (
            <div key={source.clientId} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wide text-gray-400">Source {index + 1}</span><button type="button" aria-label={`Remove source ${index + 1}`} onClick={() => onChange({ ...value, sources: value.sources.filter(item => item.clientId !== source.clientId) })} className="text-red-500"><Trash2 size={14} /></button></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select aria-label={`Source ${index + 1} type`} className={inputClass} value={source.sourceType} onChange={e => onChange(updateSource(value, source.clientId, { sourceType: e.target.value as EventSourceDraft['sourceType'] }))}><option value="organizer">Organizer</option><option value="venue">Venue</option><option value="ticketing">Ticketing platform</option><option value="press">Press</option><option value="calendar">Event calendar</option><option value="social">Social post</option></select>
                <input aria-label={`Source ${index + 1} publisher`} maxLength={120} placeholder="Publisher · e.g. TicketHost" className={inputClass} value={source.publisherName} onChange={e => onChange(updateSource(value, source.clientId, { publisherName: e.target.value }))} />
                <input aria-label={`Source ${index + 1} title`} maxLength={250} placeholder="Source title (optional)" className={inputClass} value={source.sourceTitle} onChange={e => onChange(updateSource(value, source.clientId, { sourceTitle: e.target.value }))} />
                <input aria-label={`Source ${index + 1} URL`} type="url" maxLength={1000} placeholder="https://" className={inputClass} value={source.url} onChange={e => onChange(updateSource(value, source.clientId, { url: e.target.value }))} />
                <select aria-label={`Source ${index + 1} verification status`} className={inputClass} value={source.verificationStatus} onChange={e => onChange(updateSource(value, source.clientId, { verificationStatus: e.target.value as EventSourceDraft['verificationStatus'] }))}><option value="unverified">Unverified</option><option value="verified">Verified now</option><option value="stale">Stale</option><option value="rejected">Rejected</option></select>
                <input aria-label={`Source ${index + 1} evidence checked on`} type="date" className={inputClass} value={source.observedAt.slice(0, 10)} onChange={e => onChange(updateSource(value, source.clientId, { observedAt: e.target.value }))} />
              </div>
              <textarea aria-label={`Source ${index + 1} internal note`} maxLength={1000} placeholder="Internal verification note (never public)" className={`${inputClass} mt-2 min-h-16 resize-y`} value={source.internalNote} onChange={e => onChange(updateSource(value, source.clientId, { internalNote: e.target.value }))} />
              <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-gray-600">
                <label className="flex items-center gap-2"><input type="checkbox" disabled={source.verificationStatus !== 'verified'} checked={source.showPublicly} onChange={e => onChange(updateSource(value, source.clientId, { showPublicly: e.target.checked, isPrimary: e.target.checked ? source.isPrimary : false }))} />Public citation</label>
                <label className="flex items-center gap-2"><input type="checkbox" disabled={!source.showPublicly || source.verificationStatus !== 'verified'} checked={source.isPrimary} onChange={e => onChange(updateSource(value, source.clientId, { isPrimary: e.target.checked }))} />Primary citation</label>
              </div>
              {source.lastCheckedAt && <p className="mt-2 text-[10px] text-gray-400">Last checked {new Date(source.lastCheckedAt).toLocaleString()}</p>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div><p className="text-[12px] font-black text-gray-900">Tickets and registration</p><p className="text-[10px] text-gray-500">External actions; D8 does not process the transaction.</p></div>
          <button type="button" disabled={value.actionLinks.length >= 5} onClick={() => onChange({ ...value, actionLinks: [...value.actionLinks, newEventActionLink()] })} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-2 text-[10px] font-bold text-gray-700 disabled:opacity-40"><Plus size={12} /> Add link</button>
        </div>
        <div className="space-y-3">
          {value.actionLinks.length === 0 && <p className="rounded-xl border border-dashed border-gray-200 p-3 text-[11px] text-gray-400">No external consumer action added.</p>}
          {value.actionLinks.map((link, index) => (
            <div key={link.clientId} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wide text-gray-400">Action {index + 1}</span><button type="button" aria-label={`Remove action ${index + 1}`} onClick={() => onChange({ ...value, actionLinks: value.actionLinks.filter(item => item.clientId !== link.clientId) })} className="text-red-500"><Trash2 size={14} /></button></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select aria-label={`Action ${index + 1} type`} className={inputClass} value={link.linkType} onChange={e => onChange(updateAction(value, link.clientId, { linkType: e.target.value as EventActionLinkDraft['linkType'] }))}><option value="tickets">Tickets</option><option value="registration">Registration</option><option value="official">Official details</option></select>
                <input aria-label={`Action ${index + 1} provider`} maxLength={120} placeholder="Provider · e.g. TicketHost" className={inputClass} value={link.providerName} onChange={e => onChange(updateAction(value, link.clientId, { providerName: e.target.value }))} />
                <input aria-label={`Action ${index + 1} URL`} type="url" maxLength={1000} placeholder="https://" className={inputClass} value={link.url} onChange={e => onChange(updateAction(value, link.clientId, { url: e.target.value }))} />
                <select aria-label={`Action ${index + 1} status`} className={inputClass} value={link.status} onChange={e => onChange(updateAction(value, link.clientId, { status: e.target.value as EventActionLinkDraft['status'] }))}><option value="unverified">Unverified</option><option value="active">Active</option><option value="sold_out">Sold out</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select>
              </div>
              <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-gray-600"><input type="checkbox" disabled={!['active', 'sold_out'].includes(link.status)} checked={link.isPrimary} onChange={e => onChange(updateAction(value, link.clientId, { isPrimary: e.target.checked }))} />Primary consumer action</label>
              {link.lastCheckedAt && <p className="mt-2 text-[10px] text-gray-400">Last checked {new Date(link.lastCheckedAt).toLocaleString()}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminEventProvenanceManager({ event, onSaved }: {
  event: AdminEvent;
  onSaved: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<EventProvenanceDraft>(emptyEventProvenanceDraft);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try { setDraft(await fetchAdminEventProvenance(event.id, event.source)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load event evidence.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [event.id, event.source]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      validateEventProvenanceDraft(draft);
      const nextRequestKey = requestKey.current ?? crypto.randomUUID();
      requestKey.current = nextRequestKey;
      await replaceAdminEventProvenance(
        event.id,
        draft,
        event.updatedAt,
        nextRequestKey,
        draft.isImported && event.source !== 'import',
      );
      requestKey.current = null;
      await onSaved();
      setDraft(await fetchAdminEventProvenance(event.id, draft.isImported ? 'import' : event.source));
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save event evidence.');
    } finally { setSaving(false); }
  };

  const verifiedCount = draft.sources.filter(source => source.verificationStatus === 'verified').length;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FileCheck2 size={16} className="mt-0.5 text-[#FF5A5F]" />
          <div><p className="text-[13px] font-black text-gray-900">Sources and external actions</p><p className="mt-0.5 text-[10px] text-gray-500">{draft.isImported ? 'Imported listing' : 'D8/partner listing'} · {verifiedCount} verified source{verifiedCount === 1 ? '' : 's'}</p></div>
        </div>
        {!editing && !event.retiredAt && <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-2 text-[10px] font-bold text-gray-700"><Pencil size={12} /> Manage</button>}
      </div>

      {loading && <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-400"><Loader2 size={13} className="animate-spin" /> Loading evidence…</div>}
      {error && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">{error}</div>}

      {!loading && editing && (
        <div className="mt-4">
          <AdminEventProvenanceFields value={draft} onChange={setDraft} allowImportToggle importLocked={event.source === 'import' || event.eventStatus !== 'draft'} />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => { setEditing(false); void load(); }} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gray-100 px-3 py-3 text-[12px] font-bold text-gray-600"><X size={14} /> Cancel</button>
            <button type="button" disabled={saving} onClick={() => void save()} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#FF5A5F] px-3 py-3 text-[12px] font-bold text-white disabled:opacity-50"><Save size={14} /> {saving ? 'Saving…' : 'Save evidence'}</button>
          </div>
        </div>
      )}

      {!loading && !editing && (
        <div className="mt-4 space-y-3">
          {draft.isImported && verifiedCount === 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">Publication is blocked until at least one source is verified.</p>}
          {draft.sources.length === 0 && draft.actionLinks.length === 0 && <p className="text-[11px] text-gray-400">No evidence or external action has been recorded.</p>}
          {draft.sources.map(source => <div key={source.clientId} className="rounded-xl border border-gray-100 bg-gray-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold text-gray-900">{source.publisherName}</p><p className="mt-0.5 text-[10px] capitalize text-gray-500">{source.sourceType} · {source.verificationStatus.replace('_', ' ')}</p></div>{source.isPrimary && <span className="rounded-full bg-green-100 px-2 py-1 text-[9px] font-bold text-green-700">Primary citation</span>}</div><a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 break-all text-[10px] font-semibold text-blue-600 hover:underline">{source.url}<ExternalLink size={10} className="shrink-0" /></a></div>)}
          {draft.actionLinks.map(link => <div key={link.clientId} className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><Link2 size={12} className="text-blue-600" /><div><p className="text-[11px] font-bold text-gray-900">{link.providerName}</p><p className="text-[10px] capitalize text-gray-500">{link.linkType} · {link.status.replace('_', ' ')}</p></div></div>{link.isPrimary && <span className="rounded-full bg-blue-100 px-2 py-1 text-[9px] font-bold text-blue-700">Primary action</span>}</div><a href={link.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 break-all text-[10px] font-semibold text-blue-600 hover:underline">{link.url}<ExternalLink size={10} className="shrink-0" /></a></div>)}
        </div>
      )}
    </section>
  );
}
