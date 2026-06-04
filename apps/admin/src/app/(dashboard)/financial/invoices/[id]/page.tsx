'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronRight, FileText, Banknote, CheckCircle2, AlertCircle,
  Loader2, Package, Calendar, User, DollarSign, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const INVOICE_TYPE_AR: Record<string, string> = {
  BUYER_INVOICE: 'فاتورة مشتري',
  FARMER_PAYOUT: 'صرفية مزارع',
  PLATFORM_FEE: 'رسوم المنصة',
};

const PAYMENT_METHODS_AR: Record<string, string> = {
  BANK_TRANSFER: 'تحويل بنكي',
  CASH: 'نقداً',
  CREDIT_CARD: 'بطاقة ائتمان',
  CHEQUE: 'شيك',
};

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'تحويل بنكي' },
  { value: 'CASH', label: 'نقداً' },
  { value: 'CREDIT_CARD', label: 'بطاقة ائتمان' },
  { value: 'CHEQUE', label: 'شيك' },
];

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', params.id],
    queryFn: () => financialApi.invoice(params.id).then((r) => r.data),
  });

  const issueMutation = useMutation({
    mutationFn: () => financialApi.issueInvoice(params.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice', params.id] }),
  });

  const payMutation = useMutation({
    mutationFn: () =>
      financialApi.recordPayment(params.id, {
        amount: parseFloat(payAmount),
        paymentMethod: payMethod,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', params.id] });
      setShowPayForm(false);
      setPayAmount('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600">لم يُعثر على الفاتورة</p>
        <Link href="/financial" className="text-brand-600 text-sm hover:underline">العودة</Link>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID';
  const canIssue = invoice.status === 'DRAFT';
  const canPay = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status);
  const payments = invoice.payments || [];
  const totalPaid = payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
  const remaining = invoice.totalAmount - totalPaid;

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/financial" className="hover:text-brand-600 transition-colors">المالية</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-bold">{invoice.invoiceNumber}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Invoice Details ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Invoice header card */}
          <Card className="p-5">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-black text-gray-900">{invoice.invoiceNumber}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={invoice.status} />
                  <span className="text-xs text-gray-400">
                    {INVOICE_TYPE_AR[invoice.invoiceType] || invoice.invoiceType}
                  </span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-2xl font-black text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                {!isPaid && (
                  <p className="text-xs text-amber-600 font-semibold mt-0.5">
                    متبقي: {formatCurrency(remaining)}
                  </p>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {invoice.order && (
                <InfoRow icon={Package} label="الطلب المرتبط" value={invoice.order.orderNumber} />
              )}
              {invoice.buyer && (
                <InfoRow icon={User} label="المشتري" value={invoice.buyer.businessName} />
              )}
              {invoice.farmer && (
                <InfoRow icon={User} label="المزارع" value={invoice.farmer.businessName} />
              )}
              <InfoRow icon={DollarSign} label="المبلغ الأساسي" value={formatCurrency(invoice.subtotalAmount)} />
              {invoice.taxAmount > 0 && (
                <InfoRow icon={DollarSign} label="الضريبة" value={formatCurrency(invoice.taxAmount)} />
              )}
              {invoice.discountAmount > 0 && (
                <InfoRow icon={DollarSign} label="الخصم" value={formatCurrency(invoice.discountAmount)} />
              )}
              <InfoRow icon={Calendar} label="تاريخ الإصدار" value={invoice.issuedAt ? formatDate(invoice.issuedAt) : undefined} />
              <InfoRow icon={Calendar} label="تاريخ الاستحقاق" value={invoice.dueDate ? formatDate(invoice.dueDate) : undefined} />
              {invoice.paidAt && (
                <InfoRow icon={CheckCircle2} label="تاريخ السداد" value={formatDate(invoice.paidAt)} />
              )}
              {invoice.notes && (
                <InfoRow icon={FileText} label="ملاحظات" value={invoice.notes} />
              )}
            </div>
          </Card>

          {/* Payment History */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Banknote size={14} className="text-brand-500" />
              سجل الدفعات ({payments.length})
            </h2>

            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
                <Clock size={28} />
                <p className="text-sm">لم يُسجَّل أي دفعات بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((pmt: {
                  id: string;
                  amount: number;
                  paymentMethod: string;
                  paymentDate?: string;
                  referenceNumber?: string;
                }) => (
                  <div key={pmt.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-emerald-800">{formatCurrency(pmt.amount)}</p>
                      <p className="text-xs text-emerald-600">
                        {PAYMENT_METHODS_AR[pmt.paymentMethod] || pmt.paymentMethod}
                        {pmt.paymentDate && ` · ${formatDate(pmt.paymentDate)}`}
                      </p>
                      {pmt.referenceNumber && (
                        <p className="text-xs text-gray-400">مرجع: {pmt.referenceNumber}</p>
                      )}
                    </div>
                    <p className="text-xs text-emerald-600 font-semibold flex-shrink-0">مُسجَّل</p>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500">إجمالي المُسدَّد</span>
                  <span className="text-sm font-bold text-emerald-700">{formatCurrency(totalPaid)}</span>
                </div>
                {!isPaid && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">المتبقي</span>
                    <span className="text-sm font-bold text-amber-700">{formatCurrency(remaining)}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: Actions ── */}
        <div className="space-y-5">
          {/* Issue button */}
          {canIssue && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">إصدار الفاتورة</h2>
              <p className="text-xs text-gray-500 mb-4">إصدار الفاتورة سيجعلها نشطة وقابلة للدفع</p>
              <button
                onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                {issueMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                إصدار الفاتورة
              </button>
            </Card>
          )}

          {/* Record Payment */}
          {canPay && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign size={14} className="text-brand-500" />
                تسجيل دفعة
              </h2>

              {!showPayForm ? (
                <button
                  onClick={() => setShowPayForm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  <Banknote size={14} />
                  تسجيل دفعة جديدة
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">المبلغ (ريال)</label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={formatCurrency(remaining)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">طريقة الدفع</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none bg-white"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => payMutation.mutate()}
                      disabled={!payAmount || payMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                    >
                      {payMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      تأكيد
                    </button>
                    <button
                      onClick={() => { setShowPayForm(false); setPayAmount(''); }}
                      className="px-3 py-2.5 text-gray-500 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Paid state */}
          {isPaid && (
            <Card className="p-5">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-700">مدفوعة بالكامل</p>
                  {invoice.paidAt && (
                    <p className="text-xs text-emerald-600 mt-0.5">{formatDate(invoice.paidAt)}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Quick links */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">روابط سريعة</h2>
            <div className="space-y-2">
              <Link
                href="/financial"
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                <FileText size={14} className="text-gray-400" />
                جميع الفواتير
              </Link>
              {invoice.order && (
                <Link
                  href={`/orders/${invoice.orderId}`}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                >
                  <Package size={14} className="text-gray-400" />
                  عرض الطلب
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
