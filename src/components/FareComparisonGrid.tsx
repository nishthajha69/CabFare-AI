import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  KeyRound,
  MapPin,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Timer,
  User,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CityProviderContext,
  CustomPlatformRatesMap,
  FareComparisonResponse,
  FareEstimate,
  PlatformId,
  RideRecommendationHighlight,
  SupportedPlatformInfo,
  VehicleCategory,
} from '../types/cabfare';
import {
  hasVerifiedAuthorisedFemaleDriver,
  sortFaresWithSafeRidePriority,
} from '../utils/safeRideStorage';
import { ProviderLogo } from './ProviderLogo';

interface FareComparisonGridProps {
  fares: FareEstimate[];
  platformBenchmarks: FareEstimate[];
  supportedPlatforms: SupportedPlatformInfo[];
  cityProviderContext: CityProviderContext;
  rideRecommendations: FareComparisonResponse['rideRecommendations'];
  customRates: CustomPlatformRatesMap;
  onChangeCustomRates: (rates: CustomPlatformRatesMap) => void;
  simulatedNotice: string;
  routeWarning?: string;
  roadDistanceKm: number;
  straightLineKm: number;
  distanceSource: 'osrm-road-network' | 'road-detour-estimate';
  selectedEstimateId: string | null;
  onSelectEstimate: (fare: FareEstimate) => void;
  targetFare?: number;
  womenSafetyMode: boolean;
  onToggleWomenSafetyMode: () => void;
  femaleDriverOnly: boolean;
  onToggleFemaleDriverOnly: () => void;
  onOpenSafeRide: () => void;
  onViewDriverProfile: (fare: FareEstimate) => void;
}

type SortKey = 'cheapest' | 'fastest' | 'reliable' | 'safety';
type CategoryFilter = 'all' | VehicleCategory;
type PlatformFilter = 'all' | PlatformId;

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  { id: 'bike', label: 'Bike' },
  { id: 'auto', label: 'Auto' },
  { id: 'hatchback', label: 'Hatchback' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'suv', label: 'SUV' },
  { id: 'ev', label: 'Electric Vehicle' },
];

