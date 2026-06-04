'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getToken } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { dir, t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // a11y for mobile drawer when open:
  //   - Escape closes
  //   - Tab cycles within the sidebar (focus-trap) so keyboard users
  //     don't accidentally tab into the content behind the backdrop
  useEffect(() => {
    if (!drawerOpen) return;

    const getFocusable = (): HTMLElement[] => {
      const aside = document.querySelector('aside');
      if (!aside) return [];
      return Array.from(
        aside.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetWidth > 0 && el.offsetHeight > 0);
    };

    // Move focus into the drawer when it opens
    const focusables = getFocusable();
    if (focusables.length > 0) focusables[0].focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDrawerOpen(false); return; }
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar drawerOpen={drawerOpen} onCloseDrawer={() => setDrawerOpen(false)} />

      {/* Mobile drawer backdrop — click to close, button role for screen-reader users */}
      {drawerOpen && (
        <button
          type="button"
          aria-label={t.state.closeMenu}
          className="fixed inset-0 bg-black/40 z-20 lg:hidden cursor-default"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className={cn(
        'flex flex-col min-h-screen transition-[margin] duration-200',
        // On lg+, sidebar is always visible (60 width); offset main content
        dir === 'rtl' ? 'lg:mr-60' : 'lg:ml-60',
      )}>
        <Header onOpenDrawer={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
