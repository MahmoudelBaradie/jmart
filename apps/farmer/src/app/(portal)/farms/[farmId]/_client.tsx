'use client';
import { use, useState, useSyncExternalStore } from 'react';

// ── SSR-safe client guard ─────────────────────────────────────────────────────
const _sub = () => () => {};
function useIsClient() {
  return useSyncExternalStore(_sub, () => true, () => false);
}
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmsApi, ordersApi, socialApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin, Package, Users, Star, Heart, ArrowRight,
  Phone, Scale, Tag, Calendar, ShieldCheck, Leaf,
  Zap, CheckCircle2, Loader2, Minus, Plus, X,
  ChevronRight, Wheat, Store, TrendingUp, MessageCircle,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber, formatDate } from '@/lib/utils';

// ── Cover palette ─────────────────────────────────────────────────────────────
const COVERS = [
  'from-emerald-600 to-teal-800',
  'from-green-600 to-emerald-900',
  'from-amber-500 to-orange-700',
  'from-lime-600 to-green-800',
  'from-yellow-500 to-amber-700',
  'from-teal-600 to-cyan-800',
];
const EMOJIS = ['🌾', '🥦', '🍊', '🌿', '🌴', '🌱'];
function coverFor(id: string) {
  const n = id ? id.charCodeAt(0) % COVERS.length : 0;
  return { grad: COVERS[n], emoji: EMOJIS[n] };
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function Stars({ avg, count }: { avg?: number | null; count?: number | null }) {
  if (avg == null) return null;
  const full = Math.floor(avg);
  const half = avg % 1 >= 0.5;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={
          i <= full ? 'text-amber-400 fill-amber-400'
          : i === full + 1 && half ? 'text-amber-400 fill-amber-200'
          : 'text-gray-300 fill-gray-100'
        } />
      ))}
      <span className="text-sm font-bold text-amber-600 ml-1">{Number(avg).toFixed(1)}</span>
      {count != null && <span className="text-sm text-gray-400">({count} تقييم)</span>}
    </div>
  );
}

