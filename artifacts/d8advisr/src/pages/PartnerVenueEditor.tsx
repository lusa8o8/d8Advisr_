import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ImagePlus, X, Check } from 'lucide-react';
import { cn } from '@/components/SharedUI';

const INPUT = 'w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all';
const LABEL = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';
const TIME_INPUT = 'flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all';

const VENUE_TYPES = [
  'Restaurant', 'Bar & Lounge', 'Rooftop', 'Event Hall', 'Park & Outdoor',
  'Hotel', 'Café', 'Club / Nightlife', 'Sports Facility', 'Other',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

interface MediaFile {
  id: string;
  url: string;
  name: string;
}

const DEFAULT_HOURS: DayHours[] = DAYS.map((_, i) => ({
  open: i < 5,
  from: '09:00',
  to: '22:00',
}));

const MAX_PHOTOS = 6;

export function PartnerVenueEditor() {
  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState(false);

  // Pre-fill from localStorage
  const [venueName, setVenueName]   = useState(localStorage.getItem('d8_partner_name') || '');
  const [venueType, setVenueType]   = useState('');
  const [address, setAddress]       = useState('');
  const [area, setArea]             = useState('');
  const city                        = localStorage.getItem('d8_partner_city') || '';
  const [phone, setPhone]           = useState(localStorage.getItem('d8_partner_contact') || '');
  const [website, setWebsite]       = useState('');
  const [desc, setDesc]             = useState('');
  const [hours, setHours]           = useState<DayHours[]>(DEFAULT_HOURS);
  const [photos, setPhotos]         = useState<MediaFile[]>([]);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const setDay = (idx: number, patch: Partial<DayHours>) => {
    setHours(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - photos.length;
    files.slice(0, remaining).forEach(file => {
      setPhotos(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        url: URL.createObjectURL(file),
        name: file.name,
      }]);
    });
    e.target.value = '';
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter(p => p.id !== id);
    });
  };

  const canSave = venueName.trim() && venueType && address.trim();

  const save = () => {
    localStorage.setItem('d8_partner_name', venueName.trim());
    setSaved(true);
    setTimeout(() => setLocation('/partner/dashboard'), 1200);
  };

  if (saved) {
    return (
      <div className="flex-1 min-h-0 bg-white flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E8FFF0] flex items-center justify-center text-3xl mb-5">✅</div>
        <p className="font-black text-gray-900 text-[20px]">Listing updated</p>
        <p className="text-gray-400 text-[13px] mt-2">Changes are live on D8Advisr.</p>
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

      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100 shrink-0">
        <button
          onClick={() => setLocation('/partner/dashboard')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-4 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-[11px] font-black text-primary tracking-widest uppercase mb-0.5">D8 Partner</p>
        <h1 className="text-[22px] font-black text-gray-900">Edit venue listing</h1>
        <p className="text-[13px] text-gray-400 mt-1">This is what users see when they find your venue on D8Advisr.</p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">

        {/* ── Venue details ──────────────────────────────────────────────── */}
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
          </div>

          <div>
            <label className={LABEL}>Type *</label>
            <div className="flex flex-wrap gap-2">
              {VENUE_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setVenueType(t)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-bold transition-all active:scale-95',
                    venueType === t
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {venueType === t && <Check size={11} strokeWidth={3} />}
                  {t}
                </button>
              ))}
            </div>
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
          </div>
        </div>

        {/* ── Photos ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between -mb-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Venue photos</p>
            <p className="text-[10px] text-gray-300 font-medium">{photos.length}/{MAX_PHOTOS}</p>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="relative rounded-xl overflow-hidden aspect-square bg-gray-100">
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[9px] font-bold px-1.5 py-1 text-center tracking-wider uppercase">
                      Cover
                    </div>
                  )}
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white active:scale-90 transition-transform"
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

        {/* ── Location ───────────────────────────────────────────────────── */}
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
          </div>
          <div>
            <label className={LABEL}>Area / neighbourhood</label>
            <input
              value={area}
              onChange={e => setArea(e.target.value)}
              placeholder="e.g. Longacres, Woodlands, Victoria Island"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>City</label>
            <div className="px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-[14px] text-gray-400 font-medium">
              {city || 'Set in your profile'}
            </div>
          </div>
        </div>

        {/* ── Opening hours ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Opening hours</p>

          {DAYS.map((day, idx) => (
            <div key={day}>
              <div className="flex items-center gap-3">
                {/* Toggle */}
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

        {/* ── Contact ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Contact</p>

          <div>
            <label className={LABEL}>WhatsApp / phone</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+260 or +234"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Website</label>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://"
              className={INPUT}
            />
          </div>
        </div>

      </div>

      {/* ── Bottom actions ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 px-5 py-4 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] flex flex-col gap-2">
        <button
          onClick={save}
          disabled={!canSave}
          className={cn(
            'w-full py-3.5 rounded-xl font-bold text-[15px] transition-all',
            canSave
              ? 'bg-primary text-white shadow-[0_6px_16px_-4px_rgba(255,90,95,0.45)] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          )}
        >
          Save changes
        </button>
        <button
          onClick={() => setLocation('/partner/dashboard')}
          className="w-full py-3 rounded-xl font-bold text-[14px] bg-gray-100 text-gray-600 active:scale-[0.98] hover:bg-gray-200 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
