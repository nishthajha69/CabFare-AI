import {
  AlertNotification,
  AlertWorkflowSummary,
  FareAlert,
  FareComparisonResponse,
  FareEstimate,
  LocationPoint,
  PlatformId,
  VehicleCategory,
} from '../types/cabfare';

export const ALERTS_STORAGE_KEY = 'cabfare_saved_alerts_v2';
export const NOTIFICATIONS_STORAGE_KEY = 'cabfare_alert_notifications_v1';
export const SOUND_PREF_KEY = 'cabfare_sound_alert_enabled';

export const PLATFORM_LABELS: Record<'any' | PlatformId, string> = {
  any: 'Any Platform',
  uber: 'Uber',
  ola: 'Ola',
  rapido: 'Rapido',
  blusmart: 'BluSmart',
  namma_yatri: 'Namma Yatri',
  meru: 'Meru Cabs',
  goamiles: 'GoaMiles',
};

export const VEHICLE_CATEGORY_LABELS: Record<'any' | VehicleCategory, string> = {
  any: 'Any Category',
  bike: 'Bike',
  auto: 'Auto',
  hatchback: 'Hatchback',
  sedan: 'Sedan',
  suv: 'SUV',
  ev: 'Electric Vehicle',
};

export function playSubtleChime() {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, start: 0, duration: 0.16 }, // C5
      { freq: 659.25, start: 0.11, duration: 0.24 }, // E5
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.linearRampToValueAtTime(0.07, now + note.start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.02);
    }

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore audio context restrictions gracefully
  }
}

export function doesRouteMatchComparison(
  alert: Pick<FareAlert, 'pickup' | 'drop' | 'pickupName' | 'dropName'>,
  comparison: FareComparisonResponse
): boolean {
  const compPickup = comparison.route.pickup;
  const compDrop = comparison.route.drop;

  if (
    alert.pickup &&
    alert.drop &&
    Number.isFinite(alert.pickup.lat) &&
    Number.isFinite(alert.drop.lat)
  ) {
    const pickupClose =
      Math.abs(alert.pickup.lat - compPickup.lat) < 0.002 &&
      Math.abs(alert.pickup.lng - compPickup.lng) < 0.002;
    const dropClose =
      Math.abs(alert.drop.lat - compDrop.lat) < 0.002 &&
      Math.abs(alert.drop.lng - compDrop.lng) < 0.002;
    if (pickupClose && dropClose) return true;
  }

  return (
    alert.pickupName.toLowerCase() === compPickup.name.toLowerCase() &&
    alert.dropName.toLowerCase() === compDrop.name.toLowerCase()
  );
}

export function findMatchingCandidates(
  comparison: FareComparisonResponse,
  preferredPlatform: 'any' | PlatformId,
  vehicleCategory: 'any' | VehicleCategory
): FareEstimate[] {
  return comparison.fares
    .filter((f) => {
      const platOk = preferredPlatform === 'any' || f.platformId === preferredPlatform;
      const catOk = vehicleCategory === 'any' || f.category === vehicleCategory;
      return platOk && catOk;
    })
    .sort((a, b) => a.estimatedFare - b.estimatedFare);
}

export interface WorkflowEvaluationResult {
  updatedAlerts: FareAlert[];
  newNotifications: AlertNotification[];
  workflowSummary: AlertWorkflowSummary;
}

/**
 * 4-Stage Automated Fare Alert Workflow:
 * 1. Fare Update -> 2. Target Price Check -> 3. Condition Evaluation -> 4. Alert Generation
 */
