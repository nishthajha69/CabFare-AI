import {
  AlternativePickup,
  CustomPlatformRatesMap,
  DailyTrendPoint,
  FareComparisonResponse,
  FareEstimate,
  HistoricalPoint,
  LocationPoint,
  PlatformId,
  RideMode,
  RideRecommendationHighlight,
  ScenarioMode,
  SupportedPlatformInfo,
  SurgeAssumptions,
  VehicleCategory,
} from '../src/types/cabfare.ts';
import {
  buildProviderBookingUrl,
  getEffectivePlatformModels,
  getPreBookingDriverProfile,
  getProviderSafetyCapabilities,
  PlatformFareModel,
  resolveCityProviderConfig,
  VehicleFareTariff,
} from './fareModels.ts';
import { analyzeHistoricalForecast } from './historicalDataset.ts';
import { getRoadRoute } from './routingService.ts';

interface ScenarioParameters {
  activePeriod: 'Peak' | 'Moderate' | 'Off-Peak';
  demandFactor: number;
  trafficLevel: 'Low' | 'Moderate' | 'Heavy';
  trafficCongestionFactor: number;
  peakSurgeMultiplier: number;
  offPeakMultiplier: number;
  timeWindowLabel: string;
  baseHour: number;
}

function getScenarioParameters(
  scenario: ScenarioMode,
  assumptions?: SurgeAssumptions
): ScenarioParameters {
  const currentHour = new Date().getHours();
  const peakSurgeMultiplier = assumptions?.peakSurgeMultiplier ?? 1.42;
  const offPeakMultiplier = assumptions?.offPeakMultiplier ?? 1.0;

  if (scenario === 'morning_peak') {
    return {
      activePeriod: 'Peak',
      demandFactor: 0.84,
      trafficLevel: 'Heavy',
      trafficCongestionFactor: assumptions?.trafficCongestionFactor ?? 1.38,
      peakSurgeMultiplier,
      offPeakMultiplier,
      timeWindowLabel: 'Morning Rush (08:30 – 10:30)',
      baseHour: 9,
    };
  }
  if (scenario === 'evening_surge') {
    return {
      activePeriod: 'Peak',
      demandFactor: 0.94,
      trafficLevel: 'Heavy',
      trafficCongestionFactor: assumptions?.trafficCongestionFactor ?? 1.48,
      peakSurgeMultiplier,
      offPeakMultiplier,
      timeWindowLabel: 'Evening Peak Surge (18:00 – 20:30)',
      baseHour: 19,
    };
  }
  if (scenario === 'off_peak') {
    return {
      activePeriod: 'Off-Peak',
      demandFactor: 0.22,
      trafficLevel: 'Low',
      trafficCongestionFactor: assumptions?.trafficCongestionFactor ?? 1.0,
      peakSurgeMultiplier,
      offPeakMultiplier,
      timeWindowLabel: 'Off-Peak Window (11:30 – 15:30)',
      baseHour: 13,
    };
  }

  const isPeak = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 21);
  const isMid = currentHour >= 11 && currentHour <= 16;
  return {
    activePeriod: isPeak ? 'Peak' : isMid ? 'Moderate' : 'Off-Peak',
    demandFactor: isPeak ? 0.78 : isMid ? 0.44 : 0.28,
    trafficLevel: isPeak ? 'Heavy' : isMid ? 'Moderate' : 'Low',
    trafficCongestionFactor:
      assumptions?.trafficCongestionFactor ?? (isPeak ? 1.35 : isMid ? 1.15 : 1.0),
    peakSurgeMultiplier,
    offPeakMultiplier,
    timeWindowLabel: `Current Window (${String(currentHour).padStart(2, '0')}:00 Estimated)`,
    baseHour: currentHour,
  };
}

