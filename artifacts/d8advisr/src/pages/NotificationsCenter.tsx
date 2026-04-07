import { useState } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, AlertCircle, Star, Users, MapPin, Check, Ticket, BellOff } from 'lucide-react';

export function NotificationsCenter() {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState<string[]>([]);

  function dismiss(id: string) {
    setDismissed(v => [...v, id]);
  }

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-card px-6 pt-14 pb-4 sticky top-0 z-20 shadow-sm border-b border-border">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-foreground text-xl">Notifications</h1>
          </div>
          <button className="text-primary font-bold text-sm hover:opacity-80">Mark all read</button>
        </div>
      </div>

      <div className="flex flex-col pb-10">
        <h2 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider px-6 py-5">Today</h2>
        
        {/* Urgent / Plan tonight */}
        <div className="bg-[#FFF0F1] border-l-4 border-primary px-6 py-5 flex gap-4 items-start relative cursor-pointer hover:bg-[#ffe5e6] transition-colors">
          <div className="w-2.5 h-2.5 rounded-full bg-primary absolute right-6 top-7 shadow-sm"></div>
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary shadow-sm shrink-0 border border-primary/10">
            <Calendar size={20} strokeWidth={2.5} />
          </div>
          <div className="pr-6">
            <p className="font-extrabold text-foreground text-[16px] leading-tight mb-1.5">Your date is tonight!</p>
            <p className="text-[14px] text-muted-foreground font-medium mb-2 leading-snug">Downtown Romance starts at 7:00 PM at Lumina Restaurant.</p>
            <span className="text-xs text-primary font-bold">2 hours ago</span>
          </div>
        </div>

        {/* Vibe-matched event — Jazz Night */}
        {!dismissed.includes('jazz') && (
          <div className="bg-amber-50 border-l-4 border-amber-400 border-b border-b-amber-100 px-6 py-5 flex gap-4 items-start relative cursor-pointer hover:bg-amber-100/50 transition-colors">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 absolute right-6 top-7 shadow-sm"></div>
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-amber-500 shadow-sm shrink-0 border border-amber-200 text-2xl">
              🎷
            </div>
            <div className="pr-6 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-extrabold text-foreground text-[16px] leading-tight mb-0.5">Matches your Romantic vibe</p>
                  <p className="text-[14px] text-muted-foreground font-medium mb-2 leading-snug">
                    <span className="font-bold text-foreground">Jazz & Wine Night</span> at Lumina — Fri, Oct 18 · 7:30 PM · Only 8 spots left.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setLocation('/venue/1')}
                  className="flex items-center gap-1.5 bg-amber-500 text-white text-[12px] font-bold px-3.5 py-2 rounded-xl shadow-sm active:scale-95 transition-transform"
                >
                  <Ticket size={12} /> View Event
                </button>
                <button
                  onClick={() => dismiss('jazz')}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground px-3 py-2 rounded-xl border border-border bg-white active:scale-95 transition-transform"
                >
                  <BellOff size={12} /> Not for me
                </button>
              </div>
              <span className="text-xs text-amber-600 font-bold mt-2 inline-block">4 hours ago</span>
            </div>
          </div>
        )}

        {/* Vibe-matched event — Rooftop Cinema */}
        {!dismissed.includes('cinema') && (
          <div className="bg-sky-50 border-l-4 border-sky-400 border-b border-b-sky-100 px-6 py-5 flex gap-4 items-start relative cursor-pointer hover:bg-sky-100/50 transition-colors">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 absolute right-6 top-7 shadow-sm"></div>
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-sky-200 text-2xl">
              🎬
            </div>
            <div className="pr-6 flex-1">
              <p className="font-extrabold text-foreground text-[16px] leading-tight mb-0.5">Matches your Date Night vibe</p>
              <p className="text-[14px] text-muted-foreground font-medium mb-2 leading-snug">
                <span className="font-bold text-foreground">Rooftop Cinema: La La Land</span> — Sat, Oct 19 · 9:00 PM · Midtown rooftop venue · $18/pp.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setLocation('/plan/generate')}
                  className="flex items-center gap-1.5 bg-sky-500 text-white text-[12px] font-bold px-3.5 py-2 rounded-xl shadow-sm active:scale-95 transition-transform"
                >
                  <Ticket size={12} /> Add to Plan
                </button>
                <button
                  onClick={() => dismiss('cinema')}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground px-3 py-2 rounded-xl border border-border bg-white active:scale-95 transition-transform"
                >
                  <BellOff size={12} /> Not for me
                </button>
              </div>
              <span className="text-xs text-sky-600 font-bold mt-2 inline-block">6 hours ago</span>
            </div>
          </div>
        )}

        {/* Partner accepted */}
        <div className="bg-card border-b border-border px-6 py-5 flex gap-4 items-start relative cursor-pointer hover:bg-background transition-colors">
          <div className="w-12 h-12 rounded-full bg-[#E8FFF0] flex items-center justify-center text-[#00C851] shrink-0 border border-[#00C851]/20">
            <Check size={20} strokeWidth={3} />
          </div>
          <div className="pr-6">
            <p className="font-medium text-foreground text-[16px] mb-1.5">
              <span className="font-extrabold">Sarah</span> accepted the plan
            </p>
            <p className="text-[14px] text-muted-foreground font-medium">Saturday Night Out is confirmed.</p>
            <span className="text-xs text-gray-400 font-bold mt-2 inline-block">5 hours ago</span>
          </div>
        </div>

        {/* Budget alert */}
        <div className="bg-card border-b border-border px-6 py-5 flex gap-4 items-start relative cursor-pointer hover:bg-background transition-colors">
          <div className="w-12 h-12 rounded-full bg-[#FFF3E8] flex items-center justify-center text-[#FF9500] shrink-0 border border-[#FF9500]/20">
            <AlertCircle size={22} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-extrabold text-foreground text-[16px] mb-1.5">Budget Alert</p>
            <p className="text-[14px] text-muted-foreground font-medium">You've used 80% of your October date budget.</p>
            <span className="text-xs text-gray-400 font-bold mt-2 inline-block">8 hours ago</span>
          </div>
        </div>

        <h2 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider px-6 py-5 mt-2 bg-background border-t border-b border-border">Earlier this week</h2>

        {/* Rate last date */}
        <div className="bg-card border-b border-border px-6 py-5 flex gap-4 items-start relative cursor-pointer hover:bg-background transition-colors">
          <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-foreground shrink-0 shadow-sm">
            <Star size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-extrabold text-foreground text-[16px] mb-1.5">Rate your last date!</p>
            <p className="text-[14px] text-muted-foreground font-medium mb-3">How was your time at The Jazz Corner?</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setLocation('/feedback'); }}
              className="bg-background px-5 py-2.5 rounded-xl text-sm font-bold text-foreground border border-border shadow-sm hover:border-gray-400 transition-colors"
            >
              Leave Review
            </button>
            <span className="text-xs text-gray-400 font-bold mt-3 block">2 days ago</span>
          </div>
        </div>

        {/* Social */}
        <div className="bg-card border-b border-border px-6 py-5 flex gap-4 items-start relative cursor-pointer hover:bg-background transition-colors">
          <div className="w-12 h-12 rounded-full bg-[#E8F4FF] flex items-center justify-center text-[#007AFF] shrink-0 border border-blue-200">
            <Users size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-medium text-foreground text-[16px] mb-1.5">
              <span className="font-extrabold">Mike R.</span> added you to a group
            </p>
            <p className="text-[14px] text-muted-foreground font-medium">"Ski Trip Planning" group was created.</p>
            <span className="text-xs text-gray-400 font-bold mt-2 inline-block">3 days ago</span>
          </div>
        </div>

        {/* System */}
        <div className="bg-card border-b border-border px-6 py-5 flex gap-4 items-start relative opacity-70">
          <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground shrink-0">
            <MapPin size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-foreground text-[16px] mb-1.5">New venues near you</p>
            <p className="text-[14px] text-muted-foreground font-medium">Check out 5 new spots added in Downtown.</p>
            <span className="text-xs text-gray-400 font-bold mt-2 inline-block">4 days ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
