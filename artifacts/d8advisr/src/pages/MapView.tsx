import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { AlertTriangle, Crosshair, Loader2, Search, Star } from 'lucide-react';
import { useLocation } from 'wouter';
import { BottomNav, FAB, cn } from '@/components/SharedUI';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useRegion } from '@/hooks/useRegion';
import { useVenues } from '@/hooks/useVenues';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim();
const DEFAULT_MAP_CENTER = { lat: -15.3875, lng: 28.3228 };

let mapsLoaderConfigured = false;

type MapTheme = 'light' | 'dark';

type MappedVenue = {
  id: string;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  reviewCount: number | null;
  priceTier: string | null;
  area: string | null;
};

function hasGoogleMapsConfig() {
  return Boolean(
    GOOGLE_MAPS_API_KEY
    && GOOGLE_MAPS_MAP_ID
    && !GOOGLE_MAPS_API_KEY.startsWith('replace_')
    && !GOOGLE_MAPS_MAP_ID.startsWith('replace_'),
  );
}

function configureMapsLoader() {
  if (mapsLoaderConfigured || !GOOGLE_MAPS_API_KEY || !GOOGLE_MAPS_MAP_ID) return;

  setOptions({
    key: GOOGLE_MAPS_API_KEY,
    v: 'weekly',
    authReferrerPolicy: 'origin',
    mapIds: [GOOGLE_MAPS_MAP_ID],
  });
  mapsLoaderConfigured = true;
}

function markerEmoji(category: string | null) {
  const normalized = (category ?? '').toLowerCase();

  if (normalized.includes('bar') || normalized.includes('night')) return '🍸';
  if (normalized.includes('restaurant') || normalized.includes('dining')) return '🍽️';
  if (normalized.includes('coffee') || normalized.includes('cafe')) return '☕';
  if (normalized.includes('lounge')) return '🛋️';
  if (normalized.includes('rooftop')) return '🌆';
  if (normalized.includes('outdoor') || normalized.includes('park')) return '🌿';
  if (normalized.includes('club')) return '🎵';
  return '📍';
}

function createMarkerContent(venue: MappedVenue) {
  const marker = document.createElement('div');
  marker.setAttribute('aria-label', venue.name);
  marker.style.cssText = [
    'position:relative',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'width:44px',
    'height:44px',
    'border:3px solid #fff',
    'border-radius:999px',
    'background:#FF5A5F',
    'box-shadow:0 4px 12px rgba(0,0,0,.3)',
    'font-size:20px',
    'line-height:1',
    'cursor:pointer',
    'user-select:none',
  ].join(';');
  marker.textContent = markerEmoji(venue.category);

  const pointer = document.createElement('span');
  pointer.setAttribute('aria-hidden', 'true');
  pointer.style.cssText = [
    'position:absolute',
    'bottom:-9px',
    'left:50%',
    'width:0',
    'height:0',
    'transform:translateX(-50%)',
    'border-left:6px solid transparent',
    'border-right:6px solid transparent',
    'border-top:9px solid #FF5A5F',
  ].join(';');
  marker.append(pointer);

  return marker;
}

/** Reactively follows the app theme (light / dark / system) set in Settings. */
function useMapTheme(): MapTheme {
  const resolvedDark = useCallback(
    () => document.documentElement.classList.contains('dark'),
    [],
  );
  const [isDark, setIsDark] = useState<boolean>(resolvedDark);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(resolvedDark()));
    observer.observe(document.documentElement, { attributeFilter: ['class'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaQueryChange = () => setIsDark(resolvedDark());
    mediaQuery.addEventListener('change', onMediaQueryChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', onMediaQueryChange);
    };
  }, [resolvedDark]);

  return isDark ? 'dark' : 'light';
}