export function evaluateAlertWorkflow(
  alerts: FareAlert[],
  comparison: FareComparisonResponse,
  forceNotifyAlertIds: Set<string> = new Set()
): WorkflowEvaluationResult {
  const nowIso = new Date().toISOString();
  const newNotifications: AlertNotification[] = [];
  let activeCheckedCount = 0;
  let matchedCount = 0;
  let triggeredCount = 0;

  const updatedAlerts = alerts.map((alert) => {
    if (alert.isPaused) {
      return {
        ...alert,
        status: 'paused' as const,
      };
    }

    // Stage 1 & 2: Check if the incoming Fare Update matches this alert's route
    if (!doesRouteMatchComparison(alert, comparison)) {
      if (alert.status === 'triggered') {
        triggeredCount += 1;
      }
      return alert;
    }

    activeCheckedCount += 1;
    const candidates = findMatchingCandidates(
      comparison,
      alert.preferredPlatform,
      alert.vehicleCategory
    );

    if (candidates.length === 0) {
      return {
        ...alert,
        status: 'monitoring' as const,
        latestEstimatedFare: undefined,
        matchedPlatformName: undefined,
        matchedVehicleType: undefined,
        potentialSavings: 0,
        unavailableReason: `${alert.preferredPlatformLabel} does not offer ${alert.vehicleCategoryLabel} in the configured tariff dataset.`,
        lastCheckedAt: nowIso,
      };
    }

    matchedCount += 1;
    const bestMatch = candidates[0];
    const highestCandidate = candidates[candidates.length - 1];
    const previousFare = alert.latestEstimatedFare;
    const latestFare = bestMatch.estimatedFare;

    // Stage 3: Condition Evaluation (actual estimated fare <= target fare)
    const isTargetMet = latestFare <= alert.targetFare;
    const fareDropAmount =
      previousFare !== undefined && latestFare < previousFare
        ? previousFare - latestFare
        : 0;

    // Savings against target budget + spread against highest comparable option
    const budgetSavings = isTargetMet ? Math.max(0, alert.targetFare - latestFare) : 0;
    const spreadSavings = Math.max(0, highestCandidate.estimatedFare - latestFare);
    const potentialSavings = isTargetMet
      ? Math.max(budgetSavings, comparison.summary.highestFare - latestFare)
      : spreadSavings;

    const nextStatus: FareAlert['status'] = isTargetMet ? 'triggered' : 'monitoring';
    if (nextStatus === 'triggered') {
      triggeredCount += 1;
    }

    // Stage 4: Alert Generation (only when real fare data meets configured target condition)
    const shouldGenerateNotification =
      isTargetMet &&
      (alert.status !== 'triggered' ||
        fareDropAmount > 0 ||
        forceNotifyAlertIds.has(alert.id));

    if (shouldGenerateNotification) {
      let title = 'Great! Your target fare is available.';
      let message = `${bestMatch.vehicleType} (${bestMatch.platformName}) is estimated at ₹${latestFare}, within your ₹${alert.targetFare} target.`;

      if (fareDropAmount > 0) {
        title = `${bestMatch.platformName} fare has dropped by ₹${fareDropAmount}.`;
        message = `Simulated estimate dropped from ₹${previousFare} to ₹${latestFare} (${bestMatch.vehicleType}) — within your ₹${alert.targetFare} target.`;
      } else if (alert.preferredPlatform !== 'any') {
        title = 'Your preferred ride is now within budget.';
        message = `${bestMatch.vehicleType} on ${bestMatch.platformName} is ₹${latestFare} (${
          budgetSavings > 0 ? `₹${budgetSavings} under your ₹${alert.targetFare} limit` : `matches your ₹${alert.targetFare} target`
        }).`;
      }

      newNotifications.push({
        id: `notif-${alert.id}-${Date.now()}-${newNotifications.length}`,
        alertId: alert.id,
        title,
        message,
        platformName: bestMatch.platformName,
        vehicleType: bestMatch.vehicleType,
        targetFare: alert.targetFare,
        estimatedFare: latestFare,
        potentialSavings,
        pickupName: alert.pickupName,
        dropName: alert.dropName,
        createdAt: nowIso,
        isSimulated: true,
      });
    }

    return {
      ...alert,
      status: nextStatus,
      previousEstimatedFare:
        previousFare !== undefined && previousFare !== latestFare
          ? previousFare
          : alert.previousEstimatedFare,
      latestEstimatedFare: latestFare,
      matchedPlatformName: bestMatch.platformName,
      matchedVehicleType: bestMatch.vehicleType,
      potentialSavings,
      unavailableReason: undefined,
      lastCheckedAt: nowIso,
      triggeredAt: isTargetMet ? alert.triggeredAt ?? nowIso : undefined,
    };
  });

  const workflowSummary: AlertWorkflowSummary = {
    lastEvaluatedAt: nowIso,
    routeLabel: `${comparison.route.pickup.area} → ${comparison.route.drop.area}`,
    latestBestFare: comparison.summary.cheapestFare,
    activeCheckedCount,
    matchedCount,
    triggeredCount,
    notificationsGenerated: newNotifications.length,
  };

  return { updatedAlerts, newNotifications, workflowSummary };
}

