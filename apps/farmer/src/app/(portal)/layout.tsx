'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useServiceWorker } from '@/hooks/useServiceWorker';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useServiceWorker();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Desktop: margin for sidebar, mobile: padding for bottom tab bar */}
      <main className="sm:mr-52 sm:mt-0 pb-20 sm:pb-6 pt-4 px-4 max-w-3xl sm:max-w-none mx-auto">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
