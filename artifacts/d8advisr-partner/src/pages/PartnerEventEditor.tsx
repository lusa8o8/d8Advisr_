import { useEffect, useState, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, Check, Send, ImagePlus, Film, X, Play, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePartner } from '@/hooks/usePartner';
import { useListingReferences, useRegion } from '@workspace/d8-core/use-region';
import { isPartnerImageUrl, uploadPartnerImage, validatePartnerImage } from '@/lib/partnerMedia';
import { useAuth } from '@workspace/d8-core/auth';
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from '@workspace/d8-core/use-session-draft';
import {
  canPublishedPriceChange,
  EVENT_EMOJI_OPTIONS,
  EVENT_PUBLISHING_ACKNOWLEDGEMENT,
  EVENT_PUBLISHING_POLICY_PATH,
  EVENT_PUBLISHING_POLICY_VERSION,
  parseEventPriceInput,
} from '@workspace/d8-core/event-policy';

type Frequency = 'one-off' | 'weekly' | 'monthly' | 'annual';
type LocationChoice = 'owned_venue' | 'existing_venue' | 'external' | 'undisclosed';

interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  file?: File;
}

const FREQ_OPTIONS: { value: Frequency; label: string; desc: string }[] = [
  { value: 'one-off', label: 'One-off',   desc: 'Specific date, happens once' },
  { value: 'weekly',  label: 'Weekly',    desc: 'Repeats every week (e.g. jazz night)' },
  { value: 'monthly', label: 'Monthly',   desc: 'Repeats every month' },
  { value: 'annual',  label: 'Annual',    desc: 'Once a year (e.g. food market)' },
];

