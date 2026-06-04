'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logisticsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import {
  Truck, CheckCircle2, Clock, AlertCircle, ChevronLeft,
  Package, MapPin, Navigation, Loader2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  PENDING_DRIVER:  { label: 'انتظار القبول',       color: 'text-amber-700 bg-amber-50',   next: 'ACCEPTED',         nextLabel: 'قبول الشحنة' },
  DRIVER_ASSIGNED: { label: 'تم التعيين',          color: 'text-blue-700 bg-blue-50',     next: 'ACCEPTED',         nextLabel: 'قبول الشحنة' },
  ACCEPTED:        { label: 'مقبولة',              color: 'text-blue-700 bg-blue-50',     next: 'EN_ROUTE_PICKUP',  nextLabel: 'التوجه للاستلام' },
  EN_ROUTE_PICKUP: { label: 'في الطريق للاستلام',  color: 'text-purple-700 bg-purple-50', next: 'LOADING',          nextLabel: 'بدء التحميل' },
  LOADING:         { label: 'جاري التحميل',        color: 'text-indigo-700 bg-indigo-50', next: 'IN_TRANSIT',       nextLabel: 'بدء التوصيل' },
  IN_TRANSIT:      { label: 'في الطريق',           color: 'text-blue-700 bg-blue-50',     next: 'DELIVERED',        nextLabel: 'تأكيد التسليم' },
  DELIVERED:       { label: 'تم التسليم',          color: 'text-emerald-700 bg-emerald-50' },
  FAILED:          { label: 'فشل التسليم',         color: 'text-red-700 bg-red-50' },
};

export default function ShipmentsPage() {
  const { isDriver } = useAuth() as any;
  const qc = useQueryClient();
  const [activeShipment, setActiveShipment] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-shipments'],
    queryFn: () => logisticsApi.myShipments({ limit: 30 }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      logisticsApi.updateStatus(id, status, notes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-shipments'] });
      setActiveShipment(null);
      setNotes('');
      setShowNotes(false);
    },
  });

  const shipments = data?.data ?? data ?? [];
  const active = shipments.filter((s: any) => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(s.status));
  const history = shipments.filter((s: any) => ['DELIVERED', 'FAILED', 'CANCELLED'].includes(s.status));

  if (!isDriver) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Truck size={48} className="mx-auto mb-3 text-gray-200" />
        <p className="font-semibold">هذه الصفحة للسائقين فقط</p>
        <Link href="/" className="mt-3 inline-block text-blue-600 text-sm">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-2">
        <Truck size={20} className="text-blue-600" />
        <h1 className="text-lg font-bold text-gray-900">شحناتي</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* Active shipments */}
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                الشحنات النشطة ({active.length})
              </h2>
              {active.map((s: any) => {
                const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'text-gray-600 bg-gray-100' };
                return (
                  <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-bold text-gray-900">
                            {s.shipmentNumber ?? s.id?.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.createdAt)}</p>
                        </div>
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', cfg.color)}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Addresses */}
                      <div className="space-y-2 mb-3">
                        {s.pickupAddress && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <span>الاستلام: {s.pickupAddress}</span>
                          </div>
                        )}
                        {s.deliveryAddress && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <Navigation size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>التسليم: {s.deliveryAddress}</span>
                          </div>
                        )}
                        {s.order && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Package size={13} className="text-purple-400 flex-shrink-0" />
                            <span>طلب: {s.order.orderNumber}</span>
                          </div>
                        )}
                      </div>

                      {/* Action button */}
                      {cfg.next && (
                        <button
                          onClick={() => { setActiveShipment(s); setShowNotes(cfg.next === 'DELIVERED' || cfg.next === 'FAILED'); }}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                        >
                          <ChevronLeft size={15} />
                          {cfg.nextLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {active.length === 0 && (
            <div className="text-center py-10 text-gray-300">
              <CheckCircle2 size={40} className="mx-auto mb-2" />
              <p className="text-gray-400 text-sm font-medium">لا توجد شحنات نشطة</p>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-gray-500 flex items-center gap-2">
                <Clock size={14} />
                السجل ({history.length})
              </h2>
              {history.map((s: any) => {
                const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'text-gray-600 bg-gray-100' };
                return (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {s.status === 'DELIVERED'
                        ? <CheckCircle2 size={16} className="text-emerald-500" />
                        : <AlertCircle size={16} className="text-red-400" />
                      }
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {s.shipmentNumber ?? s.id?.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(s.createdAt)}</p>
                      </div>
                    </div>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', cfg.color)}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Status update confirmation overlay */}
      {activeShipment && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveShipment(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                {STATUS_CONFIG[activeShipment.status]?.nextLabel ?? 'تحديث الحالة'}
              </h3>
              <button onClick={() => setActiveShipment(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              تحديث حالة الشحنة <span className="font-mono font-bold">{activeShipment.shipmentNumber}</span>
            </p>
            {showNotes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="أي تفاصيل إضافية..."
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveShipment(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => updateMutation.mutate({
                  id: activeShipment.id,
                  status: STATUS_CONFIG[activeShipment.status]?.next ?? '',
                })}
                disabled={updateMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
