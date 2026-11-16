import { useCallback, useEffect, useRef, useState } from 'react';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { AIRecommendationCard } from './components/AIRecommendationCard';
import { AlternativePickups } from './components/AlternativePickups';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AlertFormPayload, FareAlertsPanel } from './components/FareAlertsPanel';
import { FareComparisonGrid } from './components/FareComparisonGrid';
import { Header, WorkspaceTab } from './components/Header';
import { LocationSearchPanel } from './components/LocationSearchPanel';
import { RouteMap } from './components/RouteMap';
import { TrendsAndPredictions } from './components/TrendsAndPredictions';
import { WaitingTimeAnalysis } from './components/WaitingTimeAnalysis';
import {
  fetchAIRecommendation,
  fetchFareComparison,
  fetchRoutePresets,
} from './services/api';
import {
  AIRecommendation,
  AlertNotification,
  AlertWorkflowSummary,
  AlternativePickup,
  FareAlert,
  FareComparisonResponse,
  FareEstimate,
  LocationPoint,
  RideMode,
  RoutePreset,
  ScenarioMode,
  SurgeAssumptions,
} from './types/cabfare';
import {
  doesRouteMatchComparison,
  evaluateAlertWorkflow,
  loadSavedAlerts,
  loadSavedNotifications,
  loadSoundPreference,
  PLATFORM_LABELS,
  playSubtleChime,
  saveAlertsToStorage,
  saveNotificationsToStorage,
  saveSoundPreference,
  VEHICLE_CATEGORY_LABELS,
} from './utils/fareAlertWorkflow';

const DEFAULT_PICKUP: LocationPoint = {
  id: 'blr-indiranagar',
  name: 'Indiranagar 100 Feet Road',
  area: 'Indiranagar',
  city: 'Bengaluru',
  lat: 12.9784,
  lng: 77.6408,
  zoneType: 'commercial',
};

