import { useState } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, Star, MapPin, Heart, Clock, Share, Info, Phone, Globe } from 'lucide-react';
import { cn } from "@/components/SharedUI";

export function VenueDetails() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('Overview');

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
          {['Overview', 'Reviews', 'Location'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 pb-4 font-semibold text-[15px] relative transition-colors",
                activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
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
