import React, { useState } from 'react';
import { Star, X, Sparkles, Image as ImageIcon } from 'lucide-react';

export function FeedbackLog() {
  const [rating, setRating] = useState(4);
  const [highlights, setHighlights] = useState(['Romantic', 'Worth the Price']);

  const toggleHighlight = (tag: string) => {
    if (highlights.includes(tag)) {
      setHighlights(highlights.filter(h => h !== tag));
    } else {
      setHighlights([...highlights, tag]);
    }
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#F7F7F7] font-['Poppins'] flex flex-col relative mx-auto shadow-2xl overflow-y-auto no-scrollbar">
      {/* Top Confetti / Header */}
      <div className="bg-white pt-14 pb-8 px-6 rounded-b-[40px] shadow-sm relative z-10">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none rounded-b-[40px]">
          {/* Faux Confetti */}
          <div className="absolute top-4 left-[10%] w-2 h-4 bg-[#FF5A5F] rotate-45 rounded-sm"></div>
          <div className="absolute top-10 left-[30%] w-3 h-3 bg-[#00C851] rounded-full"></div>
          <div className="absolute top-6 right-[20%] w-4 h-2 bg-[#FF9500] -rotate-12 rounded-sm"></div>
          <div className="absolute top-16 right-[10%] w-2 h-2 bg-[#007AFF] rounded-full"></div>
        </div>

        <div className="flex justify-between items-start mb-4 relative z-10">
          <button className="w-10 h-10 bg-[#F7F7F7] rounded-full flex items-center justify-center text-[#222222]">
            <X size={20} />
          </button>
        </div>

        <div className="text-center relative z-10">
          <div className="flex justify-center mb-3">
            <Sparkles className="text-[#FF5A5F]" size={32} />
          </div>
          <h1 className="text-[28px] font-bold text-[#222222] mb-2">How was it? ✨</h1>
          <p className="text-[#555555] text-[15px]">Log your experience to improve future plans.</p>
        </div>
      </div>

      <div className="px-6 py-8 flex-1">
        {/* Overall Rating */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0F0F0] mb-6 text-center">
          <h2 className="text-[15px] font-bold text-[#222222] mb-4">Overall Rating</h2>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star} 
                onClick={() => setRating(star)}
                className="transform transition-transform active:scale-75"
              >
                <Star 
                  size={40} 
                  className={star <= rating ? "fill-[#FF9500] text-[#FF9500]" : "fill-[#EBEBEB] text-[#EBEBEB]"} 
                />
              </button>
            ))}
          </div>
        </div>

        {/* Category Ratings */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0F0F0] mb-6">
          <h2 className="text-[15px] font-bold text-[#222222] mb-4">The Details</h2>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#555555] font-medium text-sm">Venue Quality</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={20} className={s <= 4 ? "fill-[#FF5A5F] text-[#FF5A5F]" : "fill-[#EBEBEB] text-[#EBEBEB]"} />)}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-[#555555] font-medium text-sm">Value for Money</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={20} className={s <= 5 ? "fill-[#00C851] text-[#00C851]" : "fill-[#EBEBEB] text-[#EBEBEB]"} />)}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#555555] font-medium text-sm">Vibe Match</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={20} className={s <= 4 ? "fill-[#FF9500] text-[#FF9500]" : "fill-[#EBEBEB] text-[#EBEBEB]"} />)}
              </div>
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="mb-6">
          <h2 className="text-[15px] font-bold text-[#222222] mb-3 px-2">Highlights</h2>
          <div className="flex flex-wrap gap-2">
            {['Romantic', 'Fun', 'Would Return', 'Worth the Price', 'Great Service', 'Too Crowded'].map(tag => (
              <button 
                key={tag}
                onClick={() => toggleHighlight(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  highlights.includes(tag)
                    ? 'bg-[#222222] text-white'
                    : 'bg-white text-[#555555] border border-[#EBEBEB]'
                }`}
              >
                {highlights.includes(tag) && <span className="mr-1">✓</span>} {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-8">
          <h2 className="text-[15px] font-bold text-[#222222] mb-3 px-2">Memories</h2>
          <div className="relative">
            <textarea 
              className="w-full bg-white border border-[#EBEBEB] rounded-2xl p-4 min-h-[120px] text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 resize-none shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
              placeholder="Any memories to log or notes for next time?"
            ></textarea>
            <button className="absolute bottom-4 right-4 w-10 h-10 bg-[#F7F7F7] rounded-full flex items-center justify-center text-[#555555] hover:bg-[#EBEBEB]">
              <ImageIcon size={18} />
            </button>
          </div>
        </div>

      </div>

      {/* Actions Bottom */}
      <div className="bg-white border-t border-[#EBEBEB] p-6 pb-8 flex flex-col gap-3 z-20 mt-auto">
        <button className="w-full bg-[#00C851] text-white py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(0,200,81,0.5)] active:scale-[0.98] transition-all">
          Save Review
        </button>
        <button className="w-full bg-white text-[#222222] border-2 border-[#EBEBEB] py-3.5 rounded-xl font-semibold text-[16px] active:scale-[0.98] transition-all hover:bg-gray-50">
          Share to Feed
        </button>
      </div>
    </div>
  );
}