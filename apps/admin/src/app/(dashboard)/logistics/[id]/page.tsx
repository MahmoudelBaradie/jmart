'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logisticsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronRight, Truck, User, MapPin, Package, Clock, CheckCircle2,
  AlertCircle, Loader2, Calendar, Hash, Building2, UserCheck,
  ArrowRight, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SHIPMENT_FLOW = [
  'PENDING_DRIVER',
  'DRIVER_ASSIGNED',
  'LOADING',
  'IN_TRANSIT',
  'DELIVERED',
];

const STATUS_AR: Record<string, string> = {
  PENDING_DRIVER: 'بانتظار السائق',
  DRIVER_ASSIGNED: 'تم تعيين السائق',
  LOADING: 'جاري التحميل',
  IN_TRANSIT: 'في الطريق',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغية',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_DRIVER: 'text-amber-700 bg-amber-50 border-amber-200',
  DRIVER_ASSIGNED: 'text-blue-700 bg-blue-50 border-blue-200',
  LOADING: 'text-purple-700 bg-purple-50 border-purple-200',
  IN_TRANSIT: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  DELIVERED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  CANCELLED: 'text-red-700 bg-red-50 border-red-200',
};

const NEXT_STATUS: Record<string, string[]> = {
  PENDING_DRIVER: ['DRIVER_ASSIGNED', 'CANCELLED'],
  DRIVER_ASSIGNED: ['LOADING', 'CANCELLED'],
  LOADING: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
};

const NEXT_STATUS_LABELS: Record<string, string> = {
  DRIVER_ASSIGNED: 'تأكيد تعيين السائق',
  LOADING: 'بدء التحميل',
  IN_TRANSIT: 'إطلاق الشحنة',
  DELIVERED: 'تأكيد التسليم',
  CANCELLED: 'إلغاء الشحنة',
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
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}

interface Driver {
  id: string;
  fullName: string;
  vehicleType?: string;
  vehiclePlate?: string;
  vehicleCapacityKg?: number;
  hasRefrigeration?: boolean;
  shippingCompany?: { companyName: string };
}

