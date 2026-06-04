'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logisticsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Truck, Search, Filter, Plus, CheckCircle2, Clock, AlertCircle,
  MapPin, User, Package, Loader2, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_AR: Record<string, string> = {
  PENDING_DRIVER: 'بانتظار السائق',
  DRIVER_ASSIGNED: 'تم تعيين السائق',
  LOADING: 'جاري التحميل',
  IN_TRANSIT: 'في الطريق',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغية',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_DRIVER: 'bg-amber-50 text-amber-700 border-amber-200',
  DRIVER_ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  LOADING: 'bg-purple-50 text-purple-700 border-purple-200',
  IN_TRANSIT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUSES = [
  { value: '', label: 'جميع الحالات' },
  { value: 'PENDING_DRIVER', label: 'بانتظار السائق' },
  { value: 'DRIVER_ASSIGNED', label: 'تم تعيين السائق' },
  { value: 'LOADING', label: 'جاري التحميل' },
  { value: 'IN_TRANSIT', label: 'في الطريق' },
  { value: 'DELIVERED', label: 'تم التسليم' },
  { value: 'CANCELLED', label: 'ملغية' },
];

interface Shipment {
  id: string;
  shipmentNumber: string;
  status: string;
  order?: { orderNumber: string; totalAmount?: number };
  driver?: { fullName: string; vehiclePlate?: string };
  shippingCompany?: { companyName: string };
  estimatedPickupAt?: string;
  estimatedDeliveryAt?: string;
  actualDeliveryAt?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  createdAt: string;
}

export default function LogisticsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['logistics', page, search, status],
    queryFn: () =>
      logisticsApi.list({ page, limit, search: search || undefined, status: status || undefined })
        .then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['logistics-stats'],
    queryFn: () => logisticsApi.stats().then((r) => r.data),
  });

  const shipments: Shipment[] = data?.data || [];
  const meta = data?.meta;

  // Each bucket aggregates over multiple Prisma statuses so the UI doesn't
  // silently zero out after enum renames (AWAITING_BIDS replaced
  // PENDING_DRIVER when the bidding marketplace shipped).
  const statCards: { label: string; keys: string[]; color: string; icon: any }[] = [
    { label: 'بانتظار السائق', keys: ['PENDING_DRIVER', 'AWAITING_BIDS', 'DRIVER_ASSIGNED'], color: 'bg-amber-50 text-amber-700', icon: Clock },
    { label: 'في الطريق', keys: ['IN_TRANSIT', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'LOADING', 'ARRIVED_DELIVERY'], color: 'bg-indigo-50 text-indigo-700', icon: Truck },
    { label: 'تم التسليم', keys: ['DELIVERED', 'PROOF_UPLOADED'], color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    { label: 'ملغية', keys: ['CANCELLED', 'FAILED'], color: 'bg-red-50 text-red-700', icon: AlertCircle },
  ];

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">اللوجستيك والشحنات</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة شحنات الطلبات وتتبع السائقين</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, keys, color, icon: Icon }) => {
            const value = keys.reduce((sum, k) => sum + (Number((stats as any)?.[k]) || 0), 0);
            return (
              <Card key={label} className="p-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="رقم الشحنة أو الطلب…"
              className="w-full border border-gray-200 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div className="relative">
            <Filter size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none bg-white"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card noPadding>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <Truck size={36} />
            <p className="text-sm">لا توجد شحنات</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-right">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">رقم الشحنة</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">الطلب</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">السائق</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">موعد التسليم</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">تاريخ الإنشاء</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-brand-700">{s.shipmentNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        {s.order ? (
                          <Link href={`/orders/${s.id}`} className="text-gray-700 hover:text-brand-600 font-medium">
                            {s.order.orderNumber}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.driver ? (
                          <div>
                            <p className="text-gray-800 font-medium">{s.driver.fullName}</p>
                            {s.driver.vehiclePlate && (
                              <p className="text-xs text-gray-400">{s.driver.vehiclePlate}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                            لم يُعيَّن
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600 border-gray-200')}>
                          {STATUS_AR[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.actualDeliveryAt
                          ? <span className="text-emerald-600 font-semibold">{formatDate(s.actualDeliveryAt)}</span>
                          : formatDate(s.estimatedDeliveryAt) || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(s.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/logistics/${s.id}`}
                          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-semibold"
                        >
                          تفاصيل <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && (
              <div className="p-4 border-t border-gray-100">
                <Pagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  total={meta.total}
                  limit={limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
