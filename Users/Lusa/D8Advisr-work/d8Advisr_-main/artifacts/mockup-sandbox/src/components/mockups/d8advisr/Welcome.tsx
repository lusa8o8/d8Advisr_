import React from 'react';

export function Welcome() {
  return (
    <div className="w-[390px] min-h-[844px] bg-white font-['Poppins'] flex flex-col justify-center items-center p-6 relative mx-auto shadow-2xl overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-[#FF5A5F]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[20%] left-[-20%] w-[250px] h-[250px] bg-[#FF5A5F]/5 rounded-full blur-3xl"></div>

      <div className="flex-1 flex flex-col justify-center items-center w-full z-10">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-20 h-20 bg-[#FF5A5F] rounded-2xl flex items-center justify-center relative shadow-lg mb-6">
            <span className="text-white font-bold text-4xl">D8</span>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#00C851] rounded-full flex items-center justify-center border-[3px] border-white shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold text-5xl text-[#FF5A5F] tracking-tight">D8</span>
            <span className="font-bold text-5xl text-[#222222] tracking-tight">Advisr</span>
          </div>
        </div>

        <h1 className="text-[1.35rem] text-[#555555] text-center font-medium leading-[1.6] px-2 mb-12">
          Plan unforgettable dates & group experiences <span className="text-[#FF5A5F]">— effortlessly.</span>
        </h1>
      </div>
      
      <div className="w-full flex flex-col gap-4 mb-10 z-10">
        <button className="w-full bg-[#FF5A5F] text-white py-[18px] rounded-xl font-semibold text-lg shadow-[0_8px_20px_-6px_rgba(255,90,95,0.6)] active:scale-[0.98] transition-all">
          Get Started
        </button>
        <button className="w-full bg-white text-[#222222] border-2 border-[#EBEBEB] py-[18px] rounded-xl font-semibold text-lg active:scale-[0.98] transition-all hover:bg-gray-50">
          Sign In
        </button>
      </div>
    </div>
  );
}
