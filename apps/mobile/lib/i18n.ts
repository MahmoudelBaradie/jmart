/**
 * Lightweight i18n — no external deps, no async loaders, no codegen.
 *
 * Add a new language: add an entry to `MESSAGES` with the same keys.
 * Add a new key: add it to BOTH languages so TypeScript catches missing ones.
 *
 * Direction (RTL/LTR) is derived from the language:
 *   ar → rtl
 *   en → ltr
 *
 * Persistence: stored in our local storage helper (AsyncStorage on native,
 * localStorage on web). Read synchronously on first import via cache, then
 * hydrated when the AuthProvider loads.
 */
import { I18nManager, Platform } from 'react-native';
import { storage } from '@/lib/storage';

export type Locale = 'ar' | 'en';

export const LOCALES: { code: Locale; label: string; nativeLabel: string; flag: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'ar', label: 'Arabic',  nativeLabel: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧', dir: 'ltr' },
];

type Dict = Record<string, string>;

// Keep ALL keys in BOTH languages or the typecheck will flag the missing one.
export const MESSAGES: Record<Locale, Dict> = {
  ar: {
    // App
    'app.name':          'جمارت',
    'app.greeting.eve':  'مساء الخير،',
    'app.greeting.morn': 'صباح الخير،',
    'app.verified':      'موثّق',

    // Tabs
    'tab.home':       'الرئيسية',
    'tab.market':     'السوق',
    'tab.listings':   'عروضي',
    'tab.orders':     'الطلبات',
    'tab.more':       'المزيد',
    'tab.profile':    'حسابي',

    // Home
    'home.stats.orders':       'الطلبات الواردة',
    'home.stats.myOrders':     'طلباتي',
    'home.stats.revenue':      'الإيرادات',
    'home.stats.due':          'مستحقات',
    'home.stats.notifications':'إشعارات',
    'home.quick.title':        'إجراءات سريعة',
    'home.quick.market':       'تصفّح السوق',
    'home.quick.market.sub':   'منتجات طازجة',
    'home.quick.listings':     'عروضي',
    'home.quick.listings.sub': 'إدارة المنتجات',
    'home.quick.orders':       'الطلبات',
    'home.quick.contracts':    'العقود',
    'home.quick.contracts.sub':'عقودي النشطة',
    'home.quick.community':    'المجتمع',
    'home.quick.community.sub':'منشورات وأخبار',
    'home.trending':           'الأكثر طلباً 🔥',
    'home.lastOrders':         'آخر الطلبات',
    'home.seeAll':             'عرض الكل',
    'home.empty.orders':       'لا توجد طلبات بعد',
    'home.kyc.pending':        'حسابك قيد المراجعة — ستتمكن من النشر بعد الموافقة',

    // More
    'more.title':              'المزيد',
    'more.section.account':    'الحساب والطلبات',
    'more.section.settings':   'إعدادات',
    'more.contracts':          'العقود',
    'more.payments.farmer':    'مدفوعاتي',
    'more.payments.buyer':     'فواتيري',
    'more.disputes':           'النزاعات',
    'more.notifications':      'الإشعارات',
    'more.language':           'اللغة',
    'more.help':               'الدعم والمساعدة',
    'more.about':              'عن جمارت',
    'more.logout':             'تسجيل الخروج',
    'more.logout.confirm':     'هل أنت متأكد من تسجيل الخروج؟',
    'more.profile.button':     'الملف الشخصي',
    'more.version':            'جمارت — الإصدار 1.0.0',

    // Roles
    'role.farmer': '🌾 مزرعة',
    'role.buyer':  '🛒 مشتري',

    // Language picker
    'lang.title':       'اختر اللغة',
    'lang.note':        'سيتم تغيير اتجاه الواجهة تلقائياً',
    'lang.applied':     'تم تطبيق اللغة',
    'lang.reload':      'سيتم إعادة تحميل التطبيق',

    // Common actions
    'action.cancel':    'إلغاء',
    'action.save':      'حفظ',
    'action.confirm':   'تأكيد',
    'action.shopNow':   'تسوّق الآن',
    'action.viewCart':  'عرض السلة',
    'action.add':       'إضافة',
    'action.edit':      'تعديل',
    'action.delete':    'حذف',
    'action.share':     'مشاركة',
    'action.retry':     'إعادة المحاولة',

    // Listings
    'listings.title':         'عروضي',
    'listings.subtitle':      'إدارة ومتابعة',
    'listings.tab.active':    'النشطة',
    'listings.tab.all':       'الكل',
    'listings.tab.sold':      'مباعة',
    'listings.tab.expired':   'منتهية',
    'listings.stats.total':   'عرض',
    'listings.stats.totalKg': 'كجم متاح',
    'listings.stats.value':   'قيمة المخزون',
    'listings.stats.sold':    'كجم مباع',
    'listings.empty.title':   'لا توجد عروض',
    'listings.empty.sub':     'ابدأ بنشر أول عرض من زر +',
    'listings.empty.cta':     'نشر عرض جديد',
    'listings.card.available': 'متاح',
    'listings.card.of':        'من أصل',
    'listings.card.sold':      'بيع',
    'listings.card.lot':       'دفعة',
    'listings.card.lowStock':  'مخزون منخفض',
    'listings.card.outStock':  'نفد المخزون',
    'listings.search':         'ابحث عن عرض...',
    'listings.fab':            'عرض جديد',
  },
  en: {
    'app.name':          'Jmart',
    'app.greeting.eve':  'Good evening,',
    'app.greeting.morn': 'Good morning,',
    'app.verified':      'Verified',

    'tab.home':       'Home',
    'tab.market':     'Market',
    'tab.listings':   'My Listings',
    'tab.orders':     'Orders',
    'tab.more':       'More',
    'tab.profile':    'Profile',

    'home.stats.orders':       'Incoming Orders',
    'home.stats.myOrders':     'My Orders',
    'home.stats.revenue':      'Revenue',
    'home.stats.due':          'Due',
    'home.stats.notifications':'Notifications',
    'home.quick.title':        'Quick Actions',
    'home.quick.market':       'Browse Market',
    'home.quick.market.sub':   'Fresh produce',
    'home.quick.listings':     'My Listings',
    'home.quick.listings.sub': 'Manage products',
    'home.quick.orders':       'Orders',
    'home.quick.contracts':    'Contracts',
    'home.quick.contracts.sub':'Active contracts',
    'home.quick.community':    'Community',
    'home.quick.community.sub':'Posts & updates',
    'home.trending':           'Top Picks 🔥',
    'home.lastOrders':         'Recent Orders',
    'home.seeAll':             'See all',
    'home.empty.orders':       'No orders yet',
    'home.kyc.pending':        'Account under review — you can publish once approved.',

    'more.title':              'More',
    'more.section.account':    'Account & Orders',
    'more.section.settings':   'Settings',
    'more.contracts':          'Contracts',
    'more.payments.farmer':    'Payouts',
    'more.payments.buyer':     'Invoices',
    'more.disputes':           'Disputes',
    'more.notifications':      'Notifications',
    'more.language':           'Language',
    'more.help':               'Help & Support',
    'more.about':              'About Jmart',
    'more.logout':             'Sign out',
    'more.logout.confirm':     'Are you sure you want to sign out?',
    'more.profile.button':     'Profile',
    'more.version':            'Jmart — Version 1.0.0',

    'role.farmer': '🌾 Farmer',
    'role.buyer':  '🛒 Buyer',

    'lang.title':       'Choose language',
    'lang.note':        'The UI direction will change automatically',
    'lang.applied':     'Language applied',
    'lang.reload':      'The app will reload',

    'action.cancel':    'Cancel',
    'action.save':      'Save',
    'action.confirm':   'Confirm',
    'action.shopNow':   'Shop now',
    'action.viewCart':  'View cart',
    'action.add':       'Add',
    'action.edit':      'Edit',
    'action.delete':    'Delete',
    'action.share':     'Share',
    'action.retry':     'Retry',

    'listings.title':         'My Listings',
    'listings.subtitle':      'Manage & track',
    'listings.tab.active':    'Active',
    'listings.tab.all':       'All',
    'listings.tab.sold':      'Sold',
    'listings.tab.expired':   'Expired',
    'listings.stats.total':   'listings',
    'listings.stats.totalKg': 'kg available',
    'listings.stats.value':   'inventory value',
    'listings.stats.sold':    'kg sold',
    'listings.empty.title':   'No listings yet',
    'listings.empty.sub':     'Tap + to publish your first listing',
    'listings.empty.cta':     'New listing',
    'listings.card.available': 'available',
    'listings.card.of':        'of',
    'listings.card.sold':      'sold',
    'listings.card.lot':       'Lot',
    'listings.card.lowStock':  'Low stock',
    'listings.card.outStock':  'Out of stock',
    'listings.search':         'Search listings…',
    'listings.fab':            'New listing',
  },
};

