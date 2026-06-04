import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { contractsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value?: string | null;
  last?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailValue}>{value}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
}

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const res = await contractsApi.get(id!);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تفاصيل العقد</Text>
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
          <Text style={styles.headerTitle}>تفاصيل العقد</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
          <Text style={styles.errorText}>لم يتم العثور على العقد</Text>
        </View>
      </SafeAreaView>
    );
  }

  const contract = data;
  const contractNum = contract.contractNumber ?? contract.id?.slice(0, 8).toUpperCase();
  const buyer = contract.buyer?.businessName ?? contract.buyerName ?? '—';
  const farmer = contract.farmer?.businessName ?? contract.farmerName ?? '—';
  const totalValue = contract.totalValue ?? contract.value ?? contract.totalAmount;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>عقد #{contractNum}</Text>
            <Text style={styles.headerDate}>{formatDate(contract.createdAt)}</Text>
          </View>
          <Badge status={contract.status ?? 'PENDING'} />
        </View>

        {/* Value Banner */}
        {totalValue != null && (
          <View style={styles.valueBanner}>
            <Text style={styles.valueBannerLabel}>القيمة الإجمالية للعقد</Text>
            <Text style={styles.valueBannerAmount}>{formatCurrency(totalValue)}</Text>
          </View>
        )}

        {/* Parties */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>أطراف العقد</Text>
          <View style={styles.partiesContainer}>
            <View style={styles.partyBox}>
              <View style={styles.partyIconBox}>
                <Ionicons name="leaf" size={24} color="#16a34a" />
              </View>
              <Text style={styles.partyRole}>المزارع</Text>
              <Text style={styles.partyName}>{farmer}</Text>
              {contract.farmer?.contactPersonName && (
                <Text style={styles.partyContact}>{contract.farmer.contactPersonName}</Text>
              )}
            </View>

            <View style={styles.partiesArrow}>
              <Ionicons name="swap-horizontal" size={24} color="#d1d5db" />
            </View>

            <View style={styles.partyBox}>
              <View style={[styles.partyIconBox, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="storefront" size={24} color="#7c3aed" />
              </View>
              <Text style={styles.partyRole}>المشتري</Text>
              <Text style={styles.partyName}>{buyer}</Text>
              {contract.buyer?.contactPersonName && (
                <Text style={styles.partyContact}>{contract.buyer.contactPersonName}</Text>
              )}
            </View>
          </View>
        </Card>

        {/* Contract Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>تفاصيل العقد</Text>
          <DetailRow label="عنوان العقد" value={contract.title ?? contract.name} />
          <DetailRow label="تاريخ البدء" value={formatDate(contract.startDate)} />
          <DetailRow label="تاريخ الانتهاء" value={formatDate(contract.endDate)} />
          <DetailRow label="تاريخ التوقيع" value={formatDate(contract.signedAt)} />
          <DetailRow label="شروط الدفع" value={contract.paymentTerms} />
          <DetailRow label="شروط التسليم" value={contract.deliveryTerms} />
          <DetailRow label="ملاحظات" value={contract.notes} last />
        </Card>

        {/* Products / Items */}
        {contract.items && contract.items.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>المنتجات ({contract.items.length})</Text>
            {contract.items.map((item: any, idx: number) => (
              <View
                key={item.id ?? idx}
                style={[styles.itemRow, idx !== 0 && styles.itemRowBorder]}
              >
                <View style={styles.itemIconBox}>
                  <Ionicons name="leaf" size={18} color="#16a34a" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.productName ?? item.name ?? 'منتج'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} {item.unit ?? 'كجم'} ×{' '}
                    {formatCurrency(item.unitPrice ?? item.pricePerUnit)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {formatCurrency(
                    item.totalPrice ??
                      item.subtotal ??
                      (item.quantity * (item.unitPrice ?? item.pricePerUnit ?? 0))
                  )}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Description */}
        {contract.description && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>وصف العقد</Text>
            <Text style={styles.description}>{contract.description}</Text>
          </Card>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
  valueBanner: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 4,
  },
  valueBannerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  valueBannerAmount: { fontSize: 28, fontWeight: '800', color: '#fff' },
  card: { marginHorizontal: 16, marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 14, textAlign: 'right' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600', minWidth: 90, textAlign: 'left' },
  detailValue: { fontSize: 13, color: '#111827', flex: 1, textAlign: 'right' },
  partiesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partyBox: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
  },
  partyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyRole: { fontSize: 11, color: '#6b7280' },
  partyName: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center' },
  partyContact: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  partiesArrow: { paddingHorizontal: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, alignItems: 'flex-end' },
  itemName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  itemMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: '#16a34a' },
  description: { fontSize: 14, color: '#374151', lineHeight: 22, textAlign: 'right' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 16, color: '#9ca3af' },
});
