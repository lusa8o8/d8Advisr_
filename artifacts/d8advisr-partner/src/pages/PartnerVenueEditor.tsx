import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ImagePlus, X, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePartner } from '@/hooks/usePartner';
import { useListingReferences, useRegion } from '@workspace/d8-core/use-region';
import { useAuth } from '@workspace/d8-core/auth';
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from '@workspace/d8-core/use-session-draft';
import { isPartnerImageUrl, uploadPartnerImage, validatePartnerImage } from '@/lib/partnerMedia';

const INPUT = 'w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all';
const LABEL = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';
const TIME_INPUT = 'flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all';
const FIELD_HELPER = 'text-[11px] text-gray-400 font-medium mt-1.5 leading-relaxed';
const REVIEW_HELPER = 'text-[11px] text-amber-600 font-semibold mt-1.5 leading-relaxed';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type AreaMode = 'catalog' | 'manual' | 'unset';

function normalizedRegionValue(value?: string | null) {
  return value?.split(',')[0]?.trim().toLocaleLowerCase() ?? '';
}

interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

interface MediaFile {
  id: string;
  url: string;
  name: string;
  file?: File;
}

const DEFAULT_HOURS: DayHours[] = DAYS.map((_, i) => ({
  open: i < 5,
  from: '09:00',
  to: '22:00',
}));

const MAX_PHOTOS = 6;