function computeSurgeMultiplier(
  model: PlatformFareModel,
  params: ScenarioParameters,
  zoneType: LocationPoint['zoneType']
): number {
  if (model.surgeSensitivity === 0) {
    return 1.0;
  }

  const zoneBoost =
    zoneType === 'airport' ? 0.08 : zoneType === 'tech-park' ? 0.05 : 0;

  if (params.activePeriod === 'Peak') {
    const rawDelta = (params.peakSurgeMultiplier - 1 + zoneBoost) * model.surgeSensitivity;
    return Number(Math.max(1.0, 1 + rawDelta).toFixed(2));
  }

  if (params.activePeriod === 'Off-Peak') {
    const offDelta = (params.offPeakMultiplier - 1) * model.surgeSensitivity;
    return Number(Math.max(0.85, 1 + offDelta).toFixed(2));
  }

  // Moderate period: gentle interpolated demand uplift
  const modDelta = (params.demandFactor - 0.3) * 0.35 * model.surgeSensitivity + zoneBoost * 0.5;
  return Number(Math.max(1.0, 1 + modDelta).toFixed(2));
}

function isStationOrTransitPickup(pickup: LocationPoint): boolean {
  return (
    pickup.zoneType === 'metro' ||
    pickup.zoneType === 'railway' ||
    /station|terminal|railway|metro|bus|expressway|junction/i.test(pickup.name)
  );
}

function calculateVehicleFare(
  model: PlatformFareModel,
  tariff: VehicleFareTariff,
  roadDistanceKm: number,
  baseDurationMin: number,
  params: ScenarioParameters,
  pickup: LocationPoint,
  drop: LocationPoint,
  rideMode: RideMode = 'immediate'
): FareEstimate {
  const isAirportPickup = pickup.zoneType === 'airport';
  const isAirportRoute = isAirportPickup || drop.zoneType === 'airport';
  const isStationPickup = !isAirportPickup && isStationOrTransitPickup(pickup);

  const journeyMinutes = Math.max(
    4,
    Math.round(baseDurationMin * params.trafficCongestionFactor * tariff.speedFactor)
  );

  const baseFare = tariff.baseFare;
  const distanceCharge = Math.round(roadDistanceKm * tariff.perKmRate);
  const timeCharge = Math.round(journeyMinutes * tariff.perMinRate);
  const bookingFee = tariff.bookingFee;

  const rawSubtotal = baseFare + distanceCharge + timeCharge + bookingFee;
  const minimumFareApplied = rawSubtotal < tariff.minimumFare;
  const preSurgeFare = Math.max(tariff.minimumFare, rawSubtotal);

  const immediateSurge = computeSurgeMultiplier(model, params, pickup.zoneType);
  // Scheduled rides smooth dynamic surge spikes via advance slot allocation
  const surgeMultiplier =
    rideMode === 'scheduled' && immediateSurge > 1.0
      ? Number((1 + (immediateSurge - 1) * 0.7).toFixed(2))
      : immediateSurge;
  const surgeFee = Math.round(preSurgeFare * (surgeMultiplier - 1));

  const airportOrZoneFee = isAirportRoute
    ? tariff.category === 'bike'
      ? Math.round(model.airportPickupFee * 0.45)
      : tariff.category === 'auto'
        ? Math.round(model.airportPickupFee * 0.65)
        : model.airportPickupFee
    : pickup.zoneType === 'tech-park'
      ? 10
      : 0;

  // Scheduled mode models airport/station pickup holding & arrival wait times
  const scheduledWaitMinutes =
    rideMode === 'scheduled'
      ? isAirportPickup
        ? 15
        : isStationPickup
          ? 8
          : 5
      : 0;

  const billableWaitMinutes =
    rideMode === 'scheduled' ? Math.max(0, scheduledWaitMinutes - 5) : 0;

  const scheduledSlotFee =
    rideMode === 'scheduled'
      ? model.platformId === 'blusmart'
        ? isAirportPickup
          ? 20
          : 0
        : isAirportPickup
          ? tariff.category === 'bike'
            ? 15
            : 35
          : isStationPickup
            ? 15
            : 10
      : 0;

  const pickupWaitCharge =
    rideMode === 'scheduled'
      ? Math.round(billableWaitMinutes * tariff.perMinRate * 1.5) + scheduledSlotFee
      : 0;

  const estimatedFare = Math.max(
    tariff.minimumFare,
    Math.round(preSurgeFare + surgeFee + airportOrZoneFee + pickupWaitCharge)
  );

  // Deterministic ETA modeling (never random)
  const congestionDelay =
    params.trafficLevel === 'Heavy' ? 4 : params.trafficLevel === 'Moderate' ? 2 : 0;
  const immediateStagingDelay = isAirportPickup ? 4 : isStationPickup ? 2 : 0;
  const scheduledPreStageReduction =
    rideMode === 'scheduled'
      ? isAirportPickup
        ? 4
        : isStationPickup
          ? 2
          : 2
      : 0;

  const arrivalMinutes = Math.max(
    2,
    model.baseDispatchEtaMin +
      tariff.etaOffsetMin +
      congestionDelay +
      (rideMode === 'immediate' ? immediateStagingDelay : -scheduledPreStageReduction)
  );

  const cancellationRisk: 'Low' | 'Moderate' | 'High' =
    model.platformId === 'blusmart' || rideMode === 'scheduled'
      ? 'Low'
      : surgeMultiplier >= 1.4
        ? 'High'
        : surgeMultiplier >= 1.18
          ? 'Moderate'
          : 'Low';

  const reliabilityScore = Math.max(
    75,
    Math.min(
      99,
      Math.round(
        model.reliabilityBase -
          (surgeMultiplier - 1) * 14 +
          (rideMode === 'scheduled' ? 2 : 0)
      )
    )
  );

  const availabilityStatus =
    rideMode === 'scheduled'
      ? `Estimated slot · ~${arrivalMinutes}m arrival (${scheduledWaitMinutes}m wait incl.)`
      : isAirportPickup || isStationPickup
        ? `Estimated dispatch · ~${arrivalMinutes}m arrival (+${immediateStagingDelay}m hub queue)`
        : `Estimated availability · ~${arrivalMinutes}m pickup ETA`;

  return {
    id: `${model.platformId}-${tariff.category}`,
    platformId: model.platformId,
    platformName: model.platformName,
    vehicleType: tariff.vehicleType,
    category: tariff.category,
    categoryLabel: tariff.categoryLabel,
    estimatedFare,
    baseFare,
    distanceCharge,
    timeCharge,
    bookingFee,
    minimumFare: tariff.minimumFare,
    minimumFareApplied,
    airportOrZoneFee,
    scheduledWaitMinutes,
    pickupWaitCharge,
    surgeFee,
    surgeMultiplier,
    perKmRate: tariff.perKmRate,
    perMinRate: tariff.perMinRate,
    estimatedDistanceKm: roadDistanceKm,
    arrivalMinutes,
    journeyMinutes,
    availabilityStatus,
    availabilitySource: 'simulated',
    fareQuoteType: 'estimated',
    bookingUrl: buildProviderBookingUrl(model.platformId, pickup, drop),
    reliabilityScore,
    cancellationRisk,
    isCheapest: false,
    isCheapestInCategory: false,
    pricingModel: model.pricingModel,
    notes: model.notes,
    driverProfile: getPreBookingDriverProfile(),
    safetyCapabilities: getProviderSafetyCapabilities(model.platformId),
  };
}

