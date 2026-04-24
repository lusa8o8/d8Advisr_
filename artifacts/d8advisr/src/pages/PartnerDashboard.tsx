import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Plus, ChevronRight, AlertCircle, CheckCircle,
  Clock, Pause, Users, Edit3, Trash2, Bell, X, Megaphone,
} from 'lucide-react';
import { cn } from '@/components/SharedUI';
import type { PartnerEvent, ListingStatus } from '@/lib/types';
import {
  PLATFORMS,
  LISTING_STATUS_PILL as STATUS_PILL,
  EVENT_STATUS_PILL,
  FREQ_LABEL,
  LS_KEYS,
} from '@/lib/constants';
import { DEMO_PARTNER, DEMO_EVENTS, DEMO_DEMAND, DEMO_MESSAGES } from '@/lib/demo';

function SpotsBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const almostFull = pct >= 80;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-400 font-medium">{filled}/{total} spots filled</span>
        <span className={cn('text-[11px] font-bold', almostFull ? 'text-primary' : 'text-[#00C851]')}>
          {total - filled} left
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', almostFull ? 'bg-primary' : 'bg-[#00C851]')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PartnerDashboard() {
  const [, setLocation] = useLocation();

  // Read from localStorage — fall back to demo seed
  const storedName   = localStorage.getItem(LS_KEYS.partnerName)   || DEMO_PARTNER.name;
  const storedType   = localStorage.getItem(LS_KEYS.partnerType)   || DEMO_PARTNER.type;
  const storedCity   = localStorage.getItem(LS_KEYS.partnerCity)   || DEMO_PARTNER.city;
  const storedStatus = (localStorage.getItem(LS_KEYS.partnerStatus) || DEMO_PARTNER.status) as ListingStatus;

  const [events, setEvents] = useState<PartnerEvent[]>(DEMO_EVENTS);
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const isDemo = !localStorage.getItem(LS_KEYS.partnerName);

  const toggleStatus = (id: string) => {
    setEvents(evts => evts.map(e =>
      e.id === id
        ? { ...e, status: e.status === 'live' ? 'paused' : 'live' }
        : e
    ));
  };

  const publishDraft = (id: string) => {
    setEvents(evts => evts.map(e => e.id === id ? { ...e, status: 'live' } : e));
  };

  const activeMessages = messages.filter(m => !dismissedIds.includes(m.id));

  const typeLabel =
    storedType === 'venue' ? 'Venue' :
    storedType === 'organizer' ? 'Organiser' :
    'Venue & Organiser';

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col overflow-y-auto no-scrollbar pb-10">

      {/* Header */}
      <div className="bg-[#111] px-5 pt-12 pb-5 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setLocation('/home')}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => setLocation('/partner/event/new')}
            className="flex items-center gap-1.5 bg-primary text-white text-[12px] font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
          >
            <Plus size={13} /> Add event
          </button>
        </div>

        <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-0.5">D8 Partner</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-white font-black text-[20px] leading-tight">{storedName}</h1>
            <p className="text-white/50 text-[12px] font-medium mt-0.5">{typeLabel} · {storedCity}</p>
          </div>
          <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 mt-1', STATUS_PILL[storedStatus].color)}>
            {STATUS_PILL[storedStatus].label}
          </span>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">

        {/* Demo notice */}
        {isDemo && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-700 font-medium leading-relaxed">
              You're viewing a demo account. <button onClick={() => { localStorage.removeItem(LS_KEYS.partnerName); setLocation('/partner'); }} className="underline font-bold">Set up your real profile →</button>
            </p>
          </div>
        )}

        {/* Messages from D8 */}
        {activeMessages.length > 0 && (
          <div className="flex flex-col gap-2">
            {activeMessages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'rounded-2xl p-4 flex items-start gap-3 border',
                  msg.type === 'approved' ? 'bg-[#E8FFF0] border-green-200' :
                  msg.type === 'action' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                )}
              >
                {msg.type === 'approved'
                  ? <CheckCircle size={16} className="text-[#00C851] shrink-0 mt-0.5" />
                  : <Bell size={16} className="text-blue-500 shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{msg.date} · From D8</p>
                  <p className="text-[13px] text-gray-700 leading-relaxed font-medium">{msg.text}</p>
                </div>
                <button
                  onClick={() => setDismissedIds(ids => [...ids, msg.id])}
                  className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Demand signals — numbers only, no graphs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">This week</p>
          </div>
          {DEMO_DEMAND.map((sig, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-4 px-4 py-3.5',
                i < DEMO_DEMAND.length - 1 ? 'border-b border-gray-50' : ''
              )}
            >
              <span className="text-[28px] font-black text-gray-900 w-10 text-center leading-none shrink-0">
                {sig.count}
              </span>
              <div>
                <p className="font-semibold text-gray-800 text-[13px] leading-tight">{sig.label}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{sig.context}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Events */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your events</p>
            <button
              onClick={() => setLocation('/partner/event/new')}
              className="text-[12px] font-bold text-primary flex items-center gap-1"
            >
              <Plus size={13} /> New event
            </button>
          </div>

          {events.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-[14px] font-medium">No events yet</p>
              <p className="text-gray-300 text-[12px] mt-1">Add an event to start appearing in user plans</p>
              <button
                onClick={() => setLocation('/partner/event/new')}
                className="mt-4 bg-primary text-white text-[13px] font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 mx-auto active:scale-95 transition-transform"
              >
                <Plus size={14} /> Add your first event
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{event.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-[14px] leading-tight">{event.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                        {FREQ_LABEL[event.frequency]} · {event.category}
                      </p>
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full shrink-0', EVENT_STATUS_PILL[event.status].color)}>
                    {EVENT_STATUS_PILL[event.status].label}
                  </span>
                </div>

                {/* Next occurrence */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <Clock size={12} className="text-gray-300 shrink-0" />
                  <span className="text-[12px] text-gray-500 font-medium">Next: {event.nextOccurrence}</span>
                  <span className="text-gray-300 mx-1">·</span>
                  {event.isFree ? (
                    <span className="text-[11px] font-bold text-[#00C851] bg-[#E8FFF0] px-2 py-0.5 rounded-full">Free</span>
                  ) : (
                    <span className="text-[12px] font-bold text-gray-700">{event.price}</span>
                  )}
                </div>

                {/* Capped event: spots bar */}
                {(event.status === 'live' || event.status === 'paused') && event.spotsTotal > 0 && (
                  <div className="mb-3">
                    <SpotsBar filled={event.spotsFilled} total={event.spotsTotal} />
                  </div>
                )}

                {/* Open event: D8 interest count */}
                {(event.status === 'live' || event.status === 'paused') && event.spotsTotal === 0 && event.interestCount !== undefined && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <Users size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[13px] font-bold text-gray-800">{event.interestCount}</span>
                    <span className="text-[12px] text-gray-400 font-medium">people planning to attend via D8</span>
                  </div>
                )}

                {/* Actions — two rows to avoid overflow on narrow screens */}
                <div className="pt-2 border-t border-gray-50 flex flex-col gap-2">

                  {/* Row 1: primary status actions */}
                  <div className="flex items-center gap-2">
                    {event.status === 'draft' && (
                      <button
                        onClick={() => publishDraft(event.id)}
                        className="flex items-center gap-1.5 bg-primary text-white text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                      >
                        <CheckCircle size={13} /> Publish
                      </button>
                    )}
                    {event.status === 'live' && (
                      <button
                        onClick={() => toggleStatus(event.id)}
                        className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200"
                      >
                        <Pause size={13} /> Pause
                      </button>
                    )}
                    {event.status === 'paused' && (
                      <button
                        onClick={() => toggleStatus(event.id)}
                        className="flex items-center gap-1.5 bg-[#E8FFF0] text-[#00C851] text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                      >
                        <CheckCircle size={13} /> Resume
                      </button>
                    )}
                    {(event.status === 'live' || event.status === 'paused') && (
                      <button
                        onClick={() => setLocation(`/partner/social/compose?event=${event.id}`)}
                        className="flex items-center gap-1.5 bg-gray-900 text-white text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-800"
                      >
                        <Megaphone size={13} /> Promote
                      </button>
                    )}
                  </div>

                  {/* Row 2: management actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLocation(`/partner/event/${event.id}/edit`)}
                      className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    {event.spotsTotal > 0 && (
                      <button className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200">
                        <Users size={13} /> Attendees
                      </button>
                    )}
                    {event.spotsTotal === 0 && event.interestCount !== undefined && (
                      <button className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200">
                        <Users size={13} /> {event.interestCount} going
                      </button>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channels */}
        {(() => {
          const connected    = PLATFORMS.filter(c => c.connected);
          const disconnected = PLATFORMS.filter(c => !c.connected);
          return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Social channels</p>
                <span className="text-[11px] font-bold text-[#00C851]">{connected.length} connected</span>
              </div>

              {/* Connected */}
              <div className="px-4 pt-3 pb-2">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2">Connected</p>
                <div className="flex flex-wrap gap-2">
                  {connected.map(ch => (
                    <div key={ch.id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-[10px] shrink-0"
                        style={{ backgroundColor: ch.color }}
                      >
                        {ch.short}
                      </div>
                      <span className="text-[12px] font-semibold text-gray-700">{ch.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Not connected */}
              <div className="px-4 pt-1 pb-3 border-t border-gray-50 mt-2">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2 mt-2">Not connected</p>
                <div className="flex flex-wrap gap-2">
                  {disconnected.map(ch => (
                    <button
                      key={ch.id}
                      className="flex items-center gap-2 bg-white border border-dashed border-gray-200 rounded-xl px-3 py-2 hover:border-gray-300 transition-colors active:scale-[0.97]"
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-[10px] shrink-0 opacity-50"
                        style={{ backgroundColor: ch.color }}
                      >
                        {ch.short}
                      </div>
                      <span className="text-[12px] font-semibold text-gray-400">{ch.name}</span>
                      <span className="text-[10px] font-bold text-primary">+ Connect</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-50">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Post to connected channels directly from each event. No need to open another app.
                </p>
              </div>
            </div>
          );
        })()}

        {/* Listing management */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your listing</p>
          </div>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors active:bg-gray-100"
            onClick={() => setLocation('/partner/venue/edit')}
          >
            <div>
              <p className="font-semibold text-gray-800 text-[13px]">Edit venue details</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Name, hours, address, photos, contact</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-gray-50 hover:bg-gray-50 transition-colors active:bg-gray-100"
            onClick={() => setLocation('/partner/event/new')}
          >
            <div>
              <p className="font-semibold text-gray-800 text-[13px]">Add a recurring activity</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Jazz night, brunch, fitness class — propagates automatically</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-gray-50 hover:bg-gray-50 transition-colors active:bg-gray-100 text-red-500"
            onClick={() => {
              if (confirm('Remove your D8 partner account?')) {
                localStorage.removeItem('d8_partner_name');
                localStorage.removeItem('d8_partner_type');
                localStorage.removeItem('d8_partner_city');
                localStorage.removeItem('d8_partner_contact');
                localStorage.removeItem('d8_partner_status');
                setLocation('/partner');
              }
            }}
          >
            <p className="font-semibold text-[13px]">Leave partner programme</p>
            <Trash2 size={15} />
          </button>
        </div>

      </div>
    </div>
  );
}
