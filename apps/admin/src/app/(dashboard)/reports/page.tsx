'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ordersApi, farmersApi, buyersApi, financialApi,
  logisticsApi, disputesApi,
} from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import MiniBarChart from '@/components/shared/MiniBarChart';

// ── Static monthly trend data (replace with real API data when available) ──
const MONTHLY_ORDER_TRENDS = [
  { label: 'يناير', value: 42 },
  { label: 'فبراير', value: 58 },
  { label: 'مارس', value: 75 },
  { label: 'أبريل', value: 61 },
  { label: 'مايو', value: 89 },
  { label: 'يونيو', value: 103 },
  { label: 'يوليو', value: 94 },
  { label: 'أغسطس', value: 118 },
  { label: 'سبتمبر', value: 87 },
  { label: 'أكتوبر', value: 134 },
  { label: 'نوفمبر', value: 110 },
  { label: 'ديسمبر', value: 142 },
];
import {
  Download, FileSpreadsheet, BarChart3, TrendingUp, Users,
  ShoppingBag, Truck, Scale, DollarSign, Loader2, RefreshCw,
  CheckCircle2, Clock, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Utility: convert array to CSV and download ──────────────────
function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csvContent = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Report definition ───────────────────────────────────────────
const REPORT_TYPES = [
  {
    id: 'orders',
    label: 'تقرير الطلبات',
    desc: 'جميع الطلبات مع الحالات والمبالغ والمزارعين والمشترين',
    icon: ShoppingBag,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'farmers',
    label: 'تقرير المزارعين',
    desc: 'قائمة المزارعين مع حالة KYC والإحصائيات',
    icon: Users,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'buyers',
    label: 'تقرير المشترين',
    desc: 'قائمة المشترين مع حالة KYC وعدد الطلبات',
    icon: Users,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    id: 'financial',
    label: 'تقرير مالي',
    desc: 'الفواتير، المدفوعات، والمستردات',
    icon: DollarSign,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'logistics',
    label: 'تقرير الشحنات',
    desc: 'جميع الشحنات مع السائقين والحالات',
    icon: Truck,
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    id: 'disputes',
    label: 'تقرير النزاعات',
    desc: 'النزاعات المرفوعة مع قرارات الحل',
    icon: Scale,
    color: 'bg-red-50 text-red-600',
  },
];

function ReportCard({
  report,
  onDownload,
  loading,
}: {
  report: (typeof REPORT_TYPES)[number];
  onDownload: () => void;
  loading: boolean;
}) {
  const Icon = report.icon;
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', report.color)}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900">{report.label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{report.desc}</p>
        </div>
      </div>
      <button
        onClick={onDownload}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {loading ? 'جاري التصدير…' : 'تصدير CSV'}
      </button>
    </Card>
  );
}

