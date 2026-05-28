import React from 'react';
import { Check, Edit2, RotateCcw, Home, Calendar, User, Clock, MapPin } from 'lucide-react';

export function PlanOverview() {
  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      <div className="px-6 pt-16 pb-6 text-center">
        <div className="w-16 h-16 bg-[#00C851]/10 text-[#00C851] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎉</span>
        </div>
        <h1 className="text-[26px] font-bold text-[#00C851] mb-2">Your Plan is Ready!</h1>
        <p className="text-[#555555] text-[15px]">We've curated the perfect evening for you.</p>
      </div>

      <div className="px-6 pb-28">
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#EBEBEB] mb-6">
          <div className="border-b border-[#EBEBEB] pb-4 mb-4">
            <h2 className="text-xl font-bold text-[#222222] mb-1">Downtown Romance</h2>
            <div className="flex items-center gap-3 text-sm text-[#555555] font-medium">
              <span className="flex items-center gap-1"><Calendar size={14} /> Tonight</span>
              <span className="w-1 h-1 rounded-full bg-[#D1D1D1]"></span>
              <span className="flex items-center gap-1"><MapPin size={14} /> Downtown</span>
            </div>
          </div>

          <div className="flex flex-col gap-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#EBEBEB]">
            {/* Step 1 */}
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F1] border-2 border-white flex items-center justify-center text-xl shadow-sm shrink-0">🍷</div>
              <div className="pt-1">
                <div className="flex justify-between items-start w-[240px]">
                  <h3 className="font-bold text-[#222222] text-[16px]">Dinner at Lumina</h3>
                  <span className="font-bold text-[#FF5A5F]">$85</span>
                </div>
                <p className="text-sm text-[#555555] mt-0.5">7:00 PM • 1.5 hrs</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#F0F8FF] border-2 border-white flex items-center justify-center text-xl shadow-sm shrink-0">🚶</div>
              <div className="pt-1">
                <div className="flex justify-between items-start w-[240px]">
                  <h3 className="font-bold text-[#222222] text-[16px]">Riverfront Stroll</h3>
                  <span className="font-bold text-[#00C851]">Free</span>
                </div>
                <p className="text-sm text-[#555555] mt-0.5">8:30 PM • 45 mins</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#FFFBEB] border-2 border-white flex items-center justify-center text-xl shadow-sm shrink-0">🍦</div>
              <div className="pt-1">
                <div className="flex justify-between items-start w-[240px]">
                  <h3 className="font-bold text-[#222222] text-[16px]">Gelato at Sweeties</h3>
                  <span className="font-bold text-[#FF5A5F]">$15</span>
                </div>
                <p className="text-sm text-[#555555] mt-0.5">9:15 PM • 30 mins</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#EBEBEB] flex justify-between items-center">
            <span className="font-semibold text-[#555555]">Estimated Total</span>
            <span className="font-bold text-2xl text-[#222222]">$100</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button className="w-full bg-[#00C851] text-white py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(0,200,81,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2">
            <Check size={20} /> Accept Plan
          </button>
          
          <button className="w-full bg-white text-[#222222] border-2 border-[#EBEBEB] py-3.5 rounded-xl font-semibold text-[16px] flex justify-center items-center gap-2 active:scale-[0.98] transition-all hover:bg-gray-50">
            <Edit2 size={18} /> Tweak Plan
          </button>

          <button className="w-full text-[#555555] py-3 font-semibold text-[15px] flex justify-center items-center gap-2 mt-2">
            <RotateCcw size={16} /> Start Over
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 w-full bg-white border-t border-[#EBEBEB] pb-8 pt-4 px-8 flex justify-between items-center z-20 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <Home size={24} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#FF5A5F]">
          <Calendar size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Plans</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <User size={24} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
}