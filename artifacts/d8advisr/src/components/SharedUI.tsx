import { useLocation } from "wouter";
import { Home, Calendar, User, Bell, Settings } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function TopBar({ transparent = false }: { transparent?: boolean }) {
  const [, setLocation] = useLocation();
  
  return (
    <div className={cn("px-6 pt-14 pb-4 flex justify-between items-center sticky top-0 z-20", 
      transparent ? "bg-gradient-to-b from-white/90 to-white/0" : "bg-white shadow-sm"
    )}>
      <div className="flex items-baseline" onClick={() => setLocation('/home')}>
        <span className="font-bold text-2xl text-primary tracking-tight">D8</span>
        <span className="font-bold text-2xl text-foreground tracking-tight">Advisr</span>
      </div>
      <div className="flex gap-4">
        <button 
          onClick={() => setLocation('/notifications')}
          className="relative text-foreground hover:opacity-70 transition-opacity"
        >
          <Bell size={24} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white"></span>
        </button>
        <button 
          onClick={() => setLocation('/profile/preferences')}
          className="text-foreground hover:opacity-70 transition-opacity"
        >
          <Settings size={24} />
        </button>
      </div>
    </div>
  );
}

export function BottomNav({ active }: { active: 'home' | 'plans' | 'profile' }) {
  const [, setLocation] = useLocation();
  
  return (
    <div className="absolute bottom-0 w-full bg-white border-t border-border pb-8 pt-4 px-8 flex justify-between items-center z-20 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
      <button 
        onClick={() => setLocation('/home')}
        className={cn("flex flex-col items-center gap-1.5 transition-colors", active === 'home' ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Home size={24} strokeWidth={active === 'home' ? 2.5 : 2} />
        <span className={cn("text-[10px]", active === 'home' ? "font-bold" : "font-medium")}>Home</span>
      </button>
      
      <button 
        onClick={() => setLocation('/plans')}
        className={cn("flex flex-col items-center gap-1.5 transition-colors", active === 'plans' ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Calendar size={24} strokeWidth={active === 'plans' ? 2.5 : 2} />
        <span className={cn("text-[10px]", active === 'plans' ? "font-bold" : "font-medium")}>Plans</span>
      </button>
      
      <button 
        onClick={() => setLocation('/profile')}
        className={cn("flex flex-col items-center gap-1.5 transition-colors", active === 'profile' ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <User size={24} strokeWidth={active === 'profile' ? 2.5 : 2} />
        <span className={cn("text-[10px]", active === 'profile' ? "font-bold" : "font-medium")}>Profile</span>
      </button>
    </div>
  );
}

export function FAB({ type }: { type: 'home' | 'plans' }) {
  const [, setLocation] = useLocation();
  
  if (type === 'home') {
    return (
      <button 
        onClick={() => setLocation('/plan/generate')}
        className="absolute bottom-28 right-6 bg-primary text-primary-foreground px-5 py-4 rounded-full font-bold shadow-[0_8px_25px_-6px_rgba(255,90,95,0.6)] flex items-center gap-2 active:scale-95 transition-transform z-30"
      >
        <span className="text-xl">✨</span> Surprise Me
      </button>
    );
  }
  
  return (
    <button 
      onClick={() => setLocation('/group/create')}
      className="absolute bottom-28 right-6 bg-primary text-primary-foreground px-5 py-4 rounded-full font-bold shadow-[0_8px_25px_-6px_rgba(255,90,95,0.6)] flex items-center gap-2 active:scale-95 transition-transform z-30"
    >
      <span className="text-xl">+</span> Group Plan
    </button>
  );
}
