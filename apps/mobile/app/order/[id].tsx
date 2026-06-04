import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, ratingsApi } from '@/lib/api';
import { formatCurrency, formatDate, statusLabel, STATUS_COLORS } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];
const RATABLE_STATUSES = ['DELIVERED', 'COMPLETED'];

const TIMELINE_STEPS = [
  { status: 'PENDING', label: 'تم إرسال الطلب', icon: 'time-outline' },
  { status: 'CONFIRMED', label: 'تم تأكيد الطلب', icon: 'checkmark-circle-outline' },
  { status: 'PROCESSING', label: 'قيد التحضير', icon: 'construct-outline' },
  { status: 'IN_TRANSIT', label: 'في الطريق', icon: 'car-outline' },
  { status: 'DELIVERED', label: 'تم التسليم', icon: 'cube-outline' },
  { status: 'COMPLETED', label: 'مكتمل', icon: 'star-outline' },
];

const STATUS_ORDER = TIMELINE_STEPS.map(s => s.status);

function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = ['CANCELLED', 'REJECTED', 'FAILED'].includes(currentStatus);

  if (isCancelled) {
    return (
      <View style={styles.cancelledBanner}>
        <Ionicons name="close-circle" size={24} color="#dc2626" />
        <Text style={styles.cancelledText}>{statusLabel(currentStatus)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {TIMELINE_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <View key={step.status} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View
                style={[
                  styles.timelineDot,
                  done ? styles.timelineDotDone : styles.timelineDotPending,
                  active && styles.timelineDotActive,
                ]}
              >
                <Ionicons
                  name={step.icon as any}
                  size={14}
                  color={done ? '#fff' : '#d1d5db'}
                />
              </View>
              {idx < TIMELINE_STEPS.length - 1 && (
                <View
                  style={[styles.timelineLine, done && idx < currentIdx && styles.timelineLineDone]}
                />
              )}
            </View>
            <Text
              style={[
                styles.timelineLabel,
                done && styles.timelineLabelDone,
                active && styles.timelineLabelActive,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await ordersApi.get(id!);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  const cancelOrder = useMutation({
    mutationFn: () => ordersApi.cancel(id!, cancelReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setShowCancelModal(false);
      Alert.alert('تم', 'تم إلغاء الطلب بنجاح');
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.message ?? 'فشل إلغاء الطلب');
    },
  });

  const submitRating = useMutation({
    mutationFn: () =>
      ratingsApi.create({
        orderId: id,
        rating,
        comment: ratingComment.trim() || undefined,
      }),
    onSuccess: () => {
      setShowRateModal(false);
      Alert.alert('شكراً', 'تم إرسال تقييمك بنجاح');
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.message ?? 'فشل إرسال التقييم');
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
          <Text style={styles.errorText}>لم يتم العثور على الطلب</Text>
        </View>
      </SafeAreaView>
    );
  }

  const order = data;
  const orderNum = order.orderNumber ?? order.id?.slice(0, 8).toUpperCase();
  const items = order.items ?? order.orderItems ?? [];
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const canRate = RATABLE_STATUSES.includes(order.status) && !order.rated;

  const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: sc.text }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>طلب #{orderNum}</Text>
            <Text style={styles.headerDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <Badge status={order.status} />
        </View>

        {/* Timeline */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>تتبع الطلب</Text>
          <OrderTimeline currentStatus={order.status} />
        </Card>

        {/* Items */}
        {items.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>المنتجات ({items.length})</Text>
            {items.map((item: any, idx: number) => (
              <View
                key={item.id ?? idx}
                style={[styles.itemRow, idx !== 0 && styles.itemRowBorder]}
              >
                <View style={styles.itemIconBox}>
                  <Ionicons name="leaf" size={20} color="#16a34a" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.productName ??
                      item.listing?.productName ??
                      item.listing?.cropType ??
                      'منتج'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {Number(item.requestedQtyKg ?? item.quantity ?? 0)} {item.unit ?? 'كجم'} × {formatCurrency(Number(item.pricePerKg ?? item.unitPrice ?? item.pricePerUnit ?? item.price ?? 0))}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {formatCurrency(Number(item.totalPrice ?? item.subtotal ?? (Number(item.requestedQtyKg ?? item.quantity ?? 0) * Number(item.pricePerKg ?? item.unitPrice ?? item.price ?? 0))))}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Totals */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>ملخص الطلب</Text>
          {[
            { label: 'المجموع الفرعي', value: order.subtotal ?? order.totalAmount },
            { label: 'الضريبة (15%)', value: order.taxAmount ?? order.tax },
            { label: 'رسوم الشحن', value: order.shippingCost ?? order.deliveryCost },
          ]
            .filter(r => r.value != null)
            .map((row, idx) => (
              <View key={idx} style={styles.totalRow}>
                <Text style={styles.totalValue}>{formatCurrency(row.value)}</Text>
                <Text style={styles.totalLabel}>{row.label}</Text>
              </View>
            ))}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(order.totalAmount ?? order.grandTotal ?? order.total)}
            </Text>
            <Text style={styles.grandTotalLabel}>الإجمالي الكلي</Text>
          </View>
        </Card>

        {/* Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>معلومات إضافية</Text>
          {[
            { label: 'البائع', value: order.farmer?.businessName ?? order.farmerName },
            { label: 'المشتري', value: order.buyer?.businessName ?? order.buyerName },
            { label: 'عنوان التسليم', value: order.deliveryAddress },
            { label: 'طريقة الدفع', value: order.paymentMethod },
            { label: 'ملاحظات', value: order.notes },
          ]
            .filter(r => r.value)
            .map((row, idx) => (
              <View key={idx} style={[styles.detailRow, idx !== 0 && styles.detailRowBorder]}>
                <Text style={styles.detailValue}>{row.value}</Text>
                <Text style={styles.detailLabel}>{row.label}</Text>
              </View>
            ))}
        </Card>

        {/* Actions */}
        {(canCancel || canRate) && (
          <View style={styles.actionsRow}>
            {canCancel && (
              <Button
                label="إلغاء الطلب"
                variant="danger"
                onPress={() => setShowCancelModal(true)}
                style={styles.actionBtn}
              />
            )}
            {canRate && (
              <Button
                label="تقييم الطلب"
                onPress={() => setShowRateModal(true)}
                style={styles.actionBtn}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إلغاء الطلب</Text>
            <Text style={styles.modalSubtitle}>يرجى ذكر سبب الإلغاء</Text>
            <TextInput
              style={styles.modalInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="اكتب سبب الإلغاء..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlign="right"
            />
            <View style={styles.modalBtns}>
              <Button
                label="تأكيد الإلغاء"
                variant="danger"
                onPress={() => cancelOrder.mutate()}
                loading={cancelOrder.isPending}
                disabled={!cancelReason.trim()}
                style={styles.modalBtn}
              />
              <Button
                label="رجوع"
                variant="secondary"
                onPress={() => setShowCancelModal(false)}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Rate Modal */}
      <Modal visible={showRateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تقييم الطلب</Text>
            <Text style={styles.modalSubtitle}>شارك تجربتك مع هذا الطلب</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={rating >= star ? 'star' : 'star-outline'}
                    size={36}
                    color={rating >= star ? '#f59e0b' : '#d1d5db'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="أضف تعليقاً (اختياري)..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlign="right"
            />
            <View style={styles.modalBtns}>
              <Button
                label="إرسال التقييم"
                onPress={() => submitRating.mutate()}
                loading={submitRating.isPending}
                style={styles.modalBtn}
              />
              <Button
                label="إلغاء"
                variant="secondary"
                onPress={() => setShowRateModal(false)}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#16a34a',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerDate: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  card: { marginHorizontal: 16, marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 14, textAlign: 'right' },

  // Timeline
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 48 },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotPending: { backgroundColor: '#f3f4f6', borderWidth: 2, borderColor: '#e5e7eb' },
  timelineDotDone: { backgroundColor: '#16a34a' },
  timelineDotActive: { backgroundColor: '#16a34a', shadowColor: '#16a34a', shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginVertical: 2, minHeight: 16 },
  timelineLineDone: { backgroundColor: '#16a34a' },
  timelineLabel: { fontSize: 14, color: '#9ca3af', paddingTop: 6, textAlign: 'right' },
  timelineLabelDone: { color: '#374151' },
  timelineLabelActive: { color: '#16a34a', fontWeight: '700' },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
  },
  cancelledText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, alignItems: 'flex-end' },
  itemName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  itemMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: '#16a34a' },

  // Totals
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  totalValue: { fontSize: 13, color: '#374151', fontWeight: '600' },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#f3f4f6',
    marginTop: 6,
    paddingTop: 10,
  },
  grandTotalLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: '#16a34a' },

  // Details
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  detailLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  detailValue: { fontSize: 13, color: '#111827', flex: 1, textAlign: 'right', marginRight: 8 },

  // Actions
  actionsRow: { flexDirection: 'row', padding: 16, gap: 12, paddingBottom: 32 },
  actionBtn: { flex: 1 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtns: { gap: 10 },
  modalBtn: {},
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 16, color: '#9ca3af' },
});
