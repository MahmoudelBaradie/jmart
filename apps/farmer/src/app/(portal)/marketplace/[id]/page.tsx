'use client';
import { useState, useSyncExternalStore } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsApi, ordersApi, farmsApi, geoZonesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Package, MapPin, Star, Calendar,
  ShoppingCart, Heart, Loader2, CheckCircle2,
  AlertTriangle, Minus, Plus, Clock, Shield,
  Warehouse, ChevronDown, X, Info, BadgeCheck,
  Thermometer, Scale,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { productImage } from '@/lib/product-images';

// ── Hydration guard ────────────────────────────────────────────────────────────
const _sub = () => () => {};
function useIsClient() {
  return useSyncExternalStore(_sub, () => true, () => false);
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_LABELS: Record<string, string> = {
  AMBIENT: '🌡️ درجة حرارة عادية',
  CHILLED: '❄️ مبرد',
  FROZEN: '🧊 مجمد',
};

const PACKAGING_OPTIONS = [
  { value: 'BIG_BAG_1000KG', label: '🎒 Big Bag 1000 كجم' },
  { value: 'PALLET_500KG', label: '🪵 منصة 500 كجم' },
  { value: 'BOX_25KG', label: '📦 صندوق 25 كجم' },
  { value: 'SACK_50KG', label: '🛍️ كيس 50 كجم' },
  { value: 'LOOSE', label: '⚖️ وزن مباشر' },
];

const THEMES = [
  { from: 'from-emerald-600', to: 'to-teal-700', emoji: '🌾' },
  { from: 'from-green-600', to: 'to-emerald-800', emoji: '🥦' },
  { from: 'from-amber-500', to: 'to-orange-600', emoji: '🍊' },
  { from: 'from-lime-600', to: 'to-green-700', emoji: '🌿' },
  { from: 'from-yellow-500', to: 'to-amber-600', emoji: '🌽' },
  { from: 'from-teal-600', to: 'to-cyan-700', emoji: '🫛' },
  { from: 'from-red-500', to: 'to-rose-700', emoji: '🍅' },
  { from: 'from-purple-600', to: 'to-violet-800', emoji: '🫐' },
];
const lotTheme = (id: string) => THEMES[(id.codePointAt(0) ?? 0) % THEMES.length];

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isClient = useIsClient();
  const { isBuyer } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [form, setForm] = useState({
    deliveryAddress: '',
    requestedDeliveryDate: tomorrowISO(),
    deliveryZoneId: '',
    packaging: 'BOX_25KG',
    requestedQtyKg: 100,
    pricePerKg: '',
    notes: '',
  });

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot-detail', id],
    queryFn: () => listingsApi.get(id).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: farmProfileRaw } = useQuery({
    queryKey: ['farm-detail', lot?.farmId],
    queryFn: () => farmsApi.get(lot!.farmId).then((r) => r.data),
    enabled: !!lot?.farmId && isBuyer,
  });

  const { data: geoZonesRaw } = useQuery({
    queryKey: ['geo-zones'],
    queryFn: () => geoZonesApi.list({ limit: 50 }).then((r) => r.data),
    staleTime: 300_000,
    enabled: isBuyer,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const followMut = useMutation({
    mutationFn: (isFollowing: boolean) =>
      isFollowing ? farmsApi.unfollow(lot!.farmId) : farmsApi.follow(lot!.farmId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farm-detail', lot?.farmId] });
      qc.invalidateQueries({ queryKey: ['farms-v2'] });
      qc.invalidateQueries({ queryKey: ['farms-following'] });
    },
  });

  const orderMut = useMutation({
    mutationFn: () => {
      if (!lot) throw new Error('no lot');
      const pickupZoneId = lot.geoZoneId;
      if (!pickupZoneId) throw new Error('لا توجد منطقة استلام للدفعة');
      if (!form.deliveryZoneId) throw new Error('اختر منطقة التوصيل');
      if (form.deliveryAddress.trim().length < 5) throw new Error('أدخل عنوان التوصيل (5 أحرف على الأقل)');
      const priceNum = Number(form.pricePerKg);
      if (!form.pricePerKg || isNaN(priceNum) || priceNum <= 0) throw new Error('أدخل السعر المتفق عليه');
      if (form.requestedQtyKg <= 0) throw new Error('أدخل الكمية المطلوبة');
      return ordersApi.create({
        orderType: 'SPOT',
        pickupZoneId,
        deliveryZoneId: form.deliveryZoneId,
        deliveryAddress: form.deliveryAddress.trim(),
        requestedDeliveryDate: form.requestedDeliveryDate,
        notes: form.notes || undefined,
        items: [{
          lotId: id,
          farmerId: lot.farmerId,
          productId: lot.productId,
          grade: lot.grade ?? 'A',
          packaging: form.packaging,
          requestedQtyKg: form.requestedQtyKg,
          pricePerKg: priceNum,
          notes: form.notes || undefined,
        }],
      });
    },
    onSuccess: (res) => {
      setOrdered(true);
      setDrawerOpen(false);
      qc.invalidateQueries({ queryKey: ['orders-v2'] });
      setTimeout(() => {
        const orderId = res.data?.data?.id ?? res.data?.id;
        if (orderId) router.push(`/orders/${orderId}`);
        else router.push('/orders');
      }, 1800);
    },
  });

  // ── Render: skeleton ──────────────────────────────────────────────────────
  if (!isClient || isLoading) {
    return (
      <div className="space-y-4 animate-pulse pb-8">
        <div className="h-5 w-28 bg-gray-200 rounded-xl" />
        <div className="h-52 bg-gray-200 rounded-2xl" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-28 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="text-center py-20">
        <Package size={44} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">الدفعة غير موجودة</p>
        <Link href="/marketplace" className="mt-4 inline-block text-blue-600 text-sm font-medium hover:underline">
          ← العودة للسوق
        </Link>
      </div>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const product = lot.product ?? {};
  const farmer = lot.farmer ?? {};
  const farm = lot.farm ?? {};
  const warehouse = lot.warehouse ?? {};
  const t = lotTheme(lot.id);

  const qtyAvailable = Number(lot.qtyAvailable ?? 0);
  const qtyTotal = Number(lot.qtyTotal ?? 0);
  const qtyPct = qtyTotal > 0 ? Math.round((qtyAvailable / qtyTotal) * 100) : 0;

  const qualityInspections: any[] = lot.qualityInspections ?? [];
  const latestInspection = qualityInspections[qualityInspections.length - 1];
  const qcPassed = latestInspection?.result === 'PASSED';

  const isFollowing = farmProfileRaw?.isFollowing ?? false;
  const geoZones: any[] = Array.isArray(geoZonesRaw?.data)
    ? geoZonesRaw.data
    : Array.isArray(geoZonesRaw)
    ? geoZonesRaw
    : [];

  const daysToExpiry = lot.expiryDate
    ? Math.ceil((new Date(lot.expiryDate).getTime() - Date.now()) / 86_400_000)
    : null;
  const expiryUrgent = daysToExpiry !== null && daysToExpiry <= 7;

  const orderError = orderMut.isError
    ? ((orderMut.error as any)?.response?.data?.message ??
       (orderMut.error as Error)?.message ??
       'حدث خطأ')
    : null;

  const totalEstimate =
    form.pricePerKg && !isNaN(Number(form.pricePerKg)) && Number(form.pricePerKg) > 0
      ? form.requestedQtyKg * Number(form.pricePerKg)
      : null;

  return (
    <div className="space-y-4 pb-28 relative" dir="rtl">

      {/* Back */}
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowRight size={15} />
        السوق
      </Link>

      {/* ── HERO CARD ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Hero header — real photo with gradient fallback */}
        <div className={cn(
          'relative overflow-hidden text-white px-5 pt-6 pb-8',
          !productImage(product.nameAr, product.category?.nameAr) && cn('bg-gradient-to-bl', t.from, t.to),
        )}>
          {productImage(product.nameAr, product.category?.nameAr, 800) ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImage(product.nameAr, product.category?.nameAr, 800)!}
                alt={product.nameAr ?? product.name ?? ''}
                className="absolute inset-0 w-full h-full object-cover -z-10"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 -z-10" />
            </>
          ) : (
            <div className="absolute -left-4 -top-2 text-9xl opacity-15 select-none pointer-events-none">
              {t.emoji}
            </div>
          )}
          <div className="relative z-10">
            <div className="flex flex-wrap gap-2 mb-3">
              {lot.grade && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 border border-white/30">
                  درجة {lot.grade}
                </span>
              )}
              {lot.status === 'AVAILABLE' && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 border border-white/30">
                  ✅ متاح
                </span>
              )}
              {qualityInspections.length > 0 && (
                <span className={cn(
                  'text-[11px] font-bold px-2.5 py-1 rounded-full border',
                  qcPassed
                    ? 'bg-emerald-400/30 border-emerald-300/50'
                    : 'bg-red-400/30 border-red-300/50',
                )}>
                  {qcPassed ? '🛡️ فحص الجودة ناجح' : '⚠️ فشل فحص الجودة'}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black">
              {product.nameAr ?? product.name ?? 'منتج'}
            </h1>
            <p className="text-white/70 text-sm mt-0.5">
              {product.category?.nameAr ?? product.category?.name ?? ''}
            </p>
            <p className="text-white/50 text-xs mt-1 font-mono">#{lot.lotNumber}</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-gray-100 border-t border-gray-100">
          <div className="p-3.5 text-center">
            <p className="text-lg font-black text-blue-700">
              {qtyAvailable.toLocaleString('ar-SA', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{product.unitOfMeasure} متاح</p>
          </div>
          <div className="p-3.5 text-center">
            <p className="text-lg font-black text-gray-800">{lot.grade ?? '—'}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">الدرجة</p>
          </div>
          <div className="p-3.5 text-center">
            <p className={cn('text-lg font-black', expiryUrgent ? 'text-red-600' : 'text-gray-800')}>
              {daysToExpiry !== null ? `${daysToExpiry} يوم` : '—'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">حتى الانتهاء</p>
          </div>
        </div>

        {/* Availability bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>الكمية المتاحة</span>
            <span className="font-semibold text-gray-600">{qtyPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                qtyPct > 50 ? 'bg-emerald-500' : qtyPct > 20 ? 'bg-amber-400' : 'bg-red-400',
              )}
              style={{ width: `${qtyPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {qtyAvailable.toLocaleString('ar-SA')} من أصل {qtyTotal.toLocaleString('ar-SA')} {product.unitOfMeasure}
          </p>
        </div>
      </div>

      {/* ── LOT DETAILS ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Info size={15} className="text-blue-500" />
          تفاصيل الدفعة
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {lot.harvestDate && (
            <LotDetail
              icon={<Calendar size={14} className="text-green-500" />}
              label="تاريخ الحصاد"
              value={formatDate(lot.harvestDate)}
            />
          )}
          {lot.expiryDate && (
            <LotDetail
              icon={<Clock size={14} className={expiryUrgent ? 'text-red-500' : 'text-amber-500'} />}
              label="تاريخ الانتهاء"
              value={formatDate(lot.expiryDate)}
              warn={expiryUrgent}
            />
          )}
          {lot.storageType && (
            <LotDetail
              icon={<Thermometer size={14} className="text-purple-500" />}
              label="نوع التخزين"
              value={STORAGE_LABELS[lot.storageType] ?? lot.storageType}
            />
          )}
          {warehouse.warehouseName && (
            <LotDetail
              icon={<Warehouse size={14} className="text-gray-500" />}
              label="المستودع"
              value={warehouse.warehouseName}
            />
          )}
          <LotDetail
            icon={<Scale size={14} className="text-indigo-500" />}
            label="الكمية الإجمالية"
            value={`${Number(lot.qtyTotal ?? 0).toLocaleString('ar-SA')} ${product.unitOfMeasure}`}
          />
          {Number(lot.qtyReserved) > 0 && (
            <LotDetail
              icon={<Package size={14} className="text-orange-500" />}
              label="محجوز"
              value={`${Number(lot.qtyReserved).toLocaleString('ar-SA')} ${product.unitOfMeasure}`}
            />
          )}
        </div>
        {lot.batchNotes && (
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">ملاحظات الدفعة</p>
            <p className="text-sm text-gray-700">{lot.batchNotes}</p>
          </div>
        )}
      </div>

      {/* ── QUALITY INSPECTION ───────────────────────────────────────────── */}
      {qualityInspections.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Shield size={15} className="text-emerald-500" />
            فحص الجودة
          </h2>
          <div className="space-y-2">
            {qualityInspections.map((insp: any) => (
              <div
                key={insp.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border',
                  insp.result === 'PASSED'
                    ? 'bg-emerald-50 border-emerald-100'
                    : insp.result === 'FAILED'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-amber-50 border-amber-100',
                )}
              >
                <div className="flex items-center gap-2">
                  {insp.result === 'PASSED' ? (
                    <BadgeCheck size={18} className="text-emerald-600" />
                  ) : insp.result === 'FAILED' ? (
                    <AlertTriangle size={18} className="text-red-600" />
                  ) : (
                    <Clock size={18} className="text-amber-600" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-bold',
                      insp.result === 'PASSED'
                        ? 'text-emerald-700'
                        : insp.result === 'FAILED'
                        ? 'text-red-700'
                        : 'text-amber-700',
                    )}
                  >
                    {insp.result === 'PASSED'
                      ? 'ناجح ✓'
                      : insp.result === 'FAILED'
                      ? 'فشل ✗'
                      : 'قيد المراجعة'}
                  </span>
                </div>
                {insp.completedAt && (
                  <span className="text-xs text-gray-400">{formatDate(insp.completedAt)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FARM / FARMER ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
              <MapPin size={15} className="text-red-500" />
              المزرعة والمزارع
            </h2>
            <p className="font-semibold text-gray-800 truncate">{farm.farmName ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-0.5">{farmer.businessName ?? '—'}</p>
            {(farmer.ratingAvg != null || farmProfileRaw?.farmerRatingAvg != null) && (
              <div className="flex items-center gap-1 mt-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={12}
                    className={
                      Number(farmer.ratingAvg ?? farmProfileRaw?.farmerRatingAvg) >= i
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 fill-gray-200'
                    }
                  />
                ))}
                <span className="text-xs font-medium text-gray-600 mr-1">
                  {Number(farmer.ratingAvg ?? farmProfileRaw?.farmerRatingAvg ?? 0).toFixed(1)}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {lot.farmId && (
              <Link
                href={`/farms/${lot.farmId}`}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors text-center"
              >
                ملف المزرعة
              </Link>
            )}
            {isBuyer && lot.farmId && (
              <button
                onClick={() => followMut.mutate(isFollowing)}
                disabled={followMut.isPending}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isFollowing
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-brand-50 text-brand-600 hover:bg-brand-100',
                )}
              >
                <Heart size={11} fill={isFollowing ? 'currentColor' : 'none'} />
                {isFollowing ? 'متابَع ✓' : 'متابعة'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── ORDER SUCCESS OVERLAY ─────────────────────────────────────────── */}
      {ordered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-10 text-center space-y-3 mx-6 shadow-2xl">
            <CheckCircle2 size={60} className="mx-auto text-emerald-500" />
            <p className="text-xl font-black text-gray-900">تم تقديم الطلب!</p>
            <p className="text-sm text-gray-500">جاري التحويل لتفاصيل الطلب...</p>
          </div>
        </div>
      )}

      {/* ── FIXED CTA (buyer only) ────────────────────────────────────────── */}
      {isBuyer && lot.status === 'AVAILABLE' && !ordered && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 sm:mr-52">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition-colors text-base shadow-lg shadow-blue-200"
          >
            <ShoppingCart size={18} />
            تقديم طلب شراء
          </button>
        </div>
      )}

      {/* ── ORDER DRAWER ──────────────────────────────────────────────────── */}
      {isBuyer && drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto sm:mr-52">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-black text-gray-900">طلب شراء</h3>
                <p className="text-xs text-gray-400">{product.nameAr ?? product.name}</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الكمية المطلوبة ({product.unitOfMeasure})
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setForm((f) => ({ ...f, requestedQtyKg: Math.max(1, f.requestedQtyKg - 100) }))
                    }
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    value={form.requestedQtyKg}
                    min={1}
                    max={qtyAvailable}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        requestedQtyKg: Math.max(1, Math.min(qtyAvailable, Number(e.target.value))),
                      }))
                    }
                    className="flex-1 text-center border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        requestedQtyKg: Math.min(qtyAvailable, f.requestedQtyKg + 100),
                      }))
                    }
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  الحد الأقصى: {qtyAvailable.toLocaleString('ar-SA')} {product.unitOfMeasure}
                </p>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  السعر المتفق عليه (ر.س / {product.unitOfMeasure})
                </label>
                <input
                  type="number"
                  value={form.pricePerKg}
                  min={0.01}
                  step={0.01}
                  onChange={(e) => setForm((f) => ({ ...f, pricePerKg: e.target.value }))}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Info size={11} />
                  تفاوض مع المزارع على السعر قبل تقديم الطلب
                </p>
              </div>

              {/* Packaging */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">التغليف</label>
                <div className="relative">
                  <select
                    value={form.packaging}
                    onChange={(e) => setForm((f) => ({ ...f, packaging: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    {PACKAGING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Delivery zone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">منطقة التوصيل</label>
                <div className="relative">
                  <select
                    value={form.deliveryZoneId}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryZoneId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="">اختر المنطقة...</option>
                    {geoZones.map((z: any) => (
                      <option key={z.id} value={z.id}>
                        {z.zoneNameAr ?? z.zoneName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Delivery address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان التوصيل</label>
                <input
                  type="text"
                  value={form.deliveryAddress}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                  placeholder="مثال: شارع الملك فهد، حي العليا، الرياض"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Delivery date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  التاريخ المطلوب للتوصيل
                </label>
                <input
                  type="date"
                  value={form.requestedDeliveryDate}
                  min={tomorrowISO()}
                  onChange={(e) => setForm((f) => ({ ...f, requestedDeliveryDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="أي تعليمات خاصة بالطلب..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Order summary */}
              {totalEstimate !== null && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">الكمية</span>
                    <span className="font-semibold">
                      {form.requestedQtyKg.toLocaleString('ar-SA')} {product.unitOfMeasure}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      السعر / {product.unitOfMeasure}
                    </span>
                    <span className="font-semibold">
                      {Number(form.pricePerKg).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 flex items-center justify-between">
                    <span className="font-bold text-blue-800">الإجمالي التقديري</span>
                    <span className="font-black text-blue-700 text-lg">
                      {totalEstimate.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                </div>
              )}

              {/* Error */}
              {orderError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  {orderError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={() => orderMut.mutate()}
                disabled={orderMut.isPending}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-2xl transition-colors text-base"
              >
                {orderMut.isPending ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    جاري إرسال الطلب...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={17} />
                    تأكيد الطلب
                  </>
                )}
              </button>

              {/* Bottom spacer for mobile */}
              <div className="h-4" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function LotDetail({
  icon,
  label,
  value,
  warn = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className={cn('text-sm font-semibold truncate', warn ? 'text-red-600' : 'text-gray-800')}>
          {value}
        </p>
      </div>
    </div>
  );
}
