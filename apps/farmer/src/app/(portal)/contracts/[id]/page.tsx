'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  ChevronRight, FileText, CheckCircle2, Clock, XCircle,
  AlertCircle, Building2, Package, Calendar, DollarSign,
  PenLine, Loader2, Shield, User, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'مسودة',    color: 'text-gray-600',   bg: 'bg-gray-100',   icon: FileText },
  PENDING_SIGNATURES: { label: 'بانتظار التوقيع', color: 'text-amber-700', bg: 'bg-amber-100', icon: PenLine },
  ACTIVE:    { label: 'نشط',      color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  COMPLETED: { label: 'مكتمل',   color: 'text-blue-700',   bg: 'bg-blue-100',   icon: CheckCircle2 },
  CANCELLED: { label: 'ملغى',    color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
  DISPUTED:  { label: 'متنازع عليه', color: 'text-red-700', bg: 'bg-red-100',  icon: AlertCircle },
  SUSPENDED: { label: 'موقوف',   color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertCircle },
};

const CONTRACT_TYPE: Record<string, string> = {
  FIXED_PRICE: 'سعر ثابت',
  MARKET_PRICE: 'سعر السوق',
  HYBRID: 'هجين',
};

function TimelineStep({
  label,
  date,
  done,
  active,
  isLast,
}: {
  label: string;
  date?: string | null;
  done: boolean;
  active?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
          done ? 'bg-emerald-500 text-white' :
          active ? 'bg-blue-500 text-white ring-4 ring-blue-100' :
          'bg-gray-100 text-gray-400'
        )}>
          {done ? <CheckCircle2 size={16} /> : active ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
        </div>
        {!isLast && <div className={cn('w-0.5 flex-1 mt-1', done ? 'bg-emerald-300' : 'bg-gray-100')} />}
      </div>
      <div className="pb-5 min-w-0">
        <p className={cn('text-sm font-semibold', done ? 'text-emerald-700' : active ? 'text-blue-700' : 'text-gray-400')}>
          {label}
        </p>
        {date && <p className="text-xs text-gray-400 mt-0.5">{new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
      </div>
    </div>
  );
}

export default function ContractDetailPage({ params }: { params: { id: string } }) {
  const { isFarmer, isBuyer } = useAuth();
  const qc = useQueryClient();

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', params.id],
    queryFn: () => contractsApi.get(params.id).then((r) => r.data),
  });

  const signMutation = useMutation({
    mutationFn: (signerType: 'farmer' | 'buyer') => contractsApi.sign(params.id, signerType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract', params.id] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="sm:p-6 py-12 text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">لم يُعثر على العقد</p>
        <Link href="/contracts" className="text-brand-600 text-sm mt-2 inline-block">العودة للعقود</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.DRAFT;
  const StatusIcon = statusCfg.icon;

  const farmerSigned = !!contract.farmerSignedAt;
  const buyerSigned  = !!contract.buyerSignedAt;
  const bothSigned   = farmerSigned && buyerSigned;
  const canFarmerSign = isFarmer && !farmerSigned && contract.status === 'PENDING_SIGNATURES';
  const canBuyerSign  = isBuyer  && !buyerSigned  && contract.status === 'PENDING_SIGNATURES';

  // Timeline steps
  const timelineSteps = [
    { label: 'إنشاء العقد', date: contract.createdAt, done: true },
    { label: 'مراجعة الشروط', date: contract.reviewedAt, done: !!contract.reviewedAt },
    { label: 'بانتظار التوقيع', date: contract.approvedAt, done: contract.status !== 'DRAFT', active: contract.status === 'PENDING_SIGNATURES' },
    { label: 'توقيع المزارع', date: contract.farmerSignedAt, done: farmerSigned },
    { label: 'توقيع المشتري', date: contract.buyerSignedAt, done: buyerSigned },
    { label: 'العقد نافذ', date: bothSigned ? contract.startDate : null, done: contract.status === 'ACTIVE' || contract.status === 'COMPLETED' },
  ];

  return (
    <div className="sm:p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link href="/contracts" className="hover:text-brand-600 transition-colors">العقود</Link>
        <ChevronRight size={12} />
        <span className="text-gray-600 font-medium">{contract.contractNumber}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-brand-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">{contract.title}</h1>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Hash size={11} />
                {contract.contractNumber}
              </p>
            </div>
          </div>
          <span className={cn('text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1', statusCfg.color, statusCfg.bg)}>
            <StatusIcon size={12} />
            {statusCfg.label}
          </span>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className={cn('rounded-xl p-3 border', farmerSigned ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100')}>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <User size={11} /> المزارع
            </p>
            <p className="text-sm font-bold text-gray-800">{contract.farmer?.businessName}</p>
            <div className={cn('flex items-center gap-1 text-xs mt-1.5 font-medium', farmerSigned ? 'text-emerald-600' : 'text-gray-400')}>
              {farmerSigned ? <><CheckCircle2 size={12} /> وقّع</> : <><Clock size={12} /> لم يوقع</>}
            </div>
          </div>
          <div className={cn('rounded-xl p-3 border', buyerSigned ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100')}>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Building2 size={11} /> المشتري
            </p>
            <p className="text-sm font-bold text-gray-800">{contract.buyer?.businessName}</p>
            <div className={cn('flex items-center gap-1 text-xs mt-1.5 font-medium', buyerSigned ? 'text-emerald-600' : 'text-gray-400')}>
              {buyerSigned ? <><CheckCircle2 size={12} /> وقّع</> : <><Clock size={12} /> لم يوقع</>}
            </div>
          </div>
        </div>
      </div>

      {/* Sign button */}
      {(canFarmerSign || canBuyerSign) && (
        <button
          onClick={() => signMutation.mutate(canFarmerSign ? 'farmer' : 'buyer')}
          disabled={signMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl text-sm transition-colors shadow-lg shadow-brand-200 disabled:opacity-60"
        >
          {signMutation.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <PenLine size={18} />
          )}
          التوقيع على العقد
        </button>
      )}

      {signMutation.isSuccess && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">تم توقيع العقد بنجاح</span>
        </div>
      )}

      {/* Contract details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">تفاصيل العقد</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Calendar, label: 'تاريخ البداية', value: contract.startDate ? new Date(contract.startDate).toLocaleDateString('ar-SA') : '—' },
            { icon: Calendar, label: 'تاريخ الانتهاء', value: contract.endDate ? new Date(contract.endDate).toLocaleDateString('ar-SA') : '—' },
            { icon: FileText, label: 'نوع العقد', value: CONTRACT_TYPE[contract.contractType] || contract.contractType },
            { icon: DollarSign, label: 'إجمالي القيمة', value: contract.totalValue ? `${Number(contract.totalValue).toLocaleString('ar-SA')} ر.س` : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className="text-gray-400" />
                <p className="text-xs text-gray-400">{label}</p>
              </div>
              <p className="text-sm font-bold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        {contract.description && (
          <div>
            <p className="text-xs text-gray-400 mb-1">الوصف</p>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">{contract.description}</p>
          </div>
        )}
      </div>

      {/* Contract items */}
      {contract.items && contract.items.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3">بنود العقد</h2>
          <div className="space-y-2">
            {contract.items.map((item: {
              id: string;
              product?: { name: string; sku: string };
              qty: number;
              unitOfMeasure: string;
              pricePerUnit: number;
              totalPrice: number;
            }) => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package size={15} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.product?.name}</p>
                  <p className="text-xs text-gray-400">{Number(item.qty).toLocaleString()} {item.unitOfMeasure}</p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="text-sm font-bold text-brand-700">{Number(item.pricePerUnit).toLocaleString()} ر.س</p>
                  <p className="text-xs text-gray-400">للوحدة</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Penalty clauses */}
      {contract.penaltyClauses && contract.penaltyClauses.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Shield size={15} className="text-amber-500" />
            بنود الغرامات
          </h2>
          <div className="space-y-2">
            {contract.penaltyClauses.map((clause: {
              id: string;
              clauseType: string;
              description: string;
              penaltyRate?: number;
              penaltyAmount?: number;
            }) => (
              <div key={clause.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">{clause.clauseType}</p>
                <p className="text-xs text-amber-600">{clause.description}</p>
                {clause.penaltyRate && (
                  <p className="text-xs text-amber-700 font-bold mt-1">نسبة الغرامة: {clause.penaltyRate}%</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={15} className="text-brand-500" />
          مراحل العقد
        </h2>
        <div className="space-y-0">
          {timelineSteps.map((step, i) => (
            <TimelineStep
              key={step.label}
              label={step.label}
              date={step.date}
              done={step.done}
              active={step.active}
              isLast={i === timelineSteps.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Staff info */}
      {(contract.draftedBy || contract.reviewedBy || contract.approvedBy) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3">فريق العمل</h2>
          <div className="space-y-2">
            {contract.draftedBy && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-28">أعدّه:</span>
                <span className="text-xs font-medium text-gray-700">{contract.draftedBy.fullName}</span>
              </div>
            )}
            {contract.reviewedBy && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-28">راجعه:</span>
                <span className="text-xs font-medium text-gray-700">{contract.reviewedBy.fullName}</span>
              </div>
            )}
            {contract.approvedBy && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-28">اعتمده:</span>
                <span className="text-xs font-medium text-gray-700">{contract.approvedBy.fullName}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
