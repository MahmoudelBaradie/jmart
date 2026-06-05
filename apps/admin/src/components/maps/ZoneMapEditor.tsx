'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

/**
 * Polygon drawing surface for one zone at a time.
 *
 * Why a single self-contained component instead of react-leaflet primitives:
 *  - react-leaflet's <FeatureGroup>+<EditControl> from leaflet-draw plays
 *    badly with Strict Mode (mounts/unmounts duplicate the toolbar).
 *  - Doing the dynamic import here lets the parent page use the editor with
 *    a plain `<ZoneMapEditor>` and no `dynamic(...)` wrapper of its own.
 *
 * The component owns its map instance; the parent only sees GeoJSON in/out.
 */
export interface ZoneMapEditorProps {
  /** Initial polygon (GeoJSON Polygon or MultiPolygon). Undefined → blank canvas. */
  value?: any;
  /** Fires with the latest GeoJSON every time the user draws or edits. */
  onChange: (geoJson: any | null) => void;
  /** Map center [lat, lng]. Defaults to Saudi Arabia. */
  center?: [number, number];
  /** Initial zoom level. Defaults to 6 (country-wide). */
  zoom?: number;
  /** Optional read-only overlay polygons (other zones) for context. */
  overlayZones?: Array<{ id: string; zoneName: string; boundaryGeoJson: any; color?: string }>;
  /** Map height in px. */
  height?: number;
}

export default function ZoneMapEditor({
  value,
  onChange,
  center = [23.8859, 45.0792],
  zoom = 6,
  overlayZones = [],
  height = 420,
}: ZoneMapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawnLayerRef = useRef<any>(null);

  useEffect(() => {
    let L: any;
    let cancelled = false;

    (async () => {
      // Dynamic import: leaflet touches `window` at top level, which crashes
      // Next.js server rendering. Importing inside an effect keeps it client-only.
      L = (await import('leaflet')).default;
      await import('leaflet-draw');
      if (cancelled || !containerRef.current) return;

      // Fix Leaflet's broken default-marker URLs under bundlers.
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current).setView(center, zoom);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const drawn = new L.FeatureGroup();
      map.addLayer(drawn);
      drawnLayerRef.current = drawn;

      // Pre-load existing polygon (edit mode)
      if (value?.coordinates) {
        try {
          const layer = L.geoJSON(value, { style: { color: '#16a34a', weight: 3 } });
          layer.eachLayer((l: any) => drawn.addLayer(l));
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        } catch {
          // bad geojson — silently ignore so the editor still mounts
        }
      }

      // Show other zones underneath, read-only
      overlayZones.forEach((z) => {
        if (!z.boundaryGeoJson) return;
        try {
          L.geoJSON(z.boundaryGeoJson, {
            style: { color: z.color ?? '#6b7280', weight: 1, fillOpacity: 0.1, dashArray: '4 4' },
            interactive: false,
          })
            .bindTooltip(z.zoneName, { permanent: false, sticky: true })
            .addTo(map);
        } catch { /* skip broken polygons */ }
      });

      const drawControl = new (L as any).Control.Draw({
        position: 'topright',
        edit: { featureGroup: drawn, remove: true },
        draw: {
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#16a34a', weight: 3 } },
          rectangle: { shapeOptions: { color: '#16a34a', weight: 3 } },
          polyline: false,
          circle: false,
          marker: false,
          circlemarker: false,
        },
      });
      map.addControl(drawControl);

      const emit = () => {
        const layers = drawn.getLayers();
        if (layers.length === 0) { onChange(null); return; }
        // Merge multiple polygons into a MultiPolygon if the user drew more
        // than one shape; otherwise emit a plain Polygon.
        const features = drawn.toGeoJSON() as any;
        const polys = features.features.map((f: any) => f.geometry);
        if (polys.length === 1) {
          onChange(polys[0]);
        } else {
          onChange({
            type: 'MultiPolygon',
            coordinates: polys.map((p: any) => (p.type === 'Polygon' ? p.coordinates : p.coordinates[0])),
          });
        }
      };

      map.on((L as any).Draw.Event.CREATED, (e: any) => {
        drawn.clearLayers();        // replace, don't accumulate, to keep "one zone = one shape"
        drawn.addLayer(e.layer);
        emit();
      });
      map.on((L as any).Draw.Event.EDITED, emit);
      map.on((L as any).Draw.Event.DELETED, emit);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Re-init only on initial value change, not every overlay update —
    // overlays are static for the modal's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}
    />
  );
}
