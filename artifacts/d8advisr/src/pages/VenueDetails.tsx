import { useState } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, Star, MapPin, Heart, Clock, Share, Phone, Globe, Ticket, Bell, BellOff, ThumbsUp, Navigation, Car, Footprints, Copy } from 'lucide-react';
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
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=200&fit=crop&auto=format",
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
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=200&fit=crop&auto=format",
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
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=200&fit=crop&auto=format",
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

const REVIEWS = [
  {
    id: "r1",
    avatar: "🥰",
    name: "Jordan",
    occasion: "First Date",
    timeAgo: "2 weeks ago",
    rating: 5,
    text: "Candles everywhere, soft jazz, you completely forget the city exists outside. My date couldn't stop smiling. Already planning our anniversary here.",
    helpful: 12,
  },
  {
    id: "r2",
    avatar: "😎",
    name: "Marcus",
    occasion: "Anniversary",
    timeAgo: "1 month ago",
    rating: 5,
    text: "The lighting alone is worth it. Dim enough to feel intimate, bright enough to actually see each other. Staff gave us space — but were always there when we needed. Perfect.",
    helpful: 8,
  },
  {
    id: "r3",
    avatar: "🌹",
    name: "Priya",
    occasion: "Date Night",
    timeAgo: "3 weeks ago",
    rating: 4,
    text: "Gorgeous atmosphere and the food was seriously amazing. It got a little loud on Friday — might choose a weeknight next time. The rooftop seating is everything though.",
    helpful: 5,
  },
];

const RATING_BREAKDOWN = [
  { label: "Atmosphere",           score: 4.9 },
  { label: "Conversation-friendly", score: 4.5 },
  { label: "Lighting",             score: 4.9 },
  { label: "Service",              score: 4.7 },
];

const VIBE_TAGS = ["Intimate", "Candlelit", "Great lighting", "Rooftop views", "Worth the price", "Attentive staff"];

const NEARBY_VENUES = [
  {
    id: "n1",
    emoji: "🍸",
    name: "The Velvet Lounge",
    type: "Pre-dinner cocktails",
    distance: "3 min walk",
    timing: "Before",
    image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=200&h=130&fit=crop&auto=format",
  },
  {
    id: "n2",
    emoji: "🌊",
    name: "Waterfront Promenade",
    type: "After dinner stroll",
    distance: "5 min walk",
    timing: "After",
    image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=200&h=130&fit=crop&auto=format",
  },
  {
    id: "n3",
    emoji: "🍰",
    name: "Petite Patisserie",
    type: "Dessert & coffee",
    distance: "4 min walk",
    timing: "After",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=130&fit=crop&auto=format",
  },
];

