'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, ratingsApi, disputesApi, shipmentBidsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatCurrency, formatNumber } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { ChevronRight, CheckCircle, XCircle, Package, MapPin, Phone, Truck, Clock, Star, Activity, FileText, Receipt, AlertCircle, DollarSign, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// ── Shipment bids — buyer picks the shipping offer ─────────────────────────
function ShipmentBidsSection({ shipmentId, isBuyer }: { shipmentId: string; isBuyer: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['shipment-bids', shipmentId],
    queryFn: () => shipmentBidsApi.listForShipment(shipmentId).then((r) => r.data),
    refetchInterval: 15_000, // bids arrive in real-time — refresh quietly
  });
  const accept = useMutation({
    mutationFn: (bidId: string) => shipmentBidsApi.accept(bidId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipment-bids', shipmentId] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });

  if (error) return null;
  const bids: any[] = data?.data ?? data ?? [];

  // Sort: PENDING first, cheapest first
  const sorted = [...bids].sort((a, b) => {
    if (a.status === b.status) return Number(a.quotedPrice) - Number(b.quotedPrice);
    return a.status === 'PENDING' ? -1 : 1;
  });
  const pendingCount = bids.filter((b) => b.status === 'PENDING').length;
  const hasAccepted = bids.some((b) => b.status === 'ACCEPTED');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Truck size={15} className="text-brand-500" />
          <h2 className="text-sm font-bold text-gray-700">عروض الشحن</h2>
        </div>
        {pendingCount > 0 && !hasAccepted && (
          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
            {pendingCount} عرض جديد
          </span>
        )}
        {hasAccepted && (
          <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle size={10} /> تم التعيين
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400 text-center py-4">جارٍ تحميل العروض…</p>
      ) : bids.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-xl">
          <Clock size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-bold">في انتظار عروض الشحن…</p>
          <p className="text-[10px] text-gray-400 mt-1">السائقون المؤهلون يتم إشعارهم. عادةً تصل العروض خلال ساعة.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((bid) => (
            <BidCard
              key={bid.id}
              bid={bid}
              canAccept={isBuyer && !hasAccepted && bid.status === 'PENDING'}
              onAccept={() => {
                if (confirm(`قبول عرض ${bid.driver?.fullName} بقيمة ${bid.quotedPrice} ر.س؟ سيتم رفض العروض الأخرى تلقائياً.`)) {
                  accept.mutate(bid.id);
                }
              }}
              accepting={accept.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BidCard({ bid, canAccept, onAccept, accepting }: { bid: any; canAccept: boolean; onAccept: () => void; accepting: boolean }) {
  const stateColors: Record<string, { bg: string; text: string; label: string }> = {
    PENDING:   { bg: 'bg-amber-50',   text: 'text-amber-700', label: 'قيد المراجعة' },
    ACCEPTED:  { bg: 'bg-green-50',   text: 'text-green-700', label: '✓ مقبول' },
    REJECTED:  { bg: 'bg-gray-50',    text: 'text-gray-500',  label: 'مرفوض' },
    WITHDRAWN: { bg: 'bg-gray-50',    text: 'text-gray-500',  label: 'مسحوب' },
    EXPIRED:   { bg: 'bg-gray-50',    text: 'text-gray-500',  label: 'منتهٍ' },
  };
  const s = stateColors[bid.status] ?? stateColors.PENDING;
  const driver = bid.driver ?? {};
  const isWinner = bid.status === 'ACCEPTED';

  return (
    <div className={`border rounded-xl p-3 ${isWinner ? 'border-green-300 bg-green-50/30' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${isWinner ? 'bg-green-600' : 'bg-brand-600'} text-white flex items-center justify-center font-bold flex-shrink-0`}>
          {driver.fullName?.[0] ?? '🚚'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{driver.fullName ?? 'سائق'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><Truck size={10} />{driver.vehicleType ?? '—'}</span>
                {driver.vehicleCapacityKg && (
                  <span>{Number(driver.vehicleCapacityKg)} كجم</span>
                )}
                {driver.hasRefrigeration && <span className="text-blue-600">❄ مبرد</span>}
                {driver.ratingAvg != null && (
                  <span className="flex items-center gap-0.5"><Star size={9} className="fill-amber-400 text-amber-400" />{Number(driver.ratingAvg).toFixed(1)}</span>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text} whitespace-nowrap`}>{s.label}</span>
          </div>

          <div className="flex items-baseline gap-1 mt-2">
            <DollarSign size={13} className="text-brand-600" />
            <span className="text-lg font-black text-brand-700">{formatCurrency(Number(bid.quotedPrice))}</span>
          </div>

          {(bid.estimatedPickupAt || bid.estimatedDeliveryAt) && (
            <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
              {bid.estimatedPickupAt && (
                <p>📍 الاستلام: {formatDate(bid.estimatedPickupAt)}</p>
              )}
              {bid.estimatedDeliveryAt && (
                <p>🏁 التسليم: {formatDate(bid.estimatedDeliveryAt)}</p>
              )}
            </div>
          )}

          {bid.notes && (
            <p className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 mt-2 italic">"{bid.notes}"</p>
          )}

          {canAccept && (
            <button
              onClick={onAccept}
              disabled={accepting}
              className="mt-3 w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle size={13} />
              {accepting ? 'جارٍ القبول…' : 'قبول هذا العرض'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const statusLabel: Record<string, string> = {
  PENDING: 'معلق', CONFIRMED: 'مؤكد', PROCESSING: 'جارٍ التجهيز',
  READY_FOR_PICKUP: 'جاهز للاستلام', IN_TRANSIT: 'في الطريق',
  DELIVERED: 'تم التوصيل', CANCELLED: 'ملغي', REJECTED: 'مرفوض',
};

// Order Status Timeline Component
const ORDER_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED'] as const;

function OrderStatusTimeline({ order }: { order: { status: string; statusHistory?: Array<{ id: string; toStatus: string; changedAt: string; reason?: string }> } }) {
  const history = order.statusHistory || [];
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REJECTED';
  const currentIdx = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={15} className="text-brand-500" />
        <h2 className="text-sm font-bold text-gray-700">سجل حالة الطلب</h2>
      </div>

      {isCancelled ? (
        <div className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
          <XCircle size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">{statusLabel[order.status]}</p>
            {history.length > 0 && history[history.length - 1].reason && (
              <p className="text-xs text-red-500 mt-0.5">{history[history.length - 1].reason}</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Progress steps */}
          <div className="flex items-center gap-0 mb-4 overflow-x-auto pb-1">
            {ORDER_FLOW.map((status, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={status} className="flex items-center flex-shrink-0">
                  <div className={`flex flex-col items-center gap-1 ${i === 0 ? '' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      done && !active ? 'bg-brand-500 text-white' :
                      active ? 'bg-brand-600 text-white ring-2 ring-brand-200' :
                      'bg-gray-100 text-gray-300'
                    }`}>
                      {done && !active ? <CheckCircle size={14} /> :
                       active ? <Clock size={13} className="animate-pulse" /> :
                       <span className="text-xs font-bold">{i + 1}</span>}
                    </div>
                    <span className="text-center whitespace-nowrap" style={{ fontSize: '9px', color: done ? '#059669' : active ? '#1d4ed8' : '#9ca3af' }}>
                      {statusLabel[status]}
                    </span>
                  </div>
                  {i < ORDER_FLOW.length - 1 && (
                    <div className={`h-0.5 w-6 mb-4 flex-shrink-0 ${i < currentIdx ? 'bg-brand-400' : 'bg-gray-100'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* History log */}
          {history.length > 0 && (
            <div className="space-y-2 border-t border-gray-50 pt-3">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">{statusLabel[h.toStatus] || h.toStatus}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(h.changedAt).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {h.reason && <p className="text-xs text-gray-400 mt-0.5">{h.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-indigo-50 text-indigo-700',
  READY_FOR_PICKUP: 'bg-purple-50 text-purple-700',
  IN_TRANSIT: 'bg-sky-50 text-sky-700',
  DELIVERED: 'bg-brand-50 text-brand-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isFarmer, isBuyer } = useAuth();
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id).then((r) => r.data),
  });

  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState('QUALITY');
  const [disputeDesc, setDisputeDesc] = useState('');

  const { data: myRating } = useQuery({
    queryKey: ['my-rating', id],
    queryFn: () => ratingsApi.getMyRatingForOrder(id).then((r) => r.data),
  });

  const submitRating = useMutation({
    mutationFn: () => {
      // Determine who to rate based on role
      const ratedId = isFarmer ? order?.buyerId : order?.items?.[0]?.farmerId;
      const ratedType = isFarmer ? 'BUYER' : 'FARMER';
      return ratingsApi.create({ orderId: id, ratedId, ratedType, score: ratingScore, comment: ratingComment || undefined });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-rating', id] }),
  });

  const accept = useMutation({
    mutationFn: () => ordersApi.accept(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
  });

  const reject = useMutation({
    mutationFn: () => ordersApi.reject(id, rejectReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order', id] }); setShowReject(false); },
  });

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id, cancelReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order', id] }); setShowCancel(false); },
  });

  const fileDispute = useMutation({
    mutationFn: () => {
      // The API requires `orderId`, `category`, `description`, plus the
      // counterparty (`againstId` + `againstType`). For a buyer filing a
      // dispute on a delivered order, the counterparty is the farmer of
      // the first item (orders are single-farmer in current schema).
      const againstFarmerId = order?.items?.[0]?.farmerId as string | undefined;
      if (!againstFarmerId) throw new Error('تعذّر تحديد الطرف المُشتكى عليه');
      return disputesApi.create({
        orderId: id,
        category: disputeCategory,
        description: disputeDesc,
        againstId: againstFarmerId,
        againstType: 'FARMER',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmer-disputes'] });
      setShowDisputeForm(false);
      setDisputeDesc('');
    },
  });

  if (isLoading) return <div className="py-20 text-center text-gray-400 text-sm">جارٍ التحميل…</div>;
  if (!order) return <div className="py-20 text-center text-red-400 text-sm">الطلب غير موجود</div>;

  // A farmer can accept/reject while the order is still awaiting confirmation.
  // The real OrderStatus enum uses DRAFT/SUBMITTED/PENDING_* (not "PENDING").
  const isPending = ['DRAFT', 'SUBMITTED', 'PENDING_ASSIGNMENT', 'PENDING_SUPPLIER_CONFIRMATION'].includes(order.status);
  const isActive = ['CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'IN_TRANSIT'].includes(order.status);
  const isCancellable = isPending || (isFarmer ? false : isActive);

  return (
    <div className="sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/orders" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronRight size={18} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-900">{order.orderNumber}</h1>
          <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`mr-auto text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[order.status] || 'bg-gray-100 text-gray-600'}`}>
          {statusLabel[order.status] || order.status}
        </span>
      </div>

      {/* Counterparty info */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 mb-3">
          {isFarmer ? 'معلومات المشتري' : 'معلومات المزارع'}
        </h2>
        <div className="space-y-2">
          {isFarmer ? (
            order.buyer && (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package size={14} className="text-gray-400" /> {order.buyer.businessName}
                </div>
                {order.buyer.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400" /> {order.buyer.phone}
                  </div>
                )}
              </>
            )
          ) : (
            order.items?.[0]?.farmer && (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package size={14} className="text-gray-400" /> {order.items[0].farmer.businessName}
                </div>
                {order.items[0].farmer.contactPhone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400" /> {order.items[0].farmer.contactPhone}
                  </div>
                )}
              </>
            )
          )}
          {order.requestedDeliveryAt && (
            <p className="text-xs text-gray-400 mt-1">
              التوصيل المطلوب: {formatDate(order.requestedDeliveryAt)}
            </p>
          )}
        </div>
      </div>

      {/* Delivery address — uses saved branch when present, else raw address */}
      {(order.buyerBranch || order.deliveryAddress) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <MapPin size={15} className="text-brand-600" />
            عنوان التوصيل
          </h2>
          <div className="space-y-1.5">
            {order.buyerBranch?.branchName && (
              <p className="text-sm font-semibold text-gray-900">{order.buyerBranch.branchName}</p>
            )}
            <p className="text-sm text-gray-600 leading-relaxed">
              {order.buyerBranch?.address || order.deliveryAddress}
            </p>
            {order.buyerBranch?.contactPhone && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Phone size={12} className="text-gray-400" />
                {order.buyerBranch.contactPhone}
                {order.buyerBranch.contactName ? ` — ${order.buyerBranch.contactName}` : ''}
              </p>
            )}
            {order.buyerBranch?.deliveryNotes && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-1">
                📋 {order.buyerBranch.deliveryNotes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Shipment tracking (buyer view when in transit) */}
      {!isFarmer && order.status === 'IN_TRANSIT' && (
        <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
          <div className="flex items-center gap-2 text-sky-700 font-bold text-sm mb-2">
            <Truck size={16} /> تتبع الشحنة
          </div>
          <div className="flex items-center gap-2 text-sm text-sky-600 mb-3">
            <Clock size={14} />
            {order.requestedDeliveryAt
              ? `التسليم المتوقع: ${formatDate(order.requestedDeliveryAt)}`
              : 'الشحنة في الطريق إليك'}
          </div>
          <Link
            href="/shipments"
            className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          >
            <Truck size={14} />
            تتبع الشحنة الآن
          </Link>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <h2 className="text-sm font-bold text-gray-700 px-4 py-3 border-b border-gray-100">الأصناف</h2>
        <div className="divide-y divide-gray-100">
          {order.items?.map((item: {
            id: string;
            product?: { name: string };
            requestedQty: number;
            unitOfMeasure?: string;
            unitPrice?: number;
            subtotal?: number;
          }) => (
            <div key={item.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.product?.name || 'منتج'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatNumber(item.requestedQty)} {item.unitOfMeasure || 'كغ'}
                  {item.unitPrice ? ` × ${item.unitPrice} ر.س` : ''}
                </p>
              </div>
              {item.subtotal && (
                <p className="text-sm font-bold text-gray-900">{formatCurrency(item.subtotal)}</p>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex justify-between">
          <span className="text-sm font-bold text-gray-700">الإجمالي</span>
          <span className="text-sm font-bold text-brand-700">
            {formatCurrency(order.totalAmount)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {order.buyerNotes && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-xs font-bold text-amber-700 mb-1">ملاحظات</p>
          <p className="text-sm text-amber-800">{order.buyerNotes}</p>
        </div>
      )}

      {/* Related Documents: Invoice + Contract */}
      {(order.invoice || order.contract) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
          <h2 className="text-sm font-bold text-gray-700 mb-1">المستندات المرتبطة</h2>
          {order.invoice && (
            <Link
              href={`/payments?invoice=${order.invoice.id}`}
              className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-900">{order.invoice.invoiceNumber || 'الفاتورة'}</p>
                  <p className="text-xs text-amber-600">{formatCurrency(order.invoice.totalAmount || order.totalAmount)}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-amber-400 rotate-180" />
            </Link>
          )}
          {order.contract && (
            <Link
              href={`/contracts/${order.contract.id}`}
              className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-100 hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-900">{order.contract.contractNumber || 'العقد'}</p>
                  <p className="text-xs text-purple-600">{order.contract.title || 'عقد مرتبط بهذا الطلب'}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-purple-400 rotate-180" />
            </Link>
          )}
        </div>
      )}

      {/* Order Status Timeline */}
      <OrderStatusTimeline order={order} />

      {/* ── Shipment bids (visible once a shipment exists) ── */}
      {(order as any).shipment?.id && (
        <ShipmentBidsSection shipmentId={(order as any).shipment.id} isBuyer={!!isBuyer} />
      )}

      {/* ── FARMER ACTIONS ── */}
      {isFarmer && isPending && (
        <div className="space-y-3">
          {!showReject ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
                className="flex items-center justify-center gap-2 bg-brand-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                <CheckCircle size={16} />
                {accept.isPending ? 'جارٍ القبول…' : 'قبول الطلب'}
              </button>
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3.5 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors border border-red-200"
              >
                <XCircle size={16} /> رفض الطلب
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 space-y-3">
              <p className="text-sm font-bold text-red-600">سبب الرفض</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="أخبر المشتري سبب رفض طلبه…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowReject(false)} className="py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                  إلغاء
                </button>
                <button
                  onClick={() => reject.mutate()}
                  disabled={reject.isPending || !rejectReason.trim()}
                  className="py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50"
                >
                  {reject.isPending ? 'جارٍ الرفض…' : 'تأكيد الرفض'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BUYER ACTIONS ── */}
      {!isFarmer && isCancellable && (
        <div className="space-y-3">
          {!showCancel ? (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3.5 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors border border-red-200"
            >
              <XCircle size={16} /> إلغاء الطلب
            </button>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 space-y-3">
              <p className="text-sm font-bold text-red-600">سبب الإلغاء</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="لماذا تريد إلغاء هذا الطلب؟"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowCancel(false)} className="py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                  تراجع
                </button>
                <button
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending || !cancelReason.trim()}
                  className="py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50"
                >
                  {cancel.isPending ? 'جارٍ الإلغاء…' : 'تأكيد الإلغاء'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RATING SECTION ── (only for DELIVERED orders) */}
      {order.status === 'DELIVERED' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold text-gray-700">التقييم</h2>
          </div>
          {myRating ? (
            <div className="text-center py-3">
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={22}
                    className={s <= myRating.score ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500">
                {myRating.comment || 'لقد قيّمت هذا الطلب'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                {isFarmer ? 'قيّم المشتري' : 'قيّم المزارع'}
              </p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRatingScore(s)}>
                    <Star
                      size={28}
                      className={`transition-colors ${s <= ratingScore ? 'text-amber-400 fill-amber-400' : 'text-gray-200 hover:text-amber-300'}`}
                    />
                  </button>
                ))}
              </div>
              {ratingScore > 0 && (
                <>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={2}
                    placeholder="أضف تعليقاً (اختياري)…"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                  <button
                    onClick={() => submitRating.mutate()}
                    disabled={submitRating.isPending}
                    className="w-full bg-amber-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {submitRating.isPending ? 'جارٍ الإرسال…' : 'إرسال التقييم'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DISPUTE SECTION ── (delivered orders, buyer only) */}
      {!isFarmer && order.status === 'DELIVERED' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              <h2 className="text-sm font-bold text-gray-700">رفع نزاع</h2>
            </div>
            {!showDisputeForm && (
              <button
                onClick={() => setShowDisputeForm(true)}
                className="text-xs text-red-600 hover:text-red-700 font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                رفع نزاع
              </button>
            )}
          </div>
          {showDisputeForm ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">نوع المشكلة</label>
                <select
                  value={disputeCategory}
                  onChange={(e) => setDisputeCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                >
                  {/* Must match Prisma DisputeCategory enum */}
                  <option value="QUALITY">مشكلة في الجودة</option>
                  <option value="QUANTITY">مشكلة في الكمية</option>
                  <option value="LOGISTICS">مشكلة في التوصيل</option>
                  <option value="FINANCIAL">مشكلة مالية</option>
                  <option value="CONTRACT">مخالفة عقد</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">وصف المشكلة</label>
                <textarea
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  rows={3}
                  placeholder="اشرح المشكلة بالتفصيل…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowDisputeForm(false)} className="py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                  إلغاء
                </button>
                <button
                  onClick={() => fileDispute.mutate()}
                  disabled={fileDispute.isPending || !disputeDesc.trim()}
                  className="py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-red-700 transition-colors"
                >
                  {fileDispute.isPending ? 'جارٍ الإرسال…' : 'إرسال النزاع'}
                </button>
              </div>
              {fileDispute.isSuccess && (
                <p className="text-xs text-brand-600 text-center font-medium">✓ تم رفع النزاع بنجاح</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              إذا واجهت مشكلة في هذا الطلب، يمكنك رفع نزاع وسيتولى فريقنا المراجعة.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
