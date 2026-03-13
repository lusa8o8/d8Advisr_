import { useLocation } from "wouter";
import { Calendar, MapPin } from 'lucide-react';
import { BottomNav } from "@/components/SharedUI";

export function PlanOverview() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      <div className="px-6 pt-16 pb-6 text-center">
        <div className="w-20 h-20 bg-[#E8FFF0] rounded-full mx-auto flex items-center justify-center text-4xl shadow-sm mb-6 border-4 border-white">
          🎉
        </div>
        <h1 className="text-[32px] font-extrabold text-[#00C851] leading-tight mb-2">Your Plan is Ready!</h1>
        <p className="text-muted-foreground font-medium">We've curated the perfect evening.</p>
      </div>

      <div className="px-6 pb-6">
        <div className="bg-card rounded-3xl p-6 shadow-md border border-border relative overflow-hidden">
          {/* Decor */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <div className="relative z-10 border-b border-border pb-5 mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">Date Night Downtown</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5"><Calendar size={16} /> Tonight, 7:00 PM</span>
              <span className="flex items-center gap-1.5"><MapPin size={16} /> Downtown</span>
            </div>
          </div>

          {/* Timeline preview */}
          <div className="relative z-10 flex flex-col gap-6 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-[2px] before:bg-background">
            
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-foreground text-card border-2 border-card flex items-center justify-center font-bold text-sm shadow-sm shrink-0">1</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-[16px]">Lumina Restaurant</h3>
                  <span className="font-bold text-primary">$85</span>
                </div>
                <p className="text-sm text-muted-foreground">7:00 PM • Dinner</p>
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-foreground text-card border-2 border-card flex items-center justify-center font-bold text-sm shadow-sm shrink-0">2</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-[16px]">Riverfront Walk</h3>
                  <span className="font-bold text-[#00C851]">Free</span>
                </div>
                <p className="text-sm text-muted-foreground">8:30 PM • Activity</p>
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-foreground text-card border-2 border-card flex items-center justify-center font-bold text-sm shadow-sm shrink-0">3</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-[16px]">Sweeties Gelato</h3>
                  <span className="font-bold text-primary">$15</span>
                </div>
                <p className="text-sm text-muted-foreground">9:15 PM • Dessert</p>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 bg-background rounded-xl p-4 mt-6 flex justify-between items-center border border-border/50">
             <span className="font-bold text-foreground">Total Estimate</span>
             <span className="text-xl font-bold text-foreground">$100.00</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button 
            onClick={() => setLocation('/plan/1')}
            className="w-full bg-[#00C851] text-white py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(0,200,81,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2"
          >
            Accept Plan ✓
          </button>
          <button 
            onClick={() => setLocation('/plan/1/edit')}
            className="w-full bg-card text-foreground border-2 border-border py-4 rounded-xl font-bold text-[16px] active:scale-[0.98] transition-all hover:bg-background"
          >
            Tweak Plan
          </button>
        </div>
        
        <div className="mt-6 text-center">
           <button onClick={() => setLocation('/plan/generate')} className="text-muted-foreground font-semibold text-sm underline underline-offset-4 hover:text-foreground transition-colors">Start Over</button>
        </div>
      </div>

      <BottomNav active="plans" />
    </div>
  );
}
