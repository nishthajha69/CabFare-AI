import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { AlternativePickup, LocationPoint } from '../types/cabfare';

interface RouteMapProps {
  pickup: LocationPoint;
  drop: LocationPoint;
  distanceKm: number;
  distanceSource?: 'osrm-road-network' | 'road-detour-estimate';
  routeGeometry?: [number, number][];
  estimatedDurationMin: number;
  trafficLevel: 'Low' | 'Moderate' | 'Heavy';
  alternativePickups?: AlternativePickup[];
  highlightedAltId?: string | null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPinIcon(color: string, label: string) {
  return L.divIcon({
    className: 'custom-cabfare-marker',
    html: `<div style="display:flex;align-items:center;gap:4px;transform:translate(-12px,-28px);">
      <div style="width:24px;height:24px;border-radius:9999px;background:${color};border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(15,23,42,0.28);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;">${label}</div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

const TRAFFIC_STYLES: Record<
  'Low' | 'Moderate' | 'Heavy',
  { stroke: string; textClass: string; description: string }
> = {
  Low: {
    stroke: '#16A34A',
    textClass: 'font-semibold text-emerald-700',
    description: 'Smooth flow, minimal delay',
  },
  Moderate: {
    stroke: '#2563EB',
    textClass: 'font-semibold text-blue-700',
    description: 'Standard urban pace',
  },
  Heavy: {
    stroke: '#D97706',
    textClass: 'font-semibold text-amber-700',
    description: 'Peak congestion & surge',
  },
};

export function RouteMap({
  pickup,
  drop,
  distanceKm,
  distanceSource = 'osrm-road-network',
  routeGeometry,
  estimatedDurationMin,
  trafficLevel,
  alternativePickups = [],
  highlightedAltId,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([pickup.lat, pickup.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const pickupMarker = L.marker([pickup.lat, pickup.lng], {
      icon: createPinIcon('#2563EB', 'P'),
    }).bindPopup(`<strong>Pickup</strong><br/>${escapeHtml(pickup.name)}`);

    const dropMarker = L.marker([drop.lat, drop.lng], {
      icon: createPinIcon('#16A34A', 'D'),
    }).bindPopup(`<strong>Destination</strong><br/>${escapeHtml(drop.name)}`);

    pickupMarker.addTo(group);
    dropMarker.addTo(group);

    const polylineCoords: [number, number][] =
      routeGeometry && routeGeometry.length >= 2
        ? routeGeometry
        : [
            [pickup.lat, pickup.lng],
            [drop.lat, drop.lng],
          ];

    const routeLine = L.polyline(polylineCoords, {
      color: TRAFFIC_STYLES[trafficLevel].stroke,
      weight: 4.5,
      opacity: 0.88,
      dashArray: distanceSource === 'osrm-road-network' ? undefined : '8, 6',
    }).bindPopup(
      `<strong>${trafficLevel} Traffic Corridor</strong><br/>${distanceKm} km road distance · Est. ${estimatedDurationMin} min`
    );
    routeLine.addTo(group);

    const bounds = L.latLngBounds(polylineCoords);

    alternativePickups.forEach((alt, index) => {
      const isHighlighted = highlightedAltId === alt.id;
      const altMarker = L.marker([alt.lat, alt.lng], {
        icon: createPinIcon(isHighlighted ? '#0F172A' : '#64748B', `A${index + 1}`),
      }).bindPopup(
        `<strong>${escapeHtml(alt.name)}</strong><br/>Walk ${alt.walkMinutes} min · Simulated savings ₹${alt.savings}`
      );
      altMarker.addTo(group);
      if (isHighlighted) {
        altMarker.openPopup();
      }
    });

    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 14 });
  }, [
    pickup,
    drop,
    distanceKm,
    distanceSource,
    routeGeometry,
    estimatedDurationMin,
    trafficLevel,
    alternativePickups,
    highlightedAltId,
  ]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900">
            Interactive Route Map
          </h2>
          <p className="text-xs text-slate-500">
            {pickup.area} ({pickup.city}{pickup.state ? `, ${pickup.state}` : ''}) to {drop.area} ({drop.city}) ·{' '}
            {distanceSource === 'osrm-road-network' ? 'Actual Road Route' : 'Estimated Road Path'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 tabular-nums font-mono">
          <span>{distanceKm} km</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>{estimatedDurationMin} min</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className={TRAFFIC_STYLES[trafficLevel].textClass}>
            {trafficLevel} Traffic
          </span>
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}&destination=${drop.lat},${drop.lng}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-sans text-[11px] font-semibold text-blue-700 hover:bg-blue-50 whitespace-nowrap"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div ref={mapContainerRef} className="h-[320px] w-full bg-slate-100" />

      {/* Descriptive Map & Traffic Legend */}
      <div
        aria-label="Map markers and traffic legend"
        className="space-y-2.5 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-600"
      >
        {/* Markers Row */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="font-semibold text-slate-700">Markers:</span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
              >
                P
              </span>
              <span>Pickup origin</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white"
              >
                D
              </span>
              <span>Destination drop-off</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 text-[10px] font-bold text-white"
              >
                A
              </span>
              <span>Lower-fare nearby pickups (hover/click to inspect)</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500">OpenStreetMap via Leaflet</span>
        </div>

        {/* Traffic Color Visualization Row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-200/70 pt-2">
          <span className="font-semibold text-slate-700">Route Traffic:</span>
          {(['Low', 'Moderate', 'Heavy'] as const).map((level) => {
            const style = TRAFFIC_STYLES[level];
            const isActive = trafficLevel === level;
            return (
              <span
                key={level}
                className={`inline-flex items-center gap-1.5 ${
                  isActive ? 'font-semibold text-slate-900' : 'text-slate-500'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="inline-block w-5 border-t-[3px] border-dashed"
                  style={{ borderColor: style.stroke }}
                />
                <span>
                  {level} — {style.description}
                  {isActive ? ' (Active)' : ''}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