const CATEGORIES = [
  'Music & Live Performance', 'Dining Experience', 'Social & Mixer',
  'Fitness & Wellness', 'Faith-based', 'Sports', 'Market & Festival',
  'Workshop & Class', 'Comedy & Entertainment', 'Other',
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const INPUT = 'w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all';
const LABEL = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

const MAX_IMAGES = 3;

function localSchedule(startsAt?: string | null) {
  if (!startsAt) return { date: '', time: '' };
  const value = new Date(startsAt);
  if (Number.isNaN(value.getTime())) return { date: '', time: '' };
  const pad = (part: number) => String(part).padStart(2, '0');
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}

export function PartnerEventEditor() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const editId = params?.id;
  const { profile, saveEvent, events, venueOptions, loading } = usePartner();
  const { user } = useAuth();
  const { regions } = useRegion();
  const { categories, vibes: vibeOptions, isLoading: referencesLoading } = useListingReferences('event', profile?.city);
  const currencySymbol = regions.find(r => r.id === profile?.city)?.currency_symbol || 'K';

  const existing = editId ? events.find(e => e.id === editId) : null;
  const draftKey = `d8:partner-event:${user?.id ?? 'anonymous'}:${editId ?? 'new'}:v2`;
  const hydratedDraftRef = useRef<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [publicationRequestKey, setPublicationRequestKey] = useState<string | null>(null);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [frequency, setFrequency] = useState<Frequency>((existing?.frequency as Frequency) ?? 'weekly');
  const [weekday, setWeekday] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState(existing?.isFree ? '' : (existing?.price ?? ''));
  const [isFree, setIsFree] = useState(existing?.isFree ?? false);
  const [hasCapacity, setHasCapacity] = useState((existing?.spotsTotal ?? 0) > 0);
  const [capacity, setCapacity] = useState(existing?.spotsTotal ? String(existing.spotsTotal) : '');
  const [desc, setDesc] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [emoji, setEmoji] = useState(existing?.emoji ?? '📅');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [locationChoice, setLocationChoice] = useState<LocationChoice>(
    existing?.locationKind === 'd8_venue'
      ? 'existing_venue'
      : existing?.locationKind === 'external'
        ? 'external'
        : 'undisclosed'
  );
  const [venueId, setVenueId] = useState(existing?.venueId ?? '');
  const [externalLocationName, setExternalLocationName] = useState(existing?.externalLocationName ?? '');
  const [externalLocationAddress, setExternalLocationAddress] = useState(existing?.externalLocationAddress ?? '');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const images = media.filter(m => m.type === 'image');
  const video  = media.find(m => m.type === 'video');

  useEffect(() => {
    if (loading || referencesLoading || !profile || (editId && !existing) || hydratedDraftRef.current === draftKey) return;
    const recovered = readSessionDraft<{
      name: string; category: string; frequency: Frequency; weekday: string; date: string; time: string;
      price: string; isFree: boolean; hasCapacity: boolean; capacity: string; desc: string; emoji: string;
      selectedVibes: string[];
      locationChoice: LocationChoice; venueId: string; externalLocationName: string; externalLocationAddress: string;
      images: string[];
    }>(draftKey);
    if (recovered) {
      setName(recovered.name); setCategory(recovered.category); setFrequency(recovered.frequency);
      setWeekday(recovered.weekday); setDate(recovered.date); setTime(recovered.time); setPrice(recovered.price);
      setIsFree(recovered.isFree); setHasCapacity(recovered.hasCapacity); setCapacity(recovered.capacity); setSelectedVibes(recovered.selectedVibes ?? []);
      setDesc(recovered.desc); setEmoji(recovered.emoji); setLocationChoice(recovered.locationChoice);
      setVenueId(recovered.venueId); setExternalLocationName(recovered.externalLocationName);
      setExternalLocationAddress(recovered.externalLocationAddress);
      setMedia(recovered.images.map((url, index) => ({ id: `recovered-${index}-${url}`, url, type: 'image', name: index === 0 ? 'Cover image' : `Event image ${index + 1}` })));
      hydratedDraftRef.current = draftKey;
      return;
    }
    if (!existing) {
      hydratedDraftRef.current = draftKey;
      return;
    }
    setName(existing.name);
    setCategory(existing.category);
    setFrequency(existing.frequency as Frequency);
    const schedule = localSchedule(existing.startsAt);
    setWeekday(existing.weekday ?? '');
    setDate(schedule.date);
    setTime(schedule.time);
    setPrice(existing.isFree ? '' : String(existing.priceAmount));
    setIsFree(existing.isFree ?? false);
    setDesc(existing.description);
    setSelectedVibes(existing.vibes);
    setHasCapacity(existing.spotsTotal > 0);
    setCapacity(existing.spotsTotal > 0 ? String(existing.spotsTotal) : '');
    setEmoji(existing.emoji);
    setLocationChoice(
      existing.locationKind === 'd8_venue'
        ? 'existing_venue'
        : existing.locationKind === 'external'
          ? 'external'
          : 'undisclosed'
    );
    setVenueId(existing.venueId ?? '');
    setExternalLocationName(existing.externalLocationName ?? '');
    setExternalLocationAddress(existing.externalLocationAddress ?? '');
    const imageUrls = [
      existing.coverImage,
      ...(existing.images ?? []),
    ].filter((url, index, arr): url is string => Boolean(url) && arr.indexOf(url) === index);
    setMedia(imageUrls.map((url, index) => ({
      id: `persisted-${index}-${url}`,
      url,
      type: 'image',
      name: index === 0 ? 'Cover image' : `Event image ${index + 1}`,
    })));
    hydratedDraftRef.current = draftKey;
  }, [draftKey, editId, existing, loading, profile, referencesLoading]);

  useEffect(() => {
    if (hydratedDraftRef.current !== draftKey) return;
    writeSessionDraft(draftKey, {
      name, category, frequency, weekday, date, time, price, isFree, hasCapacity, capacity, desc, emoji, selectedVibes,
      locationChoice, venueId, externalLocationName, externalLocationAddress,
      images: media.filter(item => item.type === 'image' && !item.file).map(item => item.url),
    });
  }, [capacity, category, date, desc, draftKey, emoji, externalLocationAddress, externalLocationName, frequency, hasCapacity, isFree, locationChoice, media, name, price, selectedVibes, time, venueId, weekday]);

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;
    setSaveError(null);
    for (const file of files.slice(0, remaining)) {
      try {
        await validatePartnerImage(file);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Could not add this image.');
        continue;
      }
      setMedia(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        url: URL.createObjectURL(file),
        type: 'image',
        name: file.name,
        file,
      }]);
    }
    e.target.value = '';
  };

  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMedia(prev => [...prev.filter(m => m.type !== 'video'), {
      id: Math.random().toString(36).slice(2),
      url: URL.createObjectURL(file),
      type: 'video',
      name: file.name,
    }]);
    e.target.value = '';
  };

  const removeMedia = (id: string) => {
    setMedia(prev => {
      const item = prev.find(m => m.id === id);
      if (item && !isPartnerImageUrl(item.url)) URL.revokeObjectURL(item.url);
      return prev.filter(m => m.id !== id);
    });
  };

  const ownedVenues = venueOptions.filter(venue => venue.isOwnedByCurrentPartner);
  const selectedVenue = venueOptions.find(venue => venue.id === venueId);
  const hasValidLocation =
    locationChoice === 'owned_venue' || locationChoice === 'existing_venue'
      ? Boolean(venueId)
      : locationChoice === 'external'
        ? Boolean(externalLocationName.trim())
        : true;

  const hasValidCapacity = !hasCapacity || (/^\d+$/.test(capacity) && Number(capacity) > 0);
  let priceError: string | null = null;
  let parsedPrice = 0;
  try {
    parsedPrice = parseEventPriceInput(price, isFree);
    const commercialChange = canPublishedPriceChange({
      previouslyPublished: Boolean(existing?.firstPublishedAt),
      currentIsFree: Boolean(existing?.isFree),
      currentPrice: existing?.priceAmount ?? 0,
      proposedIsFree: isFree,
      proposedPrice: parsedPrice,
    });
    if (!commercialChange.allowed) priceError = commercialChange.reason;
  } catch (error) {
    priceError = error instanceof Error ? error.message : 'Enter a valid entry price.';
  }
  const canSave = Boolean(name.trim() && category && time && hasValidLocation && hasValidCapacity && !priceError && (
    frequency === 'one-off' ? date : frequency === 'weekly' ? weekday : true
  ));
  const needsPublicationAction = !existing || existing.status !== 'live';

  const save = async (publishNow: boolean) => {
    if (!canSave && publishNow) return;
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const imageUrls = await Promise.all(
        images.map(image => image.file ? uploadPartnerImage(image.file, 'events') : image.url)
      );

      await saveEvent({
        title: name.trim(),
        category,
        description: desc || undefined,
        frequency,
        weekday: weekday || undefined,
        date: date || undefined,
        time,
        price,
        isFree,
        hasCapacity,
        capacity: capacity || undefined,
        emoji,
        publishNow,
        locationKind: locationChoice,
        venueId: venueId || undefined,
        externalLocationName,
        externalLocationAddress,
        coverImage: imageUrls[0] ?? null,
        images: imageUrls,
        vibes: selectedVibes,
        publicationAcknowledgement: publishNow ? {
          requestKey: publicationRequestKey ?? crypto.randomUUID(),
          acknowledged: policyAccepted,
        } : undefined,
      }, editId);
      clearSessionDraft(draftKey);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setLocation('/dashboard'), 1200);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save event. Please try again.');
      setSaving(false);
    }
  };

  const requestPublication = () => {
    if (!canSave) return;
    setSaveError(null);
    setPolicyAccepted(false);
    setPublicationRequestKey(crypto.randomUUID());
    setShowPublishConfirmation(true);
  };

  const confirmPublication = async () => {
    if (!policyAccepted) return;
    setShowPublishConfirmation(false);
    await save(true);
  };

  if (saved) {
    return (
      <div className="flex-1 min-h-0 bg-white flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E8FFF0] flex items-center justify-center text-3xl mb-5">✅</div>
        <p className="font-black text-gray-900 text-[20px]">
          {saving ? 'Saving…' : 'Event saved'}
        </p>
        <p className="text-gray-400 text-[13px] mt-2">Redirecting to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col overflow-y-auto no-scrollbar pb-32">

      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideo} />

      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100 shrink-0">
        <button
          onClick={() => setLocation('/dashboard')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-4 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-[11px] font-black text-primary tracking-widest uppercase mb-0.5">D8 Partner</p>
        <h1 className="text-[22px] font-black text-gray-900">{editId ? 'Edit event' : 'New event'}</h1>
        <p className="text-[13px] text-gray-400 mt-1">Saved events go live immediately or sit as a draft. Use square or portrait images so they are ready for future IG/Facebook posting.</p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-[13px] text-red-600 font-medium">{saveError}</p>
          </div>
        )}

        {/* Event details */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Event details</p>

          {/* Emoji picker */}
          <div>
            <label className={LABEL}>Event icon</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all active:scale-95',
                    emoji === e ? 'bg-primary/10 ring-2 ring-primary' : 'bg-gray-50 hover:bg-gray-100'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Event name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Thursday Jazz Night" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={cn(INPUT, 'bg-white')}>
              <option value="">Select category</option>
              {categories.map(option => <option key={option.id} value={option.label}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Short description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What can people expect? Keep it honest and specific."
              rows={3}
              className={cn(INPUT, 'resize-none')}
            />
          </div>
          <div>
            <label className={LABEL}>Vibes</label>
            <div className="flex flex-wrap gap-2">
              {vibeOptions.map(option => {
                const selected = selectedVibes.includes(option.label);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedVibes(current => selected
                      ? current.filter(item => item !== option.label)
                      : [...current, option.label])}
                    className={cn(
                      'rounded-full border px-3 py-2 text-[12px] font-bold transition-colors',
                      selected ? 'border-primary bg-[#FFF0F1] text-primary' : 'border-gray-200 bg-white text-gray-500'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Location policy */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Location</p>
            <p className="text-[12px] text-gray-400 mt-2 leading-relaxed">
              Events appear in the public events feed. They only appear on a venue page when that venue approves the placement.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'owned_venue' as const, label: 'My D8 venue', desc: 'Auto-approved for your page' },
              { value: 'existing_venue' as const, label: 'D8 venue', desc: 'Requests venue-page approval' },
              { value: 'external' as const, label: 'External location', desc: 'Shown on the event only' },
              { value: 'undisclosed' as const, label: 'No public venue yet', desc: 'Keep location off venue pages' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setLocationChoice(option.value);
                  setVenueId('');
                  if (option.value !== 'external') {
                    setExternalLocationName('');
                    setExternalLocationAddress('');
                  }
                }}
                className={cn(
                  'flex flex-col gap-0.5 p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98]',
                  locationChoice === option.value ? 'border-primary bg-[#FFF0F1]' : 'border-gray-100 bg-white'
                )}
              >
                <p className={cn('font-bold text-[13px]', locationChoice === option.value ? 'text-primary' : 'text-gray-800')}>
                  {option.label}
                </p>
                <p className="text-[11px] text-gray-400 leading-snug">{option.desc}</p>
              </button>
            ))}
          </div>

          {(locationChoice === 'owned_venue' || locationChoice === 'existing_venue') && (
            <div>
              <label className={LABEL}>
                {locationChoice === 'owned_venue' ? 'Your venue *' : 'Existing D8 venue *'}
              </label>
              <select
                value={venueId}
                onChange={e => setVenueId(e.target.value)}
                className={cn(INPUT, 'bg-white')}
              >
                <option value="">Select venue</option>
                {(locationChoice === 'owned_venue' ? ownedVenues : venueOptions).map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}{venue.area ? ` - ${venue.area}` : ''}
                  </option>
                ))}
              </select>
              {locationChoice === 'existing_venue' && selectedVenue && (
                <p className="text-[11px] text-amber-600 font-semibold mt-2">
                  This event will stay off the venue page until the venue owner or D8 approves it.
                </p>
              )}
              {locationChoice === 'owned_venue' && ownedVenues.length === 0 && (
                <p className="text-[11px] text-gray-400 font-medium mt-2">
                  Add your venue listing first, then link events to it.
                </p>
              )}
            </div>
          )}

          {locationChoice === 'external' && (
            <div className="grid gap-3">
              <div>
                <label className={LABEL}>Location name *</label>
                <input
                  value={externalLocationName}
                  onChange={e => setExternalLocationName(e.target.value)}
                  placeholder="e.g. St. Mary's Church Hall"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Address or area</label>
                <input
                  value={externalLocationAddress}
                  onChange={e => setExternalLocationAddress(e.target.value)}
                  placeholder="e.g. Kabulonga, Lusaka"
                  className={INPUT}
                />
              </div>
            </div>
          )}
        </div>

        {/* Media upload */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between -mb-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Event media</p>
            <p className="text-[10px] text-gray-300 font-medium">
              {images.length}/{MAX_IMAGES} photos
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3">
            <p className="text-[12px] text-gray-600 font-semibold">
              Event images should be social-ready: 1080x1080 square or 1080x1350 portrait is recommended.
            </p>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              Up to 3 images, JPG/PNG/WebP, max 3 MB each, minimum 800px wide.
            </p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">
              Video support is coming soon.
            </p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, idx) => (
                <div key={img.id} className="relative rounded-xl overflow-hidden aspect-square bg-gray-100">
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] font-bold px-2 py-1 text-center tracking-wider uppercase">
                      Cover
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(img.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white active:scale-90 transition-transform"
                  >
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary hover:text-primary transition-colors active:scale-[0.97]"
                >
                  <ImagePlus size={20} />
                  <span className="text-[11px] font-bold">Add photo</span>
                </button>
              )}
            </div>
          )}

          {video && (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video src={video.url} className="w-full max-h-48 object-cover" preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                  <Play size={20} className="text-white fill-white ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2 flex items-center justify-between">
                <span className="text-white text-[11px] font-medium truncate max-w-[180px]">{video.name}</span>
                <button
                  onClick={() => removeMedia(video.id)}
                  className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shrink-0"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {images.length === 0 && !video && (
              <>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors active:scale-[0.98]"
                >
                  <ImagePlus size={24} />
                  <span className="text-[13px] font-bold">Add event images</span>
                  <span className="text-[11px] text-gray-300">Up to 3 · square or portrait</span>
                </button>
                <button
                  disabled
                  className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-gray-300 cursor-not-allowed"
                >
                  <Film size={24} />
                  <span className="text-[13px] font-bold">Video coming soon</span>
                </button>
              </>
            )}
            {(images.length > 0 || video) && (
              <div className="flex gap-2 w-full">
                {images.length > 0 && images.length < MAX_IMAGES && (
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3.5 py-2.5 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                  >
                    <ImagePlus size={14} /> Add photo
                  </button>
                )}
                {!video && (
                  <button
                    disabled
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-300 text-[12px] font-bold px-3.5 py-2.5 rounded-xl cursor-not-allowed"
                  >
                    <Film size={14} /> Video soon
                  </button>
                )}
                {video && (
                  <button
                    disabled
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-300 text-[12px] font-bold px-3.5 py-2.5 rounded-xl cursor-not-allowed"
                  >
                    <Film size={14} /> Video soon
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Frequency */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">How often</p>
          <div className="grid grid-cols-2 gap-2">
            {FREQ_OPTIONS.map(f => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={cn(
                  'flex flex-col gap-0.5 p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98]',
                  frequency === f.value ? 'border-primary bg-[#FFF0F1]' : 'border-gray-100 bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn('font-bold text-[13px]', frequency === f.value ? 'text-primary' : 'text-gray-800')}>
                    {f.label}
                  </p>
                  {frequency === f.value && <Check size={13} className="text-primary" strokeWidth={3} />}
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* When */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">When</p>
          {frequency === 'weekly' && (
            <div>
              <label className={LABEL}>Day of week *</label>
              <select value={weekday} onChange={e => setWeekday(e.target.value)} className={cn(INPUT, 'bg-white')}>
                <option value="">Select day</option>
                {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          {(frequency === 'one-off' || frequency === 'annual') && (
            <div>
              <label className={LABEL}>Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={INPUT}
              />
            </div>
          )}
          <div>
            <label className={LABEL}>Start time *</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className={INPUT} />
          </div>

          {/* Price */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={cn(LABEL, 'mb-0')}>Entry price</label>
              <button
                onClick={() => { if (!(existing?.firstPublishedAt && existing.isFree)) { setIsFree(f => !f); setPrice(''); } }}
                disabled={Boolean(existing?.firstPublishedAt && existing.isFree)}
                className={cn(
                  'flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full border transition-all',
                  isFree
                    ? 'bg-[#E8FFF0] border-green-200 text-[#00C851]'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                )}
              >
                {isFree && <Check size={11} strokeWidth={3} />} Free entry
              </button>
            </div>
            {isFree ? (
              <div className="px-4 py-3.5 rounded-xl bg-[#E8FFF0] border border-green-100">
                <p className="text-[13px] text-[#00C851] font-bold">Free entry</p>
                <p className="text-[12px] text-green-500 mt-0.5">No mandatory entry fee. Food, drinks and other costs may still apply.</p>
              </div>
            ) : (
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder={`e.g. ${currencySymbol}150 per person`}
                aria-invalid={Boolean(priceError)}
                className={INPUT}
              />
            )}
            {priceError && <p className="mt-2 text-[11px] font-semibold text-red-600">{priceError}</p>}
            {existing?.firstPublishedAt && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-amber-700">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Published prices may decrease or become free, but can never increase or change from free to paid.
              </p>
            )}
          </div>

          {/* Capacity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={cn(LABEL, 'mb-0')}>Attendance limit</label>
              <button
                onClick={() => setHasCapacity(c => !c)}
                className={cn(
                  'w-11 h-6 rounded-full relative transition-colors shrink-0',
                  hasCapacity ? 'bg-primary' : 'bg-gray-200'
                )}
              >
                <span className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all',
                  hasCapacity ? 'left-6' : 'left-1'
                )} />
              </button>
            </div>
            {hasCapacity ? (
              <input
                type="number"
                min="1"
                step="1"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                placeholder="e.g. 60 attendees"
                className={INPUT}
              />
            ) : (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-[13px] font-semibold text-gray-700">Open attendance</p>
                  <p className="text-[12px] text-gray-400 mt-0.5 leading-snug">
                    No maximum attendance has been listed. This is not a reservation count.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 px-5 py-4 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] flex flex-col gap-2">
        <button
          onClick={() => needsPublicationAction ? requestPublication() : void save(false)}
          disabled={!canSave || saving}
          className={cn(
            'w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all',
            canSave && !saving
              ? 'bg-primary text-white shadow-[0_6px_16px_-4px_rgba(255,90,95,0.45)] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          )}
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
            : needsPublicationAction
              ? <><Send size={16} /> {existing?.firstPublishedAt ? 'Review and resume' : 'Review and publish'}</>
              : <><Check size={16} /> Save changes</>}
        </button>
        {needsPublicationAction && <button
          onClick={() => save(false)}
          disabled={!name.trim() || saving}
          className={cn(
            'w-full py-3 rounded-xl font-bold text-[14px] transition-all',
            name.trim() && !saving ? 'bg-gray-100 text-gray-600 active:scale-[0.98] hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          )}
        >
          Save as draft
        </button>}
      </div>

      {showPublishConfirmation && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck size={20} /></div>
              <div>
                <h2 className="text-[18px] font-black text-gray-900">Confirm event publication</h2>
                <p className="mt-1 text-[12px] text-gray-500">Policy version {EVENT_PUBLISHING_POLICY_VERSION}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 rounded-2xl bg-gray-50 p-4 text-[12px] text-gray-700">
              <p><strong>Event:</strong> {name}</p>
              <p><strong>Schedule:</strong> {date || weekday || frequency} at {time}</p>
              <p><strong>Location:</strong> {selectedVenue?.name || externalLocationName || 'Not publicly disclosed'}</p>
              <p><strong>Entry:</strong> {isFree ? 'Free entry' : `${currencySymbol}${parsedPrice.toFixed(2)}`}</p>
              <p><strong>Attendance:</strong> {hasCapacity ? `Up to ${capacity}` : 'Open attendance'}</p>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-4">
              <input type="checkbox" checked={policyAccepted} onChange={event => setPolicyAccepted(event.target.checked)} className="mt-1" />
              <span className="text-[12px] font-medium leading-5 text-gray-700">{EVENT_PUBLISHING_ACKNOWLEDGEMENT}</span>
            </label>
            <a className="mt-3 inline-block text-[12px] font-bold text-primary hover:underline" href={EVENT_PUBLISHING_POLICY_PATH} target="_blank" rel="noreferrer">Read the Event Publishing Policy</a>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setShowPublishConfirmation(false)} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-[13px] font-bold text-gray-600">Cancel</button>
              <button type="button" disabled={!policyAccepted || saving} onClick={() => void confirmPublication()} className="flex-1 rounded-xl bg-primary px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40">Confirm and publish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
