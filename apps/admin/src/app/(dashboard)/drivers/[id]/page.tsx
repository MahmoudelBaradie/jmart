'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { driversApi, logisticsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import StatusBadge from '@/components/shared/StatusBadge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronRight, Truck, User, Phone, MapPin, Star,
  Package, Calendar, Hash, Activity, CheckCircle2,
  Clock, AlertCircle, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: 'نشط',    color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  PENDING:   { label: 'معلق',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  SUSPENDED: { label: 'موقوف', color: 'text-red-700 bg-red-50 border-red-200' },
  INACTIVE:  { label: 'غير نشط', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const VEHICLE_AR: Record<string, string> = {
  PICKUP: 'بيك أب',
  SMALL_TRUCK: 'شاحنة صغيرة',
  MEDIUM_TRUCK: 'شاحنة متوسطة',
  LARGE_TRUCK: 'شاحنة كبيرة',
};

const SHIPMENT_STATUS_AR: Record<string, string> = {
  PENDING_DRIVER: 'بانتظار السائق',
  DRIVER_ASSIGNED: 'تم التعيين',
  ACCEPTED: 'مقبولة',
  EN_ROUTE_PICKUP: 'في الطريق للاستلام',
  LOADING: 'جاري التحميل',
  IN_TRANSIT: 'في الطريق',
  DELIVERED: 'تم التسليم',
  FAILED: 'فشل',
};

const SHIPMENT_COLOR: Record<string, string> = {
  IN_TRANSIT: 'text-blue-700 bg-blue-50',
  DELIVERED: 'text-emerald-700 bg-emerald-50',
  FAILED: 'text-red-700 bg-red-50',
  LOADING: 'text-purple-700 bg-purple-50',
};

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driversApi.get(id).then((r) => r.data),
  });

  const { data: shipmentsData } = useQuery({
    queryKey: ['driver-shipments', id],
    queryFn: () => logisticsApi.list({ driverId: id, limit: 20 }).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <PageSpinner />;
  if (!driver) return <div className="text-center py-16 text-gray-500">السائق غير موجود</div>;

  const statusCfg = STATUS_CONFIG[driver.status] ?? STATUS_CONFIG.INACTIVE;
  const shipments = shipmentsData?.data ?? [];
  const completedShipments = shipments.filter((s: any) => s.status === 'DELIVERED').length;
  const activeShipments = shipments.filter((s: any) =>
    ['EN_ROUTE_PICKUP', 'LOADING', 'IN_TRANSIT', 'ACCEPTED'].includes(s.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/drivers" className="hover:text-gray-700">السائقون</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{driver.fullName ?? driver.user?.email}</span>
      </div>

      {/* Header card */}
      <Card>
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {(driver.fullName ?? driver.user?.email ?? '?')[0].toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{driver.fullName}</h1>
              <span className={cn('px-3 py-1 rounded-full text-sm font-semibold border', statusCfg.color)}>
                {statusCfg.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {driver.user?.email && (
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-gray-400" />
                  {driver.user.email}
                </span>
              )}
              {driver.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-gray-400" />
                  {driver.phone}
                </span>
              )}
              {driver.vehicleType && (
                <span className="flex items-center gap-1.5">
                  <Truck size={13} className="text-gray-400" />
                  {VEHICLE_AR[driver.vehicleType] ?? driver.vehicleType}
                </span>
              )}
            </div>
          </div>

          {/* Rating */}
          {driver.ratingAvg != null && (
            <div className="flex flex-col items-center bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3">
              <div className="flex items-center gap-1">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <span className="text-2xl font-bold text-gray-900">{Number(driver.ratingAvg).toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{driver.ratingCount ?? 0} تقييم</p>
            </div>
          )}
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Package size={18} className="text-blue-600" />} label="إجمالي الشحنات" value={shipments.length} color="blue" />
        <StatCard icon={<CheckCircle2 size={18} className="text-emerald-600" />} label="مكتملة" value={completedShipments} color="emerald" />
        <StatCard icon={<Activity size={18} className="text-purple-600" />} label="نشطة الآن" value={activeShipments} color="purple" />
        <StatCard icon={<Star size={18} className="text-amber-500" />} label="التقييم" value={driver.ratingAvg ? `${Number(driver.ratingAvg).toFixed(1)}/5` : '—'} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Shipments history */}
          <Card noPadding>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Truck size={16} className="text-blue-500" />
                الشحنات ({shipments.length})
              </h2>
            </div>
            {shipments.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Truck size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد شحنات</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {shipments.map((s: any) => (
                  <Link
                    key={s.id}
                    href={`/logistics/${s.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold',
                      SHIPMENT_COLOR[s.status] ?? 'text-gray-600 bg-gray-100',
                    )}>
                      <Truck size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.shipmentNumber ?? s.id?.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(s.createdAt)}</p>
                    </div>
                    <span className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full flex-shrink-0',
                      SHIPMENT_COLOR[s.status] ?? 'text-gray-600 bg-gray-100',
                    )}>
                      {SHIPMENT_STATUS_AR[s.status] ?? s.status}
                    </span>
                    <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Vehicle & license */}
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Truck size={16} className="text-blue-500" />
              بيانات المركبة
            </h2>
            <div className="space-y-3">
              <InfoRow label="نوع المركبة" value={VEHICLE_AR[driver.vehicleType] ?? driver.vehicleType ?? '—'} />
              <InfoRow label="رقم اللوحة" value={driver.vehiclePlate ?? '—'} mono />
              <InfoRow label="موديل المركبة" value={driver.vehicleModel ?? '—'} />
              <InfoRow label="سنة الصنع" value={driver.vehicleYear?.toString() ?? '—'} />
              <InfoRow label="الحمولة القصوى" value={driver.maxLoadKg ? `${Number(driver.maxLoadKg).toLocaleString('ar-SA')} كجم` : '—'} />
            </div>
          </Card>

          {/* License & documents */}
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield size={16} className="text-purple-500" />
              الوثائق والترخيص
            </h2>
            <div className="space-y-3">
              <InfoRow label="رقم الرخصة" value={driver.licenseNumber ?? '—'} mono />
              <InfoRow label="انتهاء الرخصة" value={driver.licenseExpiry ? formatDate(driver.licenseExpiry) : '—'} />
              <InfoRow label="رقم الهوية" value={driver.nationalId ?? '—'} mono />
            </div>
          </Card>

          {/* Zones */}
          {(driver.zoneAssignments ?? []).length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-red-500" />
                مناطق التغطية
              </h2>
              <div className="space-y-2">
                {driver.zoneAssignments.map((za: any) => (
                  <div key={za.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-700">{za.zone?.zoneName ?? za.zoneId}</span>
                    <div className="flex gap-1">
                      {za.canPickup && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">استلام</span>
                      )}
                      {za.canDeliver && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">توصيل</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Account info */}
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              معلومات الحساب
            </h2>
            <div className="space-y-3">
              <InfoRow label="تاريخ الانضمام" value={formatDate(driver.createdAt)} />
              <InfoRow label="آخر تحديث" value={formatDate(driver.updatedAt)} />
              {driver.shippingCompany && (
                <InfoRow label="شركة الشحن" value={driver.shippingCompany.companyName ?? '—'} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-50 border-blue-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    purple:  'bg-purple-50 border-purple-100',
    amber:   'bg-amber-50 border-amber-100',
  };
  return (
    <div className={cn('rounded-2xl border p-4', colors[color] ?? 'bg-gray-50 border-gray-100')}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className={cn('text-sm text-right text-gray-800 font-medium', mono ? 'font-mono text-xs' : '')}>{value}</span>
    </div>
  );
}