// ── Quick-order modal ─────────────────────────────────────────────────────────
function QuickOrderModal({ lot, onClose }: { lot: any; onClose: () => void }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  // Prisma Decimal fields are serialized as strings — cast to Number before math
  const price     = Number(lot.askingPricePerKg ?? lot.pricePerUnit ?? 0);
  const available = Number(lot.qtyAvailable ?? lot.remainingKg ?? lot.availableQty ?? 0);
  const name      = lot.product?.nameAr || lot.product?.name || 'منتج';

  const mut = useMutation({
    mutationFn: (d: Record<string, unknown>) => ordersApi.create(d),
    onSuccess: () => { setDone(true); setTimeout(() => { onClose(); router.push('/orders'); }, 1500); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !mut.isPending && onClose()} />
      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 pt-5 pb-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold"><Zap size={18} /> اطلب الآن</div>
            <button onClick={onClose} disabled={mut.isPending} className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"><X size={14} /></button>
          </div>
          <p className="font-semibold text-emerald-50">{name}</p>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-black">تم إرسال الطلب!</p>
            <p className="text-sm text-gray-400 mt-1">جارٍ تحويلك…</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">السعر / كجم</p>
                <p className="text-2xl font-black text-emerald-700">{formatCurrency(price)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">الإجمالي</p>
                <p className="text-2xl font-black text-gray-900">{formatCurrency(qty * price)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">الكمية (كجم)</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200"><Minus size={18} /></button>
                <input type="number" min={1} max={available} value={qty}
                  onChange={(e) => setQty(Math.min(Math.max(1, +e.target.value || 1), available))}
                  className="flex-1 text-center text-xl font-black border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                <button onClick={() => setQty((q) => Math.min(q + 1, available))} className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 hover:bg-emerald-200"><Plus size={18} /></button>
              </div>
              <p className="text-xs text-center text-gray-400 mt-1">متاح: {formatNumber(available)} كجم</p>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="ملاحظات للمزارع (اختياري)…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            <button
              onClick={() => mut.mutate({ items: [{ lotId: lot.id, requestedQty: qty }], buyerNotes: note || undefined })}
              disabled={mut.isPending}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-sm transition-colors disabled:opacity-60 shadow-lg"
            >
              {mut.isPending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {mut.isPending ? 'جارٍ الإرسال…' : `تأكيد — ${formatCurrency(qty * price)}`}
            </button>
            {mut.isError && <p className="text-xs text-red-500 text-center">حدث خطأ. يرجى المحاولة مجدداً.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Product card (lot) ────────────────────────────────────────────────────────
function LotCard({ lot, onOrder }: { lot: any; onOrder: () => void }) {
  const name      = lot.product?.nameAr || lot.product?.name || 'منتج';
  const catNameAr = lot.product?.category?.nameAr;
  const price     = Number(lot.askingPricePerKg ?? lot.pricePerUnit ?? 0);
  const available = Number(lot.qtyAvailable ?? lot.remainingKg ?? lot.availableQty ?? 0);
  const origPrice = Math.round(price * 1.15);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Image */}
      <div className="h-36 bg-emerald-50 flex items-center justify-center relative">
        <span className="text-6xl">🌿</span>
        {lot.lotNumber && (
          <span className="absolute bottom-2 right-2 bg-white/90 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
            #{lot.lotNumber}
          </span>
        )}
        {available < 100 && available > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
            كمية محدودة
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {catNameAr && <span className="text-[10px] font-bold text-emerald-700">{catNameAr}</span>}
        <h4 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug">{name}</h4>

        {/* Price */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-red-600">{formatCurrency(price)}</span>
            <span className="text-[10px] text-gray-400">/كجم</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 line-through">{formatCurrency(origPrice)}</span>
            <span className="text-[10px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded">-15%</span>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-1 text-[11px] text-gray-500">
          {available > 0 && (
            <div className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 size={10} />
              متوفر — {formatNumber(available)} كجم
            </div>
          )}
          {lot.harvestDate && (
            <div className="flex items-center gap-1">
              <Calendar size={10} />
              حصاد: {formatDate(lot.harvestDate)}
            </div>
          )}
          {lot.qualityGrade && (
            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
              درجة {lot.qualityGrade}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-auto pt-2 space-y-1.5">
          <Link
            href={`/marketplace/${lot.id}`}
            className={cn(
              'w-full font-black text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5',
              available > 0
                ? 'bg-amber-400 hover:bg-amber-500 text-gray-900'
                : 'bg-gray-200 text-gray-400 pointer-events-none',
            )}
          >
            <Zap size={12} />
            اطلب الآن
          </Link>
          <Link
            href={`/marketplace/${lot.id}`}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Package size={12} />
            التفاصيل
          </Link>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function FarmProfilePage({ params }: { params: Promise<{ farmId: string }> }) {
  const isClient = useIsClient();
  const { farmId } = use(params);
  const { isBuyer } = useAuth();
  const qc = useQueryClient();
  const [quickLot, setQuickLot] = useState<any>(null);

  const { data: farm, isLoading } = useQuery({
    queryKey: ['farm-v2', farmId],
    queryFn: () => farmsApi.get(farmId).then((r) => r.data),
    staleTime: 30_000,
  });

  const followMut   = useMutation({ mutationFn: () => farmsApi.follow(farmId),   onSuccess: () => qc.invalidateQueries({ queryKey: ['farm-v2', farmId] }) });
  const unfollowMut = useMutation({ mutationFn: () => farmsApi.unfollow(farmId), onSuccess: () => qc.invalidateQueries({ queryKey: ['farm-v2', farmId] }) });

  // Must be after all hooks — safe hydration guard
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-100 -m-6 animate-pulse">
        <div className="h-56 bg-emerald-600 opacity-70" />
        <div className="max-w-5xl mx-auto px-6 -mt-8 space-y-4 pt-4">
          <div className="bg-white rounded-2xl h-32" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-24" />)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-2xl h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 -m-6 animate-pulse">
        <div className="h-56 bg-gray-300" />
        <div className="max-w-5xl mx-auto px-6 -mt-8 space-y-4 pt-4">
          <div className="bg-white rounded-2xl h-32" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-gray-400">
        <Wheat size={52} className="text-gray-300" />
        <p className="font-semibold">المزرعة غير موجودة</p>
        <Link href="/farms" className="text-emerald-600 text-sm hover:underline font-bold">
          العودة للمزارع
        </Link>
      </div>
    );
  }

  const cover         = coverFor(farm.id);
  const catalogItems  = farm.catalogItems ?? [];
  const availableLots: any[] = farm.availableLots ?? [];
  const primaryProducts: string[] = farm.primaryProducts ?? [];
  const isProcessing  = followMut.isPending || unfollowMut.isPending;

  const totalKg = catalogItems.reduce((s: number, ci: any) => s + Number(ci.availableQty ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 -m-6" dir="rtl">

      {/* ══ COVER + HERO ══ */}
      <div className={cn('relative bg-gradient-to-br h-56 flex items-end', cover.grad)}>
        {/* Background pattern */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 text-[200px] select-none">
          {cover.emoji}
        </div>

        {/* Back btn */}
        <Link href="/farms" className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/30 hover:bg-black/40 text-white text-sm font-semibold px-3 py-1.5 rounded-full transition-colors backdrop-blur-sm">
          <ArrowRight size={14} />
          المزارع
        </Link>

        {/* Follow */}
        {isBuyer && (
          <button
            onClick={() => farm.isFollowing ? unfollowMut.mutate() : followMut.mutate()}
            disabled={isProcessing}
            className={cn(
              'absolute top-4 left-4 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all backdrop-blur-sm',
              farm.isFollowing
                ? 'bg-white/90 text-red-600 hover:bg-white'
                : 'bg-white/90 text-emerald-700 hover:bg-white',
            )}
          >
            <Heart size={15} fill={farm.isFollowing ? 'currentColor' : 'none'} />
            {farm.isFollowing ? 'متابَع ✓' : 'تابع المزرعة'}
          </button>
        )}

        {/* Farm name overlay */}
        <div className="relative w-full px-6 pb-6 pt-2">
          <div className="flex items-end gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl border-4 border-white/40 flex items-center justify-center text-4xl shadow-xl">
              {cover.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-white drop-shadow">{farm.farmName}</h1>
                {farm.isPrimary && (
                  <span className="bg-amber-400 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} /> موثّقة
                  </span>
                )}
              </div>
              <p className="text-emerald-200 text-sm">{farm.farmer?.businessName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-6 py-6">

        {/* ══ INFO CARD ══ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {farm.geoZone && (
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-500" />
                {farm.geoZone.zoneNameAr ?? farm.geoZone.zoneName}
              </div>
            )}
            {farm.farmer?.contactPhone && (
              <div className="flex items-center gap-1.5">
                <Phone size={14} className="text-gray-400" />
                {farm.farmer.contactPhone}
              </div>
            )}
            {farm.areaHectares != null && (
              <div className="flex items-center gap-1.5">
                <Scale size={14} className="text-gray-400" />
                {Number(farm.areaHectares).toFixed(1)} هكتار
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-purple-400" />
              {farm.followersCount ?? 0} متابع
            </div>
          </div>

          {/* Rating */}
          <Stars avg={farm.farmer?.ratingAvg} count={farm.farmer?.ratingCount} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-3 text-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                <Package size={16} className="text-emerald-600" />
              </div>
              <p className="text-xl font-black text-emerald-700">{catalogItems.length}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">منتج مُدرج</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-3 text-center">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                <TrendingUp size={16} className="text-amber-600" />
              </div>
              <p className="text-xl font-black text-amber-700">
                {totalKg >= 1000 ? `${(totalKg / 1000).toFixed(1)}k` : totalKg.toFixed(0)}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">كجم متاح</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-3 text-center">
              <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                <Users size={16} className="text-purple-600" />
              </div>
              <p className="text-xl font-black text-purple-700">{farm.followersCount ?? 0}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">متابع</p>
            </div>
          </div>

          {/* Primary products */}
          {primaryProducts.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">المنتجات الرئيسية</p>
              <div className="flex flex-wrap gap-2">
                {primaryProducts.map((p, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                    <Tag size={10} />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ AVAILABLE LOTS — PRODUCT GRID ══ */}
        {availableLots.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Store size={20} className="text-emerald-600" />
                المنتجات المتاحة للطلب
              </h2>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1 rounded-full">
                {availableLots.length} عرض
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {availableLots.map((lot: any) => (
                <LotCard key={lot.id} lot={lot} onOrder={() => setQuickLot(lot)} />
              ))}
            </div>
          </div>
        )}

        {/* ══ CATALOG TABLE ══ */}
        {catalogItems.length > 0 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">
              <Leaf size={20} className="text-emerald-600" />
              كتالوج المنتجات
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-4 text-xs font-bold text-gray-400 bg-gray-50 px-5 py-3 border-b border-gray-100">
                <span>المنتج</span>
                <span className="text-center">الفئة</span>
                <span className="text-center">السعر</span>
                <span className="text-left">الكمية</span>
              </div>
              <div className="divide-y divide-gray-50">
                {catalogItems.map((item: any) => {
                  const product = item.product ?? {};
                  const catAr   = product.category?.nameAr;
                  const price   = Number(item.pricePerUnit ?? 0);
                  const qty     = Number(item.availableQty ?? 0);
                  return (
                    <div key={item.id} className="grid grid-cols-4 items-center px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{product.nameAr ?? product.name}</p>
                        {item.grade && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold mt-0.5 inline-block">
                            درجة {item.grade}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        {catAr && (
                          <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                            {catAr}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-black text-red-600 text-sm">{formatCurrency(price)}</p>
                        <p className="text-[10px] text-gray-400">/كجم</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-emerald-700 text-sm">{formatNumber(qty)}</p>
                        <p className="text-[10px] text-gray-400">كجم</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty */}
        {catalogItems.length === 0 && availableLots.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center shadow-sm">
            <Package size={52} className="text-gray-200 mx-auto mb-4" />
            <p className="text-base font-bold text-gray-700">لا توجد منتجات متاحة حالياً</p>
            <p className="text-sm text-gray-400 mt-1">تابع المزرعة لتصلك الإشعارات عند إضافة منتجات</p>
            {isBuyer && !farm.isFollowing && (
              <button
                onClick={() => followMut.mutate()}
                disabled={isProcessing}
                className="mt-5 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Heart size={15} />
                تابع المزرعة
              </button>
            )}
          </div>
        )}
      </div>

      {/* Farm wall (social posts) */}
      {farm.farmer?.id && (
        <div className="max-w-5xl mx-auto px-6 pb-8">
          <FarmWall farmerId={farm.farmer.id} />
        </div>
      )}

      {/* Quick order modal */}
      {quickLot && <QuickOrderModal lot={quickLot} onClose={() => setQuickLot(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FARM WALL — read-only feed of the farmer's social posts
// (see #9 in product roadmap — gives visitors a public window into the farm)
// ══════════════════════════════════════════════════════════════════════════════
function FarmWall({ farmerId }: { farmerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['farm-wall', farmerId],
    queryFn: () => socialApi.wall('FARMER', farmerId).then((r) => r.data),
    staleTime: 60_000,
  });

  const posts: any[] = data?.data ?? data ?? [];

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={18} className="text-emerald-600" />
        <h2 className="text-base font-bold text-gray-900">منشورات المزرعة</h2>
        {posts.length > 0 && (
          <span className="text-xs text-gray-400">({posts.length})</span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-6">جارٍ تحميل المنشورات…</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">لم تنشر المزرعة شيئاً بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.slice(0, 10).map((p) => (
            <article key={p.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {p.authorName?.[0] || '🌾'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{p.authorName}</p>
                  <p className="text-[10px] text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
              </div>
              {p.content && (
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{p.content}</p>
              )}
              {p.mediaUrls?.length > 0 && (
                <div className="mt-2 rounded-lg overflow-hidden bg-gray-100">
                  {p.mediaType === 'VIDEO' ? (
                    <video src={p.mediaUrls[0]} controls className="w-full max-h-72 bg-black" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.mediaUrls[0]} alt="" className="w-full max-h-72 object-cover" />
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1"><Heart size={11} /> {p.reactionCount ?? 0}</span>
                <span className="flex items-center gap-1"><MessageCircle size={11} /> {p.commentCount ?? 0}</span>
              </div>
            </article>
          ))}
          {posts.length > 10 && (
            <p className="text-center text-xs text-gray-400 pt-1">
              … و {posts.length - 10} منشور آخر — افتح المجتمع لعرضها جميعاً
            </p>
          )}
        </div>
      )}
    </section>
  );
}
