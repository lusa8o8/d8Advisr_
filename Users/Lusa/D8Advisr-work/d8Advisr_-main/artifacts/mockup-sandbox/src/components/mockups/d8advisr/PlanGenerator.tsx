import React from 'react';
import { Sparkles, Calendar, MapPin, DollarSign, Users, Home, User } from 'lucide-react';

export function PlanGenerator() {
  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      <div className="px-6 pt-14 pb-8 bg-white shadow-sm rounded-b-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="text-[#FF5A5F]" size={28} />
          <h1 className="text-[28px] font-bold text-[#222222]">Surprise Me</h1>
        </div>

        {/* Toggle */}
        <div className="bg-[#F7F7F7] p-1 rounded-xl flex mb-6">
          <button className="flex-1 py-2.5 rounded-lg bg-white shadow-sm font-semibold text-[#222222] text-sm">
            Solo Date
          </button>
          <button className="flex-1 py-2.5 rounded-lg font-medium text-[#555555] text-sm">
            Group Plan
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* Date & Time */}
          <div className="bg-[#F7F7F7] p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#FF5A5F] shadow-sm">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs text-[#555555] font-medium mb-0.5">When?</p>
              <p className="text-[15px] font-semibold text-[#222222]">Tonight, 7:00 PM</p>
            </div>
          </div>

          {/* Location */}
          <div className="bg-[#F7F7F7] p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#FF5A5F] shadow-sm">
              <MapPin size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#555555] font-medium mb-0.5">Where?</p>
              <input type="text" placeholder="Current Location" className="bg-transparent font-semibold text-[15px] text-[#222222] w-full focus:outline-none placeholder:text-[#222222]" defaultValue="Downtown Area" />
            </div>
          </div>

          {/* Budget */}
          <div className="bg-[#F7F7F7] p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#00C851] shadow-sm">
              <DollarSign size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#555555] font-medium mb-0.5">Total Budget</p>
              <input type="text" className="bg-transparent font-semibold text-[15px] text-[#222222] w-full focus:outline-none" defaultValue="$150" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 pb-28">
        <h3 className="font-bold text-[#222222] text-[17px] mb-3">Occasion</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Anniversary</button>
          <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium shadow-sm border border-[#FF5A5F]">First Date</button>
          <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Birthday</button>
          <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Casual</button>
        </div>

        <h3 className="font-bold text-[#222222] text-[17px] mb-3">Vibe</h3>
        <div className="flex flex-wrap gap-2 mb-8">
          <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium shadow-sm border border-[#FF5A5F]">Romantic</button>
          <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Fun</button>
          <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Adventure</button>
          <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Relaxing</button>
        </div>

        <button className="w-full bg-[#FF5A5F] text-white py-[18px] rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2">
          Generate Plan ✨
        </button>
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