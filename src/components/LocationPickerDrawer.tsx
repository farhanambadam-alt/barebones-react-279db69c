import { MapPin, Search, Loader2, Navigation, X, Check, ArrowLeft, Clock, Trash2, LocateFixed, Pin } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { useLocation_ } from '@/contexts/LocationContext';
import { olaAutosuggest, olaReverseGeocode, olaPlaceDetail, type OlaSuggestion, type OlaReverseGeocodeResult } from '@/services/olaMapService';
import { pushOverlay, removeOverlay } from '@/hooks/useFlutterBridge';
import { callFlutterHandler } from '@/lib/nativeBridge';
import { OLA_STYLE_URL, getOlaMapToken, createOlaTransformRequest } from '@/config/olaMapConfig';
import { Skeleton } from '@/components/ui/skeleton';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import indiaMapSvg from '@/assets/india-map.svg';

interface LocationPickerDrawerProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'search' | 'map';

interface SavedLocation {
  cityName: string;
  areaName?: string;
  lat: number;
  lng: number;
  fullAddress: string;
  savedAt: number;
  label?: string;
}

const RECENT_LOCATIONS_KEY = 'recent_locations';
const MAX_RECENT = 5;

function getRecentLocations(): SavedLocation[] {
  try { return JSON.parse(localStorage.getItem(RECENT_LOCATIONS_KEY) || '[]'); } catch { return []; }
}
function addRecentLocation(loc: SavedLocation) {
  const recents = getRecentLocations().filter(
    (r) => !(Math.abs(r.lat - loc.lat) < 0.0005 && Math.abs(r.lng - loc.lng) < 0.0005)
  );
  recents.unshift(loc);
  localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(recents.slice(0, MAX_RECENT)));
}
function removeRecentLocation(idx: number) {
  const recents = getRecentLocations();
  recents.splice(idx, 1);
  localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(recents));
}

/* ---------- Skeleton components ---------- */
const AddressSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-28" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-3/4" />
  </div>
);

const PredictionSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-card border border-border">
        <Skeleton className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    ))}
  </div>
);

