import { useState } from 'react';
import { useLocation } from "wouter";
import { Search, MapPin, Star, Filter, X, Ticket } from 'lucide-react';
import { TopBar, BottomNav, FAB, cn } from "@/components/SharedUI";

const VENUES = [
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
    icon: "🍷",
    eventBadge: "3 events this week",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=320&fit=crop&auto=format",
  },
  {
    id: 2,
    name: "The Jazz Corner",
    type: "Live Music",
    rating: 4.6,
    reviews: 120,
    distance: "0.8 mi",
    price: "$$",
    desc: "Hidden speakeasy featuring local jazz bands every weekend.",
    color: "from-amber-400 to-orange-500",
    icon: "🎷",
    eventBadge: null,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=320&fit=crop&auto=format",
  },
  {
    id: 3,
    name: "Riverfront Park Walk",
    type: "Outdoor",
    rating: 4.5,
    reviews: 856,
    distance: "2.1 mi",
    price: "Free",
    desc: "Beautiful paved trail along the river perfect for a sunset stroll.",
    color: "from-emerald-400 to-green-500",
    icon: "🌳",
    eventBadge: null,
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=320&fit=crop&auto=format",
  }
];

// Standalone experiences at non-listed venues (soft venue naming)
const EXPERIENCES = [
  {
    id: "x1",
    name: "Candlelight String Quartet",
    location: "A historic venue · Downtown",
    date: "Fri, Oct 18",
    time: "8:00 PM",
    price: "$35",
    vibes: ["Romantic", "Culture"],
    emoji: "🕯️",
    image: "https://images.unsplash.com/photo-1501612780327-45045538702b?w=480&h=200&fit=crop&auto=format",
    urgency: "Only 12 spots left",
  },
  {
    id: "x2",
    name: "Rooftop Cinema: La La Land",
    location: "Rooftop venue · Midtown",
    date: "Sat, Oct 19",
    time: "9:00 PM",
    price: "$18",
    vibes: ["Date Night", "Relaxing"],
    emoji: "🎬",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=480&h=200&fit=crop&auto=format",
    urgency: null,
  },
  {
    id: "x3",
    name: "Night Market & Live Art",
    location: "Open-air venue · Arts District",
    date: "Sun, Oct 20",
    time: "6:00 PM",
    price: "Free",
    vibes: ["Adventurous", "Group"],
    emoji: "🎨",
    image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=480&h=200&fit=crop&auto=format",
    urgency: null,
  },
];

const VIBE_COLORS: Record<string, string> = {
  "Romantic":    "bg-[#FFF0F1] text-primary",
  "Culture":     "bg-purple-50 text-purple-600",
  "Date Night":  "bg-green-50 text-[#00C851]",
  "Relaxing":    "bg-sky-50 text-sky-600",
  "Adventurous": "bg-orange-50 text-orange-600",
  "Group":       "bg-blue-50 text-blue-600",
};

