import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ArrowLeft, Clock, Send, Calendar, Check, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/components/SharedUI';
import type { PartnerEvent } from '@/lib/types';
import { PLATFORMS, POST_TYPES, LS_KEYS } from '@/lib/constants';
import { DEMO_EVENT_MAP, DEMO_PARTNER } from '@/lib/demo';

function buildCaption(event: PartnerEvent, venueName: string, postTypeId: string): string {
  const { emoji, name, nextOccurrence: next, price, isFree } = event;
  const spotsLeft = event.spotsTotal > 0 ? event.spotsTotal - event.spotsFilled : null;
  switch (postTypeId) {
    case 'announce':
      return isFree
        ? `${emoji} ${name} — ${next}\n\nFree and open to all. Join us at ${venueName}.\n\nFind us on D8Advisr to add this to your plans. 📍`
        : `${emoji} ${name} is back!\n\n📅 ${next}\n💳 ${price} per person\n📍 ${venueName}\n\nSpots are limited — find us on D8Advisr to plan your visit.`;
    case 'selling_fast':
      return `🎟️ Only ${spotsLeft ?? 'a few'} spots left for ${name} this ${next.split(',')[0]}!\n\n📅 ${next}\n💳 ${price} · ${venueName}\n\nBook now via D8Advisr before it sells out. 🔥`;
    case 'sold_out':
      return `🔴 ${name} is SOLD OUT for ${next.split('·')[0].trim()}.\n\nThank you to everyone who booked! Stay tuned — next occurrence coming soon.\n\nFollow us on D8Advisr for the next available date.`;
    case 'update':
      return `🔄 Update on ${name}:\n\n[Describe what changed — new time, location, etc.]\n\n📅 [New details]\n📍 ${venueName}\n\nApologies for any inconvenience. We'll see you there.`;
    case 'venue_update':
      return `🏛️ Update from ${venueName}:\n\n[Describe the update — new hours, menu, photos, etc.]\n\nFind us on D8Advisr for full details. 📍`;
    default:
      return '';
  }
}

