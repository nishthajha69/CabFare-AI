import {
  AIRecommendation,
  AnalyticsFilters,
  AnalyticsSummaryResponse,
  ChatMessage,
  FareComparisonResponse,
  LocationPoint,
  RideMode,
  RoutePreset,
  ScenarioMode,
  SurgeAssumptions,
} from '../types/cabfare';

export async function fetchRoutePresets(): Promise<{
  presets: RoutePreset[];
  popular: LocationPoint[];
}> {
  const res = await fetch('/api/locations/presets');
  if (!res.ok) {
    throw new Error('Failed to load route presets');
  }
  return res.json();
}

export async function searchLocations(query: string): Promise<LocationPoint[]> {
  const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to search locations');
  }
  const data = (await res.json()) as { results: LocationPoint[] };
  return data.results;
}

export async function reverseGeocode(lat: number, lng: number): Promise<LocationPoint> {
  const res = await fetch(`/api/locations/reverse?lat=${lat}&lng=${lng}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to resolve current coordinates');
  }
  const data = (await res.json()) as { location: LocationPoint };
  return data.location;
}

export async function fetchFareComparison(
  pickup: LocationPoint,
  drop: LocationPoint,
  scenario: ScenarioMode,
  surgeAssumptions?: SurgeAssumptions,
  rideMode: RideMode = 'immediate'
): Promise<FareComparisonResponse> {
  const res = await fetch('/api/fares/compare', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pickup, drop, scenario, surgeAssumptions, rideMode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to compare cab fares');
  }
  return res.json();
}

function compactComparisonForAI(
  comparison: FareComparisonResponse
): FareComparisonResponse {
  return {
    ...comparison,
    route: {
      ...comparison.route,
      routeGeometry: [],
    },
    priceHistory24h: [],
    priceHistory7d: [],
  };
}

export async function fetchAIRecommendation(
  comparison: FareComparisonResponse,
  targetFare?: number
): Promise<AIRecommendation> {
  const res = await fetch('/api/ai/recommend', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comparison: compactComparisonForAI(comparison),
      targetFare,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate AI recommendation');
  }
  return res.json();
}

export async function sendAssistantMessage(
  question: string,
  history: ChatMessage[],
  comparison?: FareComparisonResponse,
  targetFare?: number,
  recommendation?: AIRecommendation | null
): Promise<{
  reply: string;
  source: 'gemini' | 'analytical-fallback';
  notice?: string;
}> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      history,
      comparison: comparison ? compactComparisonForAI(comparison) : undefined,
      targetFare,
      recommendation: recommendation ?? undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ride Assistant failed to respond');
  }
  return res.json();
}

export async function fetchAnalyticsData(
  filters: Partial<AnalyticsFilters> = {}
): Promise<AnalyticsSummaryResponse> {
  const params = new URLSearchParams();
  if (filters.date && filters.date !== 'all') params.set('date', filters.date);
  if (filters.platformId && filters.platformId !== 'all') params.set('platformId', filters.platformId);
  if (filters.vehicleCategory && filters.vehicleCategory !== 'all')
    params.set('vehicleCategory', filters.vehicleCategory);
  if (filters.pickupLocation && filters.pickupLocation !== 'all')
    params.set('pickupLocation', filters.pickupLocation);
  if (filters.destination && filters.destination !== 'all')
    params.set('destination', filters.destination);

  const qs = params.toString();
  const res = await fetch(`/api/analytics${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to load synthetic historical analytics');
  }
  return res.json();
}
