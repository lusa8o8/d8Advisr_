import { ArrowLeft, Megaphone } from 'lucide-react';
import { useLocation } from 'wouter';

export function PartnerSocialCompose() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col overflow-y-auto no-scrollbar">
      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100 shrink-0">
        <button
          onClick={() => setLocation('/partner/dashboard')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mb-4 active:scale-95 transition-transform"
          aria-label="Back to partner dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-[11px] font-black text-primary tracking-widest uppercase mb-0.5">D8 Partner</p>
        <h1 className="text-[22px] font-black text-gray-900">Social tools coming soon</h1>
        <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
          For now, events are listed and managed inside D8Advisr.
        </p>
      </div>

      <div className="px-5 pt-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-500">
            <Megaphone size={20} />
          </div>
          <p className="text-[15px] font-black text-gray-900">Coming soon</p>
          <p className="text-[12px] text-gray-500 font-medium mt-2 leading-relaxed">
            Social channel connections and posting are disabled in this version.
          </p>
          <button
            onClick={() => setLocation('/partner/dashboard')}
            className="mt-5 bg-primary text-white text-[13px] font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
