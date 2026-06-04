import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography } from '@/lib/theme';
import { useLocale } from '@/hooks/useLocale';

function TabIcon({ name, color, size }: { name: any; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

/**
 * Bottom nav shows EXACTLY 4 tabs (including the "more" hub):
 *   Farmer:  home · listings    · orders · more
 *   Buyer:   home · marketplace · orders · more
 *
 * Notifications moved to the TOP bar (bell icon on every screen).
 * Profile, contracts, disputes, payments, addresses, community, settings,
 * logout, etc. all live in the "more" hub.
 */
export default function TabsLayout() {
  const { isFarmer, isBuyer } = useAuth();
  const { t } = useLocale();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontSize: typography.caption, fontWeight: typography.weightSemibold },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home'),
          tabBarIcon: ({ color, size }) => <TabIcon name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: t('tab.market'),
          tabBarIcon: ({ color, size }) => <TabIcon name="storefront-outline" color={color} size={size} />,
          tabBarItemStyle: !isBuyer ? { display: 'none' } : undefined,
          href: isBuyer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: t('tab.listings'),
          tabBarIcon: ({ color, size }) => <TabIcon name="leaf-outline" color={color} size={size} />,
          tabBarItemStyle: !isFarmer ? { display: 'none' } : undefined,
          href: isFarmer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tab.orders'),
          tabBarIcon: ({ color, size }) => <TabIcon name="receipt-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tab.more'),
          tabBarIcon: ({ color, size }) => <TabIcon name="grid-outline" color={color} size={size} />,
        }}
      />

      {/* Hidden — still routable from menus / deep links but NOT in tab bar */}
      <Tabs.Screen
        name="profile"
        options={{ title: 'حسابي', tabBarItemStyle: { display: 'none' }, href: null }}
      />
      <Tabs.Screen
        name="contracts"
        options={{ title: 'العقود', tabBarItemStyle: { display: 'none' }, href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'الإشعارات', tabBarItemStyle: { display: 'none' }, href: null }}
      />
    </Tabs>
  );
}
