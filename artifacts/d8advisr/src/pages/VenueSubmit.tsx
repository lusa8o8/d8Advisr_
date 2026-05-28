import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Building2, Calendar, ChevronRight, Check,
  Repeat, Send, MapPin, Phone, Globe, Info,
} from 'lucide-react';
import { cn } from '@/components/SharedUI';

type SubmissionType = 'venue' | 'event' | null;
type EventFrequency = 'one-off' | 'recurring' | 'annual';
type Step = 'choose' | 'form' | 'success';

const VENUE_CATEGORIES = [
  'Dining & Restaurant', 'Bar & Lounge', 'Rooftop & Terrace',
  'Outdoor & Park', 'Cinema & Theatre', 'Sports & Recreation',
  'Faith-based Space', 'Community Hall', 'Hotel & Resort', 'Other',
];

const EVENT_CATEGORIES = [
  'Concert & Live Music', 'Sports Match', 'Food & Drink Market',
  'Workshop & Class', 'Faith-based Event', 'Social & Mixer',
  'Fitness & Wellness', 'Cultural & Arts', 'Annual Festival', 'Other',
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FREQ_OPTIONS: { value: EventFrequency; label: string; desc: string; icon: string }[] = [
  { value: 'one-off', label: 'One-off', desc: 'Single specific date', icon: '📅' },
  { value: 'recurring', label: 'Recurring', desc: 'Repeats weekly or monthly', icon: '🔄' },
  { value: 'annual', label: 'Annual', desc: 'Happens once a year', icon: '🗓️' },
];

const INPUT = "w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all";
const LABEL = "block text-[12px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider";
const SECTION = "bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4";

export function VenueSubmit() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>('choose');
  const [type, setType] = useState<SubmissionType>(null);

  // Venue form state
  const [vName, setVName] = useState('');
  const [vCategory, setVCategory] = useState('');
  const [vCity, setVCity] = useState('');
  const [vAddress, setVAddress] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vWebsite, setVWebsite] = useState('');
  const [vCapacity, setVCapacity] = useState('');
  const [vAbout, setVAbout] = useState('');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');

  // Event form state
  const [eName, setEName] = useState('');
  const [eCategory, setECategory] = useState('');
  const [eFreq, setEFreq] = useState<EventFrequency>('one-off');
  const [eDay, setEDay] = useState('');
  const [eDate, setEDate] = useState('');
  const [eTime, setETime] = useState('');
  const [eVenue, setEVenue] = useState('');
  const [ePrice, setEPrice] = useState('');
  const [eCapacity, setECapacity] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eOrganizer, setEOrganizer] = useState('');
  const [ePhone, setEPhone] = useState('');

  const choose = (t: SubmissionType) => {
    setType(t);
    setStep('form');
  };

  const submit = () => setStep('success');

  if (step === 'success') {
    return (
      <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-[#E8FFF0] flex items-center justify-center text-4xl mb-6 shadow-sm">
          ✅
        </div>
        <h1 className="text-[24px] font-black text-gray-900 mb-3">Submission received!</h1>
        <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
          Our team will review your {type === 'venue' ? 'venue' : 'event'} and get back to you within 48 hours. 
          Once approved, it will appear on D8Advisr for thousands of planners.
        </p>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm w-full mb-6 text-left">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">What happens next</p>
          {[
            'D8 team reviews your submission',
            'We may reach out for more details',
            'Listing goes live after approval',
            type === 'venue' ? 'You get access to a partner dashboard' : 'Your event appears in user plans',
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-[13px] text-gray-600 font-medium">{s}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => setLocation('/home')}
          className="w-full bg-primary text-white rounded-xl font-bold text-[16px] py-4 shadow-[0_8px_20px_-6px_rgba(255,90,95,0.4)] active:scale-[0.98] transition-all"
        >
          Back to Discover
        </button>
        <button
          onClick={() => { setStep('choose'); setType(null); }}
          className="mt-3 text-gray-400 font-semibold text-[14px] py-2"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col overflow-y-auto no-scrollbar pb-28">

      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100 shrink-0 shadow-sm">
        <button
          onClick={() => step === 'form' ? setStep('choose') : setLocation('/home')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-4 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">Partner with D8Advisr</p>
        <h1 className="text-[22px] font-black text-gray-900 leading-tight">
          {step === 'choose' ? 'List your venue or event' : type === 'venue' ? 'Venue details' : 'Event details'}
        </h1>
        <p className="text-[13px] text-gray-400 mt-1">
          {step === 'choose'
            ? 'Get discovered by thousands of date planners in Lagos and Lusaka'
            : 'Fill in the details below — our team reviews every submission'}
        </p>
      </div>

      {/* ── CHOOSE STEP ── */}
      {step === 'choose' && (
        <div className="px-5 pt-6 flex flex-col gap-4">

          <div className="bg-[#FFF0F1] rounded-2xl p-4 border border-[#FFD5D6] flex items-start gap-3">
            <Info size={16} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[13px] text-primary/80 font-medium leading-relaxed">
              D8Advisr is free for users. We earn from micro-fees on plan conversions, not from charging you. Your listing helps us both grow.
            </p>
          </div>

          <button
            onClick={() => choose('venue')}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FFF0F1] flex items-center justify-center text-2xl shrink-0">🏛️</div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-[16px] leading-tight">Register a Venue</p>
              <p className="text-[13px] text-gray-400 mt-0.5">Restaurants, bars, rooftops, parks, halls</p>
              <div className="flex gap-2 mt-2.5 flex-wrap">
                {['Free listing', 'Verified badge', 'Partner dashboard'].map(t => (
                  <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF0F1] text-primary">{t}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300 shrink-0" />
          </button>

          <button
            onClick={() => choose('event')}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">🎟️</div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-[16px] leading-tight">Submit an Event</p>
              <p className="text-[13px] text-gray-400 mt-0.5">One-off, recurring, or annual activities</p>
              <div className="flex gap-2 mt-2.5 flex-wrap">
                {['Concerts', 'Jazz nights', 'Marathons', 'Markets', 'More'].map(t => (
                  <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{t}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300 shrink-0" />
          </button>

          <p className="text-center text-[12px] text-gray-400 font-medium pt-2">
            All submissions are manually reviewed by the D8 team before going live.
          </p>
        </div>
      )}

      {/* ── VENUE FORM ── */}
      {step === 'form' && type === 'venue' && (
        <div className="px-5 pt-6 flex flex-col gap-4">

          <div className={SECTION}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Venue info</p>
            <div>
              <label className={LABEL}>Venue name *</label>
              <input value={vName} onChange={e => setVName(e.target.value)} placeholder="e.g. Bo Jangles Restaurant" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Category *</label>
              <select value={vCategory} onChange={e => setVCategory(e.target.value)} className={INPUT}>
                <option value="">Select a category</option>
                {VENUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>City *</label>
              <select value={vCity} onChange={e => setVCity(e.target.value)} className={INPUT}>
                <option value="">Select city</option>
                <option>Lagos, Nigeria</option>
                <option>Lusaka, Zambia</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Address *</label>
              <input value={vAddress} onChange={e => setVAddress(e.target.value)} placeholder="Street address or landmark" className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Capacity</label>
                <input value={vCapacity} onChange={e => setVCapacity(e.target.value)} placeholder="e.g. 80 guests" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Phone / WhatsApp *</label>
                <input value={vPhone} onChange={e => setVPhone(e.target.value)} placeholder="+234 or +260" className={INPUT} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Website / Instagram (optional)</label>
              <input value={vWebsite} onChange={e => setVWebsite(e.target.value)} placeholder="instagram.com/yourvenue" className={INPUT} />
            </div>
          </div>

          <div className={SECTION}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">What makes this venue special?</p>
            <textarea
              value={vAbout}
              onChange={e => setVAbout(e.target.value)}
              placeholder="Describe the atmosphere, what it's best for, any unique features..."
              rows={4}
              className={cn(INPUT, "resize-none")}
            />
          </div>

          <div className={SECTION}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Your contact details</p>
            <div>
              <label className={LABEL}>Your name *</label>
              <input value={vContact} onChange={e => setVContact(e.target.value)} placeholder="Full name" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Email address *</label>
              <input type="email" value={vEmail} onChange={e => setVEmail(e.target.value)} placeholder="you@example.com" className={INPUT} />
            </div>
          </div>
        </div>
      )}

      {/* ── EVENT FORM ── */}
      {step === 'form' && type === 'event' && (
        <div className="px-5 pt-6 flex flex-col gap-4">

          <div className={SECTION}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Event info</p>
            <div>
              <label className={LABEL}>Event name *</label>
              <input value={eName} onChange={e => setEName(e.target.value)} placeholder="e.g. Jazz Night at Bo Jangles" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Category *</label>
              <select value={eCategory} onChange={e => setECategory(e.target.value)} className={INPUT}>
                <option value="">Select a category</option>
                {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Frequency */}
          <div className={SECTION}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">How often does this happen?</p>
            <div className="flex flex-col gap-2">
              {FREQ_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setEFreq(f.value)}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98]",
                    eFreq === f.value ? "border-primary bg-[#FFF0F1]" : "border-gray-100 bg-white"
                  )}
                >
                  <span className="text-xl">{f.icon}</span>
                  <div className="flex-1">
                    <p className={cn("font-bold text-[14px]", eFreq === f.value ? "text-primary" : "text-gray-800")}>{f.label}</p>
                    <p className="text-[12px] text-gray-400">{f.desc}</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    eFreq === f.value ? "border-primary bg-primary" : "border-gray-300"
                  )}>
                    {eFreq === f.value && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date / time */}
          <div className={SECTION}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">When</p>
            {eFreq === 'recurring' ? (
              <div>
                <label className={LABEL}>Which day of the week? *</label>
                <select value={eDay} onChange={e => setEDay(e.target.value)} className={INPUT}>
                  <option value="">Select a day</option>
                  {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className={LABEL}>{eFreq === 'annual' ? 'Month & day (e.g. March 15)' : 'Date *'}</label>
                <input
                  type={eFreq === 'one-off' ? 'date' : 'text'}
                  value={eDate}
                  onChange={e => setEDate(e.target.value)}
                  placeholder={eFreq === 'annual' ? 'e.g. March 15' : ''}
                  className={INPUT}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Start time *</label>
                <input type="time" value={eTime} onChange={e => setETime(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Price per person</label>
                <input value={ePrice} onChange={e => setEPrice(e.target.value)} placeholder="Free or ₦ / K amount" className={INPUT} />
              </div>
            </div>
          </div>

          {/* Venue & capacity */}
          <div className={SECTION}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Location</p>
            <div>
              <label className={LABEL}>Venue name or address *</label>
              <input value={eVenue} onChange={e => setEVenue(e.target.value)} placeholder="Where is this happening?" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Max capacity (spots available)</label>
              <input value={eCapacity} onChange={e => setECapacity(e.target.value)} placeholder="e.g. 150 people" className={INPUT} />
            </div>
          </div>

          {/* Description */}
          <div className={SECTION}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Tell us more</p>
            <textarea
              value={eDesc}
              onChange={e => setEDesc(e.target.value)}
              placeholder="What can attendees expect? What makes this event worth attending?"
              rows={4}
              className={cn(INPUT, "resize-none")}
            />
          </div>

          {/* Organiser */}
          <div className={SECTION}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Organiser details</p>
            <div>
              <label className={LABEL}>Organiser / brand name *</label>
              <input value={eOrganizer} onChange={e => setEOrganizer(e.target.value)} placeholder="Your name or organisation" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>WhatsApp / phone *</label>
              <input value={ePhone} onChange={e => setEPhone(e.target.value)} placeholder="+234 or +260" className={INPUT} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom CTA (form step only) */}
      {step === 'form' && (
        <div className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 px-5 py-5 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
          <button
            onClick={submit}
            className="w-full bg-primary text-white rounded-xl font-bold text-[16px] py-4 shadow-[0_8px_20px_-6px_rgba(255,90,95,0.45)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Send size={17} /> Submit for review
          </button>
          <p className="text-center text-[11px] text-gray-400 font-medium mt-3">
            Our team reviews every submission — typically within 48 hours
          </p>
        </div>
      )}
    </div>
  );
}
