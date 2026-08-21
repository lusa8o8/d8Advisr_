import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, AlertTriangle, Ban, Lock, Save, ShieldCheck, X } from 'lucide-react';
import { cancelAdminEvent, updateAdminLiveEvent, type AdminEventPolicyResult } from './adminListingData';
import type { AdminEvent } from './adminListingModel';
import { useListingReferences, useRegion } from '@/hooks/useRegion';
import { VibePicker } from './AdminListingCreate';
import { AdminListingMediaEditor } from './AdminListingMediaEditor';
import { alignEventEndWithStart, EVENT_EMOJI_OPTIONS, EVENT_PUBLISHING_POLICY_PATH, EVENT_PUBLISHING_POLICY_VERSION, toDateTimeLocalInput } from '@workspace/d8-core/event-policy';

interface Props {
  event: AdminEvent;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}

type EventLocation = 'd8_venue' | 'external' | 'undisclosed';
const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[13px] text-gray-900 outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F]';

function tags(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

const materialFieldLabels: Record<string, string> = {
  city: 'Region', starts_at: 'Start date or time', ends_at: 'End date or time',
  event_location_kind: 'Location type', venue_id: 'D8 venue',
  external_location_name: 'Location name', external_location_address: 'Location address',
  is_free: 'Free or paid entry', price_pp: 'Entry price', capacity: 'Attendance limit',
};

function revisionValue(field: string, value: unknown, currency: string) {
  if (field === 'capacity') return value == null || value === 0 ? 'Open attendance' : String(value);
  if (value == null || value === '') return 'Not set';
  if (field === 'is_free' && typeof value === 'boolean') return value ? 'Free entry' : 'Paid entry';
  if (field === 'price_pp') return `${currency} ${value}`;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function initialDraft(event: AdminEvent) {
  return {
    title: event.title,
    city: event.city,
    category: event.category ?? '',
    description: event.description ?? '',
    startsAt: toDateTimeLocalInput(event.startsAt),
    endsAt: toDateTimeLocalInput(event.endsAt),
    locationKind: event.eventLocationKind,
    venueId: event.venueId ?? '',
    externalLocationName: event.externalLocationName ?? '',
    externalLocationAddress: event.externalLocationAddress ?? '',
    price: event.pricePerPerson != null ? String(event.pricePerPerson) : '',
    capacity: event.capacity != null ? String(event.capacity) : '',
    isFree: event.isFree,
    isFeatured: event.isFeatured,
    coverImage: event.coverImage ?? '',
    images: event.images,
    vibes: event.vibes.join(', '),
    emoji: event.emoji,
  };
}

export function AdminEventLiveEdit({ event, onCancel, onSaved }: Props) {
  const [draft, setDraft] = useState(() => initialDraft(event));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materialPreview, setMaterialPreview] = useState<AdminEventPolicyResult | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [materialAccepted, setMaterialAccepted] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [cancellationPreview, setCancellationPreview] = useState<AdminEventPolicyResult | null>(null);
  const [cancellationAccepted, setCancellationAccepted] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const { regions } = useRegion();
  const selectedRegion = regions.find(item => item.name === draft.city || item.id === draft.city);
  const references = useListingReferences('event', selectedRegion?.id);

  useEffect(() => setDraft(initialDraft(event)), [event]);

  const buildPayload = (): Record<string, unknown> => ({
    title: draft.title.trim(), city: draft.city.trim(),
    category: draft.category.trim() || null, description: draft.description.trim() || null,
    starts_at: new Date(draft.startsAt).toISOString(),
    ends_at: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    event_location_kind: draft.locationKind,
    venue_id: draft.locationKind === 'd8_venue' ? (draft.venueId.trim() || null) : null,
    external_location_name: draft.locationKind === 'external' ? (draft.externalLocationName.trim() || null) : null,
    external_location_address: draft.locationKind === 'external' ? (draft.externalLocationAddress.trim() || null) : null,
    price_pp: draft.isFree ? 0 : Number(draft.price),
    capacity: draft.capacity ? Number(draft.capacity) : null,
    is_free: draft.isFree, is_featured: draft.isFeatured,
    cover_image: draft.coverImage?.trim() || null, images: draft.images ?? [],
    vibes: tags(draft.vibes), emoji: draft.emoji?.trim() || '✨',
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      const result = await updateAdminLiveEvent(
        event.id,
        {
          title: draft.title.trim(),
          city: draft.city.trim(),
          category: draft.category.trim() || null,
          description: draft.description.trim() || null,
          starts_at: new Date(draft.startsAt).toISOString(),
          ends_at: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
          event_location_kind: draft.locationKind,
          venue_id: draft.locationKind === 'd8_venue' ? (draft.venueId.trim() || null) : null,
          external_location_name: draft.locationKind === 'external' ? (draft.externalLocationName.trim() || null) : null,
          external_location_address: draft.locationKind === 'external' ? (draft.externalLocationAddress.trim() || null) : null,
          price_pp: draft.isFree ? 0 : Number(draft.price) || 0,
          capacity: draft.capacity ? Number(draft.capacity) : null,
          is_free: draft.isFree,
          is_featured: draft.isFeatured,
          cover_image: draft.coverImage?.trim() || null,
          images: draft.images ?? [],
          vibes: tags(draft.vibes),
          emoji: draft.emoji?.trim() || '✨',
        },
        event.updatedAt,
        false,
      );
      if (result.status === 'confirmation_required') {
        setPendingPayload(buildPayload());
        setMaterialPreview(result);
        setMaterialAccepted(false);
        setChangeReason('');
        return;
      }
      await onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the live event.');
    } finally {
      setSaving(false);
    }
  };

  const confirmMaterialChanges = async () => {
    if (!pendingPayload || !materialAccepted || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateAdminLiveEvent(event.id, pendingPayload, event.updatedAt, true, changeReason);
      setPendingPayload(null);
      setMaterialPreview(null);
      await onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the live event.');
    } finally {
      setSaving(false);
    }
  };

  const requestCancellation = async (confirmed: boolean) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await cancelAdminEvent(event.id, event.updatedAt, confirmed, confirmed ? cancellationReason : undefined);
      if (result.status === 'confirmation_required') {
        setCancellationPreview(result);
        setCancellationAccepted(false);
        setCancellationReason('');
        return;
      }
      setCancellationPreview(null);
      await onSaved();
      onCancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not cancel the event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-4 mt-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600" />
            <h3 className="text-[14px] font-black text-gray-900">Edit live event</h3>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Changes take effect immediately on public discovery surfaces.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          aria-label="Cancel editing"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-blue-900 space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <AlertCircle size={13} className="text-blue-600" /> Commercial Policy Active
        </p>
        <p className="leading-relaxed">
          Material changes require confirmation, take effect immediately, remain in event history,
          and notify interested consumers. Policy v{EVENT_PUBLISHING_POLICY_VERSION} applies to D8 and partner publishers.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Title</span>
          <input
            required
            maxLength={160}
            className={inputClass}
            value={draft.title}
            onChange={e => setDraft(c => ({ ...c, title: e.target.value }))}
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Region</span>
          <select
            required
            className={inputClass}
            value={draft.city}
            onChange={e => setDraft(c => ({ ...c, city: e.target.value }))}
          >
            {regions.map(item => (
              <option key={item.id} value={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Category</span>
          <select
            required
            className={inputClass}
            value={draft.category}
            onChange={e => setDraft(c => ({ ...c, category: e.target.value }))}
          >
            <option value="">Choose category</option>
            {references.categories.map(item => (
              <option key={item.label} value={item.label}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Event icon</span>
          <div className="flex flex-wrap gap-2">
            {EVENT_EMOJI_OPTIONS.map(icon => (
              <button
                key={icon}
                type="button"
                aria-label={`Use ${icon} as event icon`}
                onClick={() => setDraft(c => ({ ...c, emoji: icon }))}
                className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition ${
                  draft.emoji === icon ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Starts</span>
          <input
            required
            type="datetime-local"
            className={inputClass}
            value={draft.startsAt}
            onChange={e => setDraft(c => ({ ...c, startsAt: e.target.value, endsAt: alignEventEndWithStart(c.startsAt, c.endsAt, e.target.value) }))}
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Ends</span>
          <input
            type="datetime-local"
            min={draft.startsAt || undefined}
            className={inputClass}
            value={draft.endsAt}
            onChange={e => setDraft(c => ({ ...c, endsAt: e.target.value }))}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Description</span>
        <textarea
          maxLength={5000}
          className={`${inputClass} min-h-24 resize-y`}
          value={draft.description}
          onChange={e => setDraft(c => ({ ...c, description: e.target.value }))}
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Location</span>
        <select
          className={inputClass}
          value={draft.locationKind}
          onChange={e => setDraft(c => ({ ...c, locationKind: e.target.value as EventLocation }))}
        >
          <option value="undisclosed">Undisclosed</option>
          <option value="d8_venue">Existing live D8 venue</option>
          <option value="external">External location</option>
        </select>
      </label>

      {draft.locationKind === 'd8_venue' && (
        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Venue ID</span>
          <input
            required
            className={inputClass}
            value={draft.venueId}
            onChange={e => setDraft(c => ({ ...c, venueId: e.target.value }))}
          />
        </label>
      )}

      {draft.locationKind === 'external' && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Location name</span>
            <input
              required
              className={inputClass}
              value={draft.externalLocationName}
              onChange={e => setDraft(c => ({ ...c, externalLocationName: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Location address</span>
            <input
              className={inputClass}
              value={draft.externalLocationAddress}
              onChange={e => setDraft(c => ({ ...c, externalLocationAddress: e.target.value }))}
            />
          </label>
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Entry price
          </span>
          <input
            min="0.01"
            step="0.01"
            type="number"
            disabled={draft.isFree}
            className={inputClass}
            value={draft.price}
            onChange={e => setDraft(c => ({ ...c, price: e.target.value }))}
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1">
            Currency <Lock size={10} className="text-gray-400" />
          </span>
          <div className={`${inputClass} bg-gray-50 text-gray-600 font-bold`}>
            {event.currency}
          </div>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Attendance limit</span>
          <input
            min="1"
            step="1"
            type="number"
            placeholder="Leave blank for open attendance"
            className={inputClass}
            value={draft.capacity}
            onChange={e => setDraft(c => ({ ...c, capacity: e.target.value }))}
          />
        </label>
      </div>

      <div className="mt-3 flex gap-5 text-[12px] font-semibold">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.isFree}
            onChange={e => setDraft(c => ({ ...c, isFree: e.target.checked, price: e.target.checked ? '' : c.price }))}
          />
          Free entry
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.isFeatured}
            onChange={e => setDraft(c => ({ ...c, isFeatured: e.target.checked }))}
          />
          Featured
        </label>
      </div>

      <div className="mt-3">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Event images</span>
        <AdminListingMediaEditor
          scope="events"
          images={draft.images}
          onChange={images => setDraft(c => ({ ...c, images, coverImage: images[0] ?? '' }))}
        />
      </div>

      <label className="mt-3 block">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Vibes</span>
        <VibePicker
          value={draft.vibes}
          options={references.vibes}
          onChange={vibes => setDraft(c => ({ ...c, vibes }))}
        />
      </label>

      {error && (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
          {error}
        </div>
      )}

      <button
        disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[13px] font-black text-white hover:bg-blue-700 active:scale-95 transition-transform disabled:opacity-60"
      >
        <Save size={15} />
        {saving ? 'Saving live changes...' : 'Save live event changes'}
      </button>

      <button type="button" disabled={saving} onClick={() => void requestCancellation(false)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-black text-red-700 hover:bg-red-100 disabled:opacity-60">
        <Ban size={15} /> Cancel event
      </button>

      {materialPreview?.status === 'confirmation_required' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><AlertTriangle size={20} /></div>
              <div><h2 className="text-[18px] font-black text-gray-900">Confirm material event changes</h2><p className="mt-1 text-[12px] text-gray-500">Policy version {EVENT_PUBLISHING_POLICY_VERSION}</p></div>
            </div>
            <p className="mt-4 text-[13px] leading-5 text-gray-600">These details may affect consumer plans. Confirmed changes go live immediately and remain in event history.</p>
            <div className="mt-4 space-y-2">
              {materialPreview.material_fields?.map(field => (
                <div key={field} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">{materialFieldLabels[field] ?? field.replaceAll('_', ' ')}</p>
                  <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[12px] text-gray-700">
                    <span className="break-words">{revisionValue(field, materialPreview.previous_values?.[field], event.currency)}</span><span className="text-gray-300">→</span><span className="break-words font-bold">{revisionValue(field, materialPreview.proposed_values?.[field], event.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-[12px] text-blue-800">
              {(materialPreview.interested_count ?? 0) > 0 ? `${materialPreview.interested_count} interested ${materialPreview.interested_count === 1 ? 'person' : 'people'} will be notified.` : 'No interested people need to be notified right now.'}
            </div>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-gray-500">Reason <span className="normal-case text-gray-400">(optional)</span><textarea value={changeReason} onChange={e => setChangeReason(e.target.value)} rows={3} placeholder="Add context for event history" className={`${inputClass} mt-1 resize-none normal-case`} /></label>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-4"><input type="checkbox" checked={materialAccepted} onChange={e => setMaterialAccepted(e.target.checked)} className="mt-1" /><span className="text-[12px] font-medium leading-5 text-gray-700">I confirm these changes are accurate and understand that interested people may be notified.</span></label>
            <a className="mt-3 inline-block text-[12px] font-bold text-[#FF5A5F] hover:underline" href={EVENT_PUBLISHING_POLICY_PATH} target="_blank" rel="noreferrer">Read the Event Publishing Policy</a>
            <div className="mt-5 flex gap-2"><button type="button" onClick={() => { setMaterialPreview(null); setPendingPayload(null); }} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-[13px] font-bold text-gray-600">Keep editing</button><button type="button" disabled={!materialAccepted || saving} onClick={() => void confirmMaterialChanges()} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40">{saving ? 'Applying…' : 'Confirm and apply'}</button></div>
          </div>
        </div>
      )}

      {cancellationPreview?.status === 'confirmation_required' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700"><Ban size={20} /></div><div><h2 className="text-[18px] font-black text-gray-900">Cancel this event?</h2><p className="mt-1 text-[12px] text-gray-500">This applies immediately.</p></div></div>
            <p className="mt-4 text-[13px] leading-5 text-gray-600">The event will be marked cancelled and {cancellationPreview.interested_count ?? 0} interested {(cancellationPreview.interested_count ?? 0) === 1 ? 'person' : 'people'} will be notified.</p>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-gray-500">Cancellation reason shown to consumers <span className="normal-case text-gray-400">(optional)</span><textarea value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} rows={3} className={`${inputClass} mt-1 resize-none normal-case`} /></label>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"><input type="checkbox" checked={cancellationAccepted} onChange={e => setCancellationAccepted(e.target.checked)} className="mt-1" /><span className="text-[12px] font-medium leading-5 text-red-800">I understand cancellation is immediate and interested consumers may be notified.</span></label>
            <div className="mt-5 flex gap-2"><button type="button" onClick={() => setCancellationPreview(null)} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-[13px] font-bold text-gray-600">Keep event live</button><button type="button" disabled={!cancellationAccepted || saving} onClick={() => void requestCancellation(true)} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40">{saving ? 'Cancelling…' : 'Confirm cancellation'}</button></div>
          </div>
        </div>
      )}
    </form>
  );
}
