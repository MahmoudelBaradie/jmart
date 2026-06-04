import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { contractsApi } from '@/lib/api';
import { formatDate, statusLabel, STATUS_COLORS } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';

export default function ContractsScreen() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['mobile-contracts'],
    queryFn: () => contractsApi.list({ limit: 50 }).then((r) => r.data),
  });

  const contracts = data?.data ?? data?.items ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>العقود</Text>
        <Text style={styles.count}>{contracts.length} عقد</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : contracts.length === 0 ? (
        <EmptyState icon="document-text-outline" title="لا توجد عقود" subtitle="لم يتم إنشاء أي عقود بعد" />
      ) : (
        <FlatList
          data={contracts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#16a34a" />}
          renderItem={({ item }) => {
            const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.DRAFT;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/contract/[id]', params: { id: item.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.contractNum}>#{item.contractNumber ?? item.id.slice(0, 8)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{statusLabel(item.status)}</Text>
                  </View>
                </View>
                <Text style={styles.title2}>{item.title ?? 'عقد'}</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>تاريخ البدء</Text>
                  <Text style={styles.value}>{formatDate(item.startDate)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>تاريخ الانتهاء</Text>
                  <Text style={styles.value}>{formatDate(item.endDate)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#16a34a', paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  count: { color: '#dcfce7', fontSize: 13 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  contractNum: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  title2: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, color: '#6b7280' },
  value: { fontSize: 12, fontWeight: '600', color: '#374151' },
});
