import { AlertCircle, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FareEstimate,
  FareSummary,
  PredictionMeta,
  PredictionPoint,
  VehicleCategory,
} from '../types/cabfare';

interface WaitingTimeAnalysisProps {
  fares: FareEstimate[];
  platformBenchmarks: FareEstimate[];
  farePredictions?: PredictionPoint[];
  predictionMeta?: PredictionMeta;
  summary?: FareSummary;
}

type WaitHorizonMinutes = 10 | 15 | 30;
type WaitRecommendation = 'Book Now' | 'Wait and Compare' | 'Choose Another Cab';

const ANALYSIS_CATEGORIES: { id: 'benchmark' | VehicleCategory; label: string }[] = [
  { id: 'benchmark', label: 'Standard Cab Benchmark' },
  { id: 'bike', label: 'Bike' },
  { id: 'auto', label: 'Auto' },
  { id: 'hatchback', label: 'Hatchback' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'suv', label: 'SUV' },
  { id: 'ev', label: 'Electric Vehicle' },
];

const WAIT_HORIZONS: WaitHorizonMinutes[] = [10, 15, 30];

export function WaitingTimeAnalysis({
  fares,
  platformBenchmarks,
  farePredictions = [],
  predictionMeta,
  summary,
}: WaitingTimeAnalysisProps) {
  const [analysisView, setAnalysisView] = useState<'forecast' | 'time-value'>('forecast');
  const [selectedWaitHorizon, setSelectedWaitHorizon] = useState<WaitHorizonMinutes>(15);
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    platformBenchmarks[0]?.id ?? fares[0]?.id ?? 'benchmark-avg'
  );

  // Keep selectedOptionId valid when route or available fares change
  useEffect(() => {
    if (selectedOptionId === 'benchmark-avg') return;
    if (!fares.some((f) => f.id === selectedOptionId)) {
      setSelectedOptionId(platformBenchmarks[0]?.id ?? fares[0]?.id ?? 'benchmark-avg');
    }
  }, [fares, platformBenchmarks, selectedOptionId]);

  // Existing Pickup ETA Time-Value state (preserved feature)
  const [hourlyTimeValue, setHourlyTimeValue] = useState<number>(360);
  const [categoryScope, setCategoryScope] = useState<'benchmark' | VehicleCategory>('benchmark');

  const benchmarkAverage = useMemo(() => {
    if (summary?.averageFare) return summary.averageFare;
    if (platformBenchmarks.length > 0) {
      return Math.round(
        platformBenchmarks.reduce((acc, f) => acc + f.estimatedFare, 0) / platformBenchmarks.length
      );
    }
    return fares[0]?.estimatedFare ?? 200;
  }, [summary, platformBenchmarks, fares]);

  const selectedOption: FareEstimate | null = useMemo(() => {
    if (selectedOptionId === 'benchmark-avg') return null;
    return fares.find((f) => f.id === selectedOptionId) ?? platformBenchmarks[0] ?? fares[0] ?? null;
  }, [fares, platformBenchmarks, selectedOptionId]);

  // Helper to resolve deterministic +10m / +15m / +30m forecast from the existing prediction model
  const waitComparison = useMemo(() => {
    const getPredPoint = (minutes: 0 | WaitHorizonMinutes): PredictionPoint => {
      const exact = farePredictions.find((p) => p.minutesAhead === minutes);
      if (exact) return exact;

      if (minutes === 15) {
        const p10 = farePredictions.find((p) => p.minutesAhead === 10);
        const p20 = farePredictions.find((p) => p.minutesAhead === 20);
        if (p10 && p20) {
          return {
            offsetLabel: '+15m',
            minutesAhead: 15,
            expectedFare: Math.round((p10.expectedFare + p20.expectedFare) / 2),
            lowEstimate: Math.round((p10.lowEstimate + p20.lowEstimate) / 2),
            highEstimate: Math.round((p10.highEstimate + p20.highEstimate) / 2),
            surgeProbability: Math.round((p10.surgeProbability + p20.surgeProbability) / 2),
            trendDirection: p20.trendDirection,
          };
        }
      }

      return {
        offsetLabel: minutes === 0 ? 'Now' : `+${minutes}m`,
        minutesAhead: minutes,
        expectedFare: benchmarkAverage,
        lowEstimate: Math.round(benchmarkAverage * 0.94),
        highEstimate: Math.round(benchmarkAverage * 1.06),
        surgeProbability: 45,
        trendDirection: 'stable',
      };
    };

    const currentFare = selectedOption ? selectedOption.estimatedFare : benchmarkAverage;
    const isFixedSurgePlatform =
      selectedOption?.platformId === 'blusmart' && selectedOption.surgeMultiplier <= 1.0;

    const projectOptionFare = (minutes: 0 | WaitHorizonMinutes) => {
      const macroPoint = getPredPoint(minutes);
      if (minutes === 0) {
        return {
          minutes: 0 as const,
          label: 'Book Now',
          shortLabel: 'Now',
          fare: currentFare,
          lowEstimate: currentFare,
          highEstimate: currentFare,
          diffFromNow: 0,
          surgeProbability: macroPoint.surgeProbability,
        };
      }

      const macroRatio = benchmarkAverage > 0 ? macroPoint.expectedFare / benchmarkAverage : 1;
      // Surge-free electric cabs show damped fare drift compared to dynamic-surge platforms
      const sensitivityWeight = isFixedSurgePlatform ? 0.25 : 1.0;
      const adjustedRatio = 1 + (macroRatio - 1) * sensitivityWeight;
      const projectedFare = Math.max(
        selectedOption?.minimumFare ?? 40,
        Math.round(currentFare * adjustedRatio)
      );

      const bandRatio =
        macroPoint.expectedFare > 0
          ? (macroPoint.highEstimate - macroPoint.expectedFare) / macroPoint.expectedFare
          : 0.05;
      const bandAmount = Math.max(8, Math.round(projectedFare * bandRatio));

      return {
        minutes,
        label: `Wait ${minutes} min`,
        shortLabel: `+${minutes} min`,
        fare: projectedFare,
        lowEstimate: Math.max(selectedOption?.minimumFare ?? 30, projectedFare - bandAmount),
        highEstimate: projectedFare + bandAmount,
        diffFromNow: projectedFare - currentFare,
        surgeProbability: macroPoint.surgeProbability,
      };
    };

    const nowPoint = projectOptionFare(0);
    const wait10 = projectOptionFare(10);
    const wait15 = projectOptionFare(15);
    const wait30 = projectOptionFare(30);
    const allHorizons = [nowPoint, wait10, wait15, wait30];
    const futureHorizons = [wait10, wait15, wait30];

    const selectedWaitPoint =
      futureHorizons.find((h) => h.minutes === selectedWaitHorizon) ?? wait15;

    // Best future wait window (lowest predicted fare)
    const bestFuture = [...futureHorizons].sort((a, b) => a.fare - b.fare)[0];
    const maxFutureSaving = Math.max(0, currentFare - bestFuture.fare);

    // Compare against the cheapest comparable cab on the route right now
    const sameCategoryPool = selectedOption
      ? fares.filter((f) => f.category === selectedOption.category)
      : platformBenchmarks;
    const comparablePool =
      sameCategoryPool.length > 1 ? sameCategoryPool : platformBenchmarks.length > 0 ? platformBenchmarks : fares;
    const cheapestComparable = [...comparablePool].sort(
      (a, b) => a.estimatedFare - b.estimatedFare
    )[0];
    const overallCheapestCab = platformBenchmarks[0] ?? fares[0];
    const bestAltCab =
      cheapestComparable && cheapestComparable.estimatedFare < (overallCheapestCab?.estimatedFare ?? Infinity)
        ? cheapestComparable
        : overallCheapestCab;

    const switchSavings = bestAltCab ? Math.max(0, currentFare - bestAltCab.estimatedFare) : 0;

    let recommendation: WaitRecommendation = 'Book Now';
    let recommendationReason = '';

    if (
      bestAltCab &&
      selectedOption &&
      bestAltCab.id !== selectedOption.id &&
      switchSavings >= 25 &&
      bestAltCab.estimatedFare <= bestFuture.fare
    ) {
      recommendation = 'Choose Another Cab';
      recommendationReason = `${bestAltCab.platformName} (${bestAltCab.vehicleType}) is available now for ₹${bestAltCab.estimatedFare}, saving ₹${switchSavings} immediately compared to ${selectedOption.vehicleType} (₹${currentFare}) — more than waiting ${bestFuture.minutes} minutes (₹${bestFuture.fare}).`;
    } else if (
      bestAltCab &&
      selectedOptionId === 'benchmark-avg' &&
      switchSavings >= 35 &&
      bestAltCab.estimatedFare < bestFuture.fare - 15
    ) {
      recommendation = 'Choose Another Cab';
      recommendationReason = `Instead of waiting for the market average (₹${bestFuture.fare} in ${bestFuture.minutes} min), choosing ${bestAltCab.platformName} (${bestAltCab.vehicleType}) now at ₹${bestAltCab.estimatedFare} saves ₹${switchSavings} below the current ₹${currentFare} average.`;
    } else if (maxFutureSaving >= 10) {
      recommendation = 'Wait and Compare';
      recommendationReason = `Synthetic historical demand curves (${predictionMeta?.confidencePercent ?? 76}% pattern confidence) indicate demand cooling over the next ${bestFuture.minutes} minutes, reducing the estimated fare from ₹${currentFare} to ₹${bestFuture.fare} (potential savings of ₹${maxFutureSaving}).`;
    } else {
      recommendation = 'Book Now';
      const worstFuture = [...futureHorizons].sort((a, b) => b.fare - a.fare)[0];
      const upsideRisk = Math.max(0, worstFuture.fare - currentFare);
      recommendationReason =
        upsideRisk >= 8
          ? `Fares are projected to trend higher (up to ₹${worstFuture.fare} in ${worstFuture.minutes} minutes, +₹${upsideRisk} extra cost). Booking now at ₹${currentFare} avoids anticipated peak pricing.`
          : `Fares are projected to remain stable across 10, 15, and 30 minutes (₹${wait10.fare}–₹${wait30.fare} vs ₹${currentFare} now). Waiting is unlikely to reduce cost meaningfully.`;
    }

    return {
      currentFare,
      wait10,
      wait15,
      wait30,
      selectedWaitPoint,
      allHorizons,
      bestFuture,
      maxFutureSaving,
      bestAltCab,
      switchSavings,
      recommendation,
      recommendationReason,
      optionLabel: selectedOption
        ? `${selectedOption.vehicleType}`
        : '4-Wheeler Cab Average',
    };
  }, [
    farePredictions,
    benchmarkAverage,
    selectedOption,
    selectedOptionId,
    selectedWaitHorizon,
    fares,
    platformBenchmarks,
    predictionMeta,
  ]);

  // Preserved Value-of-Time ETA calculation
  const activeFares = useMemo(() => {
    if (categoryScope === 'benchmark') return platformBenchmarks;
    return fares.filter((f) => f.category === categoryScope);
  }, [fares, platformBenchmarks, categoryScope]);

  const timeValueAnalysis = useMemo(() => {
    const perMinuteCost = hourlyTimeValue / 60;
    const rows = activeFares.map((fare) => {
      const waitCost = Math.round(fare.arrivalMinutes * perMinuteCost);
      const effectiveCost = fare.estimatedFare + waitCost;
      return {
        label:
          categoryScope === 'benchmark'
            ? fare.platformName
            : `${fare.platformName} (${fare.vehicleType.replace(fare.platformName, '').trim() || fare.categoryLabel})`,
        platformName: fare.platformName,
        vehicleType: fare.vehicleType,
        estimatedFare: fare.estimatedFare,
        arrivalMinutes: fare.arrivalMinutes,
        waitCost,
        effectiveCost,
      };
    });

    const sortedByEffective = [...rows].sort((a, b) => a.effectiveCost - b.effectiveCost);
    const optimal = sortedByEffective[0];
    const cheapestByFare = [...rows].sort((a, b) => a.estimatedFare - b.estimatedFare)[0];

    return {
      rows: sortedByEffective,
      optimal,
      cheapestByFare,
      perMinuteCost: perMinuteCost.toFixed(1),
    };
  }, [activeFares, hourlyTimeValue, categoryScope]);

  const diffFromCheapest =
    timeValueAnalysis.optimal && timeValueAnalysis.cheapestByFare
      ? timeValueAnalysis.optimal.vehicleType !== timeValueAnalysis.cheapestByFare.vehicleType
      : false;

  const recStyles =
    waitComparison.recommendation === 'Wait and Compare'
      ? {
          wrap: 'border-emerald-200 bg-emerald-50/70',
          badge: 'text-emerald-800',
          icon: <TrendingDown className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />,
        }
      : waitComparison.recommendation === 'Choose Another Cab'
        ? {
            wrap: 'border-blue-200 bg-blue-50/70',
            badge: 'text-blue-800',
            icon: <Clock className="h-5 w-5 text-blue-700 shrink-0" aria-hidden="true" />,
          }
        : {
            wrap: 'border-amber-200 bg-amber-50/70',
            badge: 'text-amber-800',
            icon: <TrendingUp className="h-5 w-5 text-amber-700 shrink-0" aria-hidden="true" />,
          };

  const selectedDelta = waitComparison.selectedWaitPoint.diffFromNow;

  return (
    <section
      aria-label="Waiting-Time Cost Analysis"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5"
    >
      {/* Header + View Switcher */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Waiting-Time Cost Analysis
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {analysisView === 'forecast'
              ? 'Compare booking immediately versus waiting 10, 15, or 30 minutes using simulated historical fare predictions.'
              : 'Balances estimated ride fare against simulated driver pickup ETA using your imputed value of time.'}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setAnalysisView('forecast')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              analysisView === 'forecast'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Book Now vs. Wait (10/15/30m)
          </button>
          <button
            type="button"
            onClick={() => setAnalysisView('time-value')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              analysisView === 'time-value'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pickup ETA Time-Value
          </button>
        </div>
      </div>

      {analysisView === 'forecast' ? (
        <div className="space-y-5">
          {/* Controls: Ride Selector + Wait Window Selector */}
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-end sm:justify-between">
            <div className="sm:min-w-[280px]">
              <label
                htmlFor="wait-analysis-ride-select"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Cab Option Analyzed
              </label>
              <select
                id="wait-analysis-ride-select"
                value={selectedOptionId}
                onChange={(e) => setSelectedOptionId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="benchmark-avg">
                  4-Wheeler Cab Benchmark Average (₹{benchmarkAverage})
                </option>
                {fares.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.vehicleType} ({f.platformName}) — ₹{f.estimatedFare}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-slate-700">
                Target Wait Window
              </span>
              <div className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 p-1">
                {WAIT_HORIZONS.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setSelectedWaitHorizon(min)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedWaitHorizon === min
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    Wait {min} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5 Required Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-medium text-slate-500">Current Fare (Now)</span>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                ₹{waitComparison.currentFare}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                {waitComparison.optionLabel}
              </p>
            </div>

            {[waitComparison.wait10, waitComparison.wait15, waitComparison.wait30].map((pt) => {
              const delta = pt.diffFromNow;
              const isSelected = pt.minutes === selectedWaitHorizon;
              return (
                <button
                  key={pt.minutes}
                  type="button"
                  onClick={() => setSelectedWaitHorizon(pt.minutes as WaitHorizonMinutes)}
                  className={`rounded-lg border p-3.5 text-left transition-colors ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50/40'
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[11px] font-medium text-slate-500">
                    Predicted ({pt.shortLabel})
                  </span>
                  <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                    ₹{pt.fare}
                  </div>
                  <p
                    className={`mt-1 font-mono text-[11px] font-semibold tabular-nums ${
                      delta < 0
                        ? 'text-emerald-700'
                        : delta > 0
                          ? 'text-amber-700'
                          : 'text-slate-500'
                    }`}
                  >
                    {delta < 0
                      ? `Save ₹${Math.abs(delta)}`
                      : delta > 0
                        ? `+₹${delta} extra`
                        : 'No change (₹0)'}
                  </p>
                </button>
              );
            })}

            <div className="col-span-2 sm:col-span-2 lg:col-span-1 rounded-lg border border-slate-200 bg-slate-50/50 p-3.5">
              <span className="text-[11px] font-medium text-slate-500">
                {selectedDelta <= 0 ? `Potential Savings (${selectedWaitHorizon}m)` : `Additional Cost (${selectedWaitHorizon}m)`}
              </span>
              <div
                className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                  selectedDelta < 0
                    ? 'text-emerald-700'
                    : selectedDelta > 0
                      ? 'text-amber-700'
                      : 'text-slate-900'
                }`}
              >
                {selectedDelta < 0
                  ? `Save ₹${Math.abs(selectedDelta)}`
                  : selectedDelta > 0
                    ? `+₹${selectedDelta}`
                    : '₹0'}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                Range ₹{waitComparison.selectedWaitPoint.lowEstimate}–₹
                {waitComparison.selectedWaitPoint.highEstimate}
              </p>
            </div>
          </div>

          {/* Clear Recommendation Banner + Explanation */}
          <div className={`rounded-lg border p-4 ${recStyles.wrap}`}>
            <div className="flex items-start gap-3">
              {recStyles.icon}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">
                    Waiting-Time Recommendation:
                  </span>
                  <span className={`font-display text-base font-bold ${recStyles.badge}`}>
                    {waitComparison.recommendation}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  {waitComparison.recommendationReason}
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Chart + Horizon Table */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
            <div className="h-[240px] lg:col-span-7">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={waitComparison.allHorizons}
                  margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[
                      (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.88)),
                      (dataMax: number) => Math.ceil(dataMax * 1.04),
                    ]}
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    formatter={(value) => {
                      const num = Number(value ?? 0);
                      const diff = num - waitComparison.currentFare;
                      const note =
                        diff < 0
                          ? `Save ₹${Math.abs(diff)} vs Now`
                          : diff > 0
                            ? `+₹${diff} vs Now`
                            : 'Current Estimate';
                      return [`₹${num} (${note})`, 'Estimated Fare'];
                    }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine
                    y={waitComparison.currentFare}
                    stroke="#64748B"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="fare" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {waitComparison.allHorizons.map((entry) => {
                      const color =
                        entry.minutes === 0
                          ? '#2563EB'
                          : entry.diffFromNow < 0
                            ? '#16A34A'
                            : entry.diffFromNow > 0
                              ? '#D97706'
                              : '#0284C7';
                      return <Cell key={entry.label} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto lg:col-span-5">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 font-medium">Timing</th>
                    <th className="py-2 text-right font-medium">Est. Fare</th>
                    <th className="py-2 text-right font-medium">Range</th>
                    <th className="py-2 text-right font-medium">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums font-mono">
                  {waitComparison.allHorizons.map((row) => {
                    const isPicked = row.minutes === selectedWaitHorizon;
                    return (
                      <tr
                        key={row.label}
                        className={isPicked ? 'bg-blue-50/50' : ''}
                      >
                        <td className="py-2.5 font-sans font-semibold text-slate-900">
                          {row.label}
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900">
                          ₹{row.fare}
                        </td>
                        <td className="py-2.5 text-right text-slate-600">
                          {row.minutes === 0
                            ? '—'
                            : `₹${row.lowEstimate}–₹${row.highEstimate}`}
                        </td>
                        <td
                          className={`py-2.5 text-right font-semibold ${
                            row.diffFromNow < 0
                              ? 'text-emerald-700'
                              : row.diffFromNow > 0
                                ? 'text-amber-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {row.minutes === 0
                            ? 'Baseline'
                            : row.diffFromNow < 0
                              ? `-₹${Math.abs(row.diffFromNow)}`
                              : row.diffFromNow > 0
                                ? `+₹${row.diffFromNow}`
                                : '₹0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Simulated / Historical Non-Guarantee Notice */}
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            <span>
              {predictionMeta?.disclaimer ??
                'Predictions are estimates modeled from simulated fares and synthetic historical demand curves — not guaranteed future prices or live cab-provider quotes.'}{' '}
              Confidence: <strong>{predictionMeta?.confidenceLabel ?? 'Modeled Pattern Estimate'}</strong>.
            </span>
          </div>
        </div>
      ) : (
        /* Preserved Existing Feature: Pickup ETA & Value-of-Time Analysis */
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
              {ANALYSIS_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryScope(cat.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    categoryScope === cat.id
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1 sm:min-w-[260px]">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="time-value-slider" className="font-medium text-slate-700">
                  Value of Your Time
                </label>
                <span className="font-mono font-semibold text-blue-700 tabular-nums">
                  ₹{hourlyTimeValue}/hr (₹{timeValueAnalysis.perMinuteCost}/min)
                </span>
              </div>
              <input
                id="time-value-slider"
                type="range"
                min={120}
                max={1200}
                step={60}
                value={hourlyTimeValue}
                onChange={(e) => setHourlyTimeValue(Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          {timeValueAnalysis.optimal && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 text-sm text-slate-800">
              <span className="font-semibold text-blue-800">
                Most Economical Overall: {timeValueAnalysis.optimal.vehicleType}
              </span>{' '}
              <span className="text-slate-700">
                at{' '}
                <strong className="font-mono tabular-nums">
                  ₹{timeValueAnalysis.optimal.effectiveCost}
                </strong>{' '}
                effective total cost (₹{timeValueAnalysis.optimal.estimatedFare} fare + ₹
                {timeValueAnalysis.optimal.waitCost} wait-time cost for{' '}
                {timeValueAnalysis.optimal.arrivalMinutes} min simulated ETA).
                {diffFromCheapest && timeValueAnalysis.cheapestByFare
                  ? ` Although ${timeValueAnalysis.cheapestByFare.vehicleType} has a lower sticker fare (₹${timeValueAnalysis.cheapestByFare.estimatedFare}), its ${timeValueAnalysis.cheapestByFare.arrivalMinutes}-min arrival wait adds ₹${timeValueAnalysis.cheapestByFare.waitCost} in time cost.`
                  : ''}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
            <div className="h-[250px] lg:col-span-7">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeValueAnalysis.rows}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="platformName"
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `₹${value ?? 0}`,
                      name === 'estimatedFare' ? 'Ride Fare' : 'Waiting Cost',
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) =>
                      value === 'estimatedFare' ? 'Estimated Fare (₹)' : 'Imputed Wait Cost (₹)'
                    }
                  />
                  <Bar dataKey="estimatedFare" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="waitCost" stackId="a" fill="#16A34A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto lg:col-span-5">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 font-medium">Option</th>
                    <th className="py-2 text-right font-medium">Fare</th>
                    <th className="py-2 text-right font-medium">ETA</th>
                    <th className="py-2 text-right font-medium">Wait Cost</th>
                    <th className="py-2 text-right font-semibold text-slate-900">Effective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums font-mono">
                  {timeValueAnalysis.rows.map((row, idx) => (
                    <tr key={row.vehicleType} className={idx === 0 ? 'bg-emerald-50/40' : ''}>
                      <td className="py-2.5 font-sans font-semibold text-slate-900">
                        {row.vehicleType}
                      </td>
                      <td className="py-2.5 text-right text-slate-700">₹{row.estimatedFare}</td>
                      <td className="py-2.5 text-right text-slate-600">{row.arrivalMinutes}m</td>
                      <td className="py-2.5 text-right text-slate-600">₹{row.waitCost}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">
                        ₹{row.effectiveCost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
