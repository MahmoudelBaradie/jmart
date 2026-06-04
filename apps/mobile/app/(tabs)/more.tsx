import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/shared/AppHeader';
import { colors } from '@/lib/theme';
import { useLocale } from '@/hooks/useLocale';
import { LOCALES, type Locale } from '@/lib/i18n';

function initials(s?: string) {
  if (!s) return '؟';
  const t = s.trim();
  return t[0] ?? '؟';
}

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  badge?: number | string;
  color?: string;
  roles?: ('FARMER' | 'BUYER')[];
}

export default function MoreScreen() {
  const { user, isFarmer, isBuyer, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const [langOpen, setLangOpen] = useState(false);
  const name: string =
    (user as any)?.farmer?.businessName ||
    (user as any)?.buyer?.businessName ||
    (user as any)?.email ||
    (locale === 'ar' ? 'مستخدم جمارت' : 'Jmart user');
  const roleLabel = isFarmer ? t('role.farmer') : isBuyer ? t('role.buyer') : '';
  const currentLang = LOCALES.find((l) => l.code === locale);

  // Items below are organised by section so the bottom bar can stay at 4-5
  // primary tabs. Anything not core (contracts, disputes, addresses, community
  // …) lives here, plus settings/help/logout.
  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: t('more.section.account'),
      items: [
        { icon: 'document-text-outline', label: t('more.contracts'), href: '/contracts' },
        { icon: 'card-outline',          label: isFarmer ? t('more.payments.farmer') : t('more.payments.buyer'), href: '/financial' },
        { icon: 'alert-circle-outline',  label: t('more.disputes'), href: '/disputes' },
      ],
    },
    {
      title: t('more.section.settings'),
      items: [
        { icon: 'notifications-outline', label: t('more.notifications'), href: '/notifications' },
        { icon: 'help-circle-outline',   label: t('more.help'), href: '/more' },
        { icon: 'information-circle-outline', label: t('more.about'), href: '/more' },
      ],
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title={t('more.title')} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card — primary destination, sits at the top */}
        <Pressable style={s.profileCard} onPress={() => router.push('/profile')}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName} numberOfLines={1}>{name}</Text>
            {roleLabel ? <Text style={s.profileRole}>{roleLabel}</Text> : null}
          </View>
          <View style={s.profileBtn}>
            <Text style={s.profileBtnText}>{t('more.profile.button')}</Text>
            <Ionicons name={locale === 'ar' ? 'chevron-back' : 'chevron-forward'} size={16} color="#fff" />
          </View>
        </Pressable>

        {/* Language row — opens picker modal */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('more.section.settings')}</Text>
          <View style={s.card}>
            <Pressable style={s.row} onPress={() => setLangOpen(true)}>
              <View style={s.rowIcon}>
                <Ionicons name="language" size={20} color={colors.brand} />
              </View>
              <Text style={s.rowLabel}>{t('more.language')}</Text>
              <View style={{ flex: 1 }} />
              {currentLang ? (
                <View style={s.langBadge}>
                  <Text style={s.langBadgeFlag}>{currentLang.flag}</Text>
                  <Text style={s.langBadgeText}>{currentLang.nativeLabel}</Text>
                </View>
              ) : null}
              <Ionicons name={locale === 'ar' ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSubtle} />
            </Pressable>
          </View>
        </View>

        {sections.map((sec) => (
          <View key={sec.title} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            <View style={s.card}>
              {sec.items.map((it, idx) => (
                <Pressable
                  key={it.label}
                  style={[s.row, idx > 0 && s.rowBorder]}
                  onPress={() => router.push(it.href as any)}
                >
                  <View style={[s.rowIcon, it.color ? { backgroundColor: it.color + '20' } : null]}>
                    <Ionicons name={it.icon} size={20} color={it.color ?? colors.brand} />
                  </View>
                  <Text style={s.rowLabel}>{it.label}</Text>
                  <View style={{ flex: 1 }} />
                  {it.badge ? (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{it.badge}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-back" size={18} color={colors.textSubtle} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Logout — destructive. Confirm, then clear session AND redirect. */}
        <View style={s.section}>
          <Pressable
            style={[s.card, s.logoutRow]}
            onPress={async () => {
              const ok = typeof window !== 'undefined'
                ? window.confirm(t('more.logout.confirm'))
                : true;
              if (!ok) return;
              try { await logout(); } catch {}
              router.replace('/(auth)/login');
            }}
          >
            <View style={[s.rowIcon, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            </View>
            <Text style={[s.rowLabel, { color: '#dc2626' }]}>{t('more.logout')}</Text>
          </Pressable>
        </View>

        <Text style={s.version}>{t('more.version')}</Text>
      </ScrollView>

      {/* Language picker modal */}
      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setLangOpen(false)}>
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{t('lang.title')}</Text>
              <Pressable onPress={() => setLangOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <Text style={s.modalNote}>{t('lang.note')}</Text>

            {LOCALES.map((l) => {
              const active = l.code === locale;
              return (
                <Pressable
                  key={l.code}
                  style={[s.langRow, active && s.langRowActive]}
                  onPress={async () => {
                    await setLocale(l.code as Locale);
                    setLangOpen(false);
                  }}
                >
                  <Text style={s.langFlag}>{l.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.langNative}>{l.nativeLabel}</Text>
                    <Text style={s.langName}>{l.label}</Text>
                  </View>
                  {active && (
                    <View style={s.langCheck}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fdfaf3' },
  scroll: { padding: 16, paddingBottom: 30 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: colors.textSubtle,
    marginBottom: 8, marginRight: 4, textAlign: 'right',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  row: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  rowIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  badge: {
    minWidth: 22, height: 20, borderRadius: 10,
    backgroundColor: '#dc2626', paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  logoutRow: { paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  version: {
    textAlign: 'center', color: colors.textSubtle, fontSize: 11, marginTop: 16,
  },

  // Profile card
  profileCard: {
    backgroundColor: colors.brand,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  profileName: { color: '#fff', fontSize: 15, fontWeight: '900', textAlign: 'right' },
  profileRole: { color: '#dcfce7', fontSize: 11, marginTop: 2, textAlign: 'right' },
  profileBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
  },
  profileBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Language badge in row
  langBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  langBadgeFlag: { fontSize: 14 },
  langBadgeText: { fontSize: 11, fontWeight: '800', color: colors.brand },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, paddingBottom: 28,
    gap: 10,
  },
  modalHead: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#1f2937' },
  modalNote: { fontSize: 11, color: '#6b7280', marginBottom: 10 },

  langRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  langRowActive: { borderColor: colors.brand, backgroundColor: '#f0fdf4' },
  langFlag: { fontSize: 28 },
  langNative: { fontSize: 15, fontWeight: '900', color: '#1f2937' },
  langName: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  langCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
});
