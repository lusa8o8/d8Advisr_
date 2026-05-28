import { ArrowLeft, Plus, DollarSign, ArrowUpRight, Home, Calendar, User } from 'lucide-react';

export function BudgetDashboard() {
  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-white px-6 pt-14 pb-4 flex justify-between items-center sticky top-0 z-20 shadow-sm border-b border-[#EBEBEB]">
        <button className="w-10 h-10 bg-[#F7F7F7] rounded-full flex items-center justify-center text-[#222222]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-[#222222] text-lg">Budget & Savings</h1>
        <button className="text-[#555555] font-semibold text-sm">Edit</button>
      </div>

      <div className="px-6 py-6 pb-28">
        {/* Monthly Budget Card */}
        <h2 className="text-[16px] font-bold text-[#222222] mb-3 px-2">October Budget</h2>
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#F0F0F0] mb-8">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[#555555] text-sm font-medium mb-1">Remaining</p>
              <h3 className="text-3xl font-bold text-[#222222]">$115<span className="text-[#999999] text-xl font-semibold">.00</span></h3>
            </div>
            <div className="text-right">
              <p className="text-[#555555] text-sm font-medium mb-1">Spent</p>
              <p className="text-[#FF9500] font-bold text-lg">$185.00</p>
            </div>
          </div>
          
          <div className="mb-2">
            <div className="w-full h-3 bg-[#EBEBEB] rounded-full overflow-hidden">
              <div className="w-[62%] h-full bg-gradient-to-r from-[#00C851] to-[#FF9500] rounded-full"></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-[#999999] font-medium">
            <span>$0</span>
            <span>Total: $300</span>
          </div>
        </div>

        {/* Sinking Fund */}
        <h2 className="text-[16px] font-bold text-[#222222] mb-3 px-2">Anniversary Fund</h2>
        <div className="bg-[#222222] text-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.1)] mb-8 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-[#00C851]/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex justify-between items-center mb-6">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">Saved so far</p>
              <h3 className="text-3xl font-bold text-white">$240<span className="text-white/50 text-xl font-semibold">.00</span></h3>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
              <span className="text-2xl">💍</span>
            </div>
          </div>
          
          <div className="relative z-10 mb-5">
            <div className="flex justify-between text-xs font-medium text-white/70 mb-2">
              <span>Goal: $400</span>
              <span>60%</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="w-[60%] h-full bg-[#00C851] rounded-full shadow-[0_0_10px_rgba(0,200,81,0.5)]"></div>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/10 pt-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/80">Weekly Auto-save</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">$20</span>
            </div>
            <div className="w-10 h-6 bg-[#00C851] rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button className="bg-[#00C851]/10 text-[#00C851] py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-[15px] border border-[#00C851]/20">
            <Plus size={18} /> Add Funds
          </button>
          <button className="bg-white text-[#222222] py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-[15px] border border-[#EBEBEB] shadow-sm">
            <DollarSign size={18} /> Withdraw
          </button>
        </div>

        {/* History */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-[16px] font-bold text-[#222222]">Recent Expenses</h2>
          <span className="text-sm font-semibold text-[#555555]">View All</span>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="bg-white p-4 rounded-2xl border border-[#EBEBEB] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F1] text-[#FF5A5F] flex items-center justify-center">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <h4 className="font-bold text-[#222222] text-[15px] mb-0.5">Downtown Romance</h4>
                <p className="text-xs text-[#555555] font-medium">Oct 12 • Plan</p>
              </div>
            </div>
            <span className="font-bold text-[#222222]">-$115.00</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#EBEBEB] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F1] text-[#FF5A5F] flex items-center justify-center">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <h4 className="font-bold text-[#222222] text-[15px] mb-0.5">Friday Fun</h4>
                <p className="text-xs text-[#555555] font-medium">Sep 28 • Plan</p>
              </div>
            </div>
            <span className="font-bold text-[#222222]">-$70.00</span>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 w-[390px] bg-white border-t border-[#EBEBEB] pb-8 pt-4 px-8 flex justify-between items-center z-20 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
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