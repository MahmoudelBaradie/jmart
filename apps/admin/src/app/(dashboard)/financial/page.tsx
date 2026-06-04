'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  DollarSign, FileText, ArrowDownCircle, RefreshCw, CheckCircle2,
  Loader2, Filter, ChevronRight, AlertCircle, Banknote, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'invoices', label: 'الفواتير', icon: FileText },
  { id: 'payouts', label: 'المدفوعات للمزارعين', icon: ArrowDownCircle },
  { id: 'refunds', label: 'المستردات', icon: RefreshCw },
] as const;
type Tab = (typeof TABS)[number]['id'];

const INVOICE_STATUSES = [
  { value: '', label: 'جميع الحالات' },
  { value: 'DRAFT', label: 'مسودة' },
  { value: 'ISSUED', label: 'مُصدرة' },
  { value: 'PAID', label: 'مدفوعة' },
  { value: 'PARTIALLY_PAID', label: 'مدفوعة جزئياً' },
  { value: 'OVERDUE', label: 'متأخرة' },
];

const PAYOUT_STATUSES = [
  { value: '', label: 'جميع الحالات' },
  { value: 'QUEUED', label: 'في الانتظار' },
  { value: 'APPROVED', label: 'معتمدة' },
  { value: 'PROCESSING', label: 'قيد التنفيذ' },
  { value: 'PAID', label: 'مُحوَّلة' },
  { value: 'FAILED', label: 'فشلت' },
];

const REFUND_STATUSES = [
  { value: '', label: 'جميع الحالات' },
  { value: 'PENDING_APPROVAL', label: 'بانتظار الموافقة' },
  { value: 'APPROVED', label: 'معتمد' },
  { value: 'PROCESSED', label: 'منفَّذ' },
  { value: 'REJECTED', label: 'مرفوض' },
];

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'تحويل بنكي' },
  { value: 'CASH', label: 'نقداً' },
  { value: 'CREDIT_CARD', label: 'بطاقة ائتمان' },
  { value: 'CHEQUE', label: 'شيك' },
];

