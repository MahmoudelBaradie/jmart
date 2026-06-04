'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronRight, AlertCircle, Loader2, CheckCircle2, XCircle,
  Clock, Shield, User, Building2, FileText, Send, MessageSquare,
  Hash, Gavel, Scale, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  FILED:               { label: 'مقدّمة',       color: 'text-blue-700 bg-blue-50 border-blue-200',   icon: FileText },
  ASSIGNED:            { label: 'مُعيَّنة',     color: 'text-purple-700 bg-purple-50 border-purple-200', icon: User },
  EVIDENCE_COLLECTION: { label: 'جمع الأدلة',   color: 'text-amber-700 bg-amber-50 border-amber-200',  icon: Shield },
  UNDER_REVIEW:        { label: 'قيد المراجعة', color: 'text-blue-700 bg-blue-50 border-blue-200',   icon: Loader2 },
  RESOLUTION_PROPOSED: { label: 'اقتُرح حل',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: MessageSquare },
  ESCALATED:           { label: 'مُصعَّدة',     color: 'text-red-700 bg-red-50 border-red-200',     icon: AlertCircle },
  ACCEPTED:            { label: 'مقبولة',       color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  REJECTED:            { label: 'مرفوضة',      color: 'text-red-700 bg-red-50 border-red-200',     icon: XCircle },
  EXECUTED:            { label: 'مُنفَّذة',     color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  CLOSED:              { label: 'مغلقة',        color: 'text-gray-600 bg-gray-50 border-gray-200',   icon: XCircle },
};

const DISPUTE_CATEGORY: Record<string, string> = {
  QUALITY: 'جودة المنتج', DELIVERY: 'التسليم', QUANTITY: 'الكمية',
  PAYMENT: 'الدفع', CONTRACT: 'العقد', OTHER: 'أخرى',
};

const RESPONSIBILITY: Record<string, { label: string; color: string }> = {
  FARMER: { label: 'المزارع مسؤول', color: 'text-amber-700 bg-amber-50' },
  BUYER:  { label: 'المشتري مسؤول', color: 'text-blue-700 bg-blue-50' },
  SHARED: { label: 'مسؤولية مشتركة', color: 'text-purple-700 bg-purple-50' },
  NONE:   { label: 'لا مسؤولية محددة', color: 'text-gray-600 bg-gray-50' },
};

const NEXT_STATUSES: Record<string, string[]> = {
  FILED: ['ASSIGNED', 'EVIDENCE_COLLECTION'],
  ASSIGNED: ['EVIDENCE_COLLECTION', 'UNDER_REVIEW'],
  EVIDENCE_COLLECTION: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['RESOLUTION_PROPOSED', 'ESCALATED'],
  RESOLUTION_PROPOSED: ['ACCEPTED', 'REJECTED'],
  ESCALATED: ['UNDER_REVIEW'],
  ACCEPTED: ['EXECUTED'],
  EXECUTED: ['CLOSED'],
};

const STATUS_AR: Record<string, string> = {
  ASSIGNED: 'تعيين',
  EVIDENCE_COLLECTION: 'جمع أدلة',
  UNDER_REVIEW: 'مراجعة',
  RESOLUTION_PROPOSED: 'اقتراح حل',
  ESCALATED: 'تصعيد',
  ACCEPTED: 'قبول',
  REJECTED: 'رفض',
  EXECUTED: 'تنفيذ',
  CLOSED: 'إغلاق',
};

export default function DisputeDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [resolutionData, setResolutionData] = useState({
    resolutionNotes: '',
    resolvedAmount: '',
    responsibility: 'NONE',
  });
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);

  const { data: dispute, isLoading } = useQuery({
    queryKey: ['dispute-admin', params.id],
    queryFn: () => disputesApi.get(params.id).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => disputesApi.update(params.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispute-admin', params.id] });
      setShowResolutionForm(false);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => disputesApi.close(params.id, { resolutionNotes: closeNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispute-admin', params.id] });
      setShowCloseForm(false);
    },
  });

  const evidenceMutation = useMutation({
    mutationFn: () => disputesApi.addEvidence(params.id, { evidenceType: 'TESTIMONY', description: evidenceText }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispute-admin', params.id] });
      setEvidenceText('');
      setShowEvidenceForm(false);
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;
  }

  if (!dispute) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600">لم يُعثر على النزاع</p>
        <Link href="/disputes" className="text-brand-600 text-sm hover:underline">العودة</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.FILED;
  const StatusIcon = statusCfg.icon;
  const nextStatuses = NEXT_STATUSES[dispute.status] || [];
  const isClosed = ['CLOSED', 'EXECUTED', 'REJECTED'].includes(dispute.status);
  const evidence: Array<{ id: string; evidenceType: string; description?: string; submittedByType: string; createdAt: string }> =
    dispute.evidence || dispute.evidences || [];
  const respCfg = dispute.responsibility ? RESPONSIBILITY[dispute.responsibility] : null;

  return (
    <div className="space-y-5 p-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/disputes" className="hover:text-brand-600 transition-colors">النزاعات</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">#{dispute.disputeNumber || params.id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-gray-900">{dispute.subject || 'نزاع'}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1', statusCfg.color)}>
              <StatusIcon size={12} />
              {statusCfg.label}
            </span>
            {dispute.category && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {DISPUTE_CATEGORY[dispute.category] || dispute.category}
              </span>
            )}
            {respCfg && (
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', respCfg.color)}>
                {respCfg.label}
              </span>
            )}
          </div>
        </div>
        {!isClosed && nextStatuses.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={() => updateMutation.mutate({ status: nextStatus })}
                disabled={updateMutation.isPending}
                className="text-xs font-semibold px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors disabled:opacity-60"
              >
                {STATUS_AR[nextStatus] || nextStatus}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Dispute details */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">تفاصيل النزاع</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><User size={11} /> مقدِّم الشكوى</p>
                <p className="text-sm font-semibold text-gray-800">{dispute.filedByType === 'FARMER' ? 'مزارع' : 'مشتري'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Building2 size={11} /> الطرف الآخر</p>
                <p className="text-sm font-semibold text-gray-800">{dispute.againstType === 'FARMER' ? 'مزارع' : 'مشتري'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Hash size={11} /> الطلب المرتبط</p>
                <p className="text-sm font-semibold text-gray-800">
                  {dispute.order ? (
                    <Link href={`/orders/${dispute.orderId}`} className="text-brand-600 hover:underline">
                      {dispute.order.orderNumber}
                    </Link>
                  ) : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock size={11} /> تاريخ التقديم</p>
                <p className="text-sm font-semibold text-gray-800">{formatDate(dispute.createdAt)}</p>
              </div>
            </div>

            {dispute.description && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-semibold mb-1">وصف النزاع</p>
                <p className="text-sm text-amber-800">{dispute.description}</p>
              </div>
            )}
          </Card>

          {/* Resolution section */}
          {!isClosed && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Gavel size={15} className="text-brand-500" />
                  اقتراح حل
                </h2>
                {!showResolutionForm && (
                  <button
                    onClick={() => setShowResolutionForm(true)}
                    className="text-xs text-brand-600 hover:underline font-medium"
                  >
                    تحرير
                  </button>
                )}
              </div>

              {dispute.resolutionNotes ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-xs text-emerald-600 font-semibold mb-1">قرار التسوية</p>
                  <p className="text-sm text-emerald-700">{dispute.resolutionNotes}</p>
                  {dispute.resolvedAmount && (
                    <p className="text-sm font-bold text-emerald-800 mt-1">
                      المبلغ المُسوَّى: {formatCurrency(dispute.resolvedAmount)}
                    </p>
                  )}
                </div>
              ) : !showResolutionForm ? (
                <button
                  onClick={() => setShowResolutionForm(true)}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors"
                >
                  <Scale size={20} className="mx-auto mb-1 opacity-50" />
                  اضغط لاقتراح حل التسوية
                </button>
              ) : null}

              {showResolutionForm && (
                <div className="space-y-3">
                  <textarea
                    value={resolutionData.resolutionNotes}
                    onChange={(e) => setResolutionData((d) => ({ ...d, resolutionNotes: e.target.value }))}
                    placeholder="اكتب اقتراح التسوية بالتفصيل…"
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">المبلغ المُسوَّى (ر.س)</label>
                      <input
                        type="number"
                        value={resolutionData.resolvedAmount}
                        onChange={(e) => setResolutionData((d) => ({ ...d, resolvedAmount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">المسؤولية</label>
                      <select
                        value={resolutionData.responsibility}
                        onChange={(e) => setResolutionData((d) => ({ ...d, responsibility: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                      >
                        <option value="NONE">لا مسؤولية محددة</option>
                        <option value="FARMER">المزارع</option>
                        <option value="BUYER">المشتري</option>
                        <option value="SHARED">مشتركة</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateMutation.mutate({
                        resolutionNotes: resolutionData.resolutionNotes,
                        resolvedAmount: resolutionData.resolvedAmount ? parseFloat(resolutionData.resolvedAmount) : undefined,
                        responsibility: resolutionData.responsibility,
                        status: 'RESOLUTION_PROPOSED',
                      })}
                      disabled={!resolutionData.resolutionNotes.trim() || updateMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60"
                    >
                      {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
                      اقتراح الحل
                    </button>
                    <button onClick={() => setShowResolutionForm(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Evidence */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Shield size={15} className="text-amber-500" />
                الأدلة والتعليقات
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{evidence.length}</span>
              </h2>
              {!isClosed && !showEvidenceForm && (
                <button
                  onClick={() => setShowEvidenceForm(true)}
                  className="text-xs text-brand-600 hover:underline font-medium"
                >
                  إضافة تعليق
                </button>
              )}
            </div>

            {evidence.length === 0 && !showEvidenceForm ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد أدلة بعد</p>
            ) : (
              <div className="space-y-2 mb-4">
                {evidence.map((ev) => {
                  const isAdmin = !['FARMER', 'BUYER'].includes(ev.submittedByType);
                  return (
                    <div key={ev.id} className={cn('rounded-xl p-3 border text-sm', isAdmin ? 'bg-brand-50 border-brand-100' : 'bg-gray-50 border-gray-100')}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('text-xs font-semibold', isAdmin ? 'text-brand-700' : 'text-gray-600')}>
                          {isAdmin ? 'الأدمن' : ev.submittedByType === 'FARMER' ? 'المزارع' : 'المشتري'}
                          {' · '}{ev.evidenceType}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(ev.createdAt)}</span>
                      </div>
                      {ev.description && <p className="text-xs text-gray-700 mt-1.5">{ev.description}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {showEvidenceForm && (
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <textarea
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="اكتب تعليقاً أو ملاحظة…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => evidenceMutation.mutate()}
                    disabled={!evidenceText.trim() || evidenceMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 rounded-xl text-sm disabled:opacity-60"
                  >
                    {evidenceMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    إرسال
                  </button>
                  <button onClick={() => setShowEvidenceForm(false)} className="px-4 py-2 rounded-xl border text-sm text-gray-600">إلغاء</button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Quick actions */}
          {!isClosed && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">إجراءات سريعة</h2>
              <div className="space-y-2">
                {dispute.status !== 'CLOSED' && (
                  <>
                    <button
                      onClick={() => updateMutation.mutate({ status: 'UNDER_REVIEW' })}
                      disabled={updateMutation.isPending}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-sm font-medium text-blue-700 transition-colors disabled:opacity-60"
                    >
                      <Loader2 size={14} />
                      وضع تحت المراجعة
                    </button>
                    <button
                      onClick={() => setShowResolutionForm(true)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-sm font-medium text-emerald-700 transition-colors"
                    >
                      <Gavel size={14} />
                      اقتراح حل
                    </button>
                    <button
                      onClick={() => updateMutation.mutate({ status: 'ESCALATED' })}
                      disabled={updateMutation.isPending}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-medium text-red-600 transition-colors disabled:opacity-60"
                    >
                      <AlertCircle size={14} />
                      تصعيد النزاع
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowCloseForm(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
                >
                  <XCircle size={14} />
                  إغلاق النزاع
                </button>
              </div>
            </Card>
          )}

          {/* Close form */}
          {showCloseForm && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">إغلاق النزاع</h2>
              <textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="ملاحظات الإغلاق (مطلوبة)…"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => closeMutation.mutate()}
                  disabled={!closeNotes.trim() || closeMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60"
                >
                  {closeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  إغلاق
                </button>
                <button onClick={() => setShowCloseForm(false)} className="px-3 py-2 rounded-xl border text-sm text-gray-600">إلغاء</button>
              </div>
            </Card>
          )}

          {/* Status info */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">معلومات الحالة</h2>
            <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold', statusCfg.color)}>
              <StatusIcon size={15} />
              {statusCfg.label}
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>تاريخ التقديم</span>
                <span>{formatDate(dispute.createdAt)}</span>
              </div>
              {dispute.resolvedAt && (
                <div className="flex justify-between text-gray-500">
                  <span>تاريخ الحل</span>
                  <span>{formatDate(dispute.resolvedAt)}</span>
                </div>
              )}
              {dispute.resolvedAmount && (
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>المبلغ المُسوَّى</span>
                  <span>{formatCurrency(dispute.resolvedAmount)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Assigned to */}
          {dispute.assignedTo && (
            <Card className="p-4">
              <p className="text-xs text-gray-400 mb-1">مُعيَّن إلى</p>
              <p className="text-sm font-semibold text-gray-800">{dispute.assignedTo.fullName}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
