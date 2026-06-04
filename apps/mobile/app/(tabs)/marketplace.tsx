import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  TextInput, RefreshControl, ScrollView, Pressable,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { listingsApi, categoriesApi, bannersApi, buyerApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { productImage } from '@/lib/product-images';
import AppHeader from '@/components/shared/AppHeader';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 36) / 2; // 2-col grid with 12px gutters
const BANNER_W = SW - 24;
const BANNER_H = 170;

// ── Brand palette (matches mockup) ────────────────────────────────────────────
const COLORS = {
  bg:        '#fdfaf3',  // warm cream
  card:      '#ffffff',
  text:      '#1f2937',
  textMute:  '#6b7280',
  textSoft:  '#9ca3af',
  brand:     '#16a34a',
  brandDark: '#15803d',
  brandTint: '#dcfce7',
  brandSoft: '#f0fdf4',
  border:    '#e5e7eb',
  borderSoft: '#f3f4f6',
};

// ── Cart store — lightweight per-screen state (lift to context later) ────────
type Cart = Record<string, { qty: number; price: number }>;

// ── Trust badges (matches mockup row) ────────────────────────────────────────
const TRUST = [
  { icon: 'shield-checkmark-outline', label: 'جودة مضمونة' },
  { icon: 'pricetag-outline',         label: 'أسعار الجملة' },
  { icon: 'rocket-outline',           label: 'توصيل سريع' },
  { icon: 'headset-outline',          label: 'دعم دائم' },
];

