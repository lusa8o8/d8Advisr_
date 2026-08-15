import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarPlus, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Venue } from './adminListingModel';
import { useListingReferences, useRegion } from '@/hooks/useRegion';
import { AdminListingMediaEditor } from './AdminListingMediaEditor';
import { useAuth } from '@/context/AuthContext';
import { useSessionDraft } from '@workspace/d8-core/use-session-draft';
import {
  createAdminEvent,
  createAdminVenue,
  type AdminListingAttribution,
  type AdminPublicationStatus,
} from './adminListingCreationData';

interface Props {
  venues: Venue[];
  onVenueCreated: (id: string) => Promise<void> | void;
}

type ListingKind = 'venue' | 'event';
type EventLocation = 'd8_venue' | 'external' | 'undisclosed';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[13px] text-gray-900 outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F]';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function tags(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

export function VibePicker({ value, options, onChange }: {
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const selected = tags(value);
  return <div className="flex flex-wrap gap-2">{options.map(option => {
    const active = selected.includes(option.label);
    return <button key={option.id} type="button" onClick={() => onChange(
      (active ? selected.filter(item => item !== option.label) : [...selected, option.label]).join(', ')
    )} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${active ? 'border-[#FF5A5F] bg-[#FFF0F1] text-[#FF5A5F]' : 'border-gray-200 text-gray-600'}`}>
      {option.label}
    </button>;
  })}</div>;
}

export function AdminListingCreate({ venues, onVenueCreated }: Props) {
  const { user } = useAuth();
  const draftPrefix = `d8:admin-listing:${user?.id ?? 'anonymous'}`;
  const [kind, setKind, clearKind] = useSessionDraft<ListingKind>(`${draftPrefix}:kind`, 'venue');
  const [attribution, setAttribution, clearAttribution] = useSessionDraft<AdminListingAttribution>(`${draftPrefix}:attribution`, 'unclaimed');
  const [publicationStatus, setPublicationStatus, clearPublication] = useSessionDraft<AdminPublicationStatus>(`${draftPrefix}:publication`, 'draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const submissionInFlight = useRef(false);
  const requestKeys = useRef<Record<ListingKind, string | null>>({ venue: null, event: null });
  const [venue, setVenue, clearVenue] = useSessionDraft(`${draftPrefix}:venue`, {
    name: '', city: 'Lusaka', category: '', area: '', address: '', description: '',
    tier: 'Verified' as 'Verified' | 'D8 Approved' | 'Hidden Gem',
    priceTier: '', averageCost: '', coverImage: '', images: [] as string[], vibes: '',
  });
  const [event, setEvent, clearEvent] = useSessionDraft(`${draftPrefix}:event`, {
    title: '', city: 'Lusaka', category: '', description: '', startsAt: '', endsAt: '',
    locationKind: 'undisclosed' as EventLocation, venueId: '',
    externalLocationName: '', externalLocationAddress: '', price: '', currency: 'K',
    images: [] as string[],
    capacity: '', isFree: false, isFeatured: false, coverImage: '', vibes: '', emoji: '📅',
  });
  const { regions } = useRegion();
  const selectedCity = kind === 'venue' ? venue.city : event.city;
  const selectedRegion = regions.find(item => item.name === selectedCity || item.id === selectedCity);
  const references = useListingReferences(kind, selectedRegion?.id);

  const liveVenues = venues.filter(item => item.isActive && item.listingStatus === 'live');

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const requestKey = requestKeys.current[kind] ?? crypto.randomUUID();
      requestKeys.current[kind] = requestKey;
      let id: string;
      if (kind === 'venue') {
        id = await createAdminVenue({
          requestKey,
          name: venue.name, city: venue.city, category: venue.category,
          attribution, publicationStatus, area: venue.area, address: venue.address,
          description: venue.description, tier: venue.tier, priceTier: venue.priceTier,
          averageCostPerPerson: venue.averageCost ? Number(venue.averageCost) : undefined,
          coverImage: venue.coverImage, images: venue.images, vibes: tags(venue.vibes),
        });
        await onVenueCreated(id);
      } else {
        if (event.locationKind === 'd8_venue' && !event.venueId) throw new Error('Choose a live D8 venue.');
        if (event.locationKind === 'external' && !event.externalLocationName.trim()) throw new Error('Enter the external location name.');
        id = await createAdminEvent({
          requestKey,
          title: event.title, city: event.city, category: event.category,
          description: event.description, startsAt: new Date(event.startsAt).toISOString(),
          endsAt: event.endsAt ? new Date(event.endsAt).toISOString() : undefined,
          attribution, publicationStatus, locationKind: event.locationKind,
          venueId: event.venueId, externalLocationName: event.externalLocationName,
          externalLocationAddress: event.externalLocationAddress,
          pricePerPerson: event.price ? Number(event.price) : undefined,
          currency: event.currency, capacity: event.capacity ? Number(event.capacity) : undefined,
          isFree: event.isFree, isFeatured: event.isFeatured, coverImage: event.coverImage, images: event.images,
          vibes: tags(event.vibes), emoji: event.emoji,
        });
      }
      requestKeys.current[kind] = null;
      if (kind === 'venue') {
        clearVenue();
        setVenue(current => ({ ...current, name: '', category: '', area: '', address: '', description: '', priceTier: '', averageCost: '', coverImage: '', images: [], vibes: '' }));
      } else {
        clearEvent();
        setEvent(current => ({ ...current, title: '', category: '', description: '', startsAt: '', endsAt: '', venueId: '', externalLocationName: '', externalLocationAddress: '', price: '', capacity: '', coverImage: '', images: [], vibes: '' }));
      }
      clearKind();
      clearAttribution();
      clearPublication();
      setSuccess(`${kind === 'venue' ? 'Venue' : 'Event'} created · ${id.slice(0, 8)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the listing.');
    } finally {
      submissionInFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 no-scrollbar">
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FFF0F1] text-[#FF5A5F]"><CalendarPlus size={19} /></div>
            <div><h1 className="text-[17px] font-black text-gray-900">Create a listing</h1><p className="text-[12px] text-gray-500">No partner account is created or assigned.</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {(['venue', 'event'] as ListingKind[]).map(option => (
              <button key={option} type="button" onClick={() => { setKind(option); setError(null); setSuccess(null); }}
                className={`rounded-lg px-3 py-2 text-[12px] font-bold capitalize ${kind === option ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {option}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2"><ShieldCheck size={16} className="text-[#FF5A5F]" /><h2 className="text-[13px] font-black">Ownership and publication</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Attribution"><select className={inputClass} value={attribution} onChange={e => setAttribution(e.target.value as AdminListingAttribution)}><option value="unclaimed">Unclaimed listing</option><option value="d8advisr">Operated by D8Advisr</option></select></Field>
            {kind === 'venue' ? (
              <Field label="Publication"><div className={`${inputClass} bg-gray-50 text-gray-600`}>Draft - approval required</div></Field>
            ) : (
              <Field label="Publication"><select className={inputClass} value={publicationStatus} onChange={e => setPublicationStatus(e.target.value as AdminPublicationStatus)}><option value="draft">Save as draft</option><option value="live">Publish now</option></select></Field>
            )}
          </div>
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            {attribution === 'unclaimed' ? 'No user or organization owns this listing.' : 'D8Advisr is the operator or organiser.'}
            {' '}{kind === 'venue' ? 'It stays private until approved in Submissions.' : publicationStatus === 'draft' ? 'It stays private.' : 'It becomes public immediately.'}
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-[13px] font-black">{kind === 'venue' ? 'Venue details' : 'Event details'}</h2>
          {kind === 'venue' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Venue name"><input required className={inputClass} value={venue.name} onChange={e => setVenue(v => ({ ...v, name: e.target.value }))} /></Field>
                <Field label="Region"><select required className={inputClass} value={venue.city} onChange={e => setVenue(v => ({ ...v, city: e.target.value, area: '' }))}>{regions.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
                <Field label="Category"><select required className={inputClass} value={venue.category} onChange={e => setVenue(v => ({ ...v, category: e.target.value }))}><option value="">Choose category</option>{references.categories.map(item => <option key={item.id} value={item.label}>{item.label}</option>)}</select></Field>
                <Field label="Area"><><input list="admin-region-areas" className={inputClass} value={venue.area} onChange={e => setVenue(v => ({ ...v, area: e.target.value }))} /><datalist id="admin-region-areas">{references.areas.map(item => <option key={item.id} value={item.name} />)}</datalist><span className="mt-1 block text-[10px] text-gray-400">Choose a reviewed area or type a manual fallback.</span></></Field>
              </div>
              <Field label="Address"><input className={inputClass} value={venue.address} onChange={e => setVenue(v => ({ ...v, address: e.target.value }))} /></Field>
              <Field label="Description"><textarea className={`${inputClass} min-h-24`} value={venue.description} onChange={e => setVenue(v => ({ ...v, description: e.target.value }))} /></Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Tier"><select className={inputClass} value={venue.tier} onChange={e => setVenue(v => ({ ...v, tier: e.target.value as typeof venue.tier }))}><option>Verified</option><option>D8 Approved</option><option>Hidden Gem</option></select></Field>
                <Field label="Price level"><select className={inputClass} value={venue.priceTier} onChange={e => setVenue(v => ({ ...v, priceTier: e.target.value }))}><option value="">Not set</option><option value="$">1 · Budget</option><option value="$$">2 · Moderate</option><option value="$$$">3 · Premium</option><option value="$$$$">4 · Luxury</option></select></Field>
                <Field label="Average cost"><input min="0" type="number" className={inputClass} value={venue.averageCost} onChange={e => setVenue(v => ({ ...v, averageCost: e.target.value }))} /></Field>
              </div>
              <Field label="Venue images"><AdminListingMediaEditor images={venue.images} onChange={images => setVenue(v => ({ ...v, images, coverImage: images[0] ?? '' }))} /></Field>
              <Field label="Vibes"><VibePicker value={venue.vibes} options={references.vibes} onChange={vibes => setVenue(v => ({ ...v, vibes }))} /></Field>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Event title"><input required className={inputClass} value={event.title} onChange={e => setEvent(v => ({ ...v, title: e.target.value }))} /></Field>
                <Field label="Region"><select required className={inputClass} value={event.city} onChange={e => setEvent(v => ({ ...v, city: e.target.value }))}>{regions.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
                <Field label="Category"><select required className={inputClass} value={event.category} onChange={e => setEvent(v => ({ ...v, category: e.target.value }))}><option value="">Choose category</option>{references.categories.map(item => <option key={item.id} value={item.label}>{item.label}</option>)}</select></Field>
                <Field label="Emoji"><input className={inputClass} value={event.emoji} onChange={e => setEvent(v => ({ ...v, emoji: e.target.value }))} /></Field>
                <Field label="Starts"><input required type="datetime-local" className={inputClass} value={event.startsAt} onChange={e => setEvent(v => ({ ...v, startsAt: e.target.value }))} /></Field>
                <Field label="Ends"><input type="datetime-local" className={inputClass} value={event.endsAt} onChange={e => setEvent(v => ({ ...v, endsAt: e.target.value }))} /></Field>
              </div>
              <Field label="Description"><textarea className={`${inputClass} min-h-24`} value={event.description} onChange={e => setEvent(v => ({ ...v, description: e.target.value }))} /></Field>
              <Field label="Location"><select className={inputClass} value={event.locationKind} onChange={e => setEvent(v => ({ ...v, locationKind: e.target.value as EventLocation }))}><option value="undisclosed">Undisclosed</option><option value="d8_venue">Existing live D8 venue</option><option value="external">External location</option></select></Field>
              {event.locationKind === 'd8_venue' && <Field label="Venue"><select required className={inputClass} value={event.venueId} onChange={e => setEvent(v => ({ ...v, venueId: e.target.value }))}><option value="">Choose venue</option>{liveVenues.map(item => <option key={item.id} value={item.id}>{item.name} — {item.city}</option>)}</select></Field>}
              {event.locationKind === 'external' && <div className="grid gap-3 sm:grid-cols-2"><Field label="Location name"><input required className={inputClass} value={event.externalLocationName} onChange={e => setEvent(v => ({ ...v, externalLocationName: e.target.value }))} /></Field><Field label="Location address"><input className={inputClass} value={event.externalLocationAddress} onChange={e => setEvent(v => ({ ...v, externalLocationAddress: e.target.value }))} /></Field></div>}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Entry price / person"><input min="0" disabled={event.isFree} type="number" className={inputClass} value={event.price} onChange={e => setEvent(v => ({ ...v, price: e.target.value }))} /></Field>
                <Field label="Currency"><div className={`${inputClass} bg-gray-50 text-gray-600`}>{selectedRegion?.currency_code ?? 'Choose region'}</div></Field>
                <Field label="Maximum attendance"><input min="0" step="1" type="number" className={inputClass} value={event.capacity} onChange={e => setEvent(v => ({ ...v, capacity: e.target.value }))} /></Field>
              </div>
              <div className="flex gap-5 text-[12px] font-semibold"><label className="flex items-center gap-2"><input type="checkbox" checked={event.isFree} onChange={e => setEvent(v => ({ ...v, isFree: e.target.checked, price: e.target.checked ? '' : v.price }))} />Free entry</label><label className="flex items-center gap-2"><input type="checkbox" checked={event.isFeatured} onChange={e => setEvent(v => ({ ...v, isFeatured: e.target.checked }))} />Featured</label></div>
              <Field label="Event images"><AdminListingMediaEditor scope="events" images={event.images} onChange={images => setEvent(v => ({ ...v, images, coverImage: images[0] ?? '' }))} /></Field>
              <Field label="Vibes"><VibePicker value={event.vibes} options={references.vibes} onChange={vibes => setEvent(v => ({ ...v, vibes }))} /></Field>
            </>
          )}
        </section>

        {error && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-[12px] font-semibold text-red-700">{error}</div>}
        {success && <div className="flex items-center justify-between gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-[12px] font-semibold text-green-700"><span className="flex items-center gap-2"><CheckCircle2 size={16} />{success}</span><button type="button" className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black text-green-700" onClick={() => setSuccess(null)}>Create another</button></div>}
        <button disabled={saving || Boolean(success)} className="w-full rounded-xl bg-[#FF5A5F] px-4 py-3.5 text-[13px] font-black text-white disabled:opacity-60">
          {saving ? 'Creating…' : kind === 'venue' ? 'Create venue draft' : publicationStatus === 'live' ? 'Create and publish event' : 'Create event draft'}
        </button>
      </form>
    </div>
  );
}
