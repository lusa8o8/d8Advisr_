import { useLocation } from "wouter";
import { Sparkles, Star } from 'lucide-react';

export function ReviewComplete() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#141414] relative overflow-hidden">

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#FF5A5F]/20 rounded-full blur-3xl -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl -mb-16 -ml-16 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl -mb-10 -mr-10 pointer-events-none" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">

        {/* Badge */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FF5A5F] to-[#FF9500] flex items-center justify-center shadow-[0_16px_40px_-8px_rgba(255,90,95,0.6)]">
            <Sparkles size={40} className="text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-[#00C851] flex items-center justify-center shadow-lg">
            <Star size={14} className="text-white fill-white" />
          </div>
        </div>

        {/* Heading */}
        <p className="text-white/40 text-[11px] font-black uppercase tracking-widest mb-3">Review submitted</p>
        <h1 className="text-white font-black text-[30px] leading-tight mb-4">
          Thanks for<br />keeping it real
        </h1>
        <p className="text-white/60 text-[14px] font-medium leading-relaxed max-w-xs">
          Your feedback helps keep D8 Approved standards honest — and helps the next couple plan a better evening.
        </p>

        {/* Badge unlock */}
        <div className="mt-8 bg-white/10 border border-white/15 rounded-2xl px-5 py-4 w-full max-w-xs">
          <div className="flex items-center gap-3">
            <div className="text-3xl leading-none">🏅</div>
            <div className="text-left">
              <p className="text-white font-bold text-[14px] leading-tight">Badge unlocked</p>
              <p className="text-white/50 text-[12px] mt-0.5">Real One · First review submitted</p>
            </div>
            <div className="ml-auto w-6 h-6 rounded-full bg-[#00C851] flex items-center justify-center shrink-0">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Plan credit */}
        <p className="text-white/30 text-[12px] font-medium mt-5">Romantic Night in Lagos · Tonight</p>
      </div>

      {/* Actions */}
      <div className="shrink-0 px-6 pb-14 pt-6 flex flex-col gap-3 relative z-10">
        <button
          onClick={() => setLocation('/plan/generate')}
          className="w-full bg-[#FF5A5F] text-white py-4 rounded-2xl font-bold text-[16px] shadow-[0_8px_24px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all"
        >
          Plan another evening ✨
        </button>
        <button
          onClick={() => setLocation('/home')}
          className="w-full bg-white/10 text-white/80 py-4 rounded-2xl font-semibold text-[15px] active:scale-[0.98] transition-all hover:bg-white/15"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
