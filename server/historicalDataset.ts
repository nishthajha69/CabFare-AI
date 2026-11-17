import {
  AnalyticsFilters,
  AnalyticsSummaryResponse,
  HistoricalFareRecord,
  LocationPoint,
  PlatformId,
  PredictionMeta,
  PredictionPoint,
  VehicleCategory,
} from '../src/types/cabfare.ts';
import {
  getSupportedPlatformsForCityName,
  PLATFORM_FARE_MODELS,
  PlatformFareModel,
  VehicleFareTariff,
} from './fareModels.ts';

interface CorridorSeed {
  city: string;
  pickupLocation: string;
  destination: string;
  distanceKm: number;
  baseDurationMin: number;
  isAirport: boolean;
  isTechPark: boolean;
}

const CORRIDOR_SEEDS: CorridorSeed[] = [
  {
    city: 'Bengaluru',
    pickupLocation: 'Indiranagar 100 Feet Road',
    destination: 'Kempegowda International Airport (BLR)',
    distanceKm: 35.2,
    baseDurationMin: 42,
    isAirport: true,
    isTechPark: false,
  },
  {
    city: 'Bengaluru',
    pickupLocation: 'Koramangala 4th Block (Sony Signal)',
    destination: 'Electronic City Phase 1',
    distanceKm: 14.4,
    baseDurationMin: 24,
    isAirport: false,
    isTechPark: true,
  },
  {
    city: 'Bengaluru',
    pickupLocation: 'Koramangala 4th Block (Sony Signal)',
    destination: 'MG Road Metro Station',
    distanceKm: 7.1,
    baseDurationMin: 14,
    isAirport: false,
    isTechPark: false,
  },
  {
    city: 'Bengaluru',
    pickupLocation: 'Indiranagar 100 Feet Road',
    destination: 'Whitefield ITPL Main Gate',
    distanceKm: 13.2,
    baseDurationMin: 25,
    isAirport: false,
    isTechPark: true,
  },
  {
    city: 'Delhi NCR',
    pickupLocation: 'Connaught Place (Rajiv Chowk)',
    destination: 'DLF Cyber Hub',
    distanceKm: 23.5,
    baseDurationMin: 34,
    isAirport: false,
    isTechPark: true,
  },
  {
    city: 'Mumbai',
    pickupLocation: 'Hiranandani Gardens, Powai',
    destination: 'Bandra Kurla Complex (BKC)',
    distanceKm: 12.6,
    baseDurationMin: 26,
    isAirport: false,
    isTechPark: false,
  },
];

interface TimeSlotSeed {
  timeOfDay: string;
  hour: number;
  periodType: 'Peak' | 'Moderate' | 'Off-Peak';
  demandIndex: number;
  congestionFactor: number;
}

const TIME_SLOTS: TimeSlotSeed[] = [
  { timeOfDay: '00:00', hour: 0, periodType: 'Off-Peak', demandIndex: 0.24, congestionFactor: 1.0 },
  { timeOfDay: '06:00', hour: 6, periodType: 'Off-Peak', demandIndex: 0.32, congestionFactor: 1.06 },
  { timeOfDay: '08:30', hour: 8, periodType: 'Peak', demandIndex: 0.86, congestionFactor: 1.36 },
  { timeOfDay: '10:00', hour: 10, periodType: 'Peak', demandIndex: 0.74, congestionFactor: 1.28 },
  { timeOfDay: '13:00', hour: 13, periodType: 'Off-Peak', demandIndex: 0.38, congestionFactor: 1.1 },
  { timeOfDay: '16:00', hour: 16, periodType: 'Moderate', demandIndex: 0.56, congestionFactor: 1.2 },
  { timeOfDay: '19:00', hour: 19, periodType: 'Peak', demandIndex: 0.94, congestionFactor: 1.46 },
  { timeOfDay: '21:30', hour: 21, periodType: 'Moderate', demandIndex: 0.52, congestionFactor: 1.16 },
];

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  bike: 'Bike',
  auto: 'Auto',
  hatchback: 'Hatchback',
  sedan: 'Sedan',
  suv: 'SUV',
  ev: 'Electric Vehicle',
};

