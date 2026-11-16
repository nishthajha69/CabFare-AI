export type PlatformId = 'uber' | 'ola' | 'rapido' | 'blusmart' | 'namma_yatri';

export type VehicleCategory = 'bike' | 'auto' | 'hatchback' | 'sedan' | 'suv' | 'ev';

export type ZoneType = 'commercial' | 'airport' | 'metro' | 'residential' | 'tech-park';

export type ScenarioMode = 'live' | 'morning_peak' | 'evening_surge' | 'off_peak';

export type RideMode = 'immediate' | 'scheduled';

export interface SurgeAssumptions {
  peakSurgeMultiplier?: number;
  offPeakMultiplier?: number;
  trafficCongestionFactor?: number;
}

export interface LocationPoint {
  id: string;
  name: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  zoneType: ZoneType;
}

export interface RoutePreset {
  id: string;
  label: string;
  city: string;
  pickup: LocationPoint;
  drop: LocationPoint;
}

export interface FareEstimate {
  id: string;
  platformId: PlatformId;
  platformName: string;
  vehicleType: string;
  category: VehicleCategory;
  categoryLabel: string;
  estimatedFare: number;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  bookingFee: number;
  minimumFare: number;
  minimumFareApplied: boolean;
  airportOrZoneFee: number;
  scheduledWaitMinutes?: number;
  pickupWaitCharge?: number;
  surgeFee: number;
  surgeMultiplier: number;
  perKmRate: number;
  perMinRate: number;
  estimatedDistanceKm: number;
  arrivalMinutes: number;
  journeyMinutes: number;
  availabilityStatus: string;
  availabilitySource: 'simulated';
  reliabilityScore: number;
  cancellationRisk: 'Low' | 'Moderate' | 'High';
  isCheapest: boolean;
  isCheapestInCategory: boolean;
  pricingModel: string;
  notes: string;
}

export interface HistoricalPoint {
  timeLabel: string;
  hour: number;
  uber: number;
  ola: number;
  rapido: number;
  blusmart: number;
  namma_yatri: number;
  demandIndex: number;
}

export interface DailyTrendPoint {
  dayLabel: string;
  averageFare: number;
  uber: number;
  ola: number;
  rapido: number;
  blusmart: number;
  namma_yatri: number;
}

export interface PredictionPoint {
  offsetLabel: string;
  minutesAhead: number;
  expectedFare: number;
  lowEstimate: number;
  highEstimate: number;
  surgeProbability: number;
  trendDirection: 'rising' | 'cooling' | 'stable';
}

export interface AlternativePickup {
  id: string;
  name: string;
  description: string;
  walkMeters: number;
  walkMinutes: number;
  lat: number;
  lng: number;
  bestPlatform: string;
  newFare: number;
  savings: number;
  reason: string;
}

export interface FareSummary {
  cheapestPlatform: string;
  cheapestPlatformId: PlatformId;
  cheapestVehicleType: string;
  cheapestFare: number;
  cheapestCabPlatform: string;
  cheapestCabFare: number;
  averageFare: number;
  highestPlatform: string;
  highestFare: number;
  estimatedSavings: number;
  savingsPercent: number;
}

export interface HistoricalFareRecord {
  id: string;
  platformId: PlatformId;
  platformName: string;
  pickupLocation: string;
  destination: string;
  vehicleType: string;
  vehicleCategory: VehicleCategory;
  distanceKm: number;
  durationMin: number;
  timeOfDay: string;
  hour: number;
  periodType: 'Peak' | 'Moderate' | 'Off-Peak';
  date: string;
  fare: number;
  surgeMultiplier: number;
  isSynthetic: true;
}

export interface PredictionMeta {
  direction: 'increase' | 'decrease' | 'stable';
  directionLabel: string;
  confidencePercent: number;
  confidenceLabel: string;
  historicalAvgFare: number;
  basisSummary: string;
  limitations: string[];
  disclaimer: string;
}

export interface AnalyticsFilters {
  date: string;
  platformId: 'all' | PlatformId;
  vehicleCategory: 'all' | VehicleCategory;
  pickupLocation: string;
  destination: string;
}

export interface PlatformAnalyticsRow {
  platformId: PlatformId;
  platformName: string;
  averageFare: number;
  minFare: number;
  maxFare: number;
  avgSurge: number;
  recordCount: number;
}

export interface PeakDemandPeriodRow {
  periodLabel: string;
  timeRange: string;
  periodType: 'Peak' | 'Moderate' | 'Off-Peak';
  averageFare: number;
  avgSurge: number;
  recordCount: number;
}

