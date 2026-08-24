import { useEffect, useState, type FormEvent } from 'react';
import { Save, X } from 'lucide-react';
import { updateAdminDraftEvent } from './adminListingData';
import type { AdminEvent } from './adminListingModel';
import { useListingReferences, useRegion } from '@/hooks/useRegion';
import { VibePicker } from './AdminListingCreate';
import { AdminListingMediaEditor } from './AdminListingMediaEditor';
import { EVENT_EMOJI_OPTIONS } from '@workspace/d8-core/event-policy';

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

function initialDraft(event: AdminEvent) {
  return {
    title: event.title,
    regionId: event.regionId,
    city: event.city,
    category: event.category ?? '',
    description: event.description ?? '',
    startsAt: event.startsAt ? event.startsAt.slice(0, 16) : '',
    endsAt: event.endsAt ? event.endsAt.slice(0, 16) : '',
    locationKind: event.eventLocationKind,
    venueId: event.venueId ?? '',
    externalLocationName: event.externalLocationName ?? '',
    externalLocationAddress: event.externalLocationAddress ?? '',
    price: event.pricePerPerson?.toString() ?? '',
    currency: event.currency,
    capacity: event.capacity?.toString() ?? '',
    isFree: event.isFree,
    isFeatured: event.isFeatured,
    coverImage: event.coverImage ?? '',
    images: event.images,
    vibes: event.vibes.join(', '),
    emoji: event.emoji,
    frequency: 'one-off'
  };
}

export function AdminEventDraftEdit({ event, onCancel, onSaved }: Props) {
  const [draft, setDraft] = useState(() => initialDraft(event));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { regions } = useRegion();
  const selectedRegion = regions.find(item => item.id === draft.regionId);
  const references = useListingReferences('event', selectedRegion?.id);

  useEffect(() => setDraft(initialDraft(event)), [event]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      await updateAdminDraftEvent(event.id, {
        title: draft.title.trim(),
        region_id: draft.regionId,
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
        currency: selectedRegion?.currency_code ?? draft.currency,
        capacity: draft.capacity ? Number(draft.capacity) : null,
        is_free: draft.isFree,
        is_featured: draft.isFeatured,
        cover_image: draft.coverImage?.trim() || null,
        images: draft.images ?? [],
        vibes: tags(draft.vibes),
        emoji: draft.emoji?.trim() || '✨',
        frequency: 'one-off',
      }, event.updatedAt);
      await onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the event draft.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-4 mt-4 rounded-2xl border border-[#FF5A5F]/20 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-black text-gray-900">Correct event draft</h3>
          <p className="mt-1 text-[11px] text-gray-500">Changes are audited. Status stays unchanged.</p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500" aria-label="Cancel editing"><X size={15} /></button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Title</span><input required maxLength={160} className={inputClass} value={draft.title} onChange={e => setDraft(c => ({ ...c, title: e.target.value }))} /></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Discovery market</span><select required className={inputClass} value={draft.regionId} onChange={e => setDraft(c => ({ ...c, regionId: e.target.value }))}>{regions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Physical city / locality</span><input required className={inputClass} value={draft.city} onChange={e => setDraft(c => ({ ...c, city: e.target.value }))} /></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Category</span><select required className={inputClass} value={draft.category} onChange={e => setDraft(c => ({ ...c, category: e.target.value }))}><option value="">Choose category</option>{references.categories.map(item => <option key={item.label} value={item.label}>{item.label}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Event icon</span><div className="flex flex-wrap gap-2">{EVENT_EMOJI_OPTIONS.map(icon => <button key={icon} type="button" aria-label={`Use ${icon} as event icon`} onClick={() => setDraft(c => ({ ...c, emoji: icon }))} className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition ${draft.emoji === icon ? 'bg-[#FFF0F1] ring-2 ring-[#FF5A5F]' : 'bg-gray-50 hover:bg-gray-100'}`}>{icon}</button>)}</div></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Starts</span><input required type="datetime-local" className={inputClass} value={draft.startsAt} onChange={e => setDraft(c => ({ ...c, startsAt: e.target.value }))} /></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Ends</span><input type="datetime-local" className={inputClass} value={draft.endsAt} onChange={e => setDraft(c => ({ ...c, endsAt: e.target.value }))} /></label>
      </div>

      <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Description</span><textarea maxLength={5000} className={`${inputClass} min-h-24 resize-y`} value={draft.description} onChange={e => setDraft(c => ({ ...c, description: e.target.value }))} /></label>
      
      <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Location</span><select className={inputClass} value={draft.locationKind} onChange={e => setDraft(c => ({ ...c, locationKind: e.target.value as EventLocation }))}><option value="undisclosed">Undisclosed</option><option value="d8_venue">Existing live D8 venue</option><option value="external">External location</option></select></label>
      {draft.locationKind === 'd8_venue' && <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Venue ID</span><input required className={inputClass} value={draft.venueId} onChange={e => setDraft(c => ({ ...c, venueId: e.target.value }))} /></label>}
      {draft.locationKind === 'external' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Location name</span><input required className={inputClass} value={draft.externalLocationName} onChange={e => setDraft(c => ({ ...c, externalLocationName: e.target.value }))} /></label><label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Location address</span><input className={inputClass} value={draft.externalLocationAddress} onChange={e => setDraft(c => ({ ...c, externalLocationAddress: e.target.value }))} /></label></div>}

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Entry price</span><input min="0.01" step="0.01" type="number" disabled={draft.isFree} className={inputClass} value={draft.price} onChange={e => setDraft(c => ({ ...c, price: e.target.value }))} /></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Currency</span><div className={`${inputClass} bg-gray-50 text-gray-600`}>{selectedRegion?.currency_code ?? draft.currency ?? 'ZMW'}</div></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Attendance limit</span><input min="1" step="1" type="number" placeholder="Leave blank for open attendance" className={inputClass} value={draft.capacity} onChange={e => setDraft(c => ({ ...c, capacity: e.target.value }))} /></label>
      </div>

      <div className="mt-3 flex gap-5 text-[12px] font-semibold">
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isFree} onChange={e => setDraft(c => ({ ...c, isFree: e.target.checked, price: e.target.checked ? '' : c.price }))} />Free entry</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isFeatured} onChange={e => setDraft(c => ({ ...c, isFeatured: e.target.checked }))} />Featured</label>
      </div>

      <div className="mt-3"><span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Event images</span><AdminListingMediaEditor scope="events" images={draft.images} onChange={images => setDraft(c => ({ ...c, images, coverImage: images[0] ?? '' }))} /></div>
      <label className="mt-3 block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Vibes</span><VibePicker value={draft.vibes} options={references.vibes} onChange={vibes => setDraft(c => ({ ...c, vibes }))} /></label>

      {error && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{error}</div>}
      <button disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A5F] px-4 py-3 text-[13px] font-black text-white disabled:opacity-60"><Save size={15} />{saving ? 'Saving correction...' : 'Save draft correction'}</button>
    </form>
  );
}
