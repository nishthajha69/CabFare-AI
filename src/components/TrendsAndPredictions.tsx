import { AlertCircle, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchAnalyticsData } from '../services/api';
import {
  AnalyticsSummaryResponse,
  DailyTrendPoint,
  HistoricalPoint,
  PredictionMeta,
  PredictionPoint,
} from '../types/cabfare';

interface TrendsAndPredictionsProps {
  history24h: HistoricalPoint[];
  history7d: DailyTrendPoint[];
  predictions: PredictionPoint[];
  predictionMeta: PredictionMeta;
  routeLabel: string;
  pickupName: string;
  dropName: string;
}

const SERIES_CONFIG = [
  { key: 'uber', name: 'Uber', color: '#0F172A' },
  { key: 'ola', name: 'Ola', color: '#2563EB' },
  { key: 'rapido', name: 'Rapido', color: '#0284C7' },
  { key: 'blusmart', name: 'BluSmart', color: '#16A34A' },
  { key: 'namma_yatri', name: 'Namma Yatri', color: '#10B981' },
] as const;

const PERIOD_COLORS: Record<'Peak' | 'Moderate' | 'Off-Peak', string> = {
  Peak: '#D97706',
  Moderate: '#2563EB',
  'Off-Peak': '#16A34A',
};

export function TrendsAndPredictions({
  history24h,
  history7d,
  predictions,
  predictionMeta,
  routeLabel,
  pickupName,
  dropName,
}: TrendsAndPredictionsProps) {
  const [timeframe, setTimeframe] = useState<'24h' | '7d'>('24h');
  const [dataSourceScope, setDataSourceScope] = useState<'route' | 'synthetic'>('route');
  const [enabledPlatforms, setEnabledPlatforms] = useState<Record<string, boolean>>({
    uber: true,
    ola: true,
    rapido: true,
    blusmart: true,
    namma_yatri: true,
  });
  const [showAvgOverlay, setShowAvgOverlay] = useState<boolean>(true);
  const [syntheticAnalytics, setSyntheticAnalytics] = useState<AnalyticsSummaryResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetchAnalyticsData({ pickupLocation: pickupName, destination: dropName })
      .then((res) => {
        if (!active) return;
        if (res.filteredRecordCount > 0) {
          setSyntheticAnalytics(res);
        } else {
          // If custom route isn't one of the 6 seeded corridors, load overall synthetic cab patterns
          return fetchAnalyticsData({ vehicleCategory: 'hatchback' }).then((fallbackRes) => {
            if (active) setSyntheticAnalytics(fallbackRes);
          });
        }
      })
      .catch(() => {
        if (active) setSyntheticAnalytics(null);
      });
    return () => {
      active = false;
    };
  }, [pickupName, dropName]);

  const togglePlatform = (key: string) => {
    setEnabledPlatforms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const horizonHighlights = [10, 20, 30]
    .map((m) => predictions.find((p) => p.minutesAhead === m))
    .filter((p): p is PredictionPoint => Boolean(p));

  const chartData =
    dataSourceScope === 'synthetic' && syntheticAnalytics
      ? timeframe === '24h'
        ? syntheticAnalytics.hourlyPatterns.map((d) => ({
            label: d.timeLabel,
            uber: d.uber ?? undefined,
            ola: d.ola ?? undefined,
            rapido: d.rapido ?? undefined,
            blusmart: d.blusmart ?? undefined,
            namma_yatri: d.namma_yatri ?? undefined,
            averageFare: d.averageFare,
          }))
        : syntheticAnalytics.dailyTrend.map((d) => ({
            label: d.dayLabel,
            uber: d.uber ?? undefined,
            ola: d.ola ?? undefined,
            rapido: d.rapido ?? undefined,
            blusmart: d.blusmart ?? undefined,
            namma_yatri: d.namma_yatri ?? undefined,
            averageFare: d.averageFare,
          }))
      : timeframe === '24h'
        ? history24h.map((d) => ({
            label: d.timeLabel,
            uber: d.uber,
            ola: d.ola,
            rapido: d.rapido,
            blusmart: d.blusmart,
            namma_yatri: d.namma_yatri,
            averageFare: Math.round((d.uber + d.ola + d.rapido + d.blusmart + d.namma_yatri) / 5),
          }))
        : history7d.map((d) => ({
            label: d.dayLabel,
            uber: d.uber,
            ola: d.ola,
            rapido: d.rapido,
            blusmart: d.blusmart,
            namma_yatri: d.namma_yatri,
            averageFare: d.averageFare,
          }));

  const directionBadgeClasses =
    predictionMeta.direction === 'decrease'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : predictionMeta.direction === 'increase'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-blue-200 bg-blue-50 text-blue-800';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Fare Prediction &amp; Synthetic Price History
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Short-horizon fare trend forecasting and synthetic historical pricing patterns for {routeLabel}.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-medium text-blue-800 self-start sm:self-auto">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Synthetic historical model · Non-guaranteed estimates</span>
        </span>
      </div>

      {/* FEATURE 2: 10 / 20 / 30-Minute Fare Prediction */}
      <section
        aria-label="Fare Prediction"
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              10, 20 &amp; 30-Minute Fare Trend Forecast
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">{predictionMeta.basisSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${directionBadgeClasses}`}
            >
              {predictionMeta.direction === 'decrease' ? (
                <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{predictionMeta.directionLabel}</span>
            </span>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 tabular-nums">
              Confidence: <strong className="text-slate-900">{predictionMeta.confidenceLabel}</strong>
            </span>
          </div>
        </div>

        {/* Highlight cards for +10m, +20m, +30m */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {horizonHighlights.map((pt) => {
            const label =
              pt.trendDirection === 'rising'
                ? 'May Increase'
                : pt.trendDirection === 'cooling'
                  ? 'May Decrease'
                  : 'Likely Stable';
            const colorClass =
              pt.trendDirection === 'cooling'
                ? 'text-emerald-700'
                : pt.trendDirection === 'rising'
                  ? 'text-amber-700'
                  : 'text-blue-700';

            return (
              <div
                key={pt.offsetLabel}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    In {pt.minutesAhead} Minutes ({pt.offsetLabel})
                  </span>
                  <span className={`font-semibold ${colorClass}`}>{label}</span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between tabular-nums">
                  <span className="font-mono text-xl font-bold text-slate-900">
                    ₹{pt.expectedFare}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    Range ₹{pt.lowEstimate}–₹{pt.highEstimate}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                  Estimated surge probability: {pt.surgeProbability}%
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          <div className="h-[250px] lg:col-span-7">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictions} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="offsetLabel"
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
                    name === 'expectedFare'
                      ? 'Expected Fare'
                      : name === 'highEstimate'
                        ? 'Upper Bound'
                        : 'Lower Bound',
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="highEstimate"
                  stroke="#93C5FD"
                  fill="#DBEAFE"
                  fillOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="expectedFare"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="#BFDBFE"
                  fillOpacity={0.35}
                />
                <Area
                  type="monotone"
                  dataKey="lowEstimate"
                  stroke="#16A34A"
                  strokeDasharray="4 4"
                  fill="#FFFFFF"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto lg:col-span-5">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-medium">Horizon</th>
                  <th className="py-2 text-right font-medium">Expected</th>
                  <th className="py-2 text-right font-medium">Range</th>
                  <th className="py-2 text-right font-medium">Surge Prob.</th>
                  <th className="py-2 text-right font-medium">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums font-mono">
                {predictions.map((p) => (
                  <tr key={p.offsetLabel}>
                    <td className="py-2.5 font-sans font-semibold text-slate-900">
                      {p.offsetLabel}
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      ₹{p.expectedFare}
                    </td>
                    <td className="py-2.5 text-right text-slate-600">
                      ₹{p.lowEstimate}–₹{p.highEstimate}
                    </td>
                    <td className="py-2.5 text-right text-slate-700">{p.surgeProbability}%</td>
                    <td
                      className={`py-2.5 text-right font-sans font-semibold capitalize ${
                        p.trendDirection === 'cooling'
                          ? 'text-emerald-700'
                          : p.trendDirection === 'rising'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                      }`}
                    >
                      {p.trendDirection === 'rising'
                        ? 'Increase'
                        : p.trendDirection === 'cooling'
                          ? 'Decrease'
                          : 'Stable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Limitations & Non-Guarantee Disclosure */}
        <div className="mt-5 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3.5 text-xs text-amber-950">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">{predictionMeta.disclaimer}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-amber-900/90">
                {predictionMeta.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE 3: Interactive Price History Charts */}
      <section
        aria-label="Price History Charts"
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Hourly Fare Changes &amp; Platform-Wise Price History (Synthetic)
            </h3>
            <p className="text-xs text-slate-500">
              Compare hourly pricing volatility, historical average fares, and platform spread
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {syntheticAnalytics && (
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setDataSourceScope('route')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    dataSourceScope === 'route'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active Route Curve
                </button>
                <button
                  type="button"
                  onClick={() => setDataSourceScope('synthetic')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    dataSourceScope === 'synthetic'
                      ? 'bg-white text-blue-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Synthetic Dataset ({syntheticAnalytics.filteredRecordCount} recs)
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTimeframe('24h')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  timeframe === '24h'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hourly Changes
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('7d')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  timeframe === '7d'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7-Day Averages
              </button>
            </div>
          </div>
        </div>

        {/* Platform Filter Toggles + Historical Average Toggle */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {SERIES_CONFIG.map((s) => {
            const active = enabledPlatforms[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => togglePlatform(s.key)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-slate-300 bg-slate-50 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: active ? s.color : '#CBD5E1' }}
                  aria-hidden="true"
                />
                <span>{s.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowAvgOverlay((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              showAvgOverlay
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-white text-slate-400'
            }`}
          >
            <span
              className="inline-block h-0.5 w-3 border-t-2 border-dashed border-amber-600"
              aria-hidden="true"
            />
            <span>Historical Average</span>
          </button>
        </div>

        <div className="mt-4 h-[310px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="label"
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
                formatter={(value, name) => [`₹${value ?? 0}`, String(name ?? '')]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {SERIES_CONFIG.map(
                (s) =>
                  enabledPlatforms[s.key] && (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.name}
                      stroke={s.color}
                      strokeWidth={2.2}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  )
              )}
              {showAvgOverlay && (
                <Line
                  type="monotone"
                  dataKey="averageFare"
                  name="Historical Average"
                  stroke="#D97706"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Peak-Hour Pricing Patterns from Synthetic Dataset */}
      {syntheticAnalytics && syntheticAnalytics.peakDemandPeriods.length > 0 && (
        <section
          aria-label="Peak-Hour Pricing Patterns"
          className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Peak-Hour vs. Off-Peak Pricing Patterns (Synthetic Dataset)
              </h3>
              <p className="text-xs text-slate-500">
                Calculated from {syntheticAnalytics.filteredRecordCount} synthetic fare records across time-of-day demand windows
              </p>
            </div>
            <span className="text-xs font-medium text-slate-600 tabular-nums">
              Dataset Average: <strong className="font-mono text-slate-900">₹{syntheticAnalytics.kpis.averageFare}</strong>
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
            <div className="h-[240px] lg:col-span-7">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={syntheticAnalytics.peakDemandPeriods}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="periodLabel"
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
                    formatter={(value) => [`₹${value ?? 0}`, 'Avg Synthetic Fare']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="averageFare" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {syntheticAnalytics.peakDemandPeriods.map((p) => (
                      <Cell key={p.periodLabel} fill={PERIOD_COLORS[p.periodType]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:col-span-5">
              {syntheticAnalytics.peakDemandPeriods.map((p) => (
                <div
                  key={p.periodLabel}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">{p.periodLabel}</span>
                    <span
                      className={`text-[11px] font-semibold ${
                        p.periodType === 'Peak'
                          ? 'text-amber-700'
                          : p.periodType === 'Moderate'
                            ? 'text-blue-700'
                            : 'text-emerald-700'
                      }`}
                    >
                      {p.avgSurge}x surge
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                    ₹{p.averageFare}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                    {p.timeRange} · {p.recordCount} records
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
