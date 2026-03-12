import { Bell, Calendar, CheckCircle2, AlertCircle, Star, Users, MapPin, Check } from 'lucide-react';

export function NotificationsCenter() {
  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-white px-6 pt-14 pb-4 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-[#F7F7F7] p-2 rounded-full text-[#222222]">
              <Bell size={20} />
            </div>
            <h1 className="font-bold text-[#222222] text-xl">Notifications</h1>
          </div>
          <button className="text-[#FF5A5F] font-semibold text-sm">Mark all read</button>
        </div>
      </div>

      <div className="flex flex-col pb-10">
        <h2 className="text-sm font-bold text-[#999999] uppercase tracking-wider px-6 py-4 mt-2">Today</h2>
        
        {/* Urgent / Alert */}
        <div className="bg-[#FFF0F1] border-l-4 border-[#FF5A5F] px-6 py-4 flex gap-4 items-start relative">
          <div className="w-2 h-2 rounded-full bg-[#FF5A5F] absolute right-6 top-6"></div>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#FF5A5F] shadow-sm shrink-0">
            <Calendar size={18} />
          </div>
          <div className="pr-4">
            <p className="font-semibold text-[#222222] text-[15px] leading-tight mb-1">Your date is tonight!</p>
            <p className="text-sm text-[#555555] mb-2">Downtown Romance starts at 7:00 PM at Lumina Restaurant.</p>
            <span className="text-xs text-[#FF5A5F] font-bold">2 hours ago</span>
          </div>
        </div>

        {/* Success */}
        <div className="bg-white border-b border-[#F0F0F0] px-6 py-4 flex gap-4 items-start relative">
          <div className="w-2 h-2 rounded-full bg-[#FF5A5F] absolute right-6 top-6"></div>
          <div className="w-10 h-10 rounded-full bg-[#E8FFF0] flex items-center justify-center text-[#00C851] shrink-0">
            <Check size={18} strokeWidth={3} />
          </div>
          <div className="pr-4">
            <p className="font-medium text-[#222222] text-[15px] mb-1">
              <span className="font-bold">Sarah</span> accepted the plan
            </p>
            <p className="text-sm text-[#555555]">Saturday Night Out is confirmed.</p>
            <span className="text-xs text-[#999999] font-medium mt-1 inline-block">5 hours ago</span>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-white border-b border-[#F0F0F0] px-6 py-4 flex gap-4 items-start relative">
          <div className="w-10 h-10 rounded-full bg-[#FFF3E8] flex items-center justify-center text-[#FF9500] shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="font-bold text-[#222222] text-[15px] mb-1">Budget Alert</p>
            <p className="text-sm text-[#555555]">You've used 80% of your October date budget.</p>
            <span className="text-xs text-[#999999] font-medium mt-1 inline-block">8 hours ago</span>
          </div>
        </div>

        <h2 className="text-sm font-bold text-[#999999] uppercase tracking-wider px-6 py-4 mt-2 border-t border-[#EBEBEB]">Earlier this week</h2>

        {/* Action needed */}
        <div className="bg-white border-b border-[#F0F0F0] px-6 py-4 flex gap-4 items-start relative">
          <div className="w-10 h-10 rounded-full bg-[#F7F7F7] border border-[#EBEBEB] flex items-center justify-center text-[#222222] shrink-0">
            <Star size={18} />
          </div>
          <div>
            <p className="font-bold text-[#222222] text-[15px] mb-1">Rate your last date!</p>
            <p className="text-sm text-[#555555] mb-2">How was your time at The Jazz Corner?</p>
            <button className="bg-[#F7F7F7] px-4 py-1.5 rounded-lg text-sm font-semibold text-[#222222] border border-[#EBEBEB]">Leave Review</button>
            <span className="text-xs text-[#999999] font-medium mt-2 block">2 days ago</span>
          </div>
        </div>

        {/* Social */}
        <div className="bg-white border-b border-[#F0F0F0] px-6 py-4 flex gap-4 items-start relative">
          <div className="w-10 h-10 rounded-full bg-[#E8F4FF] flex items-center justify-center text-[#007AFF] shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="font-medium text-[#222222] text-[15px] mb-1">
              <span className="font-bold">Mike R.</span> added you to a group
            </p>
            <p className="text-sm text-[#555555]">"Ski Trip Planning" group was created.</p>
            <span className="text-xs text-[#999999] font-medium mt-1 inline-block">3 days ago</span>
          </div>
        </div>

        {/* System/Info */}
        <div className="bg-white border-b border-[#F0F0F0] px-6 py-4 flex gap-4 items-start relative opacity-70">
          <div className="w-10 h-10 rounded-full bg-[#F7F7F7] border border-[#EBEBEB] flex items-center justify-center text-[#555555] shrink-0">
            <MapPin size={18} />
          </div>
          <div>
            <p className="font-medium text-[#222222] text-[15px] mb-1">New venues near you</p>
            <p className="text-sm text-[#555555]">Check out 5 new spots added in Downtown.</p>
            <span className="text-xs text-[#999999] font-medium mt-1 inline-block">4 days ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}