function getPlatformBenchmarkTariff(model: PlatformFareModel): VehicleFareTariff {
  return (
    model.vehicles.find((v) => v.category === 'hatchback') ||
    model.vehicles.find((v) => v.category === 'ev') ||
    model.vehicles[0]
  );
}

function build24HourHistory(
  models: PlatformFareModel[],
  roadDistanceKm: number,
  baseDurationMin: number,
  pickup: LocationPoint,
  drop: LocationPoint,
  assumptions?: SurgeAssumptions
): HistoricalPoint[] {
  if (models.length === 0) return [];
  const points: HistoricalPoint[] = [];
  for (let hour = 0; hour < 24; hour += 2) {
    const morningPeak = Math.exp(-Math.pow((hour - 9) / 2.2, 2));
    const eveningPeak = Math.exp(-Math.pow((hour - 19) / 2.5, 2));
    const demandIndex = Number(
      Math.min(1, 0.22 + 0.58 * morningPeak + 0.72 * eveningPeak).toFixed(2)
    );
    const period: ScenarioParameters['activePeriod'] =
      demandIndex >= 0.65 ? 'Peak' : demandIndex >= 0.4 ? 'Moderate' : 'Off-Peak';

    const params: ScenarioParameters = {
      activePeriod: period,
      demandFactor: demandIndex,
      trafficLevel: period === 'Peak' ? 'Heavy' : period === 'Moderate' ? 'Moderate' : 'Low',
      trafficCongestionFactor: 1 + demandIndex * 0.45,
      peakSurgeMultiplier: assumptions?.peakSurgeMultiplier ?? 1.42,
      offPeakMultiplier: assumptions?.offPeakMultiplier ?? 1.0,
      timeWindowLabel: `${String(hour).padStart(2, '0')}:00`,
      baseHour: hour,
    };

    const row: HistoricalPoint = {
      timeLabel: `${String(hour).padStart(2, '0')}:00`,
      hour,
      uber: null,
      ola: null,
      rapido: null,
      blusmart: null,
      namma_yatri: null,
      meru: null,
      goamiles: null,
      demandIndex: Math.round(demandIndex * 100),
    };

    for (const model of models) {
      const tariff = getPlatformBenchmarkTariff(model);
      const est = calculateVehicleFare(
        model,
        tariff,
        roadDistanceKm,
        baseDurationMin,
        params,
        pickup,
        drop
      );
      row[model.platformId] = est.estimatedFare;
    }

    points.push(row);
  }
  return points;
}

