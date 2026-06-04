'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmersApi, ordersApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronRight, User, Phone, Building2, CheckCircle2, XCircle,
  Clock, MapPin, BarChart3, Package, ShoppingBag, Loader2,
  AlertCircle, Banknote, CreditCard, Hash, FileText, Shield,
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

export default function FarmerDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [kycNotes, setKycNotes] = useState('');
  const [showKycForm, setShowKycForm] = useState(false);

  const { data: farmer, isLoading } = useQuery({
    queryKey: ['farmer', params.id],
    queryFn: () => farmersApi.get(params.id).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['farmer-stats', params.id],
    queryFn: () => farmersApi.stats(params.id).then((r) => r.data),
    enabled: !!farmer,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['farmer-orders', params.id],
    queryFn: () => ordersApi.list({ farmerId: params.id, limit: 5, page: 1 }).then((r) => r.data),
    enabled: !!farmer,
  });

  const kycMutation = useMutation({
    mutationFn: (status: string) => farmersApi.kycReview(params.id, status, kycNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmer', params.id] });
      setShowKycForm(false);
      setKycNotes('');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => farmersApi.suspend(params.id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmer', params.id] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600">لم يُعثر على المزارع</p>
        <Link href="/farmers" className="text-brand-600 text-sm hover:underline">العودة</Link>
      </div>
    );
  }

  const kycCfg = KYC_CONFIG[farmer.kycStatus] || KYC_CONFIG.PENDING;
  const KycIcon = kycCfg.icon;
  const recentOrders = ordersData?.data || [];

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/farmers" className="hover:text-brand-600 transition-colors">المزارعون</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{farmer.businessName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile card */}
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <User size={24} className="text-brand-600" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-gray-900">{farmer.businessName}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{farmer.contactPersonName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1', kycCfg.color)}>
                      <KycIcon size={12} />
                      {kycCfg.label}
                    </span>
                    {farmer.farmerType && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                        {farmer.farmerType === 'INDIVIDUAL' ? 'فردي' : 'شركة'}
                      </span>
                    )}
                    {farmer.isSuspended && (
                      <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full">موقوف</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 divide-y divide-gray-50">
              <InfoRow icon={Phone} label="الجوال" value={farmer.contactPhone} />
              <InfoRow icon={Hash} label="الهوية الوطنية" value={farmer.nationalId} />
              <InfoRow icon={CreditCard} label="السجل التجاري" value={farmer.commercialRegNo} />
              <InfoRow icon={Building2} label="البنك" value={farmer.bankName} />
              <InfoRow icon={Banknote} label="الآيبان" value={farmer.bankAccountIban} />
              <InfoRow icon={FileText} label="تاريخ التسجيل" value={farmer.createdAt ? formatDate(farmer.createdAt) : undefined} />
            </div>
          </Card>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'العقود النشطة', value: stats.activeContracts, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'العروض النشطة', value: stats.activeListings, icon: Package, color: 'text-brand-600', bg: 'bg-brand-50' },
                { label: 'مدفوعات معلقة', value: stats.pendingPayouts, icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                      <s.icon size={16} className={s.color} />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Recent orders */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800">آخر الطلبات</h2>
              <Link href={`/orders?farmerId=${params.id}`} className="text-xs text-brand-600 hover:underline">
                عرض الكل
              </Link>
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
                  buyer?: { businessName: string };
                }) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">{order.buyer?.businessName} • {formatDate(order.createdAt)}</p>
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
        </div>

        {/* ── Right column — KYC Review ── */}
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

            {farmer.kycStatus === 'PENDING' && !showKycForm && (
              <div className="space-y-2">
                <button
                  onClick={() => { setShowKycForm(true); }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  <CheckCircle2 size={15} />
                  مراجعة KYC
                </button>
              </div>
            )}

            {showKycForm && (
              <div className="space-y-3">
                <textarea
                  value={kycNotes}
                  onChange={(e) => setKycNotes(e.target.value)}
                  placeholder="ملاحظات المراجعة (اختياري)…"
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
                <button onClick={() => setShowKycForm(false)} className="w-full text-gray-400 text-xs hover:text-gray-600 transition-colors">
                  إلغاء
                </button>
              </div>
            )}

            {farmer.kycStatus === 'APPROVED' && (
              <div className="text-center text-sm text-emerald-600 font-medium py-2">
                ✓ تم اعتماد الحساب
              </div>
            )}
          </Card>

          {/* Farms */}
          {farmer.farms && farmer.farms.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin size={14} className="text-brand-500" />
                المزارع ({farmer.farms.length})
              </h2>
              <div className="space-y-2">
                {farmer.farms.map((farm: { id: string; farmName: string; totalAreaHa?: number }) => (
                  <div key={farm.id} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm font-semibold text-gray-800">{farm.farmName}</p>
                    {farm.totalAreaHa && (
                      <p className="text-xs text-gray-400 mt-0.5">{farm.totalAreaHa} هكتار</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Actions */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">إجراءات</h2>
            <div className="space-y-2">
              <Link
                href={`/orders?farmerId=${params.id}`}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                <ShoppingBag size={14} className="text-gray-400" />
                عرض جميع الطلبات
              </Link>
              <Link
                href={`/inventory?farmerId=${params.id}`}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                <Package size={14} className="text-gray-400" />
                عرض المخزون
              </Link>
              {!farmer.isSuspended && (
                <button
                  onClick={() => {
                    const reason = prompt('سبب الإيقاف:');
                    if (reason) suspendMutation.mutate(reason);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-medium text-red-600 transition-colors"
                >
                  <AlertCircle size={14} />
                  إيقاف الحساب
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
