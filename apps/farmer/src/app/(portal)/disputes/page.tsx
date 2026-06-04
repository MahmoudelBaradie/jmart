'use client';
import { useQuery } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import { AlertCircle, ChevronLeft, Info } from 'lucide-react';
import Link from 'next/link';

const statusInfo: Record<string, { text: string; color: string }> = {
  FILED: { text: 'مُقدَّم', color: 'bg-amber-50 text-amber-700' },
  UNDER_REVIEW: { text: 'قيد المراجعة', color: 'bg-blue-50 text-blue-700' },
  RESOLVED: { text: 'محلول', color: 'bg-brand-50 text-brand-700' },
  CLOSED: { text: 'مغلق', color: 'bg-gray-100 text-gray-600' },
};

// These MUST match the Prisma `DisputeCategory` enum exactly:
//   enum DisputeCategory { QUALITY, QUANTITY, LOGISTICS, FINANCIAL, CONTRACT }
const CATEGORIES = [
  { value: 'QUALITY',   label: 'مشكلة في الجودة' },
  { value: 'QUANTITY',  label: 'مشكلة في الكمية' },
  { value: 'LOGISTICS', label: 'مشكلة في التوصيل' },
  { value: 'FINANCIAL', label: 'مشكلة مالية' },
  { value: 'CONTRACT',  label: 'مخالفة عقد' },
];

export default function DisputesPage() {
  const { isFarmer } = useAuth();
  // Pass ?as= so dual-role demo accounts see disputes filed under the role
  // they are currently viewing (mirrors the same fix in /orders).
  const roleParam = isFarmer ? 'farmer' : 'buyer';
  const { data, isLoading } = useQuery({
    queryKey: ['farmer-disputes', roleParam],
    queryFn: () => disputesApi.list({ page: 1, limit: 20, as: roleParam }).then((r) => r.data),
  });

  const disputes = data?.data || [];

  return (
    <div className="sm:p-6 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">النزاعات</h1>

      {/* How-to banner — disputes are filed from order detail page */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">لرفع نزاع جديد</p>
          <p className="text-blue-700 text-xs leading-relaxed">
            افتح الطلب الذي تواجه فيه المشكلة من{' '}
            <Link href="/orders" className="font-bold underline hover:text-blue-900">صفحة الطلبات</Link>
            {' '}ثم اضغط زر «رفع نزاع» في أسفل صفحة تفاصيل الطلب. لا يمكن رفع نزاع دون ربطه بطلب.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <AlertCircle size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد نزاعات — هذا جيد! 👍</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d: {
            id: string; disputeNumber: string; category?: string; disputeCategory?: string;
            description: string; status: string; createdAt: string;
          }) => {
            const info = statusInfo[d.status] || { text: d.status, color: 'bg-gray-100 text-gray-600' };
            const catKey = d.category ?? d.disputeCategory ?? '';
            return (
              <Link
                key={d.id}
                href={`/disputes/${d.id}`}
                className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{d.disputeNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {CATEGORIES.find((c) => c.value === catKey)?.label || catKey || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${info.color}`}>{info.text}</span>
                    <ChevronLeft size={14} className="text-gray-300" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{d.description}</p>
                <p className="text-xs text-gray-400 mt-2">{formatDate(d.createdAt)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
