import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Image, Pressable, TextInput,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { listingsApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { productImage } from '@/lib/product-images';
import { useLocale } from '@/hooks/useLocale';
import AppHeader from '@/components/shared/AppHeader';

const { width: SW } = Dimensions.get('window');
const C = {
  bg: '#fdfaf3',
  card: '#ffffff',
  text: '#1f2937',
  textMute: '#6b7280',
  textSoft: '#9ca3af',
  brand: '#16a34a',
  brandDark: '#15803d',
  brandTint: '#dcfce7',
  brandSoft: '#f0fdf4',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  red: '#dc2626',
  redSoft: '#fee2e2',
  blue: '#0ea5e9',
  blueSoft: '#e0f2fe',
  purple: '#7c3aed',
  purpleSoft: '#ede9fe',
  border: '#e5e7eb',
};

type TabKey = 'active' | 'all' | 'sold' | 'expired';

export default function ListingsScreen() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const [tab, setTab] = useState<TabKey>('active');
  const [search, setSearch] = useState('');
  const farmerId = (user as any)?.farmer?.id;

  // Always fetch ALL lots once; tabs filter client-side so the stats stay
  // consistent across tabs without extra round-trips.
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-lots-all', farmerId],
    queryFn: () => listingsApi.list({ farmerId, limit: 100 }).then((r) => r.data),
    enabled: !!farmerId,
  });

  const allItems: any[] = data?.data ?? data?.items ?? [];

  // ── Stats from ALL lots (always accurate) ─────────────────────────────────
  const stats = useMemo(() => {
    const active = allItems.filter((l) => l.status === 'AVAILABLE');
    const totalKg = active.reduce((s, l) => s + Number(l.qtyAvailable ?? 0), 0);
    const totalSold = allItems.reduce((s, l) => {
      const t = Number(l.qtyTotal ?? 0);
      const a = Number(l.qtyAvailable ?? 0);
      return s + Math.max(t - a, 0);
    }, 0);
    const inventoryValue = active.reduce(
      (s, l) => s + Number(l.qtyAvailable ?? 0) * Number(l.pricePerKg ?? l.askingPricePerKg ?? 0),
      0,
    );
    return { totalLots: allItems.length, activeLots: active.length, totalKg, totalSold, inventoryValue };
  }, [allItems]);

  // ── Filtered items based on tab + search ──────────────────────────────────
  const items = useMemo(() => {
    let arr = allItems;
    if (tab === 'active')  arr = arr.filter((l) => l.status === 'AVAILABLE');
    if (tab === 'sold')    arr = arr.filter((l) => Number(l.qtyAvailable ?? 0) === 0);
    if (tab === 'expired') arr = arr.filter((l) => l.expiryDate && new Date(l.expiryDate) < new Date());
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((l) => {
        const name = l.product?.nameAr ?? l.product?.name ?? '';
        return name.toLowerCase().includes(q) || (l.lotNumber ?? '').toLowerCase().includes(q);
      });
    }
    return arr;
  }, [allItems, tab, search]);

  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: 'active',  label: t('listings.tab.active'),  icon: 'leaf' },
    { key: 'all',     label: t('listings.tab.all'),     icon: 'apps' },
    { key: 'sold',    label: t('listings.tab.sold'),    icon: 'checkmark-circle' },
    { key: 'expired', label: t('listings.tab.expired'), icon: 'time' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title={t('listings.title')} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={C.brand}
          />
        }
        renderItem={({ item }) => <LotCard lot={item} t={t} locale={locale} />}
        ListHeaderComponent={
          <View>
            {/* Hero stats card */}
            <View style={s.heroWrap}>
              <View style={s.hero}>
                <View style={[s.blob, s.blob1]} />
                <View style={[s.blob, s.blob2]} />

                <View style={s.heroTop}>
                  <View>
                    <Text style={s.heroLabel}>{stats.totalLots} {t('listings.stats.total')}</Text>
                    <Text style={s.heroValue}>{formatCurrency(stats.inventoryValue)}</Text>
                    <Text style={s.heroSub}>{t('listings.stats.value')}</Text>
                  </View>
                  <View style={s.heroIcon}>
                    <Ionicons name="leaf" size={28} color="#fff" />
                  </View>
                </View>

                <View style={s.heroRow}>
                  <HeroPill icon="cube" value={formatNumber(stats.totalKg)} label={t('listings.stats.totalKg')} />
                  <HeroPill icon="checkmark-done" value={formatNumber(stats.totalSold)} label={t('listings.stats.sold')} />
                  <HeroPill icon="time" value={String(stats.activeLots)} label={t('listings.tab.active')} />
                </View>
              </View>
            </View>

            {/* Search */}
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={16} color={C.textSoft} />
              <TextInput
                style={s.searchInput}
                placeholder={t('listings.search')}
                placeholderTextColor={C.textSoft}
                value={search}
                onChangeText={setSearch}
                textAlign={locale === 'ar' ? 'right' : 'left'}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={C.textSoft} />
                </Pressable>
              ) : null}
            </View>

            {/* Tabs */}
            <View style={s.tabsWrap}>
              <FlatList
                data={TABS}
                horizontal
                keyExtractor={(it) => it.key}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
                renderItem={({ item: it }) => {
                  const active = it.key === tab;
                  return (
                    <Pressable
                      onPress={() => setTab(it.key)}
                      style={[s.tab, active && s.tabActive]}
                    >
                      <Ionicons
                        name={it.icon}
                        size={13}
                        color={active ? '#fff' : C.textMute}
                      />
                      <Text style={[s.tabLabel, active && s.tabLabelActive]}>{it.label}</Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />
          ) : (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="leaf-outline" size={48} color={C.brand} />
              </View>
              <Text style={s.emptyTitle}>{t('listings.empty.title')}</Text>
              <Text style={s.emptySub}>{t('listings.empty.sub')}</Text>
              <Pressable style={s.emptyCTA}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.emptyCTAText}>{t('listings.empty.cta')}</Text>
              </Pressable>
            </View>
          )
        }
      />

      {/* Floating Action Button */}
      {items.length > 0 && (
        <Pressable style={s.fab}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

// ── Hero pill — small stat in the green hero card ────────────────────────────
function HeroPill({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <View style={s.heroPill}>
      <View style={s.heroPillIcon}>
        <Ionicons name={icon} size={14} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.heroPillValue} numberOfLines={1}>{value}</Text>
        <Text style={s.heroPillLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

// ── Lot card — main listing tile ────────────────────────────────────────────
function LotCard({ lot, t, locale }: { lot: any; t: (k: any) => string; locale: string }) {
  const name = lot.product?.nameAr ?? lot.product?.name ?? 'منتج';
  const catName = lot.product?.category?.nameAr;
  const price = Number(lot.pricePerKg ?? lot.askingPricePerKg ?? 0);
  const total = Number(lot.qtyTotal ?? lot.quantityKg ?? 0);
  const avail = Number(lot.qtyAvailable ?? lot.remainingKg ?? 0);
  const sold = Math.max(total - avail, 0);
  const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
  const img = productImage(name, catName);

  // Stock state for the badge
  let stockBadge: { bg: string; text: string; label: string; icon: any } | null = null;
  if (avail === 0) {
    stockBadge = { bg: C.redSoft, text: C.red, label: t('listings.card.outStock'), icon: 'close-circle' };
  } else if (pct < 25) {
    stockBadge = { bg: C.amberSoft, text: C.amber, label: t('listings.card.lowStock'), icon: 'warning' };
  } else {
    stockBadge = { bg: C.brandSoft, text: C.brand, label: t('listings.card.available'), icon: 'checkmark-circle' };
  }

  return (
    <Pressable style={s.card}>
      {/* Image + name + actions */}
      <View style={s.cardTop}>
        {img ? (
          <Image source={{ uri: img }} style={s.thumb} />
        ) : (
          <View style={[s.thumb, s.thumbFallback]}>
            <Ionicons name="leaf" size={28} color={C.brand} />
          </View>
        )}
        <View style={s.cardContent}>
          <Text style={s.productName} numberOfLines={1}>{name}</Text>
          {catName && <Text style={s.category} numberOfLines={1}>{catName}</Text>}
          <View style={s.priceRow}>
            <Text style={s.price}>{price.toFixed(2)}</Text>
            <Text style={s.priceUnit}>{locale === 'ar' ? 'ر.س / كجم' : 'SAR/kg'}</Text>
          </View>
        </View>
        {/* Quick action — share/edit (compact) */}
        <Pressable style={s.kebab} hitSlop={6}>
          <Ionicons name="ellipsis-vertical" size={18} color={C.textSoft} />
        </Pressable>
      </View>

      {/* Stock progress + badge */}
      <View style={s.stockSection}>
        <View style={s.stockTopRow}>
          <View style={[s.stockBadge, { backgroundColor: stockBadge.bg }]}>
            <Ionicons name={stockBadge.icon} size={11} color={stockBadge.text} />
            <Text style={[s.stockBadgeText, { color: stockBadge.text }]}>{stockBadge.label}</Text>
          </View>
          <Text style={s.stockPct}>{pct}%</Text>
        </View>
        <View style={s.progressBar}>
          <View
            style={[
              s.progressFill,
              { width: `${pct}%`, backgroundColor: pct < 25 ? C.amber : C.brand },
            ]}
          />
        </View>
        <View style={s.stockMeta}>
          <Text style={s.stockMetaText}>
            <Text style={{ fontWeight: '900', color: pct < 25 ? C.amber : C.brand }}>
              {avail}
            </Text>
            {' '}
            <Text style={{ color: C.textMute }}>
              {t('listings.card.of')} {total} {locale === 'ar' ? 'كجم' : 'kg'}
            </Text>
          </Text>
          {sold > 0 && (
            <Text style={s.stockSold}>
              <Ionicons name="trending-up" size={10} color={C.brand} /> {sold} {t('listings.card.sold')}
            </Text>
          )}
        </View>
      </View>

      {/* Lot id — tiny footnote */}
      {lot.lotNumber && (
        <Text style={s.lotNum}>{t('listings.card.lot')} {lot.lotNumber}</Text>
      )}
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Hero stats card
  heroWrap: { paddingHorizontal: 16, marginTop: 4 },
  hero: {
    backgroundColor: C.brandDark,
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  blob1: { width: 130, height: 130, top: -40, left: -30 },
  blob2: { width: 90, height: 90, bottom: -20, right: -10 },

  heroTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroLabel: { color: '#a7f3d0', fontSize: 12, fontWeight: '700', textAlign: 'right' },
  heroValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 2, textAlign: 'right' },
  heroSub: { color: '#86efac', fontSize: 11, marginTop: 2, textAlign: 'right' },
  heroIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  heroRow: { flexDirection: 'row-reverse', gap: 8 },
  heroPill: {
    flex: 1,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 8,
  },
  heroPillIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroPillValue: { color: '#fff', fontSize: 12, fontWeight: '900', textAlign: 'right' },
  heroPillLabel: { color: '#a7f3d0', fontSize: 9, fontWeight: '700', textAlign: 'right' },

  // Search
  searchWrap: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16, marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 14, height: 44, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },

  // Tabs
  tabsWrap: { marginTop: 12, marginBottom: 6 },
  tab: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  tabActive: { backgroundColor: C.brand, borderColor: C.brand },
  tabLabel: { fontSize: 12, fontWeight: '700', color: C.textMute },
  tabLabelActive: { color: '#fff', fontWeight: '900' },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row-reverse', gap: 12 },
  thumb: {
    width: 76, height: 76, borderRadius: 12,
    backgroundColor: C.brandSoft,
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, justifyContent: 'center', gap: 2 },
  productName: { fontSize: 15, fontWeight: '900', color: C.text, textAlign: 'right' },
  category: { fontSize: 11, color: C.textSoft, textAlign: 'right' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4, marginTop: 4 },
  price: { fontSize: 18, fontWeight: '900', color: C.brand },
  priceUnit: { fontSize: 11, color: C.textMute, fontWeight: '700' },
  kebab: { padding: 4 },

  // Stock section
  stockSection: { marginTop: 12, gap: 6 },
  stockTopRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  stockBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  stockBadgeText: { fontSize: 10, fontWeight: '800' },
  stockPct: { fontSize: 12, fontWeight: '900', color: C.text },
  progressBar: {
    height: 6, borderRadius: 6, backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 6 },
  stockMeta: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 2,
  },
  stockMetaText: { fontSize: 12 },
  stockSold: { fontSize: 11, color: C.brand, fontWeight: '700' },

  // Lot footnote
  lotNum: {
    fontSize: 9,
    color: '#d1d5db',
    textAlign: 'right',
    marginTop: 8,
    letterSpacing: 0.3,
  },

  // Empty state
  empty: { padding: 32, alignItems: 'center', gap: 12, marginTop: 20 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: C.text },
  emptySub: { fontSize: 13, color: C.textMute, textAlign: 'center', maxWidth: 250 },
  emptyCTA: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: C.brand,
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyCTAText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20, left: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.brand,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
});
