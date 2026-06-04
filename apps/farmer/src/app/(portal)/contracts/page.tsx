'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { FileText, PenLine, CheckCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

const statusInfo: Record<string, { text: string; color: string }> = {
  DRAFT: { text: 'مسودة', color: 'bg-gray-100 text-gray-600' },
  PENDING_SIGNATURES: { text: 'ينتظر التوقيع', color: 'bg-amber-50 text-amber-700' },
  ACTIVE: { text: 'ساري', color: 'bg-brand-50 text-brand-700' },
  COMPLETED: { text: 'مكتمل', color: 'bg-blue-50 text-blue-700' },
  TERMINATED: { text: 'منتهي', color: 'bg-red-50 text-red-600' },
  EXPIRED: { text: 'منتهي الصلاحية', color: 'bg-gray-100 text-gray-500' },
};

export default function ContractsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['farmer-contracts'],
    queryFn: () => contractsApi.list({ page: 1, limit: 30 }).then((r) => r.data),
  });

  const sign = useMutation({
    mutationFn: (id: string) => contractsApi.sign(id, 'farmer'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmer-contracts'] }),
  });

  const contracts = data?.data || [];

  return (
    <div className="sm:p-6 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">عقودي</h1>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <FileText size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد عقود بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c: {
            id: string;
            contractNumber: string;
            title: string;
            status: string;
            buyer?: { businessName: string };
            totalValue?: number;
            startDate?: string;
            endDate?: string;
          }) => {
            const info = statusInfo[c.status] || { text: c.status, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-md transition-all">
                <Link href={`/contracts/${c.id}`} className="block p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{c.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.contractNumber}</p>
                      {c.buyer && <p className="text-xs text-gray-500 mt-1">المشتري: {c.buyer.businessName}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${info.color}`}>
                        {info.text}
                      </span>
                      <ChevronLeft size={14} className="text-gray-300" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-400">
                      {c.startDate && <span>{formatDate(c.startDate)} — {c.endDate ? formatDate(c.endDate) : '—'}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.totalValue && <span className="text-sm font-bold text-brand-700">{formatCurrency(c.totalValue)}</span>}
                      {c.status === 'ACTIVE' && (
                        <span className="flex items-center gap-1 text-xs text-brand-600 font-medium">
                          <CheckCircle size={12} />
                          موقّع
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Sign button outside the Link to avoid nested <a> */}
                {c.status === 'PENDING_SIGNATURES' && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => sign.mutate(c.id)}
                      disabled={sign.isPending}
                      className="w-full flex items-center justify-center gap-1.5 bg-brand-600 text-white px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors disabled:opacity-60"
                    >
                      <PenLine size={14} />
                      توقيع العقد
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
