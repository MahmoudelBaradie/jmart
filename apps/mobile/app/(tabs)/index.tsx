import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ordersApi, financialApi, listingsApi, bannersApi, buyerApi } from '@/lib/api';
import { formatCurrency, statusLabel, STATUS_COLORS } from '@/lib/utils';
import { productImage } from '@/lib/product-images';
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
  border: '#e5e7eb',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  purple: '#7c3aed',
  purpleSoft: '#ede9fe',
  blue: '#0ea5e9',
  blueSoft: '#e0f2fe',
};

function sanitize(s?: string | null) {
  if (!s) return '';
  if (/^\?{2,}/.test(s) || /[�]/.test(s)) return '';
  return s;
}

export default function HomeScreen() {
  const { user, isFarmer, isBuyer } = useAuth();
  const rawName =
    (user as any)?.farmer?.businessName ||
    (user as any)?.buyer?.businessName ||
    (user as any)?.farmer?.contactPersonName ||
    (user as any)?.buyer?.contactPersonName ||
    (user as any)?.email || '';
  const name = sanitize(rawName) || 'مرحباً بك';
  const initial = name[0] ?? '👋';
  const roleLabel = isFarmer ? '🌾 مزرعة' : isBuyer ? '🛒 مشتري' : '';
  const kyc = (user as any)?.farmer?.kycStatus ?? (user as any)?.buyer?.kycStatus;

  const { data: ordersData, isLoading: ordersLoading, refetch, isFetching } = useQuery({
    queryKey: ['home-orders'],
    queryFn: () => ordersApi.list({ limit: 4, page: 1 }).then((r) => r.data),
  });

  const { data: financialData } = useQuery({
    queryKey: ['home-financial'],
    queryFn: () => financialApi.summary().then((r) => r.data),
    enabled: !!user,
    retry: false,
  });

  const { data: trendingData } = useQuery({
    queryKey: ['home-trending'],
    queryFn: () => listingsApi.list({ limit: 8, status: 'AVAILABLE' }).then((r) => r.data),
  });

  const { data: bannersRes } = useQuery({
    queryKey: ['home-banners'],
    queryFn: () => bannersApi.marketplace().then((r) => r.data),
    staleTime: 60_000,
  });

  const orders = ordersData?.data ?? ordersData?.items ?? [];
  const financial = financialData?.data ?? financialData ?? {};
  const trending = trendingData?.data ?? trendingData?.items ?? [];
  const banner = (bannersRes?.data ?? bannersRes ?? [])[0];

  // Stats — universal, with sensible 0-defaults if missing
  const totalOrders = ordersData?.meta?.total ?? orders.length ?? 0;
  const pendingAmount = Number(financial?.pendingAmount ?? 0);
  const totalRevenue  = Number(financial?.totalRevenue ?? financial?.totalSales ?? 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !ordersLoading} onRefresh={refetch} tintColor={C.brand} />}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* ══════════ HERO CARD — gradient with greeting + avatar ══════════ */}
        <View style={s.heroWrap}>
          <View style={s.hero}>
            {/* Decorative blobs */}
            <View style={[s.blob, s.blob1]} />
            <View style={[s.blob, s.blob2]} />

            <View style={s.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.heroGreeting}>مساء الخير،</Text>
                <Text style={s.heroName} numberOfLines={1}>{name} 👋</Text>
                {roleLabel ? (
                  <View style={s.heroRolePill}>
                    <Text style={s.heroRoleText}>{roleLabel}</Text>
                    {kyc === 'APPROVED' && (
                      <>
                        <View style={s.heroRoleDot} />
                        <Ionicons name="checkmark-circle" size={12} color="#fff" />
                        <Text style={s.heroRoleText}>موثّق</Text>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
              <View style={s.heroAvatar}>
                <Text style={s.heroAvatarText}>{initial}</Text>
              </View>
            </View>

            {/* KYC alert if pending */}
            {kyc === 'PENDING' && (
              <View style={s.kycAlert}>
                <Ionicons name="time-outline" size={14} color="#fff" />
                <Text style={s.kycAlertText}>حسابك قيد المراجعة — ستتمكن من النشر بعد الموافقة</Text>
              </View>
            )}
          </View>
        </View>

        {/* ══════════ STAT CARDS — colored icon circles ══════════ */}
        <View style={s.statsRow}>
          <StatBox
            icon="receipt"
            iconBg={C.brandSoft}
            iconColor={C.brand}
            value={String(totalOrders)}
            label={isFarmer ? 'الطلبات الواردة' : 'طلباتي'}
            onPress={() => router.push('/(tabs)/orders')}
          />
          <StatBox
            icon="trending-up"
            iconBg={C.amberSoft}
            iconColor={C.amber}
            value={formatCurrency(isFarmer ? totalRevenue : pendingAmount)}
            label={isFarmer ? 'الإيرادات' : 'مستحقات'}
          />
          <StatBox
            icon="notifications"
            iconBg={C.purpleSoft}
            iconColor={C.purple}
            value="—"
            label="إشعارات"
            onPress={() => router.push('/notifications')}
          />
        </View>

        {/* ══════════ PROMO BANNER — pulled from /banners/marketplace ══════════ */}
        {banner && (
          <Pressable
            style={s.promoCard}
            onPress={() => isBuyer && router.push('/(tabs)/marketplace')}
          >
            <Image
              source={{ uri: banner.imageUrl || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&q=80&auto=format&fit=crop' }}
              style={s.promoBg}
            />
            <View style={s.promoOverlay}>
              <View style={{ flex: 1 }}>
                <Text style={s.promoTitle} numberOfLines={2}>{banner.titleAr}</Text>
                {banner.subtitleAr ? (
                  <Text style={s.promoSub} numberOfLines={2}>{banner.subtitleAr}</Text>
                ) : null}
                <View style={s.promoCTA}>
                  <Text style={s.promoCTAText}>تسوّق الآن</Text>
                  <Ionicons name="arrow-back" size={14} color="#fff" />
                </View>
              </View>
              {banner.emoji ? <Text style={s.promoEmoji}>{banner.emoji}</Text> : null}
            </View>
          </Pressable>
        )}

        {/* ══════════ QUICK ACTIONS — 2x2 vibrant grid ══════════ */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>إجراءات سريعة</Text>
          <View style={s.quickGrid}>
            {isBuyer && (
              <QuickCard
                icon="storefront"
                label="تصفّح السوق"
                sub="منتجات طازجة"
                bg="#dcfce7"
                tint={C.brand}
                onPress={() => router.push('/(tabs)/marketplace')}
              />
            )}
            {isFarmer && (
              <QuickCard
                icon="leaf"
                label="عروضي"
                sub="إدارة المنتجات"
                bg="#dcfce7"
                tint={C.brand}
                onPress={() => router.push('/(tabs)/listings')}
              />
            )}
            <QuickCard
              icon="receipt"
              label="الطلبات"
              sub={`${totalOrders} طلب`}
              bg="#fef3c7"
              tint={C.amber}
              onPress={() => router.push('/(tabs)/orders')}
            />
            <QuickCard
              icon="document-text"
              label="العقود"
              sub="عقودي النشطة"
              bg="#ede9fe"
              tint={C.purple}
              onPress={() => router.push('/contracts')}
            />
            <QuickCard
              icon="people"
              label="المجتمع"
              sub="منشورات وأخبار"
              bg="#e0f2fe"
              tint={C.blue}
              onPress={() => router.push('/more')}
            />
          </View>
        </View>

        {/* ══════════ TRENDING PRODUCTS — horizontal scroll with real images ══════════ */}
        {trending.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>الأكثر طلباً 🔥</Text>
              {isBuyer && (
                <Pressable onPress={() => router.push('/(tabs)/marketplace')}>
                  <Text style={s.seeAll}>عرض الكل</Text>
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {trending.slice(0, 8).map((lot: any) => (
                <TrendingCard key={lot.id} lot={lot} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ══════════ LATEST ORDERS — clean list ══════════ */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>آخر الطلبات</Text>
            <Pressable onPress={() => router.push('/(tabs)/orders')}>
              <Text style={s.seeAll}>عرض الكل</Text>
            </Pressable>
          </View>

          {ordersLoading ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>جارٍ التحميل…</Text>
            </View>
          ) : orders.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={36} color={C.textSoft} />
              <Text style={s.emptyText}>لا توجد طلبات بعد</Text>
            </View>
          ) : (
            <View style={s.ordersWrap}>
              {orders.slice(0, 4).map((order: any) => {
                const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING ?? { bg: C.border, text: C.textMute };
                return (
                  <Pressable
                    key={order.id}
                    style={s.orderRow}
                    onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
                  >
                    <View style={s.orderIcon}>
                      <Ionicons name="cube-outline" size={18} color={C.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.orderId}>#{order.orderNumber ?? order.id.slice(0, 8)}</Text>
                      <View style={[s.orderStatus, { backgroundColor: sc.bg }]}>
                        <Text style={[s.orderStatusText, { color: sc.text }]}>{statusLabel(order.status)}</Text>
                      </View>
                    </View>
                    <Text style={s.orderAmount}>{formatCurrency(order.totalAmount)}</Text>
                    <Ionicons name="chevron-back" size={16} color={C.textSoft} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function StatBox({
  icon, iconBg, iconColor, value, label, onPress,
}: {
  icon: any; iconBg: string; iconColor: string; value: string; label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={s.statBox} onPress={onPress}>
      <View style={[s.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function QuickCard({
  icon, label, sub, bg, tint, onPress,
}: {
  icon: any; label: string; sub?: string; bg: string; tint: string; onPress: () => void;
}) {
  return (
    <Pressable style={[s.quickCard, { backgroundColor: bg }]} onPress={onPress}>
      <View style={[s.quickIcon, { backgroundColor: '#fff' }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={[s.quickLabel, { color: tint }]} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={s.quickSub} numberOfLines={1}>{sub}</Text> : null}
    </Pressable>
  );
}

function TrendingCard({ lot }: { lot: any }) {
  const name = lot.product?.nameAr ?? lot.product?.name ?? 'منتج';
  const cat  = lot.product?.category?.nameAr;
  const price = Number(lot.pricePerKg ?? lot.askingPricePerKg ?? 0);
  const img = productImage(name, cat, 280);
  return (
    <Pressable
      style={s.trendCard}
      onPress={() => router.push({ pathname: '/marketplace/[id]', params: { id: lot.id } })}
    >
      <View style={s.trendImgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={s.trendImg} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 48 }}>🥬</Text>
        )}
      </View>
      <Text style={s.trendName} numberOfLines={1}>{name}</Text>
      <Text style={s.trendPrice}>
        {price.toFixed(2)} <Text style={s.trendPriceUnit}>ر.س/كجم</Text>
      </Text>
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Hero
  heroWrap: { paddingHorizontal: 16, marginTop: 4 },
  hero: {
    backgroundColor: C.brandDark,
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  blob1: { width: 160, height: 160, top: -60, left: -40 },
  blob2: { width: 100, height: 100, bottom: -30, right: -20 },
  heroRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  heroGreeting: { color: '#a7f3d0', fontSize: 13, textAlign: 'right' },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 2, textAlign: 'right' },
  heroRolePill: {
    alignSelf: 'flex-end', marginTop: 8,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
  },
  heroRoleText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  heroRoleDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  heroAvatar: {
    width: 54, height: 54, borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { color: C.brandDark, fontSize: 24, fontWeight: '900' },
  kycAlert: {
    marginTop: 14, padding: 10, borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)',
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
  },
  kycAlertText: { color: '#fef3c7', fontSize: 11, fontWeight: '700', flex: 1, textAlign: 'right' },

  // Stats
  statsRow: { flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 16, marginTop: 14 },
  statBox: {
    flex: 1, backgroundColor: C.card, borderRadius: 16,
    padding: 12, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 15, fontWeight: '900', color: C.text },
  statLabel: { fontSize: 10, color: C.textMute, fontWeight: '700' },

  // Promo banner
  promoCard: {
    marginHorizontal: 16, marginTop: 14,
    height: 130, borderRadius: 18, overflow: 'hidden',
    backgroundColor: C.brandDark,
  },
  promoBg: { position: 'absolute', inset: 0 as any, width: '100%', height: '100%', opacity: 0.65 },
  promoOverlay: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(20, 83, 45, 0.5)',
  },
  promoTitle: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'right', lineHeight: 22 },
  promoSub:   { color: '#dcfce7', fontSize: 11, marginTop: 2, textAlign: 'right' },
  promoCTA: {
    alignSelf: 'flex-end', marginTop: 10,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.brand,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
  },
  promoCTAText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  promoEmoji: { fontSize: 42, marginRight: 10 },

  // Sections
  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionHead: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.text, textAlign: 'right' },
  seeAll: { fontSize: 12, fontWeight: '800', color: C.brand },

  // Quick grid
  quickGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: (SW - 32 - 10) / 2,
    borderRadius: 16, padding: 14,
    gap: 8,
  },
  quickIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontSize: 14, fontWeight: '900', textAlign: 'right' },
  quickSub: { fontSize: 11, color: 'rgba(0,0,0,0.55)', fontWeight: '600', textAlign: 'right' },

  // Trending card (horizontal scroll)
  trendCard: { width: 130, gap: 6 },
  trendImgWrap: {
    width: 130, height: 110, borderRadius: 14,
    backgroundColor: C.card, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  trendImg: { width: '100%', height: '100%' },
  trendName: { fontSize: 13, fontWeight: '800', color: C.text, textAlign: 'right' },
  trendPrice: { fontSize: 14, fontWeight: '900', color: C.brand, textAlign: 'right' },
  trendPriceUnit: { fontSize: 10, color: C.textMute, fontWeight: '600' },

  // Orders
  empty: { padding: 30, alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 16 },
  emptyText: { color: C.textMute, fontSize: 13 },
  ordersWrap: {
    backgroundColor: C.card, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  orderRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  orderIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  orderId: { fontSize: 13, fontWeight: '900', color: C.text, textAlign: 'right' },
  orderStatus: {
    alignSelf: 'flex-end', marginTop: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  orderStatusText: { fontSize: 10, fontWeight: '800' },
  orderAmount: { fontSize: 13, fontWeight: '900', color: C.brand },
});
