'use client';
import { useQuery } from '@tanstack/react-query';
import { financialApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';

const statusInfo: Record<string, { text: string; color: string }> = {
  PENDING: { text: 'معلق', color: 'bg-amber-50 text-amber-700' },
  PROCESSING: { text: 'جارٍ المعالجة', color: 'bg-blue-50 text-blue-700' },
  COMPLETED: { text: 'مكتمل', color: 'bg-brand-50 text-brand-700' },
  FAILED: { text: 'فاشل', color: 'bg-red-50 text-red-600' },
};

export default function PaymentsPage() {
  const { data: summary } = useQuery({
    queryKey: ['farmer-summary'],
    queryFn: () => financialApi.summary().then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['farmer-payouts'],
    queryFn: () => financialApi.payouts({ page: 1, limit: 30 }).then((r) => r.data),
  });

  const payouts = data?.data || [];

  return (
    <div className="sm:p-6 space-y-5">
      <h1 className="text-lg font-bold text-gray-900">المدفوعات</h1>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center mb-2">
              <CheckCircle size={18} className="text-brand-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.payouts?.totalCompletedAmount)}</p>
            <p className="text-xs text-gray-400 mt-0.5">إجمالي المستلم</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-2">
              <Clock size={18} className="text-amber-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.payouts?.totalQueuedAmount)}</p>
            <p className="text-xs text-gray-400 mt-0.5">قيد الصرف ({summary.payouts?.queued ?? 0})</p>
          </div>
        </div>
      )}

      {/* Payouts list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <h2 className="text-sm font-bold text-gray-700 px-4 py-3 border-b border-gray-100">سجل المدفوعات</h2>
        {isLoading ? (
          <div className="py-10 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
        ) : payouts.length === 0 ? (
          <div className="py-10 text-center">
            <DollarSign size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">لا توجد مدفوعات بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payouts.map((p: {
              id: string;
              netAmount: number;
              status: string;
              createdAt: string;
              batch?: { batchNumber: string };
            }) => {
              const info = statusInfo[p.status] || { text: p.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(p.netAmount)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.createdAt)}</p>
                    {p.batch && <p className="text-xs text-gray-400">دفعة: {p.batch.batchNumber}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${info.color}`}>
                    {info.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
