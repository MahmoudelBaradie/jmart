import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DisputesScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['disputes'],
    queryFn: async () => {
      const res = await disputesApi.list({ limit: 50 });
      const d = res.data?.data ?? res.data;
      return d?.disputes ?? d?.data ?? (Array.isArray(d) ? d : []);
    },
  });

  const disputes = data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>النزاعات</Text>
        <Text style={styles.headerCount}>{disputes.length}</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || (isFetching && !isLoading)}
              onRefresh={onRefresh}
              tintColor="#16a34a"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="shield-checkmark-outline"
              title="لا توجد نزاعات"
              subtitle="لم يتم رفع أي نزاعات بعد"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Badge status={item.status ?? 'OPEN'} />
                <Text style={styles.disputeNum}>
                  نزاع #{item.disputeNumber ?? item.id?.slice(0, 8).toUpperCase()}
                </Text>
              </View>

              {item.subject || item.title ? (
                <Text style={styles.subject} numberOfLines={2}>
                  {item.subject ?? item.title}
                </Text>
              ) : null}

              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                {item.orderNumber || item.orderId ? (
                  <Text style={styles.orderRef}>
                    طلب #{item.orderNumber ?? item.orderId?.slice(0, 8)}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  headerCount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  disputeNum: { fontSize: 14, fontWeight: '700', color: '#111827' },
  subject: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'right', marginBottom: 6 },
  description: { fontSize: 13, color: '#6b7280', textAlign: 'right', marginBottom: 10 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  date: { fontSize: 12, color: '#9ca3af' },
  orderRef: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
});
