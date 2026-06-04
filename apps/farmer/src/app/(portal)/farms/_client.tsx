'use client';
import { useState, useSyncExternalStore } from 'react';

// ── SSR-safe client guard ─────────────────────────────────────────────────────
// useSyncExternalStore uses getServerSnapshot (→ false) during hydration,
// ensuring server HTML and first-paint HTML are identical → no hydration error.
const _sub = () => () => {};
function useIsClient() {
  return useSyncExternalStore(_sub, () => true, () => false);
}
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  MapPin, Package, Star, Heart, Search,
  ChevronLeft, Leaf, TrendingUp, ShieldCheck,
  Store, Wheat,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COVER_THEMES = [
  { from: 'from-emerald-600', to: 'to-teal-700',   emoji: '🌾' },
  { from: 'from-green-600',   to: 'to-emerald-800', emoji: '🥦' },
  { from: 'from-amber-500',   to: 'to-orange-600',  emoji: '🍊' },
  { from: 'from-lime-600',    to: 'to-green-700',   emoji: '🌿' },
  { from: 'from-yellow-500',  to: 'to-amber-600',   emoji: '🌴' },
  { from: 'from-teal-600',    to: 'to-cyan-700',    emoji: '🌱' },
];

function coverTheme(id: string) {
  const n = id ? id.charCodeAt(0) % COVER_THEMES.length : 0;
  return COVER_THEMES[n];
}

function Stars({ avg, count }: { avg?: number | null; count?: number | null }) {
  if (avg == null) return null;
  const full = Math.floor(avg);
  const half = avg % 1 >= 0.5;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={
          i <= full ? 'text-amber-400 fill-amber-400'
          : i === full + 1 && half ? 'text-amber-400 fill-amber-200'
          : 'text-gray-300 fill-gray-100'
        } />
      ))}
      <span className="text-xs text-amber-600 font-bold ml-1">{Number(avg).toFixed(1)}</span>
      {count != null && <span className="text-xs text-gray-400">({count})</span>}
    </div>
  );
}

function FarmCard({
  farm, isBuyer, onToggleFollow, isPending,
}: {
  farm: any;
  isBuyer: boolean;
  onToggleFollow: (id: string, isFollowing: boolean) => void;
  isPending: boolean;
}) {
  const theme = coverTheme(farm.id);
  const topProducts = (farm.listedProducts ?? []).slice(0, 4);
  const productsCount = farm.listedProductsCount ?? farm.catalogItemsCount ?? 0;
  const availableKg = Number(farm.totalAvailableQty ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
      <div className={cn('relative h-28 bg-gradient-to-br flex items-center justify-center', theme.from, theme.to)}>
        <span className="text-6xl opacity-80 select-none">{theme.emoji}</span>
        {farm.isPrimary && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck size={10} />موثّقة
          </div>
        )}
        {isBuyer && (
          <button
            onClick={(e) => { e.preventDefault(); onToggleFollow(farm.id, farm.isFollowing); }}
            disabled={isPending}
            className={cn(
              'absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all backdrop-blur-sm',
              farm.isFollowing
                ? 'bg-red-500/90 text-white hover:bg-red-600'
                : 'bg-white/90 text-gray-700 hover:bg-white',
            )}
          >
            <Heart size={12} fill={farm.isFollowing ? 'currentColor' : 'none'} />
            {farm.isFollowing ? 'متابَع' : 'تابع'}
          </button>
        )}
        <div className="absolute -bottom-5 right-4 w-12 h-12 bg-white rounded-xl border-2 border-gray-200 flex items-center justify-center shadow-sm text-2xl">
          {theme.emoji}
        </div>
      </div>

      <div className="pt-8 px-4 pb-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-black text-gray-900 text-base leading-tight line-clamp-1">{farm.farmName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{farm.farmerName}</p>
          {farm.geoZone && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <MapPin size={11} className="text-emerald-500" />
              {farm.geoZone.zoneNameAr ?? farm.geoZone.zoneName}
            </div>
          )}
        </div>
        <Stars avg={farm.farmerRatingAvg} count={farm.farmerRatingCount} />
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
            <p className="font-black text-emerald-700 text-sm">{productsCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">منتج</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-2.5 text-center">
            <p className="font-black text-amber-700 text-sm">
              {availableKg >= 1000 ? `${(availableKg / 1000).toFixed(1)}k` : availableKg.toFixed(0)}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">كجم</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-2.5 text-center">
            <p className="font-black text-purple-700 text-sm">{farm.followersCount ?? 0}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">متابع</p>
          </div>
        </div>
        {topProducts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topProducts.map((p: any) => (
              <span key={p.productId} className="bg-gray-100 text-gray-600 text-[11px] font-semibold px-2 py-1 rounded-lg">
                {p.productNameAr ?? p.productName}
              </span>
            ))}
            {(farm.listedProducts ?? []).length > 4 && (
              <span className="text-[11px] text-gray-400 self-center">+{(farm.listedProducts ?? []).length - 4}</span>
            )}
          </div>
        )}
        <Link
          href={`/farms/${farm.id}`}
          className="mt-auto w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
        >
          <Store size={14} />تصفح المزرعة<ChevronLeft size={14} />
        </Link>
      </div>
    </div>
  );
}

