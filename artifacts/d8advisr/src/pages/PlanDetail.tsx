import { useLocation } from "wouter";
import { ArrowLeft, Map, Clock, Share2, Edit3 } from 'lucide-react';

export function PlanDetail() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="bg-card px-6 pt-14 pb-6 shadow-sm z-10 sticky top-0 border-b border-border">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setLocation('/home')} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="bg-[#FFF3E8] text-[#FF9500] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-[#FF9500]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF9500]"></div> Upcoming
          </div>
          <button className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors">
            <Share2 size={18} />
          </button>
        </div>
        
        <h1 className="text-[28px] font-bold text-foreground leading-tight mb-2">Date Night Downtown</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
          <span className="flex items-center gap-1.5"><Clock size={16} /> Tonight, 7:00 PM</span>
        </div>
      </div>

      <div className="px-6 py-6 pb-28">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Itinerary</h2>
          <button onClick={() => setLocation('/plan/1/edit')} className="text-primary font-semibold text-sm flex items-center gap-1 hover:opacity-80">
            <Edit3 size={14} /> Edit Plan
          </button>
        </div>

        {/* Timeline */}
        <div className="bg-card rounded-3xl p-5 shadow-sm border border-border mb-8">
          <div className="flex flex-col gap-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-background">
            
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-foreground text-card border-2 border-card flex items-center justify-center font-bold text-sm shadow-sm shrink-0">1</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-[16px]">Lumina Restaurant</h3>
                  <span className="font-bold text-[#00C851]">$85</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="bg-background px-2 py-0.5 rounded text-xs font-semibold text-foreground">7:00 PM</span>
                  <span>•</span>
                  <span>Dinner</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-foreground text-card border-2 border-card flex items-center justify-center font-bold text-sm shadow-sm shrink-0">2</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-[16px]">Riverfront Walk</h3>
                  <span className="font-bold text-[#00C851]">Free</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="bg-background px-2 py-0.5 rounded text-xs font-semibold text-foreground">8:30 PM</span>
                  <span>•</span>
                  <span>Activity</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-foreground text-card border-2 border-card flex items-center justify-center font-bold text-sm shadow-sm shrink-0">3</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-[16px]">Sweeties Gelato</h3>
                  <span className="font-bold text-[#00C851]">$15</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="bg-background px-2 py-0.5 rounded text-xs font-semibold text-foreground">9:15 PM</span>
                  <span>•</span>
                  <span>Dessert</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Review */}
        <h2 className="text-xl font-bold text-foreground mb-4">Cost Review</h2>
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border mb-6">
          <div className="flex justify-between text-[15px] mb-3">
            <span className="text-muted-foreground font-medium">Dinner</span>
            <span className="font-semibold text-foreground">$85.00</span>
          </div>
          <div className="flex justify-between text-[15px] mb-3">
            <span className="text-muted-foreground font-medium">Activity</span>
            <span className="font-bold text-[#00C851]">Free</span>
          </div>
          <div className="flex justify-between text-[15px] mb-4">
            <span className="text-muted-foreground font-medium">Dessert</span>
            <span className="font-semibold text-foreground">$15.00</span>
          </div>
          <div className="flex justify-between text-[15px] mb-5 text-gray-400 font-medium">
            <span>Est. Tip (18%)</span>
            <span>$15.30</span>
          </div>
          
          <div className="border-t border-border pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="font-bold text-foreground text-[17px]">Total Estimate</span>
              <span className="font-bold text-2xl text-foreground">$115.30</span>
            </div>
          </div>

          {/* Budget Bar */}
          <div className="bg-background p-4 rounded-xl border border-border/50">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-[#00C851] flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00C851]"></div> Under Budget</span>
              <span className="text-muted-foreground">Target: $150</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-[76%] h-full bg-[#00C851] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bottom */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-card border-t border-border p-6 flex gap-4 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button onClick={() => setLocation('/map')} className="w-14 h-14 rounded-xl border-2 border-border flex items-center justify-center text-foreground active:scale-95 transition-transform hover:bg-background">
          <Map size={24} />
        </button>
        <button 
          onClick={() => setLocation('/tracker')}
          className="flex-1 bg-primary text-primary-foreground rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all hover:bg-primary/90"
        >
          Let's Go! &rarr;
        </button>
      </div>
    </div>
  );
}
