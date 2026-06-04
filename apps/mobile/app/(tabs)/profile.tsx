import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MenuItem({ icon, label, color, onPress }: { icon: any; label: string; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: color ? color + '1a' : '#f3f4f6' }]}>
        <Ionicons name={icon} size={20} color={color ?? '#374151'} />
      </View>
      <Text style={[styles.menuLabel, color ? { color } : null]}>{label}</Text>
      <Ionicons name="chevron-back-outline" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout, isFarmer, isBuyer } = useAuth();

  const profile = user?.farmer ?? user?.buyer;
  const name = profile?.businessName ?? profile?.contactPersonName ?? user?.name ?? user?.email ?? '';

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login'); },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{name[0]?.toUpperCase() ?? 'م'}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{isFarmer ? 'مزارع' : 'مشتري'}</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات الحساب</Text>
          <InfoRow label="الاسم" value={profile?.contactPersonName ?? user?.name} />
          <InfoRow label="اسم النشاط" value={profile?.businessName} />
          <InfoRow label="البريد الإلكتروني" value={user?.email} />
          <InfoRow label="رقم الهاتف" value={profile?.phone ?? user?.phone} />
        </View>

        {/* Menu */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>الحساب</Text>
          <MenuItem
            icon="receipt-outline"
            label="طلباتي"
            onPress={() => router.push('/(tabs)/orders')}
          />
          <MenuItem
            icon="document-text-outline"
            label="عقودي"
            onPress={() => router.push('/(tabs)/contracts')}
          />
          <MenuItem
            icon="notifications-outline"
            label="الإشعارات"
            onPress={() => router.push('/(tabs)/notifications')}
          />
        </View>

        <View style={styles.card}>
          <MenuItem
            icon="log-out-outline"
            label="تسجيل الخروج"
            color="#dc2626"
            onPress={handleLogout}
          />
        </View>

        <View style={styles.version}>
          <Text style={styles.versionText}>جمارت للزراعة الرقمية — الإصدار 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fdfaf3' },
  header: {
    backgroundColor: '#16a34a',
    paddingTop: 32, paddingBottom: 32,
    alignItems: 'center', gap: 8,
  },
  avatarBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { color: '#fff', fontSize: 20, fontWeight: '800' },
  email: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20,
    marginTop: 4,
  },
  roleText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', margin: 16, marginBottom: 0,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 13, color: '#6b7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  version: { alignItems: 'center', padding: 24 },
  versionText: { color: '#9ca3af', fontSize: 12 },
});