function getRecentDates(days = 7): { date: string; dayLabel: string; isWeekend: boolean; dayWeight: number }[] {
  const result: { date: string; dayLabel: string; isWeekend: boolean; dayWeight: number }[] = [];
  const today = new Date();
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Deterministic weekday demand weights (Mon..Fri higher commute demand, Sat/Sun lower)
  const dayWeights = [0.88, 1.0, 0.99, 1.02, 1.04, 1.08, 0.93];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dow = d.getDay();
    result.push({
      date: `${yyyy}-${mm}-${dd}`,
      dayLabel: `${weekdayNames[dow]} ${dd}/${mm}`,
      isWeekend: dow === 0 || dow === 6,
      dayWeight: dayWeights[dow],
    });
  }
  return result;
}

function computeHistoricalRecordFare(
  corridor: CorridorSeed,
  model: PlatformFareModel,
  tariff: VehicleFareTariff,
  slot: TimeSlotSeed,
  dayWeight: number,
  isWeekend: boolean,
  dayIdx: number,
  corridorIdx: number
): { fare: number; durationMin: number; surgeMultiplier: number; periodType: 'Peak' | 'Moderate' | 'Off-Peak' } {
  // Weekends soften morning rush but retain evening leisure demand
  const weekendAdjustment = isWeekend && slot.hour >= 8 && slot.hour <= 11 ? 0.78 : 1.0;
  const effectiveDemand = Math.min(1, slot.demandIndex * dayWeight * weekendAdjustment);
  const effectivePeriod: 'Peak' | 'Moderate' | 'Off-Peak' =
    effectiveDemand >= 0.65 ? 'Peak' : effectiveDemand >= 0.44 ? 'Moderate' : 'Off-Peak';

  const effectiveCongestion = 1 + (slot.congestionFactor - 1) * (isWeekend ? 0.85 : dayWeight);
  const durationMin = Math.max(
    4,
    Math.round(corridor.baseDurationMin * effectiveCongestion * tariff.speedFactor)
  );

  const subtotal = Math.max(
    tariff.minimumFare,
    tariff.baseFare +
      Math.round(corridor.distanceKm * tariff.perKmRate) +
      Math.round(durationMin * tariff.perMinRate) +
      tariff.bookingFee
  );

  // Deterministic cyclical micro-variation across days/corridors (+/- 2.5%, zero Math.random)
  const deterministicWave =
    Math.sin((dayIdx + 1) * 1.3 + (corridorIdx + 1) * 0.7 + slot.hour * 0.4) * 0.025;

  let surgeMultiplier = 1.0;
  if (model.surgeSensitivity > 0) {
    if (effectivePeriod === 'Peak') {
      const peakDelta = (0.34 + (effectiveDemand - 0.65) * 0.55 + deterministicWave) * model.surgeSensitivity;
      surgeMultiplier = Number(Math.max(1.0, 1 + peakDelta).toFixed(2));
    } else if (effectivePeriod === 'Moderate') {
      const modDelta = (0.1 + (effectiveDemand - 0.44) * 0.28 + deterministicWave) * model.surgeSensitivity;
      surgeMultiplier = Number(Math.max(1.0, 1 + modDelta).toFixed(2));
    } else {
      surgeMultiplier = Number(Math.max(0.95, 1 + deterministicWave * 0.5).toFixed(2));
    }
  }

  const zoneFee = corridor.isAirport
    ? tariff.category === 'bike'
      ? Math.round(model.airportPickupFee * 0.45)
      : tariff.category === 'auto'
        ? Math.round(model.airportPickupFee * 0.65)
        : model.airportPickupFee
    : corridor.isTechPark
      ? 10
      : 0;

  const fare = Math.max(
    tariff.minimumFare,
    Math.round(subtotal * surgeMultiplier + zoneFee)
  );

  return { fare, durationMin, surgeMultiplier, periodType: effectivePeriod };
}

let cachedDataset: { dateStamp: string; records: HistoricalFareRecord[] } | null = null;

