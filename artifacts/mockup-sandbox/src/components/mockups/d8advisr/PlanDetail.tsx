import React from 'react';
import { ArrowLeft, Map, Clock, Share2, Edit3 } from 'lucide-react';

export function PlanDetail() {
  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-white px-6 pt-14 pb-6 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center mb-4">
          <button className="w-10 h-10 bg-[#F7F7F7] rounded-full flex items-center justify-center text-[#222222]">
            <ArrowLeft size={20} />
          </button>
          <div className="bg-[#FFF0F1] text-[#FF9500] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF9500]"></div> Upcoming
          </div>
          <button className="w-10 h-10 bg-[#F7F7F7] rounded-full flex items-center justify-center text-[#222222]">
            <Share2 size={18} />
          </button>
        </div>
        
        <h1 className="text-[28px] font-bold text-[#222222] leading-tight mb-2">Date Night Downtown</h1>
        <div className="flex items-center gap-3 text-sm text-[#555555] font-medium">
          <span className="flex items-center gap-1.5"><Clock size={16} /> Tonight, 7:00 PM</span>
        </div>
      </div>

      <div className="px-6 py-6 pb-28">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#222222]">Itinerary</h2>
          <button className="text-[#FF5A5F] font-semibold text-sm flex items-center gap-1">
            <Edit3 size={14} /> Edit Plan
          </button>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0F0F0] mb-8">
          <div className="flex flex-col gap-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#EBEBEB]">
            {/* Step 1 */}
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#222222] text-white border-2 border-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">1</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-[#222222] text-[16px]">Lumina Restaurant</h3>
                  <span className="font-bold text-[#00C851]">$85</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#555555] mb-2">
                  <span className="bg-[#F7F7F7] px-2 py-0.5 rounded text-xs font-medium">7:00 PM</span>
                  <span>•</span>
                  <span>Dinner</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#222222] text-white border-2 border-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">2</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-[#222222] text-[16px]">Riverfront Walk</h3>
                  <span className="font-bold text-[#00C851]">Free</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#555555] mb-2">
                  <span className="bg-[#F7F7F7] px-2 py-0.5 rounded text-xs font-medium">8:30 PM</span>
                  <span>•</span>
                  <span>Activity</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#222222] text-white border-2 border-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">3</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-[#222222] text-[16px]">Sweeties Gelato</h3>
                  <span className="font-bold text-[#00C851]">$15</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#555555] mb-2">
                  <span className="bg-[#F7F7F7] px-2 py-0.5 rounded text-xs font-medium">9:15 PM</span>
                  <span>•</span>
                  <span>Dessert</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Review */}
        <h2 className="text-xl font-bold text-[#222222] mb-4">Cost Review</h2>
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0F0F0] mb-6">
          <div className="flex justify-between text-[15px] mb-3">
            <span className="text-[#555555]">Dinner</span>
            <span className="font-medium text-[#222222]">$85.00</span>
          </div>
          <div className="flex justify-between text-[15px] mb-3">
            <span className="text-[#555555]">Activity</span>
            <span className="font-medium text-[#00C851]">Free</span>
          </div>
          <div className="flex justify-between text-[15px] mb-4">
            <span className="text-[#555555]">Dessert</span>
            <span className="font-medium text-[#222222]">$15.00</span>
          </div>
          <div className="flex justify-between text-[15px] mb-4 text-[#999999] italic">
            <span>Est. Tip (18%)</span>
            <span>$15.30</span>
          </div>
          
          <div className="border-t border-[#EBEBEB] pt-4 mb-5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#222222] text-[17px]">Total Estimate</span>
              <span className="font-bold text-xl text-[#222222]">$115.30</span>
            </div>
          </div>

          {/* Budget Bar */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-[#00C851]">Under Budget</span>
              <span className="text-[#999999]">Target: $150</span>
            </div>
            <div className="w-full h-2 bg-[#EBEBEB] rounded-full overflow-hidden">
              <div className="w-[76%] h-full bg-[#00C851] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bottom */}
      <div className="fixed bottom-0 w-[390px] bg-white border-t border-[#EBEBEB] p-6 flex gap-4 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button className="w-14 h-14 rounded-xl border-2 border-[#EBEBEB] flex items-center justify-center text-[#222222] active:scale-95 transition-transform hover:bg-[#F7F7F7]">
          <Map size={24} />
        </button>
        <button className="flex-1 bg-[#FF5A5F] text-white rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all">
          Let's Go!
        </button>
      </div>
    </div>
  );
}