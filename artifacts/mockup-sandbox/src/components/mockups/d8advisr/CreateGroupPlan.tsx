import React from 'react';
import { ArrowLeft, Users, Plus, Calendar, DollarSign, Home, User as UserIcon } from 'lucide-react';

export function CreateGroupPlan() {
  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-white px-6 pt-14 pb-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
        <button className="w-10 h-10 bg-[#F7F7F7] rounded-full flex items-center justify-center text-[#222222]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-[#222222] text-lg leading-tight">Create Group Plan</h1>
          <p className="text-xs text-[#555555] font-medium">Planning something together?</p>
        </div>
      </div>

      <div className="px-6 py-6 pb-32">
        {/* Name Input */}
        <div className="bg-white rounded-2xl p-2 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB] mb-6">
          <input 
            type="text" 
            placeholder="Event Name (e.g. Sarah's Birthday)"
            className="w-full px-4 py-3 bg-transparent text-[16px] font-semibold text-[#222222] focus:outline-none placeholder:text-[#999999]"
          />
        </div>

        {/* Group Members */}
        <h2 className="text-[15px] font-bold text-[#222222] mb-3 px-2">Who's coming?</h2>
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB] mb-6 flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="w-12 h-12 rounded-full bg-[#FFE8E8] text-[#FF5A5F] flex items-center justify-center font-bold border-2 border-white shadow-sm shrink-0">
            AJ
          </div>
          <div className="w-12 h-12 rounded-full bg-[#E8F4FF] text-[#007AFF] flex items-center justify-center font-bold border-2 border-white shadow-sm shrink-0 -ml-5">
            SB
          </div>
          <div className="w-12 h-12 rounded-full bg-[#E8FFF0] text-[#00C851] flex items-center justify-center font-bold border-2 border-white shadow-sm shrink-0 -ml-5">
            MR
          </div>
          <div className="w-12 h-12 rounded-full bg-[#FFF3E8] text-[#FF9500] flex items-center justify-center font-bold border-2 border-white shadow-sm shrink-0 -ml-5">
            TK
          </div>
          
          <button className="w-12 h-12 rounded-full bg-[#F7F7F7] border-2 border-dashed border-[#D1D1D1] flex items-center justify-center text-[#555555] shrink-0 ml-1 hover:border-[#FF5A5F] hover:text-[#FF5A5F] transition-colors">
            <Plus size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Date */}
          <div className="bg-white p-4 rounded-2xl border border-[#EBEBEB] shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#222222]">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-[11px] text-[#555555] font-semibold uppercase tracking-wider">Date & Time</p>
              <p className="text-[15px] font-bold text-[#222222] mt-0.5">Sat, 14th • 8 PM</p>
            </div>
          </div>
          
          {/* Budget */}
          <div className="bg-white p-4 rounded-2xl border border-[#EBEBEB] shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#00C851]">
              <DollarSign size={16} />
            </div>
            <div>
              <p className="text-[11px] text-[#555555] font-semibold uppercase tracking-wider">Budget / Person</p>
              <p className="text-[15px] font-bold text-[#222222] mt-0.5">$75 - $100</p>
            </div>
          </div>
        </div>

        {/* Occasion */}
        <h2 className="text-[15px] font-bold text-[#222222] mb-3 px-2">Occasion Type</h2>
        <div className="flex flex-wrap gap-2 mb-6">
          <button className="px-4 py-2.5 bg-[#222222] text-white rounded-xl text-sm font-semibold">Night Out</button>
          <button className="px-4 py-2.5 bg-white text-[#555555] border border-[#EBEBEB] rounded-xl text-sm font-medium">Birthday</button>
          <button className="px-4 py-2.5 bg-white text-[#555555] border border-[#EBEBEB] rounded-xl text-sm font-medium">Celebration</button>
          <button className="px-4 py-2.5 bg-white text-[#555555] border border-[#EBEBEB] rounded-xl text-sm font-medium">Trip</button>
        </div>

        {/* Shared Vibe */}
        <div className="bg-[#FFF0F1] rounded-2xl p-5 border border-[#FF5A5F]/20 flex items-start gap-4 mb-4">
          <div className="mt-1">
            <Users className="text-[#FF5A5F]" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-[#222222] text-[15px] mb-1">Shared Preferences Active</h3>
            <p className="text-sm text-[#555555] mb-3">We'll automatically find venues that match everyone's dietary needs and favorite vibes.</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-1 bg-white text-[#FF5A5F] rounded text-[11px] font-bold">1 Vegan</span>
              <span className="px-2 py-1 bg-white text-[#FF5A5F] rounded text-[11px] font-bold">Loves Cocktails</span>
            </div>
          </div>
        </div>

      </div>

      {/* Fixed Action Button */}
      <div className="fixed bottom-[85px] w-[390px] px-6 py-4 bg-gradient-to-t from-[#F7F7F7] via-[#F7F7F7] to-transparent z-10">
        <button className="w-full bg-[#FF5A5F] text-white py-[18px] rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2">
          Generate Group Plan ✨
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 w-[390px] bg-white border-t border-[#EBEBEB] pb-8 pt-4 px-8 flex justify-between items-center z-20 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <Home size={24} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#FF5A5F]">
          <Calendar size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Plans</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <UserIcon size={24} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
}