function GoogleVenueMap({
  center,
  mapTheme,
  venues,
  onVenueSelect,
}: {
  center: google.maps.LatLngLiteral;
  mapTheme: MapTheme;
  venues: MappedVenue[];
  onVenueSelect: (venueId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerClassRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const selectionHandlerRef = useRef(onVenueSelect);
  const [mapGeneration, setMapGeneration] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'missing'>(
    hasGoogleMapsConfig() ? 'loading' : 'missing',
  );
  const [retryCount, setRetryCount] = useState(0);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);

  useEffect(() => {
    selectionHandlerRef.current = onVenueSelect;
  }, [onVenueSelect]);

  useEffect(() => {
    let cancelled = false;

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
      userMarkerRef.current = null;
    }
    markerClassRef.current = null;
    mapRef.current = null;

    if (!hasGoogleMapsConfig()) {
      setLoadState('missing');
      return;
    }

    setLoadState('loading');
    configureMapsLoader();

    void Promise.all([importLibrary('maps'), importLibrary('marker')])
      .then(([mapsLibrary, markerLibrary]) => {
        if (cancelled || !containerRef.current) return;

        const map = new mapsLibrary.Map(containerRef.current, {
          center,
          zoom: 13,
          mapId: GOOGLE_MAPS_MAP_ID,
          colorScheme:
            mapTheme === 'dark'
              ? mapsLibrary.ColorScheme.DARK
              : mapsLibrary.ColorScheme.LIGHT,
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          keyboardShortcuts: true,
        });

        mapRef.current = map;
        markerClassRef.current = markerLibrary.AdvancedMarkerElement;
        setLoadState('ready');
        setMapGeneration(generation => generation + 1);

        // Request user geolocation after map loads
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              if (cancelled) return;
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserLocation(loc);
              const dot = document.createElement('div');
              dot.style.cssText = 'position:relative;width:18px;height:18px';
              dot.innerHTML = `
                <span style="position:absolute;inset:0;border-radius:999px;background:#4285F4;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></span>
                <span style="position:absolute;inset:-6px;border-radius:999px;background:#4285F4;opacity:0.25;animation:d8-pulse 2s ease-out infinite"></span>
              `;
              const userMarker = new markerLibrary.AdvancedMarkerElement({
                map,
                position: loc,
                content: dot,
                zIndex: 999,
              });
              userMarkerRef.current = userMarker;
            },
            () => { /* permission denied or error — silently skip */ },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
          );
        }
      })
      .catch(error => {
        if (cancelled) return;
        console.error('[D8 map] Google Maps failed to load', error);
        setLoadState('error');
      });

    return () => {
      cancelled = true;
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      markersRef.current = [];
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null;
        userMarkerRef.current = null;
      }
      markerClassRef.current = null;
      mapRef.current = null;
    };
  }, [center.lat, center.lng, mapTheme, retryCount]);

  useEffect(() => {
    const map = mapRef.current;
    const AdvancedMarkerElement = markerClassRef.current;
    if (!map || !AdvancedMarkerElement || loadState !== 'ready') return;

    map.setCenter(center);

    // Clean up previous markers and clusterer
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    markersRef.current.forEach(marker => {
      marker.map = null;
    });

    const newMarkers = venues.map(venue => {
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: venue.lat, lng: venue.lng },
        title: venue.name,
        content: createMarkerContent(venue),
      });
      marker.addListener('click', () => selectionHandlerRef.current(venue.id));
      return marker;
    });
    markersRef.current = newMarkers;

    // Create clusterer with custom renderer matching D8 design
    const clusterer = new MarkerClusterer({
      map,
      markers: newMarkers,
      renderer: {
        render({ count, position }) {
          const el = document.createElement('div');
          el.style.cssText = [
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'width:40px',
            'height:40px',
            'border:3px solid #fff',
            'border-radius:999px',
            'background:#FF5A5F',
            'box-shadow:0 4px 12px rgba(0,0,0,.3)',
            'color:#fff',
            'font-size:14px',
            'font-weight:700',
            'cursor:pointer',
          ].join(';');
          el.textContent = String(count);
          return new AdvancedMarkerElement({ position, content: el });
        },
      },
    });
    clustererRef.current = clusterer;

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      markersRef.current = [];
    };
  }, [center, loadState, mapGeneration, venues]);

  const handleRecenter = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(15);
    }
  }, [userLocation]);

  return (
    <div className="absolute inset-0">
      <style>{`@keyframes d8-pulse { 0% { transform:scale(1); opacity:0.25 } 100% { transform:scale(2.5); opacity:0 } }`}</style>
      <div ref={containerRef} className="h-full w-full" aria-label="D8Advisr venue map" />

      {loadState === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-background/90">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="animate-spin text-primary" size={30} />
            <p className="text-sm font-semibold">Loading the map…</p>
          </div>
        </div>
      )}

      {(loadState === 'missing' || loadState === 'error') && (
        <div className="absolute inset-0 grid place-items-center bg-background p-6">
          <div className="max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {loadState === 'missing' ? 'Map configuration needed' : 'The map could not load'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {loadState === 'missing'
                ? 'Add the Google Maps API key and Map ID to the consumer environment.'
                : 'Check your connection and the Google Maps key restrictions, then try again.'}
            </p>
            {loadState === 'error' && (
              <button
                type="button"
                onClick={() => setRetryCount(count => count + 1)}
                className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {userLocation && loadState === 'ready' && (
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute bottom-6 left-6 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-600 hover:text-primary transition-colors active:scale-95"
          aria-label="Centre map on my location"
        >
          <Crosshair size={20} />
        </button>
      )}
    </div>
  );
}

export function MapView() {
  const [, setLocation] = useLocation();
  const isDesktop = useIsDesktop();
  const { activeRegion } = useRegion();
  const { venues } = useVenues(activeRegion.id);
  const mapTheme = useMapTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const mappedVenues = useMemo<MappedVenue[]>(
    () => (venues ?? [])
      .filter(
        (venue): venue is typeof venue & { lat: number; lng: number } =>
          venue.lat !== null && venue.lng !== null,
      )
      .map(venue => ({
        id: venue.id,
        name: venue.name,
        category: venue.category,
        lat: venue.lat,
        lng: venue.lng,
        rating: typeof venue.rating === 'number' ? venue.rating : null,
        reviewCount: typeof venue.review_count === 'number' ? venue.review_count : null,
        priceTier: venue.price_tier ?? null,
        area: venue.area ?? null,
      })),
    [venues],
  );

  const filteredVenues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mappedVenues;
    return mappedVenues.filter(
      v => v.name.toLowerCase().includes(q) || (v.category ?? '').toLowerCase().includes(q),
    );
  }, [mappedVenues, searchQuery]);

  const mapCenter = useMemo<google.maps.LatLngLiteral>(() => {
    if (mappedVenues.length === 0) return DEFAULT_MAP_CENTER;

    const total = mappedVenues.reduce(
      (sum, venue) => ({
        lat: sum.lat + venue.lat,
        lng: sum.lng + venue.lng,
      }),
      { lat: 0, lng: 0 },
    );

    return {
      lat: total.lat / mappedVenues.length,
      lng: total.lng / mappedVenues.length,
    };
  }, [mappedVenues]);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const selectedVenue = mappedVenues.find(venue => venue.id === selectedVenueId);

  useEffect(() => {
    if (selectedVenueId && !selectedVenue) setSelectedVenueId(null);
  }, [selectedVenue, selectedVenueId]);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: mapTheme === 'dark' ? '#1a1a2e' : '#E5E2DA' }}
    >
      <GoogleVenueMap
        center={mapCenter}
        mapTheme={mapTheme}
        venues={filteredVenues}
        onVenueSelect={setSelectedVenueId}
      />

      <div
        className={cn(
          'pointer-events-none absolute top-0 z-20 flex w-full items-start justify-between px-6 pb-8',
          mapTheme === 'dark'
            ? 'bg-gradient-to-b from-black/80 to-transparent'
            : 'bg-gradient-to-b from-white/90 to-white/0',
          isDesktop ? 'pt-5' : 'pt-14',
        )}
      >
        {!isDesktop && (
          <button
            type="button"
            className="pointer-events-auto flex items-baseline rounded-2xl px-4 py-2 shadow-sm"
            style={{ background: mapTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'white' }}
            onClick={() => setLocation('/home')}
            aria-label="Back to D8Advisr home"
          >
            <span className="text-xl font-bold tracking-tight text-primary">D8</span>
            <span
              className={cn(
                'text-xl font-bold tracking-tight',
                mapTheme === 'dark' ? 'text-white' : 'text-foreground',
              )}
            >
              Advisr
            </span>
          </button>
        )}

        <div
          className="pointer-events-auto ml-auto flex rounded-full p-1 shadow-sm"
          style={{ background: mapTheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'white' }}
        >
          <button
            type="button"
            onClick={() => setLocation('/home')}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-semibold',
              mapTheme === 'dark' ? 'text-white/60' : 'text-muted-foreground',
            )}
          >
            Feed
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
          >
            Map
          </button>
        </div>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute z-20 w-full px-6',
          isDesktop ? 'top-[72px]' : 'top-[110px]',
        )}
      >
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-md">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search this area..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-sm font-medium text-foreground placeholder:text-gray-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="shrink-0 rounded-full p-1 text-gray-400 hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <span className="block h-4 w-4 leading-none text-center text-sm">×</span>
            </button>
          )}
        </div>
      </div>

      {selectedVenue && (
        <div
          className={cn(
            'pointer-events-none absolute z-20 w-full px-6 transition-all duration-300',
            isDesktop ? 'bottom-6' : 'bottom-[90px]',
          )}
        >
          <div
            onClick={() => setLocation(`/venue/${selectedVenue.id}`)}
            className="pointer-events-auto relative flex cursor-pointer items-center gap-4 rounded-3xl border border-border bg-white p-4 shadow-xl transition-colors hover:bg-gray-50"
          >
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                setSelectedVenueId(null);
              }}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-black"
              aria-label="Close venue preview"
            >
              ×
            </button>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 text-3xl shadow-inner">
              {markerEmoji(selectedVenue.category)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-[16px] font-bold leading-tight text-foreground">
                {selectedVenue.name}
              </h3>
              <div className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Star size={12} className="fill-[#FF9500] text-[#FF9500]" />
                <span className="font-bold text-foreground">{selectedVenue.rating?.toFixed(1) ?? '—'}</span>
                <span>({selectedVenue.reviewCount ?? 0})</span>
                <span className="mx-1">•</span>
                <span className="font-bold text-primary">{selectedVenue.priceTier || '—'}</span>
              </div>
              <p className="truncate text-xs text-gray-500">
                {selectedVenue.category || 'Venue'} • {selectedVenue.area || activeRegion.name}
              </p>
            </div>
          </div>
        </div>
      )}

      <FAB type="home" />
      <BottomNav active="home" />
    </div>
  );
}
