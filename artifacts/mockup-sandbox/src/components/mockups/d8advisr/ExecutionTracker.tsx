import React from 'react';
import { Map, Phone, Share, HelpCircle, CheckCircle2, ChevronRight, Navigation, MapPin } from 'lucide-react';

export function ExecutionTracker() {
  return (
    <div className="w-[390px] h-[844px] bg-[#222222] font-['Poppins'] flex flex-col relative mx-auto overflow-hidden">
      {/* Background Map Approximation (Dark Mode) */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="w-full h-full relative bg-[#1A1A1A]">
          <div className="absolute top-0 bottom-0 left-[30%] w-3 bg-[#333] rotate-12 origin-top"></div>
          <div className="absolute top-0 bottom-0 left-[70%] w-4 bg-[#333] -rotate-6 origin-bottom"></div>
          <div className="absolute left-0 right-0 top-[40%] h-3 bg-[#333] -rotate-3 origin-left"></div>
          
          <div className="absolute top-[30%] left-[45%] flex flex-col items-center">
            <div className="w-16 h-16 bg-[#FF5A5F]/20 rounded-full animate-pulse flex items-center justify-center">
              <div className="bg-[#FF5A5F] w-6 h-6 rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,90,95,0.8)]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Overlay */}
      <div className="relative z-10 pt-14 pb-4 px-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center mb-6">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <span className="text-white font-medium text-sm">Step 2 of 3</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
            <HelpCircle size={20} />
          </button>
        </div>
        <h1 className="text-[28px] font-bold text-white leading-tight">You're on your date! 🗺️</h1>
      </div>

      {/* Status Timeline */}
      <div className="relative z-10 px-6 mt-2 mb-auto">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-5">
          <div className="flex items-center justify-between relative before:absolute before:top-1/2 before:left-4 before:right-4 before:h-0.5 before:bg-white/20 before:-translate-y-1/2 before:-z-10">
            {/* Step 1: Done */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#00C851] flex items-center justify-center text-white shadow-[0_0_10px_rgba(0,200,81,0.5)] z-10">
                <CheckCircle2 size={18} />
              </div>
              <span className="text-xs font-medium text-white/70">Done</span>
            </div>
            
            {/* Step 2: Current */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#FF5A5F] border-4 border-[#222222] flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,90,95,0.6)] z-10">
                <span className="font-bold">2</span>
              </div>
              <span className="text-xs font-bold text-white">Now</span>
            </div>

            {/* Step 3: Next */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#333333] border-2 border-white/20 flex items-center justify-center text-white/50 z-10">
                <span className="font-medium text-sm">3</span>
              </div>
              <span className="text-xs font-medium text-white/50">Next</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timer / Next Up Notification */}
      <div className="relative z-10 px-6 mb-4 flex justify-center">
        <div className="bg-black/50 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#FF5A5F] animate-pulse"></div>
          <span className="text-white text-sm font-medium">Sweeties Gelato in 45 mins</span>
        </div>
      </div>

      {/* Current Step Card (Bottom Sheet style) */}
      <div className="relative z-10 bg-white w-full rounded-t-3xl pt-8 pb-10 px-6 shadow-[0_-15px_40px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-sm font-bold text-[#FF5A5F] tracking-wider uppercase mb-1.5">Current Location</div>
            <h2 className="text-[26px] font-bold text-[#222222] leading-tight mb-1">Riverfront Walk</h2>
            <div className="flex items-center gap-1.5 text-[#555555]">
              <MapPin size={14} />
              <span className="text-[15px]">1200 Water St, Downtown</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#F0F8FF] flex items-center justify-center text-3xl">
            🚶
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="bg-[#F7F7F7] py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-[#222222] border border-[#EBEBEB] active:bg-[#EBEBEB]">
            <Navigation size={18} className="text-[#007AFF]" /> Directions
          </button>
          <button className="bg-[#F7F7F7] py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-[#222222] border border-[#EBEBEB] active:bg-[#EBEBEB]">
            <Share size={18} className="text-[#FF5A5F]" /> Share Location
          </button>
        </div>

        <button className="w-full bg-[#00C851] text-white py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(0,200,81,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2 mb-6">
          <CheckCircle2 size={20} /> Mark Complete
        </button>
        
        <div className="flex justify-center gap-8 border-t border-[#EBEBEB] pt-6">
          <button className="flex flex-col items-center gap-2 text-[#555555]">
            <div className="w-12 h-12 rounded-full bg-[#F7F7F7] flex items-center justify-center">
              <Phone size={20} />
            </div>
            <span className="text-xs font-medium">Call Venue</span>
          </button>
          <button className="flex flex-col items-center gap-2 text-[#555555]">
            <div className="w-12 h-12 rounded-full bg-[#F7F7F7] flex items-center justify-center">
              <Map size={20} />
            </div>
            <span className="text-xs font-medium">Full Map</span>
          </button>
          <button className="flex flex-col items-center gap-2 text-[#555555]">
            <div className="w-12 h-12 rounded-full bg-[#F7F7F7] flex items-center justify-center">
              <ChevronRight size={20} />
            </div>
            <span className="text-xs font-medium">Skip Step</span>
          </button>
        </div>
      </div>
    </div>
  );
}