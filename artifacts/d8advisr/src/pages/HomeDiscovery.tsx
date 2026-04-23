import { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import { Search, MapPin, Star, Filter, X, Ticket, ShieldCheck, Award, Gem, Lock } from 'lucide-react';
import { TopBar, BottomNav, FAB, cn } from "@/components/SharedUI";
import { useIsDesktop } from "@/hooks/useIsDesktop";

type Tier = 'Verified' | 'D8 Approved' | 'Hidden Gem';

const TIER_STYLES: Record<Tier, { pill: string; dot: string; icon: React.ElementType }> = {
  'Verified':    { pill: 'bg-blue-600/80 text-white',   dot: 'bg-blue-300',    icon: ShieldCheck },
  'D8 Approved': { pill: 'bg-amber-500/80 text-white',  dot: 'bg-amber-200',   icon: Award },
  'Hidden Gem':  { pill: 'bg-purple-600/80 text-white', dot: 'bg-purple-300',  icon: Gem },
};

const VENUES = [
  {
    id: 1,
    name: "Lumina Restaurant & Bar",
    type: "Romantic Dining",
    tier: 'D8 Approved' as Tier,
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
    tier: 'Verified' as Tier,
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
    tier: 'Verified' as Tier,
    rating: 4.5,
    reviews: 856,
    distance: "2.1 mi",
    price: "Free",
    desc: "Beautiful paved trail along the river perfect for a sunset stroll.",
    color: "from-emerald-400 to-green-500",
    icon: "🌳",
    eventBadge: null,
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=320&fit=crop&auto=format",
  },
  {
    id: 4,
    name: "The Terrace at Eko",
    type: "Rooftop Bar",
    tier: 'Hidden Gem' as Tier,
    rating: 4.9,
    reviews: 47,
    distance: "0.5 mi",
    price: "$$$$",
    desc: "A secret rooftop with panoramic Lagos skyline views, craft cocktails, and a curated guest list — not listed anywhere else.",
    color: "from-purple-600 to-violet-900",
    icon: "🌃",
    eventBadge: "Members only Fri",
    image: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=600&h=320&fit=crop&auto=format",
  },
  {
    id: 5,
    name: "House of Gidi",
    type: "Afrobeats Lounge",
    tier: 'Hidden Gem' as Tier,
    rating: 4.7,
    reviews: 23,
    distance: "1.8 mi",
    price: "$$$",
    desc: "An underground Afrobeats experience in a converted warehouse — intimate, vibey, and undiscovered by the masses.",
    color: "from-violet-700 to-purple-900",
    icon: "🎵",
    eventBadge: null,
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=320&fit=crop&auto=format",
  },
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
  const [paymentLinked, setPaymentLinked] = useState(false);
  const [showGemGate, setShowGemGate] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    setPaymentLinked(localStorage.getItem('d8advisr_payment_linked') === 'true');
  }, []);

  const tabs = ['All', 'Date Night', 'Adventure', 'Foodie', 'Group'];

  if (isDesktop) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-[#F7F7F7]">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Desktop Hero Header */}
        <div
          className="px-10 pt-10 pb-8"
          style={{ background: 'linear-gradient(135deg, #141414 0%, #1e1e1e 100%)' }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <p className="text-[13px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>
                THURSDAY EVENING · LAGOS
              </p>
              <h1 className="text-[36px] font-black text-white leading-tight">
                Good evening, Alex 👋
              </h1>
              <p className="mt-1.5 text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Where are you heading tonight?
              </p>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search venues, moods, experiences..."
                className="w-full pl-14 pr-36 py-4 rounded-2xl font-medium text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                onClick={() => setShowFilters(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-[13px] transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                <Filter size={14} />
                Filters
              </button>
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-10 py-5 bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
          <div className="max-w-5xl mx-auto flex gap-2.5 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-all",
                  activeTab === tab
                    ? "bg-foreground text-white shadow-md"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-10 py-8 max-w-5xl mx-auto">

          {/* Experiences section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[20px] font-bold text-foreground">Experiences Near You</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Curated one-off events worth your evening</p>
              </div>
              <button className="text-primary font-semibold text-sm flex items-center gap-1.5 hover:opacity-80">
                <Ticket size={15} /> View all
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {EXPERIENCES.map(exp => (
                <div
                  key={exp.id}
                  onClick={() => setLocation('/plan/generate')}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group"
                >
                  <div className="h-36 relative overflow-hidden">
                    <img src={exp.image} alt={exp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
                    <span className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-lg">{exp.emoji}</span>
                    {exp.urgency && (
                      <span className="absolute top-3 right-3 bg-white/90 text-[#FF9500] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                        {exp.urgency}
                      </span>
                    )}
                    {exp.price === 'Free' && (
                      <span className="absolute top-3 right-3 bg-[#E8FFF0] text-[#00C851] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                        Free
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-foreground text-[15px] leading-tight mb-1">{exp.name}</p>
                    <p className="text-[12px] text-muted-foreground font-medium">{exp.location}</p>
                    <p className="text-[12px] text-muted-foreground mb-3">{exp.date} · {exp.time}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5 flex-wrap">
                        {exp.vibes.map(v => (
                          <span key={v} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", VIBE_COLORS[v] || "bg-gray-100 text-gray-600")}>
                            {v}
                          </span>
                        ))}
                      </div>
                      {exp.price !== 'Free' && (
                        <span className="text-[14px] font-bold text-foreground">{exp.price}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Venues section */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[20px] font-bold text-foreground">Venues For You</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Handpicked for the best evenings in Lagos</p>
              </div>
              <button
                onClick={() => setLocation('/map')}
                className="text-primary font-semibold text-sm flex items-center gap-1.5 hover:opacity-80"
              >
                <MapPin size={15} /> View on map
              </button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {VENUES.map(venue => {
                const t = TIER_STYLES[venue.tier];
                const Icon = t.icon;
                const isGemLocked = venue.tier === 'Hidden Gem' && !paymentLinked;

                if (isGemLocked) {
                  return (
                    <div
                      key={venue.id}
                      onClick={() => setShowGemGate(true)}
                      className="bg-white rounded-2xl overflow-hidden border-2 border-purple-200 cursor-pointer hover:border-purple-400 transition-all group relative"
                    >
                      {/* Blurred image */}
                      <div className="h-52 relative overflow-hidden">
                        <img src={venue.image} alt="Hidden Gem" className="w-full h-full object-cover scale-110" style={{ filter: 'blur(6px)', opacity: 0.35 }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/80 via-purple-900/50 to-purple-800/30" />
                        {/* Lock overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-purple-600/90 backdrop-blur-sm flex items-center justify-center shadow-lg mb-1">
                            <Gem size={22} className="text-white" strokeWidth={1.5} />
                          </div>
                          <p className="font-bold text-white text-[15px] leading-tight">Hidden Gem</p>
                          <p className="text-purple-200 text-[11px] font-medium leading-snug">Link your Stash to reveal this exclusive spot</p>
                        </div>
                        {/* Badge */}
                        <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-600/80 text-white text-[11px] font-bold shadow-sm backdrop-blur-sm">
                          <Gem size={11} strokeWidth={2.5} /> Hidden Gem
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="h-4 bg-purple-100 rounded-full w-3/4 mb-2" />
                        <div className="h-3 bg-purple-50 rounded-full w-1/2 mb-3" />
                        <button
                          className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                        >
                          <Lock size={13} /> Link Stash to Unlock
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={venue.id}
                    onClick={() => setLocation(`/venue/${venue.id}`)}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group"
                  >
                    <div className="h-52 relative overflow-hidden">
                      <img src={venue.image} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

                      {/* Tier badge */}
                      <div className={cn(
                        "absolute top-3.5 left-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm text-[11px] font-bold shadow-sm",
                        t.pill
                      )}>
                        <Icon size={11} strokeWidth={2.5} />
                        {venue.tier}
                      </div>

                      {/* Rating */}
                      <div className="absolute top-3.5 right-3.5 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-foreground flex items-center gap-1 shadow-sm">
                        <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                        {venue.rating}
                        <span className="text-gray-400 font-normal">({venue.reviews})</span>
                      </div>

                      {/* Emoji */}
                      <div className="absolute bottom-3.5 left-3.5 w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl border border-white/30">
                        {venue.icon}
                      </div>

                      {/* Event badge */}
                      {venue.eventBadge && (
                        <div className="absolute bottom-3.5 right-3.5 bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Ticket size={10} /> {venue.eventBadge}
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-[17px] text-foreground leading-tight">{venue.name}</h3>
                        <span className={cn("font-bold text-[15px] shrink-0 ml-2", venue.price === 'Free' ? "text-[#00C851]" : "text-primary")}>
                          {venue.price}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3 font-medium">
                        <span>{venue.type}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />{venue.distance}
                        </div>
                      </div>
                      <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-4">{venue.desc}</p>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const params = new URLSearchParams({
                            venueId: String(venue.id),
                            venueName: venue.name,
                            venueEmoji: venue.icon,
                            venueCategory: venue.type,
                          });
                          setLocation(`/plan/generate?${params.toString()}`);
                        }}
                        className="w-full py-3 rounded-xl border-2 border-primary text-primary font-bold text-[13px] hover:bg-primary hover:text-white transition-all"
                      >
                        + Add to Plan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

        {/* Desktop filter modal */}
        {showFilters && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
            <div className="relative bg-white rounded-2xl w-full max-w-md mx-8 p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-foreground hover:bg-gray-200">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-bold text-foreground mb-3 text-sm">Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Dining', 'Activity', 'Nightlife', 'Outdoors', 'Experiences'].map(cat => (
                      <button key={cat} className="bg-gray-100 border border-gray-200 text-foreground px-4 py-2 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors first:bg-primary first:text-white first:border-primary">
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-foreground text-sm">Price Range</h3>
                    <span className="text-primary font-bold text-sm">$ — $$$</span>
                  </div>
                  <input type="range" className="w-full accent-primary" defaultValue="70" />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowFilters(false)} className="px-6 py-3 rounded-xl border border-gray-200 text-foreground font-semibold text-sm hover:bg-gray-50">
                  Reset
                </button>
                <button onClick={() => setShowFilters(false)} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-[15px] shadow-lg shadow-primary/30">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Hidden Gem gate modal */}
        {showGemGate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGemGate(false)} />
            <div className="relative bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowGemGate(false)} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X size={16} />
              </button>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg">
                  <Gem size={28} className="text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">Members Only</p>
                  <h3 className="text-[22px] font-bold text-foreground leading-tight">Hidden Gem Venues</h3>
                </div>
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed mb-5">
                Hidden Gem venues are exclusive spots curated by our team — hand-picked for quality. They're only visible to members who've linked their Stash.
              </p>
              <div className="flex flex-col gap-2 mb-6">
                {['🌃 Rooftop bars with skyline views', '🎵 Underground music & lounge experiences', '🍽 Chef-table dining with no waitlist', '🎁 Members-only events & early access'].map(item => (
                  <div key={item} className="bg-purple-50 rounded-xl px-4 py-3 text-[13px] font-semibold text-purple-800">
                    {item}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowGemGate(false); setLocation('/settings'); }}
                className="w-full py-4 rounded-xl bg-purple-600 text-white font-bold text-[15px] shadow-lg shadow-purple-600/30 mb-3"
              >
                Link Stash & Unlock 💎
              </button>
              <button onClick={() => setShowGemGate(false)} className="w-full text-center text-[13px] font-semibold text-muted-foreground">
                Not now
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

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
          {VENUES.map((venue) => {
            const isGemLocked = venue.tier === 'Hidden Gem' && !paymentLinked;

            if (isGemLocked) {
              return (
                <div
                  key={venue.id}
                  onClick={() => setShowGemGate(true)}
                  className="bg-card rounded-3xl overflow-hidden shadow-sm border-2 border-purple-200 cursor-pointer"
                >
                  <div className="h-44 relative overflow-hidden">
                    <img src={venue.image} alt="Hidden Gem" className="w-full h-full object-cover scale-110" style={{ filter: 'blur(6px)', opacity: 0.3 }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-950/80 via-purple-900/50 to-purple-800/30" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg mb-1">
                        <Gem size={22} className="text-white" strokeWidth={1.5} />
                      </div>
                      <p className="font-bold text-white text-[16px]">Hidden Gem</p>
                      <p className="text-purple-200 text-[12px] font-medium">Link your Stash to reveal this exclusive spot</p>
                    </div>
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-600/80 text-white text-[11px] font-bold shadow-sm backdrop-blur-sm">
                      <Gem size={11} strokeWidth={2.5} /> Hidden Gem
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="h-4 bg-purple-100 rounded-full w-3/4 mb-2" />
                    <div className="h-3 bg-purple-50 rounded-full w-1/2 mb-4" />
                    <button className="w-full py-3 rounded-2xl bg-purple-600 text-white font-bold text-[14px] flex items-center justify-center gap-2">
                      <Lock size={14} /> Link Stash to Unlock
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={venue.id}
                onClick={() => setLocation(`/venue/${venue.id}`)}
                className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="h-44 relative overflow-hidden">
                  <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

                  {/* Tier badge — top left */}
                  {(() => {
                    const t = TIER_STYLES[venue.tier];
                    const Icon = t.icon;
                    return (
                      <div className={cn(
                        "absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm text-[11px] font-bold shadow-sm",
                        t.pill
                      )}>
                        <Icon size={11} strokeWidth={2.5} />
                        {venue.tier}
                      </div>
                    );
                  })()}

                  {/* Rating — top right */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-foreground flex items-center gap-1 shadow-sm">
                    <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                    {venue.rating}
                  </div>

                  {/* Emoji icon — bottom left */}
                  <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl border border-white/30">
                    {venue.icon}
                  </div>

                  {/* Event badge — bottom right */}
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
            );
          })}
        </div>
      </div>

      <FAB type="home" />
      <BottomNav active="home" />

      {/* Hidden Gem gate sheet */}
      {showGemGate && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGemGate(false)} />
          <div className="relative bg-white rounded-t-3xl px-6 pt-6 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg">
                <Gem size={28} className="text-white" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">Members Only</p>
                <h3 className="text-[22px] font-bold text-foreground leading-tight">Hidden Gem Venues</h3>
              </div>
            </div>
            <p className="text-[14px] text-muted-foreground leading-relaxed mb-5">
              Hidden Gem venues are exclusive spots curated by our team — hand-picked for quality and experience. They're only visible to members who've linked their Stash.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {['🌃 Rooftop bars with skyline views', '🎵 Underground music & lounge experiences', '🍽 Chef-table dining with no waitlist', '🎁 Members-only events & early access'].map(item => (
                <div key={item} className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3 text-[13px] font-semibold text-purple-800">
                  {item}
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowGemGate(false); setLocation('/settings'); }}
              className="w-full py-4 rounded-2xl bg-purple-600 text-white font-bold text-[16px] shadow-lg shadow-purple-600/30 mb-3"
            >
              Link Stash & Unlock 💎
            </button>
            <button onClick={() => setShowGemGate(false)} className="w-full text-center text-[13px] font-semibold text-muted-foreground py-1">
              Not now
            </button>
          </div>
        </div>
      )}

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
