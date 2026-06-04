import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { listingsApi, ordersApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';

// Category → emoji
const CAT_EMOJI: Record<string, string> = {
  خضروات: '🥦', فواكه: '🍊', حبوب: '🌾', تمور: '🌴',
  بقوليات: '🫘', أعشاب: '🌱', مكسرات: '🥜',
};
function getEmoji(catAr?: string) {
  if (!catAr) return '🌿';
  for (const key of Object.keys(CAT_EMOJI)) {
    if (catAr.includes(key)) return CAT_EMOJI[key];
  }
  return '🌿';
}

export default function MarketplaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [showOrder, setShowOrder] = useState(false);

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot-detail', id],
    queryFn: () => listingsApi.get(id).then((r) => r.data?.data ?? r.data),
  });

  const createOrder = useMutation({
    mutationFn: (body: Record<string, unknown>) => ordersApi.create(body),
    onSuccess: () => {
      Alert.alert('تم الطلب ✅', 'تم إرسال طلبك بنجاح!', [
        { text: 'عرض الطلبات', onPress: () => router.replace('/(tabs)/orders') },
        { text: 'حسناً' },
      ]);
      setShowOrder(false);
      setQty('');
      qc.invalidateQueries({ queryKey: ['mobile-orders'] });
    },
    onError: (e: any) => {
      Alert.alert('خطأ', e?.response?.data?.message ?? 'فشل إرسال الطلب');
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (!lot) return null;

  const productName = lot.product?.nameAr ?? lot.product?.name ?? 'منتج زراعي';
  const categoryAr = lot.product?.category?.nameAr;
  const emoji = getEmoji(categoryAr);
  const farmer = lot.farmer?.businessName ?? lot.farmer?.contactPersonName ?? '';
  // API returns Decimal as string — cast before math/format
  const price = Number(lot.pricePerKg ?? lot.askingPricePerKg ?? lot.pricePerUnit ?? 0);
  const remaining = Number(lot.qtyAvailable ?? lot.remainingKg ?? lot.quantityKg ?? lot.availableQuantity ?? 0);
  const total = qty ? parseFloat(qty) * price : 0;

  const handleOrder = () => {
    const q = parseFloat(qty);
    if (!q || q <= 0) { Alert.alert('خطأ', 'أدخل كمية صحيحة'); return; }
    if (q > remaining) { Alert.alert('خطأ', `الكمية تتجاوز المتاح (${remaining} كجم)`); return; }
    createOrder.mutate({
      inventoryLotId: id,
      quantityKg: q,
      notes: notes || undefined,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>تفاصيل المنتج</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroEmoji}>
            <Text style={styles.emojiText}>{emoji}</Text>
          </View>
          {categoryAr && <Text style={styles.heroCategory}>{categoryAr}</Text>}
          <Text style={styles.heroTitle}>{productName}</Text>
          {farmer ? <Text style={styles.heroFarmer}>🌾 {farmer}</Text> : null}
          <View style={styles.heroPriceRow}>
            <Text style={styles.heroPriceValue}>{formatCurrency(price)}</Text>
            <Text style={styles.heroPriceLabel}> / كجم</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات العرض</Text>
          <InfoRow
            icon="cube-outline"
            label="الكمية المتاحة"
            value={`${remaining} كجم`}
            valueColor="#16a34a"
          />
          {lot.lotNumber && (
            <InfoRow icon="barcode-outline" label="رقم الدُّفعة" value={`#${lot.lotNumber}`} />
          )}
          {lot.harvestDate && (
            <InfoRow icon="calendar-outline" label="موعد الحصاد" value={formatDate(lot.harvestDate)} />
          )}
          {lot.expiryDate && (
            <InfoRow icon="time-outline" label="تاريخ الانتهاء" value={formatDate(lot.expiryDate)} />
          )}
          {(lot.farmer?.city ?? lot.farmer?.region) && (
            <InfoRow
              icon="location-outline"
              label="الموقع"
              value={[lot.farmer?.city, lot.farmer?.region].filter(Boolean).join(' — ')}
            />
          )}
          {lot.qualityGrade && (
            <InfoRow icon="ribbon-outline" label="درجة الجودة" value={lot.qualityGrade} />
          )}
          {lot.description && (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>الوصف</Text>
              <Text style={styles.descText}>{lot.description}</Text>
            </View>
          )}
        </View>

        {/* Farmer card */}
        {lot.farmer && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>عن المزارع</Text>
            <View style={styles.farmerRow}>
              <View style={styles.farmerAvatar}>
                <Ionicons name="person" size={20} color="#16a34a" />
              </View>
              <View style={styles.farmerInfo}>
                <Text style={styles.farmerName}>{lot.farmer.businessName ?? lot.farmer.contactPersonName}</Text>
                {lot.farmer.city && (
                  <Text style={styles.farmerLoc}>📍 {lot.farmer.city}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Order Form */}
        {showOrder && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>تفاصيل الطلب</Text>
            <Text style={styles.inputLabel}>الكمية المطلوبة (كجم)</Text>
            <TextInput
              style={styles.input}
              value={qty}
              onChangeText={setQty}
              keyboardType="numeric"
              placeholder={`الحد الأقصى: ${remaining} كجم`}
              textAlign="right"
            />
            {qty && parseFloat(qty) > 0 && (
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>إجمالي التقدير</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>
            )}
            <Text style={styles.inputLabel}>ملاحظات (اختياري)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="أي ملاحظات خاصة..."
              multiline
              numberOfLines={3}
              textAlign="right"
              textAlignVertical="top"
            />
            <View style={styles.btnRow}>
              <Button label="إلغاء" variant="secondary" onPress={() => setShowOrder(false)} style={{ flex: 1 }} />
              <Button
                label="تأكيد الطلب"
                onPress={handleOrder}
                loading={createOrder.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {!showOrder && remaining > 0 && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerQty}>متاح: {remaining} كجم</Text>
            <Text style={styles.footerPrice}>{formatCurrency(price)} / كجم</Text>
          </View>
          <TouchableOpacity style={styles.orderBtn} onPress={() => setShowOrder(true)}>
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <Text style={styles.orderBtnText}>اطلب الآن</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({
  icon, label, value, valueColor,
}: { icon: any; label: string; value?: string; valueColor?: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={14} color="#9ca3af" />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  navBar: {
    backgroundColor: '#16a34a',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },

  // Hero
  hero: {
    backgroundColor: '#fff', padding: 28, alignItems: 'center', gap: 6,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  heroEmoji: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emojiText: { fontSize: 48 },
  heroCategory: { fontSize: 12, color: '#16a34a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center' },
  heroFarmer: { fontSize: 13, color: '#6b7280' },
  heroPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  heroPriceValue: { fontSize: 26, fontWeight: '900', color: '#16a34a' },
  heroPriceLabel: { fontSize: 13, color: '#9ca3af' },

  // Card
  card: {
    backgroundColor: '#fff', margin: 12, marginBottom: 0,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontSize: 13, color: '#6b7280' },
  rowValue: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'left' },
  descBox: { marginTop: 12, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12 },
  descLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  descText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  // Farmer
  farmerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  farmerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center',
  },
  farmerInfo: { flex: 1 },
  farmerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  farmerLoc: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  // Order form
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
  },
  multiline: { height: 80 },
  totalBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 8,
  },
  totalLabel: { fontSize: 14, color: '#16a34a' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#16a34a' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },

  // Footer
  footer: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  footerQty: { fontSize: 12, color: '#6b7280' },
  footerPrice: { fontSize: 20, fontWeight: '900', color: '#16a34a' },
  orderBtn: {
    backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  orderBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
