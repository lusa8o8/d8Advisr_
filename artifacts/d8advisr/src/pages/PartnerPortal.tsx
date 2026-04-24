import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/components/SharedUI';
import { CITIES as CITY_LIST, LS_KEYS } from '@/lib/constants';

type PartnerType = 'venue' | 'organizer' | 'both';

const CITIES = CITY_LIST.map(c => `${c.name}, ${c.country}`);

const TYPE_OPTIONS: { value: PartnerType; label: string; desc: string; emoji: string }[] = [
  {
    value: 'venue',
    label: 'We operate a venue',
    desc: 'Restaurant, bar, rooftop, park, hall — we own or manage a space',
    emoji: '🏛️',
  },
  {
    value: 'organizer',
    label: 'We organise events',
    desc: 'Concerts, markets, conferences, fitness — we create the experience',
    emoji: '🎟️',
  },
  {
    value: 'both',
    label: 'Both',
    desc: 'We run a venue and also organise our own events or activities',
    emoji: '🔗',
  },
];

export function PartnerPortal() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<PartnerType | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [contact, setContact] = useState('');

  // Redirect if already onboarded
  const existing = localStorage.getItem(LS_KEYS.partnerName);
  if (existing) {
    setLocation('/partner/dashboard');
    return null;
  }

  const canContinue = type !== null;
  const canSubmit = name.trim() && city && contact.trim();

  const submit = () => {
    localStorage.setItem(LS_KEYS.partnerName,    name.trim());
    localStorage.setItem(LS_KEYS.partnerType,    type!);
    localStorage.setItem(LS_KEYS.partnerCity,    city);
    localStorage.setItem(LS_KEYS.partnerContact, contact.trim());
    localStorage.setItem(LS_KEYS.partnerStatus,  'pending');
    setLocation('/partner/dashboard');
  };

  return (
    <div className="flex-1 min-h-0 bg-white flex flex-col overflow-y-auto no-scrollbar pb-28">

      {/* Header */}
      <div className="px-6 pt-14 pb-6 border-b border-gray-100">
        <button
          onClick={() => step === 2 ? setStep(1) : setLocation('/home')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-5 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-black text-primary tracking-widest uppercase">D8 Partner Portal</span>
          <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">— Step {step} of 2</span>
        </div>
        <h1 className="text-[24px] font-black text-gray-900 leading-tight">
          {step === 1 ? 'What best describes you?' : 'Your details'}
        </h1>
        <p className="text-[13px] text-gray-400 mt-1.5 leading-relaxed">
          {step === 1
            ? 'This determines what tools and fields are most relevant to you.'
            : 'We\'ll review your submission within 48 hours before your listing goes live.'}
        </p>
      </div>

      <div className="px-6 pt-6 flex flex-col gap-3">

        {step === 1 && (
          <>
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]',
                  type === opt.value
                    ? 'border-primary bg-[#FFF0F1]'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0',
                  type === opt.value ? 'bg-primary/10' : 'bg-gray-50'
                )}>
                  {opt.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-bold text-[15px] leading-tight', type === opt.value ? 'text-primary' : 'text-gray-900')}>
                    {opt.label}
                  </p>
                  <p className="text-[12px] text-gray-400 mt-0.5 leading-snug">{opt.desc}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
                  type === opt.value ? 'border-primary bg-primary' : 'border-gray-200'
                )}>
                  {type === opt.value && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            ))}

            <div className="pt-2">
              <button
                onClick={() => canContinue && setStep(2)}
                disabled={!canContinue}
                className={cn(
                  'w-full py-4 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 transition-all',
                  canContinue
                    ? 'bg-primary text-white shadow-[0_8px_20px_-6px_rgba(255,90,95,0.45)] active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                )}
              >
                Continue <ChevronRight size={17} />
              </button>
            </div>

            <p className="text-center text-[11px] text-gray-400 font-medium">
              Free to list. D8 earns from plan conversions, not from you.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {type === 'organizer' ? 'Organisation / brand name' : 'Venue name'} *
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={type === 'organizer' ? 'e.g. Cornerstone Events' : 'e.g. Bo Jangles Restaurant'}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">City *</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-[14px] text-gray-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-white"
              >
                <option value="">Select city</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                WhatsApp / phone *
              </label>
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="+260 or +234"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mt-1">
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Our team reviews every new partner. You'll hear back within 48 hours. Once approved, your listing is live and you can manage everything from your dashboard.
              </p>
            </div>

            <button
              onClick={submit}
              disabled={!canSubmit}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-[16px] transition-all mt-1',
                canSubmit
                  ? 'bg-primary text-white shadow-[0_8px_20px_-6px_rgba(255,90,95,0.45)] active:scale-[0.98]'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              )}
            >
              Submit for review
            </button>
          </>
        )}
      </div>
    </div>
  );
}