export function HomeDiscovery() {
  const [, setLocation] = useLocation();
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Date Night', 'Adventure', 'Foodie', 'Group'];

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-background">
      <TopBar />

      <div className="flex-1 min-h-0 overflow-y-auto pb-28 no-scrollbar">
        {/* Greeting & Search */}
        <div className="px-6 pt-6 pb-2">
          <h1 className="text-[28px] font-bold text-foreground mb-5">Good evening, Alex 👋</h1>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Find venues, activities, moods..." 
              className="w-full pl-12 pr-12 py-3.5 bg-card border border-border/50 rounded-2xl shadow-sm font-medium text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button 
              onClick={() => setShowFilters(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background p-2 rounded-xl text-foreground hover:bg-gray-200 transition-colors"
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar snap-x">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "snap-start whitespace-nowrap px-5 py-2.5 rounded-full font-semibold text-sm transition-all",
                activeTab === tab 
                  ? "bg-foreground text-card shadow-md" 
                  : "bg-card text-muted-foreground border border-border hover:border-gray-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Experiences Near You ── */}
        <div className="mb-6">
          <div className="flex justify-between items-center px-6 mb-3">
            <div>
              <h2 className="text-[17px] font-bold text-foreground leading-tight">Experiences Near You</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Curated one-off events worth your evening</p>
            </div>
            <Ticket size={18} className="text-primary" />
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar px-6 snap-x pb-1">
            {EXPERIENCES.map(exp => (
              <div
                key={exp.id}
                onClick={() => setLocation('/plan/generate')}
                className="snap-start shrink-0 w-60 bg-card rounded-2xl border border-border shadow-sm overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
              >
                <div className="h-24 relative overflow-hidden">
                  <img src={exp.image} alt={exp.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                  <span className="absolute inset-0 flex items-center justify-center text-4xl drop-shadow-lg">{exp.emoji}</span>
                  {exp.urgency && (
                    <span className="absolute top-2.5 right-2.5 bg-white/90 text-[#FF9500] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {exp.urgency}
                    </span>
                  )}
                  {exp.price === 'Free' && (
                    <span className="absolute top-2.5 right-2.5 bg-[#E8FFF0] text-[#00C851] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      Free
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="font-bold text-foreground text-[14px] leading-tight mb-1">{exp.name}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mb-0.5">{exp.location}</p>
                  <p className="text-[11px] text-muted-foreground mb-2.5">{exp.date} · {exp.time}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {exp.vibes.map(v => (
                        <span key={v} className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", VIBE_COLORS[v] || "bg-gray-100 text-gray-600")}>
                          {v}
                        </span>
                      ))}
                    </div>
                    {exp.price !== 'Free' && (
                      <span className="text-[12px] font-bold text-foreground ml-1 shrink-0">{exp.price}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Venue Feed ── */}
        <div className="px-6 mb-2">
          <h2 className="text-[17px] font-bold text-foreground">Venues for You</h2>
        </div>
        <div className="px-6 flex flex-col gap-5 pb-6">
          {VENUES.map((venue) => (
            <div 
              key={venue.id} 
              onClick={() => setLocation(`/venue/${venue.id}`)}
              className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="h-44 relative overflow-hidden">
                <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-foreground flex items-center gap-1 shadow-sm">
                  <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                  {venue.rating}
                </div>
                <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl border border-white/30">
                  {venue.icon}
                </div>
                {venue.eventBadge && (
                  <div className="absolute bottom-3 right-3 bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Ticket size={10} /> {venue.eventBadge}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-[18px] text-foreground leading-tight">{venue.name}</h3>
                  <span className={cn("font-bold text-[15px]", venue.price === 'Free' ? "text-[#00C851]" : "text-primary")}>{venue.price}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 font-medium">
                  <span>{venue.type}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span>{venue.distance}</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-[14px] leading-relaxed line-clamp-2">
                  {venue.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FAB type="home" />
      <BottomNav active="home" />

      {/* Filter Modal Overlay */}
      {showFilters && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowFilters(false)}></div>
          <div className="bg-card w-full rounded-t-3xl pt-6 pb-10 px-6 flex flex-col max-h-[90%] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Filters</h2>
              <button onClick={() => setShowFilters(false)} className="w-8 h-8 bg-background rounded-full flex items-center justify-center text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-8">
              <div>
                <h3 className="font-bold text-foreground mb-3 text-sm">Category</h3>
                <div className="flex flex-wrap gap-2">
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">Dining</button>
                  <button className="bg-background border border-border text-foreground px-4 py-2 rounded-full text-sm font-medium">Activity</button>
                  <button className="bg-background border border-border text-foreground px-4 py-2 rounded-full text-sm font-medium">Nightlife</button>
                  <button className="bg-background border border-border text-foreground px-4 py-2 rounded-full text-sm font-medium">Outdoors</button>
                  <button className="bg-background border border-border text-foreground px-4 py-2 rounded-full text-sm font-medium">Experiences</button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-foreground text-sm">Price Range</h3>
                  <span className="text-primary font-bold text-sm">$ • $$$</span>
                </div>
                <div className="h-1 bg-border rounded-full relative mb-2">
                  <div className="absolute left-[20%] right-[30%] h-full bg-primary rounded-full"></div>
                  <div className="absolute left-[20%] top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 bg-white border-2 border-primary rounded-full shadow-sm"></div>
                  <div className="absolute right-[30%] top-1/2 -translate-y-1/2 -mr-2.5 w-5 h-5 bg-white border-2 border-primary rounded-full shadow-sm"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>$</span>
                  <span>$$$$</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-foreground text-sm">Distance</h3>
                  <span className="text-muted-foreground font-medium text-sm">Up to 10 mi</span>
                </div>
                <input type="range" className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none" defaultValue="40" />
              </div>

              <div>
                <h3 className="font-bold text-foreground mb-3 text-sm">Date</h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-primary text-white rounded-xl py-3 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium opacity-90 mb-1">Today</span>
                    <span className="text-xl font-bold">14</span>
                  </div>
                  <div className="bg-background border border-border text-foreground rounded-xl py-3 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-gray-500 mb-1">Tomorrow</span>
                    <span className="text-xl font-bold">15</span>
                  </div>
                  <div className="bg-background border border-border text-foreground rounded-xl py-3 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-gray-500 mb-1">Sat</span>
                    <span className="text-xl font-bold">16</span>
                  </div>
                  <div className="bg-background border border-border text-foreground rounded-xl py-3 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-gray-500 mb-1">Sun</span>
                    <span className="text-xl font-bold">17</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <button onClick={() => setShowFilters(false)} className="text-foreground font-semibold text-sm underline underline-offset-4">Reset</button>
              <button 
                onClick={() => setShowFilters(false)}
                className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-[16px] shadow-lg shadow-primary/30"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
