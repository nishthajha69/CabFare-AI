import {
  ArrowRight,
  Bell,
  BellPlus,
  CheckCircle2,
  Edit3,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertNotification,
  AlertWorkflowSummary,
  FareAlert,
  FareComparisonResponse,
  LocationPoint,
  PlatformId,
  VehicleCategory,
} from '../types/cabfare';
import {
  doesRouteMatchComparison,
  findMatchingCandidates,
  PLATFORM_LABELS,
  VEHICLE_CATEGORY_LABELS,
} from '../utils/fareAlertWorkflow';

export interface AlertFormPayload {
  pickup: LocationPoint;
  drop: LocationPoint;
  targetFare: number;
  preferredPlatform: 'any' | PlatformId;
  vehicleCategory: 'any' | VehicleCategory;
}

interface FareAlertsPanelProps {
  comparison: FareComparisonResponse;
  popularLocations: LocationPoint[];
  targetFare: number | undefined;
  onChangeTargetFare: (val: number | undefined) => void;
  alerts: FareAlert[];
  notifications: AlertNotification[];
  workflowSummary: AlertWorkflowSummary | null;
  soundEnabled: boolean;
  isCheckingAll: boolean;
  onToggleSound: () => void;
  onAddAlert: (payload: AlertFormPayload) => void;
  onUpdateAlert: (id: string, payload: AlertFormPayload) => void;
  onDeleteAlert: (id: string) => void;
  onTogglePauseAlert: (id: string) => void;
  onDismissNotification: (id: string) => void;
  onClearNotifications: () => void;
  onCheckAllAlerts: () => void;
  onLoadAlertRoute: (pickup: LocationPoint, drop: LocationPoint) => void;
}

const CATEGORY_OPTIONS: Array<{ id: 'any' | VehicleCategory; label: string }> = [
  { id: 'any', label: 'Any Vehicle Category' },
  { id: 'bike', label: 'Bike' },
  { id: 'auto', label: 'Auto' },
  { id: 'hatchback', label: 'Hatchback' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'suv', label: 'SUV' },
  { id: 'ev', label: 'Electric Vehicle' },
];

