import React from 'react';
import { Bell, Settings, Search, MapPin, Star, Home, Calendar, User, List, Map } from 'lucide-react';

export function MapView() {
  return (
    <div className="w-[390px] h-[844px] bg-[#E5E2DA] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-hidden">
      {/* Top Bar (Overlay on Map) */}
      <div className="absolute top-0 w-full bg-gradient-to-b from-white/90 to-white/0 pt-14 pb-8 px-6 flex justify-between items-start z-20">
        <div className="flex items-baseline bg-white px-4 py-2 rounded-2xl shadow-sm">
          <span className="font-bold text-xl text-[#FF5A5F] tracking-tight">D8</span>
          <span className="font-bold text-xl text-[#222222] tracking-tight">Advisr</span>
        </div>
        
        {/* Toggle Pills */}
        <div className="bg-white p-1 rounded-full shadow-md flex items-center">
          <button className="px-4 py-2 rounded-full text-sm font-semibold text-[#555555]">
            Feed
          </button>
          <button className="px-4 py-2 rounded-full text-sm font-bold bg-[#FF5A5F] text-white shadow-sm">
            Map
          </button>
        </div>
      </div>

      {/* Stylized Map Background (CSS Grid/Flex approximation) */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full relative bg-[#EFECE6]">
          {/* Roads */}
          <div className="absolute top-0 bottom-0 left-[30%] w-3 bg-white rotate-12 origin-top"></div>
          <div className="absolute top-0 bottom-0 left-[70%] w-4 bg-white -rotate-6 origin-bottom"></div>
          <div className="absolute left-0 right-0 top-[40%] h-3 bg-white -rotate-3 origin-left"></div>
          
          {/* Parks / Water */}
          <div className="absolute top-[10%] right-[10%] w-[150px] h-[200px] bg-[#D1E6CD] rounded-[40px] rotate-12"></div>
          <div className="absolute bottom-[25%] left-[-10%] w-[200px] h-[150px] bg-[#D4E8F2] rounded-[50px] -rotate-12"></div>
          
          {/* Map Pins */}
          <div className="absolute top-[35%] left-[45%] flex flex-col items-center">
            <div className="bg-[#FF5A5F] w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white relative z-10 scale-110">
              <span className="text-white text-lg">🍷</span>
            </div>
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#FF5A5F] -mt-1"></div>
            <div className="bg-white px-2 py-1 rounded-md text-[10px] font-bold shadow-sm mt-1">Lumina</div>
          </div>

          <div className="absolute top-[20%] right-[25%] flex flex-col items-center opacity-70">
            <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-md border border-[#EBEBEB]">
              <span className="text-xl">⛳</span>
            </div>
          </div>

          <div className="absolute top-[55%] left-[25%] flex flex-col items-center opacity-70">
            <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-md border border-[#EBEBEB]">
              <span className="text-xl">🎷</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search overlay on map */}
      <div className="absolute top-28 left-6 right-6 z-20">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999999]" size={20} />
          <input 
            type="text" 
            placeholder="Search this area..." 
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#EBEBEB] rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.08)] font-medium text-[#222222] placeholder:text-[#999999] focus:outline-none"
          />
        </div>
      </div>

      {/* Bottom Sheet Cards */}
      <div className="absolute bottom-24 left-0 w-full z-20 px-6">
        <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x pb-4">
          
          {/* Active Card */}
          <div className="min-w-[280px] bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] snap-center border-2 border-[#FF5A5F]/20 flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center shrink-0">
              <span className="text-3xl">🍷</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[16px] text-[#222222] leading-tight mb-1">Lumina Restaurant & Bar</h3>
              <div className="flex items-center gap-1 text-xs text-[#555555] mb-2 font-medium">
                <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                <span className="font-bold">4.8</span>
                <span className="text-[#999999]">(324) • $$$</span>
              </div>
              <p className="text-[#999999] text-xs font-medium">Romantic Dining • 1.2 mi</p>
            </div>
          </div>

          {/* Inactive Card */}
          <div className="min-w-[280px] bg-white/90 backdrop-blur-sm rounded-3xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] snap-center flex gap-4 opacity-70 scale-95 origin-left">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
              <span className="text-3xl">🎷</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[16px] text-[#222222] leading-tight mb-1">The Jazz Corner</h3>
              <div className="flex items-center gap-1 text-xs text-[#555555] mb-2 font-medium">
                <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                <span className="font-bold">4.9</span>
                <span className="text-[#999999]">(120) • $$</span>
              </div>
              <p className="text-[#999999] text-xs font-medium">Live Music • 0.8 mi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Surprise Me FAB */}
      <button className="absolute bottom-40 right-6 bg-[#FF5A5F] text-white w-14 h-14 rounded-full shadow-[0_8px_25px_-6px_rgba(255,90,95,0.6)] flex items-center justify-center active:scale-95 transition-transform z-30">
        <span className="text-2xl">✨</span>
      </button>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 w-full bg-white border-t border-[#EBEBEB] pb-8 pt-4 px-8 flex justify-between items-center z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button className="flex flex-col items-center gap-1.5 text-[#FF5A5F]">
          <Home size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <Calendar size={24} />
          <span className="text-[10px] font-medium">Plans</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <User size={24} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
}
