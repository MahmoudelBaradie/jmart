'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buyersApi, ordersApi, financialApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronRight, User, Phone, Building2, CheckCircle2, XCircle,
  Clock, ShoppingBag, Loader2, AlertCircle, Banknote,
  CreditCard, FileText, Shield, MapPin, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const KYC_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'قيد المراجعة', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  APPROVED:       { label: 'معتمد',        color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  REJECTED:       { label: 'مرفوض',        color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle },
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function BuyerDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [kycNotes, setKycNotes] = useState('');
  const [showKycForm, setShowKycForm] = useState(false);

  const { data: buyer, isLoading } = useQuery({
    queryKey: ['buyer', params.id],
    queryFn: () => buyersApi.get(params.id).then((r) => r.data),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['buyer-orders', params.id],
    queryFn: () => ordersApi.list({ buyerId: params.id, limit: 5, page: 1 }).then((r) => r.data),
    enabled: !!buyer,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['buyer-invoices', params.id],
    queryFn: () => financialApi.invoices({ buyerId: params.id, limit: 5 }).then((r) => r.data),
    enabled: !!buyer,
  });

  const kycMutation = useMutation({
    mutationFn: (status: string) => buyersApi.kycReview(params.id, status, kycNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyer', params.id] });
      setShowKycForm(false);
      setKycNotes('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600">لم يُعثر على المشتري</p>
        <Link href="/buyers" className="text-brand-600 text-sm hover:underline">العودة</Link>
      </div>
    );
  }

  const kycCfg = KYC_CONFIG[buyer.kycStatus] || KYC_CONFIG.PENDING;
  const KycIcon = kycCfg.icon;
  const recentOrders = ordersData?.data || [];
  const recentInvoices = invoicesData?.data || [];

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/buyers" className="hover:text-brand-600 transition-colors">المشترون</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{buyer.businessName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile card */}
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Building2 size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-black text-gray-900">{buyer.businessName}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{buyer.contactPersonName}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1', kycCfg.color)}>
                    <KycIcon size={12} />
                    {kycCfg.label}
                  </span>
                  {buyer.buyerType && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                      {buyer.buyerType}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 divide-y divide-gray-50">
              <InfoRow icon={Phone} label="الجوال" value={buyer.contactPhone} />
              <InfoRow icon={User} label="جهة الاتصال" value={buyer.contactPersonName} />
              <InfoRow icon={CreditCard} label="السجل التجاري" value={buyer.commercialRegNo} />
              <InfoRow icon={Hash} label="عدد الطلبات" value={buyer._count?.orders?.toString()} />
              <InfoRow icon={FileText} label="تاريخ التسجيل" value={buyer.createdAt ? formatDate(buyer.createdAt) : undefined} />
            </div>
          </Card>

          {/* Branches */}
          {buyer.branches && buyer.branches.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin size={14} className="text-brand-500" />
                الفروع ({buyer.branches.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {buyer.branches.map((branch: {
                  id: string;
                  branchName: string;
                  city?: string;
                  address?: string;
                }) => (
                  <div key={branch.id} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm font-semibold text-gray-800">{branch.branchName}</p>
                    {branch.city && <p className="text-xs text-gray-400 mt-0.5">{branch.city}</p>}
                    {branch.address && <p className="text-xs text-gray-400">{branch.address}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent orders */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800">آخر الطلبات</h2>
              <Link href={`/orders?buyerId=${params.id}`} className="text-xs text-brand-600 hover:underline">عرض الكل</Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">لا توجد طلبات بعد</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order: {
                  id: string;
                  orderNumber: string;
                  status: string;
                  totalAmount: number;
                  createdAt: string;
                }) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800">{formatCurrency(order.totalAmount)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Recent invoices */}
          {recentInvoices.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800">آخر الفواتير</h2>
                <Link href={`/financial/invoices?buyerId=${params.id}`} className="text-xs text-brand-600 hover:underline">عرض الكل</Link>
              </div>
              <div className="space-y-2">
                {recentInvoices.map((inv: {
                  id: string;
                  invoiceNumber: string;
                  status: string;
                  totalAmount: number;
                  dueDate?: string;
                }) => (
                  <Link
                    key={inv.id}
                    href={`/financial/invoices/${inv.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{inv.invoiceNumber}</p>
                      {inv.dueDate && <p className="text-xs text-gray-400">استحقاق: {formatDate(inv.dueDate)}</p>}
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-bold">{formatCurrency(inv.totalAmount)}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">
          {/* KYC Review Panel */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-brand-500" />
              <h2 className="text-sm font-bold text-gray-800">مراجعة KYC</h2>
            </div>

            <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-4 text-sm font-semibold', kycCfg.color)}>
              <KycIcon size={16} />
              {kycCfg.label}
            </div>

            {buyer.kycStatus === 'PENDING' && !showKycForm && (
              <button
                onClick={() => setShowKycForm(true)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                <CheckCircle2 size={15} />
                مراجعة KYC
              </button>
            )}

            {showKycForm && (
              <div className="space-y-3">
                <textarea
                  value={kycNotes}
                  onChange={(e) => setKycNotes(e.target.value)}
                  placeholder="ملاحظات (اختياري)…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => kycMutation.mutate('APPROVED')}
                    disabled={kycMutation.isPending}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60"
                  >
                    {kycMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    قبول
                  </button>
                  <button
                    onClick={() => kycMutation.mutate('REJECTED')}
                    disabled={kycMutation.isPending}
                    className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60"
                  >
                    <XCircle size={14} />
                    رفض
                  </button>
                </div>
                <button onClick={() => setShowKycForm(false)} className="w-full text-gray-400 text-xs hover:text-gray-600">
                  إلغاء
                </button>
              </div>
            )}

            {buyer.kycStatus === 'APPROVED' && (
              <div className="text-center text-sm text-emerald-600 font-medium py-2">
                ✓ تم اعتماد الحساب
              </div>
            )}
          </Card>

          {/* Quick links */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">إجراءات</h2>
            <div className="space-y-2">
              <Link
                href={`/orders?buyerId=${params.id}`}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                <ShoppingBag size={14} className="text-gray-400" />
                عرض جميع الطلبات
              </Link>
              <Link
                href={`/financial/invoices?buyerId=${params.id}`}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                <FileText size={14} className="text-gray-400" />
                عرض الفواتير
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
