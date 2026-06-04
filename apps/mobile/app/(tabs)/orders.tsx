import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDate, statusLabel, STATUS_COLORS } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import AppHeader from '@/components/shared/AppHeader';

const STATUS_TABS = [
  { label: 'الكل', value: '' },
  { label: 'معلق', value: 'PENDING' },
  { label: 'مؤكد', value: 'CONFIRMED' },
  { label: 'مكتمل', value: 'COMPLETED' },
  { label: 'ملغى', value: 'CANCELLED' },
];

export default function OrdersScreen() {
  const [activeStatus, setActiveStatus] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['mobile-orders', activeStatus],
    queryFn: () => ordersApi.list({ status: activeStatus || undefined, limit: 50 }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const orders = data?.data ?? data?.items ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="الطلبات" />

      <View style={styles.statusTabs}>
        {STATUS_TABS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.statusTab, activeStatus === t.value && styles.statusTabActive]}
            onPress={() => setActiveStatus(t.value)}
          >
            <Text style={[styles.statusTabText, activeStatus === t.value && styles.statusTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState icon="receipt-outline" title="لا توجد طلبات" subtitle="لم يتم العثور على طلبات في هذه الفئة" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#16a34a" />}
          renderItem={({ item }) => {
            const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.PENDING;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.orderId}>#{item.orderNumber ?? item.id.slice(0, 8)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{statusLabel(item.status)}</Text>
                  </View>
                </View>
                <Text style={styles.product}>
                  {item.inventoryLot?.product?.nameAr
                    ?? item.inventoryLot?.product?.name
                    ?? item.lot?.product?.nameAr
                    ?? 'طلب'}
                </Text>
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.label}>التاريخ</Text>
                    <Text style={styles.value}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.label}>الأصناف</Text>
                    <Text style={styles.value}>{Number(item._count?.items ?? item.itemsCount ?? 0)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>المبلغ</Text>
                    <Text style={[styles.value, { color: '#16a34a' }]}>{formatCurrency(item.totalAmount)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-back-outline" size={16} color="#9ca3af" style={styles.chevron} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fdfaf3' },
  header: {
    backgroundColor: '#16a34a', paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 16,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statusTabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    paddingHorizontal: 8,
  },
  statusTab: { paddingHorizontal: 12, paddingVertical: 12 },
  statusTabActive: { borderBottomWidth: 2, borderBottomColor: '#16a34a' },
  statusTabText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  statusTabTextActive: { color: '#16a34a' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  product: { fontSize: 15, color: '#374151', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 11, color: '#6b7280' },
  value: { fontSize: 13, fontWeight: '700', color: '#111827' },
  chevron: { position: 'absolute', left: 12, top: '50%' },
});