// ── Reactive state — minimal pub/sub so any component can re-render on change
type Listener = () => void;
const listeners = new Set<Listener>();
let _locale: Locale = 'ar';

export function getLocale(): Locale { return _locale; }
export function getDir(): 'rtl' | 'ltr' { return _locale === 'ar' ? 'rtl' : 'ltr'; }

export function t(key: keyof typeof MESSAGES.ar, fallback?: string): string {
  return MESSAGES[_locale][key as string] ?? MESSAGES.ar[key as string] ?? fallback ?? (key as string);
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function setLocale(next: Locale) {
  if (next === _locale) return;
  _locale = next;
  await storage.set('locale', next);

  const isRTL = next === 'ar';
  // Apply direction. On web, set the document attribute (immediate).
  // On native, I18nManager.forceRTL requires a reload to fully apply layout,
  // but tab labels and dynamic text update right away via re-render.
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  }
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    try { I18nManager.forceRTL(isRTL); } catch {}
  }
  listeners.forEach((fn) => fn());
}

export async function loadStoredLocale() {
  try {
    const stored = (await storage.get('locale')) as Locale | null;
    if (stored && (stored === 'ar' || stored === 'en')) {
      _locale = stored;
      const isRTL = stored === 'ar';
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = stored;
      }
      try {
        I18nManager.allowRTL(isRTL);
        I18nManager.forceRTL(isRTL);
      } catch {}
      // CRITICAL: notify any already-subscribed components (useSyncExternalStore)
      // so the UI re-renders with the loaded locale, not the default 'ar'.
      listeners.forEach((fn) => fn());
    }
  } catch {}
}
