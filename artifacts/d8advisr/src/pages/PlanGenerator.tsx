import { useState } from 'react';
import { useLocation } from "wouter";
import { TopBar, BottomNav, cn } from "@/components/SharedUI";

export function PlanGenerator() {
  const [, setLocation] = useLocation();
  const [type, setType] = useState<'solo'|'group'>('solo');
  const [occasion, setOccasion] = useState('Date Night');
  const [mood, setMood] = useState('Romantic');
  
  return (
    <div className="flex-1 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      <TopBar />

      <div className="px-6 py-4">
        <h1 className="text-[32px] font-bold text-foreground leading-tight mb-6">Build Your Plan ✨</h1>

        {/* Toggle */}
        <div className="flex bg-card p-1 rounded-full shadow-sm border border-border mb-8">
          <button 
            onClick={() => setType('solo')}
            className={cn(
              "flex-1 py-3 rounded-full text-sm font-bold transition-all",
              type === 'solo' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Solo Date
          </button>
          <button 
            onClick={() => setType('group')}
            className={cn(
              "flex-1 py-3 rounded-full text-sm font-bold transition-all",
              type === 'group' ? "bg-foreground text-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Group Plan
          </button>
        </div>

        <div className="flex flex-col gap-8">
          {/* Occasion */}
          <div>
            <h3 className="font-bold text-foreground mb-3 text-[15px]">Occasion</h3>
            <div className="flex flex-wrap gap-2.5">
              {['Date Night', 'First Date', 'Anniversary', 'Casual', 'Celebration'].map(item => (
                <button
                  key={item}
                  onClick={() => setOccasion(item)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95",
                    occasion === item 
                      ? "bg-foreground text-card shadow-md" 
                      : "bg-card border border-border text-foreground hover:border-gray-300"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <h3 className="font-bold text-foreground mb-3 text-[15px]">Vibe / Mood</h3>
            <div className="flex flex-wrap gap-2.5">
              {['Romantic', 'Fun', 'Adventure', 'Relaxing', 'Cultural'].map(item => (
                <button
                  key={item}
                  onClick={() => setMood(item)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95",
                    mood === item 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" 
                      : "bg-card border border-border text-foreground hover:border-gray-300"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground text-[15px]">Details</h3>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">When</label>
                <input type="date" className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary" defaultValue="2025-10-14" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Time</label>
                <input type="time" className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary" defaultValue="19:00" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Max Budget (Total)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold">$</span>
                <input type="number" placeholder="150" className="w-full bg-card border border-border rounded-xl pl-8 pr-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary" defaultValue={150} />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Neighborhood / City</label>
              <input type="text" placeholder="e.g. Downtown" className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary" defaultValue="Downtown" />
            </div>
          </div>
        </div>

        <button 
          onClick={() => setLocation('/plan/overview')}
          className="w-full bg-primary text-primary-foreground py-[18px] rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.6)] active:scale-[0.98] transition-all mt-10 hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          Generate Plan ✨
        </button>
      </div>

      <BottomNav active="plans" />
    </div>
  );
}
