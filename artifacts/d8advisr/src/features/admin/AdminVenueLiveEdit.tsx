import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Save, ShieldCheck, X, XCircle } from 'lucide-react';
import { reviewAdminLiveVenueRevision, submitAdminLiveVenueRevision } from './adminListingData';
import type { Venue, VenueLiveRevision } from './adminListingModel';
import { useListingReferences, useRegion } from '@/hooks/useRegion';
import { VibePicker } from './AdminListingCreate';
import { AdminListingMediaEditor } from './AdminListingMediaEditor';

interface Props {
  venue: Venue;
  pendingRevision: VenueLiveRevision | null;
  onCancel: () => void;
  onChanged: () => Promise<void> | void;
}

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[13px] text-gray-900 outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F]';
const tags = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
const PRICE_LABELS: Record<string, string> = {
  '$': '1 - Budget',
  '$$': '2 - Moderate',
  '$$$': '3 - Premium',
  '$$$$': '4 - Luxury',
};
const displayValue = (field: string, value: unknown) => {
  if (field === 'price_tier' && typeof value === 'string') return PRICE_LABELS[value] ?? value;
  if (field === 'avg_cost_pp' && value !== null && value !== undefined) return `${value} per person`;
  return Array.isArray(value) ? value.join(', ') : value === null || value === undefined || value === '' ? 'Not provided' : String(value);
};
const fieldLabel = (field: string) => ({ price_tier: 'Price level', avg_cost_pp: 'Average cost / person', cover_image: 'Cover image', images: 'Gallery images', contact_phone: 'Phone / WhatsApp', website_url: 'Website', name: 'Name', city: 'City', category: 'Category', area: 'Area', address: 'Address', vibes: 'Vibes' }[field] ?? field.replaceAll('_', ' '));

function initialDraft(venue: Venue) {
  return {
    name: venue.name, city: venue.city, category: venue.category, area: venue.area ?? '',
    address: venue.address ?? '', description: venue.description ?? '', priceTier: venue.priceTier ?? '',
    averageCost: venue.averageCostPerPerson?.toString() ?? '', coverImage: venue.coverImage ?? '',
    images: venue.photos,
    vibes: venue.vibes.join(', '),
  };
}

