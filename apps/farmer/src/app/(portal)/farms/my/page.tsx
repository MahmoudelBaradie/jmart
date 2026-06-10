'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmerApi, geoZonesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sprout, Plus, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Farm {
  id: string;
  farmName: string;
  geoZoneId: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
  areaHectares?: number | string | null;
  primaryProducts?: string[];
  isPrimary?: boolean;
  createdAt?: string;
  geoZone?: { id: string; zoneName: string; zoneNameAr?: string | null };
}

interface GeoZone { id: string; zoneName: string; zoneNameAr?: string | null }

const emptyFarm: Partial<Farm> = {
  farmName: '',
  address: '',
  latitude: undefined as any,
  longitude: undefined as any,
};

export default function MyFarmsPage() {
  const { user } = useAuth();
  const farmerId: string | undefined = (user as any)?.farmer?.id;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Farm> | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-farms', farmerId],
    queryFn: () => farmerApi.myFarms(farmerId!).then((r) => r.data),
    enabled: !!farmerId,
  });

  const { data: zonesRaw } = useQuery({
    queryKey: ['geo-zones-flat'],
    queryFn: () => geoZonesApi.list({ limit: 100 }).then((r) => r.data),
    staleTime: 300_000,
  });

  const farms: Farm[] = data?.data ?? data ?? [];
  const zones: GeoZone[] = zonesRaw?.data ?? zonesRaw ?? [];

  const save = useMutation({
    mutationFn: (f: Partial<Farm>) => {
      const payload: Record<string, unknown> = {
        farmName: String(f.farmName ?? '').trim(),
        geoZoneId: f.geoZoneId,
        address: String(f.address ?? '').trim(),
        latitude: Number(f.latitude),
        longitude: Number(f.longitude),
      };
      if (f.areaHectares != null && f.areaHectares !== '') {
        payload.areaHectares = Number(f.areaHectares);
      }
      if (f.primaryProducts && f.primaryProducts.length) {
        payload.primaryProducts = f.primaryProducts;
      }
      return farmerApi.createFarm(farmerId!, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-farms', farmerId] });
      setEditing(null);
    },
  });

  if (!farmerId) {
    return (
      <div className="p-6 text-center text-gray-500" dir="rtl">
        هذه الصفحة متاحة لحسابات المزارعين فقط.
      </div>
    );
  }

  return (
    <div className="sm:p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sprout size={18} className="text-brand-600" />
            مزارعي
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            أدر المواقع التي تنتج منها — كل لوت/عرض يُربط بمزرعة
          </p>
        </div>
        <button
          onClick={() => setEditing(emptyFarm)}
          className="flex items-center gap-1.5 bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} /> إضافة مزرعة
        </button>
      </div>

      {isLoading && (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-gray-400 text-sm">
          جارٍ التحميل…
        </div>
      )}

      {isError && (
        <div className="bg-red-50 rounded-2xl p-6 text-center border border-red-100">
          <AlertCircle className="mx-auto text-red-400" size={28} />
          <p className="text-sm text-red-700 mt-2">تعذر تحميل المزارع.</p>
          <button onClick={() => refetch()} className="text-xs font-bold text-brand-600 mt-2">
            إعادة المحاولة
          </button>
        </div>
      )}

      {!isLoading && !isError && farms.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <Sprout className="text-gray-200 mx-auto mb-3" size={40} />
          <p className="text-gray-600 font-medium">لا توجد مزارع مسجّلة</p>
          <p className="text-gray-400 text-sm mt-1">أضف مزرعتك الأولى لتتمكن من نشر العروض</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {farms.map((f) => (
          <div key={f.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-sm truncate flex items-center gap-1.5">
                  <Sprout size={14} className="text-brand-600 flex-shrink-0" />
                  {f.farmName || '—'}
                </h3>
                {f.geoZone && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {f.geoZone.zoneNameAr || f.geoZone.zoneName}
                  </p>
                )}
              </div>
              {f.isPrimary && (
                <span className="text-[10px] bg-brand-50 text-brand-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={10} /> رئيسية
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 flex items-start gap-1">
              <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" /> {f.address}
            </p>
            {f.areaHectares != null && (
              <p className="text-xs text-gray-500">المساحة: {Number(f.areaHectares)} هكتار</p>
            )}
          </div>
        ))}
      </div>

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">إضافة مزرعة جديدة</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <Field label="اسم المزرعة *">
              <input
                type="text"
                value={editing.farmName || ''}
                onChange={(e) => setEditing({ ...editing, farmName: e.target.value })}
                className={inputCls}
                placeholder="مزرعة الواحة"
              />
            </Field>

            <Field label="المنطقة *">
              <select
                value={editing.geoZoneId || ''}
                onChange={(e) => setEditing({ ...editing, geoZoneId: e.target.value })}
                className={inputCls}
              >
                <option value="">— اختر منطقة —</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.zoneNameAr || z.zoneName}</option>
                ))}
              </select>
            </Field>

            <Field label="العنوان *">
              <input
                type="text"
                value={editing.address || ''}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                className={inputCls}
                placeholder="طريق الطائف، الهدا"
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="خط العرض *">
                <input
                  type="number" step="any"
                  value={(editing.latitude as any) ?? ''}
                  onChange={(e) => setEditing({ ...editing, latitude: e.target.value as any })}
                  className={inputCls}
                  placeholder="21.3891"
                />
              </Field>
              <Field label="خط الطول *">
                <input
                  type="number" step="any"
                  value={(editing.longitude as any) ?? ''}
                  onChange={(e) => setEditing({ ...editing, longitude: e.target.value as any })}
                  className={inputCls}
                  placeholder="40.4233"
                />
              </Field>
            </div>

            <Field label="المساحة بالهكتار (اختياري)">
              <input
                type="number" step="any"
                value={(editing.areaHectares as any) ?? ''}
                onChange={(e) => setEditing({ ...editing, areaHectares: e.target.value as any })}
                className={inputCls}
                placeholder="5"
              />
            </Field>

            {save.isError && (() => {
              // Surface the real backend error so the user knows what to fix.
              // class-validator returns either a single string or an array of
              // strings under `message`. Status-specific hints help too.
              const err = save.error as any;
              const status = err?.response?.status;
              const raw = err?.response?.data?.message ?? err?.response?.data?.errors;
              const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
              const hint =
                status === 401 ? 'انتهت الجلسة — أعد تسجيل الدخول.'
                : status === 403 ? 'صلاحياتك لا تسمح بإضافة مزرعة.'
                : status === 404 ? 'الحساب غير موجود — راجع الإدارة.'
                : status === 429 ? 'حاول لاحقًا — تم تجاوز الحد المسموح.'
                : null;
              return (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 space-y-1">
                  <div className="font-bold">تعذر الحفظ:</div>
                  {hint && <div>{hint}</div>}
                  {arr.length > 0 ? (
                    <ul className="list-disc pr-4 space-y-0.5">
                      {arr.map((m: string, i: number) => <li key={i}>{m}</li>)}
                    </ul>
                  ) : !hint && (
                    <div>تأكد من تعبئة كل الحقول المطلوبة (اسم المزرعة، المنطقة، العنوان، الإحداثيات).</div>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 border border-gray-200 text-gray-600 font-bold rounded-xl py-2.5 text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => save.mutate(editing)}
                disabled={save.isPending || !editing.farmName || !editing.geoZoneId || !editing.address || !editing.latitude || !editing.longitude}
                className={cn(
                  'flex-1 bg-brand-600 text-white font-bold rounded-xl py-2.5 text-sm',
                  'disabled:opacity-50',
                )}
              >
                {save.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-700">{label}</label>
      {children}
    </div>
  );
}
