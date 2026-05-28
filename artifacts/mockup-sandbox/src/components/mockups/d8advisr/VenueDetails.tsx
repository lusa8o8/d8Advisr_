import React from 'react';
import { ArrowLeft, Star, MapPin, Heart, Clock, Share } from 'lucide-react';

export function VenueDetails() {
  return (
    <div className="w-[390px] h-[844px] bg-white font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      {/* Header Image */}
      <div className="h-[300px] w-full bg-gradient-to-br from-rose-400 to-red-500 relative flex items-center justify-center">
        <span className="text-7xl drop-shadow-lg">🍷</span>
        
        <div className="absolute top-14 left-6 flex justify-between w-[calc(100%-48px)] items-center">
          <button className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
            <ArrowLeft size={20} />
          </button>
          <button className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
            <Share size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 -mt-6 bg-white rounded-t-3xl relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-[#F7F7F7] text-[#555555] text-[11px] font-bold rounded-md uppercase tracking-wider">Romantic Dining</span>
            </div>
            <h1 className="text-[26px] font-bold text-[#222222] leading-tight">Lumina Restaurant & Bar</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 mb-5 border-b border-[#EBEBEB] pb-5">
          <div className="flex items-center gap-1.5">
            <Star size={16} className="fill-[#FF9500] text-[#FF9500]" />
            <span className="font-bold text-[15px] text-[#222222]">4.8</span>
            <span className="text-[#999999] text-sm">(324 reviews)</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-[#D1D1D1]"></div>
          <div className="flex items-center gap-1 text-[#555555] text-sm">
            <MapPin size={14} />
            <span>1.2 mi</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-[#D1D1D1]"></div>
          <span className="font-bold text-[#FF5A5F] text-sm">$$$</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[#EBEBEB] mb-6">
          <button className="pb-3 border-b-2 border-[#FF5A5F] text-[#FF5A5F] font-semibold text-sm">Overview</button>
          <button className="pb-3 border-b-2 border-transparent text-[#999999] font-medium text-sm">Reviews</button>
          <button className="pb-3 border-b-2 border-transparent text-[#999999] font-medium text-sm">Location</button>
        </div>

        <div className="mb-8">
          <p className="text-[#555555] text-[15px] leading-relaxed mb-6">
            Intimate atmosphere with panoramic city views and modern fusion cuisine. Known for their extensive wine list and signature sunset tasting menu.
          </p>

          <h3 className="font-bold text-[#222222] text-[17px] mb-4">Highlights</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F1] text-[#FF5A5F] flex items-center justify-center">❤️</div>
              <span className="text-[#222222] font-medium">Romantic Setting</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F0F8FF] text-[#007AFF] flex items-center justify-center">👥</div>
              <span className="text-[#222222] font-medium">Great for Groups</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F0FFF4] text-[#00C851] flex items-center justify-center">🌳</div>
              <span className="text-[#222222] font-medium">Outdoor Seating</span>
            </div>
          </div>
        </div>

        <div className="bg-[#F7F7F7] rounded-2xl p-4 mb-24">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[#555555]">
              <Clock size={18} />
              <span className="font-medium text-sm">Open today: 5PM - 11PM</span>
            </div>
            <div className="bg-[#00C851]/10 text-[#00C851] px-3 py-1 rounded-full text-xs font-bold">
              ~$65 / person
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 w-[390px] bg-white border-t border-[#EBEBEB] p-6 flex gap-4 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button className="w-14 h-14 rounded-xl border-2 border-[#EBEBEB] flex items-center justify-center text-[#555555] active:scale-95 transition-transform hover:bg-[#F7F7F7]">
          <Heart size={24} />
        </button>
        <button className="flex-1 bg-[#FF5A5F] text-white rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all">
          Add to Plan
        </button>
      </div>
    </div>
  );
}