const LocationPickerDrawer = ({ open, onClose }: LocationPickerDrawerProps) => {
  const { location, setLocation, requestGPSLocation, isLocating, locationError } = useLocation_();

  const [step, setStep] = useState<Step>('search');
  const [search, setSearch] = useState('');
  const [predictions, setPredictions] = useState<OlaSuggestion[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocationMeta, setSelectedLocationMeta] = useState<{ cityName: string; areaName?: string } | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [recentLocations, setRecentLocations] = useState<SavedLocation[]>([]);
  const [mapTilesLoaded, setMapTilesLoaded] = useState(false);
  

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markerInstance = useRef<maplibregl.Marker | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const reverseGeocodeAbortRef = useRef(0); // monotonic counter to cancel stale calls
  const reverseGeoDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const reverseGeoCacheRef = useRef<Map<string, OlaReverseGeocodeResult>>(new Map());

  const refreshLists = useCallback(() => {
    setRecentLocations(getRecentLocations());
  }, []);

  /** Reverse geocode with abort guard + coordinate cache */
  const reverseGeocodeCoords = useCallback(async (lat: number, lng: number): Promise<OlaReverseGeocodeResult | null> => {
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = reverseGeoCacheRef.current.get(cacheKey);
    if (cached) {
      setSelectedAddress(cached.structuredAddress || cached.formatted_address);
      setSelectedLocationMeta({
        cityName: cached.city,
        areaName: cached.neighborhood || cached.area || cached.subLocality || cached.locality || undefined,
      });
      setIsReverseGeocoding(false);
      return cached;
    }

    const callId = ++reverseGeocodeAbortRef.current;
    setIsReverseGeocoding(true);
    try {
      const result = await olaReverseGeocode(lat, lng);
      if (callId !== reverseGeocodeAbortRef.current) return null; // stale
      reverseGeoCacheRef.current.set(cacheKey, result);
      // Keep cache small
      if (reverseGeoCacheRef.current.size > 30) {
        const firstKey = reverseGeoCacheRef.current.keys().next().value;
        if (firstKey) reverseGeoCacheRef.current.delete(firstKey);
      }
      setSelectedAddress(result.structuredAddress || result.formatted_address);
      setSelectedLocationMeta({
        cityName: result.city,
        areaName: result.neighborhood || result.area || result.subLocality || result.locality || undefined,
      });
      return result;
    } catch (err) {
      if (callId !== reverseGeocodeAbortRef.current) return null;
      console.error('Reverse geocode error:', err);
      setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setSelectedLocationMeta({ cityName: 'Unknown' });
      return null;
    } finally {
      if (callId === reverseGeocodeAbortRef.current) {
        setIsReverseGeocoding(false);
      }
    }
  }, []);

  /** Debounced reverse geocode for map drag/click — 500ms delay to batch rapid interactions */
  const debouncedReverseGeocode = useCallback((lat: number, lng: number) => {
    if (reverseGeoDebounceRef.current) clearTimeout(reverseGeoDebounceRef.current);
    setIsReverseGeocoding(true);
    reverseGeoDebounceRef.current = setTimeout(() => {
      void reverseGeocodeCoords(lat, lng);
    }, 500);
  }, [reverseGeocodeCoords]);

  const setResolvedSelection = useCallback((coords: { lat: number; lng: number }, fullAddress: string, city: string, area?: string) => {
    setSelectedCoords(coords);
    setSelectedAddress(fullAddress);
    setSelectedLocationMeta({ cityName: city, areaName: area });
    setStep('map');
  }, []);

  // Overlay for back button
  useEffect(() => {
    if (!open) return;
    const closeFn = () => onClose();
    pushOverlay(closeFn);
    return () => removeOverlay(closeFn);
  }, [open, onClose]);

  // Flutter map state
  const notifyFlutterMapState = useCallback((active: boolean) => {
    callFlutterHandler('mapActive', active);
  }, []);

  useEffect(() => {
    if (open) { notifyFlutterMapState(true); refreshLists(); }
    return () => notifyFlutterMapState(false);
  }, [open, notifyFlutterMapState, refreshLists]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('search');
      setSearch('');
      setPredictions([]);
      setSelectedAddress('');
      setSelectedCoords(null);
      setSelectedLocationMeta(null);
      setMapsError(null);
      setIsReverseGeocoding(false);
      setMapTilesLoaded(false);
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
      markerInstance.current = null;
    }
  }, [open]);

  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); if (reverseGeoDebounceRef.current) clearTimeout(reverseGeoDebounceRef.current); }; }, []);

  // When GPS location arrives from context
  useEffect(() => {
    if (!open || location.lat == null || location.lng == null) return;
    if (location.source !== 'gps' && location.source !== 'flutter') return;

    const coords = { lat: location.lat, lng: location.lng };
    setSelectedCoords(coords);
    setStep('map');

    // Always reverse geocode for structured address even if we have partial data
    reverseGeocodeCoords(coords.lat, coords.lng);
  }, [location, open, reverseGeocodeCoords]);

  // Init MapLibre
  useEffect(() => {
    if (step !== 'map' || !selectedCoords) return;

    if (mapInstance.current) {
      try {
        mapInstance.current.flyTo({ center: [selectedCoords.lng, selectedCoords.lat], zoom: 16 });
        if (markerInstance.current) {
          markerInstance.current.setLngLat([selectedCoords.lng, selectedCoords.lat]);
        }
      } catch { /* stale */ }
      return;
    }

    const initMap = async () => {
      const container = mapContainerRef.current;
      if (!container) return;
      try {
        const token = await getOlaMapToken();
        const transformRequest = createOlaTransformRequest(token);
        const map = new maplibregl.Map({
          container,
          style: OLA_STYLE_URL,
          center: [selectedCoords.lng, selectedCoords.lat],
          zoom: 16,
          attributionControl: false,
          transformRequest,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

        const marker = new maplibregl.Marker({ draggable: true, color: 'hsl(var(--primary))' })
          .setLngLat([selectedCoords.lng, selectedCoords.lat])
          .addTo(map);

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setSelectedCoords({ lat: lngLat.lat, lng: lngLat.lng });
          debouncedReverseGeocode(lngLat.lat, lngLat.lng);
        });

        map.on('click', (e) => {
          const { lat, lng } = e.lngLat;
          marker.setLngLat([lng, lat]);
          setSelectedCoords({ lat, lng });
          debouncedReverseGeocode(lat, lng);
        });

        map.on('idle', () => {
          setMapTilesLoaded(true);
        });

        mapInstance.current = map;
        markerInstance.current = marker;
      } catch (err) {
        console.error('Map init error:', err);
        setMapsError('Failed to initialize map.');
      }
    };

    const timer = setTimeout(initMap, 100);
    return () => clearTimeout(timer);
  }, [step, selectedCoords?.lat, selectedCoords?.lng, debouncedReverseGeocode]);

  /* ---------- Handlers ---------- */

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setPredictions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const biasLocation = location.lat != null && location.lng != null
          ? { lat: location.lat, lng: location.lng }
          : undefined;
        const results = await olaAutosuggest(value.trim(), biasLocation, 50000);
        setPredictions(results);
      } catch (err) {
        console.error('Autosuggest error:', err);
        setPredictions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectPrediction = async (prediction: OlaSuggestion) => {
    if (prediction.latitude != null && prediction.longitude != null) {
      setSelectedCoords({ lat: prediction.latitude, lng: prediction.longitude });
      setSelectedAddress(prediction.placeAddress || prediction.placeName);
      setSelectedLocationMeta({ cityName: prediction.cityName || 'Unknown', areaName: prediction.areaName });
      setStep('map');
      // Only reverse geocode if prediction address looks incomplete (no comma = probably just a name)
      const addr = prediction.placeAddress || '';
      if (!addr.includes(',') || addr.split(',').length < 3) {
        void reverseGeocodeCoords(prediction.latitude, prediction.longitude);
      }
      return;
    }

    if (prediction.place_id) {
      const detail = await olaPlaceDetail(prediction.place_id);
      if (detail) {
        setSelectedCoords({ lat: detail.lat, lng: detail.lng });
        setSelectedAddress(prediction.placeAddress || detail.address || prediction.placeName);
        setSelectedLocationMeta({ cityName: detail.city || 'Unknown', areaName: detail.area });
        setStep('map');
        // Skip reverse geocode — place detail already has full address
        return;
      }
    }

    setSelectedAddress(prediction.placeAddress || prediction.placeName);
    setSelectedLocationMeta({ cityName: prediction.cityName || 'Unknown', areaName: prediction.areaName });
  };

  const handleSelectSaved = (loc: SavedLocation) => {
    // Saved locations already have full address — no API call needed
    setResolvedSelection(
      { lat: loc.lat, lng: loc.lng },
      loc.fullAddress,
      loc.cityName,
      loc.areaName,
    );
  };

  const handleUseCurrentLocation = () => {
    requestGPSLocation();
  };

  const handleConfirm = () => {
    if (!selectedCoords || isReverseGeocoding) return;

    const locationData = {
      cityName: selectedLocationMeta?.cityName || 'Unknown',
      areaName: selectedLocationMeta?.areaName,
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      source: 'manual' as const,
      fullAddress: selectedAddress,
    };
    setLocation(locationData);

    addRecentLocation({
      cityName: locationData.cityName,
      areaName: locationData.areaName,
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      fullAddress: selectedAddress,
      savedAt: Date.now(),
    });
    onClose();
  };

  const showHistory = !search && predictions.length === 0;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} dismissible={false}>
      <DrawerContent
        className="max-h-[85dvh] min-h-[50vh] flex flex-col rounded-t-3xl"
        style={{ maxHeight: '85dvh' }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DrawerTitle className="sr-only">Location picker</DrawerTitle>
        <DrawerDescription className="sr-only">
          Search for an address, landmark, or establishment, then confirm the exact pin on the map.
        </DrawerDescription>

        {/* Header */}
        <div className="relative flex items-center justify-center px-5 pt-1 pb-2 flex-shrink-0">
          {step === 'map' && (
            <button
              onClick={() => {
                setStep('search');
                if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
                markerInstance.current = null;
              }}
              className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center bg-secondary active:scale-95 transition-transform"
              aria-label="Back to search"
            >
              <ArrowLeft size={18} className="text-foreground" />
            </button>
          )}
          <h2 className="font-heading font-bold text-lg text-foreground">
            {step === 'search' ? 'Select Location' : 'Confirm Location'}
          </h2>
          <button
            onClick={onClose}
            className="absolute right-4 w-9 h-9 rounded-full flex items-center justify-center bg-foreground/10 border border-border active:scale-95 transition-transform"
            aria-label="Close"
          >
            <X size={18} className="text-foreground" />
          </button>
        </div>

        {mapsError && (
          <div className="mx-5 mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex-shrink-0">
            <p className="text-[13px] font-body text-destructive">{mapsError}</p>
          </div>
        )}

        {/* === SEARCH STEP === */}
        {step === 'search' && (
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {/* Search input */}
            <div className="flex items-center gap-2.5 bg-secondary border border-green-500 rounded-2xl px-4 py-3 mb-4">
              <Search size={16} className="text-muted-foreground flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search for area, landmark, shop, street..."
                className="flex-1 bg-transparent text-[14px] font-body text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                autoFocus={false}
              />
              {isSearching && <Loader2 size={14} className="text-muted-foreground animate-spin flex-shrink-0" />}
              {search && !isSearching && (
                <button onClick={() => { setSearch(''); setPredictions([]); }} className="flex-shrink-0">
                  <X size={14} className="text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Current active location */}
            {location.lat != null && location.lng != null && (
              <div className="flex items-start gap-3 p-3.5 mb-3 rounded-2xl bg-success/10 border border-success/25">
                <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Check size={18} className="text-success" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="font-heading font-semibold text-[13px] text-success">Current Location</p>
                  <p className="text-[12px] font-body text-muted-foreground mt-0.5 line-clamp-2 break-words">
                    {location.fullAddress || location.areaName || location.cityName}
                  </p>
                </div>
              </div>
            )}

            {/* Use current location */}
            <button
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="w-full flex items-center gap-3 p-3.5 mb-4 rounded-2xl bg-primary/5 border border-primary/15 active:scale-[0.98] transition-transform min-h-[52px] disabled:opacity-60 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                {isLocating ? (
                  <Loader2 size={24} className="text-primary animate-spin" />
                ) : (
                  <LocateFixed size={24} className="text-green-600" />
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <span className="font-heading font-semibold text-[14px] text-primary block">
                  {isLocating ? 'Detecting location…' : 'Use Current Location'}
                </span>
                <span className="text-[11px] font-body text-muted-foreground">High-precision GPS</span>
              </div>
              <img
                src={indiaMapSvg}
                alt=""
                aria-hidden="true"
                className="h-full max-h-[52px] w-auto object-contain opacity-60 flex-shrink-0"
              />
            </button>

            {locationError && (
              <p className="text-[12px] font-body text-destructive mb-3 px-1">{locationError}</p>
            )}

            {/* Search predictions */}
            {isSearching && predictions.length === 0 && <PredictionSkeleton />}

            {predictions.length > 0 && (
              <div className="space-y-1.5">
                {predictions.map((pred, idx) => (
                  <button
                    key={pred.place_id || idx}
                    onClick={() => handleSelectPrediction(pred)}
                    className="w-full flex items-start gap-3 p-3.5 rounded-2xl bg-card border border-border active:scale-[0.98] transition-transform text-left"
                  >
                    <MapPin size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-heading font-medium text-[14px] text-foreground truncate">
                        {pred.placeName || pred.placeAddress}
                      </p>
                      <p className="text-[11px] font-body text-muted-foreground mt-0.5 line-clamp-2 break-words">
                        {pred.placeAddress}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent locations */}
            {showHistory && recentLocations.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Clock size={13} className="text-muted-foreground" />
                  <span className="text-[12px] font-heading font-semibold text-muted-foreground uppercase tracking-wider">Recent</span>
                </div>
                <div className="space-y-1.5">
                  {recentLocations.map((loc, idx) => (
                    <div key={`recent-${idx}`} className="flex items-center gap-1">
                      <button
                        onClick={() => handleSelectSaved(loc)}
                        className="flex-1 flex items-start gap-3 p-3 rounded-2xl bg-card border border-border active:scale-[0.98] transition-transform text-left min-w-0"
                      >
                        <Pin size={20} className="text-muted-foreground flex-shrink-0 mt-0.5 my-[5px]" />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="font-heading font-medium text-[13px] text-foreground truncate">
                            {loc.areaName || loc.cityName}
                          </p>
                          <p className="text-[11px] font-body text-muted-foreground mt-0.5 line-clamp-2 break-words">
                            {loc.fullAddress}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => { removeRecentLocation(idx); refreshLists(); }}
                        className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-destructive active:scale-90 transition-all"
                        aria-label="Remove recent location"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty states */}
            {search && predictions.length === 0 && !isSearching && (
              <div className="text-center py-8">
                <MapPin size={32} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-[13px] font-body text-muted-foreground">No results found</p>
              </div>
            )}

            {showHistory && recentLocations.length === 0 && (
              <div className="text-center py-8">
                <Search size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[13px] font-body text-muted-foreground">Search for your location or use GPS</p>
              </div>
            )}
          </div>
        )}

        {/* === MAP STEP === */}
        {step === 'map' && (
          <div className="flex-1 flex flex-col px-5 pb-5 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Map container */}
            <div className="relative min-h-[200px] h-[35dvh] max-h-[280px] rounded-2xl overflow-hidden border border-border mb-3 flex-shrink-0">
              <div
                ref={mapContainerRef}
                className="w-full h-full"
                data-vaul-no-drag
                style={{ touchAction: 'none', WebkitOverflowScrolling: 'touch' }}
              />
              {/* Map loading overlay */}
              {!mapTilesLoaded && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-muted/80 backdrop-blur-sm transition-opacity">
                  <Loader2 size={28} className="text-primary animate-spin mb-2" />
                  <p className="text-[13px] font-body text-muted-foreground">Loading map…</p>
                </div>
              )}
              <div className="absolute top-3 left-3 right-3 z-10">
                <div className="bg-background/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-border shadow-sm">
                  <p className="text-[11px] font-body text-muted-foreground text-center">
                    Drag the pin or tap to adjust location
                  </p>
                </div>
              </div>
            </div>

            {/* Address card */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary border border-border mb-3 flex-shrink-0">
              <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 overflow-hidden">
                {isReverseGeocoding ? (
                  <AddressSkeleton />
                ) : (
                  <>
                    <p className="font-heading font-medium text-[14px] text-foreground truncate">
                      {selectedLocationMeta?.areaName || selectedLocationMeta?.cityName || 'Selected Location'}
                    </p>
                    <p className="text-[12px] font-body text-muted-foreground mt-0.5 leading-relaxed line-clamp-3 break-words">
                      {selectedAddress || 'Loading address…'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Confirm button */}
            <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
              <button
                onClick={handleConfirm}
                disabled={!selectedCoords || isReverseGeocoding}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-success text-success-foreground font-heading font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[48px] shadow-md"
              >
                {isReverseGeocoding ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Detecting…
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Confirm Location
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default LocationPickerDrawer;