export function FareAlertsPanel({
  comparison,
  popularLocations,
  targetFare,
  onChangeTargetFare,
  alerts,
  notifications,
  workflowSummary,
  soundEnabled,
  isCheckingAll,
  onToggleSound,
  onAddAlert,
  onUpdateAlert,
  onDeleteAlert,
  onTogglePauseAlert,
  onDismissNotification,
  onClearNotifications,
  onCheckAllAlerts,
  onLoadAlertRoute,
}: FareAlertsPanelProps) {
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [inputBudget, setInputBudget] = useState<string>(
    targetFare ? String(targetFare) : String(Math.round(comparison.summary.cheapestCabFare * 0.95))
  );
  const [preferredPlatform, setPreferredPlatform] = useState<'any' | PlatformId>('any');
  const [vehicleCategory, setVehicleCategory] = useState<'any' | VehicleCategory>('any');
  const [selectedPickupId, setSelectedPickupId] = useState<string>(comparison.route.pickup.id);
  const [selectedDropId, setSelectedDropId] = useState<string>(comparison.route.drop.id);
  const [formError, setFormError] = useState<string | null>(null);

  const platformOptions = useMemo<Array<{ id: 'any' | PlatformId; label: string }>>(() => {
    const supported = comparison.supportedPlatforms ?? [];
    if (supported.length === 0) {
      return [
        { id: 'any', label: 'Any Platform (Best Fare)' },
        { id: 'uber', label: 'Uber' },
        { id: 'ola', label: 'Ola' },
        { id: 'rapido', label: 'Rapido' },
      ];
    }
    return [
      { id: 'any', label: 'Any Platform (Best Fare)' },
      ...supported.map((p) => ({ id: p.id, label: p.name })),
    ];
  }, [comparison.supportedPlatforms]);

  // Sync form pickup/drop and platform to active route when not actively editing a saved alert
  useEffect(() => {
    if (!editingAlertId) {
      setSelectedPickupId(comparison.route.pickup.id);
      setSelectedDropId(comparison.route.drop.id);
      if (
        preferredPlatform !== 'any' &&
        !platformOptions.some((p) => p.id === preferredPlatform)
      ) {
        setPreferredPlatform('any');
      }
    }
  }, [
    comparison.route.pickup.id,
    comparison.route.drop.id,
    editingAlertId,
    preferredPlatform,
    platformOptions,
  ]);

  const locationChoices = useMemo(() => {
    const map = new Map<string, LocationPoint>();
    map.set(comparison.route.pickup.id, comparison.route.pickup);
    map.set(comparison.route.drop.id, comparison.route.drop);
    for (const loc of popularLocations) {
      if (!map.has(loc.id)) map.set(loc.id, loc);
    }
    for (const a of alerts) {
      if (a.pickup && !map.has(a.pickup.id)) map.set(a.pickup.id, a.pickup);
      if (a.drop && !map.has(a.drop.id)) map.set(a.drop.id, a.drop);
    }
    return Array.from(map.values());
  }, [comparison.route.pickup, comparison.route.drop, popularLocations, alerts]);

  const parsedBudget = Number(inputBudget);
  const isValidBudget = Number.isFinite(parsedBudget) && parsedBudget > 0;

  // Live check against active route's real comparison data
  const matchingActiveFares = useMemo(
    () => findMatchingCandidates(comparison, preferredPlatform, vehicleCategory),
    [comparison, preferredPlatform, vehicleCategory]
  );

  const bestActiveCandidate = matchingActiveFares[0] ?? null;
  const isCurrentSelectionMet = Boolean(
    isValidBudget && bestActiveCandidate && bestActiveCandidate.estimatedFare <= parsedBudget
  );

  // Dashboard KPI metrics calculated strictly from actual alerts & latest estimates
  const dashboardStats = useMemo(() => {
    const activeAlerts = alerts.filter((a) => !a.isPaused);
    const triggeredAlerts = activeAlerts.filter((a) => a.status === 'triggered');
    const routeMatchingActive = activeAlerts.find((a) =>
      doesRouteMatchComparison(a, comparison)
    );

    const referenceTarget =
      routeMatchingActive?.targetFare ??
      activeAlerts[0]?.targetFare ??
      (isValidBudget ? parsedBudget : comparison.summary.cheapestCabFare);

    const latestEstimate =
      (routeMatchingActive && typeof routeMatchingActive.latestEstimatedFare === 'number'
        ? routeMatchingActive.latestEstimatedFare
        : activeAlerts.find((a) => typeof a.latestEstimatedFare === 'number')
            ?.latestEstimatedFare) ??
      bestActiveCandidate?.estimatedFare ??
      comparison.summary.cheapestFare;

    const totalPotentialSavings = triggeredAlerts.reduce(
      (acc, a) => acc + (a.potentialSavings ?? 0),
      0
    );
    const previewSavings = isCurrentSelectionMet && bestActiveCandidate
      ? Math.max(0, parsedBudget - bestActiveCandidate.estimatedFare)
      : 0;

    return {
      activeCount: activeAlerts.length,
      triggeredCount: triggeredAlerts.length,
      targetDisplay: referenceTarget,
      latestDisplay: latestEstimate,
      potentialSavingsDisplay:
        triggeredAlerts.length > 0 ? totalPotentialSavings : previewSavings,
    };
  }, [
    alerts,
    comparison,
    isValidBudget,
    parsedBudget,
    bestActiveCandidate,
    isCurrentSelectionMet,
  ]);

  const handleStartEdit = (alert: FareAlert) => {
    setEditingAlertId(alert.id);
    setInputBudget(String(alert.targetFare));
    setPreferredPlatform(alert.preferredPlatform);
    setVehicleCategory(alert.vehicleCategory);
    setSelectedPickupId(alert.pickup.id);
    setSelectedDropId(alert.drop.id);
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setEditingAlertId(null);
    setPreferredPlatform('any');
    setVehicleCategory('any');
    setSelectedPickupId(comparison.route.pickup.id);
    setSelectedDropId(comparison.route.drop.id);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isValidBudget || parsedBudget < 20) {
      setFormError('Please enter a valid target fare (minimum ₹20).');
      return;
    }

    const pickupLoc =
      locationChoices.find((l) => l.id === selectedPickupId) ?? comparison.route.pickup;
    const dropLoc =
      locationChoices.find((l) => l.id === selectedDropId) ?? comparison.route.drop;

    if (pickupLoc.id === dropLoc.id) {
      setFormError('Pickup location and destination must be different.');
      return;
    }

    // Warn if chosen platform doesn't support chosen category on active dataset
    if (preferredPlatform !== 'any' && vehicleCategory !== 'any') {
      const supported = comparison.supportedCategoriesByPlatform[preferredPlatform] ?? [];
      if (!supported.includes(vehicleCategory)) {
        setFormError(
          `${PLATFORM_LABELS[preferredPlatform]} does not support ${VEHICLE_CATEGORY_LABELS[vehicleCategory]} in the configured tariff models. Please select "Any Vehicle Category" or another category.`
        );
        return;
      }
    }

    const payload: AlertFormPayload = {
      pickup: pickupLoc,
      drop: dropLoc,
      targetFare: Math.round(parsedBudget),
      preferredPlatform,
      vehicleCategory,
    };

    onChangeTargetFare(Math.round(parsedBudget));

    if (editingAlertId) {
      onUpdateAlert(editingAlertId, payload);
      setEditingAlertId(null);
    } else {
      onAddAlert(payload);
    }
  };

  return (
    <section
      aria-label="Smart Fare Alerts and Automation"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5"
    >
      {/* Header + Audio & Manual Check Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Smart Fare Alerts &amp; Automation
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Automated target price monitoring using simulated route fare estimates (not live provider feeds).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {alerts.some((a) => !a.isPaused) && (
            <button
              type="button"
              onClick={onCheckAllAlerts}
              disabled={isCheckingAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-blue-600 ${isCheckingAll ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isCheckingAll ? 'Checking...' : 'Evaluate All Alerts'}</span>
            </button>
          )}

          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={onToggleSound}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              soundEnabled
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            )}
            <span>{soundEnabled ? 'Sound Alert: On' : 'Sound Alert: Off'}</span>
          </button>

          {targetFare && (
            <button
              type="button"
              onClick={() => onChangeTargetFare(undefined)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 whitespace-nowrap"
            >
              Clear Budget Filter
            </button>
          )}
        </div>
      </div>

      {/* FEATURE 4: Automation Workflow Strip */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-800 mr-1">Automation Pipeline:</span>
            <span className="rounded bg-white px-2 py-0.5 font-medium text-blue-700 border border-blue-200">
              1. Fare Update (₹{comparison.summary.cheapestFare})
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="rounded bg-white px-2 py-0.5 font-medium text-slate-700 border border-slate-200">
              2. Target Price Check ({workflowSummary?.activeCheckedCount ?? 0} active)
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="rounded bg-white px-2 py-0.5 font-medium text-slate-700 border border-slate-200">
              3. Condition Evaluation
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span
              className={`rounded px-2 py-0.5 font-semibold border ${
                dashboardStats.triggeredCount > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              4. Alert Generation ({dashboardStats.triggeredCount} triggered)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 tabular-nums">
            {workflowSummary
              ? `Simulated monitoring · Checked ${new Date(workflowSummary.lastEvaluatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Simulated monitoring active'}
          </span>
        </div>
      </div>

      {/* FEATURE 5: Alert Dashboard KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
          <span className="text-[11px] font-medium text-slate-500">Active Alerts</span>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
            {dashboardStats.activeCount}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
          <span className="text-[11px] font-medium text-slate-500">Triggered Alerts</span>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
            {dashboardStats.triggeredCount}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
          <span className="text-[11px] font-medium text-slate-500">Target Fare</span>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
            ₹{dashboardStats.targetDisplay}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
          <span className="text-[11px] font-medium text-slate-500">Latest Estimate</span>
          <div className="mt-1 font-mono text-lg font-bold text-blue-700 tabular-nums">
            ₹{dashboardStats.latestDisplay}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-lg border border-slate-200 bg-slate-50/40 p-3">
          <span className="text-[11px] font-medium text-slate-500">Potential Savings</span>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
            ₹{dashboardStats.potentialSavingsDisplay}
          </div>
        </div>
      </div>

      {/* FEATURE 3: Real Triggered Notifications Feed */}
      {notifications.length > 0 && (
        <div
          aria-label="Triggered Fare Notifications"
          className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
              <Bell className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>Triggered Fare Notifications ({notifications.length})</span>
            </div>
            <button
              type="button"
              onClick={onClearNotifications}
              className="text-xs font-medium text-emerald-800 hover:text-emerald-950"
            >
              Clear All
            </button>
          </div>

          <ul className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-white p-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{n.title}</p>
                    <p className="mt-0.5 text-slate-600">{n.message}</p>
                    <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                      {n.pickupName} → {n.dropName} · Target ₹{n.targetFare} · Simulated estimate{' '}
                      <strong className="font-mono text-emerald-700">₹{n.estimatedFare}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDismissNotification(n.id)}
                  aria-label="Dismiss notification"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* FEATURE 1 & 6: Create / Edit Alert Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-800">
            {editingAlertId ? 'Edit Fare Alert Rule' : 'Create Target Fare Alert'}
          </h3>
          {editingAlertId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-3">
            <label htmlFor="alert-pickup-select" className="mb-1 block text-xs font-medium text-slate-700">
              Pickup Location
            </label>
            <select
              id="alert-pickup-select"
              value={selectedPickupId}
              onChange={(e) => setSelectedPickupId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {locationChoices.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="alert-drop-select" className="mb-1 block text-xs font-medium text-slate-700">
              Destination
            </label>
            <select
              id="alert-drop-select"
              value={selectedDropId}
              onChange={(e) => setSelectedDropId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {locationChoices.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="alert-platform-select" className="mb-1 block text-xs font-medium text-slate-700">
              Platform
            </label>
            <select
              id="alert-platform-select"
              value={preferredPlatform}
              onChange={(e) => setPreferredPlatform(e.target.value as 'any' | PlatformId)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {platformOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="alert-category-select" className="mb-1 block text-xs font-medium text-slate-700">
              Vehicle Category
            </label>
            <select
              id="alert-category-select"
              value={vehicleCategory}
              onChange={(e) => setVehicleCategory(e.target.value as 'any' | VehicleCategory)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="target-fare-input" className="mb-1 block text-xs font-medium text-slate-700">
              Max Target Fare (₹)
            </label>
            <input
              id="target-fare-input"
              type="number"
              min={20}
              max={15000}
              value={inputBudget}
              onChange={(e) => {
                setInputBudget(e.target.value);
                const n = Number(e.target.value);
                onChangeTargetFare(Number.isFinite(n) && n > 0 ? n : undefined);
              }}
              placeholder="e.g. 280"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        {formError && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {formError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-600 tabular-nums">
            {bestActiveCandidate && selectedPickupId === comparison.route.pickup.id && selectedDropId === comparison.route.drop.id ? (
              <span>
                Active route match: <strong>{bestActiveCandidate.vehicleType}</strong> is currently{' '}
                <strong className="font-mono text-slate-900">
                  ₹{bestActiveCandidate.estimatedFare}
                </strong>{' '}
                {isValidBudget && (
                  <span
                    className={
                      isCurrentSelectionMet
                        ? 'font-semibold text-emerald-700'
                        : 'font-semibold text-amber-700'
                    }
                  >
                    (
                    {isCurrentSelectionMet
                      ? `₹${parsedBudget - bestActiveCandidate.estimatedFare} within target`
                      : `₹${bestActiveCandidate.estimatedFare - parsedBudget} above target`}
                    )
                  </span>
                )}
              </span>
            ) : (
              <span>
                Alerts are saved persistently and evaluated automatically whenever route estimates update.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValidBudget}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            <BellPlus className="h-4 w-4" aria-hidden="true" />
            <span>{editingAlertId ? 'Save Alert Changes' : 'Create Fare Alert'}</span>
          </button>
        </div>
      </form>

      {/* Immediate Evaluation Banner for Active Form Target */}
      {isValidBudget &&
        bestActiveCandidate &&
        selectedPickupId === comparison.route.pickup.id &&
        selectedDropId === comparison.route.drop.id && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${
              isCurrentSelectionMet
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {isCurrentSelectionMet ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            ) : (
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold">
                {isCurrentSelectionMet
                  ? `Your preferred ride is within budget (${bestActiveCandidate.vehicleType} at ₹${bestActiveCandidate.estimatedFare})`
                  : `Above Target Budget (${bestActiveCandidate.vehicleType} is ₹${bestActiveCandidate.estimatedFare})`}
              </p>
              <p className="mt-0.5 text-xs opacity-90">
                {isCurrentSelectionMet
                  ? `Simulated estimate is ₹${parsedBudget - bestActiveCandidate.estimatedFare} below your ₹${parsedBudget} maximum fare.`
                  : `Simulated estimate exceeds your ₹${parsedBudget} threshold by ₹${bestActiveCandidate.estimatedFare - parsedBudget}. Create an alert above to monitor when fares drop.`}
              </p>
            </div>
          </div>
        )}

      {/* FEATURE 5 & 6: Saved Alerts Dashboard List */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-700">
            Monitored Fare Alerts ({alerts.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            Saved locally · Persists across refresh
          </span>
        </div>

        {alerts.length === 0 ? (
          <p className="mt-2.5 text-xs text-slate-500">
            No saved fare alerts yet. Configure a target fare, platform, and vehicle category above to start automated simulated monitoring.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {alerts.map((alert) => {
              const dropDelta =
                alert.previousEstimatedFare !== undefined &&
                alert.latestEstimatedFare !== undefined &&
                alert.latestEstimatedFare < alert.previousEstimatedFare
                  ? alert.previousEstimatedFare - alert.latestEstimatedFare
                  : 0;

              const statusColor =
                alert.status === 'paused'
                  ? 'border-slate-200 bg-slate-50/70'
                  : alert.status === 'triggered'
                    ? 'border-emerald-200 bg-emerald-50/35'
                    : 'border-slate-200 bg-white';

              const statusLabelColor =
                alert.status === 'paused'
                  ? 'text-slate-500'
                  : alert.status === 'triggered'
                    ? 'text-emerald-700'
                    : 'text-blue-700';

              return (
                <li
                  key={alert.id}
                  className={`flex flex-col gap-3 rounded-lg border p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between ${statusColor}`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-semibold uppercase tracking-wide text-[11px] ${statusLabelColor}`}>
                        {alert.status === 'triggered'
                          ? 'Triggered'
                          : alert.status === 'paused'
                            ? 'Paused'
                            : 'Monitoring'}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {alert.pickupName} → {alert.dropName}
                      </span>
                    </div>

                    <p className="text-slate-600 tabular-nums">
                      {alert.preferredPlatformLabel} · {alert.vehicleCategoryLabel} · Target:{' '}
                      <strong className="font-mono text-slate-900">₹{alert.targetFare}</strong>
                      {alert.latestEstimatedFare !== undefined && (
                        <>
                          {' · '}Latest:{' '}
                          <strong
                            className={`font-mono ${
                              alert.latestEstimatedFare <= alert.targetFare
                                ? 'text-emerald-700'
                                : 'text-slate-900'
                            }`}
                          >
                            ₹{alert.latestEstimatedFare}
                          </strong>
                          {alert.matchedVehicleType ? ` (${alert.matchedVehicleType})` : ''}
                        </>
                      )}
                      {dropDelta > 0 && (
                        <span className="ml-1.5 font-mono font-semibold text-emerald-700">
                          (dropped ₹{dropDelta})
                        </span>
                      )}
                      {(alert.potentialSavings ?? 0) > 0 && alert.status === 'triggered' && (
                        <span className="ml-1.5 font-mono font-semibold text-emerald-700">
                          · Potential savings ₹{alert.potentialSavings}
                        </span>
                      )}
                    </p>

                    {alert.unavailableReason && (
                      <p className="text-[11px] text-amber-700">{alert.unavailableReason}</p>
                    )}

                    {alert.lastCheckedAt && (
                      <p className="text-[11px] text-slate-400 tabular-nums">
                        Last simulated check:{' '}
                        {new Date(alert.lastCheckedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadAlertRoute(alert.pickup, alert.drop)}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Check Route
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePauseAlert(alert.id)}
                      aria-label={alert.isPaused ? 'Resume alert' : 'Pause alert'}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {alert.isPaused ? (
                        <>
                          <Play className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3 text-amber-600" aria-hidden="true" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(alert)}
                      aria-label="Edit alert"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="h-3 w-3 text-blue-600" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAlert(alert.id)}
                      aria-label="Remove alert"
                      className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
