import { LocationPoint, RoutePreset } from '../src/types/cabfare.ts';

export const CURATED_LOCATIONS: LocationPoint[] = [
  // Bengaluru
  {
    id: 'blr-indiranagar',
    name: 'Indiranagar 100 Feet Road',
    area: 'Indiranagar',
    city: 'Bengaluru',
    lat: 12.9784,
    lng: 77.6408,
    zoneType: 'commercial',
  },
  {
    id: 'blr-koramangala',
    name: 'Koramangala 4th Block (Sony Signal)',
    area: 'Koramangala',
    city: 'Bengaluru',
    lat: 12.9352,
    lng: 77.6245,
    zoneType: 'commercial',
  },
  {
    id: 'blr-kia',
    name: 'Kempegowda International Airport (BLR)',
    area: 'Devanahalli',
    city: 'Bengaluru',
    lat: 13.1986,
    lng: 77.7066,
    zoneType: 'airport',
  },
  {
    id: 'blr-ecity',
    name: 'Electronic City Phase 1',
    area: 'Electronic City',
    city: 'Bengaluru',
    lat: 12.8452,
    lng: 77.6602,
    zoneType: 'tech-park',
  },
  {
    id: 'blr-whitefield',
    name: 'Whitefield ITPL Main Gate',
    area: 'Whitefield',
    city: 'Bengaluru',
    lat: 12.9855,
    lng: 77.7363,
    zoneType: 'tech-park',
  },
  {
    id: 'blr-mgroad',
    name: 'MG Road Metro Station',
    area: 'Central Business District',
    city: 'Bengaluru',
    lat: 12.9756,
    lng: 77.6066,
    zoneType: 'metro',
  },
  {
    id: 'blr-hsr',
    name: 'HSR Layout 27th Main',
    area: 'HSR Layout',
    city: 'Bengaluru',
    lat: 12.9121,
    lng: 77.6446,
    zoneType: 'residential',
  },
  {
    id: 'blr-manyata',
    name: 'Manyata Tech Park',
    area: 'Nagawara',
    city: 'Bengaluru',
    lat: 13.0458,
    lng: 77.6203,
    zoneType: 'tech-park',
  },
  {
    id: 'blr-majestic',
    name: 'Kempegowda Bus Station (Majestic)',
    area: 'Gandhi Nagar',
    city: 'Bengaluru',
    lat: 12.9767,
    lng: 77.5713,
    zoneType: 'metro',
  },
  {
    id: 'blr-jayanagar',
    name: 'Jayanagar 4th Block Shopping Complex',
    area: 'Jayanagar',
    city: 'Bengaluru',
    lat: 12.9299,
    lng: 77.5838,
    zoneType: 'residential',
  },
  {
    id: 'blr-bellandur',
    name: 'Ecospace Business Park, Bellandur',
    area: 'Outer Ring Road',
    city: 'Bengaluru',
    lat: 12.9261,
    lng: 77.6798,
    zoneType: 'tech-park',
  },

  // Delhi NCR
  {
    id: 'del-cp',
    name: 'Connaught Place (Rajiv Chowk)',
    area: 'Central Delhi',
    city: 'Delhi NCR',
    lat: 28.6328,
    lng: 77.2197,
    zoneType: 'commercial',
  },
  {
    id: 'del-igi-t3',
    name: 'Indira Gandhi International Airport T3',
    area: 'Aerocity',
    city: 'Delhi NCR',
    lat: 28.5562,
    lng: 77.1000,
    zoneType: 'airport',
  },
  {
    id: 'del-cyberhub',
    name: 'DLF Cyber Hub',
    area: 'Gurugram Phase 2',
    city: 'Delhi NCR',
    lat: 28.4950,
    lng: 77.0895,
    zoneType: 'tech-park',
  },
  {
    id: 'del-hauzkhas',
    name: 'Hauz Khas Metro & Village',
    area: 'South Delhi',
    city: 'Delhi NCR',
    lat: 28.5433,
    lng: 77.2067,
    zoneType: 'metro',
  },
  {
    id: 'del-noida18',
    name: 'Noida Sector 18 Market',
    area: 'Noida',
    city: 'Delhi NCR',
    lat: 28.5708,
    lng: 77.3261,
    zoneType: 'commercial',
  },
  {
    id: 'del-saket',
    name: 'Select Citywalk, Saket',
    area: 'Saket',
    city: 'Delhi NCR',
    lat: 28.5286,
    lng: 77.2189,
    zoneType: 'commercial',
  },
  {
    id: 'del-ndls',
    name: 'New Delhi Railway Station',
    area: 'Paharganj',
    city: 'Delhi NCR',
    lat: 28.6429,
    lng: 77.2191,
    zoneType: 'metro',
  },

  // Mumbai
  {
    id: 'bom-bkc',
    name: 'Bandra Kurla Complex (BKC)',
    area: 'Bandra East',
    city: 'Mumbai',
    lat: 19.0653,
    lng: 72.8682,
    zoneType: 'commercial',
  },
  {
    id: 'bom-csmi',
    name: 'Chhatrapati Shivaji Maharaj Airport T2',
    area: 'Sahar, Andheri East',
    city: 'Mumbai',
    lat: 19.0896,
    lng: 72.8656,
    zoneType: 'airport',
  },
  {
    id: 'bom-nariman',
    name: 'Nariman Point',
    area: 'South Mumbai',
    city: 'Mumbai',
    lat: 18.9256,
    lng: 72.8242,
    zoneType: 'commercial',
  },
  {
    id: 'bom-powai',
    name: 'Hiranandani Gardens, Powai',
    area: 'Powai',
    city: 'Mumbai',
    lat: 19.1197,
    lng: 72.9051,
    zoneType: 'tech-park',
  },
  {
    id: 'bom-andheri',
    name: 'Andheri West Station',
    area: 'Andheri',
    city: 'Mumbai',
    lat: 19.1197,
    lng: 72.8464,
    zoneType: 'metro',
  },
  {
    id: 'bom-lowerparel',
    name: 'Lower Parel (Phoenix Palladium)',
    area: 'Lower Parel',
    city: 'Mumbai',
    lat: 18.9949,
    lng: 72.8251,
    zoneType: 'commercial',
  },
];

