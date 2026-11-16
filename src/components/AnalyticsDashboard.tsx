import { Check, Database, Download, Filter, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchAnalyticsData } from '../services/api';
import {
  AnalyticsFilters,
  AnalyticsSummaryResponse,
  FareComparisonResponse,
  PlatformId,
  VehicleCategory,
} from '../types/cabfare';

interface AnalyticsDashboardProps {
  comparison: FareComparisonResponse;
}

const PROVIDER_COLORS: Record<string, string> = {
  uber: '#1E293B',
  ola: '#2563EB',
  rapido: '#0284C7',
  blusmart: '#16A34A',
  namma_yatri: '#059669',
};

const PERIOD_COLORS: Record<'Peak' | 'Moderate' | 'Off-Peak', string> = {
  Peak: '#D97706',
  Moderate: '#2563EB',
  'Off-Peak': '#16A34A',
};

const INITIAL_FILTERS: AnalyticsFilters = {
  date: 'all',
  platformId: 'all',
  vehicleCategory: 'all',
  pickupLocation: 'all',
  destination: 'all',
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

function buildAnalyticsCsvReport(
  analytics: AnalyticsSummaryResponse,
  filters: AnalyticsFilters
): string {
  const lines: string[] = [];

  lines.push(buildCsvRow(['CabFare AI - Business Analytics Report (Synthetic Dataset)']));
  lines.push(buildCsvRow(['Generated At', new Date().toISOString()]));
  lines.push(buildCsvRow(['Data Disclosure', analytics.datasetNotice]));
  lines.push('');

  lines.push(buildCsvRow(['Applied Filters']));
  lines.push(buildCsvRow(['Date', filters.date === 'all' ? 'All Dates (Last 7 Days)' : filters.date]));
  lines.push(buildCsvRow(['Platform', filters.platformId === 'all' ? 'All Platforms' : filters.platformId]));
  lines.push(buildCsvRow(['Vehicle Category', filters.vehicleCategory === 'all' ? 'All Vehicle Categories' : filters.vehicleCategory]));
  lines.push(buildCsvRow(['Pickup Location', filters.pickupLocation === 'all' ? 'All Pickup Locations' : filters.pickupLocation]));
  lines.push(buildCsvRow(['Destination', filters.destination === 'all' ? 'All Destinations' : filters.destination]));
  lines.push(buildCsvRow(['Matching Records', `${analytics.filteredRecordCount} of ${analytics.totalDatasetRecords}`]));
  lines.push('');

  lines.push(buildCsvRow(['Executive KPIs']));
  lines.push(buildCsvRow(['Metric', 'Value', 'Details']));
  lines.push(buildCsvRow(['Average Cab Fare (INR)', analytics.kpis.averageFare, `Mean across ${analytics.filteredRecordCount} synthetic records`]));
  lines.push(buildCsvRow(['Cheapest Platform', analytics.kpis.cheapestPlatform, `Avg ₹${analytics.kpis.cheapestPlatformAvgFare}`]));
  lines.push(buildCsvRow(['Highest Platform', analytics.kpis.highestPlatform, `Avg ₹${analytics.kpis.highestPlatformAvgFare} (Peak ₹${analytics.kpis.highestRecordedFare})`]));
  lines.push(buildCsvRow(['Estimated Customer Savings (INR)', analytics.kpis.estimatedCustomerSavings, `${analytics.kpis.savingsPercent}% spread between highest & cheapest`]));
  lines.push('');

  lines.push(buildCsvRow(['Average Fare by Platform']));
  lines.push(buildCsvRow(['Platform', 'Average Fare (INR)', 'Min Fare (INR)', 'Max Fare (INR)', 'Avg Surge Multiplier', 'Record Count']));
  for (const row of analytics.averageFareByPlatform) {
    lines.push(
      buildCsvRow([
        row.platformName,
        row.averageFare,
        row.minFare,
        row.maxFare,
        row.avgSurge,
        row.recordCount,
      ])
    );
  }
  lines.push('');

  lines.push(buildCsvRow(['Peak-Demand Periods']));
  lines.push(buildCsvRow(['Period Label', 'Time Range', 'Period Type', 'Average Fare (INR)', 'Avg Surge Multiplier', 'Record Count']));
  for (const p of analytics.peakDemandPeriods) {
    lines.push(
      buildCsvRow([
        p.periodLabel,
        p.timeRange,
        p.periodType,
        p.averageFare,
        p.avgSurge,
        p.recordCount,
      ])
    );
  }
  lines.push('');

  lines.push(buildCsvRow(['Hourly Average Fare Trajectory']));
  lines.push(buildCsvRow(['Time Slot', 'Period Type', 'Average Fare (INR)', 'Uber', 'Ola', 'Rapido', 'BluSmart', 'Namma Yatri']));
  for (const h of analytics.hourlyPatterns) {
    lines.push(
      buildCsvRow([
        h.timeLabel,
        h.periodType,
        h.averageFare,
        h.uber ?? '',
        h.ola ?? '',
        h.rapido ?? '',
        h.blusmart ?? '',
        h.namma_yatri ?? '',
      ])
    );
  }
  lines.push('');

  lines.push(buildCsvRow(['Sample Synthetic Historical Fare Records']));
  lines.push(buildCsvRow(['ID', 'Date', 'Time', 'Platform', 'Vehicle Type', 'Category', 'Pickup Location', 'Destination', 'Distance (km)', 'Duration (min)', 'Period', 'Surge Multiplier', 'Fare (INR)', 'Is Synthetic']));
  for (const r of analytics.sampleRecords) {
    lines.push(
      buildCsvRow([
        r.id,
        r.date,
        r.timeOfDay,
        r.platformName,
        r.vehicleType,
        r.vehicleCategory,
        r.pickupLocation,
        r.destination,
        r.distanceKm,
        r.durationMin,
        r.periodType,
        r.surgeMultiplier,
        r.fare,
        r.isSynthetic ? 'Yes' : 'No',
      ])
    );
  }

  return `\uFEFF${lines.join('\r\n')}`;
}

export function AnalyticsDashboard({ comparison }: AnalyticsDashboardProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>(INITIAL_FILTERS);
  const [analytics, setAnalytics] = useState<AnalyticsSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    fetchAnalyticsData(filters)
      .then((res) => {
        if (active) setAnalytics(res);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Unable to load synthetic analytics dataset.'
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  const hasActiveFilters =
    filters.date !== 'all' ||
    filters.platformId !== 'all' ||
    filters.vehicleCategory !== 'all' ||
    filters.pickupLocation !== 'all' ||
    filters.destination !== 'all';

  const activePickupInDataset = analytics?.filterOptions.pickupLocations.includes(
    comparison.route.pickup.name
  );
  const activeDropInDataset = analytics?.filterOptions.destinations.includes(
    comparison.route.drop.name
  );

  const handleMatchActiveRoute = () => {
    setFilters((prev) => ({
      ...prev,
      pickupLocation: activePickupInDataset ? comparison.route.pickup.name : 'all',
      destination: activeDropInDataset ? comparison.route.drop.name : 'all',
    }));
  };

  const handleExportCsv = () => {
    if (!analytics || analytics.filteredRecordCount === 0) return;
    const csvContent = buildAnalyticsCsvReport(analytics, filters);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStamp = filters.date !== 'all' ? filters.date : new Date().toISOString().slice(0, 10);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cabfare-analytics-report-${dateStamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    window.setTimeout(() => setExportSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Business &amp; Fare Analytics Dashboard
          </h2>
          <p className="text-sm text-slate-600">
            Aggregated metrics computed directly from CabFare AI&apos;s structured synthetic historical dataset.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-medium text-blue-800 tabular-nums">
            <Database className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {analytics
                ? `Synthetic Dataset · ${analytics.filteredRecordCount.toLocaleString()} of ${analytics.totalDatasetRecords.toLocaleString()} records`
                : 'Loading synthetic dataset...'}
            </span>
          </span>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!analytics || isLoading || analytics.filteredRecordCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 whitespace-nowrap"
          >
            {exportSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span className="text-emerald-700">CSV Exported</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>Export CSV Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* FEATURE 6: Multi-Filter Bar */}
      <section
        aria-label="Analytics Filters"
        className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Filter className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            <span>Filter Synthetic Historical Dataset</span>
          </div>
          <div className="flex items-center gap-2">
            {(activePickupInDataset || activeDropInDataset) && (
              <button
                type="button"
                onClick={handleMatchActiveRoute}
                className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 whitespace-nowrap"
              >
                Match Active Route
              </button>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setFilters(INITIAL_FILTERS)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Date filter */}
          <div>
            <label htmlFor="filter-date" className="mb-1 block text-[11px] font-medium text-slate-600">
              Date
            </label>
            <select
              id="filter-date"
              value={filters.date}
              onChange={(e) => setFilters((p) => ({ ...p, date: e.target.value }))}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">All Dates (Last 7 Days)</option>
              {(analytics?.filterOptions.dates ?? []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Platform filter */}
          <div>
            <label htmlFor="filter-platform" className="mb-1 block text-[11px] font-medium text-slate-600">
              Platform
            </label>
            <select
              id="filter-platform"
              value={filters.platformId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, platformId: e.target.value as 'all' | PlatformId }))
              }
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">All Platforms</option>
              {(analytics?.filterOptions.platforms ?? []).map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle category filter */}
          <div>
            <label htmlFor="filter-category" className="mb-1 block text-[11px] font-medium text-slate-600">
              Vehicle Category
            </label>
            <select
              id="filter-category"
              value={filters.vehicleCategory}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  vehicleCategory: e.target.value as 'all' | VehicleCategory,
                }))
              }
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">All Vehicle Categories</option>
              {(analytics?.filterOptions.vehicleCategories ?? []).map((vc) => (
                <option key={vc.id} value={vc.id}>
                  {vc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pickup location filter */}
          <div>
            <label htmlFor="filter-pickup" className="mb-1 block text-[11px] font-medium text-slate-600">
              Pickup Location
            </label>
            <select
              id="filter-pickup"
              value={filters.pickupLocation}
              onChange={(e) => setFilters((p) => ({ ...p, pickupLocation: e.target.value }))}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">All Pickup Locations</option>
              {(analytics?.filterOptions.pickupLocations ?? []).map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Destination filter */}
          <div>
            <label htmlFor="filter-destination" className="mb-1 block text-[11px] font-medium text-slate-600">
              Destination
            </label>
            <select
              id="filter-destination"
              value={filters.destination}
              onChange={(e) => setFilters((p) => ({ ...p, destination: e.target.value }))}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">All Destinations</option>
              {(analytics?.filterOptions.destinations ?? []).map((dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && !analytics ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
          <div className="h-72 rounded-xl border border-slate-200 bg-white" />
        </div>
      ) : analytics && analytics.filteredRecordCount === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No synthetic historical records match this filter combination.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            For instance, not all platforms operate every vehicle category or corridor in the synthetic dataset.
          </p>
          <button
            type="button"
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Reset All Filters
          </button>
        </div>
      ) : analytics ? (
        <>
          {/* FEATURE 5: 4 KPI Strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-xs font-medium text-slate-500">Average Cab Fare</span>
              <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                ₹{analytics.kpis.averageFare}
              </div>
              <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
                Mean across {analytics.filteredRecordCount.toLocaleString()} synthetic records
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-xs font-medium text-slate-500">Cheapest Platform</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-display text-2xl font-bold text-emerald-700">
                  {analytics.kpis.cheapestPlatform}
                </span>
                <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  ₹{analytics.kpis.cheapestPlatformAvgFare}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Lowest average fare in filtered subset
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-xs font-medium text-slate-500">Highest Platform Fare</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  ₹{analytics.kpis.highestPlatformAvgFare}
                </span>
                <span className="text-xs font-medium text-slate-600">
                  {analytics.kpis.highestPlatform}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
                Peak recorded fare in subset: ₹{analytics.kpis.highestRecordedFare}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-xs font-medium text-slate-500">Estimated Customer Savings</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-blue-600 tabular-nums">
                  ₹{analytics.kpis.estimatedCustomerSavings}
                </span>
                <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                  {analytics.kpis.savingsPercent}% saved
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Avg spread between highest &amp; cheapest platform
              </p>
            </div>
          </div>

          {/* Charts Row: Average Fare by Platform & Peak-Demand Periods */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h3 className="font-display text-base font-bold text-slate-900">
                Average Fare by Platform (Synthetic Dataset)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Calculated mean INR fare per provider across filtered historical trips
              </p>

              <div className="mt-4 h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.averageFareByPlatform}
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
                      formatter={(value) => [`₹${value ?? 0}`, 'Average Fare']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="averageFare" radius={[6, 6, 0, 0]} maxBarSize={52}>
                      {analytics.averageFareByPlatform.map((entry) => (
                        <Cell
                          key={entry.platformId}
                          fill={PROVIDER_COLORS[entry.platformId] || '#2563EB'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h3 className="font-display text-base font-bold text-slate-900">
                Peak-Demand Periods Analysis
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Average fare &amp; surge uplift across morning rush, evening surge, and off-peak windows
              </p>

              <div className="mt-4 h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.peakDemandPeriods}
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
                      formatter={(value) => [`₹${value ?? 0}`, 'Avg Period Fare']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="averageFare" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {analytics.peakDemandPeriods.map((entry) => (
                        <Cell
                          key={entry.periodLabel}
                          fill={PERIOD_COLORS[entry.periodType]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Hourly Historical Average Trajectory */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Hourly Average Fare Trajectory (Filtered Synthetic Data)
                </h3>
                <p className="text-xs text-slate-500">
                  Shows how morning (08:30) and evening (19:00) peaks shift average fares relative to off-peak hours
                </p>
              </div>
              <span className="text-xs text-slate-500">
                Synthetic dataset · {analytics.datasetNotice.split(':')[0]}
              </span>
            </div>

            <div className="mt-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.hourlyPatterns}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="analyticsAvgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
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
                    formatter={(value) => [`₹${value ?? 0}`, 'Hourly Avg Fare']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="averageFare"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fill="url(#analyticsAvgGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platform Breakdown Table + Synthetic Historical Sample Records */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5">
              <h3 className="font-display text-base font-bold text-slate-900">
                Platform Summary Matrix
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Aggregated stats from filtered synthetic records
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 font-medium">Platform</th>
                      <th className="py-2 text-right font-medium">Avg Fare</th>
                      <th className="py-2 text-right font-medium">Min–Max</th>
                      <th className="py-2 text-right font-medium">Avg Surge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums font-mono">
                    {analytics.averageFareByPlatform.map((row) => (
                      <tr key={row.platformId}>
                        <td className="py-2.5 font-sans font-semibold text-slate-900">
                          {row.platformName}
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900">
                          ₹{row.averageFare}
                        </td>
                        <td className="py-2.5 text-right text-slate-600">
                          ₹{row.minFare}–₹{row.maxFare}
                        </td>
                        <td className="py-2.5 text-right text-slate-700">{row.avgSurge}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Synthetic Historical Fare Records (Sample)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {analytics.datasetNotice}
                  </p>
                </div>
              </div>
              <div className="mt-4 max-h-[300px] overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-2 font-medium">Date &amp; Time</th>
                      <th className="py-2 pr-2 font-medium">Platform / Vehicle</th>
                      <th className="py-2 pr-2 font-medium">Route</th>
                      <th className="py-2 pr-2 text-right font-medium">Dist / Dur</th>
                      <th className="py-2 pr-2 text-right font-medium">Period</th>
                      <th className="py-2 text-right font-semibold text-slate-900">Fare</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {analytics.sampleRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70">
                        <td className="py-2 pr-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {rec.date} {rec.timeOfDay}
                        </td>
                        <td className="py-2 pr-2">
                          <span className="font-semibold text-slate-900">{rec.platformName}</span>
                          <span className="block text-[11px] text-slate-500">{rec.vehicleType}</span>
                        </td>
                        <td className="py-2 pr-2 text-[11px] text-slate-600">
                          {rec.pickupLocation} → {rec.destination}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {rec.distanceKm}km · {rec.durationMin}m
                        </td>
                        <td className="py-2 pr-2 text-right whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold ${
                              rec.periodType === 'Peak'
                                ? 'text-amber-700'
                                : rec.periodType === 'Moderate'
                                  ? 'text-blue-700'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {rec.periodType}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₹{rec.fare}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
