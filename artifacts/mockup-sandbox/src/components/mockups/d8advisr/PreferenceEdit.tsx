import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';

export function PreferenceEdit() {
  const [budget, setBudget] = useState(150);

  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-white px-6 pt-14 pb-4 flex justify-between items-center sticky top-0 z-20 shadow-sm border-b border-[#EBEBEB]">
        <button className="w-10 h-10 bg-[#F7F7F7] rounded-full flex items-center justify-center text-[#222222]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-[#222222] text-lg">My Preferences</h1>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="px-6 py-6 pb-32">
        <p className="text-[#555555] text-[15px] mb-8">Update your preferences so D8Advisr can generate perfectly tailored plans.</p>

        {/* Cuisine */}
        <div className="mb-8">
          <h2 className="text-[16px] font-bold text-[#222222] mb-3">Favorite Cuisine</h2>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium">Italian</button>
            <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium">Japanese</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Mexican</button>
            <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium">Thai</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">American</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Indian</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">+ Add More</button>
          </div>
        </div>

        {/* Activities */}
        <div className="mb-8">
          <h2 className="text-[16px] font-bold text-[#222222] mb-3">Activity Types</h2>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Outdoors</button>
            <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium">Live Music</button>
            <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium">Museums</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Nightlife</button>
            <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium">Workouts</button>
          </div>
        </div>

        {/* Vibe */}
        <div className="mb-8">
          <h2 className="text-[16px] font-bold text-[#222222] mb-3">Default Vibe</h2>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Romantic</button>
            <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium">Fun & Casual</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Adventure</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Relaxing</button>
          </div>
        </div>

        {/* Budget */}
        <div className="mb-8 bg-white p-5 rounded-2xl border border-[#EBEBEB] shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[16px] font-bold text-[#222222]">Typical Target Budget</h2>
            <span className="font-bold text-xl text-[#FF5A5F]">${budget}</span>
          </div>
          
          <div className="relative pb-2">
            <div className="h-2 w-full bg-[#EBEBEB] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF5A5F] rounded-full" 
                style={{ width: `${(budget / 500) * 100}%` }}
              ></div>
            </div>
            <div 
              className="absolute top-[-5px] w-5 h-5 bg-white border-[3px] border-[#FF5A5F] rounded-full shadow-md"
              style={{ left: `calc(${(budget / 500) * 100}% - 10px)` }}
            ></div>
            <div className="flex justify-between text-xs text-[#999999] font-medium mt-3">
              <span>$25</span>
              <span>$500+</span>
            </div>
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="mb-6 bg-white p-5 rounded-2xl border border-[#EBEBEB] shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <h2 className="text-[16px] font-bold text-[#222222] mb-4">Dietary Restrictions</h2>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#222222] font-medium text-[15px]">Vegetarian</span>
              <div className="w-12 h-7 bg-[#EBEBEB] rounded-full relative transition-colors cursor-pointer">
                <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all"></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-[#222222] font-medium text-[15px]">Vegan</span>
              <div className="w-12 h-7 bg-[#EBEBEB] rounded-full relative transition-colors cursor-pointer">
                <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all"></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-[#222222] font-medium text-[15px]">Gluten-Free</span>
              <div className="w-12 h-7 bg-[#00C851] rounded-full relative transition-colors cursor-pointer">
                <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 w-[390px] bg-white border-t border-[#EBEBEB] p-6 pb-8 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button className="w-full bg-[#FF5A5F] text-white py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2">
          <Save size={20} /> Save Preferences
        </button>
      </div>
    </div>
  );
}