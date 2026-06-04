import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';

export default function NotificationsStandaloneScreen() {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['mobile-notifications'],
    queryFn: () => notificationsApi.list({ limit: 50 }).then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-notifications'] });
      qc.invalidateQueries({ queryKey: ['mobile-unread-count'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-notifications'] });
      qc.invalidateQueries({ queryKey: ['mobile-unread-count'] });
    },
  });

  const notifications = data?.data ?? data?.items ?? [];
  const unread = notifications.filter((n: any) => !n.readAt && !n.isRead).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>الإشعارات</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={() => markAll.mutate()}>
            <Text style={styles.markAllBtn}>قراءة الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" title="لا توجد إشعارات" subtitle="ستظهر إشعاراتك هنا" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#16a34a" />}
          renderItem={({ item }) => {
            const isUnread = !item.readAt && !item.isRead;
            return (
              <TouchableOpacity
                style={[styles.card, isUnread && styles.cardUnread]}
                onPress={() => isUnread && markRead.mutate(item.id)}
                activeOpacity={0.7}
              >
                {isUnread && <View style={styles.dot} />}
                <View style={styles.iconBox}>
                  <Ionicons name="notifications-outline" size={22} color="#16a34a" />
                </View>
                <View style={styles.content}>
                  <Text style={[styles.notifTitle, isUnread && { fontWeight: '800' }]}>
                    {item.title ?? item.titleAr ?? 'إشعار'}
                  </Text>
                  <Text style={styles.body} numberOfLines={2}>{item.body ?? item.bodyAr ?? item.message}</Text>
                  <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
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
    backgroundColor: '#16a34a', paddingHorizontal: 16,
    paddingTop: 16, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '800' },
  markAllBtn: { color: '#dcfce7', fontSize: 13, fontWeight: '600' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    position: 'relative',
  },
  cardUnread: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  dot: {
    position: 'absolute', top: 14, right: 14,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  body: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
});
