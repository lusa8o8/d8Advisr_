import { useLocation } from "wouter";
import { ArrowLeft, Plus, DollarSign, ArrowUpRight } from 'lucide-react';

export function BudgetDashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="bg-card px-6 pt-14 pb-4 flex justify-between items-center sticky top-0 z-20 shadow-sm border-b border-border">
        <button onClick={() => setLocation('/profile')} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-foreground text-lg">Budget & Savings</h1>
        <button className="text-muted-foreground font-semibold text-sm hover:text-foreground">Edit</button>
      </div>

      <div className="px-6 py-6">
        {/* Monthly Budget Card */}
        <h2 className="text-[16px] font-bold text-foreground mb-3 px-1 uppercase tracking-wider text-sm">October Budget</h2>
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border mb-8">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Remaining</p>
              <h3 className="text-3xl font-extrabold text-foreground">$115<span className="text-gray-400 text-xl font-semibold">.00</span></h3>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm font-medium mb-1">Spent</p>
              <p className="text-[#FF9500] font-bold text-lg">$185.00</p>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="w-full h-3 bg-background rounded-full overflow-hidden">
              <div className="w-[62%] h-full bg-gradient-to-r from-[#00C851] to-[#FF9500] rounded-full"></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 font-bold">
            <span>$0</span>
            <span>Total: $300</span>
          </div>
        </div>

        {/* Sinking Fund */}
        <h2 className="text-[16px] font-bold text-foreground mb-3 px-1 uppercase tracking-wider text-sm">Anniversary Fund</h2>
        <div className="bg-[#1A2E20] text-white rounded-3xl p-6 shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-[#00C851]/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex justify-between items-center mb-6">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">Saved so far</p>
              <h3 className="text-3xl font-extrabold text-white">$240<span className="text-white/50 text-xl font-semibold">.00</span></h3>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
              <span className="text-2xl">💍</span>
            </div>
          </div>
          
          <div className="relative z-10 mb-6">
            <div className="flex justify-between text-xs font-bold text-white/80 mb-2">
              <span>Goal: $400</span>
              <span>60%</span>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
              <div className="w-[60%] h-full bg-[#00C851] rounded-full shadow-[0_0_10px_rgba(0,200,81,0.5)]"></div>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/10 pt-5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white/90">Weekly Auto-save</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">$20</span>
            </div>
            <div className="w-12 h-7 bg-[#00C851] rounded-full relative cursor-pointer border border-white/20">
              <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <button className="bg-[#00C851]/10 text-[#00C851] py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-[15px] border border-[#00C851]/20 hover:bg-[#00C851]/20 transition-colors">
            <Plus size={20} strokeWidth={3} /> Add Funds
          </button>
          <button className="bg-card text-foreground py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-[15px] border border-border shadow-sm hover:bg-background transition-colors">
            <DollarSign size={18} strokeWidth={3} /> Withdraw
          </button>
        </div>

        {/* History */}
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-[17px] font-bold text-foreground">Recent Expenses</h2>
          <span className="text-sm font-bold text-primary">View All</span>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FFF0F1] text-primary flex items-center justify-center">
                <ArrowUpRight size={20} strokeWidth={3} />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-[15px] mb-0.5">Downtown Romance</h4>
                <p className="text-xs text-muted-foreground font-medium">Oct 12 • Plan</p>
              </div>
            </div>
            <span className="font-bold text-foreground text-[16px]">-$115.00</span>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FFF0F1] text-primary flex items-center justify-center">
                <ArrowUpRight size={20} strokeWidth={3} />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-[15px] mb-0.5">Friday Fun</h4>
                <p className="text-xs text-muted-foreground font-medium">Sep 28 • Plan</p>
              </div>
            </div>
            <span className="font-bold text-foreground text-[16px]">-$70.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
