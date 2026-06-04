'use client';
import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { farmerApi, buyerApi, ordersApi, financialApi, notificationsApi, listingsApi, farmsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Package, ShoppingBag, DollarSign, AlertCircle,
  ChevronLeft, CheckCircle, Clock, XCircle, Store,
  ReceiptText, Bell, Box, TrendingUp, Wheat, MapPin,
  Zap, Star, Heart, ArrowLeft,
} from 'lucide-react';

// ── Hydration guard ───────────────────────────────────────────────────────────
const _sub = () => () => {};
function useIsClient() {
  return useSyncExternalStore(_sub, () => true, () => false);
}

// ── Status helpers ────────────────────────────────────────────────────────────
function statusIcon(status: string) {
  if (['DELIVERED', 'CONFIRMED'].includes(status)) return <CheckCircle size={13} className="text-emerald-500" />;
  if (['CANCELLED', 'REJECTED'].includes(status)) return <XCircle size={13} className="text-red-400" />;
  return <Clock size={13} className="text-amber-400" />;
}
const statusLabel: Record<string, string> = {
  PENDING: 'معلق', CONFIRMED: 'مؤكد', PROCESSING: 'جارٍ التجهيز',
  READY_FOR_PICKUP: 'جاهز للاستلام', IN_TRANSIT: 'في الطريق',
  DELIVERED: 'تم التوصيل', CANCELLED: 'ملغي', REJECTED: 'مرفوض',
};

// ── Cover palette (for farms & products) ─────────────────────────────────────
const THEMES = [
  { from: 'from-emerald-600', to: 'to-teal-700',   emoji: '🌾' },
  { from: 'from-green-600',   to: 'to-emerald-800', emoji: '🥦' },
  { from: 'from-amber-500',   to: 'to-orange-600',  emoji: '🍊' },
  { from: 'from-lime-600',    to: 'to-green-700',   emoji: '🌿' },
  { from: 'from-yellow-500',  to: 'to-amber-600',   emoji: '🌴' },
  { from: 'from-teal-600',    to: 'to-cyan-700',    emoji: '🌱' },
];
const theme = (id: string) => THEMES[(id.codePointAt(0) ?? 0) % THEMES.length];

