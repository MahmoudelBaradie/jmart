'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingCart, Users, Truck, Package,
  Star, DollarSign, AlertTriangle, CheckSquare, MapPin,
  Map, ClipboardList, Bell, FileText, UserCheck, LogOut,
  ChevronRight, TrendingUp, Tag, Code2, ShoppingBag, BarChart3, Settings, X, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';

interface SidebarProps {
  drawerOpen?: boolean;
  onCloseDrawer?: () => void;
}

export default function Sidebar({ drawerOpen = false, onCloseDrawer }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, dir } = useLanguage();

  const { data: unreadData } = useQuery({
    queryKey: ['admin-unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
  const unreadCount: number = unreadData?.count ?? 0;

  const navItems = [
    { label: t.nav.dashboard, href: '/', icon: LayoutDashboard },
    { label: t.nav.orders, href: '/orders', icon: ShoppingCart },
    { divider: true, label: t.nav.usersSection },
    { label: t.nav.farmers, href: '/farmers', icon: UserCheck },
    { label: t.nav.buyers, href: '/buyers', icon: Users },
    { label: t.nav.drivers, href: '/drivers', icon: Truck },
    { divider: true, label: t.nav.operations },
    { label: t.nav.logistics, href: '/logistics', icon: TrendingUp },
    { label: t.nav.quality, href: '/quality', icon: Star },
    { label: t.nav.inventory, href: '/inventory', icon: Package },
    { label: t.nav.products, href: '/products', icon: ShoppingBag },
    { label: t.nav.prices, href: '/products/prices', icon: DollarSign },
    { label: t.nav.categories, href: '/categories', icon: Tag },
    { label: t.nav.warehouses, href: '/warehouses', icon: MapPin },
    { label: t.nav.geoZones, href: '/geo-zones', icon: Map },
    { divider: true, label: t.nav.financeLegal },
    { label: t.nav.financial, href: '/financial', icon: DollarSign },
    { label: t.nav.disputes, href: '/disputes', icon: AlertTriangle },
    { label: t.nav.contracts, href: '/contracts', icon: FileText },
    { label: t.nav.banners, href: '/banners', icon: Sparkles },
    { divider: true, label: t.nav.internal },
    { label: t.nav.autoclaude, href: '/autoclaude', icon: Code2 },
    { label: t.nav.reports, href: '/reports', icon: BarChart3 },
    { label: t.nav.workflow, href: '/workflow', icon: CheckSquare },
    { label: t.nav.users, href: '/users', icon: ClipboardList },
    { label: t.nav.notifications, href: '/notifications', icon: Bell },
    { label: t.nav.audit, href: '/audit', icon: FileText },
    { label: t.nav.settings, href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        // We intentionally avoid `transition-transform` here. Tailwind's
        // translate-* utilities animate via a CSS variable, and Chrome does
        // NOT redraw `transform: translate(var(--tw-translate-x), ...)` when
        // only the variable changes — the drawer would visually stay closed
        // even after the prop flipped open. Snapping on/off is the safe path.
        'fixed inset-y-0 w-60 bg-slate-900 flex flex-col z-30',
        dir === 'rtl' ? 'right-0' : 'left-0',
        // We must ALWAYS apply an explicit translate-x utility (open vs closed).
        // If we instead removed the closed class when open, the CSS variable
        // `--tw-translate-x` would retain its previous value and the sidebar
        // would visually stay off-screen even though the prop says it's open.
        drawerOpen
          ? 'translate-x-0'
          : (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'),
        // At lg+ the sidebar is always docked, regardless of drawer state.
        'lg:translate-x-0',
      )}
      aria-label={t.state.menu}
    >
      {/* Logo + close button on mobile */}
      <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">J</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">Jmart</p>
            <p className="text-slate-400 text-xs truncate">Operations Panel</p>
          </div>
        </div>
        {/* Mobile close button — 44×44 touch target (WCAG SC 2.5.5 / Apple HIG) */}
        <button
          onClick={onCloseDrawer}
          className="lg:hidden w-11 h-11 -mr-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          aria-label={t.state.closeMenu}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item, i) => {
          if ('divider' in item) {
            return (
              <div key={i} className="pt-4 pb-1 px-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
            );
          }

          const Icon = item.icon!;
          // A nav item is active when:
          //   1. pathname matches exactly, OR
          //   2. pathname is a child path (with `/` separator) of this item,
          //      EXCEPT when a more-specific nav item also exists. We check
          //      this by ensuring no OTHER navItem.href is a longer prefix
          //      of the pathname. Prevents `/products` and `/products/prices`
          //      from both lighting up when viewing `/products/prices`.
          const href = item.href!;
          const isExact = pathname === href;
          let isNested = false;
          if (!isExact && href !== '/' && (pathname === href || pathname.startsWith(href + '/'))) {
            const moreSpecific = navItems.some((other) =>
              'href' in other && other.href && other.href !== href &&
              other.href.startsWith(href + '/') &&
              (pathname === other.href || pathname.startsWith(other.href + '/'))
            );
            isNested = !moreSpecific;
          }
          const isActive = isExact || isNested;

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group focus:outline-none focus:ring-2 focus:ring-brand-400',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={16} className={cn(isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.href === '/notifications' && unreadCount > 0 && (
                <span
                  className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  aria-label={`${unreadCount} unread`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {isActive && (
                <ChevronRight
                  size={12}
                  className={cn('text-white/60', dir === 'rtl' && 'rotate-180')}
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-slate-700 p-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {(user.internalUser?.fullName || user.email)?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.internalUser?.fullName || user.email}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user.internalUser?.role || user.userType}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <LogOut size={15} aria-hidden="true" />
          {t.common.signOut}
        </button>
      </div>
    </aside>
  );
}
