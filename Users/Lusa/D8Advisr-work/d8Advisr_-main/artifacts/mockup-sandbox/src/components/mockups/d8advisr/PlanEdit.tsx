import React from 'react';
import { ArrowLeft, Plus, Save, Clock, RefreshCw, X, AlertTriangle } from 'lucide-react';

export function PlanEdit() {
  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-white px-6 pt-14 pb-6 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center mb-4">
          <button className="w-10 h-10 bg-[#F7F7F7] rounded-full flex items-center justify-center text-[#222222]">
            <X size={20} />
          </button>
          <span className="font-bold text-[#222222] text-lg">Edit Plan</span>
          <button className="text-[#FF5A5F] font-semibold text-sm">Save</button>
        </div>
      </div>

      <div className="px-6 py-6 pb-28">
        {/* Warning Banner */}
        <div className="bg-[#FFF8E6] border border-[#FF9500]/20 rounded-2xl p-4 mb-6 flex gap-3 items-start">
          <AlertTriangle className="text-[#FF9500] shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-[#222222] text-sm">Budget Exceeded</h4>
            <p className="text-sm text-[#555555]">Your current plan is $15 over your target budget of $150.</p>
          </div>
        </div>

        {/* Editable Timeline */}
        <h2 className="text-[15px] font-bold text-[#222222] mb-4">Timeline Details</h2>
        <div className="flex flex-col gap-4 mb-6">
          {/* Item 1 */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB]">
            <div className="flex justify-between items-start mb-3">
              <input type="text" className="font-bold text-[#222222] text-[16px] bg-transparent focus:outline-none w-3/4" defaultValue="Lumina Restaurant" />
              <button className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#555555]">
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 bg-[#F7F7F7] px-3 py-1.5 rounded-lg text-sm font-medium text-[#555555]">
                <Clock size={14} />
                <span>7:00 PM</span>
              </div>
              <input type="text" className="font-bold text-[#FF5A5F] text-right bg-transparent focus:outline-none w-20" defaultValue="$100" />
            </div>
          </div>

          {/* Item 2 */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB]">
            <div className="flex justify-between items-start mb-3">
              <input type="text" className="font-bold text-[#222222] text-[16px] bg-transparent focus:outline-none w-3/4" defaultValue="Riverfront Walk" />
              <button className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#555555]">
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 bg-[#F7F7F7] px-3 py-1.5 rounded-lg text-sm font-medium text-[#555555]">
                <Clock size={14} />
                <span>8:30 PM</span>
              </div>
              <input type="text" className="font-bold text-[#00C851] text-right bg-transparent focus:outline-none w-20" defaultValue="Free" />
            </div>
          </div>

          {/* Item 3 */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB]">
            <div className="flex justify-between items-start mb-3">
              <input type="text" className="font-bold text-[#222222] text-[16px] bg-transparent focus:outline-none w-3/4" defaultValue="Sweeties Gelato" />
              <button className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#555555]">
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 bg-[#F7F7F7] px-3 py-1.5 rounded-lg text-sm font-medium text-[#555555]">
                <Clock size={14} />
                <span>9:15 PM</span>
              </div>
              <input type="text" className="font-bold text-[#FF5A5F] text-right bg-transparent focus:outline-none w-20" defaultValue="$15" />
            </div>
          </div>
        </div>

        <button className="w-full bg-white text-[#222222] border-2 border-dashed border-[#EBEBEB] py-3.5 rounded-xl font-semibold text-[15px] flex justify-center items-center gap-2 mb-8">
          <Plus size={18} /> Add Step
        </button>

        {/* Budget Adjustment */}
        <h2 className="text-[15px] font-bold text-[#222222] mb-4">Adjust Target Budget</h2>
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#EBEBEB] mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[#555555] font-medium">Target</span>
            <span className="font-bold text-xl text-[#222222]">$150</span>
          </div>
          <div className="w-full h-1.5 bg-[#EBEBEB] rounded-full relative mb-2">
            <div className="absolute left-0 w-[60%] h-full bg-[#FF5A5F] rounded-full"></div>
            <div className="absolute left-[60%] top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#FF5A5F] rounded-full shadow-md"></div>
          </div>
        </div>

        {/* Notes */}
        <h2 className="text-[15px] font-bold text-[#222222] mb-4">Notes for the evening</h2>
        <textarea 
          className="w-full bg-white border border-[#EBEBEB] rounded-2xl p-4 min-h-[100px] text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 resize-none shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
          placeholder="Any special requests or things to remember?"
          defaultValue="Remember to ask for a window seat at Lumina. Bring a light jacket for the riverfront walk."
        ></textarea>
      </div>

      {/* Action Bottom */}
      <div className="fixed bottom-0 w-[390px] bg-white border-t border-[#EBEBEB] p-6 flex flex-col gap-3 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button className="w-full bg-[#FF5A5F] text-white py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2">
          Save Changes
        </button>
        <button className="w-full text-[#555555] font-semibold text-[15px] py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}