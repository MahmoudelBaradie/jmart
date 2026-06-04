'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannersApi, api as rawApi } from '@/lib/api';
import StateView from '@/components/shared/StateView';
import { Image as ImageIcon, Plus, Pencil, Trash2, Sparkles, Globe, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Banner {
  id: string;
  titleAr: string;
  titleEn?: string | null;
  subtitleAr?: string | null;
  subtitleEn?: string | null;
  imageUrl?: string | null;
  emoji?: string | null;
  linkUrl?: string | null;
  backgroundColor?: string | null;
  geoZoneId?: string | null;
  priority: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  geoZone?: { id: string; zoneName: string; zoneNameAr?: string | null } | null;
}

interface GeoZone {
  id: string;
  zoneName: string;
  zoneNameAr?: string | null;
}

const empty: Partial<Banner> = {
  titleAr: '',
  emoji: '🌾',
  priority: 0,
  isActive: true,
  backgroundColor: 'linear-gradient(to left, #16a34a, #059669)',
};

export default function BannersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['banners-admin'],
    queryFn: () => bannersApi.list({ page: 1, limit: 100 }).then((r) => r.data),
  });

  const { data: zonesData } = useQuery({
    queryKey: ['geo-zones-flat'],
    queryFn: () => rawApi.get('/geo-zones?limit=100').then((r) => r.data),
    staleTime: 300_000,
  });

  const banners: Banner[] = data?.data || [];
  const zones: GeoZone[] = zonesData?.data || zonesData || [];

  const createOrUpdate = useMutation({
    mutationFn: (b: Partial<Banner>) => {
      // Allowlist exactly the DTO fields. The server uses `forbidNonWhitelisted`
      // so any extra props (geoZone relation, id, timestamps, etc.) → 400.
      const allowed = [
        'titleAr','titleEn','subtitleAr','subtitleEn','imageUrl','emoji',
        'linkUrl','backgroundColor','geoZoneId','priority','isActive',
        'startsAt','endsAt',
      ] as const;
      const clean: Record<string, unknown> = {};
      for (const k of allowed) {
        const v = (b as any)[k];
        if (v === undefined) continue;
        // Drop empty strings for optional text fields; the API expects either
        // a populated value or omitted key (not "").
        if (v === '' && k !== 'titleAr') continue;
        clean[k] = v;
      }
      return b.id ? bannersApi.update(b.id, clean) : bannersApi.create(clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners-admin'] });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => bannersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners-admin'] });
      setConfirmDeleteId(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            بنرات السوق
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            بنرات تظهر للمشترين والمزارعين أعلى صفحة السوق. يمكن استهداف منطقة معينة أو عرضها عالمياً.
          </p>
        </div>
        <button
          onClick={() => setEditing(empty)}
          className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <Plus size={15} /> بنر جديد
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <StateView state="loading" />
      ) : isError ? (
        <StateView state="error" onRetry={refetch} />
      ) : banners.length === 0 ? (
        <StateView
          state="empty"
          icon={ImageIcon}
          title="لا توجد بنرات بعد"
          description='اضغط "بنر جديد" لإنشاء أول بنر للسوق.'
        />
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Preview */}
              <div
                className="px-5 py-4 text-white relative"
                style={
                  b.backgroundColor?.startsWith('#') || b.backgroundColor?.startsWith('linear')
                    ? { background: b.backgroundColor }
                    : { background: 'linear-gradient(to left, #16a34a, #059669)' }
                }
              >
                <div className="flex items-center gap-3">
                  {b.imageUrl ? (
                    <img src={b.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover bg-white/10" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-3xl">
                      {b.emoji || '🌾'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">{b.titleAr}</p>
                    {b.subtitleAr && <p className="text-white/80 text-sm truncate">{b.subtitleAr}</p>}
                  </div>
                </div>
              </div>

              {/* Meta + actions */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full font-medium',
                      b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600',
                    )}
                  >
                    {b.isActive ? 'مفعَّل' : 'موقوف'}
                  </span>
                  {b.geoZone ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1">
                      <MapPin size={10} />
                      {b.geoZone.zoneNameAr || b.geoZone.zoneName}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                      <Globe size={10} /> عالمي
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">أولوية: {b.priority}</span>
                  {b.linkUrl && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 truncate max-w-[200px]">
                      → {b.linkUrl}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setEditing(b)}
                    aria-label="تعديل"
                    className="w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(b.id)}
                    aria-label="حذف"
                    className="w-9 h-9 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {editing && (
        <BannerForm
          banner={editing}
          zones={zones}
          onClose={() => setEditing(null)}
          onSubmit={(b) => createOrUpdate.mutate(b)}
          submitting={createOrUpdate.isPending}
          error={createOrUpdate.error}
        />
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mt-2">سيتم حذف هذا البنر نهائياً. لا يمكن التراجع.</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600"
              >
                إلغاء
              </button>
              <button
                onClick={() => remove.mutate(confirmDeleteId)}
                disabled={remove.isPending}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {remove.isPending ? 'جارٍ الحذف…' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BannerForm ────────────────────────────────────────────────────
function BannerForm({
  banner, zones, onClose, onSubmit, submitting, error,
}: {
  banner: Partial<Banner>;
  zones: GeoZone[];
  onClose: () => void;
  onSubmit: (b: Partial<Banner>) => void;
  submitting: boolean;
  error: unknown;
}) {
  const [form, setForm] = useState<Partial<Banner>>(banner);
  const set = <K extends keyof Banner>(k: K, v: Banner[K] | string | number | boolean | null) =>
    setForm((f) => ({ ...f, [k]: v as any }));

  const errMsg = (error as any)?.response?.data?.message
    || (error as any)?.message
    || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full my-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {form.id ? 'تعديل البنر' : 'بنر جديد'}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">العنوان (عربي) *</label>
            <input
              type="text"
              value={form.titleAr || ''}
              onChange={(e) => set('titleAr', e.target.value)}
              required
              maxLength={120}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">العنوان (إنجليزي)</label>
            <input
              type="text"
              value={form.titleEn || ''}
              onChange={(e) => set('titleEn', e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">العنوان الفرعي (عربي)</label>
            <input
              type="text"
              value={form.subtitleAr || ''}
              onChange={(e) => set('subtitleAr', e.target.value)}
              maxLength={255}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">إيموجي</label>
              <input
                type="text"
                value={form.emoji || ''}
                onChange={(e) => set('emoji', e.target.value)}
                maxLength={8}
                placeholder="🌾"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">رابط صورة (اختياري)</label>
              <input
                type="url"
                value={form.imageUrl || ''}
                onChange={(e) => set('imageUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">رابط CTA عند الضغط (اختياري)</label>
            <input
              type="text"
              value={form.linkUrl || ''}
              onChange={(e) => set('linkUrl', e.target.value)}
              placeholder="/marketplace?category=fruits"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">خلفية (CSS gradient أو hex)</label>
            <input
              type="text"
              value={form.backgroundColor || ''}
              onChange={(e) => set('backgroundColor', e.target.value)}
              placeholder="linear-gradient(to left, #16a34a, #059669)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">المنطقة الجغرافية</label>
              <select
                value={form.geoZoneId || ''}
                onChange={(e) => set('geoZoneId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
              >
                <option value="">🌍 عالمي (كل المناطق)</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.zoneNameAr || z.zoneName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">الأولوية</label>
              <input
                type="number"
                value={form.priority ?? 0}
                onChange={(e) => set('priority', parseInt(e.target.value) || 0)}
                min={0}
                max={1000}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">يبدأ من (اختياري)</label>
              <input
                type="datetime-local"
                value={form.startsAt ? new Date(form.startsAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => set('startsAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ينتهي في (اختياري)</label>
              <input
                type="datetime-local"
                value={form.endsAt ? new Date(form.endsAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => set('endsAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">مفعَّل</span>
          </label>

          {errMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              {Array.isArray(errMsg) ? errMsg.join('، ') : String(errMsg)}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600"
            >
              إلغاء
            </button>
            <button
              onClick={() => onSubmit(form)}
              disabled={submitting || !form.titleAr}
              className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-bold disabled:opacity-50"
            >
              {submitting ? 'جارٍ الحفظ…' : (form.id ? 'حفظ التعديلات' : 'إنشاء البنر')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
