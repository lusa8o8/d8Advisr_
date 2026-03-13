import { useState } from 'react';
import { useLocation } from "wouter";
import { Star, X } from 'lucide-react';
import { cn } from "@/components/SharedUI";

export function Feedback() {
  const [, setLocation] = useLocation();
  const [rating, setRating] = useState(0);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>(['Romantic']);

  const highlights = ['Romantic', 'Fun', 'Great Service', 'Would Return', 'Worth the Price', 'Crowded'];

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-4 flex justify-end">
        <button onClick={() => setLocation('/home')} className="w-10 h-10 bg-card rounded-full flex items-center justify-center text-foreground shadow-sm">
          <X size={20} />
        </button>
      </div>

      <div className="px-6 py-2">
        <div className="text-center mb-8">
           <span className="text-5xl mb-4 block">✨</span>
           <h1 className="text-[32px] font-extrabold text-foreground leading-tight mb-2">How was it?</h1>
           <p className="text-muted-foreground font-medium">Rate your experience at Date Night Downtown.</p>
        </div>

        {/* Big Rating */}
        <div className="bg-card rounded-3xl p-8 shadow-sm border border-border flex flex-col items-center mb-8">
           <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map(star => (
                 <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                   <Star size={42} className={cn(star <= rating ? "fill-[#FF9500] text-[#FF9500]" : "text-gray-300")} strokeWidth={1} />
                 </button>
              ))}
           </div>
           <p className="font-bold text-foreground text-lg">
             {rating === 0 ? "Tap to rate" : rating === 5 ? "Incredible!" : rating >= 3 ? "Good" : "Could be better"}
           </p>
        </div>

        {/* Categories */}
        <div className="mb-8">
           <h3 className="font-bold text-foreground mb-4 text-[15px]">Category Ratings</h3>
           <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                 <span className="font-medium text-foreground">Venue Quality</span>
                 <div className="flex gap-1">
                   {[1,2,3,4,5].map(star => <Star key={star} size={16} className="fill-[#FF9500] text-[#FF9500]" />)}
                 </div>
              </div>
              <div className="h-[1px] bg-border w-full"></div>
              <div className="flex justify-between items-center">
                 <span className="font-medium text-foreground">Value for Money</span>
                 <div className="flex gap-1">
                   {[1,2,3,4].map(star => <Star key={star} size={16} className="fill-[#FF9500] text-[#FF9500]" />)}
                   <Star size={16} className="text-gray-300" />
                 </div>
              </div>
           </div>
        </div>

        {/* Highlights */}
        <div className="mb-8">
           <h3 className="font-bold text-foreground mb-4 text-[15px]">Highlights</h3>
           <div className="flex flex-wrap gap-2.5">
              {highlights.map(item => (
                <button
                  key={item}
                  onClick={() => {
                    if (selectedHighlights.includes(item)) {
                      setSelectedHighlights(selectedHighlights.filter(h => h !== item));
                    } else {
                      setSelectedHighlights([...selectedHighlights, item]);
                    }
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95",
                    selectedHighlights.includes(item)
                      ? "bg-foreground text-card shadow-md" 
                      : "bg-card border border-border text-foreground hover:border-gray-300"
                  )}
                >
                  {item} {selectedHighlights.includes(item) && '✓'}
                </button>
              ))}
            </div>
        </div>

        {/* Notes */}
        <div className="mb-10">
           <h3 className="font-bold text-foreground mb-3 text-[15px]">Any memories to log?</h3>
           <textarea 
             placeholder="The dessert at Sweeties was amazing..." 
             className="w-full bg-card border border-border rounded-2xl p-4 min-h-[100px] text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
           />
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setLocation('/home')}
            className="w-full bg-[#00C851] text-white py-[18px] rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(0,200,81,0.5)] active:scale-[0.98] transition-all"
          >
            Save Review
          </button>
          <button className="w-full bg-card text-foreground border-2 border-border py-4 rounded-xl font-bold text-[16px] active:scale-[0.98] transition-all hover:bg-background">
            Share to Feed
          </button>
        </div>

      </div>
    </div>
  );
}