export function VenueDetails() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('Overview');
  const [notifyOn, setNotifyOn] = useState(true);

  return (
    <div className="flex-1 min-h-0 bg-card flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header Image Area */}
      <div className="h-72 relative overflow-hidden rounded-b-[40px] shadow-md shrink-0">
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&auto=format"
          alt="Lumina Restaurant & Bar"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/25" />
        <button 
          onClick={() => setLocation('/home')}
          className="absolute top-14 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/20"
        >
          <ArrowLeft size={20} />
        </button>
        <button className="absolute top-14 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/20">
          <Share size={18} />
        </button>
        <div className="absolute bottom-6 left-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl">
            🍷
          </div>
          <div>
            <p className="text-white font-bold text-[17px] drop-shadow-sm">Lumina Restaurant & Bar</p>
            <p className="text-white/80 text-[12px] font-medium">Romantic Dining · Downtown</p>
          </div>
        </div>
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
                  <div className="h-24 relative overflow-hidden">
                    <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20" />
                    <div className="absolute inset-0 flex items-center px-5 gap-4">
                      <span className="text-3xl drop-shadow-md shrink-0">{event.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-[16px] leading-tight">{event.name}</p>
                        <p className="text-white/80 text-[12px] font-medium mt-0.5">{event.date} · {event.time}</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1.5 rounded-xl shrink-0 bg-white/20 text-white backdrop-blur-sm border border-white/20">
                        {event.spotsLeft <= 5 ? `${event.spotsLeft} left` : `${event.spotsLeft} spots`}
                      </span>
                    </div>
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
        {/* ── REVIEWS TAB ── */}
        {activeTab === 'Reviews' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">

            {/* Aggregate score */}
            <div className="bg-card rounded-3xl p-5 border border-border shadow-sm mb-6">
              <div className="flex items-center gap-5 mb-5">
                <div className="text-center">
                  <p className="text-5xl font-black text-foreground leading-none">4.8</p>
                  <div className="flex gap-0.5 mt-1.5 justify-center">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} className="fill-[#FF9500] text-[#FF9500]" />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">324 date reviews</p>
                </div>
                <div className="flex-1 flex flex-col gap-2.5">
                  {RATING_BREAKDOWN.map(r => (
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground font-medium w-[120px] shrink-0 leading-tight">{r.label}</span>
                      <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF9500] rounded-full"
                          style={{ width: `${(r.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-foreground w-6 text-right">{r.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vibe tags */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {VIBE_TAGS.map(tag => (
                  <span key={tag} className="bg-background border border-border text-foreground text-[11px] font-semibold px-3 py-1.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Individual reviews */}
            <div className="flex flex-col gap-4 mb-6">
              {REVIEWS.map(review => (
                <div key={review.id} className="bg-card rounded-3xl p-5 border border-border shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-xl">
                        {review.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground text-[14px]">{review.name}</p>
                          <span className="bg-[#FFF0F1] text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {review.occasion}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} size={10} className="fill-[#FF9500] text-[#FF9500]" />
                          ))}
                          <span className="text-[11px] text-muted-foreground ml-1">{review.timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review text */}
                  <p className="text-[14px] text-foreground leading-relaxed mb-4 italic">
                    "{review.text}"
                  </p>

                  {/* Helpful */}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <ThumbsUp size={13} />
                    <span className="text-[12px] font-medium">{review.helpful} found this helpful</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Write review CTA */}
            <button
              onClick={() => setLocation('/plan/generate')}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground font-bold text-[14px] hover:border-primary hover:text-primary transition-colors"
            >
              + Share your date experience
            </button>
          </div>
        )}

        {/* ── LOCATION TAB ── */}
        {activeTab === 'Location' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">

            {/* Map placeholder */}
            <div className="rounded-3xl overflow-hidden h-44 mb-5 relative shadow-sm border border-border">
              <img
                src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=700&h=300&fit=crop&auto=format"
                alt="Map"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {/* Pin marker */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary shadow-lg flex items-center justify-center">
                    <MapPin size={18} className="text-white fill-white" />
                  </div>
                  <div className="w-2 h-2 bg-primary/40 rounded-full mt-0.5 blur-sm" />
                </div>
              </div>
              {/* Open maps pill */}
              <button className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-foreground text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform">
                <Navigation size={11} className="text-primary" /> Open in Maps
              </button>
            </div>

            {/* Address */}
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF0F1] flex items-center justify-center text-primary shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="font-bold text-foreground text-[14px]">123 Main St</p>
                  <p className="text-[12px] text-muted-foreground font-medium">Downtown District · 1.2 mi away</p>
                </div>
              </div>
              <button className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95">
                <Copy size={15} />
              </button>
            </div>

            {/* Transport options */}
            <div className="bg-card rounded-2xl border border-border shadow-sm mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Getting There</p>
              </div>
              {[
                { icon: <Footprints size={16} />, label: "Walking",   detail: "18 min · 1.2 mi",       color: "text-[#00C851] bg-[#E8FFF0]" },
                { icon: <Car size={16} />,        label: "Rideshare", detail: "~$8–12 · 5 min",         color: "text-blue-600 bg-blue-50"    },
                { icon: <MapPin size={16} />,     label: "Parking",   detail: "2nd St Garage · $6/hr",  color: "text-orange-600 bg-orange-50"},
              ].map((opt, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", opt.color)}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-[14px]">{opt.label}</p>
                    <p className="text-[12px] text-muted-foreground">{opt.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Make a Night of It */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-3 px-1">
                <div>
                  <h3 className="font-bold text-foreground text-[16px] leading-tight">Make a Night of It</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Nearby spots to complete your evening</p>
                </div>
                <button
                  onClick={() => setLocation('/plan/generate')}
                  className="text-[12px] font-bold text-primary"
                >
                  Plan full night →
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {NEARBY_VENUES.map(venue => (
                  <div key={venue.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex active:scale-[0.98] transition-transform cursor-pointer">
                    <div className="w-24 h-20 relative shrink-0">
                      <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20" />
                      <span className={cn(
                        "absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                        venue.timing === 'Before' ? "bg-blue-500 text-white" : "bg-[#00C851] text-white"
                      )}>
                        {venue.timing}
                      </span>
                    </div>
                    <div className="flex-1 p-3.5 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-base">{venue.emoji}</span>
                        <p className="font-bold text-foreground text-[14px] leading-tight">{venue.name}</p>
                      </div>
                      <p className="text-[12px] text-muted-foreground mb-1">{venue.type}</p>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Footprints size={11} />
                        <span className="text-[11px] font-medium">{venue.distance}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Neighbourhood context */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-5 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">🏙️</div>
                <div>
                  <p className="font-bold text-[15px]">Downtown District</p>
                  <p className="text-white/60 text-[12px] font-medium">Vibrant · Safe · Walkable</p>
                </div>
              </div>
              <p className="text-white/70 text-[13px] leading-relaxed">
                A lively mix of upscale dining, rooftop bars, and waterfront views. Perfect for a full evening — park once and explore on foot.
              </p>
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