// ═════════════════════════════════════════════════════════════════════════════
// FARMER DASHBOARD (unchanged logic, preserved)
// ═════════════════════════════════════════════════════════════════════════════
function FarmerDashboard() {
  const { user } = useAuth();

  const { data: recentOrders } = useQuery({ queryKey: ['farmer-orders-recent'], queryFn: () => ordersApi.list({ page: 1, limit: 5 }).then(r => r.data) });
  const { data: stats }        = useQuery({ queryKey: ['farmer-stats'],          queryFn: () => farmerApi.stats().then(r => r.data) });
  const { data: summary }      = useQuery({ queryKey: ['farmer-financial-summary'], queryFn: () => financialApi.summary().then(r => r.data) });
  const { data: notifData }    = useQuery({ queryKey: ['farmer-notifs-recent'],  queryFn: () => notificationsApi.list({ page: 1, limit: 4, isRead: false }).then(r => r.data) });
  const { data: lotsData }     = useQuery({ queryKey: ['farmer-listings-summary'], queryFn: () => listingsApi.myListings().then(r => r.data) });

  const orders        = recentOrders?.data ?? [];
  const notifications = notifData?.data ?? [];
  const activeLots    = lotsData?.data ?? [];

  return (
    <div className="space-y-5 sm:p-6">
      <div className="bg-brand-700 rounded-2xl p-5 text-white">
        <p className="text-brand-200 text-sm">مرحباً</p>
        <h1 className="text-xl font-bold mt-0.5">{user?.farmer?.businessName || user?.email} 👋</h1>
        {user?.farmer?.kycStatus === 'PENDING' && (
          <div className="mt-3 bg-white/20 rounded-xl p-3 text-sm">⏳ حسابك قيد المراجعة — سيتم إشعارك عند الموافقة</div>
        )}
        {user?.farmer?.kycStatus === 'APPROVED' && (
          <div className="mt-3 bg-white/20 rounded-xl p-3 text-sm flex items-center gap-2">
            <CheckCircle size={15} /> حسابك معتمد — يمكنك البدء بنشر عروضك
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'إجمالي الطلبات', value: recentOrders?.meta?.total ?? '—', icon: ShoppingBag, color: 'bg-brand-50 text-brand-600' },
          { label: 'عروضي النشطة',  value: stats?.activeListings ?? '—',       icon: Package,     color: 'bg-brand-50 text-brand-600' },
          { label: 'مدفوعات معلقة', value: formatCurrency(summary?.payouts?.totalQueuedAmount), icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
          { label: 'نزاعات مفتوحة', value: stats?.openDisputes ?? '0',          icon: AlertCircle, color: 'bg-red-50 text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.color)}><s.icon size={20} /></div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/listings/new" className="flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-3 rounded-xl text-sm font-medium hover:bg-brand-100 transition-colors"><Package size={16} /> نشر عرض جديد</Link>
          <Link href="/orders"       className="flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-3 rounded-xl text-sm font-medium hover:bg-brand-100 transition-colors"><ShoppingBag size={16} /> الطلبات الواردة</Link>
          <Link href="/payments"     className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"><DollarSign size={16} /> المدفوعات</Link>
          <Link href="/contracts"    className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-3 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors"><TrendingUp size={16} /> عقودي</Link>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2"><Bell size={14} className="text-brand-600" /><h2 className="text-sm font-bold text-gray-700">الإشعارات الجديدة</h2><span className="text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-medium">{notifications.length}</span></div>
            <Link href="/notifications" className="text-xs text-brand-600 flex items-center gap-0.5 hover:underline">عرض الكل <ChevronLeft size={12} /></Link>
          </div>
          <div className="divide-y divide-gray-100">
            {notifications.map((n: { id: string; title: string; body: string; createdAt: string }) => (
              <div key={n.id} className="flex gap-3 px-4 py-3"><div className="w-2 h-2 rounded-full bg-brand-500 mt-2 flex-shrink-0" /><div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{n.title}</p><p className="text-xs text-gray-400 mt-0.5">{n.body}</p><p className="text-xs text-gray-300 mt-1">{formatDate(n.createdAt)}</p></div></div>
            ))}
          </div>
        </div>
      )}

      {activeLots.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2"><Box size={14} className="text-green-600" /><h2 className="text-sm font-bold text-gray-700">عروضي النشطة</h2></div>
            <Link href="/listings" className="text-xs text-brand-600 flex items-center gap-0.5 hover:underline">عرض الكل <ChevronLeft size={12} /></Link>
          </div>
          <div className="divide-y divide-gray-100">
            {activeLots.map((lot: { id: string; product?: { name: string; nameAr?: string }; gradeLabel?: string; availableQty?: number; pricePerUnit?: number; unitOfMeasure?: string }) => (
              <div key={lot.id} className="flex items-center justify-between px-4 py-3">
                <div><p className="text-sm font-medium text-gray-900">{lot.product?.nameAr || lot.product?.name || '—'}</p>{lot.gradeLabel && <span className="text-xs bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-medium">{lot.gradeLabel}</span>}</div>
                <div className="text-left"><p className="text-sm font-bold text-gray-900">{lot.pricePerUnit ? formatCurrency(lot.pricePerUnit) : '—'}</p><p className="text-xs text-gray-400">{lot.availableQty ?? '—'} {lot.unitOfMeasure || 'كغ'}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">آخر الطلبات</h2>
          <Link href="/orders" className="text-xs text-brand-600 flex items-center gap-0.5 hover:underline">عرض الكل <ChevronLeft size={12} /></Link>
        </div>
        {orders.length === 0 ? <div className="py-10 text-center text-gray-400 text-sm">لا توجد طلبات بعد</div> : (
          <div className="divide-y divide-gray-100">
            {orders.map((o: { id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string; buyer?: { businessName: string } }) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5">{statusIcon(o.status)}<span className="text-sm font-medium text-gray-900">{o.orderNumber}</span></div><p className="text-xs text-gray-400 mt-0.5">{o.buyer?.businessName || '—'} · {formatDate(o.createdAt)}</p></div>
                <div className="text-left"><p className="text-sm font-semibold text-gray-900">{formatCurrency(o.totalAmount)}</p><p className="text-xs text-gray-400">{statusLabel[o.status] || o.status}</p></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BUYER DASHBOARD — Amazon-style
// ═════════════════════════════════════════════════════════════════════════════
function BuyerDashboard() {
  const { user } = useAuth();

  const { data: statsData }     = useQuery({ queryKey: ['buyer-stats-home'],    queryFn: () => buyerApi.stats().then(r => r.data) });
  const { data: recentOrders }  = useQuery({ queryKey: ['buyer-orders-home'],   queryFn: () => ordersApi.list({ page: 1, limit: 4 }).then(r => r.data) });
  const { data: lotsData }      = useQuery({ queryKey: ['buyer-featured-lots'], queryFn: () => listingsApi.list({ page: 1, limit: 8, status: 'AVAILABLE' }).then(r => r.data) });
  const { data: followingData } = useQuery({ queryKey: ['buyer-followed-farms-home'], queryFn: () => farmsApi.following().then(r => r.data) });
  const { data: notifData }     = useQuery({ queryKey: ['buyer-notifs-home'],   queryFn: () => notificationsApi.list({ page: 1, limit: 3, isRead: false }).then(r => r.data) });

  const orders        = recentOrders?.data ?? [];
  const lots          = lotsData?.data ?? [];
  const followedRaw   = Array.isArray(followingData) ? followingData : (followingData?.data ?? []);
  // f.farm ?? f guards undefined, but not null — filter nulls explicitly
  const followedFarms = followedRaw
    .map((f: any) => f?.farm ?? f)
    .filter((f: any) => f != null && f.id)
    .slice(0, 4);
  const notifications = notifData?.data ?? [];
  const name          = user?.buyer?.businessName || user?.email || 'مشتري';

  return (
    <div className="min-h-screen bg-gray-100 -mx-4 -mt-4" dir="rtl">

      {/* ══ HERO BANNER ════════════════════════════════════════════════════ */}
      <div className="relative bg-gradient-to-l from-emerald-900 to-emerald-600 px-4 pt-6 pb-20 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200&q=80&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
        <div className="relative max-w-3xl mx-auto">
          {/* KYC banner */}
          {user?.buyer?.kycStatus === 'PENDING' && (
            <div className="mb-4 bg-amber-400/20 border border-amber-400/30 rounded-xl px-4 py-2.5 flex items-center gap-2 text-amber-200 text-sm">
              ⏳ حسابك قيد المراجعة — سيتم إشعارك عند الموافقة
            </div>
          )}
          {user?.buyer?.kycStatus === 'APPROVED' && (
            <div className="mb-4 bg-emerald-400/20 border border-emerald-400/30 rounded-xl px-4 py-2.5 flex items-center gap-2 text-emerald-200 text-sm">
              <CheckCircle size={14} /> حسابك معتمد
            </div>
          )}

          <p className="text-emerald-200 text-sm mb-1">مرحباً،</p>
          <h1 className="text-2xl font-black text-white leading-tight mb-1">{name} 👋</h1>
          <p className="text-emerald-200 text-sm">تسوّق من أفضل المزارع السعودية مباشرةً</p>

          {/* Quick action buttons */}
          <div className="flex gap-2 mt-5">
            <Link href="/marketplace" className="flex-1 flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black text-sm py-3 rounded-xl transition-colors">
              <Store size={16} /> تصفح السوق
            </Link>
            <Link href="/farms" className="flex-1 flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm py-3 rounded-xl transition-colors border border-white/20">
              <Wheat size={16} /> المزارع
            </Link>
            <Link href="/orders" className="flex-shrink-0 flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm py-3 px-4 rounded-xl transition-colors border border-white/20">
              <ShoppingBag size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-10 space-y-5 pb-12">

        {/* ══ STATS CARDS ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'طلباتي',        value: recentOrders?.meta?.total ?? '—', icon: ShoppingBag, bg: 'bg-brand-50',   text: 'text-brand-700' },
            { label: 'منتجات متاحة',  value: statsData?.availableProducts ?? '—', icon: Package, bg: 'bg-emerald-50', text: 'text-emerald-700' },
            { label: 'مزارع متابَعة', value: followedFarms.length, icon: Heart, bg: 'bg-rose-50', text: 'text-rose-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 text-center">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', s.bg, s.text)}><s.icon size={18} /></div>
              <p className={cn('text-xl font-black', s.text)}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ══ FEATURED PRODUCTS ══════════════════════════════════════════ */}
        {lots.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                <h2 className="text-base font-black text-gray-900">منتجات مميزة</h2>
              </div>
              <Link href="/marketplace" className="text-xs text-brand-600 font-bold flex items-center gap-0.5 hover:underline">
                عرض الكل <ChevronLeft size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {lots.map((lot: any) => {
                const t = theme(lot.id);
                return (
                  <Link
                    key={lot.id}
                    href={`/marketplace/${lot.id}`}
                    className="bg-white rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className={cn('h-20 bg-gradient-to-br flex items-center justify-center', t.from, t.to)}>
                      <span className="text-4xl">{t.emoji}</span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-black text-gray-900 line-clamp-1">
                        {lot.product?.nameAr || lot.product?.name || '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {lot.farmer?.businessName || ''}
                      </p>
                      <p className="text-sm font-black text-brand-700 mt-1.5">
                        {formatCurrency(lot.askingPricePerKg ?? lot.pricePerUnit ?? 0)}
                        <span className="text-xs font-normal text-gray-400">/كغ</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ FOLLOWED FARMS ═════════════════════════════════════════════ */}
        {followedFarms.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-rose-500" />
                <h2 className="text-base font-black text-gray-900">مزارعي المفضلة</h2>
              </div>
              <Link href="/farms" className="text-xs text-brand-600 font-bold flex items-center gap-0.5 hover:underline">
                عرض الكل <ChevronLeft size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {followedFarms.map((farm: any) => {
                const t = theme(farm.id ?? '0');
                return (
                  <Link
                    key={farm.id}
                    href={`/farms/${farm.id}`}
                    className="bg-white rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all overflow-hidden flex items-center gap-3 p-3"
                  >
                    <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-2xl', t.from, t.to)}>
                      {t.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-gray-900 truncate">{farm.farmName || '—'}</p>
                      {farm.geoZone && (
                        <p className="text-xs text-gray-500 flex items-center gap-0.5 mt-0.5 truncate">
                          <MapPin size={10} className="text-emerald-500 flex-shrink-0" />
                          {farm.geoZone.zoneNameAr ?? farm.geoZone.zoneName}
                        </p>
                      )}
                    </div>
                    <ChevronLeft size={14} className="text-gray-300 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ QUICK LINKS (when no data yet) ═════════════════════════════ */}
        {followedFarms.length === 0 && lots.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
            <Store size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-base font-bold text-gray-700 mb-1">ابدأ رحلة التسوق</p>
            <p className="text-sm text-gray-400 mb-5">تصفح السوق وتابع المزارع التي تعجبك</p>
            <div className="flex gap-2 justify-center">
              <Link href="/marketplace" className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                <Store size={15} /> السوق
              </Link>
              <Link href="/farms" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                <Wheat size={15} /> المزارع
              </Link>
            </div>
          </div>
        )}

        {/* ══ NOTIFICATIONS ══════════════════════════════════════════════ */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-brand-600" />
                <h2 className="text-sm font-bold text-gray-700">الإشعارات الجديدة</h2>
                <span className="text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-medium">{notifications.length}</span>
              </div>
              <Link href="/notifications" className="text-xs text-brand-600 flex items-center gap-0.5 hover:underline">عرض الكل <ChevronLeft size={12} /></Link>
            </div>
            <div className="divide-y divide-gray-100">
              {notifications.map((n: { id: string; title: string; body: string; createdAt: string }) => (
                <div key={n.id} className="flex gap-3 px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-300 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ RECENT ORDERS ══════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingBag size={14} className="text-brand-600" />
              <h2 className="text-sm font-bold text-gray-700">آخر الطلبات</h2>
            </div>
            <Link href="/orders" className="text-xs text-brand-600 flex items-center gap-0.5 hover:underline">عرض الكل <ChevronLeft size={12} /></Link>
          </div>
          {orders.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              <ShoppingBag size={32} className="mx-auto mb-2 text-gray-200" />
              لم تقم بأي طلب بعد —{' '}
              <Link href="/marketplace" className="text-brand-600 hover:underline font-semibold">تصفح السوق</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.map((o: { id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string; farmer?: { businessName: string } }) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">{statusIcon(o.status)}<span className="text-sm font-medium text-gray-900">{o.orderNumber}</span></div>
                    <p className="text-xs text-gray-400 mt-0.5">{o.farmer?.businessName || '—'} · {formatDate(o.createdAt)}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(o.totalAmount)}</p>
                    <p className="text-xs text-gray-400">{statusLabel[o.status] || o.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ══ FOOTER LINKS ═══════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/contracts" className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 hover:border-brand-300 transition-colors">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center"><ReceiptText size={18} className="text-purple-600" /></div>
            <div><p className="text-sm font-bold text-gray-900">عقودي</p><p className="text-xs text-gray-500">إدارة العقود</p></div>
          </Link>
          <Link href="/disputes" className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 hover:border-brand-300 transition-colors">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center"><AlertCircle size={18} className="text-red-500" /></div>
            <div><p className="text-sm font-bold text-gray-900">النزاعات</p><p className="text-xs text-gray-500">تتبع النزاعات</p></div>
          </Link>
        </div>

      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT — hydration-safe role switch
// ═════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const isClient    = useIsClient();
  const { isFarmer } = useAuth();

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-100 -mx-4 -mt-4 animate-pulse">
        <div className="h-48 bg-brand-700/70" />
        <div className="max-w-3xl mx-auto px-4 -mt-8 space-y-4 pt-2">
          <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24" />)}</div>
          <div className="bg-white rounded-2xl h-40" />
          <div className="bg-white rounded-2xl h-32" />
        </div>
      </div>
    );
  }

  return isFarmer ? <FarmerDashboard /> : <BuyerDashboard />;
}
