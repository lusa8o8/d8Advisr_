import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Check, Send } from 'lucide-react';
import { cn } from '@/components/SharedUI';

type Frequency = 'one-off' | 'weekly' | 'monthly' | 'annual';

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

export function PartnerEventEditor() {
  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [weekday, setWeekday] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<'draft' | 'live'>('draft');

  const canSave = name.trim() && category && time && (
    frequency === 'one-off' ? date : frequency === 'weekly' ? weekday : true
  );

  const save = () => {
    setSaved(true);
    setTimeout(() => setLocation('/partner/dashboard'), 1200);
  };

  if (saved) {
    return (
      <div className="flex-1 min-h-0 bg-white flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E8FFF0] flex items-center justify-center text-3xl mb-5">✅</div>
        <p className="font-black text-gray-900 text-[20px]">
          {status === 'live' ? 'Event published' : 'Draft saved'}
        </p>
        <p className="text-gray-400 text-[13px] mt-2">
          {status === 'live' ? 'It\'s now appearing in D8Advisr.' : 'You can publish it from your dashboard.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col overflow-y-auto no-scrollbar pb-32">

      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100 shrink-0">
        <button
          onClick={() => setLocation('/partner/dashboard')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-4 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-[11px] font-black text-primary tracking-widest uppercase mb-0.5">D8 Partner</p>
        <h1 className="text-[22px] font-black text-gray-900">New event</h1>
        <p className="text-[13px] text-gray-400 mt-1">Saved events go live immediately or sit as a draft — your choice.</p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">

        {/* Basics */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider -mb-1">Event details</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Start time *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Price per person</label>
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Free or K/₦ amount" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Max capacity</label>
            <input value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g. 60 guests" className={INPUT} />
          </div>
        </div>

      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 px-5 py-4 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] flex flex-col gap-2">
        <button
          onClick={() => { setStatus('live'); save(); }}
          disabled={!canSave}
          className={cn(
            'w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all',
            canSave
              ? 'bg-primary text-white shadow-[0_6px_16px_-4px_rgba(255,90,95,0.45)] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          )}
        >
          <Send size={16} /> Publish now
        </button>
        <button
          onClick={() => { setStatus('draft'); save(); }}
          disabled={!name.trim()}
          className={cn(
            'w-full py-3 rounded-xl font-bold text-[14px] transition-all',
            name.trim() ? 'bg-gray-100 text-gray-600 active:scale-[0.98] hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          )}
        >
          Save as draft
        </button>
      </div>
    </div>
  );
}