export default function FarmsClient() {
  const isClient = useIsClient();
  const { isBuyer } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [liveSearch, setLiveSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'following'>('all');

  const { data: farmsData, isLoading } = useQuery({
    queryKey: ['farms-v2', liveSearch],
    queryFn: () => farmsApi.list({ search: liveSearch || undefined, limit: 50 }).then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: followingData, isLoading: followingLoading } = useQuery({
    queryKey: ['farms-following'],
    queryFn: () => farmsApi.following().then((r) => r.data),
    enabled: isBuyer,
    staleTime: 30_000,
  });

  const followMut   = useMutation({ mutationFn: (id: string) => farmsApi.follow(id),   onSuccess: () => { qc.invalidateQueries({ queryKey: ['farms-v2'] }); qc.invalidateQueries({ queryKey: ['farms-following'] }); } });
  const unfollowMut = useMutation({ mutationFn: (id: string) => farmsApi.unfollow(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['farms-v2'] }); qc.invalidateQueries({ queryKey: ['farms-following'] }); } });

  const toggleFollow = (id: string, isFollowing: boolean) =>
    isFollowing ? unfollowMut.mutate(id) : followMut.mutate(id);

  const allFarms     = farmsData?.data ?? [];
  const followedList = Array.isArray(followingData) ? followingData : (followingData?.data ?? []);
  // Guard: f.farm may be null (not just undefined) — filter before spread
  const followedFarms = followedList
    .map((f: any) => (f?.farm != null ? { ...f.farm, isFollowing: true } : f?.id != null ? { ...f, isFollowing: true } : null))
    .filter(Boolean);
  const displayFarms  = tab === 'following' ? followedFarms : allFarms;
  const loading       = tab === 'all' ? isLoading : followingLoading;
  const isPending     = followMut.isPending || unfollowMut.isPending;
  const totalKg       = allFarms.reduce((s: number, f: any) => s + Number(f.totalAvailableQty ?? 0), 0);
  const totalProducts = allFarms.reduce((s: number, f: any) => s + Number(f.listedProductsCount ?? 0), 0);

  // Must be after all hooks — safe hydration guard
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-100 -m-6">
        <div className="h-56 bg-gradient-to-l from-emerald-800 to-emerald-600 animate-pulse" />
        <div className="max-w-5xl mx-auto px-6 -mt-8 mb-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse h-72" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 -m-6" dir="rtl">

      {/* HEADER */}
      <div className="bg-gradient-to-l from-emerald-800 to-emerald-600 px-6 pt-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Wheat size={24} className="text-amber-400" />
            <h1 className="text-2xl font-black text-white">اكتشف المزارع السعودية</h1>
          </div>
          <p className="text-emerald-200 text-sm mb-6">
            تواصل مباشرة مع أكثر من {farmsData?.meta?.total ?? allFarms.length} مزرعة معتمدة
          </p>
          <div className="flex gap-2 bg-white rounded-xl overflow-hidden shadow-lg border-2 border-amber-400">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setLiveSearch(search)}
              placeholder="ابحث عن مزرعة أو مزارع أو منطقة..."
              className="flex-1 px-4 py-3 text-sm focus:outline-none text-gray-900"
            />
            <button onClick={() => setLiveSearch(search)} className="bg-amber-400 hover:bg-amber-500 px-5 flex items-center justify-center transition-colors">
              <Search size={18} className="text-gray-900" />
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="max-w-5xl mx-auto px-6 -mt-8 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 text-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-2"><Store size={20} className="text-emerald-600" /></div>
            <p className="text-2xl font-black text-gray-900">{farmsData?.meta?.total ?? allFarms.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">مزرعة معتمدة</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 text-center">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-2"><Package size={20} className="text-amber-600" /></div>
            <p className="text-2xl font-black text-gray-900">{totalProducts}</p>
            <p className="text-xs text-gray-500 mt-0.5">منتج نشط</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2"><TrendingUp size={20} className="text-blue-600" /></div>
            <p className="text-2xl font-black text-gray-900">
              {totalKg >= 1000 ? `${(totalKg / 1000).toFixed(0)}k` : totalKg.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">كجم متاح</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-12 space-y-5">

        {/* TABS */}
        {isBuyer && (
          <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-200 w-fit">
            <button onClick={() => setTab('all')} className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all', tab === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100')}>
              <Store size={15} />جميع المزارع
            </button>
            <button onClick={() => setTab('following')} className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all', tab === 'following' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100')}>
              <Heart size={15} />متابَعة
              {followedFarms.length > 0 && (
                <span className={cn('text-[11px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1', tab === 'following' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')}>
                  {followedFarms.length}
                </span>
              )}
            </button>
          </div>
        )}

        {!loading && (
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{displayFarms.length}</span> مزرعة
            {liveSearch ? <> · نتائج "<strong>{liveSearch}</strong>"</> : ''}
          </p>
        )}

        {/* GRID */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-28 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="grid grid-cols-3 gap-2">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
                  </div>
                  <div className="h-9 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : displayFarms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center shadow-sm">
            {tab === 'following' ? (
              <>
                <Heart size={52} className="mx-auto text-gray-200 mb-4" />
                <p className="text-base font-bold text-gray-700">لا توجد مزارع متابَعة بعد</p>
                <p className="text-sm text-gray-400 mt-1">تصفح المزارع وتابع المزارع التي تهمك</p>
                <button onClick={() => setTab('all')} className="mt-5 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
                  تصفح المزارع
                </button>
              </>
            ) : (
              <>
                <Leaf size={52} className="mx-auto text-gray-200 mb-4" />
                <p className="text-base font-bold text-gray-700">لا توجد مزارع مطابقة</p>
                {liveSearch && (
                  <button onClick={() => { setSearch(''); setLiveSearch(''); }} className="mt-4 text-emerald-600 text-sm hover:underline font-semibold">
                    مسح البحث
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayFarms.map((farm: any) => (
              <FarmCard key={farm.id} farm={farm} isBuyer={isBuyer} onToggleFollow={toggleFollow} isPending={isPending} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