export function getSyntheticHistoricalDataset(): HistoricalFareRecord[] {
  const todayStamp = new Date().toISOString().slice(0, 10);
  if (cachedDataset && cachedDataset.dateStamp === todayStamp) {
    return cachedDataset.records;
  }

  const dates = getRecentDates(7);
  const records: HistoricalFareRecord[] = [];
  let seq = 1;

  dates.forEach((d, dayIdx) => {
    CORRIDOR_SEEDS.forEach((corridor, corridorIdx) => {
      const supportedSet = new Set(getSupportedPlatformsForCityName(corridor.city));
      const corridorModels = PLATFORM_FARE_MODELS.filter((m) => supportedSet.has(m.platformId));
      TIME_SLOTS.forEach((slot) => {
        corridorModels.forEach((model) => {
          model.vehicles.forEach((tariff) => {
            const calc = computeHistoricalRecordFare(
              corridor,
              model,
              tariff,
              slot,
              d.dayWeight,
              d.isWeekend,
              dayIdx,
              corridorIdx
            );
            records.push({
              id: `syn-${seq++}`,
              platformId: model.platformId,
              platformName: model.platformName,
              pickupLocation: corridor.pickupLocation,
              destination: corridor.destination,
              vehicleType: tariff.vehicleType,
              vehicleCategory: tariff.category,
              distanceKm: corridor.distanceKm,
              durationMin: calc.durationMin,
              timeOfDay: slot.timeOfDay,
              hour: slot.hour,
              periodType: calc.periodType,
              date: d.date,
              fare: calc.fare,
              surgeMultiplier: calc.surgeMultiplier,
              isSynthetic: true,
            });
          });
        });
      });
    });
  });

  cachedDataset = { dateStamp: todayStamp, records };
  return records;
}

