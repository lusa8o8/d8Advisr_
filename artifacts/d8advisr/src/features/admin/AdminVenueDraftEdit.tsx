import { useEffect, useState, type FormEvent } from 'react';
import { Save, X } from 'lucide-react';
import { updateAdminDraftVenue } from './adminListingData';
import type { Venue } from './adminListingModel';
import { useListingReferences, useRegion } from '@/hooks/useRegion';
import { VibePicker } from './AdminListingCreate';
import { AdminListingMediaEditor } from './AdminListingMediaEditor';

interface Props {
  venue: Venue;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[13px] text-gray-900 outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F]';

function tags(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function initialDraft(venue: Venue) {
  return {
    name: venue.name,
    regionId: venue.regionId,
    city: venue.city,
    category: venue.category,
    area: venue.area ?? '',
    address: venue.address ?? '',
    description: venue.description ?? '',
    priceTier: venue.priceTier ?? '',
    averageCost: venue.averageCostPerPerson?.toString() ?? '',
    coverImage: venue.coverImage ?? '',
    images: venue.photos,
    vibes: venue.vibes.join(', '),
  };
}

export function AdminVenueDraftEdit({ venue, onCancel, onSaved }: Props) {
  const [draft, setDraft] = useState(() => initialDraft(venue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { regions } = useRegion();
  const selectedRegion = regions.find(item => item.id === draft.regionId);
  const references = useListingReferences('venue', selectedRegion?.id);

  useEffect(() => setDraft(initialDraft(venue)), [venue]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      await updateAdminDraftVenue(venue.id, venue.updatedAt, {
        name: draft.name,
        regionId: draft.regionId,
        city: draft.city,
        category: draft.category,
        area: draft.area,
        address: draft.address,
        description: draft.description,
        priceTier: draft.priceTier,
        averageCostPerPerson: draft.averageCost ? Number(draft.averageCost) : undefined,
        coverImage: draft.coverImage,
        images: draft.images,
        vibes: tags(draft.vibes),
      });
      await onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the venue draft.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-4 mt-4 rounded-2xl border border-[#FF5A5F]/20 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-black text-gray-900">Correct venue draft</h3>
          <p className="mt-1 text-[11px] text-gray-500">Changes are audited. Approval, ownership, tier, and verification stay unchanged.</p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500" aria-label="Cancel venue editing"><X size={15} /></button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Name</span><input required maxLength={160} className={inputClass} value={draft.name} onChange={e => setDraft(current => ({ ...current, name: e.target.value }))} /></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Discovery market</span><select required className={inputClass} value={draft.regionId} onChange={e => setDraft(current => ({ ...current, regionId: e.target.value, area: '' }))}>{regions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Physical city / locality</span><input required maxLength={120} className={inputClass} value={draft.city} onChange={e => setDraft(current => ({ ...current, city: e.target.value }))} /></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Category</span><select required className={inputClass} value={draft.category} onChange={e => setDraft(current => ({ ...current, category: e.target.value }))}><option value="">Choose category</option>{references.categories.map(item => <option key={item.id} value={item.label}>{item.label}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Area</span><input list="draft-region-areas" maxLength={160} className={inputClass} value={draft.area} onChange={e => setDraft(current => ({ ...current, area: e.target.value }))} /><datalist id="draft-region-areas">{references.areas.map(item => <option key={item.id} value={item.name} />)}</datalist></label>
      </div>
      <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Address</span><input maxLength={500} className={inputClass} value={draft.address} onChange={e => setDraft(current => ({ ...current, address: e.target.value }))} /></label>
      <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Description</span><textarea maxLength={5000} className={`${inputClass} min-h-24 resize-y`} value={draft.description} onChange={e => setDraft(current => ({ ...current, description: e.target.value }))} /></label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Price level</span><select className={inputClass} value={draft.priceTier} onChange={e => setDraft(current => ({ ...current, priceTier: e.target.value }))}><option value="">Not set</option><option value="$">1 · Budget</option><option value="$$">2 · Moderate</option><option value="$$$">3 · Premium</option><option value="$$$$">4 · Luxury</option></select></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Average cost / person</span><input min="0" step="1" type="number" className={inputClass} value={draft.averageCost} onChange={e => setDraft(current => ({ ...current, averageCost: e.target.value }))} /></label>
      </div>
      <div className="mt-3"><span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Venue images</span><AdminListingMediaEditor images={draft.images} onChange={images => setDraft(current => ({ ...current, images, coverImage: images[0] ?? '' }))} /></div>
      <label className="mt-3 block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Vibes</span><VibePicker value={draft.vibes} options={references.vibes} onChange={vibes => setDraft(current => ({ ...current, vibes }))} /></label>

      {error && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{error}</div>}
      <button disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A5F] px-4 py-3 text-[13px] font-black text-white disabled:opacity-60"><Save size={15} />{saving ? 'Saving correction...' : 'Save draft correction'}</button>
    </form>
  );
}