function build7DayHistory(
  models: PlatformFareModel[],
  roadDistanceKm: number,
  baseDurationMin: number,
  pickup: LocationPoint,
  drop: LocationPoint,
  assumptions?: SurgeAssumptions
): DailyTrendPoint[] {
  if (models.length === 0) return [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayDemands = [0.66, 0.64, 0.7, 0.74, 0.85, 0.52, 0.44];

  return days.map((dayLabel, idx) => {
    const demand = dayDemands[idx];
    const period: ScenarioParameters['activePeriod'] =
      demand >= 0.65 ? 'Peak' : demand >= 0.48 ? 'Moderate' : 'Off-Peak';

    const params: ScenarioParameters = {
      activePeriod: period,
      demandFactor: demand,
      trafficLevel: period === 'Peak' ? 'Heavy' : period === 'Moderate' ? 'Moderate' : 'Low',
      trafficCongestionFactor: 1 + demand * 0.38,
      peakSurgeMultiplier: assumptions?.peakSurgeMultiplier ?? 1.42,
      offPeakMultiplier: assumptions?.offPeakMultiplier ?? 1.0,
      timeWindowLabel: dayLabel,
      baseHour: 10,
    };

    const faresByProvider: Record<PlatformId, number | null> = {
      uber: null,
      ola: null,
      rapido: null,
      blusmart: null,
      namma_yatri: null,
      meru: null,
      goamiles: null,
    };
    let sum = 0;
    for (const model of models) {
      const tariff = getPlatformBenchmarkTariff(model);
      const est = calculateVehicleFare(
        model,
        tariff,
        roadDistanceKm,
        baseDurationMin,
        params,
        pickup,
        drop
      );
      faresByProvider[model.platformId] = est.estimatedFare;
      sum += est.estimatedFare;
    }

    return {
      dayLabel,
      averageFare: models.length > 0 ? Math.round(sum / models.length) : 0,
      uber: faresByProvider.uber,
      ola: faresByProvider.ola,
      rapido: faresByProvider.rapido,
      blusmart: faresByProvider.blusmart,
      namma_yatri: faresByProvider.namma_yatri,
      meru: faresByProvider.meru,
      goamiles: faresByProvider.goamiles,
    };
  });
}


function buildAlternativePickups(
  pickup: LocationPoint,
  cheapestCabFare: number,
  bestCabPlatform: string,
  airportPickupFee: number
): AlternativePickup[] {
  if (cheapestCabFare <= 0) return [];
  const isAirport = pickup.zoneType === 'airport';
  const suggestions = [
    {
      id: `${pickup.id}-alt-1`,
      name: isAirport
        ? 'Airport Expressway Shuttle Gate'
        : `${pickup.area} Main Arterial Junction`,
      description: isAirport
        ? 'Outside terminal geofence — avoids airport pickup surcharge.'
        : 'High-visibility arterial stop with faster driver approach.',
      walkMeters: 320,
      walkMinutes: 4,
      latOffset: 0.0024,
      lngOffset: 0.0019,
      discountRate: isAirport ? 0.14 : 0.09,
      reason: isAirport
        ? 'Bypasses terminal staging fee & pickup queue'
        : 'Steps outside micro-zone surge boundary',
    },
    {
      id: `${pickup.id}-alt-2`,
      name: `${pickup.area} Transit / Metro Exit`,
      description: 'Frequent drop-offs increase idle cab supply and lower surge.',
      walkMeters: 460,
      walkMinutes: 6,
      latOffset: -0.0031,
      lngOffset: 0.0026,
      discountRate: 0.12,
      reason: 'Higher incoming cab supply from transit commuters',
    },
    {
      id: `${pickup.id}-alt-3`,
      name: `${pickup.area} Cross Avenue`,
      description: 'Avoids one-way traffic bottleneck near primary pin.',
      walkMeters: 210,
      walkMinutes: 3,
      latOffset: 0.0014,
      lngOffset: -0.0021,
      discountRate: 0.06,
      reason: 'Shorter driver approach cuts duration & surge cost',
    },
  ];

  return suggestions.map((s) => {
    const baseSaving = Math.round(
      cheapestCabFare * s.discountRate + (isAirport ? airportPickupFee * 0.4 : 6)
    );
    const savings = Math.max(12, Math.min(Math.round(cheapestCabFare * 0.25), baseSaving));
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      walkMeters: s.walkMeters,
      walkMinutes: s.walkMinutes,
      lat: Number((pickup.lat + s.latOffset).toFixed(5)),
      lng: Number((pickup.lng + s.lngOffset).toFixed(5)),
      bestPlatform: bestCabPlatform,
      newFare: Math.max(30, cheapestCabFare - savings),
      savings,
      reason: s.reason,
    };
  });
}

