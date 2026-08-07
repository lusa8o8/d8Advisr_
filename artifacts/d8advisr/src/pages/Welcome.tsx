import { useLocation } from "wouter";
import { Check } from "lucide-react";
import { LegalLinks } from "@workspace/d8-core/legal";

export function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-white relative">
      {/* Left side (Desktop only) */}
      <div className="hidden lg:flex flex-1 relative bg-zinc-900 overflow-hidden">
        <img
          src="/images/landing-1.jpg"
          alt="African youth culture"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        <div className="absolute bottom-16 left-12 right-12 text-white">
          <p className="text-2xl font-medium leading-relaxed drop-shadow-md">
            D8Advisr is a social planning platform that helps you discover curated venues and events, build itineraries, and manage budgets for group outings.
          </p>
        </div>
      </div>

      {/* Right side (Auth block) */}
      <div className="flex-1 lg:flex-none lg:w-[480px] bg-white flex flex-col justify-center items-center p-6 relative lg:border-l lg:border-border overflow-y-auto">
        {/* Background decorations */}
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[20%] left-[-20%] w-[250px] h-[250px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex-1 flex flex-col justify-center items-center w-full z-10 min-h-0">
          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-10">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center relative shadow-lg shadow-primary/20 mb-6">
              <span className="text-white font-bold text-4xl">D8</span>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#00C851] rounded-full flex items-center justify-center border-[3px] border-white shadow-sm">
                <Check size={16} strokeWidth={4} className="text-white" />
              </div>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-5xl text-primary tracking-tight">D8</span>
              <span className="font-bold text-5xl text-foreground tracking-tight">Advisr</span>
            </div>
          </div>

          <h1 className="text-[1.35rem] text-muted-foreground text-center font-medium leading-[1.6] px-2 mb-12">
            Plan unforgettable dates & group experiences <span className="text-primary">— effortlessly.</span>
          </h1>
        </div>
        
        <div className="w-full flex flex-col gap-4 mb-6 z-10 shrink-0">
          <button 
            onClick={() => setLocation('/signup')}
            className="w-full bg-primary text-primary-foreground py-[18px] rounded-xl font-semibold text-lg shadow-[0_8px_20px_-6px_rgba(255,90,95,0.6)] active:scale-[0.98] transition-all hover:bg-primary/90"
          >
            Get Started
          </button>
          <button 
            onClick={() => setLocation('/signin')}
            className="w-full bg-white text-foreground border-2 border-border py-[18px] rounded-xl font-semibold text-lg active:scale-[0.98] transition-all hover:bg-gray-50"
          >
            Sign In
          </button>
        </div>
        <LegalLinks className="relative z-10 pb-4 shrink-0" />
      </div>
    </div>
  );
}
