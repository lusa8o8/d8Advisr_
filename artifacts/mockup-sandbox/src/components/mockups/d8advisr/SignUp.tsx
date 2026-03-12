import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function SignUp() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-[390px] min-h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col items-center p-6 relative mx-auto shadow-2xl overflow-hidden">
      {/* Header Logo */}
      <div className="w-full flex justify-center mt-12 mb-8">
        <div className="flex items-baseline">
          <span className="font-bold text-3xl text-[#FF5A5F] tracking-tight">D8</span>
          <span className="font-bold text-3xl text-[#222222] tracking-tight">Advisr</span>
        </div>
      </div>

      <div className="w-full bg-white rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <h1 className="text-2xl font-bold text-[#222222] mb-8 text-center">Create your account</h1>
        
        <div className="flex flex-col gap-5 mb-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#555555]">Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com"
              className="w-full px-4 py-3.5 rounded-xl border border-[#EBEBEB] bg-[#F7F7F7] focus:bg-white focus:outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F] transition-all text-[#222222] placeholder:text-gray-400"
            />
          </div>
          
          <div className="flex flex-col gap-2 relative">
            <label className="text-sm font-medium text-[#555555]">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Create a password"
                className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-[#EBEBEB] bg-[#F7F7F7] focus:bg-white focus:outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F] transition-all text-[#222222] placeholder:text-gray-400"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#555555]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>
        </div>

        <button className="w-full bg-[#FF5A5F] text-white py-4 rounded-xl font-semibold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all mb-6">
          Sign Up
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-[#EBEBEB]"></div>
          <span className="text-sm text-gray-400 font-medium">OR</span>
          <div className="h-[1px] flex-1 bg-[#EBEBEB]"></div>
        </div>

        <button className="w-full bg-white text-[#222222] border-2 border-[#EBEBEB] py-3.5 rounded-xl font-semibold text-[16px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-gray-50">
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="mt-8">
        <p className="text-[#555555] font-medium text-[15px]">
          Already have an account? <a href="#" className="text-[#FF5A5F] font-semibold hover:underline">Sign In</a>
        </p>
      </div>
    </div>
  );
}
