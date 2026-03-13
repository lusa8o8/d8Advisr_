import { useState } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, Users, Plus } from 'lucide-react';
import { cn } from "@/components/SharedUI";

export function CreateGroupPlan() {
  const [, setLocation] = useLocation();
  const [occasion, setOccasion] = useState('Night Out');

  return (
    <div className="flex-1 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="bg-card px-6 pt-14 pb-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm border-b border-border">
        <button onClick={() => setLocation('/home')} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-foreground text-lg">Create Group Plan</h1>
      </div>

      <div className="px-6 py-8">
        <div className="mb-8 text-center">
           <div className="w-16 h-16 bg-[#E8F4FF] rounded-full mx-auto flex items-center justify-center text-blue-500 mb-4 shadow-sm border border-blue-100">
              <Users size={30} />
           </div>
           <h2 className="text-[28px] font-extrabold text-foreground leading-tight">Planning something together?</h2>
        </div>

        <div className="flex flex-col gap-6">
          {/* Group Name */}
          <div>
             <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Event / Group Name</label>
             <input type="text" placeholder="e.g. Sarah's Birthday Bash" className="w-full bg-card border border-border rounded-xl px-4 py-4 text-foreground font-semibold focus:outline-none focus:border-primary shadow-sm" />
          </div>

          {/* Members */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
             <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Who's coming?</label>
             <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center border-2 border-white shadow-sm z-10 relative">AJ</div>
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center border-2 border-white shadow-sm z-20 relative -ml-4">SR</div>
                <div className="w-12 h-12 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center border-2 border-white shadow-sm z-30 relative -ml-4">MK</div>
                
                <button className="w-12 h-12 rounded-full bg-background border-2 border-dashed border-gray-400 text-gray-500 font-bold flex items-center justify-center z-40 relative ml-2 hover:bg-gray-200 transition-colors">
                  <Plus size={20} />
                </button>
             </div>
          </div>

          {/* Occasion */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Occasion</label>
            <div className="flex flex-wrap gap-2.5">
              {['Night Out', 'Birthday', 'Celebration', 'Trip', 'Dinner'].map(item => (
                <button
                  key={item}
                  onClick={() => setOccasion(item)}
                  className={cn(
                    "px-5 py-3 rounded-full text-sm font-semibold transition-all active:scale-95",
                    occasion === item 
                      ? "bg-foreground text-card shadow-md" 
                      : "bg-card border border-border text-foreground hover:border-gray-300 shadow-sm"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Date</label>
              <input type="date" className="w-full bg-card border border-border rounded-xl px-4 py-4 text-foreground font-semibold focus:outline-none shadow-sm" defaultValue="2025-10-18" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Budget / Person</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold">$</span>
                <input type="number" placeholder="50" className="w-full bg-card border border-border rounded-xl pl-8 pr-4 py-4 text-foreground font-semibold focus:outline-none shadow-sm" defaultValue={75} />
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setLocation('/plan/overview')}
            className="w-full bg-primary text-primary-foreground py-[18px] rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.6)] active:scale-[0.98] transition-all mt-6 hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            Generate Group Plan ✨
          </button>
        </div>
      </div>
    </div>
  );
}
