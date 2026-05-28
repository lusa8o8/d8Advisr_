import { useState, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, Check, Send, ImagePlus, Film, X, Play, Loader2 } from 'lucide-react';
import { cn } from '@/components/SharedUI';
import { usePartner } from '@/hooks/usePartner';

type Frequency = 'one-off' | 'weekly' | 'monthly' | 'annual';

interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
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

const EMOJI_OPTIONS = ['📅', '🎷', '🍳', '🎤', '🏃', '🎵', '🍷', '🎭', '🏋️', '🎨', '🎪', '🌟'];

const INPUT = 'w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all';
const LABEL = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

const MAX_IMAGES = 4;

export function PartnerEventEditor() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const editId = params?.id;
  const { saveEvent, events } = usePartner();

  const existing = editId ? events.find(e => e.id === editId) : null;

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
  const [emoji, setEmoji] = useState(existing?.emoji ?? '📅');
  const [media, setMedia] = useState<MediaFile[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const images = media.filter(m => m.type === 'image');
  const video  = media.find(m => m.type === 'video');

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;
    files.slice(0, remaining).forEach(file => {
      setMedia(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        url: URL.createObjectURL(file),
        type: 'image',
        name: file.name,
      }]);
    });
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
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter(m => m.id !== id);
    });
  };

  const canSave = name.trim() && category && time && (
    frequency === 'one-off' ? date : frequency === 'weekly' ? weekday : true
  );

  const save = async (publishNow: boolean) => {
    if (!canSave && publishNow) return;
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
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
      }, editId);
      setSaved(true);
      setTimeout(() => setLocation('/partner/dashboard'), 1200);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save event. Please try again.');
      setSaving(false);
    }
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
          onClick={() => setLocation('/partner/dashboard')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-4 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-[11px] font-black text-primary tracking-widest uppercase mb-0.5">D8 Partner</p>
        <h1 className="text-[22px] font-black text-gray-900">{editId ? 'Edit event' : 'New event'}</h1>
        <p className="text-[13px] text-gray-400 mt-1">Saved events go live immediately or sit as a draft — your choice.</p>
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
              {EMOJI_OPTIONS.map(e => (
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
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
        </div>

        {/* Media upload */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between -mb-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Event media</p>
            <p className="text-[10px] text-gray-300 font-medium">
              {images.length}/{MAX_IMAGES} photos{video ? ' · 1 video' : ''}
            </p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, idx) => (
                <div key={img.id} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
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
                  className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary hover:text-primary transition-colors active:scale-[0.97]"
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
                  <span className="text-[13px] font-bold">Add photos</span>
                  <span className="text-[11px] text-gray-300">Up to 4 · First becomes cover</span>
                </button>
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors active:scale-[0.98]"
                >
                  <Film size={24} />
                  <span className="text-[13px] font-bold">Add video</span>
                  <span className="text-[11px] text-gray-300">Short clip or promo</span>
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
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3.5 py-2.5 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                  >
                    <Film size={14} /> Add video
                  </button>
                )}
                {video && (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3.5 py-2.5 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                  >
                    <Film size={14} /> Replace video
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
              <label className={LABEL}>{frequency === 'annual' ? 'Date (month and day) *' : 'Date *'}</label>
              <input
                type={frequency === 'one-off' ? 'date' : 'text'}
                value={date}
                onChange={e => setDate(e.target.value)}
                placeholder={frequency === 'annual' ? 'e.g. June 14' : ''}
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
              <label className={cn(LABEL, 'mb-0')}>Price</label>
              <button
                onClick={() => { setIsFree(f => !f); setPrice(''); }}
                className={cn(
                  'flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full border transition-all',
                  isFree
                    ? 'bg-[#E8FFF0] border-green-200 text-[#00C851]'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                )}
              >
                {isFree && <Check size={11} strokeWidth={3} />} Free event
              </button>
            </div>
            {isFree ? (
              <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl bg-[#E8FFF0] border border-green-100">
                <span className="text-[13px] text-[#00C851] font-bold">Free admission</span>
                <span className="text-[12px] text-green-400">· No payment collected</span>
              </div>
            ) : (
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="e.g. K150 or ₦5,000 per person"
                className={INPUT}
              />
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
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                placeholder="e.g. 60 guests"
                className={INPUT}
              />
            ) : (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-[13px] font-semibold text-gray-700">Open attendance</p>
                  <p className="text-[12px] text-gray-400 mt-0.5 leading-snug">
                    No cap on numbers. D8 will track how many people plan to attend through the app.
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
          onClick={() => save(true)}
          disabled={!canSave || saving}
          className={cn(
            'w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all',
            canSave && !saving
              ? 'bg-primary text-white shadow-[0_6px_16px_-4px_rgba(255,90,95,0.45)] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          )}
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Send size={16} /> Publish now</>}
        </button>
        <button
          onClick={() => save(false)}
          disabled={!name.trim() || saving}
          className={cn(
            'w-full py-3 rounded-xl font-bold text-[14px] transition-all',
            name.trim() && !saving ? 'bg-gray-100 text-gray-600 active:scale-[0.98] hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          )}
        >
          Save as draft
        </button>
      </div>
    </div>
  );
}
