import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, Star } from 'lucide-react';
import { BottomNav, FAB, cn } from "@/components/SharedUI";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useRegion } from "@/hooks/useRegion";
import { useVenues } from "@/hooks/useVenues";

// Leaflet imports
// @ts-ignore
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for leaflet default icons just in case
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom map pin — must use inline styles, Tailwind is not available inside L.divIcon HTML
const createCustomIcon = (label: string) => L.divIcon({
  html: `<div style="
    width:44px; height:44px; border-radius:50%;
    background:#FF5A5F; border:3px solid white;
    box-shadow:0 4px 12px rgba(0,0,0,0.3);
    display:flex; align-items:center; justify-content:center;
    font-size:20px; line-height:1; cursor:pointer;
    position:relative;">
    ${label}
    <div style="
      position:absolute; bottom:-8px; left:50%; transform:translateX(-50%);
      width:0; height:0;
      border-left:6px solid transparent;
      border-right:6px solid transparent;
      border-top:8px solid #FF5A5F;">
    </div>
  </div>`,
  className: '',
  iconSize: [44, 52],
  iconAnchor: [22, 52],
});

// Component to recenter map when region/center changes
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export function MapView() {
  const [, setLocation] = useLocation();
  const isDesktop = useIsDesktop();
  const { activeRegion } = useRegion();
  const { venues } = useVenues(activeRegion.id);

  // Filter venues that have coordinates
  const mappedVenues = useMemo(() => {
    return (venues || []).filter(v => v.lat !== null && v.lng !== null);
  }, [venues]);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const selectedVenue = mappedVenues.find(v => v.id === selectedVenueId);

  // Compute center based on venues, fallback to [0, 0] if none
  const mapCenter: [number, number] = useMemo(() => {
    if (mappedVenues.length === 0) {
      // Default to Lusaka center if no venues to avoid [0,0] ocean
      return [-15.3875, 28.3228]; 
    }
    const sumLat = mappedVenues.reduce((acc, v) => acc + (v.lat as number), 0);
    const sumLng = mappedVenues.reduce((acc, v) => acc + (v.lng as number), 0);
    return [sumLat / mappedVenues.length, sumLng / mappedVenues.length];
  }, [mappedVenues]);

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-[#E5E2DA] overflow-hidden">
      
      {/* Top Bar (Overlay) */}
      <div className={cn(
        "absolute top-0 w-full bg-gradient-to-b from-white/90 to-white/0 pb-8 px-6 flex justify-between items-start z-[1000] pointer-events-none",
        isDesktop ? "pt-5" : "pt-14"
      )}>
        {!isDesktop && (
          <div className="flex items-baseline bg-white px-4 py-2 rounded-2xl shadow-sm cursor-pointer pointer-events-auto" onClick={() => setLocation('/home')}>
            <span className="font-bold text-xl text-primary tracking-tight">D8</span>
            <span className="font-bold text-xl text-foreground tracking-tight">Advisr</span>
          </div>
        )}
        
        <div className="bg-white rounded-full p-1 shadow-sm flex ml-auto pointer-events-auto">
          <button 
            onClick={() => setLocation('/home')}
            className="px-4 py-1.5 rounded-full text-sm font-semibold text-muted-foreground"
          >
            Feed
          </button>
          <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-primary text-white shadow-sm">
            Map
          </button>
        </div>
      </div>

      {/* Actual Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
          <RecenterMap center={mapCenter} />
          
          {mappedVenues.map(venue => {
            const cat = (venue.category || '').toLowerCase();
            const pinEmoji =
              cat.includes('bar') || cat.includes('night') ? '🍸' :
              cat.includes('restaurant') || cat.includes('dining') ? '🍽️' :
              cat.includes('coffee') || cat.includes('cafe') ? '☕' :
              cat.includes('lounge') ? '🛋️' :
              cat.includes('rooftop') ? '🌆' :
              cat.includes('outdoor') || cat.includes('park') ? '🌿' :
              cat.includes('club') ? '🎵' :
              '📍';
            return (
              <Marker
                key={venue.id}
                position={[venue.lat as number, venue.lng as number]}
                icon={createCustomIcon(pinEmoji)}
                eventHandlers={{ click: () => setSelectedVenueId(venue.id) }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* Search Overlay */}
      <div className={cn("absolute w-full px-6 z-[1000] pointer-events-none", isDesktop ? "top-[72px]" : "top-[110px]")}>
        <div className="bg-white rounded-2xl shadow-md p-3.5 flex items-center gap-3 pointer-events-auto">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search this area..." 
            className="w-full text-sm font-medium focus:outline-none text-foreground"
          />
        </div>
      </div>

      {/* Selected Venue Bottom Sheet (Peek) */}
      {selectedVenue && (
        <div className={cn("absolute w-full px-6 z-[1000] pointer-events-none transition-all duration-300", isDesktop ? "bottom-6" : "bottom-[90px]")}>
          <div 
            onClick={() => setLocation(`/venue/${selectedVenue.id}`)}
            className="bg-white rounded-3xl p-4 shadow-xl border border-border flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors pointer-events-auto relative"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedVenueId(null); }}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 shadow-sm hover:text-black"
            >
              ×
            </button>
            <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-red-500 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0">
              📍
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[16px] text-foreground leading-tight mb-1">{selectedVenue.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                <span className="font-bold text-foreground">4.8</span>
                <span>(124)</span>
                <span className="mx-1">•</span>
                <span className="text-primary font-bold">$$$</span>
              </div>
              <p className="text-xs text-gray-500 truncate">{selectedVenue.category || 'Venue'} • {selectedVenue.area || activeRegion.name}</p>
            </div>
          </div>
        </div>
      )}

      <FAB type="home" />
      <BottomNav active="home" />
    </div>
  );
}
