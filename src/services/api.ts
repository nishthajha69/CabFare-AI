import {
  AIRecommendation,
  AnalyticsFilters,
  AnalyticsSummaryResponse,
  ChatMessage,
  CustomPlatformRatesMap,
  FareComparisonResponse,
  LocationPoint,
  RideMode,
  RoutePreset,
  ScenarioMode,
  SurgeAssumptions,
} from '../types/cabfare';

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out while waiting for server response. Please try again.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchRoutePresets(): Promise<{
  presets: RoutePreset[];
  popular: LocationPoint[];
}> {
  const res = await fetchWithTimeout('/api/locations/presets', {}, 8000);
  if (!res.ok) {
    throw new Error('Failed to load route presets');
  }
  const data = (await res.json()) as {
    presets?: RoutePreset[];
    popular?: LocationPoint[];
  };
  return {
    presets: Array.isArray(data?.presets) ? data.presets : [],
    popular: Array.isArray(data?.popular) ? data.popular : [],
  };
}

export async function searchLocations(query: string): Promise<LocationPoint[]> {
  const res = await fetchWithTimeout(
    `/api/locations/search?q=${encodeURIComponent(query)}`,
    { cache: 'no-store' },
    8000
  );
  if (!res.ok) {
    throw new Error('Failed to search locations');
  }
  const data = (await res.json()) as { results?: LocationPoint[] };
  return Array.isArray(data?.results) ? data.results : [];
}

export async function reverseGeocode(lat: number, lng: number): Promise<LocationPoint> {
  const res = await fetchWithTimeout(
    `/api/locations/reverse?lat=${lat}&lng=${lng}`,
    { cache: 'no-store' },
    9000
  );
  if (!res.ok) {
    throw new Error('Failed to resolve current coordinates');
  }
  const data = (await res.json()) as { location?: LocationPoint };
  if (!data?.location) {
    throw new Error('Location lookup returned no address details.');
  }
  return data.location;
}

export async function fetchFareComparison(
  pickup: LocationPoint,
  drop: LocationPoint,
  scenario: ScenarioMode,
  surgeAssumptions?: SurgeAssumptions,
  rideMode: RideMode = 'immediate',
  customRates?: CustomPlatformRatesMap
): Promise<FareComparisonResponse> {
  const res = await fetchWithTimeout(
    '/api/fares/compare',
    {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup,
        drop,
        scenario,
        surgeAssumptions,
        rideMode,
        customRates,
      }),
    },
    15000
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to compare cab fares');
  }
  const data = (await res.json()) as FareComparisonResponse;
  if (!data || !Array.isArray(data.fares) || !data.route || !data.summary) {
    throw new Error('Fare comparison API returned an incomplete response. Please retry.');
  }
  return data;
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
  const res = await fetchWithTimeout(
    '/api/ai/recommend',
    {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comparison: compactComparisonForAI(comparison),
        targetFare,
      }),
    },
    15000
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate AI recommendation');
  }
  const data = (await res.json()) as AIRecommendation;
  if (!data || !data.action || !data.recommendedPlatform) {
    throw new Error('AI recommendation response was incomplete.');
  }
  return data;
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
  const res = await fetchWithTimeout(
    '/api/ai/chat',
    {
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
    },
    18000
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ride Assistant failed to respond');
  }
  const data = (await res.json()) as {
    reply?: string;
    source?: 'gemini' | 'analytical-fallback';
    notice?: string;
  };
  if (!data?.reply) {
    throw new Error('Ride Assistant returned an empty response.');
  }
  return {
    reply: data.reply,
    source: data.source ?? 'analytical-fallback',
    notice: data.notice,
  };
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
  const res = await fetchWithTimeout(
    `/api/analytics${qs ? `?${qs}` : ''}`,
    { cache: 'no-store' },
    10000
  );
  if (!res.ok) {
    throw new Error('Failed to load synthetic historical analytics');
  }
  return res.json();
}