export function normalizeLegacyAlert(
  raw: Record<string, unknown>,
  fallbackPickup: LocationPoint,
  fallbackDrop: LocationPoint
): FareAlert | null {
  if (!raw || typeof raw !== 'object') return null;
  const targetFare = Number(raw.targetFare);
  if (!Number.isFinite(targetFare) || targetFare <= 0) return null;

  const rawPlat = String(raw.preferredPlatform ?? 'any').toLowerCase();
  const platformMap: Record<string, 'any' | PlatformId> = {
    any: 'any',
    'any platform': 'any',
    uber: 'uber',
    ola: 'ola',
    rapido: 'rapido',
    blusmart: 'blusmart',
    namma_yatri: 'namma_yatri',
    'namma yatri': 'namma_yatri',
    meru: 'meru',
    'meru cabs': 'meru',
    goamiles: 'goamiles',
    'goa miles': 'goamiles',
  };
  const preferredPlatform = platformMap[rawPlat] ?? 'any';

  const rawCat = String(raw.vehicleCategory ?? 'any').toLowerCase() as 'any' | VehicleCategory;
  const validCats: Array<'any' | VehicleCategory> = [
    'any',
    'bike',
    'auto',
    'hatchback',
    'sedan',
    'suv',
    'ev',
  ];
  const vehicleCategory = validCats.includes(rawCat) ? rawCat : 'any';

  const pickup = (raw.pickup as LocationPoint | undefined) ?? {
    ...fallbackPickup,
    name: String(raw.pickupName ?? fallbackPickup.name),
  };
  const drop = (raw.drop as LocationPoint | undefined) ?? {
    ...fallbackDrop,
    name: String(raw.dropName ?? fallbackDrop.name),
  };

  const isPaused = Boolean(raw.isPaused);
  const rawStatus = String(raw.status ?? 'monitoring');
  const status: FareAlert['status'] = isPaused
    ? 'paused'
    : rawStatus === 'triggered'
      ? 'triggered'
      : 'monitoring';

  return {
    id: String(raw.id ?? `alert-${Date.now()}`),
    pickup,
    drop,
    pickupName: String(raw.pickupName ?? pickup.name),
    dropName: String(raw.dropName ?? drop.name),
    targetFare,
    preferredPlatform,
    preferredPlatformLabel: PLATFORM_LABELS[preferredPlatform],
    vehicleCategory,
    vehicleCategoryLabel: VEHICLE_CATEGORY_LABELS[vehicleCategory],
    isPaused,
    status,
    latestEstimatedFare:
      typeof raw.latestEstimatedFare === 'number' ? raw.latestEstimatedFare : undefined,
    previousEstimatedFare:
      typeof raw.previousEstimatedFare === 'number' ? raw.previousEstimatedFare : undefined,
    matchedPlatformName:
      typeof raw.matchedPlatformName === 'string' ? raw.matchedPlatformName : undefined,
    matchedVehicleType:
      typeof raw.matchedVehicleType === 'string' ? raw.matchedVehicleType : undefined,
    potentialSavings:
      typeof raw.potentialSavings === 'number' ? raw.potentialSavings : undefined,
    unavailableReason:
      typeof raw.unavailableReason === 'string' ? raw.unavailableReason : undefined,
    lastCheckedAt: typeof raw.lastCheckedAt === 'string' ? raw.lastCheckedAt : undefined,
    triggeredAt: typeof raw.triggeredAt === 'string' ? raw.triggeredAt : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function loadSavedAlerts(
  fallbackPickup: LocationPoint,
  fallbackDrop: LocationPoint
): FareAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeLegacyAlert(item as Record<string, unknown>, fallbackPickup, fallbackDrop))
      .filter((a): a is FareAlert => a !== null);
  } catch {
    return [];
  }
}

export function saveAlertsToStorage(alerts: FareAlert[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSavedNotifications(): AlertNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AlertNotification[]) : [];
  } catch {
    return [];
  }
}

export function saveNotificationsToStorage(notifications: AlertNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(notifications.slice(0, 15))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSoundPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_PREF_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveSoundPreference(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, String(enabled));
  } catch {
    // Ignore storage quota errors
  }
}
