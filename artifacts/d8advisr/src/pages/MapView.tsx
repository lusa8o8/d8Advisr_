import { useLocation } from "wouter";
import { Search, Star } from 'lucide-react';
import { BottomNav, FAB, cn } from "@/components/SharedUI";

export function MapView() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 flex flex-col relative bg-[#E5E2DA] overflow-hidden">
      
      {/* Top Bar (Overlay) */}
      <div className="absolute top-0 w-full bg-gradient-to-b from-white/90 to-white/0 pt-14 pb-8 px-6 flex justify-between items-start z-20">
        <div className="flex items-baseline bg-white px-4 py-2 rounded-2xl shadow-sm cursor-pointer" onClick={() => setLocation('/home')}>
          <span className="font-bold text-xl text-primary tracking-tight">D8</span>
          <span className="font-bold text-xl text-foreground tracking-tight">Advisr</span>
        </div>
        
        <div className="bg-white rounded-full p-1 shadow-sm flex">
          <button 
            onClick={() => setLocation('/home')}
            className="px-4 py-1.5 rounded-full text-sm font-semibold text-muted-foreground"
          >
            Feed
          </button>
          <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-primary text-white shadow-sm">
            Map
          </button>
        </div>
      </div>

      {/* Map Background Simulation */}
      <div className="absolute inset-0 z-0">
        {/* Roads */}
        <div className="absolute w-[2px] h-[150%] bg-white top-[-10%] left-[30%] rotate-[15deg]"></div>
        <div className="absolute w-[2px] h-[150%] bg-white top-[-10%] left-[70%] rotate-[-5deg]"></div>
        <div className="absolute h-[4px] w-[150%] bg-white top-[40%] left-[-10%] rotate-[-10deg]"></div>
        
        {/* Parks / Water */}
        <div className="absolute top-[10%] right-[5%] w-[180px] h-[200px] bg-[#C8E6C9] rounded-[40px] rotate-[-10deg]"></div>
        <div className="absolute bottom-[25%] left-[-10%] w-[250px] h-[200px] bg-[#BBDEFB] rounded-[50px] rotate-[15deg]"></div>

        {/* Pins */}
        <div className="absolute top-[35%] left-[45%] flex flex-col items-center cursor-pointer hover:scale-110 transition-transform">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-lg shadow-lg border-2 border-white relative z-10">
            🍷
            <div className="absolute -bottom-1.5 w-3 h-3 bg-primary rotate-45 -z-10 border-r-2 border-b-2 border-white"></div>
          </div>
          <div className="bg-white px-2 py-0.5 rounded-md text-[10px] font-bold mt-2 shadow-sm">Lumina</div>
        </div>

        <div className="absolute top-[18%] right-[25%] flex flex-col items-center">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm shadow-md border border-border">⛳</div>
        </div>
        
        <div className="absolute bottom-[45%] left-[25%] flex flex-col items-center">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm shadow-md border border-border">🎷</div>
        </div>
      </div>

      {/* Search Overlay */}
      <div className="absolute top-[110px] w-full px-6 z-20">
        <div className="bg-white rounded-2xl shadow-md p-3.5 flex items-center gap-3">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search this area..." 
            className="w-full text-sm font-medium focus:outline-none text-foreground"
          />
        </div>
      </div>

      {/* Selected Venue Bottom Sheet (Peek) */}
      <div className="absolute bottom-[90px] w-full px-6 z-20">
        <div 
          onClick={() => setLocation('/venue/1')}
          className="bg-white rounded-3xl p-4 shadow-xl border border-border flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-red-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0">
            🍷
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[16px] text-foreground leading-tight mb-1">Lumina Restaurant & Bar</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
              <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
              <span className="font-bold text-foreground">4.8</span>
              <span>(324)</span>
              <span className="mx-1">•</span>
              <span className="text-primary font-bold">$$$</span>
            </div>
            <p className="text-xs text-gray-500">Romantic Dining • 1.2 mi</p>
          </div>
        </div>
      </div>

      <FAB type="home" />
      <BottomNav active="home" />
    </div>
  );
}