export function PartnerVenueEditor() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { profile, venueListing, loading, saveVenue } = usePartner();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [venueName, setVenueName]   = useState(profile?.name ?? '');
  const [venueType, setVenueType]   = useState('');
  const [address, setAddress]       = useState('');
  const [area, setArea]             = useState('');
  const [areaMode, setAreaMode]     = useState<AreaMode>('unset');
  const { regions } = useRegion();
  const profileRegionValue          = normalizedRegionValue(profile?.region_id ?? profile?.city);
  const selectedRegion             = regions.find(region =>
    normalizedRegionValue(region.id) === profileRegionValue
    || normalizedRegionValue(region.name) === profileRegionValue
  );
  const cityId                      = selectedRegion?.id ?? '';
  const cityName                    = selectedRegion?.name ?? profile?.city ?? '';
  const { categories, vibes: vibeOptions, areas, isLoading: referencesLoading } = useListingReferences('venue', cityId);
  const defaultCallingCode          = selectedRegion?.country?.calling_code;
  const [phone, setPhone]           = useState(profile?.contact || (defaultCallingCode ? `${defaultCallingCode} ` : ''));
  const [website, setWebsite]       = useState('');
  const [priceTier, setPriceTier]   = useState('');
  const [averageCost, setAverageCost] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [desc, setDesc]             = useState('');
  const [hours, setHours]           = useState<DayHours[]>(DEFAULT_HOURS);
  const [photos, setPhotos]         = useState<MediaFile[]>([]);
  const draftKey = `d8:partner-venue:${user?.id ?? 'anonymous'}:v3`;
  const hydratedDraftRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !profile || referencesLoading || hydratedDraftRef.current === draftKey) return;
    const recovered = readSessionDraft<{
      venueName: string; venueType: string; address: string; area: string;
      areaMode: AreaMode; priceTier: string; averageCost: string; selectedVibes: string[];
      phone: string; website: string; desc: string; hours: DayHours[];
      photos: Array<Pick<MediaFile, 'id' | 'url' | 'name'>>;
    }>(draftKey);
    if (recovered) {
      setVenueName(recovered.venueName);
      setVenueType(recovered.venueType);
      setAddress(recovered.address);
      setArea(recovered.area);
      setAreaMode(recovered.areaMode);
      setPriceTier(recovered.priceTier);
      setAverageCost(recovered.averageCost);
      setSelectedVibes(recovered.selectedVibes);
      setPhone(recovered.phone.trim() ? recovered.phone : defaultCallingCode ? `${defaultCallingCode} ` : '');
      setWebsite(recovered.website);
      setDesc(recovered.desc);
      setHours(recovered.hours);
      setPhotos(recovered.photos);
      hydratedDraftRef.current = draftKey;
      return;
    }
    {
      setVenueName(venueListing?.name ?? profile.name);
      setVenueType(venueListing?.category ?? '');
      setAddress(venueListing?.address ?? '');
      setArea(venueListing?.area ?? '');
      setAreaMode(
        venueListing?.area
          ? areas.some(option => option.name === venueListing.area) ? 'catalog' : 'manual'
          : 'unset'
      );
      setPriceTier(venueListing?.priceTier ?? '');
      setAverageCost(venueListing?.averageCostPerPerson?.toString() ?? '');
      setSelectedVibes(venueListing?.vibes ?? []);
      setDesc(venueListing?.description ?? '');
      setPhone(venueListing?.contactPhone || profile.contact || (defaultCallingCode ? `${defaultCallingCode} ` : ''));
      setWebsite(venueListing?.websiteUrl ?? '');
      if (venueListing?.openHours) {
        setHours(DAYS.map(day => {
          const value = venueListing.openHours?.[day];
          if (!value || value === 'Closed') return { open: false, from: '09:00', to: '22:00' };
          const [from, to] = value.split(/[–-]/);
          return { open: true, from: from || '09:00', to: to || '22:00' };
        }));
      }
      const imageUrls = [
        venueListing?.coverImage,
        ...(venueListing?.images ?? []),
      ].filter((url, index, arr): url is string => Boolean(url) && arr.indexOf(url) === index);
      setPhotos(imageUrls.map((url, index) => ({
        id: `persisted-${index}-${url}`,
        url,
        name: index === 0 ? 'Cover photo' : `Venue photo ${index + 1}`,
      })));
    }
    hydratedDraftRef.current = draftKey;
  }, [areas, defaultCallingCode, draftKey, loading, profile, referencesLoading, venueListing]);

  useEffect(() => {
    if (hydratedDraftRef.current !== draftKey) return;
    writeSessionDraft(draftKey, {
      venueName, venueType, address, area, areaMode, priceTier, averageCost,
      selectedVibes, phone, website, desc, hours,
      photos: photos.filter(photo => !photo.file).map(({ id, url, name }) => ({ id, url, name })),
    });
  }, [address, area, areaMode, averageCost, desc, draftKey, hours, phone, photos, priceTier, selectedVibes, venueName, venueType, website]);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const setDay = (idx: number, patch: Partial<DayHours>) => {
    setHours(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - photos.length;
    setSaveError(null);
    for (const file of files.slice(0, remaining)) {
      try {
        await validatePartnerImage(file);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Could not add this image.');
        continue;
      }
      setPhotos(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        url: URL.createObjectURL(file),
        name: file.name,
        file,
      }]);
    }
    e.target.value = '';
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const item = prev.find(p => p.id === id);
      if (item && !isPartnerImageUrl(item.url)) URL.revokeObjectURL(item.url);
      return prev.filter(p => p.id !== id);
    });
  };

  const movePhoto = (id: string, offset: -1 | 1) => {
    setPhotos(current => {
      const index = current.findIndex(photo => photo.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const makeCover = (id: string) => {
    setPhotos(current => {
      const selected = current.find(photo => photo.id === id);
      return selected ? [selected, ...current.filter(photo => photo.id !== id)] : current;
    });
  };
  const canSave = Boolean(venueName.trim() && venueType && address.trim() && !venueListing?.hasPendingRevision);

  const toggleVibe = (label: string) => {
    setSelectedVibes(current => current.includes(label)
      ? current.filter(item => item !== label)
      : [...current, label]);
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      let normalizedWebsite: string | undefined;
      if (website.trim()) {
        const parsedWebsite = new URL(website.trim());
        if (!['http:', 'https:'].includes(parsedWebsite.protocol)) {
          throw new Error('Website must use http:// or https://');
        }
        normalizedWebsite = parsedWebsite.toString();
      }
      const openHours: Record<string, string> = {};
      DAYS.forEach((day, idx) => {
        openHours[day] = hours[idx].open ? `${hours[idx].from}–${hours[idx].to}` : 'Closed';
      });

      const imageUrls = await Promise.all(
        photos.map(photo => photo.file ? uploadPartnerImage(photo.file, 'venues') : photo.url)
      );

      await saveVenue({
        name: venueName.trim(),
        category: venueType,
        description: desc || undefined,
        address: address.trim(),
        area: area.trim() || undefined,
        priceTier: priceTier || undefined,
        averageCostPerPerson: averageCost ? Number(averageCost) : undefined,
        vibes: selectedVibes,
        phone: phone.trim() || undefined,
        website: normalizedWebsite,
        openHours,
        coverImage: imageUrls[0] ?? null,
        images: imageUrls,
      });
      clearSessionDraft(draftKey);
      setSaved(true);
      setTimeout(() => setLocation('/dashboard'), 1200);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save venue. Please try again.');
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex-1 min-h-0 bg-white flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E8FFF0] flex items-center justify-center text-3xl mb-5">✅</div>
        <p className="font-black text-gray-900 text-[20px]">Listing saved</p>
        <p className="text-gray-400 text-[13px] mt-2">D8 will review sensitive listing changes before they affect public discovery.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col overflow-y-auto no-scrollbar pb-32">

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotos}
      />

      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100 shrink-0">
        <button
          onClick={() => setLocation('/dashboard')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-4 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-[11px] font-black text-primary tracking-widest uppercase mb-0.5">D8 Partner</p>
        <h1 className="text-[22px] font-black text-gray-900">Edit venue listing</h1>
        <p className="text-[13px] text-gray-400 mt-1">Your partner account gives you access here. D8 approves the public listing separately.</p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">

        {venueListing?.hasPendingRevision && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-[13px] font-black text-blue-900">Changes awaiting D8 review</p>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-blue-700">
              Your current public listing remains live. You can edit again after D8 approves or rejects the pending changes.
            </p>
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-[13px] text-red-600 font-medium">{saveError}</p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-[12px] font-black text-amber-700">How listing edits work</p>
          <p className="text-[12px] text-amber-700/80 font-medium leading-relaxed mt-1">
            Description and hours can update immediately. Name, category, location, pricing, vibes, contact, website, and photos require D8 review before public discovery changes.
          </p>
        </div>

        {/* Venue details */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Venue details</p>

          <div>
            <label className={LABEL}>Venue name *</label>
            <input
              value={venueName}
              onChange={e => setVenueName(e.target.value)}
              placeholder="e.g. Bo Jangles Restaurant"
              className={INPUT}
            />
            <p className={REVIEW_HELPER}>Changing the venue name may require D8 review.</p>
          </div>

          <div>
            <label className={LABEL}>Type *</label>
            <select
              value={venueType}
              onChange={e => setVenueType(e.target.value)}
              className={cn(INPUT, 'bg-white')}
            >
              <option value="">Choose venue type</option>
              {categories.map(option => (
                <option key={option.id} value={option.label}>{option.label}</option>
              ))}
            </select>
            <p className={REVIEW_HELPER}>Category changes can affect search quality, so D8 may recheck them.</p>
          </div>

          <div>
            <label className={LABEL}>About this venue</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What makes this place worth visiting? Keep it factual."
              rows={3}
              className={cn(INPUT, 'resize-none')}
            />
            <p className={FIELD_HELPER}>Low-risk update. Keep it factual and specific.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Price level</label>
              <select value={priceTier} onChange={e => setPriceTier(e.target.value)} className={cn(INPUT, 'bg-white')}>
                <option value="">Not set</option>
                <option value="$">1 - Budget</option>
                <option value="$$">2 - Moderate</option>
                <option value="$$$">3 - Premium</option>
                <option value="$$$$">4 - Luxury</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Average cost / person</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-400">
                  {selectedRegion?.currency_symbol ?? ''}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={averageCost}
                  onChange={e => setAverageCost(e.target.value)}
                  className={cn(INPUT, 'pl-10')}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL}>Vibes</label>
            <div className="flex flex-wrap gap-2">
              {vibeOptions.map(option => {
                const active = selectedVibes.includes(option.label);
                return (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => toggleVibe(option.label)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all',
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-white text-gray-600'
                    )}
                  >
                    {active && <Check size={11} strokeWidth={3} />}
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className={REVIEW_HELPER}>Choose only reviewed vibes that genuinely describe the venue.</p>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between -mb-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Venue photos</p>
            <p className="text-[10px] text-gray-300 font-medium">{photos.length}/{MAX_PHOTOS}</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3">
            <p className="text-[12px] text-gray-600 font-semibold">Use clear, real photos of the venue. Up to 6 photos, JPG/PNG/WebP, max 3 MB each, minimum 800px wide.</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Photo changes are sensitive and remain private until D8 approves the proposed gallery.</p>
            <p className="text-[11px] text-gray-400 font-medium mt-1">Video support is coming soon.</p>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="relative rounded-xl overflow-hidden aspect-square bg-gray-100">
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 p-1 text-white">
                    <button type="button" disabled={idx === 0} onClick={() => movePhoto(photo.id, -1)} className="grid h-5 w-5 place-items-center rounded bg-white/15 disabled:opacity-30" aria-label={`Move ${photo.name} earlier`}>
                      <ChevronLeft size={11} />
                    </button>
                    {idx === 0 ? (
                      <span className="text-[8px] font-black uppercase tracking-wider">Cover</span>
                    ) : (
                      <button type="button" onClick={() => makeCover(photo.id)} className="text-[8px] font-black uppercase tracking-wider">Make cover</button>
                    )}
                    <button type="button" disabled={idx === photos.length - 1} onClick={() => movePhoto(photo.id, 1)} className="grid h-5 w-5 place-items-center rounded bg-white/15 disabled:opacity-30" aria-label={`Move ${photo.name} later`}>
                      <ChevronRight size={11} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white active:scale-90 transition-transform"
                    aria-label={`Remove ${photo.name}`}
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary hover:text-primary transition-colors active:scale-[0.97]"
                >
                  <ImagePlus size={18} />
                  <span className="text-[10px] font-bold">Add</span>
                </button>
              )}
            </div>
          )}

          {photos.length === 0 && (
            <button
              onClick={() => photoInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-7 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors active:scale-[0.98]"
            >
              <ImagePlus size={24} />
              <span className="text-[13px] font-bold">Add venue photos</span>
              <span className="text-[11px] text-gray-300">Up to 6 · First becomes cover</span>
            </button>
          )}
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Location</p>

          <div>
            <label className={LABEL}>Street address *</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 14 Cairo Road"
              className={INPUT}
            />
            <p className={REVIEW_HELPER}>Address changes may require D8 reverification before the public listing changes.</p>
          </div>
          <div>
            <label className={LABEL}>Area / neighbourhood</label>
            <select
              value={areaMode === 'manual' ? '__manual__' : area}
              onChange={e => {
                if (e.target.value === '__manual__') {
                  setAreaMode('manual');
                  setArea('');
                } else if (e.target.value) {
                  setAreaMode('catalog');
                  setArea(e.target.value);
                } else {
                  setAreaMode('unset');
                  setArea('');
                }
              }}
              className={cn(INPUT, 'bg-white')}
            >
              <option value="">Choose area</option>
              {areas.map(option => <option key={option.id} value={option.name}>{option.name}</option>)}
              <option value="__manual__">Area not listed</option>
            </select>
            {areaMode === 'manual' && (
              <input
                value={area}
                onChange={e => setArea(e.target.value)}
                placeholder="Enter the neighbourhood or local area"
                className={cn(INPUT, 'mt-2')}
              />
            )}
            <p className={REVIEW_HELPER}>Reviewed areas are preferred. Manual areas are clearly marked for D8 review.</p>
          </div>
          <div>
            <label className={LABEL}>Account region</label>
            <div className="px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-[14px] text-gray-800 font-medium capitalize">
              {cityName || 'Set in your profile'}
            </div>
            <p className={FIELD_HELPER}>This comes from your approved partner account and determines areas and currency.</p>
            {profile?.city && !selectedRegion && regions.length > 0 && (
              <p className={REVIEW_HELPER}>This account region is not recognized. Ask D8 Admin to correct the partner application before saving.</p>
            )}
          </div>
        </div>

        {/* Opening hours */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Opening hours</p>
          <p className="text-[11px] text-gray-400 font-medium -mt-1">Low-risk update. D8 may still recheck hours if users report a mismatch.</p>

          {DAYS.map((day, idx) => (
            <div key={day}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDay(idx, { open: !hours[idx].open })}
                  className={cn(
                    'w-11 h-6 rounded-full relative transition-colors shrink-0',
                    hours[idx].open ? 'bg-primary' : 'bg-gray-200'
                  )}
                >
                  <span className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all',
                    hours[idx].open ? 'left-6' : 'left-1'
                  )} />
                </button>

                <span className={cn('w-8 text-[13px] font-bold', hours[idx].open ? 'text-gray-800' : 'text-gray-300')}>
                  {day}
                </span>

                {hours[idx].open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={hours[idx].from}
                      onChange={e => setDay(idx, { from: e.target.value })}
                      className={TIME_INPUT}
                    />
                    <span className="text-gray-300 text-[12px] font-bold shrink-0">to</span>
                    <input
                      type="time"
                      value={hours[idx].to}
                      onChange={e => setDay(idx, { to: e.target.value })}
                      className={TIME_INPUT}
                    />
                  </div>
                ) : (
                  <span className="text-[12px] text-gray-300 font-medium">Closed</span>
                )}
              </div>
              {idx < DAYS.length - 1 && <div className="mt-3 border-t border-gray-50" />}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Contact</p>

          <div>
            <label className={LABEL}>WhatsApp / phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+260 or +234"
              className={INPUT}
            />
            <p className={REVIEW_HELPER}>Contact changes require review because they redirect customer enquiries.</p>
          </div>
          <div>
            <label className={LABEL}>Website</label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://"
              className={INPUT}
            />
            <p className={REVIEW_HELPER}>Website changes require review. Use the official venue or booking link.</p>
          </div>
        </div>

      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 px-5 py-4 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] flex flex-col gap-2">
        <button
          onClick={save}
          disabled={!canSave || saving}
          className={cn(
            'w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all',
            canSave && !saving
              ? 'bg-primary text-white shadow-[0_6px_16px_-4px_rgba(255,90,95,0.45)] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          )}
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save changes'}
        </button>
        <button
          onClick={() => setLocation('/dashboard')}
          className="w-full py-3 rounded-xl font-bold text-[14px] bg-gray-100 text-gray-600 active:scale-[0.98] hover:bg-gray-200 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
