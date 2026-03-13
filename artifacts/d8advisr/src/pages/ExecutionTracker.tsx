import { useLocation } from "wouter";
import { ArrowLeft, Check, Navigation, Phone, Share, AlertCircle } from 'lucide-react';
import { cn } from "@/components/SharedUI";

export function ExecutionTracker() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="bg-card px-6 pt-14 pb-6 shadow-sm sticky top-0 z-20 border-b border-border">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setLocation('/plan/1')} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="text-sm font-bold text-muted-foreground tracking-wider uppercase">Step 2 of 3</div>
          <div className="w-10"></div>
        </div>
        
        <h1 className="text-[28px] font-bold text-foreground leading-tight">You're on your date! 🗺️</h1>
      </div>

      <div className="px-6 py-8">
        
        {/* Progress Tracker */}
        <div className="flex justify-between items-center mb-8 relative">
           <div className="absolute top-1/2 left-4 right-4 h-1 bg-border -translate-y-1/2 z-0"></div>
           <div className="absolute top-1/2 left-4 w-1/2 h-1 bg-[#00C851] -translate-y-1/2 z-0"></div>
           
           <div className="w-10 h-10 rounded-full bg-[#00C851] text-white flex items-center justify-center font-bold relative z-10 shadow-md">
             <Check size={20} strokeWidth={3} />
           </div>
           
           <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold relative z-10 shadow-[0_0_0_4px_rgba(255,90,95,0.2)]">
             2
           </div>
           
           <div className="w-10 h-10 rounded-full bg-card border-2 border-border text-muted-foreground flex items-center justify-center font-bold relative z-10">
             3
           </div>
        </div>

        {/* Current Step Card */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border mb-6">
           <div className="bg-[#FFF0F1] text-primary w-max px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-primary/10 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> IN PROGRESS
           </div>
           
           <h2 className="text-2xl font-bold text-foreground mb-2">Riverfront Walk</h2>
           <p className="text-muted-foreground font-medium mb-6">8:30 PM • 1.5 miles long</p>
           
           <div className="bg-background rounded-2xl p-4 flex items-center gap-4 mb-6 border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Navigation size={24} />
              </div>
              <div>
                <p className="font-bold text-foreground text-[15px]">Navigation active</p>
                <p className="text-sm text-muted-foreground">Arriving in 5 mins</p>
              </div>
           </div>

           <button 
            onClick={() => setLocation('/feedback')}
            className="w-full bg-[#00C851] text-white py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(0,200,81,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2"
           >
             Mark Complete <Check size={20} strokeWidth={3} />
           </button>
        </div>
        
        {/* Next Step Preview */}
        <div className="bg-background rounded-2xl p-5 border border-border border-dashed flex items-center justify-between opacity-80">
           <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Up Next (9:15 PM)</p>
              <h3 className="font-bold text-foreground">Sweeties Gelato</h3>
           </div>
           <div className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center text-lg">🍦</div>
        </div>

      </div>

      {/* Quick Actions Footer */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-card border-t border-border p-4 pb-8 z-20">
         <div className="flex justify-around px-2">
            <button className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-foreground group-hover:bg-gray-200 transition-colors">
                 <Phone size={22} />
               </div>
               <span className="text-[11px] font-semibold text-muted-foreground">Call Venue</span>
            </button>
            <button className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-foreground group-hover:bg-gray-200 transition-colors">
                 <Share size={22} />
               </div>
               <span className="text-[11px] font-semibold text-muted-foreground">Share Live</span>
            </button>
            <button className="flex flex-col items-center gap-2 group">
               <div className="w-14 h-14 rounded-full bg-[#FFF3E8] border border-[#FF9500]/20 flex items-center justify-center text-[#FF9500] group-hover:bg-[#ffe6cc] transition-colors">
                 <AlertCircle size={22} />
               </div>
               <span className="text-[11px] font-semibold text-muted-foreground">Get Help</span>
            </button>
         </div>
      </div>
    </div>
  );
}
