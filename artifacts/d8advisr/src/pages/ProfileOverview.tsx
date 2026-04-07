import { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import { Settings, Heart, Star, Award, ChevronRight, Camera, X } from 'lucide-react';
import { BottomNav } from "@/components/SharedUI";

const AVATARS = [
  { id: "romantic",    emoji: "🥰", label: "Romantic"     },
  { id: "cool",        emoji: "😎", label: "Cool"         },
  { id: "excited",     emoji: "🤩", label: "Excited"      },
  { id: "rose",        emoji: "🌹", label: "Rose"         },
  { id: "free-spirit", emoji: "🦋", label: "Free Spirit"  },
  { id: "night-owl",   emoji: "🌙", label: "Night Owl"    },
  { id: "foodie",      emoji: "🍕", label: "Foodie"       },
  { id: "adventurer",  emoji: "🎭", label: "Adventurer"   },
  { id: "sparkle",     emoji: "✨", label: "Sparkle"      },
];

export function ProfileOverview() {
  const [, setLocation] = useLocation();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('d8advisr_avatar');
    if (saved) setAvatar(saved);
  }, []);

  function selectAvatar(id: string | null) {
    setAvatar(id);
    if (id) localStorage.setItem('d8advisr_avatar', id);
    else localStorage.removeItem('d8advisr_avatar');
    setShowPicker(false);
  }

  const currentAvatar = AVATARS.find(a => a.id === avatar);

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
            {/* Avatar with edit button */}
            <div className="relative -mt-16 mb-4">
              <button
                onClick={() => setShowPicker(true)}
                className="group w-24 h-24 rounded-full border-4 border-white shadow-md flex items-center justify-center overflow-hidden bg-[#FFE8E8] transition-opacity active:opacity-80"
              >
                {currentAvatar ? (
                  <span className="text-5xl">{currentAvatar.emoji}</span>
                ) : (
                  <span className="text-primary text-3xl font-bold">AJ</span>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                  <Camera size={22} className="text-white" />
                </div>
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className="absolute bottom-0.5 right-0.5 w-7 h-7 bg-primary rounded-full border-2 border-white flex items-center justify-center shadow-sm"
              >
                <Camera size={13} className="text-white" />
              </button>
            </div>

            <h2 className="text-[22px] font-bold text-foreground">Alex Johnson</h2>
            {currentAvatar && (
              <p className="text-xs font-semibold text-primary mt-0.5">{currentAvatar.label}</p>
            )}
            <p className="text-sm text-muted-foreground mb-6 font-medium mt-1">Member since Jan 2024</p>

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
              <button onClick={() => setLocation('/profile/badges')} className="text-sm font-semibold text-primary">View All</button>
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

      {/* Avatar Picker Bottom Sheet */}
      {showPicker && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPicker(false)}
          />
          {/* Sheet */}
          <div className="relative bg-card rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[18px] font-bold text-foreground">Choose your avatar</h3>
              <button
                onClick={() => setShowPicker(false)}
                className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Pick one that fits your vibe</p>

            {/* 3×3 grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => selectAvatar(a.id)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all active:scale-95 ${
                    avatar === a.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-background hover:border-gray-300'
                  }`}
                >
                  <span className="text-4xl">{a.emoji}</span>
                  <span className={`text-[11px] font-bold ${avatar === a.id ? 'text-primary' : 'text-muted-foreground'}`}>
                    {a.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Keep initials option */}
            <button
              onClick={() => selectAvatar(null)}
              className={`w-full py-3.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                !avatar
                  ? 'border-foreground bg-foreground text-card'
                  : 'border-border text-muted-foreground hover:border-gray-300'
              }`}
            >
              Use my initials (AJ)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
