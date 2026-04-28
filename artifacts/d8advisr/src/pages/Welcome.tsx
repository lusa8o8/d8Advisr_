import { useLocation } from "wouter";
import { Check } from "lucide-react";

export function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 bg-white flex flex-col justify-center items-center p-6 relative">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[-20%] w-[250px] h-[250px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex-1 flex flex-col justify-center items-center w-full z-10">
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
      
      <div className="w-full flex flex-col gap-4 mb-10 z-10">
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
    </div>
  );
}
