import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { compareFares } from './server/fareEngine.ts';
import {
  chatWithFareAssistant,
  GeminiHttpError,
  generateRideRecommendation,
} from './server/geminiService.ts';
import {
  classifyZoneType,
  CURATED_LOCATIONS,
  findNearestHub,
  isInsideIndia,
  ROUTE_PRESETS,
  searchLocalLocations,
} from './server/locations.ts';
import { queryAnalyticsDataset } from './server/historicalDataset.ts';
import {
  AIRecommendation,
  ChatMessage,
  CustomPlatformRatesMap,
  FareComparisonResponse,
  LocationPoint,
  PlatformId,
  RideMode,
  ScenarioMode,
  SurgeAssumptions,
  VehicleCategory,
} from './src/types/cabfare.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Allow browser geolocation inside iframe and HTTPS deployments
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=*');
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'CabFare AI' });
  });

  // Presets & curated location catalog
  app.get('/api/locations/presets', (_req, res) => {
    res.json({
      presets: ROUTE_PRESETS,
      popular: CURATED_LOCATIONS,
    });
  });

  // Location autocomplete (PAN-India local curated hubs + Nominatim OSM + Photon fallback)
  app.get('/api/locations/search', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const localMatches = searchLocalLocations(q);

    if (q.length < 3) {
      return res.json({ results: localMatches });
    }

    const merged: LocationPoint[] = [...localMatches];
    const pushUnique = (loc: LocationPoint) => {
      if (
        !merged.some(
          (m) =>
            m.name.toLowerCase() === loc.name.toLowerCase() ||
            (Math.abs(m.lat - loc.lat) < 0.004 && Math.abs(m.lng - loc.lng) < 0.004)
        )
      ) {
        merged.push(loc);
      }
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3200);
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`;
      const osmRes = await fetch(url, {
        headers: {
          'User-Agent': 'CabFare-AI-Academic-App/1.0',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (osmRes.ok) {
        const osmData = (await osmRes.json()) as Array<{
          place_id: number;
          display_name: string;
          name?: string;
          lat: string;
          lon: string;
          address?: {
            suburb?: string;
            neighbourhood?: string;
            city_district?: string;
            city?: string;
            town?: string;
            village?: string;
            county?: string;
            state_district?: string;
            state?: string;
            country?: string;
          };
        }>;

        for (const item of osmData) {
          const parts = item.display_name.split(',').map((s) => s.trim());
          const addr = item.address;
          const areaPart =
            addr?.suburb ||
            addr?.neighbourhood ||
            addr?.city_district ||
            parts[1] ||
            parts[0] ||
            'Area';
          const cityPart =
            addr?.city ||
            addr?.town ||
            addr?.village ||
            addr?.state_district ||
            addr?.county ||
            parts[2] ||
            parts[1] ||
            'India';
          const statePart = addr?.state || (parts.length >= 2 ? parts[parts.length - 2] : undefined);

          pushUnique({
            id: `osm-${item.place_id}`,
            name: item.name || parts.slice(0, 2).join(', '),
            area: areaPart,
            city: cityPart,
            state: statePart,
            lat: Number(item.lat),
            lng: Number(item.lon),
            zoneType: classifyZoneType(item.display_name),
          });
        }
      }
    } catch {
      // Fall through to Photon fallback
    }

    // Secondary open geocoder for Indian addresses & Tier 2/3 landmarks when results are sparse
    if (merged.length < 4) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2600);
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(`${q}, India`)}&limit=5&lat=22.5937&lon=78.9629&lang=en`;
        const photonRes = await fetch(photonUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (photonRes.ok) {
          const pData = (await photonRes.json()) as {
            features?: Array<{
              geometry?: { coordinates?: [number, number] };
              properties?: {
                osm_id?: number;
                name?: string;
                street?: string;
                district?: string;
                locality?: string;
                city?: string;
                county?: string;
                state?: string;
                country?: string;
              };
            }>;
          };

          for (const feat of pData.features ?? []) {
            const coords = feat.geometry?.coordinates;
            const props = feat.properties;
            if (!coords || !props) continue;
            const [lon, lat] = coords;
            if (!isInsideIndia(lat, lon)) continue;
            const title = props.name || props.street || props.locality || props.city;
            if (!title) continue;
            const cityVal = props.city || props.county || props.state || 'India';
            const areaVal = props.district || props.locality || props.street || cityVal;
            pushUnique({
              id: `photon-${props.osm_id ?? `${lat.toFixed(4)}-${lon.toFixed(4)}`}`,
              name: props.district && props.name ? `${props.name}, ${props.district}` : title,
              area: areaVal,
              city: cityVal,
              state: props.state,
              lat,
              lng: lon,
              zoneType: classifyZoneType(`${title} ${areaVal}`),
            });
          }
        }
      } catch {
        // Ignore Photon network timeout
      }
    }

    return res.json({ results: merged.slice(0, 10) });
  });

  // Reverse geocode for browser geolocation
  app.get('/api/locations/reverse', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
    }

    // 1. Primary reverse geocode: OpenStreetMap Nominatim
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`;
      const osmRes = await fetch(url, {
        headers: {
          'User-Agent': 'CabFare-AI-Academic-App/1.0',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (osmRes.ok) {
        const data = (await osmRes.json()) as {
          display_name?: string;
          name?: string;
          address?: {
            house_number?: string;
            road?: string;
            residential?: string;
            neighbourhood?: string;
            suburb?: string;
            city_district?: string;
            town?: string;
            village?: string;
            city?: string;
            county?: string;
            state_district?: string;
            state?: string;
            country?: string;
          };
        };

        const addr = data.address;
        const streetPart = [addr?.house_number, addr?.road].filter(Boolean).join(' ').trim();
        const localityPart =
          addr?.neighbourhood ||
          addr?.suburb ||
          addr?.residential ||
          addr?.city_district ||
          addr?.village ||
          addr?.town ||
          '';
        const cityPart =
          addr?.city ||
          addr?.town ||
          addr?.village ||
          addr?.county ||
          addr?.state_district ||
          addr?.state ||
          '';

        let readableName = [streetPart || data.name, localityPart].filter(Boolean).join(', ');
        if (!readableName && data.display_name) {
          readableName = data.display_name
            .split(',')
            .map((s) => s.trim())
            .slice(0, 2)
            .join(', ');
        }

        if (readableName) {
          return res.json({
            location: {
              id: `gps-${Date.now()}`,
              name: readableName,
              area: localityPart || cityPart || 'Detected Location',
              city: cityPart || addr?.country || 'GPS',
              state: addr?.state,
              lat,
              lng,
              zoneType: classifyZoneType(data.display_name || readableName),
            } satisfies LocationPoint,
          });
        }
      }
    } catch {
      // Proceed to secondary reverse geocode provider
    }

    // 2. Secondary reverse geocode fallback: BigDataCloud
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const bdcRes = await fetch(bdcUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (bdcRes.ok) {
        const bdc = (await bdcRes.json()) as {
          locality?: string;
          city?: string;
          principalSubdivision?: string;
          countryName?: string;
        };
        const nameParts = [bdc.locality, bdc.city].filter(
          (v, i, arr) => Boolean(v) && arr.indexOf(v) === i
        );
        if (nameParts.length > 0) {
          return res.json({
            location: {
              id: `gps-${Date.now()}`,
              name: nameParts.join(', '),
              area: bdc.locality || bdc.city || 'Detected Location',
              city: bdc.city || bdc.principalSubdivision || bdc.countryName || 'GPS',
              state: bdc.principalSubdivision,
              lat,
              lng,
              zoneType: classifyZoneType(nameParts.join(' ')),
            } satisfies LocationPoint,
          });
        }
      }
    } catch {
      // Proceed to honest coordinate fallback
    }

    return res.json({ location: findNearestHub(lat, lng) });
  });

  // Compare fares across supported city providers + history + predictions + alternative pickups
  app.post('/api/fares/compare', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { pickup, drop, scenario, surgeAssumptions, rideMode, customRates } = req.body as {
      pickup?: LocationPoint;
      drop?: LocationPoint;
      scenario?: ScenarioMode;
      surgeAssumptions?: SurgeAssumptions;
      rideMode?: RideMode;
      customRates?: CustomPlatformRatesMap;
    };

    if (
      !pickup ||
      !drop ||
      !Number.isFinite(pickup.lat) ||
      !Number.isFinite(pickup.lng) ||
      !Number.isFinite(drop.lat) ||
      !Number.isFinite(drop.lng)
    ) {
      return res.status(400).json({
        error: 'Both pickup and drop locations with valid coordinates are required.',
      });
    }

    const normalizedRideMode: RideMode =
      rideMode === 'scheduled' ? 'scheduled' : 'immediate';

    try {
      const result = await compareFares(
        pickup,
        drop,
        scenario || 'live',
        surgeAssumptions,
        normalizedRideMode,
        customRates
      );
      return res.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to calculate road fares for this route.';
      return res.status(500).json({ error: message });
    }
  });

  // Synthetic Historical Fare Analytics & Multi-Filter Query
  app.get('/api/analytics', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const date = String(req.query.date ?? 'all');
    const platformId = String(req.query.platformId ?? 'all') as 'all' | PlatformId;
    const vehicleCategory = String(req.query.vehicleCategory ?? 'all') as 'all' | VehicleCategory;
    const pickupLocation = String(req.query.pickupLocation ?? 'all');
    const destination = String(req.query.destination ?? 'all');

    const analytics = queryAnalyticsDataset({
      date,
      platformId,
      vehicleCategory,
      pickupLocation,
      destination,
    });
    return res.json(analytics);
  });

  // Gemini AI Recommendation Engine
  app.post('/api/ai/recommend', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { comparison, targetFare } = req.body as {
      comparison?: FareComparisonResponse;
      targetFare?: number;
    };

    if (!comparison || !comparison.route) {
      return res.status(400).json({ error: 'Fare comparison data is required for AI analysis.' });
    }

    try {
      const recommendation = await generateRideRecommendation(comparison, targetFare);
      return res.json(recommendation);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI recommendation.';
      return res.status(500).json({ error: message });
    }
  });

  // Gemini AI Conversational Ride Assistant
  app.post('/api/ai/chat', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { question, history, comparison, targetFare, recommendation } = req.body as {
      question?: string;
      history?: ChatMessage[];
      comparison?: FareComparisonResponse;
      targetFare?: number;
      recommendation?: AIRecommendation | null;
    };

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Please enter a question for the Ride Assistant.' });
    }

    try {
      const result = await chatWithFareAssistant(
        question.trim(),
        Array.isArray(history) ? history : [],
        comparison,
        targetFare,
        recommendation ?? undefined
      );
      return res.json(result);
    } catch (err) {
      const status = err instanceof GeminiHttpError ? err.status : 500;
      const message =
        err instanceof Error ? err.message : 'Unable to reach AI Ride Assistant right now.';
      return res.status(status).json({ error: message });
    }
  });

  // Clean JSON error handler for malformed payloads or unexpected /api errors
  app.use('/api', (err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 400;
    const message =
      err instanceof Error ? err.message : 'Invalid API request payload.';
    return res.status(status).json({ error: message });
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CabFare AI server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CabFare AI server:', err);
  process.exit(1);
});
