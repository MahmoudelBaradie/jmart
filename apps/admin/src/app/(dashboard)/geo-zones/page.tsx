'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geoZonesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import EmptyState from '@/components/shared/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { Map, Plus, X, Check } from 'lucide-react';

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
}

export default function GeoZonesPage() {
  const [tab, setTab] = useState<Tab>('Zones');
  const [showCreate, setShowCreate] = useState(false);

  const { data: zonesData, isLoading } = useQuery({
    queryKey: ['geo-zones'],
    enabled: tab === 'Zones',
    queryFn: () => geoZonesApi.list({ limit: 100 }).then((r) => r.data),
  });

  const zones: Zone[] = (zonesData as any)?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Service Zones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Delivery regions and shipping coverage</p>
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
        <Card noPadding>
          {isLoading ? (
            <PageSpinner />
          ) : zones.length === 0 ? (
            <EmptyState icon={Map} title="No zones yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Code</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Level</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Lat / Lng</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
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
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {z.centroidLat && z.centroidLng
                          ? `${Number(z.centroidLat).toFixed(3)}, ${Number(z.centroidLng).toFixed(3)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          z.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
                          : z.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}>{z.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'Shipping Rates' && (
        <Card>
          <EmptyState icon={Map} title="Shipping rates" subtitle="Per-zone rate management" />
        </Card>
      )}

      {showCreate && (
        <CreateZoneModal parentOptions={zones} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function CreateZoneModal({ parentOptions, onClose }: { parentOptions: Zone[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [zoneCode, setZoneCode] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [zoneNameAr, setZoneNameAr] = useState('');
  const [zoneLevel, setZoneLevel] = useState<typeof ZONE_LEVELS[number]>('ZONE');
  const [parentZoneId, setParentZoneId] = useState('');
  const [centroidLat, setCentroidLat] = useState('');
  const [centroidLng, setCentroidLng] = useState('');

  const create = useMutation({
    mutationFn: () => geoZonesApi.create({
      zoneCode: zoneCode.trim(),
      zoneName: zoneName.trim(),
      zoneNameAr: zoneNameAr.trim() || undefined,
      zoneLevel,
      parentZoneId: parentZoneId || undefined,
      centroidLat: centroidLat ? Number(centroidLat) : undefined,
      centroidLng: centroidLng ? Number(centroidLng) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geo-zones'] });
      onClose();
    },
  });

  const valid = zoneCode.trim() && zoneName.trim();
  const err = (create.error as any)?.response?.data?.message;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-900">New Service Zone</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">{Array.isArray(err) ? err[0] : err}</div>}

          <Field label="Zone Code *">
            <input type="text" value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} placeholder="RY-NORTH-001" className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Name (EN) *">
              <input type="text" value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="Riyadh North" className={inputCls} />
            </Field>
            <Field label="Name (AR)">
              <input type="text" value={zoneNameAr} onChange={(e) => setZoneNameAr(e.target.value)} placeholder="الرياض الشمال" className={inputCls} dir="rtl" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Level">
              <select value={zoneLevel} onChange={(e) => setZoneLevel(e.target.value as any)} className={inputCls}>
                {ZONE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Parent">
              <select value={parentZoneId} onChange={(e) => setParentZoneId(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {parentOptions.filter((p) => ['COUNTRY', 'REGION', 'CITY'].includes(p.zoneLevel)).map((p) => (
                  <option key={p.id} value={p.id}>{(p.zoneNameAr ?? p.zoneName)} · {p.zoneLevel}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude">
              <input type="number" step="any" value={centroidLat} onChange={(e) => setCentroidLat(e.target.value)} placeholder="24.7136" className={inputCls} />
            </Field>
            <Field label="Longitude">
              <input type="number" step="any" value={centroidLng} onChange={(e) => setCentroidLng(e.target.value)} placeholder="46.6753" className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-100">Cancel</button>
          <button
            onClick={() => create.mutate()}
            disabled={!valid || create.isPending}
            className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1"
          >
            <Check size={14} /> {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-700 block mb-1">{label}</label>
      {children}
    </div>
  );
}
