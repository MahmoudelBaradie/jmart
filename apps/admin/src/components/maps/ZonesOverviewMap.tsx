'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * Read-only multi-polygon overview. Click a polygon → onSelect(zoneId).
 *
 * Separate from ZoneMapEditor because:
 *  - No drawing toolbar => smaller bundle (no leaflet-draw)
 *  - Different lifecycle: we re-render whenever the zones list changes
 */
export interface ZonesOverviewMapProps {
  zones: Array<{
    id: string;
    zoneCode: string;
    zoneName: string;
    zoneNameAr?: string | null;
    boundaryGeoJson?: any;
    centroidLat?: number | string | null;
    centroidLng?: number | string | null;
  }>;
  onSelect?: (zoneId: string) => void;
  height?: number;
}

// Deterministic palette so the same zone keeps the same color across renders.
const PALETTE = ['#16a34a', '#2563eb', '#dc2626', '#ea580c', '#9333ea', '#0891b2', '#ca8a04', '#be185d'];
const colorFor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export default function ZonesOverviewMap({ zones, onSelect, height = 480 }: ZonesOverviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current).setView([23.8859, 45.0792], 6);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      }).addTo(map);

      const all: any[] = [];
      zones.forEach((z) => {
        const color = colorFor(z.id);
        if (z.boundaryGeoJson?.coordinates) {
          try {
            const layer = L.geoJSON(z.boundaryGeoJson, {
              style: { color, weight: 2, fillOpacity: 0.25 },
            })
              .bindTooltip(`${z.zoneNameAr || z.zoneName} (${z.zoneCode})`, { sticky: true })
              .on('click', () => onSelect?.(z.id))
              .addTo(map);
            all.push(layer);
          } catch { /* skip bad geojson */ }
        } else if (z.centroidLat && z.centroidLng) {
          // Legacy point-only zones — show a small marker so they're visible.
          const m = L.circleMarker([Number(z.centroidLat), Number(z.centroidLng)], {
            radius: 6, color, fillOpacity: 0.7,
          })
            .bindTooltip(`${z.zoneNameAr || z.zoneName} (point only)`)
            .on('click', () => onSelect?.(z.id))
            .addTo(map);
          all.push(m);
        }
      });

      // Auto-fit to all polygons combined, falling back to default view.
      if (all.length) {
        const group = L.featureGroup(all);
        try { map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 11 }); } catch { /* fallback to default view */ }
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones.map((z) => z.id).join('|')]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}
    />
  );
}
