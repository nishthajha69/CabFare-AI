import { AlertCircle, CheckCircle2, Clock, Info, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FareEstimate, PlatformId, VehicleCategory } from '../types/cabfare';

interface FareComparisonGridProps {
  fares: FareEstimate[];
  simulatedNotice: string;
  roadDistanceKm: number;
  straightLineKm: number;
  distanceSource: 'osrm-road-network' | 'road-detour-estimate';
  selectedEstimateId: string | null;
  onSelectEstimate: (fare: FareEstimate) => void;
  targetFare?: number;
}

type SortKey = 'cheapest' | 'fastest' | 'reliable';
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

const PLATFORM_TABS: { id: PlatformFilter; label: string }[] = [
  { id: 'all', label: 'All Providers' },
  { id: 'uber', label: 'Uber' },
  { id: 'ola', label: 'Ola' },
  { id: 'rapido', label: 'Rapido' },
  { id: 'blusmart', label: 'BluSmart' },
  { id: 'namma_yatri', label: 'Namma Yatri' },
];

export function FareComparisonGrid({
  fares,
  simulatedNotice,
  roadDistanceKm,
  straightLineKm,
  distanceSource,
  selectedEstimateId,
  onSelectEstimate,
  targetFare,
}: FareComparisonGridProps) {
  const [sortBy, setSortBy] = useState<SortKey>('cheapest');
  const [category, setCategory] = useState<CategoryFilter>('hatchback');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);

  const visibleFares = useMemo(() => {
    const filtered = fares.filter((f) => {
      const catOk = category === 'all' || f.category === category;
      const platOk = platformFilter === 'all' || f.platformId === platformFilter;
      return catOk && platOk;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'fastest') return a.arrivalMinutes - b.arrivalMinutes;
      if (sortBy === 'reliable') return b.reliabilityScore - a.reliabilityScore;
      return a.estimatedFare - b.estimatedFare;
    });
  }, [fares, sortBy, category, platformFilter]);

  const lowestInView = useMemo(() => {
    if (visibleFares.length === 0) return null;
    return [...visibleFares].sort((a, b) => a.estimatedFare - b.estimatedFare)[0];
  }, [visibleFares]);

  return (
    <section
      aria-label="Cab Fare Comparison"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      {/* Header & Transparency Notice */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Platform &amp; Vehicle Fare Comparison
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">{simulatedNotice}</p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Road route distance: <strong className="font-mono text-slate-800">{roadDistanceKm} km</strong>{' '}
            ({distanceSource === 'osrm-road-network' ? 'OSRM road network' : 'estimated road detour'} vs{' '}
            {straightLineKm} km straight-line)
          </p>
        </div>

        {/* Sort segmented control */}
        <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1">
          {(
            [
              { id: 'cheapest', label: 'Cheapest' },
              { id: 'fastest', label: 'Fastest ETA' },
              { id: 'reliable', label: 'Reliability' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSortBy(opt.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                sortBy === opt.id
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Category & Platform Filters */}
      <div className="mt-4 flex flex-col gap-2.5 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {CATEGORY_TABS.map((tab) => (
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
          {PLATFORM_TABS.map((p) => (
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
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State when platform doesn't support selected vehicle category */}
      {visibleFares.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm font-medium text-slate-800">
            This provider does not offer the selected vehicle category in our configured dataset.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            For example, BluSmart operates Electric Vehicles &amp; EV SUVs only, while Rapido focuses on Bike, Auto, and Economy Hatchback rides.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Show All Providers
            </button>
            <button
              type="button"
              onClick={() => {
                setCategory('all');
                setPlatformFilter('all');
              }}
              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {visibleFares.map((fare) => {
            const isSelected = selectedEstimateId === fare.id;
            const isCheapestVisible = lowestInView?.id === fare.id;
            const meetsBudget = targetFare ? fare.estimatedFare <= targetFare : false;
            const showBreakdown = expandedBreakdownId === fare.id;
            const diffFromLowest = lowestInView
              ? fare.estimatedFare - lowestInView.estimatedFare
              : 0;

            return (
              <div
                key={fare.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                  isCheapestVisible
                    ? 'border-emerald-300 bg-emerald-50/35'
                    : isSelected
                      ? 'border-blue-400 bg-blue-50/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-display text-base font-bold text-slate-900">
                          {fare.platformName}
                        </h3>
                        <span className="text-xs font-medium text-slate-500">
                          {fare.categoryLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {fare.vehicleType} · {fare.pricingModel}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                        ₹{fare.estimatedFare}
                      </div>
                      {isCheapestVisible ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Cheapest Option
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 tabular-nums">
                          +₹{diffFromLowest} vs cheapest
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Key Trip & Simulated Availability Metrics */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600 tabular-nums">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                      <Clock className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                      {fare.arrivalMinutes} min simulated ETA
                    </span>
                    <span>{fare.estimatedDistanceKm} km</span>
                    <span>{fare.journeyMinutes} min trip</span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      {fare.reliabilityScore}%
                    </span>
                    {(fare.scheduledWaitMinutes ?? 0) > 0 && (
                      <span className="font-medium text-emerald-700">
                        {fare.scheduledWaitMinutes}m wait incl.
                      </span>
                    )}
                  </div>

                  {/* Compact Rate Summary + Breakdown Toggle */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 tabular-nums font-mono">
                    <span>
                      Base ₹{fare.baseFare} · ₹{fare.perKmRate}/km · Book ₹{fare.bookingFee}
                    </span>
                    <span
                      className={
                        fare.surgeMultiplier > 1.25
                          ? 'font-semibold text-amber-700'
                          : 'text-slate-600'
                      }
                    >
                      {fare.surgeMultiplier === 1
                        ? '1.0x (No Surge)'
                        : `${fare.surgeMultiplier}x Surge`}
                    </span>
                  </div>

                  {/* Full Transparent Fare Breakdown */}
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBreakdownId(showBreakdown ? null : fare.id)
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{showBreakdown ? 'Hide fare breakdown' : 'View fare breakdown'}</span>
                    </button>

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
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  {targetFare ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        meetsBudget ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {meetsBudget ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {meetsBudget
                        ? `Within ₹${targetFare} budget`
                        : `₹${fare.estimatedFare - targetFare} over budget`}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      Simulated availability · Cancel risk: {fare.cancellationRisk}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectEstimate(fare)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Select Estimate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
