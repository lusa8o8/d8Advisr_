import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

export function InitialPreferences() {
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
    <div className="w-[390px] min-h-[844px] bg-white font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-hidden">
      {/* Top Bar with Progress */}
      <div className="pt-14 pb-4 px-6 flex items-center justify-between">
        <button className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F7F7F7] text-[#222222]">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1.5 rounded-full bg-[#FF5A5F]"></div>
          <div className="w-8 h-1.5 rounded-full bg-[#EBEBEB]"></div>
          <div className="w-8 h-1.5 rounded-full bg-[#EBEBEB]"></div>
        </div>
        <div className="w-10"></div> {/* Spacer for center alignment */}
      </div>

      <div className="px-6 flex-1 flex flex-col mt-4">
        <h1 className="text-3xl font-bold text-[#222222] mb-3">What do you love?</h1>
        <p className="text-[#555555] text-base mb-8">Select a few vibes to help us curate the perfect dates for you.</p>

        {/* Chips Grid */}
        <div className="flex flex-wrap gap-3 mb-12">
          {chips.map(chip => {
            const isSelected = selectedChips.includes(chip);
            return (
              <button
                key={chip}
                onClick={() => toggleChip(chip)}
                className={`px-5 py-3 rounded-full font-medium text-[15px] transition-all duration-200 ${
                  isSelected 
                    ? 'bg-[#FF5A5F] text-white shadow-[0_4px_12px_rgba(255,90,95,0.3)] border border-[#FF5A5F]' 
                    : 'bg-white text-[#555555] border-2 border-[#EBEBEB] hover:border-[#FF5A5F]/50'
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {/* Budget Slider */}
        <div className="mt-auto mb-10 bg-[#F7F7F7] rounded-3xl p-6">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="font-semibold text-[#222222] text-lg">Typical Budget</h3>
              <p className="text-sm text-[#555555]">Per night out</p>
            </div>
            <span className="font-bold text-2xl text-[#FF5A5F]">${budget}</span>
          </div>
          
          <div className="relative pt-4 pb-2">
            {/* Custom Range Slider approximation */}
            <div className="h-2 w-full bg-[#EBEBEB] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF5A5F] rounded-full" 
                style={{ width: `${(budget / 500) * 100}%` }}
              ></div>
            </div>
            <div 
              className="absolute top-2 w-7 h-7 bg-white border-[3px] border-[#FF5A5F] rounded-full shadow-md cursor-grab"
              style={{ left: `calc(${(budget / 500) * 100}% - 14px)` }}
            ></div>
            <div className="flex justify-between text-xs text-[#999999] font-medium mt-4 px-1">
              <span>$25</span>
              <span>$500+</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-10 pt-4 bg-white z-10">
        <button className="w-full bg-[#FF5A5F] text-white py-[18px] rounded-xl font-semibold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all">
          Next Step
        </button>
      </div>
    </div>
  );
}
