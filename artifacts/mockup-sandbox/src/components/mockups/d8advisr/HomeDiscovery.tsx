import { Bell, Settings, Search, MapPin, Star, Home, Calendar, User } from 'lucide-react';

export function HomeDiscovery() {
  const venues = [
    {
      id: 1,
      name: "Lumina Restaurant & Bar",
      type: "Romantic Dining",
      rating: 4.8,
      reviews: 324,
      distance: "1.2 mi",
      price: "$$$",
      desc: "Intimate atmosphere with panoramic city views and modern fusion cuisine.",
      color: "from-rose-400 to-red-500",
      icon: "🍷"
    },
    {
      id: 2,
      name: "Glow Mini Golf",
      type: "Fun Activity",
      rating: 4.6,
      reviews: 856,
      distance: "3.5 mi",
      price: "$",
      desc: "Neon-lit indoor mini golf course perfect for a playful evening.",
      color: "from-blue-400 to-indigo-500",
      icon: "⛳"
    },
    {
      id: 3,
      name: "The Jazz Corner",
      type: "Live Music",
      rating: 4.9,
      reviews: 120,
      distance: "0.8 mi",
      price: "$$",
      desc: "Hidden speakeasy featuring local jazz bands every weekend.",
      color: "from-amber-400 to-orange-500",
      icon: "🎷"
    }
  ];

  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white px-6 pt-14 pb-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-baseline">
          <span className="font-bold text-2xl text-[#FF5A5F] tracking-tight">D8</span>
          <span className="font-bold text-2xl text-[#222222] tracking-tight">Advisr</span>
        </div>
        <div className="flex gap-4">
          <button className="relative text-[#222222]">
            <Bell size={24} />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#FF5A5F] rounded-full border-2 border-white"></span>
          </button>
          <button className="text-[#222222]">
            <Settings size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {/* Greeting & Search */}
        <div className="px-6 pt-6 pb-2">
          <h1 className="text-[28px] font-bold text-[#222222] mb-5">Good evening, Alex 👋</h1>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999999]" size={20} />
            <input 
              type="text" 
              placeholder="Find venues, activities, moods..." 
              className="w-full pl-12 pr-4 py-3.5 bg-white border-none rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] font-medium text-[#222222] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#F7F7F7] p-1.5 rounded-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar snap-x">
          <button className="snap-start whitespace-nowrap px-5 py-2.5 bg-[#222222] text-white rounded-full font-semibold text-sm shadow-md">
            All
          </button>
          <button className="snap-start whitespace-nowrap px-5 py-2.5 bg-white text-[#555555] border border-[#EBEBEB] rounded-full font-medium text-sm">
            Date Night
          </button>
          <button className="snap-start whitespace-nowrap px-5 py-2.5 bg-white text-[#555555] border border-[#EBEBEB] rounded-full font-medium text-sm">
            Adventure
          </button>
          <button className="snap-start whitespace-nowrap px-5 py-2.5 bg-white text-[#555555] border border-[#EBEBEB] rounded-full font-medium text-sm">
            Foodie
          </button>
          <button className="snap-start whitespace-nowrap px-5 py-2.5 bg-white text-[#555555] border border-[#EBEBEB] rounded-full font-medium text-sm">
            Group
          </button>
        </div>

        {/* Feed */}
        <div className="px-6 flex flex-col gap-5 pb-6">
          {venues.map((venue) => (
            <div key={venue.id} className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#F0F0F0]">
              <div className={`h-40 bg-gradient-to-br ${venue.color} relative flex items-center justify-center`}>
                <span className="text-5xl drop-shadow-md">{venue.icon}</span>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#222222] flex items-center gap-1">
                  <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                  {venue.rating}
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-[18px] text-[#222222] leading-tight">{venue.name}</h3>
                  <span className="font-bold text-[#FF5A5F] text-[15px]">{venue.price}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#999999] mb-3 font-medium">
                  <span>{venue.type}</span>
                  <span className="w-1 h-1 rounded-full bg-[#D1D1D1]"></span>
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span>{venue.distance}</span>
                  </div>
                </div>
                <p className="text-[#555555] text-[14px] leading-relaxed line-clamp-2">
                  {venue.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Surprise Me FAB */}
      <button className="absolute bottom-28 right-6 bg-[#FF5A5F] text-white px-5 py-4 rounded-full font-bold shadow-[0_8px_25px_-6px_rgba(255,90,95,0.6)] flex items-center gap-2 active:scale-95 transition-transform z-30">
        <span className="text-xl">✨</span>
        Surprise Me
      </button>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 w-full bg-white border-t border-[#EBEBEB] pb-8 pt-4 px-8 flex justify-between items-center z-20 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button className="flex flex-col items-center gap-1.5 text-[#FF5A5F]">
          <Home size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <Calendar size={24} />
          <span className="text-[10px] font-medium">Plans</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-[#999999] hover:text-[#555555]">
          <User size={24} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
}
