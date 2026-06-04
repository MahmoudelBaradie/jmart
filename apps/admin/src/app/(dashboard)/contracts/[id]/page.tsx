'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Link from 'next/link';
import {
  ChevronRight, FileText, CheckCircle2, PenLine, XCircle,
  Calendar, User, Package, DollarSign, Loader2, AlertTriangle,
  Building2, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_AR: Record<string, string> = {
  DRAFT: 'مسودة',
  UNDER_REVIEW: 'تحت المراجعة',
  PENDING_SIGNATURES: 'بانتظار التوقيعات',
  PARTIALLY_SIGNED: 'موقع جزئياً',
  ACTIVE: 'نشط',
  SUSPENDED: 'موقوف',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي',
  EXPIRED: 'منتهي',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'text-gray-700 bg-gray-100',
  UNDER_REVIEW: 'text-blue-700 bg-blue-50',
  PENDING_SIGNATURES: 'text-amber-700 bg-amber-50',
  PARTIALLY_SIGNED: 'text-orange-700 bg-orange-50',
  ACTIVE: 'text-emerald-700 bg-emerald-50',
  SUSPENDED: 'text-red-700 bg-red-50',
  COMPLETED: 'text-purple-700 bg-purple-50',
  CANCELLED: 'text-red-700 bg-red-50',
  EXPIRED: 'text-gray-700 bg-gray-100',
};

const CONTRACT_FLOW = [
  'DRAFT', 'UNDER_REVIEW', 'PENDING_SIGNATURES', 'PARTIALLY_SIGNED', 'ACTIVE', 'COMPLETED',
];

const PRICE_LOCK_AR: Record<string, string> = {
  FIXED: 'سعر ثابت',
  BANDED: 'نطاق سعري',
  MARKET_RATE: 'سعر السوق',
  NEGOTIATED_MONTHLY: 'تفاوض شهري',
};

const CONTRACT_TYPE_AR: Record<string, string> = {
  SUPPLY: 'توريد',
  EXCLUSIVE: 'حصري',
  TENDER_AWARD: 'ترسية مناقصة',
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [signModal, setSignModal] = useState(false);
  const [terminateModal, setTerminateModal] = useState(false);
  const [signerType, setSignerType] = useState('farmer');
  const [terminateReason, setTerminateReason] = useState('');

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.get(id).then((r) => r.data),
  });

  const signMutation = useMutation({
    mutationFn: () => contractsApi.sign(id, { signerType: signerType as 'farmer' | 'buyer' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract', id] });
      setSignModal(false);
    },
  });

  const terminateMutation = useMutation({
    mutationFn: () => contractsApi.terminate(id, terminateReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract', id] });
      setTerminateModal(false);
      setTerminateReason('');
    },
  });

  if (isLoading) return <PageSpinner />;
  if (!contract) return <div className="text-center py-16 text-gray-500">العقد غير موجود</div>;

  const statusIndex = CONTRACT_FLOW.indexOf(contract.status);
  const canSign = ['PENDING_SIGNATURES', 'PARTIALLY_SIGNED'].includes(contract.status);
  const canTerminate = ['ACTIVE', 'PARTIALLY_SIGNED', 'PENDING_SIGNATURES'].includes(contract.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/contracts" className="hover:text-gray-700">العقود</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{contract.contractNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{contract.contractNumber}</h1>
            <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', STATUS_COLOR[contract.status] ?? 'bg-gray-100 text-gray-700')}>
              {STATUS_AR[contract.status] ?? contract.status}
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            {CONTRACT_TYPE_AR[contract.contractType] ?? contract.contractType} •{' '}
            {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canSign && (
            <Button variant="primary" icon={<PenLine size={15} />} onClick={() => setSignModal(true)}>
              توقيع العقد
            </Button>
          )}
          {canTerminate && (
            <Button variant="danger" icon={<XCircle size={15} />} onClick={() => setTerminateModal(true)}>
              إنهاء العقد
            </Button>
          )}
        </div>
      </div>

      {/* Progress timeline */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          مسار العقد
        </h2>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {CONTRACT_FLOW.map((step, i) => {
            const done = statusIndex > i;
            const current = statusIndex === i;
            return (
              <div key={step} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                    done ? 'bg-emerald-500 border-emerald-500 text-white' :
                    current ? 'bg-blue-600 border-blue-600 text-white' :
                    'bg-white border-gray-300 text-gray-400',
                  )}>
                    {done ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium text-center max-w-[70px]',
                    current ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-gray-400',
                  )}>
                    {STATUS_AR[step]}
                  </span>
                </div>
                {i < CONTRACT_FLOW.length - 1 && (
                  <div className={cn('h-0.5 w-10 mx-1 -mt-4', done ? 'bg-emerald-400' : 'bg-gray-200')} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Parties */}
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={16} className="text-purple-500" />
              أطراف العقد
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="text-xs text-green-600 font-medium mb-1">المزارع / المورد</p>
                <p className="font-semibold text-gray-900">
                  {contract.farmer?.businessName ?? '—'}
                </p>
                <Link
                  href={`/farmers/${contract.farmerId}`}
                  className="text-xs text-green-700 hover:underline mt-1 block"
                >
                  عرض الملف الشخصي ←
                </Link>
                <div className="mt-2 flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    contract.farmerSignedAt ? 'bg-emerald-500' : 'bg-amber-400',
                  )} />
                  <span className="text-xs text-gray-500">
                    {contract.farmerSignedAt
                      ? `وقّع ${formatDate(contract.farmerSignedAt)}`
                      : 'لم يوقع بعد'}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-600 font-medium mb-1">المشتري</p>
                <p className="font-semibold text-gray-900">
                  {contract.buyer?.businessName ?? '—'}
                </p>
                <Link
                  href={`/buyers/${contract.buyerId}`}
                  className="text-xs text-blue-700 hover:underline mt-1 block"
                >
                  عرض الملف الشخصي ←
                </Link>
                <div className="mt-2 flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    contract.buyerSignedAt ? 'bg-emerald-500' : 'bg-amber-400',
                  )} />
                  <span className="text-xs text-gray-500">
                    {contract.buyerSignedAt
                      ? `وقّع ${formatDate(contract.buyerSignedAt)}`
                      : 'لم يوقع بعد'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Contract items */}
          {(contract.items ?? []).length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package size={16} className="text-blue-500" />
                بنود العقد
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-xs">
                      <th className="text-right py-2 font-medium">المنتج</th>
                      <th className="text-right py-2 font-medium">الكمية</th>
                      <th className="text-right py-2 font-medium">الوحدة</th>
                      <th className="text-right py-2 font-medium">نوع السعر</th>
                      <th className="text-right py-2 font-medium">السعر</th>
                      <th className="text-right py-2 font-medium">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(contract.items ?? []).map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-medium text-gray-900">
                          {item.product?.nameAr ?? item.product?.name ?? '—'}
                        </td>
                        <td className="py-3 text-gray-700">{Number(item.committedQty).toLocaleString('ar-SA')}</td>
                        <td className="py-3 text-gray-500">{item.product?.unitOfMeasure}</td>
                        <td className="py-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {PRICE_LOCK_AR[item.priceLockType] ?? item.priceLockType}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-green-700">
                          {item.agreedUnitPrice ? formatCurrency(item.agreedUnitPrice) : '—'}
                        </td>
                        <td className="py-3 font-semibold text-gray-900">
                          {item.agreedUnitPrice && item.committedQty
                            ? formatCurrency(Number(item.agreedUnitPrice) * Number(item.committedQty))
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Termination reason */}
          {contract.terminationReason && (
            <Card>
              <div className="flex items-start gap-3 text-red-700">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">سبب الإنهاء</p>
                  <p className="text-sm text-red-600">{contract.terminationReason}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Financial summary */}
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" />
              الملخص المالي
            </h2>
            <div className="space-y-3">
              <InfoRow label="قيمة العقد الكلية" value={contract.totalValue ? formatCurrency(contract.totalValue) : '—'} bold />
              <InfoRow label="الدفعات المسددة" value={contract.paidAmount ? formatCurrency(contract.paidAmount) : '—'} />
              <InfoRow
                label="المبلغ المتبقي"
                value={
                  contract.totalValue && contract.paidAmount
                    ? formatCurrency(Number(contract.totalValue) - Number(contract.paidAmount))
                    : '—'
                }
              />
              <InfoRow label="شروط التسوية" value={contract.settlementFrequency ?? '—'} />
            </div>
          </Card>

          {/* Key dates */}
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-amber-500" />
              التواريخ المهمة
            </h2>
            <div className="space-y-3">
              <InfoRow label="تاريخ الإنشاء" value={formatDate(contract.createdAt)} />
              <InfoRow label="تاريخ البداية" value={formatDate(contract.startDate)} />
              <InfoRow label="تاريخ الانتهاء" value={formatDate(contract.endDate)} />
              {contract.farmerSignedAt && <InfoRow label="توقيع المزارع" value={formatDate(contract.farmerSignedAt)} />}
              {contract.buyerSignedAt && <InfoRow label="توقيع المشتري" value={formatDate(contract.buyerSignedAt)} />}
            </div>
          </Card>

          {/* Contract metadata */}
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              معلومات العقد
            </h2>
            <div className="space-y-3">
              <InfoRow label="نوع العقد" value={CONTRACT_TYPE_AR[contract.contractType] ?? contract.contractType} />
              <InfoRow label="الرقم المرجعي" value={contract.contractNumber} mono />
              {contract.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2">{contract.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Sign Modal */}
      <Modal open={signModal} onClose={() => setSignModal(false)} title="توقيع العقد">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">اختر الطرف الذي سيوقع العقد:</p>
          <Select
            value={signerType}
            onChange={(e) => setSignerType(e.target.value)}
            options={[
              { value: 'farmer', label: 'توقيع المزارع' },
              { value: 'buyer', label: 'توقيع المشتري' },
            ]}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setSignModal(false)}>إلغاء</Button>
            <Button
              variant="primary"
              icon={signMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending}
            >
              تأكيد التوقيع
            </Button>
          </div>
        </div>
      </Modal>

      {/* Terminate Modal */}
      <Modal open={terminateModal} onClose={() => setTerminateModal(false)} title="إنهاء العقد">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">هذا الإجراء لا يمكن التراجع عنه. سيتم إنهاء العقد نهائياً.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سبب الإنهاء <span className="text-red-500">*</span></label>
            <textarea
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="اذكر سبب إنهاء العقد..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setTerminateModal(false)}>إلغاء</Button>
            <Button
              variant="danger"
              icon={terminateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              onClick={() => terminateMutation.mutate()}
              disabled={terminateMutation.isPending || !terminateReason.trim()}
            >
              إنهاء العقد
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className={cn('text-sm text-right', bold ? 'font-bold text-gray-900' : 'text-gray-700', mono ? 'font-mono text-xs' : '')}>
        {value}
      </span>
    </div>
  );
}
