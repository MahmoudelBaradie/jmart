'use client';
import { useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import Link from 'next/link';
import {
  ShoppingBag, ChevronLeft, CheckCircle, Clock, XCircle,
  Package, Truck, Store, AlertCircle, TrendingUp,
} from 'lucide-react';

// ── Hydration guard ───────────────────────────────────────────────────────────
const _sub = () => () => {};
function useIsClient() {
  return useSyncExternalStore(_sub, () => true, () => false);
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { text: string; badge: string; dot: string; icon: React.ElementType }> = {
  PENDING:          { text: 'معلق',            badge: 'bg-amber-50  text-amber-700  border border-amber-200',   dot: 'bg-amber-400',   icon: Clock },
  CONFIRMED:        { text: 'مؤكد',            badge: 'bg-blue-50   text-blue-700   border border-blue-200',    dot: 'bg-blue-400',    icon: CheckCircle },
  PROCESSING:       { text: 'جارٍ التجهيز',    badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200',  dot: 'bg-indigo-400',  icon: Package },
  READY_FOR_PICKUP: { text: 'جاهز للاستلام',  badge: 'bg-purple-50 text-purple-700 border border-purple-200',  dot: 'bg-purple-400',  icon: Package },
  IN_TRANSIT:       { text: 'في الطريق',       badge: 'bg-sky-50    text-sky-700    border border-sky-200',     dot: 'bg-sky-400',     icon: Truck },
  DELIVERED:        { text: 'تم التوصيل',      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400', icon: CheckCircle },
  CANCELLED:        { text: 'ملغي',            badge: 'bg-red-50    text-red-600    border border-red-200',     dot: 'bg-red-400',     icon: XCircle },
  REJECTED:         { text: 'مرفوض',           badge: 'bg-red-50    text-red-600    border border-red-200',     dot: 'bg-red-400',     icon: XCircle },
};

// Emoji derived from order id for visual variety
const ORDER_EMOJIS = ['🌾', '🥦', '🍊', '🌿', '🌴', '🌱', '🫘', '🥜', '🍯', '🥛'];
const orderEmoji = (id: string) => ORDER_EMOJIS[(id.codePointAt(0) ?? 0) % ORDER_EMOJIS.length];

const FARMER_TABS = [
  { value: '',          label: 'الكل',         icon: '📋' },
  { value: 'PENDING',   label: 'معلقة',        icon: '⏳' },
  { value: 'CONFIRMED', label: 'مؤكدة',        icon: '✅' },
  { value: 'IN_TRANSIT',label: 'في الطريق',    icon: '🚚' },
  { value: 'DELIVERED', label: 'مكتملة',       icon: '🎉' },
  { value: 'CANCELLED', label: 'ملغية',        icon: '❌' },
];

const BUYER_TABS = [
  { value: '',           label: 'الكل',         icon: '📋' },
  { value: 'PENDING',    label: 'معلقة',        icon: '⏳' },
  { value: 'PROCESSING', label: 'جارٍ التجهيز', icon: '⚙️' },
  { value: 'IN_TRANSIT', label: 'في الطريق',    icon: '🚚' },
  { value: 'DELIVERED',  label: 'مكتملة',       icon: '🎉' },
  { value: 'CANCELLED',  label: 'ملغية',        icon: '❌' },
];

const PAGE_SIZE = 15;

export default function OrdersPage() {
  const isClient   = useIsClient();
  const { isFarmer } = useAuth();
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);

  const tabs = isFarmer ? FARMER_TABS : BUYER_TABS;
  // Brand color is the same regardless of role — the portal's identity is
  // emerald (Jmart brand) across both farmer and buyer views.
  const accentColor = 'bg-emerald-600';
  const accentText  = 'text-emerald-600';
  const headerGrad  = 'from-emerald-800 to-emerald-600';

  // Fetch all orders (high limit) — client-side filtering for status.
  // ?as=buyer|farmer disambiguates dual-role accounts so the buyer view
  // doesn't get hidden behind the farmer view (and vice versa).
  const roleParam = isFarmer ? 'farmer' : 'buyer';
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['orders-v2', roleParam],
    queryFn: () => ordersApi.list({ page: 1, limit: 100, as: roleParam }).then((r) => r.data),
    staleTime: 30_000,
  });

  const allOrders   = rawData?.data ?? [];
  const filtered    = status ? allOrders.filter((o: any) => o.status === status) : allOrders;
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const orders      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const meta        = { total: filtered.length, page: safePage, totalPages };

  // ── Hydration skeleton ────────────────────────────────────────────────────
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-100 -mx-4 -mt-4">
        <div className="h-28 bg-blue-700 animate-pulse" />
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 -mx-4 -mt-4" dir="rtl">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className={cn('bg-gradient-to-l px-4 pt-6 pb-12', headerGrad)}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={20} className="text-white/80" />
            <h1 className="text-xl font-black text-white">
              {isFarmer ? 'الطلبات الواردة' : 'طلباتي'}
            </h1>
          </div>
          <p className="text-white/60 text-sm">
            {meta?.total != null ? `${meta.total} طلب إجمالاً` : 'جارٍ التحميل…'}
          </p>

          {/* Stats chips */}
          {meta && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {[
                { label: 'إجمالي', value: meta.total, bg: 'bg-white/20' },
                { label: 'الصفحة', value: `${safePage}/${totalPages}`, bg: 'bg-white/10' },
              ].map(s => (
                <span key={s.label} className={cn('text-xs font-bold text-white px-3 py-1.5 rounded-full', s.bg)}>
                  {s.label}: {s.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ TABS ════════════════════════════════════════════════════════════ */}
      <div className="sticky top-14 z-20 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-none py-2">
            {tabs.map(t => (
              <button
                key={t.value}
                onClick={() => { setStatus(t.value); setPage(1); }}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
                  status === t.value
                    ? cn(accentColor, 'text-white shadow-sm')
                    : 'text-gray-500 hover:bg-gray-100',
                )}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CONTENT ═════════════════════════════════════════════════════════ */}
      <div className="max-w-3xl mx-auto px-4 -mt-6 pb-12 space-y-3">

        {/* Loading skeletons */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-20" />
              </div>
            </div>
          ))
        ) : orders.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────── */
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center shadow-sm mt-3">
            <ShoppingBag size={52} className="mx-auto text-gray-200 mb-4" />
            <p className="text-base font-bold text-gray-700">
              {status ? 'لا توجد طلبات بهذه الحالة' : 'لا توجد طلبات بعد'}
            </p>
            {!isFarmer && !status && (
              <p className="text-sm text-gray-400 mt-1 mb-5">اطلب من السوق وستظهر طلباتك هنا</p>
            )}
            {!isFarmer && (
              <Link href="/marketplace" className={cn('inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors', accentColor, 'hover:opacity-90')}>
                <Store size={16} /> تصفح السوق
              </Link>
            )}
            {status && (
              <button onClick={() => setStatus('')} className={cn('mt-4 text-sm font-semibold hover:underline', accentText)}>
                عرض كل الطلبات
              </button>
            )}
          </div>
        ) : (
          /* ── Order cards ─────────────────────────────────────────────── */
          orders.map((o: {
            id: string; orderNumber: string; status: string;
            totalAmount: number; createdAt: string;
            buyer?: { businessName: string };
            farmer?: { businessName: string };
            _count?: { items: number };
          }) => {
            const cfg         = STATUS_CFG[o.status] ?? { text: o.status, badge: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400', icon: Clock };
            const Icon        = cfg.icon;
            const counterpart = isFarmer ? o.buyer?.businessName : o.farmer?.businessName;
            const itemsCount  = o._count?.items;
            const emoji       = orderEmoji(o.id);

            return (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-4 flex gap-3 items-start">
                  {/* Emoji avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-gray-900 truncate">{o.orderNumber}</p>
                      <ChevronLeft size={15} className="text-gray-300 flex-shrink-0" />
                    </div>
                    {counterpart && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{counterpart}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(o.createdAt)}</p>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50/50">
                  <span className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold', cfg.badge)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                    <Icon size={11} />
                    {cfg.text}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-black text-gray-900">{formatCurrency(o.totalAmount)}</p>
                    {itemsCount != null && (
                      <p className="text-xs text-gray-400">{itemsCount} منتج</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}

        {/* ── Pagination ───────────────────────────────────────────────── */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold disabled:opacity-40 hover:border-gray-300 transition-colors"
            >
              السابق
            </button>
            <span className="text-sm text-gray-500 font-medium">
              {safePage} <span className="text-gray-300">/</span> {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold disabled:opacity-40 hover:border-gray-300 transition-colors"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