export default function LogisticsDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', params.id],
    queryFn: () => logisticsApi.get(params.id).then((r) => r.data),
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ['available-drivers'],
    queryFn: () => logisticsApi.availableDrivers().then((r) => r.data),
    enabled: showAssignForm,
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      logisticsApi.assignDriver(params.id, { driverId: selectedDriverId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipment', params.id] });
      qc.invalidateQueries({ queryKey: ['logistics'] });
      setShowAssignForm(false);
      setSelectedDriverId('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      logisticsApi.updateStatus(params.id, status, statusNotes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipment', params.id] });
      qc.invalidateQueries({ queryKey: ['logistics'] });
      setShowStatusForm(false);
      setStatusNotes('');
      setPendingStatus('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600">لم يُعثر على الشحنة</p>
        <Link href="/logistics" className="text-brand-600 text-sm hover:underline">العودة</Link>
      </div>
    );
  }

  const currentIdx = SHIPMENT_FLOW.indexOf(shipment.status);
  const isCancelled = shipment.status === 'CANCELLED';
  const isDelivered = shipment.status === 'DELIVERED';
  const nextStatuses = NEXT_STATUS[shipment.status] || [];

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/logistics" className="hover:text-brand-600 transition-colors">الشحنات</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-bold">{shipment.shipmentNumber}</span>
      </div>

      {/* Status Flow */}
      {!isCancelled && (
        <Card className="p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">مسار الشحنة</h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {SHIPMENT_FLOW.map((s, idx) => {
              const isDone = currentIdx > idx;
              const isActive = currentIdx === idx;
              return (
                <div key={s} className="flex items-center gap-2 flex-shrink-0">
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                    isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    isActive ? 'bg-brand-50 text-brand-700 border-brand-200 ring-2 ring-brand-100' :
                    'bg-gray-50 text-gray-400 border-gray-100'
                  )}>
                    {isDone ? <CheckCircle2 size={12} /> :
                     isActive ? <RefreshCw size={12} className="animate-spin" /> :
                     <Clock size={12} />}
                    {STATUS_AR[s]}
                  </div>
                  {idx < SHIPMENT_FLOW.length - 1 && (
                    <ArrowRight size={14} className={isDone ? 'text-emerald-400' : 'text-gray-200'} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {isCancelled && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-200">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-red-700 font-semibold text-sm">تم إلغاء هذه الشحنة</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Shipment Info */}
          <Card className="p-5">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Truck size={20} className="text-brand-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-black text-gray-900">{shipment.shipmentNumber}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full border',
                    STATUS_COLOR[shipment.status] || 'bg-gray-100 text-gray-600 border-gray-200'
                  )}>
                    {STATUS_AR[shipment.status] || shipment.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {shipment.order && (
                <InfoRow icon={Package} label="رقم الطلب" value={shipment.order.orderNumber} />
              )}
              <InfoRow icon={MapPin} label="عنوان الاستلام" value={shipment.pickupAddress} />
              <InfoRow icon={MapPin} label="عنوان التسليم" value={shipment.deliveryAddress} />
              {(shipment.pickupAddress || shipment.deliveryAddress) && (
                <div className="px-5 py-3 flex gap-2 flex-wrap">
                  {shipment.pickupAddress && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(shipment.pickupAddress)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <MapPin size={11} /> فتح نقطة الاستلام على الخريطة
                    </a>
                  )}
                  {shipment.deliveryAddress && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(shipment.deliveryAddress)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <MapPin size={11} /> فتح نقطة التسليم على الخريطة
                    </a>
                  )}
                  {shipment.pickupAddress && shipment.deliveryAddress && (
                    <a
                      href={`https://maps.google.com/maps/dir/${encodeURIComponent(shipment.pickupAddress)}/${encodeURIComponent(shipment.deliveryAddress)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <Truck size={11} /> عرض المسار الكامل
                    </a>
                  )}
                </div>
              )}
              <InfoRow icon={Calendar} label="موعد الاستلام المتوقع" value={shipment.estimatedPickupAt ? formatDate(shipment.estimatedPickupAt) : undefined} />
              <InfoRow icon={Calendar} label="موعد التسليم المتوقع" value={shipment.estimatedDeliveryAt ? formatDate(shipment.estimatedDeliveryAt) : undefined} />
              {shipment.actualDeliveryAt && (
                <InfoRow icon={CheckCircle2} label="تاريخ التسليم الفعلي" value={formatDate(shipment.actualDeliveryAt)} />
              )}
              <InfoRow icon={Hash} label="تاريخ الإنشاء" value={formatDate(shipment.createdAt)} />
              {shipment.internalNotes && (
                <InfoRow icon={Hash} label="ملاحظات داخلية" value={shipment.internalNotes} />
              )}
            </div>
          </Card>

          {/* Driver Info */}
          {shipment.driver && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User size={14} className="text-brand-500" />
                معلومات السائق
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{shipment.driver.fullName}</p>
                  {shipment.driver.vehiclePlate && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      لوحة: {shipment.driver.vehiclePlate}
                      {shipment.driver.vehicleType && ` · ${shipment.driver.vehicleType}`}
                    </p>
                  )}
                  {shipment.shippingCompany && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      <Building2 size={11} className="inline ml-1" />
                      {shipment.shippingCompany.companyName}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ── Right column — Actions ── */}
        <div className="space-y-5">
          {/* Assign Driver Panel */}
          {!isDelivered && !isCancelled && !shipment.driver && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UserCheck size={14} className="text-brand-500" />
                تعيين سائق
              </h2>

              {!showAssignForm ? (
                <button
                  onClick={() => setShowAssignForm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  <UserCheck size={15} />
                  تعيين سائق الآن
                </button>
              ) : (
                <div className="space-y-3">
                  {!drivers ? (
                    <div className="flex items-center justify-center h-16">
                      <Loader2 size={18} className="animate-spin text-gray-400" />
                    </div>
                  ) : drivers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">لا يوجد سائقون متاحون</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {drivers.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setSelectedDriverId(d.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all',
                            selectedDriverId === d.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          )}
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{d.fullName}</p>
                            <p className="text-xs text-gray-400">
                              {d.vehiclePlate || 'بدون لوحة'}
                              {d.vehicleType && ` · ${d.vehicleType}`}
                            </p>
                          </div>
                          {selectedDriverId === d.id && (
                            <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => assignMutation.mutate()}
                      disabled={!selectedDriverId || assignMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                    >
                      {assignMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                      تأكيد التعيين
                    </button>
                    <button
                      onClick={() => { setShowAssignForm(false); setSelectedDriverId(''); }}
                      className="px-3 py-2.5 text-gray-500 hover:text-gray-700 text-sm rounded-xl border border-gray-200"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Change Status Panel */}
          {!isDelivered && !isCancelled && nextStatuses.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <RefreshCw size={14} className="text-brand-500" />
                تحديث الحالة
              </h2>

              {!showStatusForm ? (
                <div className="space-y-2">
                  {nextStatuses.map((ns) => (
                    <button
                      key={ns}
                      onClick={() => { setPendingStatus(ns); setShowStatusForm(true); }}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl text-sm transition-colors',
                        ns === 'CANCELLED'
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                          : ns === 'DELIVERED'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-brand-600 hover:bg-brand-700 text-white'
                      )}
                    >
                      {ns === 'CANCELLED' ? <AlertCircle size={14} /> :
                       ns === 'DELIVERED' ? <CheckCircle2 size={14} /> :
                       <ArrowRight size={14} />}
                      {NEXT_STATUS_LABELS[ns] || STATUS_AR[ns]}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border',
                    STATUS_COLOR[pendingStatus] || 'bg-gray-50 border-gray-200 text-gray-700'
                  )}>
                    <ArrowRight size={14} />
                    {STATUS_AR[pendingStatus] || pendingStatus}
                  </div>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="ملاحظات (اختياري)…"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => statusMutation.mutate(pendingStatus)}
                      disabled={statusMutation.isPending}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50',
                        pendingStatus === 'CANCELLED'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-brand-600 hover:bg-brand-700 text-white'
                      )}
                    >
                      {statusMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      تأكيد
                    </button>
                    <button
                      onClick={() => { setShowStatusForm(false); setPendingStatus(''); setStatusNotes(''); }}
                      className="px-3 py-2.5 text-gray-500 hover:text-gray-700 text-sm rounded-xl border border-gray-200"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Delivered state */}
          {isDelivered && (
            <Card className="p-5">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-700">تم التسليم بنجاح</p>
                  {shipment.actualDeliveryAt && (
                    <p className="text-xs text-emerald-600 mt-0.5">{formatDate(shipment.actualDeliveryAt)}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Quick links */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">روابط سريعة</h2>
            <div className="space-y-2">
              {shipment.order && (
                <Link
                  href={`/orders/${params.id}`}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                >
                  <Package size={14} className="text-gray-400" />
                  عرض الطلب المرتبط
                </Link>
              )}
              <Link
                href="/logistics"
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                <Truck size={14} className="text-gray-400" />
                جميع الشحنات
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
