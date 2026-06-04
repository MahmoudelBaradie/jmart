import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { colors } from '@/lib/theme';

/**
 * Shared top header. Brand name on the right (RTL), notification bell with
 * unread badge on the left. Optional subtitle (e.g. delivery location) sits
 * just below the brand without ever blocking the layout if data is missing.
 *
 * Use on every screen except the marketplace home, which keeps its own variant
 * with the location switcher.
 */
export default function AppHeader({
  title,
  subtitle,
  showBack = false,
  rightSlot,
}: {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const { data: unreadData } = useQuery({
    queryKey: ['mobile-unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: false,
  });
  const unread: number =
    unreadData?.count ?? unreadData?.data?.count ?? 0;

  return (
    <View style={s.wrap}>
      {/* Right side — brand or back */}
      <View style={s.right}>
        {showBack ? (
          <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={8}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={s.brandRow}>
            <View style={s.brandMark}>
              <Ionicons name="leaf" size={16} color="#fff" />
            </View>
            <Text style={s.brand}>جمارت</Text>
          </View>
        )}
      </View>

      {/* Center title (optional) */}
      {title ? (
        <View style={s.center}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      ) : <View style={s.center} />}

      {/* Left — bell + custom slot */}
      <View style={s.left}>
        {rightSlot}
        <Pressable
          onPress={() => router.push('/notifications')}
          style={s.iconBtn}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#fdfaf3',
  },
  right: { minWidth: 100 },
  left:  { minWidth: 80, flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  center: { flex: 1, alignItems: 'center' },

  brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  brandMark: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  brand: { fontSize: 18, fontWeight: '900', color: colors.brand, letterSpacing: 0.3 },

  title: { fontSize: 16, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 11, color: colors.textSubtle, marginTop: 1 },

  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: 4, left: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
});
