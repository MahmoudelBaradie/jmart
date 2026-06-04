'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReceiptText, CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react';

const statusInfo: Record<string, { text: string; color: string; icon: React.ElementType }> = {
  PENDING: { text: 'غير مدفوعة', color: 'bg-amber-50 text-amber-700', icon: Clock },
  PARTIALLY_PAID: { text: 'مدفوعة جزئياً', color: 'bg-blue-50 text-blue-700', icon: Clock },
  PAID: { text: 'مدفوعة', color: 'bg-brand-50 text-brand-700', icon: CheckCircle },
  CANCELLED: { text: 'ملغاة', color: 'bg-red-50 text-red-600', icon: XCircle },
  OVERDUE: { text: 'متأخرة', color: 'bg-red-50 text-red-700', icon: XCircle },
};

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  dueDate?: string;
  createdAt: string;
  order?: { orderNumber: string };
  farmer?: { businessName: string };
}

export default function InvoicesPage() {
  const { isBuyer } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');

  const { data, isLoading } = useQuery({
    queryKey: ['buyer-invoices', page, status],
    queryFn: () => financialApi.invoices({ page, limit: 20, status: status || undefined }).then((r) => r.data),
  });

  const recordPayment = useMutation({
    mutationFn: ({ id, amount, method }: { id: string; amount: number; method: string }) =>
      financialApi.recordPayment(id, { amount, method }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyer-invoices'] });
      setPayingId(null);
      setPayAmount('');
    },
  });

  const invoices: Invoice[] = data?.data || [];
  const meta = data?.meta;

  if (!isBuyer) {
    return (
      <div className="sm:p-6 py-20 text-center text-gray-400">
        <ReceiptText size={48} className="mx-auto mb-3 text-gray-300" />
        <p>هذه الصفحة للمشترين فقط</p>
      </div>
    );
  }

  return (
    <div className="sm:p-6 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">فواتيري</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { value: '', label: 'الكل' },
          { value: 'PENDING', label: 'غير مدفوعة' },
          { value: 'PARTIALLY_PAID', label: 'جزئية' },
          { value: 'PAID', label: 'مدفوعة' },
          { value: 'OVERDUE', label: 'متأخرة' },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => { setStatus(s.value); setPage(1); }}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <ReceiptText size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد فواتير</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const info = statusInfo[inv.status] || { text: inv.status, color: 'bg-gray-100 text-gray-600', icon: Clock };
            const Icon = info.icon;
            const remaining = inv.totalAmount - (inv.paidAmount || 0);
            const isPaying = payingId === inv.id;
            return (
              <div key={inv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{inv.invoiceNumber}</p>
                      {inv.order && (
                        <p className="text-xs text-gray-400 mt-0.5">طلب: {inv.order.orderNumber}</p>
                      )}
                      {inv.farmer && (
                        <p className="text-xs text-gray-400">{inv.farmer.businessName}</p>
                      )}
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${info.color}`}>
                      <Icon size={11} /> {info.text}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الإجمالي</span>
                      <span className="font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</span>
                    </div>
                    {inv.paidAmount > 0 && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-500">المدفوع</span>
                        <span className="font-medium text-brand-600">{formatCurrency(inv.paidAmount)}</span>
                      </div>
                    )}
                    {remaining > 0 && inv.status !== 'CANCELLED' && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-500">المتبقي</span>
                        <span className="font-bold text-red-600">{formatCurrency(remaining)}</span>
                      </div>
                    )}
                    {inv.dueDate && (
                      <p className="text-xs text-gray-400 mt-1">
                        تاريخ الاستحقاق: {formatDate(inv.dueDate)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment section */}
                {['PENDING', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status) && (
                  <div className="px-4 pb-4">
                    {!isPaying ? (
                      <button
                        onClick={() => { setPayingId(inv.id); setPayAmount(String(remaining)); }}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                      >
                        <CreditCard size={15} /> تسجيل دفعة
                      </button>
                    ) : (
                      <div className="space-y-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <p className="text-xs font-bold text-blue-700">تسجيل دفعة</p>
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="المبلغ"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                        >
                          <option value="BANK_TRANSFER">تحويل بنكي</option>
                          <option value="CASH">نقداً</option>
                          <option value="CARD">بطاقة</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setPayingId(null)}
                            className="py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => recordPayment.mutate({ id: inv.id, amount: parseFloat(payAmount), method: payMethod })}
                            disabled={recordPayment.isPending || !payAmount || parseFloat(payAmount) <= 0}
                            className="py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50"
                          >
                            {recordPayment.isPending ? 'جارٍ…' : 'تأكيد'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40">السابق</button>
          <span className="px-4 py-2 text-sm text-gray-500">{page} / {meta.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40">التالي</button>
        </div>
      )}
    </div>
  );
}