const DEFAULT_DROP: LocationPoint = {
  id: 'blr-kia',
  name: 'Kempegowda International Airport (BLR)',
  area: 'Devanahalli',
  city: 'Bengaluru',
  lat: 13.1986,
  lng: 77.7066,
  zoneType: 'airport',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('compare');
  const [pickup, setPickup] = useState<LocationPoint>(DEFAULT_PICKUP);
  const [drop, setDrop] = useState<LocationPoint>(DEFAULT_DROP);
  const [scenario, setScenario] = useState<ScenarioMode>('live');
  const [rideMode, setRideMode] = useState<RideMode>('immediate');
  const [surgeAssumptions, setSurgeAssumptions] = useState<SurgeAssumptions>({
    peakSurgeMultiplier: 1.42,
    offPeakMultiplier: 1.0,
  });
  const [presets, setPresets] = useState<RoutePreset[]>([]);
  const [popularLocations, setPopularLocations] = useState<LocationPoint[]>([
    DEFAULT_PICKUP,
    DEFAULT_DROP,
  ]);

  const [comparison, setComparison] = useState<FareComparisonResponse | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(true);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [isRecommending, setIsRecommending] = useState<boolean>(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [highlightedAltId, setHighlightedAltId] = useState<string | null>(null);
  const [targetFare, setTargetFare] = useState<number | undefined>(undefined);
  const [alerts, setAlerts] = useState<FareAlert[]>(() =>
    loadSavedAlerts(DEFAULT_PICKUP, DEFAULT_DROP)
  );
  const [notifications, setNotifications] = useState<AlertNotification[]>(() =>
    loadSavedNotifications()
  );
  const [workflowSummary, setWorkflowSummary] = useState<AlertWorkflowSummary | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => loadSoundPreference());
  const [isCheckingAllAlerts, setIsCheckingAllAlerts] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  const compareSeqRef = useRef(0);
  const aiSeqRef = useRef(0);
  const alertsRef = useRef<FareAlert[]>(alerts);
  const soundEnabledRef = useRef<boolean>(soundEnabled);

  useEffect(() => {
    alertsRef.current = alerts;
    saveAlertsToStorage(alerts);
  }, [alerts]);

  useEffect(() => {
    saveNotificationsToStorage(notifications);
  }, [notifications]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    saveSoundPreference(soundEnabled);
  }, [soundEnabled]);

  const executeAlertWorkflow = useCallback(
    (
      compData: FareComparisonResponse,
      sourceAlerts: FareAlert[] = alertsRef.current,
      forceNotifyIds: Set<string> = new Set()
    ) => {
      const { updatedAlerts, newNotifications, workflowSummary: nextSummary } =
        evaluateAlertWorkflow(sourceAlerts, compData, forceNotifyIds);

      alertsRef.current = updatedAlerts;
      setAlerts(updatedAlerts);
      setWorkflowSummary(nextSummary);

      if (newNotifications.length > 0) {
        setNotifications((prev) => [...newNotifications, ...prev].slice(0, 15));
        if (soundEnabledRef.current) {
          playSubtleChime();
        }
      }
    },
    []
  );

  const runAIRecommendation = useCallback(
    async (data: FareComparisonResponse, budget?: number) => {
      const aiReqId = ++aiSeqRef.current;
      setIsRecommending(true);
      setRecommendError(null);
      try {
        const rec = await fetchAIRecommendation(data, budget);
        if (aiReqId !== aiSeqRef.current) return;
        setRecommendation(rec);
      } catch (err) {
        if (aiReqId !== aiSeqRef.current) return;
        setRecommendError(
          err instanceof Error ? err.message : 'Unable to generate AI recommendation.'
        );
      } finally {
        if (aiReqId === aiSeqRef.current) {
          setIsRecommending(false);
        }
      }
    },
    []
  );

  const runComparison = useCallback(
    async (
      nextPickup: LocationPoint,
      nextDrop: LocationPoint,
      nextScenario: ScenarioMode,
      nextAssumptions: SurgeAssumptions,
      budget?: number,
      nextRideMode: RideMode = 'immediate'
    ) => {
      const compareReqId = ++compareSeqRef.current;
      setIsComparing(true);
      setCompareError(null);
      setRecommendation(null);
      setRecommendError(null);
      try {
        const data = await fetchFareComparison(
          nextPickup,
          nextDrop,
          nextScenario,
          nextAssumptions,
          nextRideMode
        );
        if (compareReqId !== compareSeqRef.current) return;
        setComparison(data);
        setSelectedEstimateId(
          data.platformBenchmarks[0]?.id ?? data.fares[0]?.id ?? null
        );
        executeAlertWorkflow(data);
        void runAIRecommendation(data, budget);
      } catch (err) {
        if (compareReqId !== compareSeqRef.current) return;
        setCompareError(
          err instanceof Error ? err.message : 'Failed to compare fares for this route.'
        );
      } finally {
        if (compareReqId === compareSeqRef.current) {
          setIsComparing(false);
        }
      }
    },
    [runAIRecommendation, executeAlertWorkflow]
  );

  useEffect(() => {
    fetchRoutePresets()
      .then((res) => {
        setPresets(res.presets);
        const merged = new Map<string, LocationPoint>();
        for (const loc of res.popular ?? []) {
          merged.set(loc.id, loc);
        }
        for (const preset of res.presets ?? []) {
          if (!merged.has(preset.pickup.id)) merged.set(preset.pickup.id, preset.pickup);
          if (!merged.has(preset.drop.id)) merged.set(preset.drop.id, preset.drop);
        }
        if (merged.size > 0) {
          setPopularLocations(Array.from(merged.values()));
        }
      })
      .catch(() => setPresets([]));

    void runComparison(
      DEFAULT_PICKUP,
      DEFAULT_DROP,
      'live',
      {
        peakSurgeMultiplier: 1.42,
        offPeakMultiplier: 1.0,
      },
      undefined,
      'immediate'
    );
  }, [runComparison]);

  const handleSwapLocations = () => {
    const nextPickup = drop;
    const nextDrop = pickup;
    setPickup(nextPickup);
    setDrop(nextDrop);
    void runComparison(nextPickup, nextDrop, scenario, surgeAssumptions, targetFare, rideMode);
  };

  const handleScenarioChange = (nextScenario: ScenarioMode) => {
    setScenario(nextScenario);
    void runComparison(pickup, drop, nextScenario, surgeAssumptions, targetFare, rideMode);
  };

  const handleRideModeChange = (nextMode: RideMode) => {
    setRideMode(nextMode);
    void runComparison(pickup, drop, scenario, surgeAssumptions, targetFare, nextMode);
  };

  const handleAssumptionsChange = (nextAssumptions: SurgeAssumptions) => {
    setSurgeAssumptions(nextAssumptions);
    void runComparison(pickup, drop, scenario, nextAssumptions, targetFare, rideMode);
  };

  const handleApplyPreset = (preset: RoutePreset) => {
    setPickup(preset.pickup);
    setDrop(preset.drop);
    void runComparison(preset.pickup, preset.drop, scenario, surgeAssumptions, targetFare, rideMode);
  };

  const handleApplyAlternativePickup = (alt: AlternativePickup) => {
    const newPickup: LocationPoint = {
      id: alt.id,
      name: alt.name,
      area: pickup.area,
      city: pickup.city,
      lat: alt.lat,
      lng: alt.lng,
      zoneType: 'metro',
    };
    setPickup(newPickup);
    setHighlightedAltId(null);
    void runComparison(newPickup, drop, scenario, surgeAssumptions, targetFare, rideMode);
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) playSubtleChime();
      return next;
    });
  };

  const evaluateSingleAlertOffRoute = async (alert: FareAlert) => {
    try {
      const data = await fetchFareComparison(
        alert.pickup,
        alert.drop,
        scenario,
        surgeAssumptions,
        rideMode
      );
      executeAlertWorkflow(data, alertsRef.current, new Set([alert.id]));
    } catch {
      // Ignore transient route check failures
    }
  };

  const handleAddAlert = (payload: AlertFormPayload) => {
    const newAlert: FareAlert = {
      id: `alert-${Date.now()}`,
      pickup: payload.pickup,
      drop: payload.drop,
      pickupName: payload.pickup.name,
      dropName: payload.drop.name,
      targetFare: payload.targetFare,
      preferredPlatform: payload.preferredPlatform,
      preferredPlatformLabel: PLATFORM_LABELS[payload.preferredPlatform],
      vehicleCategory: payload.vehicleCategory,
      vehicleCategoryLabel: VEHICLE_CATEGORY_LABELS[payload.vehicleCategory],
      isPaused: false,
      status: 'monitoring',
      createdAt: new Date().toISOString(),
    };

    const nextAlerts = [newAlert, ...alertsRef.current];
    alertsRef.current = nextAlerts;
    setAlerts(nextAlerts);

    if (comparison && doesRouteMatchComparison(newAlert, comparison)) {
      executeAlertWorkflow(comparison, nextAlerts, new Set([newAlert.id]));
    } else {
      void evaluateSingleAlertOffRoute(newAlert);
    }
  };

  const handleUpdateAlert = (id: string, payload: AlertFormPayload) => {
    let editedAlert: FareAlert | null = null;
    const nextAlerts = alertsRef.current.map((a) => {
      if (a.id !== id) return a;
      editedAlert = {
        ...a,
        pickup: payload.pickup,
        drop: payload.drop,
        pickupName: payload.pickup.name,
        dropName: payload.drop.name,
        targetFare: payload.targetFare,
        preferredPlatform: payload.preferredPlatform,
        preferredPlatformLabel: PLATFORM_LABELS[payload.preferredPlatform],
        vehicleCategory: payload.vehicleCategory,
        vehicleCategoryLabel: VEHICLE_CATEGORY_LABELS[payload.vehicleCategory],
        status: a.isPaused ? 'paused' : 'monitoring',
        triggeredAt: undefined,
        unavailableReason: undefined,
        updatedAt: new Date().toISOString(),
      };
      return editedAlert;
    });

    alertsRef.current = nextAlerts;
    setAlerts(nextAlerts);

    if (editedAlert && !(editedAlert as FareAlert).isPaused) {
      if (comparison && doesRouteMatchComparison(editedAlert, comparison)) {
        executeAlertWorkflow(comparison, nextAlerts, new Set([id]));
      } else {
        void evaluateSingleAlertOffRoute(editedAlert);
      }
    }
  };

  const handleTogglePauseAlert = (id: string) => {
    let resumedAlert: FareAlert | null = null;
    const nextAlerts = alertsRef.current.map((a) => {
      if (a.id !== id) return a;
      const nextPaused = !a.isPaused;
      const updated: FareAlert = {
        ...a,
        isPaused: nextPaused,
        status: nextPaused ? 'paused' : 'monitoring',
        updatedAt: new Date().toISOString(),
      };
      if (!nextPaused) resumedAlert = updated;
      return updated;
    });

    alertsRef.current = nextAlerts;
    setAlerts(nextAlerts);

    if (resumedAlert) {
      if (comparison && doesRouteMatchComparison(resumedAlert, comparison)) {
        executeAlertWorkflow(comparison, nextAlerts, new Set([id]));
      } else {
        void evaluateSingleAlertOffRoute(resumedAlert);
      }
    }
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setNotifications((prev) => prev.filter((n) => n.alertId !== id));
  };

  const handleCheckAllAlerts = async () => {
    const active = alertsRef.current.filter((a) => !a.isPaused);
    if (active.length === 0) return;

    setIsCheckingAllAlerts(true);
    try {
      if (comparison) {
        executeAlertWorkflow(comparison, alertsRef.current);
      }

      const seenRoutes = new Set<string>();
      for (const a of active) {
        if (comparison && doesRouteMatchComparison(a, comparison)) continue;
        const routeKey = `${a.pickup.id}|${a.drop.id}`;
        if (seenRoutes.has(routeKey)) continue;
        seenRoutes.add(routeKey);

        const data = await fetchFareComparison(
          a.pickup,
          a.drop,
          scenario,
          surgeAssumptions,
          rideMode
        );
        executeAlertWorkflow(data, alertsRef.current);
      }
    } finally {
      setIsCheckingAllAlerts(false);
    }
  };

  const handleLoadAlertRoute = (alertPickup: LocationPoint, alertDrop: LocationPoint) => {
    setPickup(alertPickup);
    setDrop(alertDrop);
    setActiveTab('compare');
    void runComparison(alertPickup, alertDrop, scenario, surgeAssumptions, targetFare, rideMode);
  };

  const handleSelectEstimate = (fare: FareEstimate) => {
    setSelectedEstimateId(fare.id);
  };

  const triggeredAlertCount = alerts.filter((a) => !a.isPaused && a.status === 'triggered').length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        triggeredAlertCount={triggeredAlertCount}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Global Route & Scenario Search Bar */}
        <LocationSearchPanel
          pickup={pickup}
          drop={drop}
          scenario={scenario}
          rideMode={rideMode}
          surgeAssumptions={surgeAssumptions}
          presets={presets}
          isLoading={isComparing}
          onChangePickup={(loc) => {
            setPickup(loc);
            void runComparison(loc, drop, scenario, surgeAssumptions, targetFare, rideMode);
          }}
          onChangeDrop={(loc) => {
            setDrop(loc);
            void runComparison(pickup, loc, scenario, surgeAssumptions, targetFare, rideMode);
          }}
          onChangeScenario={handleScenarioChange}
          onChangeRideMode={handleRideModeChange}
          onChangeSurgeAssumptions={handleAssumptionsChange}
          onSwapLocations={handleSwapLocations}
          onCompare={(nextPickup, nextDrop) => {
            setPickup(nextPickup);
            setDrop(nextDrop);
            void runComparison(nextPickup, nextDrop, scenario, surgeAssumptions, targetFare, rideMode);
          }}
          onApplyPreset={handleApplyPreset}
        />

        {compareError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{compareError}</span>
            <button
              type="button"
              onClick={() =>
                void runComparison(
                  pickup,
                  drop,
                  scenario,
                  surgeAssumptions,
                  targetFare,
                  rideMode
                )
              }
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 whitespace-nowrap"
            >
              Retry Comparison
            </button>
          </div>
        )}

        {isComparing && !comparison ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-24 rounded-xl border border-slate-200 bg-white" />
              ))}
            </div>
            <div className="h-80 rounded-xl border border-slate-200 bg-white" />
          </div>
        ) : comparison ? (
          <>
            {activeTab === 'compare' && (
              <div className="space-y-6">
                {/* Summary KPI Strip */}
                <section
                  aria-label="Route Fare Summary"
                  className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                >
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-medium text-slate-500">Cheapest Cab Platform</span>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="font-display text-lg font-bold text-emerald-700">
                        {comparison.summary.cheapestCabPlatform}
                      </span>
                      <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                        ₹{comparison.summary.cheapestCabFare}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Lowest mode: {comparison.summary.cheapestVehicleType} (₹{comparison.summary.cheapestFare})
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-medium text-slate-500">Average Cab Fare</span>
                    <div className="mt-1.5 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      ₹{comparison.summary.averageFare}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                      {comparison.route.roadDistanceKm} km road route · {comparison.route.estimatedDurationMin} min
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-medium text-slate-500">Highest Cab Fare</span>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                        ₹{comparison.summary.highestFare}
                      </span>
                      <span className="text-xs text-slate-500">
                        {comparison.summary.highestPlatform}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {comparison.route.surgeConfig.activePeriod} period assumption
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-medium text-slate-500">Estimated Cab Savings</span>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="font-mono text-lg font-bold text-blue-600 tabular-nums">
                        ₹{comparison.summary.estimatedSavings}
                      </span>
                      <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                        {comparison.summary.savingsPercent}% saved
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Simulated comparison spread
                    </p>
                  </div>
                </section>

                {/* Map + AI Recommendation Split */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
                  <div className="lg:col-span-7">
                    <RouteMap
                      pickup={comparison.route.pickup}
                      drop={comparison.route.drop}
                      distanceKm={comparison.route.roadDistanceKm}
                      distanceSource={comparison.route.distanceSource}
                      routeGeometry={comparison.route.routeGeometry}
                      estimatedDurationMin={comparison.route.estimatedDurationMin}
                      trafficLevel={comparison.route.trafficLevel}
                      alternativePickups={comparison.alternativePickups}
                      highlightedAltId={highlightedAltId}
                    />
                  </div>
                  <div className="flex lg:col-span-5">
                    <div className="flex w-full [&>section]:w-full">
                      <AIRecommendationCard
                        recommendation={recommendation}
                        isLoading={isRecommending}
                        error={recommendError}
                        onRefresh={() => void runAIRecommendation(comparison, targetFare)}
                        onAskAssistant={() => setIsAssistantOpen(true)}
                      />
                    </div>
                  </div>
                </div>

                {/* Multi-Category Platform Comparison Grid */}
                <FareComparisonGrid
                  fares={comparison.fares}
                  simulatedNotice={comparison.simulatedNotice}
                  roadDistanceKm={comparison.route.roadDistanceKm}
                  straightLineKm={comparison.route.straightLineKm}
                  distanceSource={comparison.route.distanceSource}
                  selectedEstimateId={selectedEstimateId}
                  onSelectEstimate={handleSelectEstimate}
                  targetFare={targetFare}
                />

                {/* Waiting-Time Cost Analysis */}
                <WaitingTimeAnalysis
                  fares={comparison.fares}
                  platformBenchmarks={comparison.platformBenchmarks}
                  farePredictions={comparison.farePredictions}
                  predictionMeta={comparison.predictionMeta}
                  summary={comparison.summary}
                />

                {/* Alternative Pickups & Smart Fare Alerts */}
                <AlternativePickups
                  alternatives={comparison.alternativePickups}
                  highlightedAltId={highlightedAltId}
                  onHighlightAlt={setHighlightedAltId}
                  onApplyPickup={handleApplyAlternativePickup}
                />

                <FareAlertsPanel
                  comparison={comparison}
                  popularLocations={popularLocations}
                  targetFare={targetFare}
                  onChangeTargetFare={setTargetFare}
                  alerts={alerts}
                  notifications={notifications}
                  workflowSummary={workflowSummary}
                  soundEnabled={soundEnabled}
                  isCheckingAll={isCheckingAllAlerts}
                  onToggleSound={handleToggleSound}
                  onAddAlert={handleAddAlert}
                  onUpdateAlert={handleUpdateAlert}
                  onDeleteAlert={handleDeleteAlert}
                  onTogglePauseAlert={handleTogglePauseAlert}
                  onDismissNotification={(id) =>
                    setNotifications((prev) => prev.filter((n) => n.id !== id))
                  }
                  onClearNotifications={() => setNotifications([])}
                  onCheckAllAlerts={() => void handleCheckAllAlerts()}
                  onLoadAlertRoute={handleLoadAlertRoute}
                />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <AnalyticsDashboard comparison={comparison} />
                <WaitingTimeAnalysis
                  fares={comparison.fares}
                  platformBenchmarks={comparison.platformBenchmarks}
                  farePredictions={comparison.farePredictions}
                  predictionMeta={comparison.predictionMeta}
                  summary={comparison.summary}
                />
              </div>
            )}

            {activeTab === 'trends' && (
              <TrendsAndPredictions
                history24h={comparison.priceHistory24h}
                history7d={comparison.priceHistory7d}
                predictions={comparison.farePredictions}
                predictionMeta={comparison.predictionMeta}
                routeLabel={`${comparison.route.pickup.area} to ${comparison.route.drop.area}`}
                pickupName={comparison.route.pickup.name}
                dropName={comparison.route.drop.name}
              />
            )}

            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <FareAlertsPanel
                  comparison={comparison}
                  popularLocations={popularLocations}
                  targetFare={targetFare}
                  onChangeTargetFare={setTargetFare}
                  alerts={alerts}
                  notifications={notifications}
                  workflowSummary={workflowSummary}
                  soundEnabled={soundEnabled}
                  isCheckingAll={isCheckingAllAlerts}
                  onToggleSound={handleToggleSound}
                  onAddAlert={handleAddAlert}
                  onUpdateAlert={handleUpdateAlert}
                  onDeleteAlert={handleDeleteAlert}
                  onTogglePauseAlert={handleTogglePauseAlert}
                  onDismissNotification={(id) =>
                    setNotifications((prev) => prev.filter((n) => n.id !== id))
                  }
                  onClearNotifications={() => setNotifications([])}
                  onCheckAllAlerts={() => void handleCheckAllAlerts()}
                  onLoadAlertRoute={handleLoadAlertRoute}
                />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <AlternativePickups
                      alternatives={comparison.alternativePickups}
                      highlightedAltId={highlightedAltId}
                      onHighlightAlt={setHighlightedAltId}
                      onApplyPickup={handleApplyAlternativePickup}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <RouteMap
                      pickup={comparison.route.pickup}
                      drop={comparison.route.drop}
                      distanceKm={comparison.route.roadDistanceKm}
                      distanceSource={comparison.route.distanceSource}
                      routeGeometry={comparison.route.routeGeometry}
                      estimatedDurationMin={comparison.route.estimatedDurationMin}
                      trafficLevel={comparison.route.trafficLevel}
                      alternativePickups={comparison.alternativePickups}
                      highlightedAltId={highlightedAltId}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            CabFare AI · Simulated fare &amp; availability estimates modeled from road route distances and platform tariffs — not live provider APIs.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className="hover:text-slate-800"
            >
              Business Analytics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className="hover:text-slate-800"
            >
              Price History
            </button>
            <button
              type="button"
              onClick={() => setIsAssistantOpen(true)}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Ride Assistant
            </button>
          </div>
        </div>
      </footer>

      <AIAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        comparison={comparison}
        recommendation={recommendation}
        targetFare={targetFare}
      />
    </div>
  );
}
