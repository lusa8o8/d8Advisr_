import { useState } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, Star, MapPin, Heart, Clock, Share, Phone, Globe, Ticket, Bell, BellOff } from 'lucide-react';
import { cn } from "@/components/SharedUI";

const VENUE_EVENTS = [
  {
    id: "e1",
    name: "Jazz & Wine Night",
    date: "Fri, Oct 18",
    time: "7:30 PM",
    vibes: ["Romantic", "Foodie"],
    price: "$20 /pp",
    emoji: "🎷",
    desc: "Local jazz quartet paired with a curated wine flight. Perfect for a slow, soulful evening.",
    color: "from-amber-400 to-orange-500",
    spotsLeft: 8,
  },
  {
    id: "e2",
    name: "Chef's Table Experience",
    date: "Sat, Oct 19",
    time: "8:00 PM",
    vibes: ["Romantic", "Adventurous"],
    price: "$95 /pp",
    emoji: "👨‍🍳",
    desc: "6-course tasting menu crafted live by the head chef. Limited to 10 guests.",
    color: "from-rose-400 to-red-500",
    spotsLeft: 3,
  },
  {
    id: "e3",
    name: "Sunset Rooftop Social",
    date: "Sun, Oct 20",
    time: "6:00 PM",
    vibes: ["Group", "Date Night"],
    price: "$15 /pp",
    emoji: "🌅",
    desc: "Cocktails and small bites as the sun sets over downtown. Relaxed and open format.",
    color: "from-purple-400 to-pink-500",
    spotsLeft: 22,
  },
];

const VIBE_COLORS: Record<string, string> = {
  "Romantic": "bg-[#FFF0F1] text-primary",
  "Foodie":   "bg-orange-50 text-orange-600",
  "Adventurous": "bg-purple-50 text-purple-600",
  "Group":    "bg-blue-50 text-blue-600",
  "Date Night": "bg-green-50 text-[#00C851]",
};

