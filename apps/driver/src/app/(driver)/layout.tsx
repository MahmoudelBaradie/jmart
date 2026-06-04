'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Truck, ListChecks, User, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const { data: unreadData } = useQuery({
    queryKey: ['driver-unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const unread = unreadData?.data?.count ?? unreadData?.count ?? 0;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <p className="text-emerald-600 text-sm">جارٍ التحميل…</p>
      </div>
    );
  }

  const tabs = [
    { href: '/shipments', label: 'الفرص', icon: Truck },
    { href: '/bids',      label: 'عروضي', icon: ListChecks },
    { href: '/profile',   label: 'حسابي', icon: User },
  ];

  const isActive = (href: string) => path === href || (href !== '/' && path?.startsWith(href));

  return (
    <div className="min-h-screen bg-emerald-50/40 pb-20">
      {/* Top bar */}
      <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-30">
        <div className="px-4 h-14 flex items-center justify-between max-w-3xl mx-auto">
          <Link href="/shipments" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-900 font-black flex items-center justify-center shadow">
              🚚
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm">جمارت</p>
              <p className="text-emerald-200 text-[10px]">سائقي الشحن</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative p-2 hover:bg-white/10 rounded-xl">
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
            <button onClick={logout} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-bold">
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">{children}</main>

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-3xl mx-auto grid grid-cols-3 h-16">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = isActive(t.href);
            return (
              <Link
                key={t.href} href={t.href}
                className={`flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.7} />
                <span className="text-[11px]">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
