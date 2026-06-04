'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buyerApi, geoZonesApi } from '@/lib/api';
import {
  MapPin, Plus, Pencil, Trash2, CheckCircle2, Star, AlertCircle, Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Branch {
  id: string;
  branchName: string;
  branchCode?: string | null;
  geoZoneId: string;
  address: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  deliveryNotes?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  geoZone?: { id: string; zoneName: string; zoneNameAr?: string | null };
}

interface GeoZone { id: string; zoneName: string; zoneNameAr?: string | null }

const emptyBranch: Partial<Branch> = {
  branchName: '',
  address: '',
  isPrimary: false,
};

export default function AddressesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Branch> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => buyerApi.myBranches().then((r) => r.data),
  });

  const { data: zonesRaw } = useQuery({
    queryKey: ['geo-zones-flat'],
    queryFn: () => geoZonesApi.list({ limit: 100 }).then((r) => r.data),
    staleTime: 300_000,
  });

  const branches: Branch[] = data?.data ?? data ?? [];
  const zones: GeoZone[] = zonesRaw?.data ?? zonesRaw ?? [];

  const save = useMutation({
    mutationFn: (b: Partial<Branch>) => {
      const allowed = [
        'branchName','branchCode','geoZoneId','address','latitude','longitude',
        'contactName','contactPhone','deliveryNotes','isPrimary',
      ] as const;
      const clean: Record<string, unknown> = {};
      for (const k of allowed) {
        const v = (b as any)[k];
        if (v === undefined) continue;
        if (v === '' && k !== 'branchName' && k !== 'address' && k !== 'geoZoneId') continue;
        clean[k] = v;
      }
      return b.id ? buyerApi.updateBranch(b.id, clean) : buyerApi.createBranch(clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-branches'] });
      setEditing(null);
    },
  });

  const setPrimary = useMutation({
    mutationFn: (id: string) => buyerApi.updateBranch(id, { isPrimary: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-branches'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => buyerApi.deleteBranch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-branches'] });
      setConfirmDeleteId(null);
    },
  });

  return (
    <div className="sm:p-6 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={18} className="text-brand-600" />
            عناوين التوصيل
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            احفظ عناوينك المتعددة واختر بينها عند كل طلب
          </p>
        </div>
        <button
          onClick={() => setEditing(emptyBranch)}
          className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <Plus size={15} /> عنوان جديد
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
      ) : isError ? (
        <div className="py-12 text-center">
          <AlertCircle size={36} className="text-red-300 mx-auto mb-2" />
          <p className="text-sm text-red-500 mb-3">حدث خطأ أثناء تحميل العناوين</p>
          <button onClick={() => refetch()} className="text-sm text-brand-600 hover:underline">إعادة المحاولة</button>
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <MapPin size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">لا توجد عناوين محفوظة</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">أضف عنوانك الأول لتسريع عملية الشراء</p>
          <button
            onClick={() => setEditing(emptyBranch)}
            className="bg-brand-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand-700"
          >
            إضافة عنوان جديد
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <div
              key={b.id}
              className={cn(
                'bg-white rounded-2xl border shadow-sm overflow-hidden',
                b.isPrimary ? 'border-brand-300' : 'border-gray-100',
              )}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      b.isPrimary ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500',
                    )}>
                      <MapPin size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{b.branchName}</p>
                        {b.isPrimary && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold">
                            <Star size={9} className="fill-current" />
                            افتراضي
                          </span>
                        )}
                        {b.branchCode && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                            {b.branchCode}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{b.address}</p>
                      {b.geoZone && (
                        <p className="text-xs text-gray-400 mt-1">{b.geoZone.zoneNameAr || b.geoZone.zoneName}</p>
                      )}
                      {b.contactPhone && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Phone size={11} />
                          {b.contactPhone}
                          {b.contactName ? ` — ${b.contactName}` : ''}
                        </p>
                      )}
                      {b.deliveryNotes && (
                        <p className="text-xs text-gray-400 mt-1 italic">{b.deliveryNotes}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {!b.isPrimary && (
                    <button
                      onClick={() => setPrimary.mutate(b.id)}
                      disabled={setPrimary.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-lg disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <CheckCircle2 size={13} />
                      تعيين كافتراضي
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(b)}
                    aria-label="تعديل"
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                  >
                    <Pencil size={13} />
                    تعديل
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(b.id)}
                    aria-label="حذف"
                    className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                  >
                    <Trash2 size={13} />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {editing && (
        <BranchForm
          branch={editing}
          zones={zones}
          onClose={() => setEditing(null)}
          onSubmit={(b) => save.mutate(b)}
          submitting={save.isPending}
          error={save.error}
        />
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900">حذف العنوان</h3>
            <p className="text-sm text-gray-500 mt-2">
              سيتم إخفاء هذا العنوان من قائمتك. الطلبات السابقة المرتبطة به ستظل محفوظة.
            </p>
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

// ── BranchForm ─────────────────────────────────────────────────────
function BranchForm({
  branch, zones, onClose, onSubmit, submitting, error,
}: {
  branch: Partial<Branch>;
  zones: GeoZone[];
  onClose: () => void;
  onSubmit: (b: Partial<Branch>) => void;
  submitting: boolean;
  error: unknown;
}) {
  const [form, setForm] = useState<Partial<Branch>>(branch);
  const set = <K extends keyof Branch>(k: K, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const errMsg = (error as any)?.response?.data?.message || (error as any)?.message || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full my-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {form.id ? 'تعديل العنوان' : 'عنوان جديد'}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">اسم العنوان *</label>
            <input
              type="text"
              value={form.branchName || ''}
              onChange={(e) => set('branchName', e.target.value)}
              placeholder="الفرع الرئيسي - الرياض"
              maxLength={255}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">المنطقة *</label>
            <select
              value={form.geoZoneId || ''}
              onChange={(e) => set('geoZoneId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
            >
              <option value="">اختر المنطقة</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.zoneNameAr || z.zoneName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">العنوان التفصيلي *</label>
            <textarea
              value={form.address || ''}
              onChange={(e) => set('address', e.target.value)}
              placeholder="حي، شارع، رقم المبنى، علامة مميزة..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">اسم المسؤول</label>
              <input
                type="text"
                value={form.contactName || ''}
                onChange={(e) => set('contactName', e.target.value)}
                maxLength={255}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">رقم الهاتف</label>
              <input
                type="tel"
                value={form.contactPhone || ''}
                onChange={(e) => set('contactPhone', e.target.value)}
                placeholder="+966..."
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظات للسائق (اختياري)</label>
            <input
              type="text"
              value={form.deliveryNotes || ''}
              onChange={(e) => set('deliveryNotes', e.target.value)}
              placeholder="رمز البوابة، علامات مميزة، ساعات الاستلام..."
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.isPrimary}
              onChange={(e) => set('isPrimary', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">جعله العنوان الافتراضي</span>
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
              disabled={submitting || !form.branchName?.trim() || !form.address?.trim() || !form.geoZoneId}
              className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-brand-700"
            >
              {submitting ? 'جارٍ الحفظ…' : (form.id ? 'حفظ التعديلات' : 'إضافة العنوان')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