export default function ReportsPage() {
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Summary stats ─────────────────────────────────────────────
  const { data: financialSummary } = useQuery({
    queryKey: ['financial-summary-reports'],
    queryFn: () => financialApi.summary().then((r) => r.data),
  });

  const { data: logisticsStats } = useQuery({
    queryKey: ['logistics-stats-reports'],
    queryFn: () => logisticsApi.stats().then((r) => r.data),
  });

  const { data: disputeStats } = useQuery({
    queryKey: ['dispute-stats-reports'],
    queryFn: () => disputesApi.stats().then((r) => r.data),
  });

  // ── Export handlers ───────────────────────────────────────────
  const doExport = async (type: string) => {
    setLoadingReport(type);
    try {
      const params: Record<string, unknown> = {
        limit: 10000, page: 1,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      };

      if (type === 'orders') {
        const res = await ordersApi.list(params);
        const orders = res.data?.data || [];
        downloadCsv('orders', [
          'رقم الطلب', 'الحالة', 'المبلغ الكلي', 'المزارع', 'المشتري',
          'عدد المنتجات', 'تاريخ الإنشاء',
        ], orders.map((o: {
          orderNumber: string; status: string; totalAmount: number;
          farmer?: { businessName: string }; buyer?: { businessName: string };
          _count?: { items: number }; createdAt: string;
        }) => [
          o.orderNumber, o.status, o.totalAmount,
          o.farmer?.businessName || '',
          o.buyer?.businessName || '',
          o._count?.items || '',
          o.createdAt?.slice(0, 10),
        ]));

      } else if (type === 'farmers') {
        const res = await farmersApi.list(params);
        const farmers = res.data?.data || [];
        downloadCsv('farmers', [
          'اسم النشاط', 'نوع المزارع', 'جهة الاتصال', 'الجوال',
          'حالة KYC', 'عدد المزارع', 'تاريخ التسجيل',
        ], farmers.map((f: {
          businessName: string; farmerType: string; contactPersonName: string;
          contactPhone: string; kycStatus: string;
          _count?: { farms: number }; createdAt: string;
        }) => [
          f.businessName, f.farmerType, f.contactPersonName,
          f.contactPhone, f.kycStatus,
          f._count?.farms || 0, f.createdAt?.slice(0, 10),
        ]));

      } else if (type === 'buyers') {
        const res = await buyersApi.list(params);
        const buyers = res.data?.data || [];
        downloadCsv('buyers', [
          'اسم النشاط', 'نوع المشتري', 'جهة الاتصال', 'الجوال',
          'حالة KYC', 'عدد الطلبات', 'تاريخ التسجيل',
        ], buyers.map((b: {
          businessName: string; buyerType: string; contactPersonName: string;
          contactPhone: string; kycStatus: string;
          _count?: { orders: number }; createdAt: string;
        }) => [
          b.businessName, b.buyerType, b.contactPersonName,
          b.contactPhone, b.kycStatus,
          b._count?.orders || 0, b.createdAt?.slice(0, 10),
        ]));

      } else if (type === 'financial') {
        const res = await financialApi.invoices(params);
        const invoices = res.data?.data || [];
        downloadCsv('invoices', [
          'رقم الفاتورة', 'النوع', 'الحالة', 'المبلغ الأساسي',
          'الضريبة', 'الإجمالي', 'تاريخ الاستحقاق', 'تاريخ الإصدار',
        ], invoices.map((inv: {
          invoiceNumber: string; invoiceType: string; status: string;
          subtotalAmount: number; taxAmount: number; totalAmount: number;
          dueDate?: string; issuedAt?: string;
        }) => [
          inv.invoiceNumber, inv.invoiceType, inv.status,
          inv.subtotalAmount, inv.taxAmount, inv.totalAmount,
          inv.dueDate?.slice(0, 10) || '',
          inv.issuedAt?.slice(0, 10) || '',
        ]));

      } else if (type === 'logistics') {
        const res = await logisticsApi.list(params);
        const shipments = res.data?.data || [];
        downloadCsv('shipments', [
          'رقم الشحنة', 'رقم الطلب', 'الحالة', 'السائق',
          'موعد الاستلام', 'موعد التسليم', 'تسليم فعلي', 'تاريخ الإنشاء',
        ], shipments.map((s: {
          shipmentNumber: string; order?: { orderNumber: string };
          status: string; driver?: { fullName: string };
          estimatedPickupAt?: string; estimatedDeliveryAt?: string;
          actualDeliveryAt?: string; createdAt: string;
        }) => [
          s.shipmentNumber, s.order?.orderNumber || '',
          s.status, s.driver?.fullName || '',
          s.estimatedPickupAt?.slice(0, 10) || '',
          s.estimatedDeliveryAt?.slice(0, 10) || '',
          s.actualDeliveryAt?.slice(0, 10) || '',
          s.createdAt?.slice(0, 10),
        ]));

      } else if (type === 'disputes') {
        const res = await disputesApi.list(params);
        const disputes = res.data?.data || [];
        downloadCsv('disputes', [
          'رقم النزاع', 'النوع', 'الحالة', 'المبلغ المُسوَّى',
          'المسؤولية', 'تاريخ الرفع', 'تاريخ الإغلاق',
        ], disputes.map((d: {
          disputeNumber: string; disputeType: string; status: string;
          resolvedAmount?: number; responsibility?: string;
          createdAt: string; closedAt?: string;
        }) => [
          d.disputeNumber, d.disputeType, d.status,
          d.resolvedAmount || '',
          d.responsibility || '',
          d.createdAt?.slice(0, 10),
          d.closedAt?.slice(0, 10) || '',
        ]));
      }
    } finally {
      setLoadingReport(null);
    }
  };

  const fs = financialSummary;
  const ls = logisticsStats;
  const ds = disputeStats;

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">التقارير والإحصائيات</h1>
        <p className="text-sm text-gray-500 mt-0.5">تصدير البيانات بصيغة CSV وعرض ملخصات الأداء</p>
      </div>

      {/* Monthly Order Trend Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">اتجاه الطلبات الشهري</h2>
            <p className="text-xs text-gray-500 mt-0.5">عدد الطلبات لكل شهر خلال العام الحالي</p>
          </div>
          <div className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            {MONTHLY_ORDER_TRENDS.reduce((s, d) => s + d.value, 0)} طلب إجمالي
          </div>
        </div>
        <MiniBarChart data={MONTHLY_ORDER_TRENDS} color="#16a34a" height={100} />
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'إجمالي الفواتير',
            value: formatCurrency(fs?.invoices?.totalIssued ?? 0),
            sub: `${fs?.invoices?.total ?? 0} فاتورة`,
            icon: DollarSign,
            color: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'شحنات مكتملة',
            value: ls?.DELIVERED ?? 0,
            sub: `${ls?.IN_TRANSIT ?? 0} في الطريق`,
            icon: Truck,
            color: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'نزاعات مفتوحة',
            value: ds?.open ?? 0,
            sub: `${ds?.resolved ?? 0} محلولة`,
            icon: Scale,
            color: 'bg-red-50 text-red-600',
          },
          {
            label: 'مدفوعات معلقة',
            value: formatCurrency(fs?.payouts?.totalQueuedAmount ?? 0),
            sub: `${fs?.payouts?.queued ?? 0} في الانتظار`,
            icon: Clock,
            color: 'bg-amber-50 text-amber-600',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="p-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
              <Icon size={18} />
            </div>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </Card>
        ))}
      </div>

      {/* Date range filter */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">فلترة النطاق الزمني</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">من</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">إلى</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <RefreshCw size={12} /> مسح
            </button>
          )}
          {dateFrom && dateTo && (
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
              {dateFrom} — {dateTo}
            </span>
          )}
        </div>
      </Card>

      {/* Report cards */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <FileSpreadsheet size={15} className="text-brand-500" />
          تصدير التقارير
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDownload={() => doExport(report.id)}
              loading={loadingReport === report.id}
            />
          ))}
        </div>
      </div>

      {/* Quick export note */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
        <CheckCircle2 size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-700">ملاحظات التصدير</p>
          <ul className="text-xs text-gray-500 mt-1 space-y-0.5 list-disc list-inside">
            <li>الملفات تُصدَّر بتنسيق CSV متوافق مع Excel و Google Sheets</li>
            <li>يدعم الفلترة بالتاريخ إذا حددت نطاقاً زمنياً</li>
            <li>الحد الأقصى للتصدير 10,000 سجل في كل مرة</li>
            <li>أسماء الأعمدة بالعربية مع ترميز UTF-8</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
