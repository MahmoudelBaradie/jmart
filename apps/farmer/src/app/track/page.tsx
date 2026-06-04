'use client';
import { useState } from 'react';
import { Truck, Search, Package, CheckCircle2, Clock, MapPin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const SHIPMENT_STATUSES = [
  { key: 'PENDING_DRIVER',   label: 'انتظار السائق' },
  { key: 'DRIVER_ASSIGNED',  label: 'تم تعيين السائق' },
  { key: 'ACCEPTED',         label: 'قبول السائق' },
  { key: 'EN_ROUTE_PICKUP',  label: 'في الطريق للاستلام' },
  { key: 'LOADING',          label: 'جاري التحميل' },
  { key: 'IN_TRANSIT',       label: 'في الطريق' },
  { key: 'DELIVERED',        label: 'تم التسليم' },
];

const STATUS_ORDER = SHIPMENT_STATUSES.map((s) => s.key);

export default function TrackPage() {
  const [code, setCode] = useState('');
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setShipment(null);
    try {
      const res = await fetch(`${BASE}/logistics/shipments?search=${encodeURIComponent(code.trim())}&limit=1`);
      const json = await res.json();
      const item = json?.data?.[0] ?? json?.[0];
      if (!item) { setError('لم يتم العثور على الشحنة. تحقق من الرقم وأعد المحاولة.'); return; }
      setShipment(item);
    } catch {
      setError('حدث خطأ في الاتصال. يرجى المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = shipment ? STATUS_ORDER.indexOf(shipment.status) : -1;
  const isFailed = shipment?.status === 'FAILED' || shipment?.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50" dir="rtl">
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Truck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-gray-900 text-lg">تتبع الشحنة</h1>
            <p className="text-xs text-gray-500">منصة جمارت للتوصيل الزراعي</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 mb-4">أدخل رقم الشحنة</h2>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="مثال: SHP-2026-00123"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
            />
            <button
              onClick={search}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-5 py-3 rounded-xl transition-colors text-sm"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Search size={16} />
              }
              تتبع
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 rounded-xl text-sm text-red-600">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        {shipment && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">رقم الشحنة</p>
                  <p className="text-lg font-black text-gray-900 font-mono">
                    {shipment.shipmentNumber ?? shipment.id?.slice(-8).toUpperCase()}
                  </p>
                </div>
                <span className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold',
                  isFailed ? 'bg-red-100 text-red-700' :
                  shipment.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-blue-100 text-blue-700',
                )}>
                  {SHIPMENT_STATUSES.find((s) => s.key === shipment.status)?.label ?? shipment.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {shipment.driver && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Truck size={13} className="text-gray-400" />
                    السائق: {shipment.driver.fullName}
                  </div>
                )}
                {shipment.pickupAddress && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={13} className="text-blue-400" />
                    {shipment.pickupAddress}
                  </div>
                )}
                {shipment.deliveryAddress && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={13} className="text-emerald-400" />
                    {shipment.deliveryAddress}
                  </div>
                )}
                {shipment.estimatedDeliveryAt && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={13} className="text-amber-400" />
                    تسليم متوقع: {new Date(shipment.estimatedDeliveryAt).toLocaleDateString('ar-SA')}
                  </div>
                )}
              </div>
            </div>

            {!isFailed && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 mb-5">مسار الشحنة</h3>
                <div className="space-y-0">
                  {SHIPMENT_STATUSES.map((s, idx) => {
                    const isDone = currentIdx >= idx;
                    const isCurrent = currentIdx === idx;
                    const isLast = idx === SHIPMENT_STATUSES.length - 1;
                    return (
                      <div key={s.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all',
                            isDone && !isCurrent ? 'bg-emerald-500 border-emerald-500 text-white' :
                            isCurrent ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100' :
                            'bg-white border-gray-200 text-gray-300',
                          )}>
                            {isDone && !isCurrent
                              ? <CheckCircle2 size={14} />
                              : <span className="text-xs font-bold">{idx + 1}</span>
                            }
                          </div>
                          {!isLast && (
                            <div className={cn('w-0.5 h-8 mt-0.5', isDone ? 'bg-emerald-300' : 'bg-gray-100')} />
                          )}
                        </div>
                        <div className={cn('pt-1.5', isLast ? 'pb-0' : 'pb-6')}>
                          <p className={cn(
                            'text-sm font-semibold',
                            isCurrent ? 'text-blue-700' : isDone ? 'text-emerald-700' : 'text-gray-400',
                          )}>
                            {s.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                              الحالة الحالية
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isFailed && (
              <div className="bg-red-50 rounded-2xl border border-red-100 p-5 flex items-center gap-3">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-700">تعذّر التسليم</p>
                  <p className="text-sm text-red-600 mt-0.5">
                    {shipment.failureReason ?? 'تعذّر تسليم الشحنة. يرجى التواصل مع الدعم.'}
                  </p>
                </div>
              </div>
            )}

            {shipment.order && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Package size={15} className="text-blue-500" /> تفاصيل الطلب
                </h3>
                <p className="text-sm text-gray-600">
                  رقم الطلب: <span className="font-mono font-semibold">{shipment.order.orderNumber}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {!shipment && !loading && !error && (
          <div className="text-center py-10">
            <Truck size={52} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">أدخل رقم الشحنة للبدء بالتتبع</p>
          </div>
        )}
      </div>

      <div className="text-center py-6 text-xs text-gray-400">
        منصة جمارت للزراعة الرقمية &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