function computeRideRecommendations(
  sortedFares: FareEstimate[],
  platformBenchmarks: FareEstimate[]
): FareComparisonResponse['rideRecommendations'] {
  if (sortedFares.length === 0) {
    return {
      cheapest: null,
      fastest: null,
      bestValue: null,
      bestRatedDriver: {
        type: 'best_rated_driver',
        title: 'Best Rated Driver',
        reason: 'No supported cab providers operate at this location.',
        estimate: null,
      },
      bestSafetyInfo: null,
      bestOverall: null,
    };
  }

  const cheapestEst = sortedFares[0];
  const cheapestCab = platformBenchmarks[0] ?? cheapestEst;

  const fastestEst = [...sortedFares].sort((a, b) => {
    const totalA = a.arrivalMinutes + a.journeyMinutes;
    const totalB = b.arrivalMinutes + b.journeyMinutes;
    if (totalA !== totalB) return totalA - totalB;
    if (a.arrivalMinutes !== b.arrivalMinutes) return a.arrivalMinutes - b.arrivalMinutes;
    return a.estimatedFare - b.estimatedFare;
  })[0];

  const cabPool = sortedFares.filter(
    (f) => f.category === 'hatchback' || f.category === 'sedan' || f.category === 'ev'
  );
  const valuePool = cabPool.length > 0 ? cabPool : sortedFares;

  const minFare = Math.min(...valuePool.map((f) => f.estimatedFare));
  const maxFare = Math.max(...valuePool.map((f) => f.estimatedFare));
  const minTime = Math.min(...valuePool.map((f) => f.arrivalMinutes + f.journeyMinutes));
  const maxTime = Math.max(...valuePool.map((f) => f.arrivalMinutes + f.journeyMinutes));

  const scoredValue = valuePool
    .map((f) => {
      const fareNorm = maxFare > minFare ? (f.estimatedFare - minFare) / (maxFare - minFare) : 0;
      const totalT = f.arrivalMinutes + f.journeyMinutes;
      const timeNorm = maxTime > minTime ? (totalT - minTime) / (maxTime - minTime) : 0;
      const relPenalty = (100 - f.reliabilityScore) / 25;
      const surgePenalty = Math.max(0, f.surgeMultiplier - 1) * 0.25;
      const score = fareNorm * 0.48 + timeNorm * 0.28 + relPenalty * 0.24 + surgePenalty;
      return { fare: f, score };
    })
    .sort((a, b) => a.score - b.score);

  const bestValueEst = scoredValue[0]?.fare ?? cheapestCab;

  // Best Rated Driver: STRICTLY only when a real driver rating is supplied by an authorised provider API
  const assignedRatedDrivers = sortedFares
    .filter(
      (f) =>
        f.driverProfile.isDriverAssigned &&
        typeof f.driverProfile.driverRating === 'number' &&
        Number.isFinite(f.driverProfile.driverRating)
    )
    .sort(
      (a, b) =>
        (b.driverProfile.driverRating ?? 0) - (a.driverProfile.driverRating ?? 0) ||
        (b.driverProfile.completedRides ?? 0) - (a.driverProfile.completedRides ?? 0)
    );

  const bestRatedDriver: RideRecommendationHighlight =
    assignedRatedDrivers.length > 0
      ? {
          type: 'best_rated_driver',
          title: 'Best Rated Driver',
          reason: `${assignedRatedDrivers[0].driverProfile.driverName} (${assignedRatedDrivers[0].driverProfile.driverRating}/5 across ${assignedRatedDrivers[0].driverProfile.completedRides ?? 0} trips). Ratings do not guarantee safety.`,
          estimate: assignedRatedDrivers[0],
        }
      : {
          type: 'best_rated_driver',
          title: 'Best Rated Driver',
          reason:
            'Driver details will be available after booking — live ratings are only displayed when supplied by an authorised provider API (never fabricated).',
          estimate: null,
        };

  // Best Safety Information Available (evaluates verified documented in-app safety tools)
  const safetyPool = cabPool.length > 0 ? cabPool : sortedFares;
  const bestSafetyEst = [...safetyPool].sort((a, b) => {
    const scoreDiff = b.safetyCapabilities.safetyInfoScore - a.safetyCapabilities.safetyInfoScore;
    if (scoreDiff !== 0) return scoreDiff;
    const relDiff = b.reliabilityScore - a.reliabilityScore;
    if (relDiff !== 0) return relDiff;
    return a.estimatedFare - b.estimatedFare;
  })[0];

  // Best Overall Choice (balanced fare + documented safety tools + reliability + ETA)
  const overallScored = safetyPool
    .map((f) => {
      const fareNorm = maxFare > minFare ? (f.estimatedFare - minFare) / (maxFare - minFare) : 0;
      const totalT = f.arrivalMinutes + f.journeyMinutes;
      const timeNorm = maxTime > minTime ? (totalT - minTime) / (maxTime - minTime) : 0;
      const relPenalty = (100 - f.reliabilityScore) / 25;
      const safetyPenalty = (100 - f.safetyCapabilities.safetyInfoScore) / 25;
      const score = fareNorm * 0.36 + safetyPenalty * 0.3 + relPenalty * 0.2 + timeNorm * 0.14;
      return { fare: f, score };
    })
    .sort((a, b) => a.score - b.score);

  const bestOverallEst = overallScored[0]?.fare ?? bestSafetyEst;

  return {
    cheapest: {
      type: 'cheapest',
      title: 'Cheapest Ride',
      reason:
        cheapestEst.id !== cheapestCab.id
          ? `Lowest estimated fare overall (best cab: ${cheapestCab.vehicleType} at ₹${cheapestCab.estimatedFare})`
          : `Lowest estimated fare across supported providers at ₹${cheapestEst.perKmRate}/km`,
      estimate: cheapestEst,
    },
    fastest: {
      type: 'fastest',
      title: 'Fastest Ride',
      reason: `Quickest door-to-door (~${fastestEst.arrivalMinutes}m pickup + ${fastestEst.journeyMinutes}m trip)`,
      estimate: fastestEst,
    },
    bestValue: {
      type: 'best_value',
      title: 'Best Value Ride',
      reason: `Optimal balance of ₹${bestValueEst.estimatedFare} fare, ${bestValueEst.arrivalMinutes}m ETA & ${bestValueEst.reliabilityScore}% reliability`,
      estimate: bestValueEst,
    },
    bestRatedDriver,
    bestSafetyInfo: {
      type: 'best_safety_info',
      title: 'Best Safety Information Available',
      reason: `${bestSafetyEst.platformName} documents ${bestSafetyEst.safetyCapabilities.documentedSafetyFeatures.slice(0, 3).join(', ')} (${bestSafetyEst.safetyCapabilities.safetyInfoScore}/100 info coverage). Tools do not guarantee safety.`,
      estimate: bestSafetyEst,
    },
    bestOverall: {
      type: 'best_overall',
      title: 'Best Overall Choice',
      reason: `Balanced choice combining ₹${bestOverallEst.estimatedFare} fare, ${bestOverallEst.safetyCapabilities.safetyInfoScore}/100 safety tools, and ${bestOverallEst.reliabilityScore}% reliability.`,
      estimate: bestOverallEst,
    },
  };
}