export const ROUTE_PRESETS: RoutePreset[] = [
  {
    id: 'preset-blr-airport',
    label: 'Indiranagar → BLR Airport',
    city: 'Bengaluru',
    pickup: CURATED_LOCATIONS[0],
    drop: CURATED_LOCATIONS[2],
  },
  {
    id: 'preset-blr-tech',
    label: 'Koramangala → Electronic City',
    city: 'Bengaluru',
    pickup: CURATED_LOCATIONS[1],
    drop: CURATED_LOCATIONS[3],
  },
  {
    id: 'preset-del-cyber',
    label: 'Connaught Place → DLF Cyber Hub',
    city: 'Delhi NCR',
    pickup: CURATED_LOCATIONS[11],
    drop: CURATED_LOCATIONS[13],
  },
  {
    id: 'preset-bom-bkc',
    label: 'Powai → Bandra Kurla Complex',
    city: 'Mumbai',
    pickup: CURATED_LOCATIONS[21],
    drop: CURATED_LOCATIONS[18],
  },
];

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestHub(lat: number, lng: number): LocationPoint {
  let closest = CURATED_LOCATIONS[0];
  let minDist = Infinity;
  for (const loc of CURATED_LOCATIONS) {
    const d = haversineKm(lat, lng, loc.lat, loc.lng);
    if (d < minDist) {
      minDist = d;
      closest = loc;
    }
  }

  if (minDist <= 3) {
    return {
      ...closest,
      id: `gps-${Date.now()}`,
      name: minDist < 0.8 ? closest.name : `Near ${closest.name}`,
      lat,
      lng,
    };
  }

  return {
    id: `gps-${Date.now()}`,
    name: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    area: 'Detected GPS',
    city: 'Current Coordinates',
    lat,
    lng,
    zoneType: 'commercial',
  };
}

export function searchLocalLocations(query: string): LocationPoint[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURATED_LOCATIONS.slice(0, 8);

  const tokens = q.split(/[\s,]+/).filter(Boolean);
  return CURATED_LOCATIONS.filter((loc) => {
    const haystack = `${loc.name} ${loc.area} ${loc.city}`.toLowerCase();
    return haystack.includes(q) || tokens.every((t) => haystack.includes(t));
  }).slice(0, 8);
}
