'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bidsApi } from '@/lib/api';
import { useState } from 'react';
import { Truck, MapPin, Package, Clock, AlertCircle, CheckCircle, Send, X } from 'lucide-react';

export default function OpenShipmentsPage() {
  const qc = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['driver-open-shipments'],
    queryFn: () => bidsApi.open().then((r) => r.data),
    refetchInterval: 30_000, // auto-refresh feed
  });

  const items: any[] = data?.data ?? data ?? [];
  const [bidFor, setBidFor] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Truck size={20} className="text-emerald-600" />
            فرص الشحن المتاحة
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{items.length} شحنة بانتظار عرضك</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
          disabled={isFetching}
        >
          {isFetching ? 'تحديث…' : 'تحديث'}
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-gray-400 py-10">جارٍ التحميل…</p>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <ShipmentCard key={s.id} shipment={s} onBid={() => setBidFor(s)} />
          ))}
        </div>
      )}

      {bidFor && (
        <BidModal
          shipment={bidFor}
          onClose={() => setBidFor(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['driver-open-shipments'] });
            qc.invalidateQueries({ queryKey: ['driver-my-bids'] });
            setBidFor(null);
          }}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
        <Clock size={28} />
      </div>
      <p className="font-bold text-gray-700">لا توجد فرص شحن حالياً</p>
      <p className="text-xs text-gray-500 mt-1">سنُشعرك فوراً عندما تتوفر شحنة في منطقتك.</p>
    </div>
  );
}

function ShipmentCard({ shipment, onBid }: { shipment: any; onBid: () => void }) {
  const eligible = shipment.eligibility?.pickup && shipment.eligibility?.delivery;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-xs text-gray-500">رقم الشحنة</p>
            <p className="font-black text-gray-900 text-sm">{shipment.shipmentNumber}</p>
          </div>
          <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-full">
            🆕 جديد
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 my-3">
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <MapPin size={10} /> الاستلام من
            </p>
            <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">
              {shipment.pickupZone?.zoneNameAr ?? shipment.pickupZone?.zoneName ?? '—'}
            </p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
              <MapPin size={10} /> التسليم إلى
            </p>
            <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">
              {shipment.deliveryZone?.zoneNameAr ?? shipment.deliveryZone?.zoneName ?? '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
          <span className="flex items-center gap-1">
            <Package size={13} className="text-gray-400" />
            <strong>{Number(shipment.declaredWeightKg ?? 0)}</strong> كجم
          </span>
          <span className="flex items-center gap-1">
            <Truck size={13} className="text-gray-400" />
            عروض حالية: <strong>{shipment._count?.bids ?? 0}</strong>
          </span>
          {shipment.order?.orderNumber && (
            <span className="text-gray-500">📋 {shipment.order.orderNumber}</span>
          )}
        </div>

        {!eligible && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 flex items-center gap-2">
            <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
            <p className="text-[11px] text-amber-700">
              هذه الشحنة خارج مناطقك المعتمدة. يمكنك المشاركة لكن أولوية الفوز للسائقين المحليين.
            </p>
          </div>
        )}

        <button
          onClick={onBid}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <Send size={14} />
          قدّم عرضك
        </button>
      </div>
    </div>
  );
}

function BidModal({ shipment, onClose, onDone }: { shipment: any; onClose: () => void; onDone: () => void }) {
  const [price, setPrice] = useState('');
  const [pickupAt, setPickupAt] = useState('');
  const [deliveryAt, setDeliveryAt] = useState('');
  const [notes, setNotes] = useState('');

  const submit = useMutation({
    mutationFn: () => bidsApi.submit(shipment.id, {
      quotedPrice: Number(price),
      estimatedPickupAt:   pickupAt   ? new Date(pickupAt).toISOString()   : undefined,
      estimatedDeliveryAt: deliveryAt ? new Date(deliveryAt).toISOString() : undefined,
      notes: notes.trim() || undefined,
    }),
    onSuccess: onDone,
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-gray-900">قدّم عرضك للشحنة</h2>
            <p className="text-xs text-gray-500">{shipment.shipmentNumber} · {Number(shipment.declaredWeightKg)} كجم</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {submit.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-500 mt-0.5" />
            <p className="text-xs text-red-700">{(submit.error as any)?.response?.data?.message ?? 'فشل التقديم'}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">السعر المعروض (ر.س) *</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="مثلاً 220"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">وقت الاستلام المتوقع</label>
              <input
                type="datetime-local" value={pickupAt}
                onChange={(e) => setPickupAt(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">وقت التسليم المتوقع</label>
              <input
                type="datetime-local" value={deliveryAt}
                onChange={(e) => setDeliveryAt(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">ملاحظات (اختياري)</label>
            <textarea
              rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: سيارة مبردة، استلام مباشر، إلخ"
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-700">
            💡 السعر شامل (وقود، سائق، تأمين). المشتري سيختار بناءً على السعر، السرعة، والتقييم.
          </div>

          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !price || Number(price) <= 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle size={15} />
            {submit.isPending ? 'جارٍ التقديم…' : 'تقديم العرض'}
          </button>
        </div>
      </div>
    </div>
  );
}
