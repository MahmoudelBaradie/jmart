'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qualityApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Link from 'next/link';
import {
  ChevronRight, CheckCircle2, XCircle, AlertTriangle,
  Package, Loader2, Star, Clock, User, ClipboardList,
  ThumbsUp, ThumbsDown, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const RESULT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PASSED:       { label: 'ناجح',         color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  PARTIAL_PASS: { label: 'ناجح جزئياً',  color: 'text-amber-700 bg-amber-50 border-amber-200',     icon: AlertTriangle },
  FAILED:       { label: 'فاشل',         color: 'text-red-700 bg-red-50 border-red-200',            icon: XCircle },
  PENDING:      { label: 'قيد الانتظار', color: 'text-gray-700 bg-gray-50 border-gray-200',         icon: Clock },
};

const TYPE_AR: Record<string, string> = {
  INBOUND: 'فحص وارد',
  PRE_DISPATCH: 'فحص ما قبل الشحن',
  ON_DELIVERY: 'فحص عند التسليم',
  DISPUTE_TRIGGERED: 'فحص النزاع',
  SPOT_CHECK: 'فحص عشوائي',
};

const ACTION_AR: Record<string, string> = {
  RELEASED: 'تم الإفراج',
  REPACK_ORDERED: 'إعادة تعبئة',
  REJECTED: 'مرفوض',
  DISPUTED: 'متنازع عليه',
};

const ACTION_CONFIG: Record<string, { color: string }> = {
  RELEASED:      { color: 'text-emerald-700 bg-emerald-50' },
  REPACK_ORDERED:{ color: 'text-blue-700 bg-blue-50' },
  REJECTED:      { color: 'text-red-700 bg-red-50' },
  DISPUTED:      { color: 'text-amber-700 bg-amber-50' },
};

const COMPLETE_RESULTS = [
  { value: 'PASSED', label: 'ناجح ✅' },
  { value: 'PARTIAL_PASS', label: 'ناجح جزئياً ⚠️' },
  { value: 'FAILED', label: 'فاشل ❌' },
];

const COMPLETE_ACTIONS = [
  { value: 'RELEASED', label: 'إفراج عن المنتج' },
  { value: 'REPACK_ORDERED', label: 'طلب إعادة تعبئة' },
  { value: 'REJECTED', label: 'رفض المنتج' },
  { value: 'DISPUTED', label: 'تحويل للنزاع' },
];

export default function QualityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [completeModal, setCompleteModal] = useState(false);
  const [result, setResult] = useState('PASSED');
  const [action, setAction] = useState('RELEASED');
  const [notes, setNotes] = useState('');
  const [qualityScore, setQualityScore] = useState('');

  const { data: inspection, isLoading } = useQuery({
    queryKey: ['quality', id],
    queryFn: () => qualityApi.get(id).then((r) => r.data),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      qualityApi.complete(id, {
        result,
        action,
        notes,
        qualityScore: qualityScore ? parseFloat(qualityScore) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality', id] });
      setCompleteModal(false);
    },
  });

  if (isLoading) return <PageSpinner />;
  if (!inspection) return <div className="text-center py-16 text-gray-500">الفحص غير موجود</div>;

  const resultCfg = RESULT_CONFIG[inspection.result] ?? RESULT_CONFIG.PENDING;
  const ResultIcon = resultCfg.icon;
  const isPending = inspection.result === 'PENDING';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/quality" className="hover:text-gray-700">فحوصات الجودة</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">فحص #{inspection.id?.slice(-8).toUpperCase()}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {TYPE_AR[inspection.inspectionType] ?? inspection.inspectionType}
            </h1>
            <span className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border',
              resultCfg.color,
            )}>
              <ResultIcon size={14} />
              {resultCfg.label}
            </span>
            {inspection.action && (
              <span className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold',
                ACTION_CONFIG[inspection.action]?.color ?? 'bg-gray-100 text-gray-600',
              )}>
                {ACTION_AR[inspection.action] ?? inspection.action}
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">
            {formatDateTime(inspection.createdAt)}
            {inspection.completedAt && ` • اكتمل ${formatDateTime(inspection.completedAt)}`}
          </p>
        </div>
        {isPending && (
          <Button
            variant="primary"
            icon={<ClipboardList size={15} />}
            onClick={() => setCompleteModal(true)}
          >
            إكمال الفحص
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Quality Score */}
          {inspection.qualityScore != null && (
            <Card>
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Star size={16} className="text-amber-500" />
                نتيجة الجودة
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={Number(inspection.qualityScore) >= 70 ? '#10b981' : Number(inspection.qualityScore) >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${Number(inspection.qualityScore)} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">{Number(inspection.qualityScore).toFixed(0)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">درجة الجودة من 100</p>
                  <p className={cn(
                    'text-lg font-bold',
                    Number(inspection.qualityScore) >= 70 ? 'text-emerald-600' :
                    Number(inspection.qualityScore) >= 50 ? 'text-amber-600' : 'text-red-600',
                  )}>
                    {Number(inspection.qualityScore) >= 70 ? 'جودة ممتازة' :
                     Number(inspection.qualityScore) >= 50 ? 'جودة مقبولة' : 'جودة منخفضة'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Checklist results */}
          {inspection.checklistResults && Object.keys(inspection.checklistResults).length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ClipboardList size={16} className="text-blue-500" />
                نتائج قائمة الفحص
              </h2>
              <div className="space-y-2">
                {Object.entries(inspection.checklistResults as Record<string, boolean>).map(([key, passed]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{key}</span>
                    {passed ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <ThumbsUp size={13} /> نجح
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                        <ThumbsDown size={13} /> فشل
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Inspector notes */}
          {inspection.notes && (
            <Card>
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Activity size={16} className="text-purple-500" />
                ملاحظات المفتش
              </h2>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{inspection.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Lot info */}
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Package size={16} className="text-blue-500" />
              معلومات الدفعة
            </h2>
            <div className="space-y-3">
              <InfoRow label="رقم الدفعة" value={inspection.lot?.lotNumber ?? '—'} mono />
              <InfoRow label="المنتج" value={inspection.lot?.product?.nameAr ?? inspection.lot?.product?.name ?? '—'} />
              <InfoRow label="الدرجة" value={inspection.lot?.grade ?? '—'} />
              <InfoRow
                label="الكمية"
                value={inspection.lot?.qtyTotal
                  ? `${Number(inspection.lot.qtyTotal).toLocaleString('ar-SA')} ${inspection.lot.product?.unitOfMeasure ?? ''}`
                  : '—'}
              />
              {inspection.lot && (
                <Link
                  href={`/inventory`}
                  className="text-xs text-blue-600 hover:underline block mt-1"
                >
                  عرض الدفعة في المخزون ←
                </Link>
              )}
            </div>
          </Card>

          {/* Inspector info */}
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={16} className="text-purple-500" />
              المفتش
            </h2>
            <div className="space-y-3">
              <InfoRow
                label="الاسم"
                value={inspection.inspector?.fullName ?? inspection.inspector?.email ?? '—'}
              />
              <InfoRow label="تاريخ الفحص" value={formatDate(inspection.createdAt)} />
              {inspection.completedAt && (
                <InfoRow label="تاريخ الإكمال" value={formatDate(inspection.completedAt)} />
              )}
            </div>
          </Card>

          {/* Order link */}
          {inspection.orderId && (
            <Card>
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Activity size={16} className="text-gray-500" />
                الطلب المرتبط
              </h2>
              <Link
                href={`/orders/${inspection.orderId}`}
                className="flex items-center justify-between text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <span>عرض الطلب</span>
                <ChevronRight size={14} />
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Complete inspection modal */}
      <Modal open={completeModal} onClose={() => setCompleteModal(false)} title="إكمال فحص الجودة">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نتيجة الفحص</label>
            <Select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              options={COMPLETE_RESULTS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الإجراء</label>
            <Select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              options={COMPLETE_ACTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">درجة الجودة (0-100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={qualityScore}
              onChange={(e) => setQualityScore(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="مثال: 85"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ملاحظات المفتش..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setCompleteModal(false)}>إلغاء</Button>
            <Button
              variant="primary"
              icon={completeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              حفظ النتيجة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className={cn('text-sm text-right text-gray-800', mono ? 'font-mono text-xs' : 'font-medium')}>
        {value}
      </span>
    </div>
  );
}