export function queryAnalyticsDataset(filters: Partial<AnalyticsFilters> = {}): AnalyticsSummaryResponse {
  const allRecords = getSyntheticHistoricalDataset();

  const dates = Array.from(new Set(allRecords.map((r) => r.date))).sort();
  const pickupLocations = Array.from(new Set(allRecords.map((r) => r.pickupLocation))).sort();
  const destinations = Array.from(new Set(allRecords.map((r) => r.destination))).sort();

  const filtered = allRecords.filter((r) => {
    if (filters.date && filters.date !== 'all' && r.date !== filters.date) return false;
    if (filters.platformId && filters.platformId !== 'all' && r.platformId !== filters.platformId)
      return false;
    if (
      filters.vehicleCategory &&
      filters.vehicleCategory !== 'all' &&
      r.vehicleCategory !== filters.vehicleCategory
    )
      return false;
    if (
      filters.pickupLocation &&
      filters.pickupLocation !== 'all' &&
      r.pickupLocation !== filters.pickupLocation
    )
      return false;
    if (
      filters.destination &&
      filters.destination !== 'all' &&
      r.destination !== filters.destination
    )
      return false;
    return true;
  });

  // Aggregate by platform
  const byPlatformMap = new Map<
    PlatformId,
    { platformName: string; sum: number; min: number; max: number; surgeSum: number; count: number }
  >();
  for (const r of filtered) {
    const cur = byPlatformMap.get(r.platformId);
    if (!cur) {
      byPlatformMap.set(r.platformId, {
        platformName: r.platformName,
        sum: r.fare,
        min: r.fare,
        max: r.fare,
        surgeSum: r.surgeMultiplier,
        count: 1,
      });
    } else {
      cur.sum += r.fare;
      if (r.fare < cur.min) cur.min = r.fare;
      if (r.fare > cur.max) cur.max = r.fare;
      cur.surgeSum += r.surgeMultiplier;
      cur.count += 1;
    }
  }

  const averageFareByPlatform = Array.from(byPlatformMap.entries())
    .map(([platformId, v]) => ({
      platformId,
      platformName: v.platformName,
      averageFare: Math.round(v.sum / v.count),
      minFare: v.min,
      maxFare: v.max,
      avgSurge: Number((v.surgeSum / v.count).toFixed(2)),
      recordCount: v.count,
    }))
    .sort((a, b) => a.averageFare - b.averageFare);

  const totalFareSum = filtered.reduce((acc, r) => acc + r.fare, 0);
  const averageFare = filtered.length > 0 ? Math.round(totalFareSum / filtered.length) : 0;
  const cheapestPlatformRow = averageFareByPlatform[0];
  const highestPlatformRow = averageFareByPlatform[averageFareByPlatform.length - 1];
  const highestRecordedFare =
    filtered.length > 0 ? Math.max(...filtered.map((r) => r.fare)) : 0;
  const estimatedCustomerSavings =
    cheapestPlatformRow && highestPlatformRow
      ? Math.max(0, highestPlatformRow.averageFare - cheapestPlatformRow.averageFare)
      : 0;
  const savingsPercent =
    highestPlatformRow && highestPlatformRow.averageFare > 0
      ? Math.round((estimatedCustomerSavings / highestPlatformRow.averageFare) * 100)
      : 0;

  // Peak demand period buckets computed directly from filtered records
  const periodBuckets: Array<{
    periodLabel: string;
    timeRange: string;
    periodType: 'Peak' | 'Moderate' | 'Off-Peak';
    matcher: (r: HistoricalFareRecord) => boolean;
  }> = [
    {
      periodLabel: 'Morning Peak',
      timeRange: '08:00 – 10:30',
      periodType: 'Peak',
      matcher: (r) => r.hour >= 8 && r.hour <= 10,
    },
    {
      periodLabel: 'Evening Surge',
      timeRange: '18:00 – 20:30',
      periodType: 'Peak',
      matcher: (r) => r.hour >= 18 && r.hour <= 20,
    },
    {
      periodLabel: 'Moderate Demand',
      timeRange: '15:00 – 17:59 · 21:00+',
      periodType: 'Moderate',
      matcher: (r) => (r.hour >= 15 && r.hour <= 17) || r.hour >= 21,
    },
    {
      periodLabel: 'Off-Peak Window',
      timeRange: '00:00 – 07:59 · 11:00 – 14:59',
      periodType: 'Off-Peak',
      matcher: (r) => r.hour <= 7 || (r.hour >= 11 && r.hour <= 14),
    },
  ];

  const peakDemandPeriods = periodBuckets
    .map((bucket) => {
      const subset = filtered.filter(bucket.matcher);
      if (subset.length === 0) return null;
      const avg = Math.round(subset.reduce((a, b) => a + b.fare, 0) / subset.length);
      const avgSurge = Number(
        (subset.reduce((a, b) => a + b.surgeMultiplier, 0) / subset.length).toFixed(2)
      );
      return {
        periodLabel: bucket.periodLabel,
        timeRange: bucket.timeRange,
        periodType: bucket.periodType,
        averageFare: avg,
        avgSurge,
        recordCount: subset.length,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // Hourly patterns across the 8 daily time slots
  const hourlyPatterns = TIME_SLOTS.map((slot) => {
    const slotRows = filtered.filter((r) => r.timeOfDay === slot.timeOfDay);
    const avg = (pid?: PlatformId): number | null => {
      const rows = pid ? slotRows.filter((r) => r.platformId === pid) : slotRows;
      if (rows.length === 0) return null;
      return Math.round(rows.reduce((a, b) => a + b.fare, 0) / rows.length);
    };
    const dominantPeriod: 'Peak' | 'Moderate' | 'Off-Peak' =
      slotRows.filter((r) => r.periodType === 'Peak').length >= slotRows.length / 2
        ? 'Peak'
        : slot.periodType;

    return {
      timeLabel: slot.timeOfDay,
      hour: slot.hour,
      periodType: dominantPeriod,
      averageFare: avg() ?? 0,
      uber: avg('uber'),
      ola: avg('ola'),
      rapido: avg('rapido'),
      blusmart: avg('blusmart'),
      namma_yatri: avg('namma_yatri'),
      meru: avg('meru'),
      goamiles: avg('goamiles'),
    };
  }).filter((row) => row.averageFare > 0);

  // Daily trend across dates in the filtered dataset
  const dateLabelMap = new Map(getRecentDates(7).map((d) => [d.date, d.dayLabel]));
  const dailyTrend = dates
    .map((date) => {
      const dateRows = filtered.filter((r) => r.date === date);
      if (dateRows.length === 0) return null;
      const avg = (pid?: PlatformId): number | null => {
        const rows = pid ? dateRows.filter((r) => r.platformId === pid) : dateRows;
        if (rows.length === 0) return null;
        return Math.round(rows.reduce((a, b) => a + b.fare, 0) / rows.length);
      };
      return {
        date,
        dayLabel: dateLabelMap.get(date) ?? date,
        averageFare: avg() ?? 0,
        uber: avg('uber'),
        ola: avg('ola'),
        rapido: avg('rapido'),
        blusmart: avg('blusmart'),
        namma_yatri: avg('namma_yatri'),
        meru: avg('meru'),
        goamiles: avg('goamiles'),
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // Pick a balanced, deterministic sample of up to 30 rows from filtered records
  const stride = Math.max(1, Math.floor(filtered.length / 30));
  const sampleRecords: HistoricalFareRecord[] = [];
  for (let i = filtered.length - 1; i >= 0 && sampleRecords.length < 30; i -= stride) {
    sampleRecords.push(filtered[i]);
  }

  return {
    isSyntheticDataset: true,
    datasetNotice:
      'Synthetic Historical Dataset: structured multi-day cab fare records modeled from platform tariffs, road distances, and peak/off-peak demand cycles (not live provider logs).',
    totalDatasetRecords: allRecords.length,
    filteredRecordCount: filtered.length,
    filterOptions: {
      dates,
      platforms: PLATFORM_FARE_MODELS.map((m) => ({
        id: m.platformId,
        name: m.platformName,
      })),
      vehicleCategories: (Object.keys(CATEGORY_LABELS) as VehicleCategory[]).map((id) => ({
        id,
        label: CATEGORY_LABELS[id],
      })),
      pickupLocations,
      destinations,
    },
    kpis: {
      averageFare,
      cheapestPlatform: cheapestPlatformRow?.platformName ?? 'N/A',
      cheapestPlatformAvgFare: cheapestPlatformRow?.averageFare ?? 0,
      highestPlatform: highestPlatformRow?.platformName ?? 'N/A',
      highestPlatformAvgFare: highestPlatformRow?.averageFare ?? 0,
      highestRecordedFare,
      estimatedCustomerSavings,
      savingsPercent,
    },
    averageFareByPlatform,
    peakDemandPeriods,
    hourlyPatterns,
    dailyTrend,
    sampleRecords,
  };
}

export function analyzeHistoricalForecast(
  pickup: LocationPoint,
  drop: LocationPoint,
  currentAvgCabFare: number,
  currentDemandFactor: number,
  baseHour: number
): { farePredictions: PredictionPoint[]; predictionMeta: PredictionMeta } {
  if (!Number.isFinite(currentAvgCabFare) || currentAvgCabFare <= 0) {
    return {
      farePredictions: [],
      predictionMeta: {
        direction: 'stable',
        directionLabel: 'Unavailable for Location',
        confidencePercent: 0,
        confidenceLabel: 'Unavailable (Unsupported Region)',
        historicalAvgFare: 0,
        basisSummary: `No supported app-based cab providers operate for ${pickup.city || pickup.area} → ${drop.city || drop.area}.`,
        limitations: [
          'App-based aggregators do not have active coverage in this region.',
          'Local prepaid taxi counters or regulated regional stands may still operate offline.',
        ],
        disclaimer: 'Forecasts are unavailable where no supported cab aggregators operate.',
      },
    };
  }
  const dataset = getSyntheticHistoricalDataset();

  // Prefer synthetic records matching this exact corridor if available; else use all 4-wheeler cab benchmarks
  const exactCorridorRecords = dataset.filter(
    (r) =>
      (r.vehicleCategory === 'hatchback' || r.vehicleCategory === 'ev') &&
      r.pickupLocation === pickup.name &&
      r.destination === drop.name
  );
  const referenceRecords =
    exactCorridorRecords.length > 0
      ? exactCorridorRecords
      : dataset.filter((r) => r.vehicleCategory === 'hatchback' || r.vehicleCategory === 'ev');

  // Measure historical dispersion around the active time window for statistical confidence
  const windowRecords = referenceRecords.filter(
    (r) => Math.abs(r.hour - baseHour) <= 2 || Math.abs(r.hour - baseHour) >= 22
  );
  const sampleSet = windowRecords.length >= 5 ? windowRecords : referenceRecords;

  const meanHist =
    sampleSet.reduce((acc, r) => acc + r.fare, 0) / Math.max(1, sampleSet.length);
  const variance =
    sampleSet.reduce((acc, r) => acc + Math.pow(r.fare - meanHist, 2), 0) /
    Math.max(1, sampleSet.length);
  const stdDev = Math.sqrt(variance);
  const coeffVar = meanHist > 0 ? stdDev / meanHist : 0.15;

  // Higher spread reduces confidence; exact corridor match raises confidence
  const baseConfidence = exactCorridorRecords.length > 0 ? 86 : 76;
  const confidencePercent = Math.max(
    54,
    Math.min(91, Math.round(baseConfidence - coeffVar * 45))
  );
  const confidenceLabel =
    confidencePercent >= 80
      ? `${confidencePercent}% (High Pattern Consistency)`
      : confidencePercent >= 68
        ? `${confidencePercent}% (Moderate Confidence)`
        : `${confidencePercent}% (Lower Confidence — High Variance)`;

  // Interpolate synthetic historical demand at Now, +10m, +15m, +20m, +30m, +45m, +60m
  const offsets = [0, 10, 15, 20, 30, 45, 60];
  const farePredictions: PredictionPoint[] = offsets.map((minutesAhead, idx) => {
    const futureHour = (baseHour + minutesAhead / 60) % 24;
    const morningPeak = Math.exp(-Math.pow((futureHour - 9) / 2.2, 2));
    const eveningPeak = Math.exp(-Math.pow((futureHour - 19) / 2.5, 2));
    const futureDemand = Math.min(1, 0.22 + 0.58 * morningPeak + 0.72 * eveningPeak);

    const deltaRatio = (futureDemand - currentDemandFactor) * 0.42;
    const expectedFare = Math.max(40, Math.round(currentAvgCabFare * (1 + deltaRatio)));
    const spread = Math.max(
      10,
      Math.round(expectedFare * (0.04 + coeffVar * 0.16 + idx * 0.01))
    );
    const surgeProbability = Math.min(95, Math.max(10, Math.round(futureDemand * 90)));

    const trendDirection: 'rising' | 'cooling' | 'stable' =
      expectedFare > currentAvgCabFare * 1.025
        ? 'rising'
        : expectedFare < currentAvgCabFare * 0.975
          ? 'cooling'
          : 'stable';

    return {
      offsetLabel: minutesAhead === 0 ? 'Now' : `+${minutesAhead}m`,
      minutesAhead,
      expectedFare,
      lowEstimate: Math.max(30, expectedFare - spread),
      highEstimate: expectedFare + spread,
      surgeProbability,
      trendDirection,
    };
  });

  const pred30 = farePredictions.find((p) => p.minutesAhead === 30) ?? farePredictions[farePredictions.length - 1];
  const direction: PredictionMeta['direction'] =
    pred30.expectedFare > currentAvgCabFare * 1.025
      ? 'increase'
      : pred30.expectedFare < currentAvgCabFare * 0.975
        ? 'decrease'
        : 'stable';

  const directionLabel =
    direction === 'increase'
      ? 'Likely to Increase'
      : direction === 'decrease'
        ? 'Likely to Decrease'
        : 'Expected to Remain Stable';

  const historicalAvgFare =
    exactCorridorRecords.length > 0
      ? Math.round(meanHist)
      : currentAvgCabFare;

  const basisSummary =
    exactCorridorRecords.length > 0
      ? `Analyzed ${sampleSet.length} matching synthetic historical trips for ${pickup.area} → ${drop.area} around ${String(baseHour).padStart(2, '0')}:00 (historical window average ₹${historicalAvgFare}).`
      : `Analyzed ${sampleSet.length} synthetic metro cab records around ${String(baseHour).padStart(2, '0')}:00 calibrated to this ${pickup.area} → ${drop.area} distance and tariff curve.`;

  return {
    farePredictions,
    predictionMeta: {
      direction,
      directionLabel,
      confidencePercent,
      confidenceLabel,
      historicalAvgFare,
      basisSummary,
      limitations: [
        'Forecasts are modeled from synthetic historical demand curves, not live Uber, Ola, Rapido, BluSmart, or Namma Yatri dispatch telemetry.',
        'Sudden weather events, traffic incidents, local rallies, or driver availability shifts can cause real-time fares to diverge sharply.',
        'Confidence narrows for shorter horizons (+10m) and widens at +30m due to compounding demand volatility.',
      ],
      disclaimer:
        'Statistical forecast only — not a guaranteed future price. Actual provider quotes may change at booking time.',
    },
  };
}
