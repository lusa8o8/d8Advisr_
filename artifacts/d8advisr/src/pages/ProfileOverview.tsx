import { useLocation } from "wouter";
import { Settings, Heart, Star, Award, ChevronRight } from 'lucide-react';
import { BottomNav } from "@/components/SharedUI";

export function ProfileOverview() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-background">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-28">
        {/* Header Banner */}
        <div className="bg-primary px-6 pt-14 pb-20 relative text-primary-foreground rounded-b-[40px] shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold">Profile</h1>
            <button 
              onClick={() => setLocation('/profile/preferences')}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Profile Card (Overlapping) */}
        <div className="px-6 -mt-16 mb-8 relative z-10">
          <div className="bg-card rounded-3xl p-6 shadow-lg border border-border flex flex-col items-center">
            <div className="w-24 h-24 bg-[#FFE8E8] text-primary rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md -mt-16 mb-4">
              AJ
            </div>
            <h2 className="text-[22px] font-bold text-foreground">Alex Johnson</h2>
            <p className="text-sm text-muted-foreground mb-6 font-medium">Member since Jan 2024</p>

            <div className="w-full grid grid-cols-3 gap-2 border-t border-border pt-5">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-foreground">12</span>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center mt-1">Plans<br/>Created</span>
              </div>
              <div className="flex flex-col items-center border-l border-r border-border">
                <span className="text-2xl font-black text-foreground">8</span>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center mt-1">Dates<br/>Done</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-[#00C851]">$240</span>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center mt-1">Budget<br/>Saved</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Badges */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-[17px] font-bold text-foreground">Badges</h3>
              <span className="text-sm font-semibold text-primary">View All</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              <div className="bg-card min-w-[85px] h-[85px] rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm border border-border">
                <span className="text-3xl">🔥</span>
                <span className="text-[11px] font-bold text-foreground">Streak x3</span>
              </div>
              <div className="bg-card min-w-[85px] h-[85px] rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm border border-border">
                <span className="text-3xl">🍕</span>
                <span className="text-[11px] font-bold text-foreground">Foodie</span>
              </div>
              <div className="bg-card min-w-[85px] h-[85px] rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm border border-border">
                <span className="text-3xl">💰</span>
                <span className="text-[11px] font-bold text-foreground">Saver</span>
              </div>
              <div className="bg-background min-w-[85px] h-[85px] rounded-2xl flex flex-col items-center justify-center gap-1.5 border border-dashed border-gray-300 opacity-60">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mb-0.5">
                  <Award size={14} />
                </div>
                <span className="text-[11px] font-medium text-gray-500">Locked</span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="bg-card rounded-3xl p-2 shadow-sm border border-border mb-10">
            <button 
              onClick={() => setLocation('/profile/preferences')}
              className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-background transition-colors rounded-t-2xl"
            >
              <div className="flex items-center gap-4 text-foreground">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-muted-foreground border border-border">
                  <Heart size={18} />
                </div>
                <span className="font-semibold text-[16px]">My Preferences</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            <button 
              onClick={() => setLocation('/profile/budget')}
              className="w-full flex items-center justify-between p-4 hover:bg-background transition-colors rounded-b-2xl"
            >
              <div className="flex items-center gap-4 text-foreground">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-[#00C851] border border-border">
                  <span className="font-bold text-[18px]">$</span>
                </div>
                <span className="font-semibold text-[16px]">Budget & Sinking Fund</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Recent Plans */}
          <div>
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-[17px] font-bold text-foreground">Recent Plans</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation('/plan/1')}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF0F1] text-2xl flex items-center justify-center border border-primary/10">🍷</div>
                  <div>
                    <h4 className="font-bold text-foreground text-[16px]">Downtown Romance</h4>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                      <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                      <span className="font-bold text-foreground">5.0</span>
                      <span>• Oct 12</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </div>

              <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#F0F8FF] text-2xl flex items-center justify-center border border-blue-100">🎳</div>
                  <div>
                    <h4 className="font-bold text-foreground text-[16px]">Friday Fun</h4>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                      <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                      <span className="font-bold text-foreground">4.0</span>
                      <span>• Sep 28</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
