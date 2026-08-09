import { type ReactNode } from 'react';
import { Check } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  captionBody?: string;
  showLogo?: boolean;
}

export function AuthLayout({
  children,
  imageSrc = '/images/landing-1.jpg',
  imageAlt = 'African youth culture',
  captionBody = 'D8Advisr is a social planning platform that helps you discover curated venues and events, build itineraries, and manage budgets for group outings.',
  showLogo = true,
}: AuthLayoutProps) {
  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-white relative w-full h-full">
      {/* Left side (Desktop only) */}
      <div className="hidden lg:flex flex-1 relative bg-zinc-900 overflow-hidden">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        {captionBody && (
          <div className="absolute bottom-16 left-12 right-12 text-white">
            <p className="text-2xl font-medium leading-relaxed drop-shadow-md">
              {captionBody}
            </p>
          </div>
        )}
      </div>

      {/* Right side (Auth block/Form) */}
      <div className="flex-1 lg:flex-none lg:w-[480px] bg-white flex flex-col justify-center items-center p-6 relative lg:border-l lg:border-border overflow-y-auto no-scrollbar">
        {/* Background decorations */}
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[20%] left-[-20%] w-[250px] h-[250px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex-1 flex flex-col justify-center items-center w-full z-10 min-h-0">
          {showLogo && (
            <div className="flex flex-col items-center justify-center mb-6 mt-8">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center relative shadow-lg shadow-primary/20 mb-4">
                <span className="text-white font-bold text-3xl">D8</span>
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-[#00C851] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <Check size={12} strokeWidth={4} className="text-white" />
                </div>
              </div>
              <div className="flex items-baseline cursor-pointer" onClick={() => window.location.href = '/'}>
                <span className="font-bold text-3xl text-primary tracking-tight">D8</span>
                <span className="font-bold text-3xl text-foreground tracking-tight">Advisr</span>
              </div>
            </div>
          )}
          
          <div className="w-full flex-1 flex flex-col items-center w-full min-h-0 relative z-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
