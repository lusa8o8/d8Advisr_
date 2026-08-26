import { useState } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, Save } from 'lucide-react';
import { cn, consumerDesktopClass } from "@/components/SharedUI";
import { useRegion } from "@/hooks/useRegion";

export function PreferenceEdit() {
  const [, setLocation] = useLocation();
  const { formatPrice } = useRegion();
  const [budget, setBudget] = useState(150);

  const renderChips = (options: string[], defaultSelected: string[]) => {
    return options.map(chip => {
      const isSelected = defaultSelected.includes(chip);
      return (
        <button
          key={chip}
          className={cn(
            "px-4 py-2.5 rounded-full font-semibold text-sm transition-all",
            isSelected 
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 border border-primary" 
              : "bg-card text-muted-foreground border border-border hover:border-gray-300"
          )}
        >
          {chip}
        </button>
      );
    });
  };

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="bg-card pt-10 lg:pt-14 pb-3 lg:pb-4 sticky top-0 z-20 shadow-sm border-b border-border">
        <div className={cn(consumerDesktopClass('reading'), "px-6 flex justify-between items-center")}>
          <button onClick={() => setLocation('/profile')} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-foreground text-lg">My Preferences</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className={cn(consumerDesktopClass('reading'), "px-6 py-8 flex flex-col gap-10 w-full")}>
        <p className="text-muted-foreground text-[15px] font-medium leading-relaxed">
          Update your preferences so D8Advisr can generate perfectly tailored plans.
        </p>

        <div>
          <h3 className="font-bold text-foreground mb-4 text-[16px]">Favorite Cuisine</h3>
          <div className="flex flex-wrap gap-2.5">
            {renderChips(['Italian', 'Japanese', 'Mexican', 'Thai', 'American', 'Indian'], ['Italian', 'Japanese', 'Thai'])}
            <button className="px-4 py-2.5 rounded-full font-semibold text-sm bg-background border border-dashed border-gray-400 text-gray-500">+ Add More</button>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-foreground mb-4 text-[16px]">Activity Types</h3>
          <div className="flex flex-wrap gap-2.5">
            {renderChips(['Outdoors', 'Live Music', 'Museums', 'Nightlife', 'Workouts'], ['Live Music', 'Museums', 'Workouts'])}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-foreground mb-4 text-[16px]">Default Vibe</h3>
          <div className="flex flex-wrap gap-2.5">
            {renderChips(['Romantic', 'Fun & Casual', 'Adventure', 'Relaxing'], ['Fun & Casual'])}
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">Target Amount</h3>
            <span className="text-xl font-bold text-primary">{formatPrice(budget)}</span>
          </div>
          
          <input 
            type="range" 
            min="25" 
            max="500" 
            value={budget} 
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-background rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground font-medium mt-3">
            <span>{formatPrice(25)}</span>
            <span>{formatPrice(500)}+</span>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex justify-between items-center">
          <div>
             <h3 className="font-bold text-foreground text-[16px] mb-1">Vegetarian / Vegan</h3>
             <p className="text-xs text-muted-foreground">Only show meat-free options</p>
          </div>
          <div className="w-12 h-7 bg-border rounded-full relative cursor-pointer">
             <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm"></div>
          </div>
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-30">
        <div className={cn(consumerDesktopClass('reading'), "px-0")}>
          <button
            onClick={() => setLocation('/profile')}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2"
          >
            <Save size={20} /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
