'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, logisticsApi, financialApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import {
  ChevronRight, XCircle, Truck, FileText, Package,
  Clock, CheckCircle2, Activity, Loader2, AlertCircle,
  DollarSign, MapPin, Phone, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_AR: Record<string, string> = {
  PENDING: 'معلق', CONFIRMED: 'مؤكد', PROCESSING: 'جارٍ التجهيز',
  READY_FOR_PICKUP: 'جاهز للاستلام', IN_TRANSIT: 'في الطريق',
  DELIVERED: 'تم التوصيل', CANCELLED: 'ملغي', REJECTED: 'مرفوض',
};

const ORDER_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [statusModal, setStatusModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [shipmentModal, setShipmentModal] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [shipmentData, setShipmentData] = useState({
    scheduledPickupAt: '',
    estimatedDeliveryAt: '',
    notes: '',
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id).then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: () => ordersApi.updateStatus(id, newStatus, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      setStatusModal(false);
      setReason('');
    },
  });

  const cancelOrder = useMutation({
    mutationFn: () => ordersApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      setCancelModal(false);
      setReason('');
    },
  });

  const createShipment = useMutation({
    mutationFn: () => logisticsApi.create({
      orderId: id,
      scheduledPickupAt: shipmentData.scheduledPickupAt || undefined,
      estimatedDeliveryAt: shipmentData.estimatedDeliveryAt || undefined,
      notes: shipmentData.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      setShipmentModal(false);
    },
  });

  const createInvoice = useMutation({
    mutationFn: () => financialApi.createInvoice({ orderId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      setInvoiceModal(false);
    },
  });

  if (isLoading) return <PageSpinner />;
  if (!order) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle size={40} className="text-red-400" />
      <p className="text-gray-600">لم يُعثر على الطلب</p>
      <Link href="/orders" className="text-brand-600 text-sm hover:underline">العودة</Link>
    </div>
  );

  const isClosed = ['CANCELLED', 'DELIVERED'].includes(order.status);
  const currentIdx = ORDER_FLOW.indexOf(order.status);

  return (
    <div className="space-y-5 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
          <div>
            <h2 className="text-xl font-black text-gray-900">{order.orderNumber}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={order.status} />
              <span className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isClosed && (
            <Button variant="secondary" size="sm" onClick={() => { setNewStatus(order.status); setStatusModal(true); }}>
              تغيير الحالة
            </Button>
          )}
          {!order.shipment && !isClosed && (
            <Button size="sm" onClick={() => setShipmentModal(true)}>
              <Truck size={14} />
              إنشاء شحنة
            </Button>
          )}
          {!order.invoice && !isClosed && (
            <Button size="sm" onClick={() => setInvoiceModal(true)}>
              <FileText size={14} />
              إنشاء فاتورة
            </Button>
          )}
          {!isClosed && (
            <Button variant="danger" size="sm" onClick={() => setCancelModal(true)}>
              <XCircle size={14} />
              إلغاء
            </Button>
          )}
        </div>
      </div>

      {/* Status flow */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={15} className="text-brand-500" />
          <h3 className="text-sm font-bold text-gray-800">مراحل الطلب</h3>
        </div>
        <div className="flex items-center justify-between overflow-x-auto pb-1">
          {ORDER_FLOW.map((status, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={status} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                    done && !active ? 'bg-emerald-500 text-white' :
                    active ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
                    'bg-gray-100 text-gray-300'
                  )}>
                    {done && !active ? <CheckCircle2 size={15} /> :
                     active ? <Clock size={14} className="animate-pulse" /> :
                     <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  <span className="whitespace-nowrap text-center" style={{ fontSize: '9px', color: done ? '#065f46' : active ? '#1d4ed8' : '#9ca3af' }}>
                    {STATUS_AR[status]}
                  </span>
                </div>
                {i < ORDER_FLOW.length - 1 && (
                  <div className={cn('h-0.5 w-8 mb-4 flex-shrink-0', i < currentIdx ? 'bg-emerald-400' : 'bg-gray-100')} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Buyer */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <User size={14} className="text-brand-500" />
              معلومات المشتري
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">الشركة</p>
                <p className="font-semibold text-gray-800">{order.buyer?.businessName || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">جهة الاتصال</p>
                <p className="font-semibold text-gray-800">{order.buyer?.contactPersonName || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">الجوال</p>
                <p className="font-semibold text-gray-800">{order.buyer?.contactPhone || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">الفرع</p>
                <p className="font-semibold text-gray-800">{order.buyerBranch?.branchName || '—'}</p>
              </div>
            </div>

            {/* Delivery address — the full address the driver needs */}
            <div className="mt-3 bg-brand-50 border border-brand-100 rounded-xl p-3">
              <p className="text-xs font-bold text-brand-700 mb-1 flex items-center gap-1.5">
                <MapPin size={13} />
                عنوان التوصيل
              </p>
              <p className="text-sm text-gray-800 leading-relaxed">
                {order.buyerBranch?.address || order.deliveryAddress || '—'}
              </p>
              {order.buyerBranch?.contactPhone && (
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                  <Phone size={11} />
                  {order.buyerBranch.contactPhone}
                  {order.buyerBranch.contactName ? ` — ${order.buyerBranch.contactName}` : ''}
                </p>
              )}
              {order.buyerBranch?.deliveryNotes && (
                <p className="text-xs text-amber-700 mt-1">📋 {order.buyerBranch.deliveryNotes}</p>
              )}
            </div>

            {order.buyerNotes && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-1">ملاحظات المشتري</p>
                <p className="text-sm text-amber-800">{order.buyerNotes}</p>
              </div>
            )}
          </Card>

          {/* Items */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Package size={14} className="text-brand-500" />
              <h3 className="text-sm font-bold text-gray-800">الأصناف</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">المنتج</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">المزارع</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">الدرجة</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">الكمية</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">السعر</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-right">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(order.items || []).map((item: {
                    id: string;
                    product?: { name: string };
                    farmer?: { businessName: string };
                    grade?: string;
                    requestedQty: number;
                    unitPrice: number;
                    subtotal: number;
                    unitOfMeasure?: string;
                  }) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{item.product?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{item.farmer?.businessName || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{item.grade || '—'}</td>
                      <td className="px-4 py-3">{item.requestedQty} {item.unitOfMeasure || 'كغ'}</td>
                      <td className="px-4 py-3">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm font-bold text-gray-700">المجموع الكلي</span>
              <span className="text-base font-black text-brand-700">{formatCurrency(order.totalAmount)}</span>
            </div>
          </Card>

          {/* Status History */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity size={14} className="text-brand-500" />
              سجل الحالات
            </h3>
            {(order.statusHistory || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">لا يوجد سجل بعد</p>
            ) : (
              <ol className="relative border-r-2 border-gray-100 mr-3 space-y-4">
                {(order.statusHistory || []).map((h: {
                  id: string;
                  status?: string;
                  fromStatus?: string;
                  toStatus?: string;
                  changedAt: string;
                  reason?: string;
                }) => {
                  const status = h.toStatus || h.status || '';
                  return (
                    <li key={h.id} className="mr-4">
                      <div className="absolute -right-1.5 mt-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-white" />
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.fromStatus && <StatusBadge status={h.fromStatus} />}
                        {h.fromStatus && <span className="text-gray-300 text-xs">←</span>}
                        <StatusBadge status={status} />
                        <span className="text-xs text-gray-400 mr-auto">{formatDateTime(h.changedAt)}</span>
                      </div>
                      {h.reason && <p className="text-xs text-gray-500 mt-0.5">{h.reason}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Summary */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <DollarSign size={14} className="text-brand-500" />
              ملخص الطلب
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">النوع</dt>
                <dd className="font-medium">{order.orderType || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">تاريخ الطلب</dt>
                <dd className="font-medium">{formatDate(order.createdAt)}</dd>
              </div>
              {order.requestedDeliveryAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">التسليم المطلوب</dt>
                  <dd className="font-medium">{formatDate(order.requestedDeliveryAt)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <dt className="font-bold text-gray-700">الإجمالي</dt>
                <dd className="font-black text-brand-700 text-base">{formatCurrency(order.totalAmount)}</dd>
              </div>
            </dl>
          </Card>

          {/* Invoice */}
          {order.invoice ? (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FileText size={14} className="text-emerald-500" />
                الفاتورة
              </h3>
              <p className="text-sm font-bold text-brand-700">{order.invoice.invoiceNumber}</p>
              <StatusBadge status={order.invoice.status} />
              <p className="text-base font-black mt-2">{formatCurrency(order.invoice.totalAmount)}</p>
              <Link href={`/financial/invoices/${order.invoice.id}`} className="text-xs text-brand-600 hover:underline mt-1 block">
                عرض التفاصيل
              </Link>
            </Card>
          ) : (
            !isClosed && (
              <Card className="p-4 border-dashed">
                <div className="text-center text-gray-400">
                  <FileText size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs mb-2">لا توجد فاتورة بعد</p>
                  <button
                    onClick={() => setInvoiceModal(true)}
                    className="text-xs text-brand-600 hover:underline font-medium"
                  >
                    إنشاء فاتورة
                  </button>
                </div>
              </Card>
            )
          )}

          {/* Shipment */}
          {order.shipment ? (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Truck size={14} className="text-blue-500" />
                الشحنة
              </h3>
              <p className="text-sm font-bold text-brand-700">{order.shipment.shipmentNumber}</p>
              <StatusBadge status={order.shipment.status} />
              {order.shipment.estimatedDeliveryAt && (
                <p className="text-xs text-gray-400 mt-1">
                  التسليم المتوقع: {formatDate(order.shipment.estimatedDeliveryAt)}
                </p>
              )}
              <Link href={`/logistics/${order.shipment.id}`} className="text-xs text-brand-600 hover:underline mt-1 block">
                عرض تفاصيل الشحنة
              </Link>
            </Card>
          ) : (
            !isClosed && (
              <Card className="p-4 border-dashed">
                <div className="text-center text-gray-400">
                  <Truck size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs mb-2">لا توجد شحنة بعد</p>
                  <button
                    onClick={() => setShipmentModal(true)}
                    className="text-xs text-brand-600 hover:underline font-medium"
                  >
                    إنشاء شحنة
                  </button>
                </div>
              </Card>
            )
          )}

          {/* Contract */}
          {order.contract && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">العقد المرتبط</h3>
              <p className="text-sm font-bold text-brand-700">{order.contract.contractNumber}</p>
              <StatusBadge status={order.contract.status} />
              <Link href={`/contracts/${order.contract.id}`} className="text-xs text-brand-600 hover:underline mt-1 block">
                عرض العقد
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Update Status Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="تغيير حالة الطلب">
        <div className="space-y-4">
          <Select
            label="الحالة الجديدة"
            options={STATUS_OPTIONS}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <Input
            label="السبب (اختياري)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب تغيير الحالة"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setStatusModal(false)}>إلغاء</Button>
            <Button onClick={() => updateStatus.mutate()} loading={updateStatus.isPending} disabled={!newStatus}>
              تحديث
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="إلغاء الطلب">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            هل أنت متأكد من إلغاء الطلب <strong>{order.orderNumber}</strong>؟
          </p>
          <Input
            label="سبب الإلغاء"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مطلوب"
            required
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setCancelModal(false)}>تراجع</Button>
            <Button variant="danger" onClick={() => cancelOrder.mutate()} loading={cancelOrder.isPending} disabled={!reason.trim()}>
              تأكيد الإلغاء
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Shipment Modal */}
      <Modal open={shipmentModal} onClose={() => setShipmentModal(false)} title="إنشاء شحنة">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">سيتم إنشاء شحنة مرتبطة بهذا الطلب.</p>
          <Input
            label="تاريخ الاستلام المجدول (اختياري)"
            type="date"
            value={shipmentData.scheduledPickupAt}
            onChange={(e) => setShipmentData((d) => ({ ...d, scheduledPickupAt: e.target.value }))}
          />
          <Input
            label="تاريخ التسليم المتوقع (اختياري)"
            type="date"
            value={shipmentData.estimatedDeliveryAt}
            onChange={(e) => setShipmentData((d) => ({ ...d, estimatedDeliveryAt: e.target.value }))}
          />
          <Input
            label="ملاحظات (اختياري)"
            value={shipmentData.notes}
            onChange={(e) => setShipmentData((d) => ({ ...d, notes: e.target.value }))}
            placeholder="أي تعليمات خاصة"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShipmentModal(false)}>إلغاء</Button>
            <Button onClick={() => createShipment.mutate()} loading={createShipment.isPending}>
              <Truck size={14} />
              إنشاء الشحنة
            </Button>
          </div>
          {createShipment.isError && (
            <p className="text-xs text-red-500 text-center">حدث خطأ أثناء إنشاء الشحنة</p>
          )}
        </div>
      </Modal>

      {/* Create Invoice Modal */}
      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title="إنشاء فاتورة">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-2">سيتم إنشاء فاتورة بالتفاصيل التالية:</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الطلب</span>
              <span className="font-semibold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">المجموع</span>
              <span className="font-bold text-brand-700">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setInvoiceModal(false)}>إلغاء</Button>
            <Button onClick={() => createInvoice.mutate()} loading={createInvoice.isPending}>
              <FileText size={14} />
              إنشاء الفاتورة
            </Button>
          </div>
          {createInvoice.isError && (
            <p className="text-xs text-red-500 text-center">حدث خطأ أثناء إنشاء الفاتورة</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
