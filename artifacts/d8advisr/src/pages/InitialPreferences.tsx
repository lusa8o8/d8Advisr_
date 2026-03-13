import { useState } from 'react';
import { useLocation } from "wouter";
import { ChevronLeft } from 'lucide-react';
import { cn } from "@/components/SharedUI";

export function InitialPreferences() {
  const [, setLocation] = useLocation();
  const [selectedChips, setSelectedChips] = useState<string[]>(['Foodie', 'Relaxing']);
  const [budget, setBudget] = useState(150);

  const chips = [
    'Foodie', 'Outdoor', 'Romantic', 'Adventure', 'Nightlife', 
    'Cultural', 'Sports', 'Relaxing', 'Live Music', 'Coffee', 'Artsy', 'Casual'
  ];

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter(c => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  return (
    <div className="flex-1 min-h-0 bg-card flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex flex-col gap-8 sticky top-0 bg-card z-20 shadow-sm border-b border-border">
        <div className="flex items-center gap-6">
          <button onClick={() => setLocation('/signup')} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors">
            <ChevronLeft size={24} />
          </button>
          
          {/* Progress Bar */}
          <div className="flex gap-2 flex-1 max-w-[120px]">
            <div className="h-1.5 flex-1 bg-primary rounded-full"></div>
            <div className="h-1.5 flex-1 bg-border rounded-full"></div>
            <div className="h-1.5 flex-1 bg-border rounded-full"></div>
          </div>
        </div>
        
        <div>
          <h1 className="text-[32px] font-bold text-foreground leading-tight mb-2">What do you love?</h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed pr-4">
            Select a few vibes to help us curate the perfect dates for you.
          </p>
        </div>
      </div>

      <div className="px-6 py-8 flex flex-col gap-10">
        {/* Chips Grid */}
        <div className="flex flex-wrap gap-3">
          {chips.map(chip => {
            const isSelected = selectedChips.includes(chip);
            return (
              <button
                key={chip}
                onClick={() => toggleChip(chip)}
                className={cn(
                  "px-5 py-3 rounded-full font-semibold text-[15px] transition-all active:scale-95",
                  isSelected 
                    ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_rgba(255,90,95,0.6)]" 
                    : "bg-white text-muted-foreground border border-border hover:border-gray-300"
                )}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {/* Budget Slider */}
        <div className="bg-background rounded-3xl p-6 border border-border">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-foreground text-[17px]">Typical Budget</h3>
              <p className="text-sm text-muted-foreground">Per night out</p>
            </div>
            <span className="text-2xl font-bold text-primary">${budget}</span>
          </div>
          
          <input 
            type="range" 
            min="25" 
            max="500" 
            value={budget} 
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-border rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 font-medium mt-3">
            <span>$25</span>
            <span>$500+</span>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-card p-6 border-t border-border shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-30">
        <button 
          onClick={() => setLocation('/home')}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all hover:bg-primary/90"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
