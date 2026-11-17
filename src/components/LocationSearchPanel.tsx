import {
  ArrowUpDown,
  CalendarClock,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { reverseGeocode, searchLocations } from '../services/api';
import {
  LocationPoint,
  RideMode,
  RoutePreset,
  ScenarioMode,
  SurgeAssumptions,
  ZoneType,
} from '../types/cabfare';

interface LocationSearchPanelProps {
  pickup: LocationPoint;
  drop: LocationPoint;
  scenario: ScenarioMode;
  rideMode: RideMode;
  surgeAssumptions: SurgeAssumptions;
  presets: RoutePreset[];
  isLoading: boolean;
  womenSafetyMode: boolean;
  onToggleWomenSafetyMode: () => void;
  onChangePickup: (loc: LocationPoint) => void;
  onChangeDrop: (loc: LocationPoint) => void;
  onChangeScenario: (scenario: ScenarioMode) => void;
  onChangeRideMode: (mode: RideMode) => void;
  onChangeSurgeAssumptions: (assumptions: SurgeAssumptions) => void;
  onSwapLocations: () => void;
  onCompare: (nextPickup: LocationPoint, nextDrop: LocationPoint) => void;
  onApplyPreset: (preset: RoutePreset) => void;
}

const SCENARIO_OPTIONS: { id: ScenarioMode; label: string }[] = [
  { id: 'live', label: 'Current Time' },
  { id: 'morning_peak', label: 'Morning Rush' },
  { id: 'evening_surge', label: 'Evening Surge' },
  { id: 'off_peak', label: 'Off-Peak' },
];

const ZONE_BADGES: Partial<Record<ZoneType, { label: string; classes: string }>> = {
  airport: { label: 'Airport', classes: 'bg-sky-50 text-sky-700 border-sky-200' },
  railway: { label: 'Railway Stn', classes: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  metro: { label: 'Metro', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  landmark: { label: 'Landmark', classes: 'bg-amber-50 text-amber-800 border-amber-200' },
  'tech-park': { label: 'Tech Park', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function LocationSearchPanel({
  pickup,
  drop,
  scenario,
  rideMode,
  surgeAssumptions,
  presets,
  isLoading,
  womenSafetyMode,
  onToggleWomenSafetyMode,
  onChangePickup,
  onChangeDrop,
  onChangeScenario,
  onChangeRideMode,
  onChangeSurgeAssumptions,
  onSwapLocations,
  onCompare,
  onApplyPreset,
}: LocationSearchPanelProps) {
  const [pickupQuery, setPickupQuery] = useState(pickup.name);
  const [dropQuery, setDropQuery] = useState(drop.name);
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationPoint[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<LocationPoint[]>([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDrop, setIsSearchingDrop] = useState(false);
  const [activeField, setActiveField] = useState<'pickup' | 'drop' | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [geoStatusText, setGeoStatusText] = useState<string>('');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isResolvingRoute, setIsResolvingRoute] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const autoDetectCheckedRef = useRef(false);

  useEffect(() => {
    setPickupQuery(pickup.name);
    if (!pickup.id.startsWith('gps-')) {
      setGeoError(null);
      setGeoSuccess(null);
    }
  }, [pickup.id, pickup.name]);

  useEffect(() => {
    setDropQuery(drop.name);
  }, [drop.id, drop.name]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeField !== 'pickup') return;
    let active = true;
    setIsSearchingPickup(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchLocations(pickupQuery);
        if (active) setPickupSuggestions(res);
      } catch {
        if (active) setPickupSuggestions([]);
      } finally {
        if (active) setIsSearchingPickup(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pickupQuery, activeField]);

  useEffect(() => {
    if (activeField !== 'drop') return;
    let active = true;
    setIsSearchingDrop(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchLocations(dropQuery);
        if (active) setDropSuggestions(res);
      } catch {
        if (active) setDropSuggestions([]);
      } finally {
        if (active) setIsSearchingDrop(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dropQuery, activeField]);

  const handleUseCurrentLocation = useCallback(async (isSilentAuto = false) => {
    if (!isSilentAuto) {
      setGeoError(null);
      setGeoSuccess(null);
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      if (!isSilentAuto) {
        setGeoError(
          'Current location detection requires an HTTPS connection. Please search any Indian city or address manually.'
        );
      }
      return;
    }

    if (!('geolocation' in navigator) || !navigator.geolocation) {
      if (!isSilentAuto) {
        setGeoError(
          'Geolocation is not supported by this browser. Please search your Indian pickup city or landmark below.'
        );
      }
      return;
    }

    setLocatingGps(true);
    setGeoStatusText('Requesting GPS...');

    let position: GeolocationPosition | null = null;

    try {
      position = await requestPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    } catch (firstErr) {
      const geoErr = firstErr as GeolocationPositionError;
      if (geoErr?.code === 1) {
        setLocatingGps(false);
        setGeoStatusText('');
        if (!isSilentAuto) {
          setGeoError(
            'Location permission was denied. Allow location access in your browser settings, or search any Indian city/address manually.'
          );
        }
        return;
      }

      try {
        setGeoStatusText('Retrying GPS...');
        await new Promise((r) => setTimeout(r, 400));
        position = await requestPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      } catch (secondErr) {
        const retryErr = secondErr as GeolocationPositionError;
        if (retryErr?.code === 1) {
          setLocatingGps(false);
          setGeoStatusText('');
          if (!isSilentAuto) {
            setGeoError(
              'Location permission was denied. Please enable browser location access or enter your pickup manually.'
            );
          }
          return;
        }

        try {
          setGeoStatusText('Using network location...');
          position = await requestPosition({
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 30000,
          });
        } catch (finalErr) {
          const err = finalErr as GeolocationPositionError;
          setLocatingGps(false);
          setGeoStatusText('');
          if (!isSilentAuto) {
            if (err?.code === 1) {
              setGeoError(
                'Location permission was denied. Please allow location access in your browser or search manually below.'
              );
            } else if (err?.code === 2) {
              setGeoError(
                'Location unavailable: your device could not determine a GPS or network position. Please search and select your pickup location manually.'
              );
            } else if (err?.code === 3) {
              setGeoError(
                'Location detection timed out after retrying. Please retry or search and select your pickup location manually.'
              );
            } else {
              setGeoError(
                'Unable to detect current location. Please search and select your pickup location manually.'
              );
            }
          }
          return;
        }
      }
    }

    if (!position) {
      setLocatingGps(false);
      setGeoStatusText('');
      return;
    }

    const { latitude, longitude, accuracy } = position.coords;
    setGeoStatusText('Resolving address...');

    try {
      const resolved = await reverseGeocode(latitude, longitude);
      onChangePickup(resolved);
      setPickupQuery(resolved.name);
      setActiveField(null);
      setGeoSuccess(
        `Detected: ${resolved.name} (${resolved.city}${resolved.state ? `, ${resolved.state}` : ''} · ±${Math.round(accuracy)}m)`
      );
    } catch {
      const coordFallback: LocationPoint = {
        id: `gps-${Date.now()}`,
        name: `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        area: 'GPS Coordinates',
        city: 'Detected Location',
        lat: latitude,
        lng: longitude,
        zoneType: 'commercial',
      };
      onChangePickup(coordFallback);
      setPickupQuery(coordFallback.name);
      setActiveField(null);
      setGeoSuccess(
        `GPS coordinates detected (${latitude.toFixed(4)}, ${longitude.toFixed(4)} · ±${Math.round(accuracy)}m). Address lookup was unavailable.`
      );
    } finally {
      setLocatingGps(false);
      setGeoStatusText('');
    }
  }, [onChangePickup]);

  // Automatically detect current location on mount ONLY when browser permission is already granted
  useEffect(() => {
    if (autoDetectCheckedRef.current) return;
    autoDetectCheckedRef.current = true;
    if (
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      'permissions' in navigator &&
      navigator.permissions?.query
    ) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (status.state === 'granted') {
            void handleUseCurrentLocation(true);
          }
        })
        .catch(() => {
          // Ignore browsers without permissions query support
        });
    }
  }, [handleUseCurrentLocation]);

  const handleFocusManualPickup = () => {
    setPickupQuery('');
    setActiveField('pickup');
    pickupInputRef.current?.focus();
  };

  const resolveTypedLocation = async (
    query: string,
    currentLocation: LocationPoint
  ): Promise<LocationPoint | null> => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase() === currentLocation.name.toLowerCase()) {
      return currentLocation;
    }

    const matches = await searchLocations(trimmed);
    if (matches.length === 0) return null;

    const exact = matches.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
    return exact ?? matches[0];
  };

  const handleCompareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setActiveField(null);

    const trimmedPickup = pickupQuery.trim();
    const trimmedDrop = dropQuery.trim();

    if (!trimmedPickup || !trimmedDrop) {
      setSearchError('Please enter both a pickup location and a destination.');
      return;
    }

    setIsResolvingRoute(true);
    try {
      const [resolvedPickup, resolvedDrop] = await Promise.all([
        resolveTypedLocation(trimmedPickup, pickup),
        resolveTypedLocation(trimmedDrop, drop),
      ]);

      if (!resolvedPickup) {
        setSearchError(
          `Could not find an Indian location matching "${trimmedPickup}". Please pick a suggestion from the pickup dropdown.`
        );
        return;
      }

      if (!resolvedDrop) {
        setSearchError(
          `Could not find an Indian location matching "${trimmedDrop}". Please pick a suggestion from the destination dropdown.`
        );
        return;
      }

      setPickupQuery(resolvedPickup.name);
      setDropQuery(resolvedDrop.name);
      onCompare(resolvedPickup, resolvedDrop);
    } catch {
      setSearchError(
        'Unable to resolve locations right now. Please select from the dropdown suggestions.'
      );
    } finally {
      setIsResolvingRoute(false);
    }
  };

  const renderSuggestionMeta = (item: LocationPoint) => {
    const badge = ZONE_BADGES[item.zoneType];
    const cityState = item.state && !item.city.includes(item.state)
      ? `${item.city}, ${item.state}`
      : item.city;

    return (
      <div className="ml-3 flex shrink-0 items-center gap-1.5">
        {badge && (
          <span
            className={`hidden sm:inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badge.classes}`}
          >
            {badge.label}
          </span>
        )}
        <span className="max-w-[170px] truncate text-xs text-slate-500">
          {item.area !== item.city ? `${item.area} · ${cityState}` : cityState}
        </span>
      </div>
    );
  };

  return (
    <section
      ref={containerRef}
      aria-label="PAN-India Smart Location Search"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 text-balance">
            Compare PAN-India Ride Estimates &amp; Travel Timing
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Search metros, Tier 2 &amp; Tier 3 cities, airports, railway stations, and landmarks across India to view locally supported cab providers.
          </p>
        </div>

        {/* Ride Mode + Women's Safety Mode + Demand scenario selectors */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            role="switch"
            aria-checked={womenSafetyMode}
            onClick={onToggleWomenSafetyMode}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              womenSafetyMode
                ? 'border-rose-300 bg-rose-50 text-rose-800 shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck
              className={`h-3.5 w-3.5 ${womenSafetyMode ? 'text-rose-600' : 'text-slate-500'}`}
              aria-hidden="true"
            />
            <span>Women&apos;s Safety Mode: {womenSafetyMode ? 'On' : 'Off'}</span>
          </button>

          <div
            role="group"
            aria-label="Ride timing mode"
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            <button
              type="button"
              aria-pressed={rideMode === 'immediate'}
              onClick={() => onChangeRideMode('immediate')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                rideMode === 'immediate'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Immediate</span>
            </button>
            <button
              type="button"
              aria-pressed={rideMode === 'scheduled'}
              onClick={() => onChangeRideMode('scheduled')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                rideMode === 'scheduled'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Scheduled</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {SCENARIO_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeScenario(opt.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  scenario === opt.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rideMode === 'scheduled' && (
        <p className="mt-2.5 text-xs text-emerald-800 bg-emerald-50/70 border border-emerald-200/80 rounded-lg px-3 py-2">
          Scheduled ride mode active: fares include airport (15 min) / station (8 min) / standard (5 min) pickup wait-time buffering, advance slot allocation, and smoothed dynamic surge.
        </p>
      )}

      {/* Inputs row */}
      <form
        onSubmit={handleCompareSubmit}
        className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end"
      >
        {/* Pickup Input */}
        <div className="relative lg:col-span-5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="pickup-input" className="text-xs font-semibold text-slate-700">
              Pickup Location (India)
            </label>
            <button
              type="button"
              onClick={() => void handleUseCurrentLocation(false)}
              disabled={locatingGps}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60 whitespace-nowrap"
            >
              {locatingGps ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{locatingGps ? geoStatusText || 'Detecting...' : 'Use Current Location'}</span>
            </button>
          </div>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600"
              aria-hidden="true"
            />
            <input
              ref={pickupInputRef}
              id="pickup-input"
              type="text"
              value={pickupQuery}
              onFocus={() => setActiveField('pickup')}
              onChange={(e) => {
                setPickupQuery(e.target.value);
                setActiveField('pickup');
                setGeoError(null);
                setSearchError(null);
              }}
              placeholder="City, locality, airport, railway station, or landmark"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            {activeField === 'pickup' && isSearchingPickup && (
              <Loader2
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
                aria-hidden="true"
              />
            )}
          </div>

          {activeField === 'pickup' && pickupSuggestions.length > 0 && (
            <ul
              role="listbox"
              aria-label="Pickup suggestions"
              className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              {pickupSuggestions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchError(null);
                      setGeoError(null);
                      setGeoSuccess(null);
                      onChangePickup(item);
                      setPickupQuery(item.name);
                      setActiveField(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="truncate font-medium text-slate-900">{item.name}</span>
                    {renderSuggestionMeta(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Swap button */}
        <div className="flex justify-center lg:col-span-1">
          <button
            type="button"
            onClick={() => {
              setSearchError(null);
              onSwapLocations();
            }}
            title="Swap pickup and destination"
            aria-label="Swap pickup and destination"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Drop Input */}
        <div className="relative lg:col-span-4">
          <label htmlFor="drop-input" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Destination (India)
          </label>
          <div className="relative">
            <Navigation
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600"
              aria-hidden="true"
            />
            <input
              id="drop-input"
              type="text"
              value={dropQuery}
              onFocus={() => setActiveField('drop')}
              onChange={(e) => {
                setDropQuery(e.target.value);
                setActiveField('drop');
                setSearchError(null);
              }}
              placeholder="Address, station, airport, or Tier 2/3 city"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            {activeField === 'drop' && isSearchingDrop && (
              <Loader2
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
                aria-hidden="true"
              />
            )}
          </div>

          {activeField === 'drop' && dropSuggestions.length > 0 && (
            <ul
              role="listbox"
              aria-label="Destination suggestions"
              className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              {dropSuggestions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchError(null);
                      onChangeDrop(item);
                      setDropQuery(item.name);
                      setActiveField(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="truncate font-medium text-slate-900">{item.name}</span>
                    {renderSuggestionMeta(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Compare Action */}
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={isLoading || isResolvingRoute}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span>{isResolvingRoute || isLoading ? 'Comparing...' : 'Compare Prices'}</span>
          </button>
        </div>
      </form>

      {searchError && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
        >
          {searchError}
        </div>
      )}

      {geoError && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900"
        >
          <span className="font-medium">{geoError}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleUseCurrentLocation(false)}
              className="rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100 whitespace-nowrap"
            >
              Retry GPS
            </button>
            <button
              type="button"
              onClick={handleFocusManualPickup}
              className="rounded-md bg-amber-900 px-2.5 py-1 font-semibold text-white hover:bg-amber-800 whitespace-nowrap"
            >
              Search Manually
            </button>
          </div>
        </div>
      )}

      {geoSuccess && !geoError && (
        <p role="status" className="mt-2.5 text-xs font-medium text-emerald-700">
          {geoSuccess}
        </p>
      )}

      {/* Quick Presets & Configurable Surge Assumptions Toggle */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {presets.length > 0 && (
            <>
              <span className="text-xs font-medium text-slate-500">PAN-India Presets:</span>
              {presets.map((preset) => {
                const isCurrent = preset.pickup.id === pickup.id && preset.drop.id === drop.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSearchError(null);
                      setGeoError(null);
                      setGeoSuccess(null);
                      onApplyPreset(preset);
                    }}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      isCurrent
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAssumptions((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
          <span>{showAssumptions ? 'Hide Surge Assumptions' : 'Surge & Traffic Assumptions'}</span>
        </button>
      </div>

      {showAssumptions && (
        <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="peak-surge-slider" className="font-medium text-slate-700">
                Peak Surge Baseline
              </label>
              <span className="font-mono font-semibold text-amber-700 tabular-nums">
                {(surgeAssumptions.peakSurgeMultiplier ?? 1.42).toFixed(2)}x
              </span>
            </div>
            <input
              id="peak-surge-slider"
              type="range"
              min={1.1}
              max={2.0}
              step={0.05}
              value={surgeAssumptions.peakSurgeMultiplier ?? 1.42}
              onChange={(e) =>
                onChangeSurgeAssumptions({
                  ...surgeAssumptions,
                  peakSurgeMultiplier: Number(e.target.value),
                })
              }
              className="mt-1.5 h-1.5 w-full cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="offpeak-surge-slider" className="font-medium text-slate-700">
                Off-Peak Multiplier
              </label>
              <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                {(surgeAssumptions.offPeakMultiplier ?? 1.0).toFixed(2)}x
              </span>
            </div>
            <input
              id="offpeak-surge-slider"
              type="range"
              min={0.9}
              max={1.25}
              step={0.05}
              value={surgeAssumptions.offPeakMultiplier ?? 1.0}
              onChange={(e) =>
                onChangeSurgeAssumptions({
                  ...surgeAssumptions,
                  offPeakMultiplier: Number(e.target.value),
                })
              }
              className="mt-1.5 h-1.5 w-full cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="congestion-slider" className="font-medium text-slate-700">
                Traffic Duration Multiplier
              </label>
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {surgeAssumptions.trafficCongestionFactor
                  ? `${surgeAssumptions.trafficCongestionFactor.toFixed(2)}x`
                  : 'Auto'}
              </span>
            </div>
            <input
              id="congestion-slider"
              type="range"
              min={1.0}
              max={1.6}
              step={0.05}
              value={surgeAssumptions.trafficCongestionFactor ?? 1.2}
              onChange={(e) =>
                onChangeSurgeAssumptions({
                  ...surgeAssumptions,
                  trafficCongestionFactor: Number(e.target.value),
                })
              }
              className="mt-1.5 h-1.5 w-full cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      )}
    </section>
  );
}