export function PartnerSocialCompose() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const eventId = params.get('event') || 'pe1';

  const event = DEMO_EVENT_MAP[eventId] ?? DEMO_EVENT_MAP['pe1'];
  const venueName = localStorage.getItem(LS_KEYS.partnerName) || DEMO_PARTNER.name;

  const [postTypeId, setPostTypeId] = useState('announce');
  const [caption, setCaption] = useState(() => buildCaption(event, venueName, 'announce'));
  const [selected, setSelected] = useState<string[]>(
    PLATFORMS.filter(p => p.connected).map(p => p.id)
  );
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [posted, setPosted] = useState(false);

  const connectedSelected = selected.filter(id => PLATFORMS.find(p => p.id === id)?.connected);
  const currentPostType = POST_TYPES.find(t => t.id === postTypeId)!;

  const strictestLimit = connectedSelected
    .map(id => PLATFORMS.find(p => p.id === id)?.charLimit ?? Infinity)
    .reduce((a, b) => Math.min(a, b), Infinity);
  const hasLimit = strictestLimit !== Infinity;
  const limitingPlatform = hasLimit
    ? PLATFORMS.find(p => connectedSelected.includes(p.id) && p.charLimit === strictestLimit)
    : null;
  const overLimit = hasLimit && caption.length > strictestLimit;

  const selectPostType = (id: string) => {
    setPostTypeId(id);
    setCaption(buildCaption(event, venueName, id));
  };

  const toggle = (id: string) => {
    const p = PLATFORMS.find(pl => pl.id === id);
    if (!p?.connected) return;
    setSelected(sel => sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id]);
  };

  const canPost = connectedSelected.length > 0 && caption.trim() && !overLimit
    && (!scheduleMode || (scheduleDate && scheduleTime));

  const post = () => {
    setPosted(true);
    setTimeout(() => setLocation('/partner/dashboard'), 1800);
  };

  if (posted) {
    return (
      <div className="flex-1 min-h-0 bg-white flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E8FFF0] flex items-center justify-center text-3xl mb-5">
          {scheduleMode ? '🗓️' : '🚀'}
        </div>
        <p className="font-black text-gray-900 text-[20px]">
          {scheduleMode ? 'Scheduled' : 'Posted'}
        </p>
        <p className="text-gray-500 text-[13px] mt-2 leading-relaxed max-w-[240px]">
          {scheduleMode
            ? `Going out ${scheduleDate} at ${scheduleTime} to ${connectedSelected.length} platform${connectedSelected.length > 1 ? 's' : ''}.`
            : `Live on ${connectedSelected.length} platform${connectedSelected.length > 1 ? 's' : ''}.`}
        </p>
        <div className="mt-5 flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-left">
          <Check size={14} className="text-[#00C851] shrink-0" />
          <p className="text-[12px] text-gray-500 font-medium leading-snug">
            D8 received signal: <span className="font-black text-gray-800">{currentPostType.d8Signal}</span>
          </p>
        </div>
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
        <p className="text-[11px] font-black text-primary tracking-widest uppercase mb-0.5">D8 Partner · Promote</p>
        <h1 className="text-[22px] font-black text-gray-900">Post to socials</h1>
        <p className="text-[13px] text-gray-400 mt-1">Write once. Post to all your connected channels.</p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">

        {/* Event context */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <span className="text-xl shrink-0">{event.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-[14px] leading-tight">{event.name}</p>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{event.next}</p>
          </div>
          {event.isFree
            ? <span className="text-[11px] font-bold text-[#00C851] bg-[#E8FFF0] px-2 py-0.5 rounded-full shrink-0">Free</span>
            : <span className="text-[12px] font-bold text-gray-600 shrink-0">{event.price}</span>
          }
        </div>

        {/* Post type — the only gateway to posting */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-start gap-2">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">What kind of post?</p>
              <p className="text-[11px] text-gray-300 mt-0.5 font-medium">Only event and venue content posts through D8</p>
            </div>
            <Info size={13} className="text-gray-200 shrink-0 mt-0.5" />
          </div>
          <div className="p-3 flex flex-col gap-1.5">
            {POST_TYPES.map(pt => (
              <button
                key={pt.id}
                onClick={() => selectPostType(pt.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] w-full',
                  postTypeId === pt.id
                    ? 'border-gray-800 bg-gray-50'
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                )}
              >
                <span className="text-lg w-7 text-center shrink-0">{pt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-bold text-[13px] leading-tight', postTypeId === pt.id ? 'text-gray-900' : 'text-gray-600')}>
                    {pt.label}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{pt.desc}</p>
                </div>
                {postTypeId === pt.id && (
                  <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* D8 signal indicator */}
          <div className="mx-3 mb-3 flex items-center gap-2 bg-[#F0FFF4] border border-green-100 rounded-xl px-3 py-2.5">
            <div className="w-2 h-2 rounded-full bg-[#00C851] shrink-0" />
            <p className="text-[11px] text-gray-500 font-medium leading-snug">
              D8 receives: <span className="font-black text-gray-800 font-mono">{currentPostType.d8Signal}</span>
              <span className="text-gray-400 font-normal"> · D8 event index updated automatically</span>
            </p>
          </div>
        </div>

        {/* Platforms */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Post to</p>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {PLATFORMS.map(p => {
              const isSelected = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left transition-all w-full',
                    !p.connected
                      ? 'border-gray-100 bg-gray-50 cursor-default opacity-60'
                      : isSelected
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-100 bg-white opacity-40'
                  )}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[11px] shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.short}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-[13px] leading-tight">{p.name}</p>
                    {p.note && <p className="text-[11px] text-gray-400 mt-0.5">{p.note}</p>}
                    {p.charLimit && <p className="text-[11px] text-gray-300 mt-0.5">{p.charLimit.toLocaleString()} char limit</p>}
                  </div>
                  {p.connected ? (
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                      isSelected ? 'border-gray-800 bg-gray-800' : 'border-gray-200'
                    )}>
                      {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-primary border border-primary/30 bg-primary/5 px-2.5 py-1 rounded-full shrink-0">
                      Connect
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Caption */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Caption</p>
            {hasLimit && (
              <span className={cn(
                'text-[11px] font-bold',
                overLimit ? 'text-primary' : caption.length > strictestLimit * 0.85 ? 'text-amber-500' : 'text-gray-300'
              )}>
                {caption.length}/{strictestLimit}
                {limitingPlatform && <span className="font-normal text-gray-300"> · {limitingPlatform.name}</span>}
              </span>
            )}
          </div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={7}
            className={cn(
              'w-full text-[14px] text-gray-800 leading-relaxed resize-none focus:outline-none placeholder:text-gray-300',
              overLimit ? 'text-primary' : ''
            )}
            placeholder="Write your post..."
          />
          {overLimit && (
            <div className="flex items-center gap-2 text-primary text-[12px] font-medium">
              <AlertCircle size={13} />
              {caption.length - strictestLimit} characters over {limitingPlatform?.name}'s limit — shorten or deselect that platform.
            </div>
          )}
          <button
            onClick={() => setCaption(buildCaption(event, venueName, postTypeId))}
            className="text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors text-left pt-1 border-t border-gray-50"
          >
            Reset to template
          </button>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Timing</p>
            <button
              onClick={() => setScheduleMode(m => !m)}
              className={cn(
                'flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full border transition-all',
                scheduleMode
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              <Calendar size={12} /> Schedule
            </button>
          </div>
          {scheduleMode ? (
            <div className="p-4 flex gap-3">
              <div className="flex-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Date</p>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-800 focus:outline-none focus:border-primary transition-all bg-white" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Time</p>
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-800 focus:outline-none focus:border-primary transition-all bg-white" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3.5">
              <Clock size={13} className="text-[#00C851] shrink-0" />
              <span className="text-[13px] text-gray-600 font-medium">Post immediately when you tap send</span>
            </div>
          )}
        </div>

      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 px-5 py-4 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
        <button
          onClick={post}
          disabled={!canPost}
          className={cn(
            'w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all',
            canPost
              ? 'bg-gray-900 text-white active:scale-[0.98] shadow-[0_6px_16px_-4px_rgba(0,0,0,0.3)]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          )}
        >
          {scheduleMode
            ? <><Calendar size={16} /> Schedule post</>
            : <><Send size={16} /> Post to {connectedSelected.length} channel{connectedSelected.length !== 1 ? 's' : ''}</>
          }
        </button>
        {connectedSelected.length === 0 && (
          <p className="text-center text-[11px] text-gray-400 mt-2">Select at least one connected platform</p>
        )}
      </div>
    </div>
  );
}