function TrustBadges() {
  return (
    <View style={s.trustRow}>
      {TRUST.map((t) => (
        <View key={t.label} style={s.trustCard}>
          <View style={s.trustIcon}>
            <Ionicons name={t.icon as any} size={18} color={COLORS.brand} />
          </View>
          <Text style={s.trustLabel} numberOfLines={1}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Round category circle (mockup style) ─────────────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  default:   '🌿',
  خضروات:    '🥬',
  فواكه:     '🍊',
  حبوب:      '🌾',
  تمور:      '🌴',
  بقوليات:   '🫘',
  أعشاب:     '🌱',
  مكسرات:    '🥜',
  عسل:       '🍯',
  ألبان:     '🥛',
  ورقيات:    '🥬',
  جذرية:     '🥔',
};
function catEmoji(nameAr?: string) {
  if (!nameAr) return CAT_EMOJI.default;
  for (const k of Object.keys(CAT_EMOJI)) {
    if (nameAr.includes(k)) return CAT_EMOJI[k];
  }
  return CAT_EMOJI.default;
}

function CategoryCircle({ cat, active, onPress }: { cat: any; active: boolean; onPress: () => void }) {
  const img = productImage(cat?.nameAr, cat?.nameAr, 200);
  return (
    <Pressable onPress={onPress} style={s.catItem}>
      <View style={[s.catCircle, active && s.catCircleActive]}>
        {img ? (
          <Image source={{ uri: img }} style={s.catImage} />
        ) : (
          <Text style={s.catEmoji}>{catEmoji(cat?.nameAr)}</Text>
        )}
      </View>
      <Text style={[s.catLabel, active && s.catLabelActive]} numberOfLines={1}>
        {cat?.nameAr ?? 'الكل'}
      </Text>
    </Pressable>
  );
}

// ── Banner shape ────────────────────────────────────────────────────────────
interface MarketBanner {
  id: string;
  titleAr: string;
  subtitleAr?: string | null;
  imageUrl?: string | null;
  emoji?: string | null;
  linkUrl?: string | null;
  backgroundColor?: string | null;
  geoZoneId?: string | null;
}

function BannerCarousel() {
  const { data: branchesRes } = useQuery({
    queryKey: ['mobile-buyer-branches'],
    queryFn: () => buyerApi.myBranches().then((r) => r.data),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const branches: any[] = branchesRes?.data ?? branchesRes ?? [];
  const zoneId: string | undefined =
    branches.find((b: any) => b.isPrimary)?.geoZoneId ?? branches[0]?.geoZoneId;

  const { data: bannersRes } = useQuery({
    queryKey: ['mobile-banners', zoneId],
    queryFn: () => bannersApi.marketplace(zoneId).then((r) => r.data),
    staleTime: 60_000,
  });
  const banners: MarketBanner[] = bannersRes?.data ?? bannersRes ?? [];

  const [idx, setIdx] = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % banners.length;
        // Use scrollToOffset to avoid the getItemLayout requirement.
        listRef.current?.scrollToOffset({
          offset: next * (BANNER_W + 12),
          animated: true,
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <View style={s.carouselWrap}>
      <FlatList
        ref={listRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(b) => b.id}
        snapToInterval={BANNER_W + 12}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / (BANNER_W + 12));
          setIdx(i);
        }}
        contentContainerStyle={{ paddingHorizontal: 6 }}
        renderItem={({ item }) => <BannerSlide banner={item} />}
      />
      {banners.length > 1 && (
        <View style={s.dots}>
          {banners.map((_, i) => (
            <View key={i} style={[s.dot, i === idx && s.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function BannerSlide({ banner }: { banner: MarketBanner }) {
  const bg = banner.backgroundColor || '#15803d';
  const isGradient = bg.startsWith('linear-gradient');
  const solidBg = isGradient ? (bg.match(/#[0-9a-fA-F]{3,6}/)?.[0] ?? '#15803d') : bg;

  return (
    <Pressable style={[s.bannerSlide, { backgroundColor: solidBg }]}>
      {banner.imageUrl ? (
        <Image source={{ uri: banner.imageUrl }} style={s.bannerImg} resizeMode="cover" />
      ) : (
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&q=80&auto=format&fit=crop' }}
          style={s.bannerImg} resizeMode="cover"
        />
      )}
      <View style={s.bannerOverlay}>
        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitle} numberOfLines={2}>{banner.titleAr}</Text>
          {banner.subtitleAr ? (
            <Text style={s.bannerSub} numberOfLines={2}>{banner.subtitleAr}</Text>
          ) : null}
          <View style={s.bannerCTA}>
            <Text style={s.bannerCTAText}>تسوّق الآن</Text>
          </View>
        </View>
        {banner.emoji ? <Text style={s.bannerEmoji}>{banner.emoji}</Text> : null}
      </View>
    </Pressable>
  );
}

// ── Product card — mockup style with quantity stepper ───────────────────────
function ProductCard({
  item, cartQty, onAdd, onInc, onDec,
}: {
  item: any;
  cartQty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  const catAr   = item.product?.category?.nameAr;
  const name    = item.product?.nameAr ?? item.product?.name ?? 'منتج';
  const price   = Number(item.pricePerKg ?? item.askingPricePerKg ?? 0);
  const avail   = Number(item.qtyAvailable ?? item.remainingKg ?? 0);
  const pkg     = item.packagingType === 'BULK' ? 'سائب' : item.packagingType || `كرتون ${Math.round(avail/30) || 5} كجم`;
  const img     = productImage(name, catAr);

  return (
    <View style={s.card}>
      <Pressable
        onPress={() => router.push({ pathname: '/marketplace/[id]', params: { id: item.id } })}
        style={s.cardImgWrap}
      >
        {img ? (
          <Image source={{ uri: img }} style={s.cardImg} resizeMode="contain" />
        ) : (
          <Text style={s.cardEmoji}>{catEmoji(catAr)}</Text>
        )}
      </Pressable>

      <Text style={s.cardName} numberOfLines={1}>{name}</Text>
      <Text style={s.cardPkg} numberOfLines={1}>{pkg}</Text>
      <Text style={s.cardPrice}>{price.toFixed(2)} <Text style={s.cardPriceUnit}>ر.س</Text></Text>

      {/* Stepper / Add */}
      {cartQty > 0 ? (
        <View style={s.stepper}>
          <Pressable onPress={onDec} style={s.stepBtn}>
            <Ionicons name="remove" size={16} color={COLORS.brand} />
          </Pressable>
          <Text style={s.stepCount}>{cartQty}</Text>
          <Pressable onPress={onInc} style={[s.stepBtn, s.stepBtnPlus]}>
            <Ionicons name="add" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onAdd} style={s.addBtnRow}>
          <Pressable onPress={onAdd} style={s.stepBtn}>
            <Ionicons name="remove" size={16} color={COLORS.textSoft} />
          </Pressable>
          <Text style={s.stepCountZero}>0</Text>
          <Pressable onPress={onAdd} style={[s.stepBtn, s.stepBtnPlus]}>
            <Ionicons name="add" size={16} color="#fff" />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

// ── Floating cart bar (mockup style) ────────────────────────────────────────
function CartBar({ count, total }: { count: number; total: number }) {
  if (count === 0) return null;
  return (
    <View style={s.cartBar}>
      <Pressable style={s.cartBarBtn} onPress={() => { /* TODO: open cart screen */ }}>
        <Text style={s.cartBarBtnText}>عرض السلة</Text>
      </Pressable>
      <View style={s.cartBarInfo}>
        <Text style={s.cartBarCount}>{count} منتجات</Text>
        <Text style={s.cartBarTotal}>{total.toFixed(2)} ر.س</Text>
      </View>
      <View style={s.cartBarIcon}>
        <Ionicons name="cart" size={20} color="#fff" />
        <View style={s.cartBarBadge}>
          <Text style={s.cartBarBadgeText}>{count}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function MarketplaceScreen() {
  const [search, setSearch]   = useState('');
  const [debSearch, setDebSearch] = useState('');
  const [catId, setCatId]     = useState<string | null>(null);
  const [cart, setCart]       = useState<Cart>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: catData } = useQuery({
    queryKey: ['m-cats'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
    staleTime: 120_000,
  });
  // Filter out categories with corrupted Arabic names (legacy seed issue).
  const cats: any[] = (catData?.data ?? catData ?? []).filter((c: any) => {
    const n = c?.nameAr ?? '';
    return !/^[?'"\s]+$/.test(n) && !/^\?{2,}/.test(n) && !/^['"]/.test(n);
  });

  const { data: branchesRes } = useQuery({
    queryKey: ['mobile-buyer-branches'],
    queryFn: () => buyerApi.myBranches().then((r) => r.data),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const branches: any[] = branchesRes?.data ?? branchesRes ?? [];
  const primaryBranch = branches.find((b: any) => b.isPrimary) ?? branches[0];
  // Guard against corrupted Arabic in branch records — if the string contains
  // replacement chars or '???', fall back to the zone name or a default.
  const sanitize = (txt?: string | null) => {
    if (!txt) return '';
    if (/^\?{3,}/.test(txt) || /[�]/.test(txt)) return '';
    return txt;
  };
  const locationLabel =
    sanitize(primaryBranch?.geoZone?.zoneNameAr) ||
    sanitize(primaryBranch?.branchName) ||
    sanitize(primaryBranch?.address) ||
    'المملكة العربية السعودية';

  const { data, isLoading, isFetching, refetch, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['m-lots-v4', debSearch, catId],
      queryFn: ({ pageParam = 1 }) =>
        listingsApi.list({
          search: debSearch || undefined,
          categoryId: catId ?? undefined,
          page: pageParam,
          limit: 20,
          status: 'AVAILABLE',
        }).then((r) => r.data),
      getNextPageParam: (last: any) => {
        const m = last?.meta;
        return m && m.page < m.totalPages ? m.page + 1 : undefined;
      },
      initialPageParam: 1,
    });

  const items = data?.pages.flatMap((p: any) => p?.data ?? p?.items ?? []) ?? [];

  const onSearch = useCallback((t: string) => {
    setSearch(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebSearch(t), 380);
  }, []);

  const cartCount = useMemo(() => Object.values(cart).reduce((s, v) => s + v.qty, 0), [cart]);
  const cartTotal = useMemo(() => Object.values(cart).reduce((s, v) => s + v.qty * v.price, 0), [cart]);

  const addToCart = (lot: any) => {
    const price = Number(lot.pricePerKg ?? lot.askingPricePerKg ?? 0);
    setCart((c) => ({ ...c, [lot.id]: { qty: (c[lot.id]?.qty ?? 0) + 1, price } }));
  };
  const incCart = (lot: any) => addToCart(lot);
  const decCart = (lot: any) => {
    setCart((c) => {
      const cur = c[lot.id]?.qty ?? 0;
      if (cur <= 1) { const n = { ...c }; delete n[lot.id]; return n; }
      return { ...c, [lot.id]: { ...c[lot.id], qty: cur - 1 } };
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ══ HEADER — brand on right, bell on left, delivery location below ══ */}
      <AppHeader
        rightSlot={
          <View style={s.locInline}>
            <Ionicons name="location" size={13} color={COLORS.brand} />
            <Text style={s.locInlineText} numberOfLines={1}>{locationLabel}</Text>
          </View>
        }
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            cartQty={cart[item.id]?.qty ?? 0}
            onAdd={() => addToCart(item)}
            onInc={() => incCart(item)}
            onDec={() => decCart(item)}
          />
        )}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 12, gap: 12, marginBottom: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={COLORS.brand} />
        }
        contentContainerStyle={{ paddingBottom: cartCount > 0 ? 100 : 16 }}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={
          <View>
            {/* Hero banner carousel */}
            <BannerCarousel />

            {/* Trust badges */}
            <TrustBadges />

            {/* Search bar */}
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={16} color={COLORS.textSoft} />
              <TextInput
                style={s.searchInput}
                placeholder="ابحث عن منتج..."
                placeholderTextColor={COLORS.textSoft}
                value={search}
                onChangeText={onSearch}
                textAlign="right"
                returnKeyType="search"
              />
              {search ? (
                <TouchableOpacity onPress={() => { setSearch(''); setDebSearch(''); }}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textSoft} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Categories section header */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>الأقسام الرئيسية</Text>
              <Text style={s.sectionLink}>عرض الكل</Text>
            </View>

            {/* Categories — round circles */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.catRow}
            >
              <CategoryCircle cat={{ nameAr: 'الكل' }} active={catId === null} onPress={() => setCatId(null)} />
              {cats.map((c: any) => (
                <CategoryCircle
                  key={c.id}
                  cat={c}
                  active={catId === c.id}
                  onPress={() => setCatId(c.id === catId ? null : c.id)}
                />
              ))}
            </ScrollView>

            {/* Products section header */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>المنتجات</Text>
              <Text style={s.sectionMeta}>{items.length} منتج</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.brand} size="large" style={{ marginTop: 40 }} />
          ) : (
            <View style={s.empty}>
              <Ionicons name="leaf-outline" size={40} color={COLORS.textSoft} />
              <Text style={s.emptyText}>لا توجد منتجات</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasNextPage ? (
            <View style={{ padding: 16 }}>
              <ActivityIndicator color={COLORS.brand} />
            </View>
          ) : null
        }
      />

      <CartBar count={cartCount} total={cartTotal} />
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  // Inline location chip next to brand
  locInline: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 3,
    maxWidth: 130,
  },
  locInlineText: { fontSize: 11, color: COLORS.textMute, fontWeight: '700' },

  // Banner carousel
  carouselWrap: { marginTop: 4, marginBottom: 14 },
  bannerSlide: {
    width: BANNER_W,
    height: BANNER_H,
    marginHorizontal: 6,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  bannerImg: { position: 'absolute', inset: 0 as any, width: '100%', height: '100%', opacity: 0.7 },
  bannerOverlay: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 18,
    backgroundColor: 'rgba(20, 83, 45, 0.55)',
  },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'right', lineHeight: 26 },
  bannerSub:   { color: '#dcfce7', fontSize: 12, textAlign: 'right', marginTop: 4, lineHeight: 18 },
  bannerCTA: {
    alignSelf: 'flex-end',
    marginTop: 12,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 22, paddingVertical: 9,
    borderRadius: 10,
  },
  bannerCTAText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  bannerEmoji: { fontSize: 48, marginRight: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  dotActive: { width: 20, backgroundColor: COLORS.brand },

  // Trust badges
  trustRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 14,
  },
  trustCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  trustIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  trustLabel: { fontSize: 10.5, fontWeight: '800', color: COLORS.text },

  // Search
  searchWrap: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: COLORS.brandSoft,
    marginHorizontal: 12, marginBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 14, height: 46, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 0 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 10, marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  sectionLink:  { fontSize: 12, fontWeight: '700', color: COLORS.brand },
  sectionMeta:  { fontSize: 11, color: COLORS.textMute, fontWeight: '600' },

  // Categories
  catRow: { paddingHorizontal: 12, paddingBottom: 14, gap: 10 },
  catItem: { alignItems: 'center', width: 74 },
  catCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  catCircleActive: { borderColor: COLORS.brand },
  catImage: { width: '100%', height: '100%' },
  catEmoji: { fontSize: 30 },
  catLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.text,
    marginTop: 6, textAlign: 'center',
  },
  catLabelActive: { color: COLORS.brand },

  // Product card
  card: {
    flex: 1, maxWidth: CARD_W,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardImgWrap: {
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardImg: { width: '100%', height: '100%' },
  cardEmoji: { fontSize: 56 },
  cardName: { fontSize: 14, fontWeight: '900', color: COLORS.text, textAlign: 'right' },
  cardPkg:  { fontSize: 11, color: COLORS.textMute, textAlign: 'right', marginTop: 2 },
  cardPrice: {
    fontSize: 16, fontWeight: '900', color: COLORS.brand,
    textAlign: 'right', marginTop: 4,
  },
  cardPriceUnit: { fontSize: 10, color: COLORS.brand, fontWeight: '700' },

  // Stepper
  stepper: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  addBtnRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stepBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnPlus: { backgroundColor: COLORS.brand },
  stepCount: { fontSize: 14, fontWeight: '900', color: COLORS.text, minWidth: 28, textAlign: 'center' },
  stepCountZero: { fontSize: 14, fontWeight: '700', color: COLORS.textSoft, minWidth: 28, textAlign: 'center' },

  // Empty
  empty: { padding: 60, alignItems: 'center', gap: 10 },
  emptyText: { color: COLORS.textMute, fontSize: 13 },

  // Floating cart bar
  cartBar: {
    position: 'absolute',
    bottom: 12, left: 12, right: 12,
    backgroundColor: COLORS.brand,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  cartBarIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  cartBarBadge: {
    position: 'absolute', top: -4, left: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#fbbf24',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBarBadgeText: { color: '#111827', fontSize: 10, fontWeight: '900' },
  cartBarInfo: { flex: 1, alignItems: 'flex-end' },
  cartBarCount: { color: '#dcfce7', fontSize: 11, fontWeight: '700' },
  cartBarTotal: { color: '#fff', fontSize: 15, fontWeight: '900' },
  cartBarBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 10,
  },
  cartBarBtnText: { color: COLORS.brandDark, fontSize: 13, fontWeight: '900' },
});
