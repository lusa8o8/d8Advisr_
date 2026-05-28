import { X } from 'lucide-react';

export function FilterModal() {
  return (
    <div className="w-[390px] h-[844px] bg-[#000000]/40 font-['Poppins'] flex flex-col justify-end relative mx-auto overflow-hidden">
      {/* Background home screen mock underneath */}
      
      {/* Bottom Sheet */}
      <div className="bg-white w-full rounded-t-3xl pt-6 pb-10 px-6 flex flex-col max-h-[90%] overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#222222]">Filters</h2>
          <button className="w-8 h-8 bg-[#F7F7F7] rounded-full flex items-center justify-center text-[#555555]">
            <X size={18} />
          </button>
        </div>

        {/* Category */}
        <div className="mb-6">
          <h3 className="text-[15px] font-semibold text-[#222222] mb-3">Category</h3>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium">Dining</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Activity</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Nightlife</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Outdoors</button>
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[15px] font-semibold text-[#222222]">Price Range</h3>
            <span className="text-[#FF5A5F] font-semibold text-sm">$ • $$$</span>
          </div>
          <div className="w-full h-1.5 bg-[#EBEBEB] rounded-full relative mt-4 mb-2">
            <div className="absolute left-[20%] right-[30%] h-full bg-[#FF5A5F] rounded-full"></div>
            <div className="absolute left-[20%] top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#FF5A5F] rounded-full shadow-md"></div>
            <div className="absolute right-[30%] top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#FF5A5F] rounded-full shadow-md"></div>
          </div>
          <div className="flex justify-between text-xs text-[#999999] mt-2">
            <span>$</span>
            <span>$$$$</span>
          </div>
        </div>

        {/* Distance */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[15px] font-semibold text-[#222222]">Distance</h3>
            <span className="text-[#555555] text-sm">Up to 10 mi</span>
          </div>
          <div className="w-full h-1.5 bg-[#EBEBEB] rounded-full relative mt-4">
            <div className="absolute left-0 w-[40%] h-full bg-[#FF5A5F] rounded-full"></div>
            <div className="absolute left-[40%] top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#FF5A5F] rounded-full shadow-md"></div>
          </div>
        </div>

        {/* Date */}
        <div className="mb-6">
          <h3 className="text-[15px] font-semibold text-[#222222] mb-3">Date</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            <div className="min-w-[70px] bg-[#FF5A5F] text-white rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-xs font-medium mb-1">Today</span>
              <span className="text-xl font-bold">14</span>
            </div>
            <div className="min-w-[70px] bg-white border border-[#EBEBEB] text-[#555555] rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-xs font-medium mb-1">Tomorrow</span>
              <span className="text-xl font-bold">15</span>
            </div>
            <div className="min-w-[70px] bg-white border border-[#EBEBEB] text-[#555555] rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-xs font-medium mb-1">Sat</span>
              <span className="text-xl font-bold">16</span>
            </div>
            <div className="min-w-[70px] bg-white border border-[#EBEBEB] text-[#555555] rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-xs font-medium mb-1">Sun</span>
              <span className="text-xl font-bold">17</span>
            </div>
          </div>
        </div>

        {/* Mood */}
        <div className="mb-8">
          <h3 className="text-[15px] font-semibold text-[#222222] mb-3">Mood</h3>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Romantic</button>
            <button className="px-4 py-2 bg-[#FF5A5F] text-white rounded-full text-sm font-medium shadow-sm">Fun</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Chill</button>
            <button className="px-4 py-2 bg-white text-[#555555] border border-[#EBEBEB] rounded-full text-sm font-medium">Adventurous</button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-auto">
          <button className="text-[#555555] font-semibold text-sm underline px-2">Reset</button>
          <button className="flex-1 bg-[#FF5A5F] text-white py-4 rounded-xl font-semibold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all">
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}