export async function compareFares(
  pickup: LocationPoint,
  drop: LocationPoint,
  scenario: ScenarioMode = 'live',
  assumptions?: SurgeAssumptions,
  rideMode: RideMode = 'immediate',
  customRates?: CustomPlatformRatesMap
): Promise<FareComparisonResponse> {
  const roadRoute = await getRoadRoute(pickup, drop);
  const params = getScenarioParameters(scenario, assumptions);

  const { config: cityConfig, context: cityProviderContext } = resolveCityProviderConfig(
    pickup,
    drop
  );
  const effectiveModels = getEffectivePlatformModels(cityConfig, customRates);

  const estimatedDurationMin = Math.max(
    5,
    Math.round(roadRoute.baseDurationMin * params.trafficCongestionFactor)
  );

  // Calculate all supported (city-enabled platform × vehicle category) fare estimates
  const allFares: FareEstimate[] = [];
  const supportedCategoriesByPlatform: Partial<Record<PlatformId, VehicleCategory[]>> = {};

  for (const model of effectiveModels) {
    supportedCategoriesByPlatform[model.platformId] = model.vehicles.map((v) => v.category);
    for (const tariff of model.vehicles) {
      allFares.push(
        calculateVehicleFare(
          model,
          tariff,
          roadRoute.roadDistanceKm,
          roadRoute.baseDurationMin,
          params,
          pickup,
          drop,
          rideMode
        )
      );
    }
  }

  // Sort cheapest overall first
  const sortedFares = [...allFares].sort((a, b) => a.estimatedFare - b.estimatedFare);
  if (sortedFares.length > 0) {
    sortedFares[0].isCheapest = true;
  }

  // Mark cheapest inside each vehicle category
  const cheapestByCat = new Map<VehicleCategory, string>();
  for (const fare of sortedFares) {
    if (!cheapestByCat.has(fare.category)) {
      cheapestByCat.set(fare.category, fare.id);
      fare.isCheapestInCategory = true;
    }
  }

  // Representative 4-wheeler benchmark per supported platform
  const platformBenchmarks: FareEstimate[] = effectiveModels
    .map((model) => {
      const benchmarkTariff = getPlatformBenchmarkTariff(model);
      return (
        sortedFares.find(
          (f) => f.platformId === model.platformId && f.category === benchmarkTariff.category
        ) || sortedFares.find((f) => f.platformId === model.platformId)!
      );
    })
    .filter(Boolean)
    .sort((a, b) => a.estimatedFare - b.estimatedFare);

  const cheapestOverall = sortedFares[0];
  const cheapestCab = platformBenchmarks[0] ?? cheapestOverall;
  const highestCab = platformBenchmarks[platformBenchmarks.length - 1] ?? cheapestCab;
  const averageCabFare =
    platformBenchmarks.length > 0
      ? Math.round(
          platformBenchmarks.reduce((acc, f) => acc + f.estimatedFare, 0) /
            platformBenchmarks.length
        )
      : 0;
  const estimatedSavings =
    highestCab && cheapestCab
      ? Math.max(0, highestCab.estimatedFare - cheapestCab.estimatedFare)
      : 0;
  const savingsPercent =
    highestCab && highestCab.estimatedFare > 0
      ? Math.round((estimatedSavings / highestCab.estimatedFare) * 100)
      : 0;

  const { farePredictions, predictionMeta } = analyzeHistoricalForecast(
    pickup,
    drop,
    averageCabFare,
    params.demandFactor,
    params.baseHour
  );

  const supportedPlatforms: SupportedPlatformInfo[] = effectiveModels.map((m) => ({
    id: m.platformId,
    name: m.platformName,
    confirmedForCity: cityProviderContext.isConfirmedCity,
    pricingModel: m.pricingModel,
    notes: m.notes,
  }));

  const rideRecommendations = computeRideRecommendations(sortedFares, platformBenchmarks);

  const intercityWarning =
    roadRoute.roadDistanceKm > 250
      ? `Long intercity distance (${roadRoute.roadDistanceKm} km): intracity cab tariffs shown here are indicative only; outstation or intercity operator quotes apply.`
      : undefined;

  const combinedWarning = [roadRoute.routeWarning, intercityWarning].filter(Boolean).join(' · ') || undefined;

  return {
    route: {
      pickup,
      drop,
      distanceKm: roadRoute.roadDistanceKm,
      roadDistanceKm: roadRoute.roadDistanceKm,
      straightLineKm: roadRoute.straightLineKm,
      distanceSource: roadRoute.distanceSource,
      routeGeometry: roadRoute.routeGeometry,
      estimatedDurationMin,
      trafficLevel: params.trafficLevel,
      scenario,
      rideMode,
      timeWindowLabel: params.timeWindowLabel,
      surgeConfig: {
        activePeriod: params.activePeriod,
        peakSurgeMultiplier: params.peakSurgeMultiplier,
        offPeakMultiplier: params.offPeakMultiplier,
        trafficCongestionFactor: params.trafficCongestionFactor,
      },
    },
    fares: sortedFares,
    platformBenchmarks,
    supportedPlatforms,
    cityProviderContext,
    supportedCategoriesByPlatform,
    rideRecommendations,
    summary: cheapestOverall
      ? {
          cheapestPlatform: cheapestOverall.platformName,
          cheapestPlatformId: cheapestOverall.platformId,
          cheapestVehicleType: cheapestOverall.vehicleType,
          cheapestFare: cheapestOverall.estimatedFare,
          cheapestCabPlatform: cheapestCab.platformName,
          cheapestCabVehicleType: cheapestCab.vehicleType,
          cheapestCabFare: cheapestCab.estimatedFare,
          averageFare: averageCabFare,
          highestPlatform: highestCab.platformName,
          highestFare: highestCab.estimatedFare,
          estimatedSavings,
          savingsPercent,
        }
      : {
          cheapestPlatform: 'Unavailable',
          cheapestPlatformId: 'ola',
          cheapestVehicleType: 'No supported service',
          cheapestFare: 0,
          cheapestCabPlatform: 'Unavailable',
          cheapestCabVehicleType: 'No supported cab',
          cheapestCabFare: 0,
          averageFare: 0,
          highestPlatform: 'Unavailable',
          highestFare: 0,
          estimatedSavings: 0,
          savingsPercent: 0,
        },
    priceHistory24h: build24HourHistory(
      effectiveModels,
      roadRoute.roadDistanceKm,
      roadRoute.baseDurationMin,
      pickup,
      drop,
      assumptions
    ),
    priceHistory7d: build7DayHistory(
      effectiveModels,
      roadRoute.roadDistanceKm,
      roadRoute.baseDurationMin,
      pickup,
      drop,
      assumptions
    ),
    farePredictions,
    predictionMeta,
    alternativePickups:
      cheapestCab && sortedFares.length > 0
        ? buildAlternativePickups(
            pickup,
            cheapestCab.estimatedFare,
            cheapestCab.platformName,
            effectiveModels.find((m) => m.platformId === cheapestCab.platformId)?.airportPickupFee ?? 0
          )
        : [],
    simulatedNotice:
      sortedFares.length > 0
        ? 'Estimated fares modeled from road route distance, travel time, and configurable city tariffs — not verified live provider API quotes.'
        : cityProviderContext.note,
    routeWarning: combinedWarning,
  };
}
