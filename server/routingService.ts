import { LocationPoint } from '../src/types/cabfare.ts';
import { haversineKm } from './locations.ts';

export interface RoadRouteResult {
  roadDistanceKm: number;
  straightLineKm: number;
  baseDurationMin: number;
  routeGeometry: [number, number][];
  distanceSource: 'osrm-road-network' | 'road-detour-estimate';
}

const routeCache = new Map<string, RoadRouteResult>();

function makeCacheKey(pickup: LocationPoint, drop: LocationPoint): string {
  return `${pickup.lat.toFixed(4)},${pickup.lng.toFixed(4)}->${drop.lat.toFixed(4)},${drop.lng.toFixed(4)}`;
}

export async function getRoadRoute(
  pickup: LocationPoint,
  drop: LocationPoint
): Promise<RoadRouteResult> {
  const straightLineKm = Number(
    haversineKm(pickup.lat, pickup.lng, drop.lat, drop.lng).toFixed(2)
  );

  // Same-point guard
  if (straightLineKm < 0.15) {
    return {
      roadDistanceKm: 1.0,
      straightLineKm,
      baseDurationMin: 5,
      routeGeometry: [
        [pickup.lat, pickup.lng],
        [drop.lat, drop.lng],
      ],
      distanceSource: 'road-detour-estimate',
    };
  }

  const cacheKey = makeCacheKey(pickup, drop);
  const cached = routeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'CabFare-AI-Academic-App/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as {
        code?: string;
        routes?: Array<{
          distance: number;
          duration: number;
          geometry?: {
            coordinates?: [number, number][];
          };
        }>;
      };

      const bestRoute = data.routes?.[0];
      if (data.code === 'Ok' && bestRoute && Number.isFinite(bestRoute.distance)) {
        const roadDistanceKm = Number(Math.max(0.8, bestRoute.distance / 1000).toFixed(1));
        const baseDurationMin = Math.max(4, Math.round(bestRoute.duration / 60));
        const coords = bestRoute.geometry?.coordinates ?? [];
        const routeGeometry: [number, number][] =
          coords.length >= 2
            ? coords.map(([lng, lat]) => [lat, lng])
            : [
                [pickup.lat, pickup.lng],
                [drop.lat, drop.lng],
              ];

        const result: RoadRouteResult = {
          roadDistanceKm,
          straightLineKm,
          baseDurationMin,
          routeGeometry,
          distanceSource: 'osrm-road-network',
        };

        if (routeCache.size > 150) {
          const firstKey = routeCache.keys().next().value;
          if (firstKey) routeCache.delete(firstKey);
        }
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Fall back to road detour estimation when OSRM is unreachable or route crosses non-drivable ocean
  }

  const fallbackRoadKm = Number(Math.max(1.2, straightLineKm * 1.32).toFixed(1));
  const fallbackDurationMin = Math.max(5, Math.round((fallbackRoadKm / 26) * 60));
  const midLat = (pickup.lat + drop.lat) / 2 + (pickup.lng - drop.lng) * 0.06;
  const midLng = (pickup.lng + drop.lng) / 2 + (drop.lat - pickup.lat) * 0.06;

  return {
    roadDistanceKm: fallbackRoadKm,
    straightLineKm,
    baseDurationMin: fallbackDurationMin,
    routeGeometry: [
      [pickup.lat, pickup.lng],
      [midLat, midLng],
      [drop.lat, drop.lng],
    ],
    distanceSource: 'road-detour-estimate',
  };
}