export default function FinancialPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('invoices');
  const [page, setPage] = useState(1);
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [payoutStatus, setPayoutStatus] = useState('');
  const [refundStatus, setRefundStatus] = useState('');
  const [paymentModal, setPaymentModal] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const limit = 20;

  const { data: summary } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: () => financialApi.summary().then((r) => r.data),
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', page, invoiceStatus],
    enabled: tab === 'invoices',
    queryFn: () =>
      financialApi.invoices({ page, limit, status: invoiceStatus || undefined }).then((r) => r.data),
  });

  const { data: payoutsData, isLoading: loadingPayouts } = useQuery({
    queryKey: ['payouts', page, payoutStatus],
    enabled: tab === 'payouts',
    queryFn: () =>
      financialApi.payouts({ page, limit, status: payoutStatus || undefined }).then((r) => r.data),
  });

  const { data: refundsData, isLoading: loadingRefunds } = useQuery({
    queryKey: ['refunds', page, refundStatus],
    enabled: tab === 'refunds',
    queryFn: () =>
      financialApi.refunds({ page, limit, status: refundStatus || undefined }).then((r) => r.data),
  });

  const issueInvoice = useMutation({
    mutationFn: (id: string) => financialApi.issueInvoice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const recordPayment = useMutation({
    mutationFn: ({ invoiceId }: { invoiceId: string }) =>
      financialApi.recordPayment(invoiceId, {
        amount: parseFloat(payAmount),
        paymentMethod: payMethod,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['financial-summary'] });
      setPaymentModal(null);
      setPayAmount('');
    },
  });

  const approvePayouts = useMutation({
    mutationFn: () => financialApi.approvePayouts(selectedPayouts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] });
      qc.invalidateQueries({ queryKey: ['financial-summary'] });
      setSelectedPayouts([]);
    },
  });

  const approveRefund = useMutation({
    mutationFn: (id: string) => financialApi.approveRefund(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['refunds'] });
      qc.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  const s = summary;

  const payoutsArr = payoutsData?.data || [];
  const queuedPayouts = payoutsArr.filter((p: { status: string }) => p.status === 'QUEUED');
  const togglePayout = (id: string) =>
    setSelectedPayouts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const toggleAllPayouts = () => {
    const ids = queuedPayouts.map((p: { id: string }) => p.id);
    setSelectedPayouts(selectedPayouts.length === ids.length ? [] : ids);
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">الفواتير والمدفوعات</h1>
        <p className="text-sm text-gray-500 mt-0.5">إدارة الفواتير، المدفوعات للمزارعين، والمستردات</p>
      </div>

      {/* Stats */}
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'إجمالي الفواتير المُصدرة',
              value: formatCurrency(s.invoices?.totalIssued ?? 0),
              sub: `${s.invoices?.total ?? 0} فاتورة`,
              icon: FileText,
              color: 'bg-blue-50 text-blue-600',
            },
            {
              label: 'مدفوعات هذا الشهر',
              value: formatCurrency(s.invoices?.paidThisMonth ?? 0),
              sub: 'مُحصَّلة',
              icon: Banknote,
              color: 'bg-emerald-50 text-emerald-600',
            },
            {
              label: 'مدفوعات مزارعين معلقة',
              value: formatCurrency(s.payouts?.totalQueuedAmount ?? 0),
              sub: `${s.payouts?.queued ?? 0} في الانتظار`,
              icon: Clock,
              color: 'bg-amber-50 text-amber-600',
            },
            {
              label: 'مستردات معلقة',
              value: formatCurrency(s.refunds?.totalPendingAmount ?? 0),
              sub: `${s.refunds?.pending ?? 0} طلب`,
              icon: RefreshCw,
              color: 'bg-red-50 text-red-600',
            },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <Card key={label} className="p-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
                <Icon size={18} />
              </div>
              <p className="text-xl font-black text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Invoices Tab ── */}
      {tab === 'invoices' && (
        <Card noPadding>
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative">
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={invoiceStatus}
                onChange={(e) => { setInvoiceStatus(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-xl py-2 pr-8 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none bg-white"
              >
                {INVOICE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingInvoices ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="animate-spin text-brand-500" />
            </div>
          ) : (invoicesData?.data || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <FileText size={36} />
              <p className="text-sm">لا توجد فواتير</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-right">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">رقم الفاتورة</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">الطلب</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">النوع</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">المبلغ</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">تاريخ الاستحقاق</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoicesData?.data?.map((inv: {
                      id: string;
                      invoiceNumber: string;
                      order?: { orderNumber: string };
                      invoiceType: string;
                      status: string;
                      totalAmount: number;
                      dueDate?: string;
                    }) => (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/financial/invoices/${inv.id}`} className="font-bold text-brand-700 hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{inv.order?.orderNumber || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {inv.invoiceType === 'BUYER_INVOICE' ? 'فاتورة مشتري' :
                           inv.invoiceType === 'FARMER_PAYOUT' ? 'صرفية مزارع' : inv.invoiceType}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(inv.dueDate) || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {inv.status === 'DRAFT' && (
                              <button
                                onClick={() => issueInvoice.mutate(inv.id)}
                                disabled={issueInvoice.isPending}
                                className="text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
                              >
                                إصدار
                              </button>
                            )}
                            {['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status) && (
                              <button
                                onClick={() => setPaymentModal(inv.id)}
                                className="text-xs px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                              >
                                تسجيل دفعة
                              </button>
                            )}
                            <Link
                              href={`/financial/invoices/${inv.id}`}
                              className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-0.5"
                            >
                              تفاصيل <ChevronRight size={11} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {invoicesData?.meta && (
                <div className="p-4 border-t border-gray-100">
                  <Pagination
                    page={invoicesData.meta.page}
                    totalPages={invoicesData.meta.totalPages}
                    total={invoicesData.meta.total}
                    limit={limit}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ── Payouts Tab ── */}
      {tab === 'payouts' && (
        <div className="space-y-4">
          {/* Bulk approve bar */}
          {selectedPayouts.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200">
              <CheckCircle2 size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-800 flex-1">
                تم اختيار {selectedPayouts.length} مدفوعات
              </span>
              <button
                onClick={() => approvePayouts.mutate()}
                disabled={approvePayouts.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl disabled:opacity-50"
              >
                {approvePayouts.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                اعتماد المحدد
              </button>
              <button onClick={() => setSelectedPayouts([])} className="text-blue-600 text-sm hover:text-blue-800">
                إلغاء
              </button>
            </div>
          )}

          <Card noPadding>
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div className="relative">
                <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={payoutStatus}
                  onChange={(e) => { setPayoutStatus(e.target.value); setPage(1); }}
                  className="border border-gray-200 rounded-xl py-2 pr-8 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none bg-white"
                >
                  {PAYOUT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingPayouts ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 size={28} className="animate-spin text-brand-500" />
              </div>
            ) : payoutsArr.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                <ArrowDownCircle size={36} />
                <p className="text-sm">لا توجد مدفوعات</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-right">
                        <th className="px-4 py-3">
                          {queuedPayouts.length > 0 && (
                            <input
                              type="checkbox"
                              checked={selectedPayouts.length === queuedPayouts.length && queuedPayouts.length > 0}
                              onChange={toggleAllPayouts}
                              className="rounded border-gray-300"
                            />
                          )}
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500">المستفيد</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500">النوع</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500">المبلغ الصافي</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500">الدُفعة</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payoutsArr.map((p: {
                        id: string;
                        farmer?: { businessName: string };
                        driver?: { fullName: string };
                        buyer?: { businessName: string };
                        recipientType: string;
                        status: string;
                        netAmount: number;
                        batch?: { batchNumber: string };
                      }) => {
                        const isQueued = p.status === 'QUEUED';
                        const isSelected = selectedPayouts.includes(p.id);
                        return (
                          <tr key={p.id} className={cn('hover:bg-gray-50 transition-colors', isSelected && 'bg-blue-50')}>
                            <td className="px-4 py-3">
                              {isQueued && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePayout(p.id)}
                                  className="rounded border-gray-300"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {p.farmer?.businessName || p.driver?.fullName || p.buyer?.businessName || '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {p.recipientType === 'FARMER' ? 'مزارع' :
                               p.recipientType === 'DRIVER' ? 'سائق' :
                               p.recipientType === 'BUYER' ? 'مشتري' : p.recipientType}
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                            <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(p.netAmount)}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{p.batch?.batchNumber || '—'}</td>
                            <td className="px-4 py-3">
                              {isQueued && !isSelected && (
                                <button
                                  onClick={() => approvePayouts.mutate()}
                                  disabled={approvePayouts.isPending}
                                  className="text-xs px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50"
                                >
                                  اعتماد
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {payoutsData?.meta && (
                  <div className="p-4 border-t border-gray-100">
                    <Pagination
                      page={payoutsData.meta.page}
                      totalPages={payoutsData.meta.totalPages}
                      total={payoutsData.meta.total}
                      limit={limit}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* ── Refunds Tab ── */}
      {tab === 'refunds' && (
        <Card noPadding>
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative">
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={refundStatus}
                onChange={(e) => { setRefundStatus(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-xl py-2 pr-8 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none bg-white"
              >
                {REFUND_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingRefunds ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="animate-spin text-brand-500" />
            </div>
          ) : (refundsData?.data || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <RefreshCw size={36} />
              <p className="text-sm">لا توجد مستردات</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-right">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">رقم المسترد</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">النوع</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">المبلغ</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">السبب</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {refundsData?.data?.map((r: {
                      id: string;
                      refundNumber: string;
                      refundType: string;
                      status: string;
                      refundAmount: number;
                      refundReason: string;
                    }) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-brand-700">{r.refundNumber}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {r.refundType === 'FULL' ? 'كامل' :
                           r.refundType === 'PARTIAL' ? 'جزئي' : r.refundType}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(r.refundAmount)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{r.refundReason}</td>
                        <td className="px-4 py-3">
                          {r.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => approveRefund.mutate(r.id)}
                              disabled={approveRefund.isPending}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50"
                            >
                              {approveRefund.isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              موافقة
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {refundsData?.meta && (
                <div className="p-4 border-t border-gray-100">
                  <Pagination
                    page={refundsData.meta.page}
                    totalPages={refundsData.meta.totalPages}
                    total={refundsData.meta.total}
                    limit={limit}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">تسجيل دفعة</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">المبلغ (ريال)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">طريقة الدفع</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none bg-white"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setPaymentModal(null); setPayAmount(''); }}
                  className="flex-1 py-2.5 text-gray-600 font-semibold border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => recordPayment.mutate({ invoiceId: paymentModal })}
                  disabled={!payAmount || recordPayment.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  {recordPayment.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  تسجيل
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
