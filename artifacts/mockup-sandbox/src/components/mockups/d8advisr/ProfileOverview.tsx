import React from 'react';
import { Settings, Home, Calendar, User, Heart, Star, Award, ChevronRight } from 'lucide-react';

export function ProfileOverview() {
  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-[#FF5A5F] px-6 pt-14 pb-20 relative text-white rounded-b-[40px] shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Profile</h1>
          <button className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Profile Card (Overlapping) */}
      <div className="px-6 -mt-16 mb-6 relative z-10">
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col items-center border border-[#F0F0F0]">
          <div className="w-24 h-24 bg-[#FFE8E8] text-[#FF5A5F] rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md -mt-16 mb-3">
            AJ
          </div>
          <h2 className="text-[22px] font-bold text-[#222222]">Alex Johnson</h2>
          <p className="text-sm text-[#999999] mb-5">Member since Jan 2024</p>

          <div className="w-full grid grid-cols-3 gap-2 border-t border-[#EBEBEB] pt-5">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-[#222222]">12</span>
              <span className="text-[11px] font-medium text-[#555555] uppercase tracking-wider text-center">Plans<br/>Created</span>
            </div>
            <div className="flex flex-col items-center border-l border-r border-[#EBEBEB]">
              <span className="text-xl font-bold text-[#222222]">8</span>
              <span className="text-[11px] font-medium text-[#555555] uppercase tracking-wider text-center">Dates<br/>Done</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-[#00C851]">$240</span>
              <span className="text-[11px] font-medium text-[#555555] uppercase tracking-wider text-center">Budget<br/>Saved</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-28">
        {/* Badges */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-[17px] font-bold text-[#222222]">Badges</h3>
            <span className="text-sm font-semibold text-[#FF5A5F]">View All</span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-2">
            <div className="bg-white min-w-[80px] h-[80px] rounded-2xl flex flex-col items-center justify-center gap-1 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB]">
              <span className="text-2xl">🔥</span>
              <span className="text-[10px] font-bold text-[#222222]">Streak x3</span>
            </div>
            <div className="bg-white min-w-[80px] h-[80px] rounded-2xl flex flex-col items-center justify-center gap-1 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB]">
              <span className="text-2xl">🍕</span>
              <span className="text-[10px] font-bold text-[#222222]">Foodie</span>
            </div>
            <div className="bg-white min-w-[80px] h-[80px] rounded-2xl flex flex-col items-center justify-center gap-1 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB]">
              <span className="text-2xl">💰</span>
              <span className="text-[10px] font-bold text-[#222222]">Saver</span>
            </div>
            <div className="bg-[#F7F7F7] min-w-[80px] h-[80px] rounded-2xl flex flex-col items-center justify-center gap-1 border border-dashed border-[#D1D1D1] opacity-60">
              <div className="w-6 h-6 rounded-full bg-[#EBEBEB] flex items-center justify-center text-[#999999] mb-1">
                <Award size={12} />
              </div>
              <span className="text-[10px] font-medium text-[#999999]">Locked</span>
            </div>
          </div>
        </div>

        {/* Recent Plans */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-[17px] font-bold text-[#222222]">Recent Plans</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FFF0F1] text-xl flex items-center justify-center">🍷</div>
                <div>
                  <h4 className="font-bold text-[#222222] text-[15px]">Downtown Romance</h4>
                  <div className="flex items-center gap-1 text-xs text-[#555555] mt-0.5">
                    <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                    <span className="font-bold">5.0</span>
                    <span>• Oct 12</span>
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#999999]" />
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#F0F8FF] text-xl flex items-center justify-center">🎳</div>
                <div>
                  <h4 className="font-bold text-[#222222] text-[15px]">Friday Fun</h4>
                  <div className="flex items-center gap-1 text-xs text-[#555555] mt-0.5">
                    <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                    <span className="font-bold">4.0</span>
                    <span>• Sep 28</span>
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#999999]" />
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-3xl p-2 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB]">
          <button className="w-full flex items-center justify-between p-4 border-b border-[#F7F7F7]">
            <div className="flex items-center gap-3 text-[#222222]">
              <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#555555]">
                <Heart size={16} />
              </div>
              <span className="font-semibold text-[15px]">My Preferences</span>
            </div>
            <ChevronRight size={18} className="text-[#999999]" />
          </button>
          <button className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-3 text-[#222222]">
              <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#00C851]">
                <span className="font-bold text-sm">$</span>
              </div>
              <span className="font-semibold text-[15px]">Budget & Sinking Fund</span>
            </div>
            <ChevronRight size={18} className="text-[#999999]" />
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 w-full bg-white border-t border-[#EBEBEB] pb-8 pt-4 px-8 flex justify-between items-center z-20 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <Home size={24} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <Calendar size={24} />
          <span className="text-[10px] font-medium">Plans</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#FF5A5F]">
          <User size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>
    </div>
  );
}