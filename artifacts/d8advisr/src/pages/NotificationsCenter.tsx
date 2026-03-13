import { useLocation } from "wouter";
import { ArrowLeft, Calendar, AlertCircle, Star, Users, MapPin, Check } from 'lucide-react';

export function NotificationsCenter() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 bg-background flex flex-col relative overflow-y-auto no-scrollbar">
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
        
        {/* Urgent / Alert */}
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

        {/* Success */}
        <div className="bg-card border-b border-border px-6 py-5 flex gap-4 items-start relative cursor-pointer hover:bg-background transition-colors">
          <div className="w-2.5 h-2.5 rounded-full bg-primary absolute right-6 top-7 shadow-sm"></div>
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

        {/* Warning */}
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

        {/* Action needed */}
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

        {/* System/Info */}
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
