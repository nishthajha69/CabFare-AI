import { AlertCircle, Check, Download, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  SupportedPlatformInfo,
} from '../types/cabfare';

interface TrendsAndPredictionsProps {
  history24h: HistoricalPoint[];
  history7d: DailyTrendPoint[];
  predictions: PredictionPoint[];
  predictionMeta: PredictionMeta;
  supportedPlatforms?: SupportedPlatformInfo[];
  cityName?: string;
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
  { key: 'meru', name: 'Meru Cabs', color: '#0E7490' },
  { key: 'goamiles', name: 'GoaMiles', color: '#0D9488' },
] as const;

const PERIOD_COLORS: Record<'Peak' | 'Moderate' | 'Off-Peak', string> = {
  Peak: '#D97706',
  Moderate: '#2563EB',
  'Off-Peak': '#16A34A',
};

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(escapeCsvCell).join(',');
}

export function TrendsAndPredictions({
  history24h,
  history7d,
  predictions,
  predictionMeta,
  supportedPlatforms,
  cityName,
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
    meru: true,
    goamiles: true,
  });
  const [showAvgOverlay, setShowAvgOverlay] = useState<boolean>(true);
  const [syntheticAnalytics, setSyntheticAnalytics] = useState<AnalyticsSummaryResponse | null>(null);
  const [csvDownloaded, setCsvDownloaded] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetchAnalyticsData({ pickupLocation: pickupName, destination: dropName })
      .then((res) => {
        if (!active) return;
        if (res.filteredRecordCount > 0) {
          setSyntheticAnalytics(res);
        } else {
          // If custom route isn't one of the seeded corridors, load overall synthetic cab patterns
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

  const chartData = useMemo(() => {
    const computeAvg = (vals: Array<number | null | undefined>): number => {
      const nums = vals.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      if (nums.length === 0) return 0;
      return Math.round(nums.reduce((sum, v) => sum + v, 0) / nums.length);
    };

    if (dataSourceScope === 'synthetic' && syntheticAnalytics) {
      return timeframe === '24h'
        ? syntheticAnalytics.hourlyPatterns.map((d) => ({
            label: d.timeLabel,
            uber: d.uber ?? undefined,
            ola: d.ola ?? undefined,
            rapido: d.rapido ?? undefined,
            blusmart: d.blusmart ?? undefined,
            namma_yatri: d.namma_yatri ?? undefined,
            meru: d.meru ?? undefined,
            goamiles: d.goamiles ?? undefined,
            averageFare: d.averageFare,
          }))
        : syntheticAnalytics.dailyTrend.map((d) => ({
            label: d.dayLabel,
            uber: d.uber ?? undefined,
            ola: d.ola ?? undefined,
            rapido: d.rapido ?? undefined,
            blusmart: d.blusmart ?? undefined,
            namma_yatri: d.namma_yatri ?? undefined,
            meru: d.meru ?? undefined,
            goamiles: d.goamiles ?? undefined,
            averageFare: d.averageFare,
          }));
    }

    return timeframe === '24h'
      ? history24h.map((d) => ({
          label: d.timeLabel,
          uber: d.uber ?? undefined,
          ola: d.ola ?? undefined,
          rapido: d.rapido ?? undefined,
          blusmart: d.blusmart ?? undefined,
          namma_yatri: d.namma_yatri ?? undefined,
          meru: d.meru ?? undefined,
          goamiles: d.goamiles ?? undefined,
          averageFare: computeAvg([d.uber, d.ola, d.rapido, d.blusmart, d.namma_yatri, d.meru, d.goamiles]),
        }))
      : history7d.map((d) => ({
          label: d.dayLabel,
          uber: d.uber ?? undefined,
          ola: d.ola ?? undefined,
          rapido: d.rapido ?? undefined,
          blusmart: d.blusmart ?? undefined,
          namma_yatri: d.namma_yatri ?? undefined,
          meru: d.meru ?? undefined,
          goamiles: d.goamiles ?? undefined,
          averageFare: d.averageFare,
        }));
  }, [dataSourceScope, syntheticAnalytics, timeframe, history24h, history7d]);

  const activeSeriesConfig = useMemo(() => {
    const hasNumericData = (key: string) =>
      chartData.some((row) => typeof row[key as keyof typeof row] === 'number');

    if (dataSourceScope === 'route' && supportedPlatforms && supportedPlatforms.length > 0) {
      const supportedSet = new Set(supportedPlatforms.map((p) => p.id));
      return SERIES_CONFIG.filter((s) => supportedSet.has(s.key) || hasNumericData(s.key));
    }

    const withData = SERIES_CONFIG.filter((s) => hasNumericData(s.key));
    return withData.length > 0
      ? withData
      : SERIES_CONFIG.filter((s) => s.key !== 'namma_yatri');
  }, [dataSourceScope, supportedPlatforms, chartData]);

  const handleDownloadCsv = () => {
    if (chartData.length === 0) return;

    const lines: string[] = [];
    lines.push(buildCsvRow(['CabFare AI - Fare History & Prediction Export (Estimated / Synthetic Data)']));
    lines.push(buildCsvRow(['Exported At', new Date().toISOString()]));
    lines.push(buildCsvRow(['City', cityName ?? 'Selected Route City']));
    lines.push(buildCsvRow(['Route', `${pickupName} -> ${dropName}`]));
    lines.push(buildCsvRow(['Dataset Scope', dataSourceScope === 'route' ? 'Active Route Modeled Curve' : 'Synthetic Historical Dataset']));
    lines.push(buildCsvRow(['Timeframe', timeframe === '24h' ? 'Hourly Fare Changes (24h)' : '7-Day Daily Averages']));
    lines.push('');

    lines.push(
      buildCsvRow([
        timeframe === '24h' ? 'Time Slot' : 'Day',
        ...activeSeriesConfig.map((s) => `${s.name} (INR)`),
        'Historical Average (INR)',
      ])
    );

    for (const row of chartData) {
      lines.push(
        buildCsvRow([
          row.label,
          ...activeSeriesConfig.map((s) => {
            const val = row[s.key as keyof typeof row];
            return typeof val === 'number' ? val : '';
          }),
          row.averageFare,
        ])
      );
    }

    if (predictions.length > 0) {
      lines.push('');
      lines.push(buildCsvRow(['Short-Horizon Fare Trend Forecast (Estimated)']));
      lines.push(buildCsvRow(['Horizon', 'Expected Fare (INR)', 'Low Estimate (INR)', 'High Estimate (INR)', 'Surge Probability (%)', 'Direction']));
      for (const p of predictions) {
        lines.push(
          buildCsvRow([
            p.offsetLabel,
            p.expectedFare,
            p.lowEstimate,
            p.highEstimate,
            p.surgeProbability,
            p.trendDirection,
          ])
        );
      }
    }

    const csvContent = `\uFEFF${lines.join('\r\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const safeCity = (cityName ?? 'route').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cabfare-history-${safeCity}-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    setCsvDownloaded(true);
    window.setTimeout(() => setCsvDownloaded(false), 2500);
  };

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
        {predictions.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-600">
            Short-horizon fare predictions are unavailable because no supported app-based cab providers operate in this region.
          </div>
        ) : (
        <>
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
        </>
        )}

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

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={chartData.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 whitespace-nowrap"
            >
              {csvDownloaded ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span className="text-emerald-700">CSV Downloaded</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  <span>Download CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Platform Filter Toggles + Historical Average Toggle */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeSeriesConfig.map((s) => {
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
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-xs text-slate-600">
              No provider price history curve is available for this location because no app-based aggregators operate here. Switch to Synthetic Dataset above to inspect reference metro patterns.
            </div>
          ) : (
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
              {activeSeriesConfig.map(
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
          )}
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