export function FareComparisonGrid({
  fares,
  platformBenchmarks,
  supportedPlatforms,
  cityProviderContext,
  rideRecommendations,
  customRates,
  onChangeCustomRates,
  simulatedNotice,
  routeWarning,
  roadDistanceKm,
  straightLineKm,
  distanceSource,
  selectedEstimateId,
  onSelectEstimate,
  targetFare,
  womenSafetyMode,
  onToggleWomenSafetyMode,
  femaleDriverOnly,
  onToggleFemaleDriverOnly,
  onOpenSafeRide,
  onViewDriverProfile,
}: FareComparisonGridProps) {
  const [sortBy, setSortBy] = useState<SortKey>(womenSafetyMode ? 'safety' : 'cheapest');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);
  const [expandedSafetyId, setExpandedSafetyId] = useState<string | null>(null);
  const [showRateConfig, setShowRateConfig] = useState<boolean>(false);
  const [draftRates, setDraftRates] = useState<CustomPlatformRatesMap>(customRates);

  useEffect(() => {
    setDraftRates(customRates);
  }, [customRates]);

  useEffect(() => {
    if (womenSafetyMode) {
      setSortBy('safety');
    } else if (sortBy === 'safety') {
      setSortBy('cheapest');
    }
  }, [womenSafetyMode]);

  // Reset platform filter if the newly selected city does not support that platform
  useEffect(() => {
    if (
      platformFilter !== 'all' &&
      !supportedPlatforms.some((p) => p.id === platformFilter)
    ) {
      setPlatformFilter('all');
    }
  }, [supportedPlatforms, platformFilter]);

  const availableCategories = useMemo(() => {
    const present = new Set(fares.map((f) => f.category));
    return CATEGORY_TABS.filter((tab) => tab.id === 'all' || present.has(tab.id));
  }, [fares]);

  useEffect(() => {
    if (category !== 'all' && !availableCategories.some((c) => c.id === category)) {
      setCategory('all');
    }
  }, [availableCategories, category]);

  const hasConfirmedFemaleAvailability = useMemo(
    () =>
      fares.some(
        (f) =>
          hasVerifiedAuthorisedFemaleDriver(f) ||
          f.safetyCapabilities.supportsFemaleDriverPreference
      ),
    [fares]
  );

  const visibleFares = useMemo(() => {
    const filtered = fares.filter((f) => {
      const catOk = category === 'all' || f.category === category;
      const platOk = platformFilter === 'all' || f.platformId === platformFilter;
      return catOk && platOk;
    });

    if (femaleDriverOnly || sortBy === 'safety') {
      // Prioritise authorised female drivers (if preferred) -> female-preference providers -> verified & highest rated -> safety info
      return sortFaresWithSafeRidePriority(filtered, femaleDriverOnly);
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'fastest') {
        const diff = a.arrivalMinutes + a.journeyMinutes - (b.arrivalMinutes + b.journeyMinutes);
        return diff !== 0 ? diff : a.arrivalMinutes - b.arrivalMinutes;
      }
      if (sortBy === 'reliable') return b.reliabilityScore - a.reliabilityScore;
      return a.estimatedFare - b.estimatedFare;
    });
  }, [fares, sortBy, category, platformFilter, femaleDriverOnly]);

  const lowestInView = useMemo(() => {
    if (visibleFares.length === 0) return null;
    return [...visibleFares].sort((a, b) => a.estimatedFare - b.estimatedFare)[0];
  }, [visibleFares]);

  const hasCustomRates = Object.keys(customRates).length > 0;

  const handleApplyRateOverrides = () => {
    onChangeCustomRates(draftRates);
  };

  const handleResetRateOverrides = () => {
    setDraftRates({});
    onChangeCustomRates({});
  };

  const recCards = [
    rideRecommendations.cheapest,
    rideRecommendations.fastest,
    rideRecommendations.bestValue,
    rideRecommendations.bestRatedDriver,
    rideRecommendations.bestSafetyInfo,
    rideRecommendations.bestOverall,
  ].filter((r): r is RideRecommendationHighlight => r !== null);

  return (
    <section
      aria-label="Cab Fare and Safety Comparison"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      {/* Header & Location-Dependent Provider Notice */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Platform, Cab Fare &amp; Safety Comparison
            </h2>
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Estimated Fares · Not Verified Live Quotes
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">{simulatedNotice}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium text-slate-800">
              <MapPin className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <span>
                {cityProviderContext.cityName}
                {cityProviderContext.state ? ` (${cityProviderContext.state})` : ''}:{' '}
                {supportedPlatforms.length > 0
                  ? supportedPlatforms.map((p) => p.name).join(', ')
                  : 'No supported app-based providers'}
              </span>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="tabular-nums text-slate-500">
              Road route:{' '}
              <strong className="font-mono text-slate-800">{roadDistanceKm} km</strong> (
              {distanceSource === 'osrm-road-network'
                ? 'OSRM road network'
                : 'estimated road detour'}{' '}
              vs {straightLineKm} km straight-line)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{cityProviderContext.note}</p>
          {routeWarning && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-[11px] text-amber-800">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{routeWarning}</span>
            </p>
          )}
        </div>

        {/* Sort + Configurable Rates Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          {supportedPlatforms.length > 0 && (
            <button
              type="button"
              onClick={() => setShowRateConfig((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                showRateConfig || hasCustomRates
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{hasCustomRates ? 'Custom Rates Active' : 'Configure Rates (₹/km)'}</span>
            </button>
          )}

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'cheapest', label: 'Cheapest' },
                { id: 'fastest', label: 'Fastest' },
                { id: 'reliable', label: 'Reliability' },
                { id: 'safety', label: 'Safety Info' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortBy(opt.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  sortBy === opt.id
                    ? opt.id === 'safety'
                      ? 'bg-white text-rose-700 shadow-xs font-semibold'
                      : 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Women's Safety Mode & Female Driver Filter Strip */}
      <div className="mt-4 flex flex-col gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <div className="text-xs">
            <p className="font-semibold text-slate-900">
              SafeRide Women&apos;s Safety Mode{' '}
              <span className="font-normal text-slate-600">
                {womenSafetyMode
                  ? '— Prioritizing providers with Ride PIN, In-App SOS, 24x7 Helpline & Share Trip capabilities.'
                  : '— Optional mode to prioritize verified safety features & SafeRide controls.'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={womenSafetyMode}
            onClick={onToggleWomenSafetyMode}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
              womenSafetyMode
                ? 'border-rose-300 bg-rose-600 text-white hover:bg-rose-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Safety Mode: {womenSafetyMode ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={femaleDriverOnly}
            onClick={onToggleFemaleDriverOnly}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              femaleDriverOnly
                ? 'border-indigo-300 bg-indigo-50 text-indigo-800 font-semibold'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Prefer Female Driver: {femaleDriverOnly ? 'On' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSafeRide}
            className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 whitespace-nowrap"
          >
            Open SafeRide SOS &amp; Tools →
          </button>
        </div>
      </div>

      {/* Clear Message When Prefer Female Driver Is Active But Availability Cannot Be Confirmed */}
      {femaleDriverOnly && fares.length > 0 && !hasConfirmedFemaleAvailability && (
        <div
          role="status"
          className="mt-3 flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 text-xs text-indigo-950 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold">
              Prefer Female Driver Active — Female-driver availability cannot be confirmed pre-booking
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-900">
              Authorised aggregator APIs for {supportedPlatforms.map((p) => p.name).join(', ')} do not currently confirm female-driver assignment before booking, and CabFare AI never guesses gender from names or photos. Verified and highest-safety-info options are prioritised below so you can continue with other available drivers.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleFemaleDriverOnly}
            className="shrink-0 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-100 whitespace-nowrap self-start sm:self-center"
          >
            Disable Female Preference
          </button>
        </div>
      )}

      {/* Configurable Provider Base Fare & Per-km Rate Editor */}
      {showRateConfig && platformBenchmarks.length > 0 && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Configurable Provider Base Fare &amp; Per-km Rates ({cityProviderContext.cityName})
              </h3>
              <p className="text-[11px] text-slate-600">
                Adjust benchmark base fare (₹) and distance rate (₹/km) per supported provider; other vehicle tiers scale proportionally.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasCustomRates && (
                <button
                  type="button"
                  onClick={handleResetRateOverrides}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset Defaults</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleApplyRateOverrides}
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Apply Rates
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {platformBenchmarks.map((bench) => {
              const currentBase = draftRates[bench.platformId]?.baseFare ?? bench.baseFare;
              const currentKm = draftRates[bench.platformId]?.perKmRate ?? bench.perKmRate;
              return (
                <div
                  key={bench.platformId}
                  className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <ProviderLogo platformId={bench.platformId} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {bench.platformName}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">{bench.vehicleType}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor={`rate-base-${bench.platformId}`}
                        className="block text-[10px] font-medium text-slate-500"
                      >
                        Base (₹)
                      </label>
                      <input
                        id={`rate-base-${bench.platformId}`}
                        type="number"
                        min={5}
                        max={500}
                        step={1}
                        value={currentBase}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDraftRates((prev) => ({
                            ...prev,
                            [bench.platformId]: {
                              ...prev[bench.platformId],
                              baseFare: Number.isFinite(val) ? val : bench.baseFare,
                            },
                          }));
                        }}
                        className="mt-0.5 h-8 w-full rounded border border-slate-300 px-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`rate-km-${bench.platformId}`}
                        className="block text-[10px] font-medium text-slate-500"
                      >
                        Per km (₹)
                      </label>
                      <input
                        id={`rate-km-${bench.platformId}`}
                        type="number"
                        min={2}
                        max={80}
                        step={0.5}
                        value={currentKm}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDraftRates((prev) => ({
                            ...prev,
                            [bench.platformId]: {
                              ...prev[bench.platformId],
                              perKmRate: Number.isFinite(val) ? val : bench.perKmRate,
                            },
                          }));
                        }}
                        className="mt-0.5 h-8 w-full rounded border border-slate-300 px-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Smart Fare & Safety Recommendations Grid (6 Highlights) */}
      {recCards.length > 0 && fares.length > 0 && (
        <div
          aria-label="Smart Fare and Safety Recommendations"
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {recCards.map((rec) => {
            const est = rec.estimate;
            const accent =
              rec.type === 'cheapest'
                ? {
                    wrap: 'border-emerald-200 bg-emerald-50/50',
                    label: 'text-emerald-800',
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />,
                  }
                : rec.type === 'fastest'
                  ? {
                      wrap: 'border-blue-200 bg-blue-50/50',
                      label: 'text-blue-800',
                      icon: <Zap className="h-4 w-4 text-blue-600" aria-hidden="true" />,
                    }
                  : rec.type === 'best_rated_driver'
                    ? {
                        wrap: 'border-amber-200 bg-amber-50/50',
                        label: 'text-amber-900',
                        icon: <Star className="h-4 w-4 text-amber-600" aria-hidden="true" />,
                      }
                    : rec.type === 'best_safety_info'
                      ? {
                          wrap: 'border-rose-200 bg-rose-50/50',
                          label: 'text-rose-800',
                          icon: <ShieldCheck className="h-4 w-4 text-rose-600" aria-hidden="true" />,
                        }
                      : {
                          wrap: 'border-indigo-200 bg-indigo-50/50',
                          label: 'text-indigo-800',
                          icon: <Award className="h-4 w-4 text-indigo-600" aria-hidden="true" />,
                        };

            return (
              <div
                key={rec.type}
                className={`flex flex-col justify-between rounded-xl border p-3.5 ${accent.wrap}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {est && <ProviderLogo platformId={est.platformId} size="sm" />}
                    <div className="min-w-0">
                      <div className={`flex items-center gap-1 text-xs font-bold ${accent.label}`}>
                        {accent.icon}
                        <span>{rec.title}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-900">
                        {est
                          ? `${est.platformName} · ${est.vehicleType} (${est.categoryLabel})`
                          : 'Driver details will be available after booking'}
                      </p>
                    </div>
                  </div>
                  {est && (
                    <div className="text-right tabular-nums shrink-0">
                      <span className="font-mono text-lg font-bold text-slate-900">
                        ₹{est.estimatedFare}
                      </span>
                      <span className="block text-[10px] font-medium text-slate-500">
                        Est. Fare
                      </span>
                    </div>
                  )}
                </div>

                {est && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2 text-[11px] text-slate-600 tabular-nums">
                    <span>
                      ETA {est.arrivalMinutes}m · Trip {est.journeyMinutes}m · Safety {est.safetyCapabilities.safetyInfoScore}/100
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCategory('all');
                        setPlatformFilter('all');
                        onSelectEstimate(est);
                      }}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      Highlight option
                    </button>
                  </div>
                )}
                <p className="mt-1.5 text-[11px] text-slate-600">{rec.reason}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Vehicle Category & Dynamic City-Supported Platform Filters */}
      {fares.length > 0 && (
        <div className="mt-4 flex flex-col gap-2.5 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {availableCategories.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  category === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                platformFilter === 'all'
                  ? 'border-blue-200 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              All Supported ({supportedPlatforms.length})
            </button>
            {supportedPlatforms.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatformFilter(p.id)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  platformFilter === p.id
                    ? 'border-blue-200 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State: Unsupported Region OR Filter Match Empty */}
      {fares.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-8 text-center space-y-2">
          <p className="text-base font-bold text-slate-900">
            Unsupported Location — No App-Based Cab Aggregators Operate Here
          </p>
          <p className="mx-auto max-w-2xl text-xs leading-relaxed text-slate-700">
            {cityProviderContext.note} CabFare AI strictly avoids displaying Namma Yatri or any unavailable aggregator outside its confirmed coverage area. Please search a supported metro, Tier 2, or Tier 3 city in India, or use local prepaid taxi counters.
          </p>
        </div>
      ) : visibleFares.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm font-semibold text-slate-900">
            {`The selected provider does not offer the selected vehicle category in ${cityProviderContext.cityName}.`}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            For example, BluSmart operates Electric Vehicles &amp; EV SUVs only, while Rapido focuses on Bike, Auto, and Economy Hatchback rides.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCategory('all');
                setPlatformFilter('all');
              }}
              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {visibleFares.map((fare) => {
            const isSelected = selectedEstimateId === fare.id;
            const isCheapestVisible = lowestInView?.id === fare.id;
            const isGlobalCheapest = rideRecommendations.cheapest?.estimate?.id === fare.id;
            const isGlobalFastest = rideRecommendations.fastest?.estimate?.id === fare.id;
            const isGlobalBestValue = rideRecommendations.bestValue?.estimate?.id === fare.id;
            const isGlobalBestSafety = rideRecommendations.bestSafetyInfo?.estimate?.id === fare.id;
            const isGlobalBestOverall = rideRecommendations.bestOverall?.estimate?.id === fare.id;
            const meetsBudget = targetFare ? fare.estimatedFare <= targetFare : false;
            const showBreakdown = expandedBreakdownId === fare.id;
            const showSafetyProfile = expandedSafetyId === fare.id;
            const diffFromLowest = lowestInView
              ? fare.estimatedFare - lowestInView.estimatedFare
              : 0;
            const isVerifiedDriver =
              fare.driverProfile.verificationStatus === 'verified_by_provider';

            return (
              <div
                key={fare.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/35 ring-1 ring-blue-500/20'
                    : isCheapestVisible
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Top: Provider Logo + Provider Name + Cab Category + Estimated Fare */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <ProviderLogo platformId={fare.platformId} size="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="font-display text-base font-bold text-slate-900">
                            {fare.platformName}
                          </h3>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            {fare.categoryLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-700">
                          {fare.vehicleType}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                        ₹{Number.isFinite(fare.estimatedFare) ? fare.estimatedFare : '—'}
                      </div>
                      <span className="block text-[10px] font-medium text-slate-500">
                        {fare.fareQuoteType === 'verified_live'
                          ? 'Verified Live Quote'
                          : 'Estimated Fare'}
                      </span>
                    </div>
                  </div>

                  {/* Recommendation Tags & Price Delta */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(isGlobalCheapest || isCheapestVisible) && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          {isGlobalCheapest ? 'Cheapest Ride' : 'Cheapest in Filter'}
                        </span>
                      )}
                      {isGlobalFastest && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                          <Zap className="h-3 w-3" aria-hidden="true" />
                          Fastest Ride
                        </span>
                      )}
                      {isGlobalBestSafety && (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                          Best Safety Info
                        </span>
                      )}
                      {isGlobalBestOverall && (
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                          <Award className="h-3 w-3" aria-hidden="true" />
                          Best Overall
                        </span>
                      )}
                      {!isGlobalBestOverall && isGlobalBestValue && (
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                          <Award className="h-3 w-3" aria-hidden="true" />
                          Best Value
                        </span>
                      )}
                    </div>

                    {!isCheapestVisible && diffFromLowest > 0 && (
                      <span className="text-xs text-slate-500 tabular-nums">
                        +₹{diffFromLowest} vs lowest
                      </span>
                    )}
                  </div>

                  {/* Structured Metrics Grid: Arrival, Journey Duration, Price/km, Base & Surge */}
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs tabular-nums">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
                      <div>
                        <span className="block text-[10px] text-slate-500">Arrival ETA</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {fare.arrivalMinutes} min
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      <div>
                        <span className="block text-[10px] text-slate-500">Journey Duration</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {fare.journeyMinutes} min
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500">Price per km</span>
                      <span className="font-mono font-semibold text-slate-900">
                        ₹{fare.perKmRate}/km
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500">Base &amp; Surge</span>
                      <span
                        className={`font-mono font-semibold ${
                          fare.surgeMultiplier > 1.25 ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        ₹{fare.baseFare} ·{' '}
                        {fare.surgeMultiplier === 1 ? '1.0x' : `${fare.surgeMultiplier}x`}
                      </span>
                    </div>
                  </div>

                  {/* Dedicated Driver Profile Section (Honest Pre-Booking + Authorised API Ready) */}
                  <div
                    aria-label="Driver Profile Summary"
                    className="mt-3 rounded-xl border border-slate-200 bg-slate-50/75 p-3 text-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {fare.driverProfile.isDriverAssigned &&
                        fare.driverProfile.driverPhotoUrl ? (
                          <img
                            src={fare.driverProfile.driverPhotoUrl}
                            alt={fare.driverProfile.driverName ?? 'Driver photo'}
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover shrink-0"
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
                          >
                            <User className="h-5 w-5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate font-semibold text-slate-900">
                              {fare.driverProfile.isDriverAssigned && fare.driverProfile.driverName
                                ? fare.driverProfile.driverName
                                : 'Driver Profile'}
                            </span>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                isVerifiedDriver
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200/80 text-slate-700'
                              }`}
                            >
                              {isVerifiedDriver ? 'Verified Driver' : 'Pending Booking'}
                            </span>
                          </div>

                          {/* Rating out of 5 stars */}
                          <div className="mt-0.5 flex items-center gap-1">
                            <div className="flex items-center gap-0.5" aria-hidden="true">
                              {[1, 2, 3, 4, 5].map((starIdx) => (
                                <Star
                                  key={starIdx}
                                  className={`h-3 w-3 ${
                                    fare.driverProfile.driverRating !== null &&
                                    fare.driverProfile.driverRating >= starIdx - 0.3
                                      ? 'fill-amber-400 text-amber-500'
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-mono text-[10px] font-medium text-slate-600 tabular-nums">
                              {fare.driverProfile.driverRating !== null
                                ? `${fare.driverProfile.driverRating.toFixed(1)}/5`
                                : '—/5'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!fare.driverProfile.isDriverAssigned && (
                      <p className="rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700">
                        {fare.driverProfile.statusMessage}
                      </p>
                    )}

                    <dl className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-[11px]">
                      <div>
                        <dt className="text-[10px] text-slate-500">Completed Rides</dt>
                        <dd className="font-medium text-slate-800 tabular-nums">
                          {fare.driverProfile.completedRides !== null
                            ? fare.driverProfile.completedRides.toLocaleString('en-IN')
                            : 'After booking'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-slate-500">Experience</dt>
                        <dd className="font-medium text-slate-800 tabular-nums">
                          {fare.driverProfile.verifiedExperienceYears !== null
                            ? `${fare.driverProfile.verifiedExperienceYears} yrs`
                            : 'After booking'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-slate-500">Vehicle Model</dt>
                        <dd className="truncate font-medium text-slate-800">
                          {fare.driverProfile.vehicleModel ?? fare.vehicleType}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-slate-500">Registration No.</dt>
                        <dd className="font-mono text-[10px] font-medium text-slate-800">
                          {fare.driverProfile.vehicleRegistrationNumber ?? 'After booking'}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="rounded border border-rose-200/80 bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-800 tabular-nums">
                        Safety Info: {fare.safetyCapabilities.safetyInfoScore}/100
                      </span>
                      {fare.safetyCapabilities.hasRidePinVerification && (
                        <span className="inline-flex items-center gap-0.5 rounded border border-blue-200/80 bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">
                          <KeyRound className="h-2.5 w-2.5" aria-hidden="true" />
                          Ride PIN
                        </span>
                      )}
                      {fare.safetyCapabilities.hasSOSButtonInApp && (
                        <span className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-700 border border-slate-200">
                          In-app SOS
                        </span>
                      )}
                      {fare.safetyCapabilities.supportsFemaleDriverPreference && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-800 border border-indigo-200">
                          Female Driver Preference Supported
                        </span>
                      )}
                      {fare.driverProfile.driverGenderSource === 'authorized_provider_api' &&
                        fare.driverProfile.driverGender && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800 border border-emerald-200 capitalize">
                            Gender (API): {fare.driverProfile.driverGender.replace('_', ' ')}
                          </span>
                        )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewDriverProfile(fare)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-50"
                    >
                      <User className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>View Driver Profile</span>
                    </button>
                  </div>

                  {/* Explicit Availability Status (Clearly Simulated, Not Live) */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <ShieldCheck
                        className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      <span>{fare.availabilityStatus}</span>
                    </span>
                    <span className="tabular-nums text-slate-500">
                      {fare.reliabilityScore}% rel · {fare.cancellationRisk} cancel risk
                    </span>
                  </div>

                  {/* Expandable Breakdown & Quick Safety Toggles */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBreakdownId(showBreakdown ? null : fare.id)
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{showBreakdown ? 'Hide breakdown' : 'Fare breakdown'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSafetyId(showSafetyProfile ? null : fare.id)
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{showSafetyProfile ? 'Hide safety tools' : 'Safety & SOS tools'}</span>
                    </button>
                  </div>

                  {showBreakdown && (
                    <dl className="mt-2 space-y-1 rounded-lg border border-slate-200/80 bg-slate-50/80 p-2.5 text-xs tabular-nums">
                      <div className="flex justify-between text-slate-600">
                        <dt>Base Fare</dt>
                        <dd className="font-mono">₹{fare.baseFare}</dd>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <dt>
                          Distance ({fare.estimatedDistanceKm} km × ₹{fare.perKmRate})
                        </dt>
                        <dd className="font-mono">₹{fare.distanceCharge}</dd>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <dt>
                          Duration ({fare.journeyMinutes} min × ₹{fare.perMinRate})
                        </dt>
                        <dd className="font-mono">₹{fare.timeCharge}</dd>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <dt>Booking Fee</dt>
                        <dd className="font-mono">₹{fare.bookingFee}</dd>
                      </div>
                      {fare.minimumFareApplied && (
                        <div className="flex justify-between font-medium text-blue-700">
                          <dt>Minimum Fare Floor Applied</dt>
                          <dd className="font-mono">₹{fare.minimumFare}</dd>
                        </div>
                      )}
                      {fare.surgeFee > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <dt>Estimated Surge ({fare.surgeMultiplier}x)</dt>
                          <dd className="font-mono">+₹{fare.surgeFee}</dd>
                        </div>
                      )}
                      {fare.airportOrZoneFee > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <dt>Zone / Airport Pickup Fee</dt>
                          <dd className="font-mono">+₹{fare.airportOrZoneFee}</dd>
                        </div>
                      )}
                      {(fare.scheduledWaitMinutes ?? 0) > 0 && (
                        <div className="flex justify-between text-blue-700">
                          <dt>
                            Scheduled Pickup Wait ({fare.scheduledWaitMinutes}m buffer)
                          </dt>
                          <dd className="font-mono">+₹{fare.pickupWaitCharge ?? 0}</dd>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
                        <dt>Estimated Total</dt>
                        <dd className="font-mono">₹{fare.estimatedFare}</dd>
                      </div>
                    </dl>
                  )}

                  {showSafetyProfile && (
                    <div className="mt-2 space-y-2 rounded-lg border border-rose-200/80 bg-rose-50/40 p-2.5 text-[11px]">
                      <p className="font-semibold text-slate-900">
                        Driver Profile ({fare.driverProfile.isDriverAssigned ? 'API Assigned' : 'Pre-Booking Status'})
                      </p>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700">
                        <div>
                          <dt className="text-[10px] text-slate-500">Driver Name</dt>
                          <dd className="font-medium">{fare.driverProfile.driverName ?? 'Available after booking'}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-slate-500">Driver Photo</dt>
                          <dd className="font-medium">{fare.driverProfile.driverPhotoUrl ? 'Provided' : 'Available after booking'}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-slate-500">Driver Rating</dt>
                          <dd className="font-medium">{fare.driverProfile.driverRating !== null ? `${fare.driverProfile.driverRating}/5` : 'Available after booking'}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-slate-500">Completed Rides</dt>
                          <dd className="font-medium">{fare.driverProfile.completedRides !== null ? fare.driverProfile.completedRides : 'Available after booking'}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-slate-500">Verified Experience</dt>
                          <dd className="font-medium">{fare.driverProfile.verifiedExperienceYears !== null ? `${fare.driverProfile.verifiedExperienceYears} yrs` : 'Available after booking'}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-slate-500">Vehicle Model &amp; Reg</dt>
                          <dd className="font-medium">
                            {fare.driverProfile.vehicleModel && fare.driverProfile.vehicleRegistrationNumber
                              ? `${fare.driverProfile.vehicleModel} (${fare.driverProfile.vehicleRegistrationNumber})`
                              : 'Available after booking'}
                          </dd>
                        </div>
                      </dl>
                      <div className="border-t border-rose-200/60 pt-1.5">
                        <p className="font-medium text-slate-800">
                          Documented Tools: {fare.safetyCapabilities.documentedSafetyFeatures.join(' · ')}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-600">
                          {fare.safetyCapabilities.safetyCaveat}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: Budget Status + Select + Booking Redirect Button */}
                <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
                  {targetFare && (
                    <div
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        meetsBudget ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {meetsBudget ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {meetsBudget
                          ? `Within ₹${targetFare} budget`
                          : `₹${fare.estimatedFare - targetFare} over budget`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectEstimate(fare)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>

                    <a
                      href={fare.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open ${fare.platformName} to verify live availability and book (estimated fare ₹${fare.estimatedFare})`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
                    >
                      <span>Book on {fare.platformName}</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
