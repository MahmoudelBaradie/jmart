import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDate, statusLabel, STATUS_COLORS } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';

const STATUS_STEPS = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED',
];

const STEP_LABELS: Record<string, string> = {
  PENDING: 'معلق',
  CONFIRMED: 'مؤكد',
  PROCESSING: 'قيد التجهيز',
  IN_TRANSIT: 'قيد الشحن',
  DELIVERED: 'تم التسليم',
  COMPLETED: 'مكتمل',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => ordersApi.get(id).then((r) => r.data?.data ?? r.data),
  });

  const cancelOrder = useMutation({
    mutationFn: () => ordersApi.cancel(id, 'طلب إلغاء من المستخدم'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-detail', id] });
      qc.invalidateQueries({ queryKey: ['mobile-orders'] });
      Alert.alert('تم الإلغاء', 'تم إلغاء الطلب بنجاح');
    },
    onError: (e: any) => {
      Alert.alert('خطأ', e?.response?.data?.message ?? 'فشل الإلغاء');
    },
  });

  const confirmOrder = useMutation({
    mutationFn: () => ordersApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-detail', id] });
      qc.invalidateQueries({ queryKey: ['mobile-orders'] });
      Alert.alert('تم', 'تم تأكيد استلام الطلب');
    },
    onError: (e: any) => {
      Alert.alert('خطأ', e?.response?.data?.message ?? 'فشلت العملية');
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const order = data;
  const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING;
  const currentStep = STATUS_STEPS.indexOf(order.status);

  const handleCancel = () => {
    Alert.alert('إلغاء الطلب', 'هل أنت متأكد من إلغاء هذا الطلب؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'إلغاء الطلب', style: 'destructive', onPress: () => cancelOrder.mutate() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>تفاصيل الطلب</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Header */}
        <View style={[styles.statusHeader, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusLabel, { color: sc.text }]}>{statusLabel(order.status)}</Text>
          <Text style={styles.orderNum}>#{order.orderNumber ?? order.id.slice(0, 8)}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>مراحل الطلب</Text>
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStep;
            const active = i === currentStep;
            return (
              <View key={step} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    done && styles.timelineDotDone,
                    active && styles.timelineDotActive,
                  ]}>
                    {done && <Ionicons name={active ? 'ellipse' : 'checkmark'} size={12} color="#fff" />}
                  </View>
                  {i < STATUS_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                  )}
                </View>
                <Text style={[styles.timelineLabel, done && styles.timelineLabelDone, active && styles.timelineLabelActive]}>
                  {STEP_LABELS[step] ?? step}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Order Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات الطلب</Text>
          <InfoRow
            label="المنتج"
            value={order.inventoryLot?.product?.nameAr
              ?? order.inventoryLot?.product?.name
              ?? order.lot?.product?.nameAr
              ?? 'منتج'}
          />
          <InfoRow
            label="الكمية"
            value={`${Number(order.totalQty ?? order.quantityKg ?? order.quantity ?? 0)} كجم`}
          />
          <InfoRow
            label="السعر / كجم"
            value={formatCurrency(Number(order.pricePerKg ?? order.unitPrice ?? order.pricePerUnit ?? 0))}
          />
          <InfoRow label="الإجمالي" value={formatCurrency(order.totalAmount)} />
          <InfoRow label="تاريخ الطلب" value={formatDate(order.createdAt)} />
          {order.notes && <InfoRow label="ملاحظات" value={order.notes} />}
        </View>

        {/* Farmer Info */}
        {(order.inventoryLot?.farmer ?? order.lot?.farmer) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>معلومات المزارع</Text>
            <InfoRow
              label="الاسم"
              value={(order.inventoryLot?.farmer ?? order.lot?.farmer)?.businessName
                ?? (order.inventoryLot?.farmer ?? order.lot?.farmer)?.contactPersonName}
            />
            <InfoRow label="الهاتف" value={(order.inventoryLot?.farmer ?? order.lot?.farmer)?.phone} />
            {(order.inventoryLot?.farmer ?? order.lot?.farmer)?.city && (
              <InfoRow label="المدينة" value={(order.inventoryLot?.farmer ?? order.lot?.farmer)?.city} />
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          {order.status === 'PENDING' && (
            <Button
              label="إلغاء الطلب"
              variant="danger"
              onPress={handleCancel}
              loading={cancelOrder.isPending}
            />
          )}
          {order.status === 'DELIVERED' && (
            <Button
              label="تأكيد الاستلام"
              onPress={() => confirmOrder.mutate()}
              loading={confirmOrder.isPending}
            />
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  navBar: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  statusHeader: {
    padding: 20, alignItems: 'center', gap: 4,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  statusLabel: { fontSize: 20, fontWeight: '800' },
  orderNum: { fontSize: 13, color: '#6b7280' },
  card: {
    backgroundColor: '#fff', margin: 16, marginBottom: 0,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionsCard: { margin: 16, marginBottom: 0, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 13, color: '#6b7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1, textAlign: 'right' },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0, gap: 12 },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#e5e7eb',
  },
  timelineDotDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  timelineDotActive: { backgroundColor: '#16a34a', borderColor: '#16a34a', transform: [{ scale: 1.15 }] },
  timelineLine: { width: 2, height: 28, backgroundColor: '#e5e7eb', marginVertical: 2 },
  timelineLineDone: { backgroundColor: '#16a34a' },
  timelineLabel: { flex: 1, fontSize: 14, color: '#9ca3af', paddingTop: 4, paddingBottom: 28 },
  timelineLabelDone: { color: '#374151' },
  timelineLabelActive: { color: '#16a34a', fontWeight: '800' },
});