export interface AnalyticsSummaryResponse {
  isSyntheticDataset: true;
  datasetNotice: string;
  totalDatasetRecords: number;
  filteredRecordCount: number;
  filterOptions: {
    dates: string[];
    platforms: { id: PlatformId; name: string }[];
    vehicleCategories: { id: VehicleCategory; label: string }[];
    pickupLocations: string[];
    destinations: string[];
  };
  kpis: {
    averageFare: number;
    cheapestPlatform: string;
    cheapestPlatformAvgFare: number;
    highestPlatform: string;
    highestPlatformAvgFare: number;
    highestRecordedFare: number;
    estimatedCustomerSavings: number;
    savingsPercent: number;
  };
  averageFareByPlatform: PlatformAnalyticsRow[];
  peakDemandPeriods: PeakDemandPeriodRow[];
  hourlyPatterns: Array<{
    timeLabel: string;
    hour: number;
    periodType: 'Peak' | 'Moderate' | 'Off-Peak';
    averageFare: number;
    uber: number | null;
    ola: number | null;
    rapido: number | null;
    blusmart: number | null;
    namma_yatri: number | null;
  }>;
  dailyTrend: Array<{
    date: string;
    dayLabel: string;
    averageFare: number;
    uber: number | null;
    ola: number | null;
    rapido: number | null;
    blusmart: number | null;
    namma_yatri: number | null;
  }>;
  sampleRecords: HistoricalFareRecord[];
}

export interface FareComparisonResponse {
  route: {
    pickup: LocationPoint;
    drop: LocationPoint;
    distanceKm: number;
    roadDistanceKm: number;
    straightLineKm: number;
    distanceSource: 'osrm-road-network' | 'road-detour-estimate';
    routeGeometry: [number, number][];
    estimatedDurationMin: number;
    trafficLevel: 'Low' | 'Moderate' | 'Heavy';
    scenario: ScenarioMode;
    rideMode: RideMode;
    timeWindowLabel: string;
    surgeConfig: {
      activePeriod: 'Peak' | 'Moderate' | 'Off-Peak';
      peakSurgeMultiplier: number;
      offPeakMultiplier: number;
      trafficCongestionFactor: number;
    };
  };
  fares: FareEstimate[];
  platformBenchmarks: FareEstimate[];
  supportedCategoriesByPlatform: Record<PlatformId, VehicleCategory[]>;
  summary: FareSummary;
  priceHistory24h: HistoricalPoint[];
  priceHistory7d: DailyTrendPoint[];
  farePredictions: PredictionPoint[];
  predictionMeta: PredictionMeta;
  alternativePickups: AlternativePickup[];
  simulatedNotice: string;
}

export type AIActionType =
  | 'Book Now'
  | 'Wait 10 Minutes'
  | 'Consider Another Platform'
  | 'Choose Another Platform'
  | 'Cheapest Available Ride';

export interface AIRecommendation {
  action: AIActionType;
  recommendedPlatform: string;
  recommendedVehicle?: string;
  estimatedFare: number;
  potentialSavings: number;
  reasoning: string;
  keyFactors: string[];
  confidenceLabel: string;
  generatedAt: string;
  source: 'gemini' | 'analytical-fallback';
  notice?: string;
}

export interface FareAlert {
  id: string;
  pickup: LocationPoint;
  drop: LocationPoint;
  pickupName: string;
  dropName: string;
  targetFare: number;
  preferredPlatform: 'any' | PlatformId;
  preferredPlatformLabel: string;
  vehicleCategory: 'any' | VehicleCategory;
  vehicleCategoryLabel: string;
  isPaused: boolean;
  status: 'monitoring' | 'triggered' | 'paused';
  latestEstimatedFare?: number;
  previousEstimatedFare?: number;
  matchedPlatformName?: string;
  matchedVehicleType?: string;
  potentialSavings?: number;
  unavailableReason?: string;
  lastCheckedAt?: string;
  triggeredAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  title: string;
  message: string;
  platformName: string;
  vehicleType: string;
  targetFare: number;
  estimatedFare: number;
  potentialSavings: number;
  pickupName: string;
  dropName: string;
  createdAt: string;
  isSimulated: true;
}

export interface AlertWorkflowSummary {
  lastEvaluatedAt: string;
  routeLabel: string;
  latestBestFare: number;
  activeCheckedCount: number;
  matchedCount: number;
  triggeredCount: number;
  notificationsGenerated: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'gemini' | 'analytical-fallback';
  notice?: string;
}