export function VenueDetails() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('Overview');
  const [notifyOn, setNotifyOn] = useState(true);

  return (
    <div className="flex-1 min-h-0 bg-card flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header Image Area */}
      <div className="h-72 bg-gradient-to-br from-rose-400 to-red-500 relative flex items-center justify-center rounded-b-[40px] shadow-sm shrink-0">
        <button 
          onClick={() => setLocation('/home')}
          className="absolute top-14 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <button className="absolute top-14 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <Share size={18} />
        </button>
        <span className="text-7xl drop-shadow-xl mt-4">🍷</span>
      </div>

      <div className="px-6 -mt-8 relative z-10">
        {/* Main Info Card */}
        <div className="bg-card rounded-3xl p-6 shadow-md border border-border mb-6">
          <div className="flex justify-between items-start mb-2">
            <span className="bg-background px-3 py-1 rounded-full text-xs font-bold text-muted-foreground uppercase tracking-wider">Romantic Dining</span>
            <div className="bg-[#E8FFF0] text-[#00C851] px-3 py-1 rounded-full text-xs font-bold shadow-sm">
              Est. $65/pp
            </div>
          </div>
          
          <h1 className="text-[26px] font-bold text-foreground leading-tight mb-3">Lumina Restaurant & Bar</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium mb-4">
            <div className="flex items-center gap-1 text-foreground">
              <Star size={16} className="fill-[#FF9500] text-[#FF9500]" />
              <span className="font-bold">4.8</span>
              <span className="text-gray-400 font-normal">(324 reviews)</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className="text-primary font-bold">$$$</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-foreground bg-background p-3 rounded-xl">
            <MapPin size={16} className="text-primary shrink-0" />
            <span className="font-medium">123 Main St, Downtown District</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {['Overview', 'Events', 'Reviews', 'Location'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 pb-4 font-semibold text-[13px] relative transition-colors",
                activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {tab === 'Events' && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold align-middle">3</span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'Overview' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
              Experience intimate dining with panoramic views of the city skyline. Lumina offers modern fusion cuisine blending local ingredients with international techniques, complemented by an award-winning wine list.
            </p>

            <h3 className="font-bold text-foreground text-lg mb-4">Highlights</h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF0F1] flex items-center justify-center text-primary">❤️</div>
                <span className="text-sm font-medium text-foreground">Romantic</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-foreground">🌳</div>
                <span className="text-sm font-medium text-foreground">Outdoor</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-foreground">🍸</div>
                <span className="text-sm font-medium text-foreground">Full Bar</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-foreground"><Clock size={16} /></div>
                <span className="text-sm font-medium text-foreground">Until 11 PM</span>
              </div>
            </div>

            {/* Upcoming at this venue — preview */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-foreground text-lg">Upcoming here</h3>
                <button onClick={() => setActiveTab('Events')} className="text-sm font-bold text-primary">See all</button>
              </div>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setActiveTab('Events')}>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-sm shrink-0">🎷</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-[15px] leading-tight">Jazz & Wine Night</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Fri, Oct 18 · 7:30 PM · $20/pp</p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF0F1] text-primary">Romantic</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">Foodie</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#FF9500] bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-xl">8 left</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 border-t border-border pt-6">
               <button className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-background transition-colors">
                  <div className="flex items-center gap-3 text-foreground font-medium text-sm">
                    <Phone size={16} className="text-muted-foreground" />
                    (555) 123-4567
                  </div>
               </button>
               <button className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-background transition-colors">
                  <div className="flex items-center gap-3 text-foreground font-medium text-sm">
                    <Globe size={16} className="text-muted-foreground" />
                    luminarestaurant.com
                  </div>
               </button>
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'Events' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            {/* Notify toggle */}
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 mb-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {notifyOn ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div>
                  <p className="font-bold text-foreground text-[14px] leading-tight">Vibe alerts for this venue</p>
                  <p className="text-[12px] text-muted-foreground">Get notified when events match your vibe</p>
                </div>
              </div>
              <button
                onClick={() => setNotifyOn(v => !v)}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative shrink-0 overflow-hidden",
                  notifyOn ? "bg-primary" : "bg-gray-200"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                  notifyOn ? "translate-x-[18px]" : "translate-x-0"
                )} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {VENUE_EVENTS.map(event => (
                <div key={event.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className={`h-20 bg-gradient-to-r ${event.color} flex items-center px-5 gap-4`}>
                    <span className="text-3xl">{event.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-[16px] leading-tight">{event.name}</p>
                      <p className="text-white/80 text-[12px] font-medium mt-0.5">{event.date} · {event.time}</p>
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-2.5 py-1.5 rounded-xl shrink-0",
                      event.spotsLeft <= 5
                        ? "bg-white/20 text-white"
                        : "bg-white/20 text-white"
                    )}>
                      {event.spotsLeft <= 5 ? `${event.spotsLeft} left` : `${event.spotsLeft} spots`}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{event.desc}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5 flex-wrap">
                        {event.vibes.map(v => (
                          <span key={v} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", VIBE_COLORS[v] || "bg-gray-100 text-gray-600")}>
                            {v}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground text-[14px]">{event.price}</span>
                        <button
                          onClick={() => setLocation('/plan/generate')}
                          className="flex items-center gap-1.5 bg-primary text-white text-[12px] font-bold px-3.5 py-2 rounded-xl shadow-sm active:scale-95 transition-transform"
                        >
                          <Ticket size={13} /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Bottom */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-card border-t border-border p-6 flex gap-4 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button className="w-14 h-14 rounded-xl border-2 border-border flex items-center justify-center text-foreground active:scale-95 transition-transform hover:bg-background hover:text-primary hover:border-primary/30">
          <Heart size={24} />
        </button>
        <button 
          onClick={() => setLocation('/plan/generate')}
          className="flex-1 bg-primary text-primary-foreground rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all hover:bg-primary/90"
        >
          Add to Plan
        </button>
      </div>
    </div>
  );
}
