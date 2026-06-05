'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geoZonesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { Map, Plus, X, Check } from 'lucide-react';

// Leaflet touches `window` on import → must stay client-only.
const ZoneMapEditor = dynamic(() => import('@/components/maps/ZoneMapEditor'), { ssr: false });
const ZonesOverviewMap = dynamic(() => import('@/components/maps/ZonesOverviewMap'), { ssr: false });

const TABS = ['Zones', 'Shipping Rates'] as const;
type Tab = (typeof TABS)[number];
const ZONE_LEVELS = ['COUNTRY', 'REGION', 'CITY', 'ZONE', 'SUB_ZONE'] as const;

interface Zone {
  id: string;
  zoneCode: string;
  zoneName: string;
  zoneNameAr?: string;
  zoneLevel: string;
  parentZoneId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  centroidLat?: number | string;
  centroidLng?: number | string;
  boundaryGeoJson?: any;
}

export default function GeoZonesPage() {
  const [tab, setTab] = useState<Tab>('Zones');
  const [view, setView] = useState<'map' | 'table'>('map');
  const [showCreate, setShowCreate] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  const { data: zonesData, isLoading } = useQuery({
    queryKey: ['geo-zones'],
    enabled: tab === 'Zones',
    queryFn: () => geoZonesApi.list({ limit: 100 }).then((r) => r.data),
  });

  const zones: Zone[] = (zonesData as any)?.data ?? [];
  const withBoundary = zones.filter((z) => z.boundaryGeoJson?.coordinates);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Service Zones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Geofenced delivery regions — draw polygons on the map to define boundaries.
          </p>
        </div>
        {tab === 'Zones' && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={16} /> New Zone
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Zones' && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit text-xs">
            {(['map', 'table'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v === 'map' ? 'Map view' : 'Table view'}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'Zones' && (
        <>
          {isLoading ? (
            <Card><PageSpinner /></Card>
          ) : zones.length === 0 ? (
            <Card><EmptyState icon={Map} title="No zones yet" /></Card>
          ) : view === 'map' ? (
            // While a create/edit modal is open we render only the modal's map
            // and hide this overview map entirely. Leaflet renders tiles + draw
            // controls with z-index 200/800, which leaks ABOVE the modal's
            // bg-black/80 backdrop (z-50). Unmounting the overview keeps that
            // from happening — much cleaner than fighting z-index per layer.
            (showCreate || editingZone) ? null : (
              <Card>
                <ZonesOverviewMap
                  zones={zones}
                  onSelect={(id) => setEditingZone(zones.find((z) => z.id === id) ?? null)}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Polygon = drawn boundary. Dot = legacy zone with only a center point — click to add a polygon.
                  {withBoundary.length}/{zones.length} zones have boundaries.
                </p>
              </Card>
            )
          ) : (
            <Card noPadding>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Code</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Level</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Boundary</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {zones.map((z) => (
                      <tr key={z.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{z.zoneNameAr ?? z.zoneName}</div>
                          {z.zoneNameAr && <div className="text-xs text-gray-400">{z.zoneName}</div>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{z.zoneCode}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{z.zoneLevel}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {z.boundaryGeoJson?.coordinates ? (
                            <span className="text-green-700">✓ Polygon</span>
                          ) : (
                            <span className="text-amber-600">Point only</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            z.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
                            : z.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                          }`}>{z.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditingZone(z)}
                            className="text-xs text-brand-700 hover:underline"
                          >Edit boundary</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'Shipping Rates' && (
        <Card>
          <EmptyState icon={Map} title="Shipping rates" subtitle="Per-zone rate management" />
        </Card>
      )}

      {showCreate && (
        <ZoneModal
          mode="create"
          existingZones={zones}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editingZone && (
        <ZoneModal
          mode="edit"
          zone={editingZone}
          existingZones={zones.filter((z) => z.id !== editingZone.id)}
          onClose={() => setEditingZone(null)}
        />
      )}
    </div>
  );
}

interface ZoneModalProps {
  mode: 'create' | 'edit';
  zone?: Zone;
  existingZones: Zone[];
  onClose: () => void;
}

function ZoneModal({ mode, zone, existingZones, onClose }: ZoneModalProps) {
  const qc = useQueryClient();
  const [zoneCode, setZoneCode] = useState(zone?.zoneCode ?? '');
  const [zoneName, setZoneName] = useState(zone?.zoneName ?? '');
  const [zoneNameAr, setZoneNameAr] = useState(zone?.zoneNameAr ?? '');
  const [zoneLevel, setZoneLevel] = useState<typeof ZONE_LEVELS[number]>((zone?.zoneLevel as any) ?? 'ZONE');
  const [parentZoneId, setParentZoneId] = useState(zone?.parentZoneId ?? '');
  const [boundary, setBoundary] = useState<any | null>(zone?.boundaryGeoJson ?? null);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        zoneCode: zoneCode.trim(),
        zoneName: zoneName.trim(),
        zoneNameAr: zoneNameAr.trim() || undefined,
        zoneLevel,
        parentZoneId: parentZoneId || undefined,
        boundaryGeoJson: boundary || undefined,
      };
      return mode === 'create'
        ? geoZonesApi.create(payload as any)
        : (geoZonesApi as any).update(zone!.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geo-zones'] });
      onClose();
    },
  });

  const valid = zoneCode.trim() && zoneName.trim();
  const err = (save.error as any)?.response?.data?.message;
  const overlay = existingZones.map((z) => ({
    id: z.id,
    zoneName: z.zoneNameAr || z.zoneName,
    boundaryGeoJson: z.boundaryGeoJson,
  }));

  // Deliberately:
  //  - bg-black/80 (not /50) so the dim overview map underneath doesn't
  //    visually compete with the modal's editor map
  //  - max-w-6xl + h-[90vh] flex column with a single scroll surface for
  //    form fields, the map gets the rest of the height as a fixed flex child
  //  - The toolbar stays inside the map element, not clipped by overflow
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl flex flex-col h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-bold text-gray-900">
            {mode === 'create' ? 'New Service Zone' : `Edit ${zone?.zoneNameAr || zone?.zoneName}`}
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-4 shrink-0 border-b bg-gray-50">
          {err && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">{Array.isArray(err) ? err[0] : err}</div>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Zone Code *">
              <input type="text" value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} placeholder="RY-NORTH-001" className={inputCls} disabled={mode === 'edit'} />
            </Field>
            <Field label="Name (EN) *">
              <input type="text" value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="Riyadh North" className={inputCls} />
            </Field>
            <Field label="Name (AR)">
              <input type="text" value={zoneNameAr} onChange={(e) => setZoneNameAr(e.target.value)} placeholder="الرياض الشمال" className={inputCls} dir="rtl" />
            </Field>
            <Field label="Level">
              <select value={zoneLevel} onChange={(e) => setZoneLevel(e.target.value as any)} className={inputCls}>
                {ZONE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Parent">
              <select value={parentZoneId} onChange={(e) => setParentZoneId(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {existingZones.filter((p) => ['COUNTRY', 'REGION', 'CITY'].includes(p.zoneLevel)).map((p) => (
                  <option key={p.id} value={p.id}>{(p.zoneNameAr ?? p.zoneName)} · {p.zoneLevel}</option>
                ))}
              </select>
            </Field>
            <div className="flex items-end text-xs">
              <span className={boundary?.coordinates ? 'text-green-700 font-bold' : 'text-amber-600'}>
                {boundary?.coordinates ? '✓ Boundary drawn' : '⚠ Use the polygon toolbar (top-left of map) to draw the boundary'}
              </span>
            </div>
          </div>
        </div>

        {/* Map takes the remaining vertical space so the toolbar is always visible */}
        <div className="flex-1 min-h-0 p-4">
          <ZoneMapEditor
            value={boundary}
            onChange={setBoundary}
            overlayZones={overlay}
            height={0 /* ignored — the wrapper now controls height */}
          />
        </div>

        <div className="flex gap-2 p-4 border-t bg-gray-50 rounded-b-xl shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-100">Cancel</button>
          <button
            onClick={() => save.mutate()}
            disabled={!valid || save.isPending}
            className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1"
          >
            <Check size={14} /> {save.isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-gray-50 disabled:text-gray-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-700 block mb-1">{label}</label>
      {children}
    </div>
  );
}
