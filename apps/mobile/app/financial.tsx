import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { financialApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';

export default function FinancialScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => {
      try {
        const res = await financialApi.summary();
        return res.data?.data ?? res.data;
      } catch {
        return null;
      }
    },
  });

  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['financial-invoices'],
    queryFn: async () => {
      const res = await financialApi.invoices({ limit: 30 });
      const d = res.data?.data ?? res.data;
      return d?.invoices ?? d?.data ?? (Array.isArray(d) ? d : []);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchInvoices()]);
    setRefreshing(false);
  };

  const invoices = invoicesData ?? [];
  const summary = summaryData;

  const isLoading = summaryLoading || invoicesLoading;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الملخص المالي</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
          }
        >
          {/* Summary Cards */}
          {summary && (
            <View style={styles.summaryGrid}>
              {[
                {
                  label: 'إجمالي الإيرادات',
                  value: formatCurrency(summary.totalRevenue ?? summary.totalSales ?? summary.totalAmount),
                  icon: 'cash-outline',
                  color: '#16a34a',
                },
                {
                  label: 'المستحقات',
                  value: formatCurrency(summary.pendingAmount ?? summary.outstanding),
                  icon: 'time-outline',
                  color: '#f59e0b',
                },
                {
                  label: 'المدفوعات',
                  value: formatCurrency(summary.paidAmount ?? summary.received),
                  icon: 'checkmark-circle-outline',
                  color: '#0891b2',
                },
                {
                  label: 'عدد الفواتير',
                  value: String(summary.invoiceCount ?? summary.totalInvoices ?? invoices.length),
                  icon: 'receipt-outline',
                  color: '#7c3aed',
                },
              ].map((item, idx) => (
                <View key={idx} style={[styles.summaryCard, { borderTopColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Invoices List */}
          <View style={styles.invoicesSection}>
            <Text style={styles.sectionTitle}>الفواتير ({invoices.length})</Text>

            {invoices.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="لا توجد فواتير"
                subtitle="ستظهر فواتيرك هنا"
              />
            ) : (
              invoices.map((invoice: any, idx: number) => (
                <Card key={invoice.id ?? idx} style={styles.invoiceCard}>
                  <View style={styles.invoiceTop}>
                    <Badge status={invoice.status ?? 'PENDING'} />
                    <Text style={styles.invoiceNum}>
                      فاتورة #{invoice.invoiceNumber ?? invoice.id?.slice(0, 8)}
                    </Text>
                  </View>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceDate}>{formatDate(invoice.createdAt)}</Text>
                    <Text style={styles.invoiceAmount}>
                      {formatCurrency(invoice.totalAmount ?? invoice.amount)}
                    </Text>
                  </View>
                  {invoice.dueDate && (
                    <Text style={styles.dueDate}>
                      الاستحقاق: {formatDate(invoice.dueDate)}
                    </Text>
                  )}
                </Card>
              ))
            )}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 0,
  },
  summaryCard: {
    width: '50%',
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 3,
    backgroundColor: '#fff',
    borderRadius: 0,
  },
  summaryValue: { fontSize: 15, fontWeight: '800', color: '#111827', textAlign: 'center' },
  summaryLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  invoicesSection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'right' },
  invoiceCard: { marginBottom: 10 },
  invoiceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  invoiceNum: { fontSize: 14, fontWeight: '700', color: '#111827' },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceDate: { fontSize: 12, color: '#6b7280' },
  invoiceAmount: { fontSize: 16, fontWeight: '800', color: '#16a34a' },
  dueDate: { fontSize: 12, color: '#f59e0b', marginTop: 6, textAlign: 'right' },
});
