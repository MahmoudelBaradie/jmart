import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsApi, ordersApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Card from '@/components/ui/Card';

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [ordered, setOrdered] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const res = await listingsApi.get(id!);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  const createOrder = useMutation({
    mutationFn: (payload: Record<string, unknown>) => ordersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setOrdered(true);
    },
    onError: (err: any) => {
      Alert.alert(
        'خطأ',
        err?.response?.data?.message ?? 'فشل إنشاء الطلب. حاول مرة أخرى.'
      );
    },
  });

  const listing = data;

  const handleOrder = () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال كمية صحيحة');
      return;
    }
    const maxQty = listing?.availableQuantity ?? listing?.quantity ?? Infinity;
    if (qty > maxQty) {
      Alert.alert('خطأ', `الكمية المطلوبة تتجاوز الكمية المتاحة (${maxQty} ${listing?.unit ?? 'كجم'})`);
      return;
    }
    Alert.alert(
      'تأكيد الطلب',
      `هل تريد طلب ${qty} ${listing?.unit ?? 'كجم'} من ${listing?.productName ?? listing?.cropType ?? 'المنتج'}؟\nالإجمالي: ${formatCurrency(Number(listing?.pricePerKg ?? listing?.pricePerUnit ?? listing?.price ?? 0) * qty)}`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          onPress: () =>
            createOrder.mutate({
              listingId: id,
              quantity: qty,
              notes: notes.trim() || undefined,
            }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
          <Text style={styles.errorText}>لم يتم العثور على المنتج</Text>
        </View>
      </SafeAreaView>
    );
  }

  const name = listing.productName ?? listing.cropType ?? listing.title ?? 'منتج';
  // API returns Decimal as string — cast before math/format
  const price = Number(listing.pricePerKg ?? listing.pricePerUnit ?? listing.price ?? 0);
  const availableQty = Number(listing.qtyAvailable ?? listing.availableQuantity ?? listing.quantity ?? 0);
  const unit = listing.unit ?? 'كجم';
  const farm = listing.farmer?.businessName ?? listing.farmName ?? '—';
  const grade = listing.grade ?? listing.qualityGrade;
  const totalEstimate = price * (parseFloat(quantity) || 0);

  if (ordered) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#16a34a" />
          </View>
          <Text style={styles.successTitle}>تم إرسال طلبك بنجاح!</Text>
          <Text style={styles.successSubtitle}>
            سيتم مراجعة طلبك والتواصل معك قريباً
          </Text>
          <Button
            label="عرض طلباتي"
            onPress={() => router.push('/(tabs)/orders')}
            style={styles.successBtn}
          />
          <Button
            label="العودة للسوق"
            onPress={() => router.back()}
            variant="secondary"
            style={styles.successBtnSecondary}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
          <Badge status={listing.status ?? 'AVAILABLE'} />
        </View>

        {/* Product Info */}
        <Card style={styles.card}>
          <View style={styles.productHeader}>
            <View style={styles.productIconBox}>
              <Ionicons name="leaf" size={36} color="#16a34a" />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{name}</Text>
              <View style={styles.farmRow}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.farmName}>{farm}</Text>
              </View>
              {grade && (
                <View style={styles.gradeTag}>
                  <Ionicons name="star-outline" size={12} color="#f59e0b" />
                  <Text style={styles.gradeText}>الجودة: {grade}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>السعر لكل {unit}</Text>
              <Text style={styles.price}>{formatCurrency(price)}</Text>
            </View>
            <View style={styles.qtyBox}>
              <Text style={styles.qtyLabel}>الكمية المتاحة</Text>
              <Text style={styles.qty}>{availableQty} {unit}</Text>
            </View>
          </View>
        </Card>

        {/* Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>تفاصيل المنتج</Text>

          {[
            { label: 'نوع المنتج', value: listing.productType ?? listing.category?.nameAr ?? '—' },
            { label: 'تاريخ الحصاد', value: formatDate(listing.harvestDate) },
            { label: 'تاريخ الإتاحة', value: formatDate(listing.availableFrom ?? listing.createdAt) },
            { label: 'موقع المزرعة', value: listing.location ?? listing.farmer?.location ?? '—' },
            { label: 'الشهادات', value: listing.certifications ?? '—' },
          ].filter(r => r.value && r.value !== '—').map((row, idx) => (
            <View key={idx} style={[styles.detailRow, idx !== 0 && styles.detailRowBorder]}>
              <Text style={styles.detailValue}>{row.value}</Text>
              <Text style={styles.detailLabel}>{row.label}</Text>
            </View>
          ))}

          {listing.description && (
            <>
              <View style={styles.detailRowBorder} />
              <Text style={styles.descLabel}>الوصف</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </>
          )}
        </Card>

        {/* Order Section */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>تقديم طلب</Text>

          <View style={styles.qtyInputRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(String(Math.max(1, (parseFloat(quantity) || 0) - 1)))}
            >
              <Ionicons name="remove" size={20} color="#374151" />
            </TouchableOpacity>
            <TextInput
              style={styles.qtyInput}
              value={quantity}
              onChangeText={(t) => setQuantity(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              textAlign="center"
            />
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() =>
                setQuantity(
                  String(Math.min(availableQty, (parseFloat(quantity) || 0) + 1))
                )
              }
            >
              <Ionicons name="add" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.unitLabel}>{unit}</Text>
          </View>

          <View style={styles.notesInput}>
            <Text style={styles.notesLabel}>ملاحظات (اختياري)</Text>
            <TextInput
              style={styles.notesField}
              value={notes}
              onChangeText={setNotes}
              placeholder="أضف ملاحظاتك هنا..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlign="right"
            />
          </View>

          {parseFloat(quantity) > 0 && (
            <View style={styles.estimateRow}>
              <Text style={styles.estimateValue}>{formatCurrency(totalEstimate)}</Text>
              <Text style={styles.estimateLabel}>الإجمالي التقديري</Text>
            </View>
          )}

          <Button
            label="تقديم الطلب"
            onPress={handleOrder}
            loading={createOrder.isPending}
            disabled={listing.status !== 'AVAILABLE' && listing.status !== undefined}
            style={styles.orderBtn}
          />

          {listing.status && listing.status !== 'AVAILABLE' && (
            <Text style={styles.unavailableText}>
              هذا المنتج غير متاح حالياً للطلب
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  backRow: { backgroundColor: '#16a34a', padding: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: '#16a34a',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'right' },
  card: { marginHorizontal: 16, marginTop: 12 },
  productHeader: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  productIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { flex: 1, justifyContent: 'center', gap: 6 },
  productName: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'right' },
  farmRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  farmName: { fontSize: 13, color: '#6b7280' },
  gradeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  gradeText: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  priceRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  priceBox: { flex: 1, alignItems: 'center' },
  priceLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  price: { fontSize: 20, fontWeight: '800', color: '#16a34a' },
  qtyBox: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f3f4f6' },
  qtyLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  qty: { fontSize: 18, fontWeight: '800', color: '#111827' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 14, textAlign: 'right' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  detailLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  detailValue: { fontSize: 13, color: '#111827' },
  descLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600', marginBottom: 6, textAlign: 'right' },
  description: { fontSize: 13, color: '#374151', lineHeight: 20, textAlign: 'right' },
  qtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#fff',
  },
  unitLabel: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  notesInput: { marginBottom: 16 },
  notesLabel: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6, textAlign: 'right' },
  notesField: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  estimateLabel: { fontSize: 13, color: '#374151', fontWeight: '600' },
  estimateValue: { fontSize: 18, fontWeight: '800', color: '#16a34a' },
  orderBtn: {},
  unavailableText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#ef4444',
    marginTop: 8,
  },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 16, color: '#9ca3af' },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  successBtn: { width: '100%' },
  successBtnSecondary: { width: '100%' },
});