export function AdminVenueLiveEdit({ venue, pendingRevision, onCancel, onChanged }: Props) {
  const [draft, setDraft] = useState(() => initialDraft(venue));
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState<'approved' | 'rejected' | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { regions } = useRegion();
  const selectedRegion = regions.find(item => item.name === draft.city || item.id === draft.city);
  const references = useListingReferences('venue', selectedRegion?.id);

  useEffect(() => setDraft(initialDraft(venue)), [venue]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return; setSaving(true); setError(null);
    try {
      await submitAdminLiveVenueRevision(venue.id, venue.updatedAt, {
        name: draft.name, city: draft.city, category: draft.category, area: draft.area,
        address: draft.address, description: draft.description, priceTier: draft.priceTier,
        averageCostPerPerson: draft.averageCost ? Number(draft.averageCost) : undefined,
        coverImage: draft.coverImage, images: draft.images, vibes: tags(draft.vibes),
      });
      await onChanged();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not submit the live venue edit.'); }
    finally { setSaving(false); }
  };

  const review = async (decision: 'approved' | 'rejected') => {
    if (!pendingRevision || reviewing) return; setReviewing(decision); setError(null);
    try { await reviewAdminLiveVenueRevision(pendingRevision.id, decision, note, pendingRevision.revisionSource); await onChanged(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not review the live venue revision.'); }
    finally { setReviewing(null); }
  };

  if (pendingRevision) {
    return (
      <section className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 text-amber-600" /><div><h3 className="text-[14px] font-black text-gray-900">{pendingRevision.revisionSource === 'partner' ? 'Partner revision awaiting review' : 'High-risk revision awaiting review'}</h3><p className="mt-1 text-[11px] text-gray-500">The current public venue is unchanged until this proposal is approved.</p></div></div>
        <div className="space-y-2">
          {Object.keys(pendingRevision.proposedValues).sort().map(field => (
            <div key={field} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{fieldLabel(field)}</p>
              {field === 'images' && Array.isArray(pendingRevision.proposedValues[field]) ? (
                <div className="mt-2">
                  <p className="mb-2 text-[9px] font-bold uppercase text-amber-600">Proposed - {pendingRevision.proposedValues[field].length} images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(pendingRevision.proposedValues[field] as string[]).map((url, index) => (
                      <img key={url} src={url} alt={`Proposed venue photo ${index + 1}`} className="aspect-square w-full rounded-lg border border-gray-200 object-cover" />
                    ))}
                  </div>
                </div>
              ) : field === 'cover_image' && typeof pendingRevision.proposedValues[field] === 'string' ? (
                <div className="mt-2">
                  <p className="mb-2 text-[9px] font-bold uppercase text-amber-600">Proposed cover</p>
                  <img src={pendingRevision.proposedValues[field] as string} alt="Proposed venue cover" className="h-36 w-full rounded-lg border border-gray-200 object-cover" />
                </div>
              ) : (
                <div className="mt-1 grid grid-cols-2 gap-2 text-[12px]"><div><span className="text-[9px] font-bold uppercase text-gray-400">Current</span><p className="break-words text-gray-600">{displayValue(field, pendingRevision.previousValues[field])}</p></div><div><span className="text-[9px] font-bold uppercase text-amber-600">Proposed</span><p className="break-words font-semibold text-gray-900">{displayValue(field, pendingRevision.proposedValues[field])}</p></div></div>
              )}
            </div>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {pendingRevision.revisionSource === 'partner' ? 'Partner-visible decision note' : 'Review note'}
          </span>
          <textarea className={`${inputClass} min-h-20 resize-y`} value={note} onChange={e => setNote(e.target.value)} />
          {pendingRevision.revisionSource === 'partner' && (
            <span className="mt-1 block text-[10px] font-semibold text-amber-600">This note will appear in the partner inbox.</span>
          )}
        </label>
        {error && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{error}</div>}
        <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={Boolean(reviewing)} onClick={() => void review('rejected')} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 py-3 text-[12px] font-bold text-red-600 disabled:opacity-50"><XCircle size={14} />{reviewing === 'rejected' ? 'Rejecting...' : 'Reject proposal'}</button><button type="button" disabled={Boolean(reviewing)} onClick={() => void review('approved')} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#00C851] py-3 text-[12px] font-bold text-white disabled:opacity-50"><CheckCircle2 size={14} />{reviewing === 'approved' ? 'Approving...' : 'Approve & apply'}</button></div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="mx-4 mt-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-[14px] font-black text-gray-900">Edit live venue</h3><p className="mt-1 text-[11px] text-gray-500">Description applies now. Other changes remain private until separately approved.</p></div><button type="button" onClick={onCancel} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500" aria-label="Cancel live venue editing"><X size={15} /></button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="mb-1 block text-[10px] font-bold uppercase text-amber-600">Name · review</span><input required maxLength={160} className={inputClass} value={draft.name} onChange={e => setDraft(v => ({ ...v, name: e.target.value }))} /></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase text-amber-600">Region · review</span><select required className={inputClass} value={draft.city} onChange={e => setDraft(v => ({ ...v, city: e.target.value, area: '' }))}>{regions.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase text-amber-600">Category · review</span><select required className={inputClass} value={draft.category} onChange={e => setDraft(v => ({ ...v, category: e.target.value }))}><option value="">Choose category</option>{references.categories.map(item => <option key={item.id} value={item.label}>{item.label}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] font-bold uppercase text-amber-600">Area · review</span><input list="live-region-areas" maxLength={160} className={inputClass} value={draft.area} onChange={e => setDraft(v => ({ ...v, area: e.target.value }))} /><datalist id="live-region-areas">{references.areas.map(item => <option key={item.id} value={item.name} />)}</datalist></label>
      </div>
      <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase text-amber-600">Address · review</span><input maxLength={500} className={inputClass} value={draft.address} onChange={e => setDraft(v => ({ ...v, address: e.target.value }))} /></label>
      <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase text-green-600">Description · applies immediately</span><textarea maxLength={5000} className={`${inputClass} min-h-24 resize-y`} value={draft.description} onChange={e => setDraft(v => ({ ...v, description: e.target.value }))} /></label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-[10px] font-bold uppercase text-amber-600">Price level · review</span><select className={inputClass} value={draft.priceTier} onChange={e => setDraft(v => ({ ...v, priceTier: e.target.value }))}><option value="">Not set</option><option value="$">1 · Budget</option><option value="$$">2 · Moderate</option><option value="$$$">3 · Premium</option><option value="$$$$">4 · Luxury</option></select></label><label><span className="mb-1 block text-[10px] font-bold uppercase text-amber-600">Average cost · review</span><input min="0" step="1" type="number" className={inputClass} value={draft.averageCost} onChange={e => setDraft(v => ({ ...v, averageCost: e.target.value }))} /></label></div>
      <div className="mt-3"><span className="mb-2 block text-[10px] font-bold uppercase text-amber-600">Venue images · review</span><AdminListingMediaEditor review images={draft.images} onChange={images => setDraft(v => ({ ...v, images, coverImage: images[0] ?? '' }))} /></div>
      <label className="mt-3 block"><span className="mb-2 block text-[10px] font-bold uppercase text-amber-600">Vibes · review</span><VibePicker value={draft.vibes} options={references.vibes} onChange={vibes => setDraft(v => ({ ...v, vibes }))} /></label>
      {error && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{error}</div>}
      <button disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#141414] px-4 py-3 text-[13px] font-black text-white disabled:opacity-60"><Save size={15} />{saving ? 'Submitting changes...' : 'Apply safe changes & submit review'}</button>
    </form>
  );
}
