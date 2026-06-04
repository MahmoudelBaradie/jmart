'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn, getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Package, ShoppingBag, FileText,
  DollarSign, AlertCircle, Bell, LogOut,
  Store, ReceiptText, User, Sprout, Truck, MapPin, Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isFarmer, isBuyer, hasBothRoles, activeRole, switchRole, displayName, logout } = useAuth();

  const { data: unreadData } = useQuery({
    queryKey: ['portal-unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
  const unreadCount: number = unreadData?.count ?? 0;

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  const navItems = [
    { label: 'الرئيسية', href: '/', icon: LayoutDashboard, roles: ['FARMER', 'BUYER'] },
    { label: 'مزارعي', href: '/farms/my', icon: Sprout, roles: ['FARMER'] },
    { label: 'عروضي', href: '/listings', icon: Package, roles: ['FARMER'] },
    { label: 'الطلبات الواردة', href: '/orders', icon: ShoppingBag, roles: ['FARMER'] },
    { label: 'مدفوعاتي', href: '/payments', icon: DollarSign, roles: ['FARMER'] },
    { label: 'السوق', href: '/marketplace', icon: Store, roles: ['BUYER'] },
    { label: 'المزارع', href: '/farms', icon: Sprout, roles: ['BUYER'] },
    { label: 'عناويني', href: '/addresses', icon: MapPin, roles: ['BUYER'] },
    { label: 'طلباتي', href: '/orders', icon: ShoppingBag, roles: ['BUYER'] },
    { label: 'فواتيري', href: '/invoices', icon: ReceiptText, roles: ['BUYER'] },
    { label: 'المجتمع', href: '/community', icon: Users, roles: ['FARMER', 'BUYER'] },
    { label: 'العقود', href: '/contracts', icon: FileText, roles: ['FARMER', 'BUYER'] },
    { label: 'النزاعات', href: '/disputes', icon: AlertCircle, roles: ['FARMER', 'BUYER'] },
    { label: 'شحناتي', href: '/shipments', icon: Truck, roles: ['DRIVER'] },
  ].filter((item) => item.roles.some((r) => (user as any)?.roles?.includes(r) || r === activeRole));

  // Brand colour is the same regardless of role — Jmart's identity is
  // emerald across the entire portal. The portal label still differs so
  // the user knows which "mode" they're in.
  const headerBg = 'bg-brand-700';
  const activeBg = 'bg-brand-50 text-brand-700';
  const activeTabColor = 'text-brand-600';
  const portalLabel = isFarmer ? 'بوابة المزارعين' : 'بوابة المشترين';

  const mobileItems = navItems.slice(0, 5);

  return (
    <>
      {/* Top header */}
      <header className={`${headerBg} text-white sticky top-0 z-40 shadow-md`}>
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
              J
            </div>
            <div className="leading-tight hidden xs:block">
              <p className="font-bold text-sm">جمارت</p>
              <p className="text-white/60 text-xs">{portalLabel}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Role switcher — only when user has both roles */}
            {hasBothRoles && (
              <div className="flex items-center bg-white/15 rounded-xl p-0.5 text-xs font-bold">
                <button
                  onClick={() => switchRole('FARMER')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all',
                    activeRole === 'FARMER'
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-white/80 hover:text-white',
                  )}
                >
                  🌾 مزارع
                </button>
                <button
                  onClick={() => switchRole('BUYER')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all',
                    activeRole === 'BUYER'
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-white/80 hover:text-white',
                  )}
                >
                  🛒 مشتري
                </button>
              </div>
            )}

            <Link href="/notifications" className="p-2 rounded-lg hover:bg-white/10 transition-colors relative">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            <Link href="/profile" className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {getInitials(displayName || user?.email)}
              </div>
              <span className="text-sm hidden md:block truncate max-w-24">{displayName || 'حسابي'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 sm:hidden safe-area-inset-bottom">
        <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${mobileItems.length}, 1fr)` }}>
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 font-medium transition-colors',
                  active ? activeTabColor : 'text-gray-400',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden sm:flex fixed top-14 right-0 bottom-0 w-52 bg-white border-l border-gray-200 flex-col z-30 py-4 px-3 space-y-1 overflow-y-auto">

        {/* Role badge / switcher */}
        {hasBothRoles ? (
          <div className="mx-1 mb-2 flex rounded-xl overflow-hidden border border-gray-200 text-xs font-bold">
            <button
              onClick={() => switchRole('FARMER')}
              className={cn(
                'flex-1 py-2 transition-colors flex items-center justify-center gap-1',
                activeRole === 'FARMER' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50',
              )}
            >
              🌾 مزارع
            </button>
            <button
              onClick={() => switchRole('BUYER')}
              className={cn(
                'flex-1 py-2 transition-colors flex items-center justify-center gap-1',
                activeRole === 'BUYER' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50',
              )}
            >
              🛒 مشتري
            </button>
          </div>
        ) : (
          <div className={cn(
            'mx-1 mb-2 px-3 py-2 rounded-xl text-xs font-bold text-center',
            'bg-brand-50 text-brand-700',
          )}>
            {isFarmer ? '🌾 مزارع' : '🛒 مشتري'}
          </div>
        )}

        {/* Nav links */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active ? activeBg : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
              {item.label}
            </Link>
          );
        })}

        <div className="flex-1" />

        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50',
            isActive('/profile') ? activeBg : '',
          )}
        >
          <User size={18} />
          الملف الشخصي
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </nav>
    </>
  );
}
