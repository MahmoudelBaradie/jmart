'use client';
import { Bell, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import GlobalSearch from '@/components/shared/GlobalSearch';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import Link from 'next/link';

interface HeaderProps {
  onOpenDrawer?: () => void;
}

export default function Header({ onOpenDrawer }: HeaderProps) {
  const pathname = usePathname();
  const { t, lang, toggle } = useLanguage();

  const { data: unreadData } = useQuery({
    queryKey: ['admin-unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
  const unreadCount: number = unreadData?.count ?? 0;

  const pageTitles: Record<string, string> = {
    '/': t.nav.dashboard,
    '/orders': t.nav.orders,
    '/farmers': t.nav.farmers,
    '/buyers': t.nav.buyers,
    '/drivers': t.nav.drivers,
    '/logistics': t.nav.logistics,
    '/quality': t.nav.quality,
    '/financial': t.nav.financial,
    '/disputes': t.nav.disputes,
    '/workflow': t.nav.workflow,
    '/inventory': t.nav.inventory,
    '/warehouses': t.nav.warehouses,
    '/geo-zones': t.nav.geoZones,
    '/users': t.nav.users,
    '/audit': t.nav.audit,
    '/notifications': t.nav.notifications,
    '/contracts': t.nav.contracts,
    '/products': t.nav.products,
    '/products/prices': t.nav.prices,
    '/reports': t.nav.reports,
    '/settings': t.nav.settings,
  };

  const title =
    pageTitles[pathname] ??
    pageTitles[Object.keys(pageTitles).find((k) => k !== '/' && pathname.startsWith(k)) ?? ''] ??
    'Jmart';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-20 gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Mobile hamburger — 44×44 touch target */}
        <button
          onClick={onOpenDrawer}
          className="lg:hidden w-11 h-11 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          aria-label={t.state.menu}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Global Search — hidden on smallest screens; replace with a search trigger if needed later */}
        <div className="hidden sm:block">
          <GlobalSearch />
        </div>

        {/* Language Toggle — icon-only on mobile */}
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300"
          title={lang === 'en' ? 'التحويل للعربية' : 'Switch to English'}
          aria-label={lang === 'en' ? 'التحويل للعربية' : 'Switch to English'}
        >
          <span className="text-base leading-none" aria-hidden="true">{lang === 'en' ? '🇸🇦' : '🇺🇸'}</span>
          <span className="hidden sm:inline">{lang === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* Notifications Bell */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300"
          aria-label={`${t.nav.notifications}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        >
          <Bell size={18} aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
