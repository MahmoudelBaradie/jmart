'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else router.replace('/shipments');
  }, [loading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white mb-3">
          <span className="text-2xl">🚚</span>
        </div>
        <p className="text-emerald-700 font-bold">جمارت — سائقو الشحن</p>
        <p className="text-emerald-500 text-sm mt-1">جارٍ التحميل…</p>
      </div>
    </div>
  );
}
