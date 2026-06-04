'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import Link from 'next/link';
import {
  ChevronRight, AlertCircle, Loader2, Clock, CheckCircle2,
  XCircle, Shield, FileText, Send, Plus, User, Building2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  FILED:               { label: 'مقدّمة',       color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   icon: FileText },
  ASSIGNED:            { label: 'مُعيَّنة',     color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: User },
  EVIDENCE_COLLECTION: { label: 'جمع الأدلة',   color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: Shield },
  UNDER_REVIEW:        { label: 'قيد المراجعة', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   icon: Loader2 },
  RESOLUTION_PROPOSED: { label: 'اقتُرح حل',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: MessageSquare },
  ESCALATED:           { label: 'مُصعَّدة',     color: 'text-red-700',    bg: 'bg-red-50 border-red-200',     icon: AlertCircle },
  ACCEPTED:            { label: 'مقبولة',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  REJECTED:            { label: 'مرفوضة',      color: 'text-red-700',    bg: 'bg-red-50 border-red-200',     icon: XCircle },
  EXECUTED:            { label: 'مُنفَّذة',     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  CLOSED:              { label: 'مغلقة',        color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',   icon: XCircle },
};

const DISPUTE_CATEGORY: Record<string, string> = {
  QUALITY:        'جودة المنتج',
  DELIVERY:       'التسليم',
  QUANTITY:       'الكمية',
  PAYMENT:        'الدفع',
  CONTRACT:       'العقد',
  OTHER:          'أخرى',
};

const TIMELINE_STATUSES = [
  'FILED', 'ASSIGNED', 'EVIDENCE_COLLECTION', 'UNDER_REVIEW',
  'RESOLUTION_PROPOSED', 'ACCEPTED', 'EXECUTED', 'CLOSED',
];

interface Evidence {
  id: string;
  evidenceType: string;
  description?: string;
  fileUrl?: string;
  submittedByType: string;
  submittedById: string;
  createdAt: string;
}

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const isAdmin = evidence.submittedByType === 'USER' || evidence.submittedByType === 'INTERNAL';
  return (
    <div className={cn(
      'rounded-xl p-3 border text-sm',
      isAdmin ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isAdmin ? (
            <Shield size={13} className="text-blue-500 flex-shrink-0" />
          ) : (
            <User size={13} className="text-gray-400 flex-shrink-0" />
          )}
          <span className={cn('text-xs font-semibold', isAdmin ? 'text-blue-700' : 'text-gray-600')}>
            {isAdmin ? 'ردّ الأدمن' : evidence.submittedByType === 'BUYER' ? 'المشتري' : 'المزارع'}
          </span>
          <span className="text-xs text-gray-300">•</span>
          <span className="text-xs text-gray-400">{evidence.evidenceType}</span>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {new Date(evidence.createdAt).toLocaleDateString('ar-SA')}
        </span>
      </div>
      {evidence.description && (
        <p className="text-xs text-gray-700 mt-1.5 leading-relaxed">{evidence.description}</p>
      )}
      {evidence.fileUrl && (
        <a href={evidence.fileUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-brand-600 hover:underline mt-1 inline-block">
          عرض الملف المرفق
        </a>
      )}
    </div>
  );
}

export default function DisputeDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState('DOCUMENT');
  const [description, setDescription] = useState('');

  const { data: dispute, isLoading, error } = useQuery({
    queryKey: ['dispute', params.id],
    queryFn: () => disputesApi.get(params.id).then((r) => r.data),
  });

  const addEvidence = useMutation({
    mutationFn: (data: Record<string, unknown>) => disputesApi.addEvidence(params.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispute', params.id] });
      setDescription('');
      setShowEvidenceForm(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="sm:p-6 py-12 text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">لم يُعثر على النزاع</p>
        <Link href="/disputes" className="text-brand-600 text-sm mt-2 inline-block">العودة للنزاعات</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.FILED;
  const StatusIcon = statusCfg.icon;
  const currentStatusIndex = TIMELINE_STATUSES.indexOf(dispute.status);
  const isClosed = ['CLOSED', 'EXECUTED', 'REJECTED'].includes(dispute.status);

  const evidenceList: Evidence[] = dispute.evidence || dispute.evidences || [];

  return (
    <div className="sm:p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link href="/disputes" className="hover:text-brand-600 transition-colors">النزاعات</Link>
        <ChevronRight size={12} />
        <span className="text-gray-600 font-medium">#{dispute.disputeNumber || params.id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base">{dispute.subject || 'نزاع'}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {DISPUTE_CATEGORY[dispute.category] || dispute.category}
              </p>
            </div>
          </div>
          <span className={cn('text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 flex-shrink-0', statusCfg.color, statusCfg.bg)}>
            <StatusIcon size={12} className={dispute.status === 'UNDER_REVIEW' ? 'animate-spin' : ''} />
            {statusCfg.label}
          </span>
        </div>

        {/* Description */}
        {dispute.description && (
          <div className="mt-4 bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">الوصف</p>
            <p className="text-sm text-gray-700 leading-relaxed">{dispute.description}</p>
          </div>
        )}

        {/* Parties */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <User size={11} /> مقدِّم الشكوى
            </p>
            <p className="text-xs font-semibold text-gray-700">
              {dispute.filedByType === 'FARMER' ? 'مزارع' : 'مشتري'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Building2 size={11} /> الطرف الآخر
            </p>
            <p className="text-xs font-semibold text-gray-700">
              {dispute.againstType === 'FARMER' ? 'مزارع' : 'مشتري'}
            </p>
          </div>
        </div>

        {/* Resolution notes */}
        {dispute.resolutionNotes && (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <p className="text-xs text-emerald-600 font-semibold mb-1">قرار التسوية</p>
            <p className="text-sm text-emerald-700">{dispute.resolutionNotes}</p>
          </div>
        )}
      </div>

      {/* Status timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4">مراحل النزاع</h2>
        <div className="relative">
          <div className="flex items-center justify-between relative">
            {TIMELINE_STATUSES.map((status, i) => {
              const cfg = STATUS_CONFIG[status];
              const done = i <= currentStatusIndex;
              const active = i === currentStatusIndex;
              const Icon = cfg?.icon || Clock;
              return (
                <div key={status} className="flex flex-col items-center gap-1 flex-1">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center z-10 relative transition-all',
                    done && !active ? 'bg-emerald-500 text-white' :
                    active ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
                    'bg-gray-100 text-gray-300'
                  )}>
                    {done && !active ? <CheckCircle2 size={14} /> : <Icon size={13} className={active ? 'animate-pulse' : ''} />}
                  </div>
                  {i < TIMELINE_STATUSES.length - 1 && (
                    <div className={cn('absolute top-3.5 h-0.5 transition-all')}
                      style={{
                        left: `${(i + 1) / TIMELINE_STATUSES.length * 100}%`,
                        width: `${1 / TIMELINE_STATUSES.length * 100}%`,
                        backgroundColor: done ? '#10b981' : '#e5e7eb',
                      }}
                    />
                  )}
                  <span className="text-center" style={{ fontSize: '9px', color: done ? '#065f46' : active ? '#1d4ed8' : '#9ca3af', lineHeight: 1.2, maxWidth: '50px' }}>
                    {cfg?.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Evidence / messages */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Shield size={15} className="text-amber-500" />
            الأدلة والردود
            {evidenceList.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{evidenceList.length}</span>
            )}
          </h2>
          {!isClosed && !showEvidenceForm && (
            <button
              onClick={() => setShowEvidenceForm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Plus size={13} />
              إضافة دليل
            </button>
          )}
        </div>

        {/* Evidence list */}
        {evidenceList.length === 0 && !showEvidenceForm && (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">لم يُقدَّم أي دليل حتى الآن</p>
            {!isClosed && (
              <button
                onClick={() => setShowEvidenceForm(true)}
                className="text-brand-600 text-xs mt-2 hover:underline"
              >
                قدِّم أول دليل
              </button>
            )}
          </div>
        )}

        {evidenceList.length > 0 && (
          <div className="space-y-2 mb-4">
            {evidenceList.map((ev) => <EvidenceCard key={ev.id} evidence={ev} />)}
          </div>
        )}

        {/* Add evidence form */}
        {showEvidenceForm && (
          <div className="border border-brand-100 rounded-xl p-4 bg-brand-50/30 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">نوع الدليل</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="DOCUMENT">وثيقة / مستند</option>
                <option value="PHOTO">صورة / فيديو</option>
                <option value="TESTIMONY">شهادة / ملاحظة</option>
                <option value="INVOICE">فاتورة</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">الوصف / الملاحظات</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب وصفاً للدليل أو الملاحظة…"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => addEvidence.mutate({ evidenceType, description })}
                disabled={!description.trim() || addEvidence.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-60 transition-colors"
              >
                {addEvidence.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                إرسال الدليل
              </button>
              <button
                onClick={() => setShowEvidenceForm(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Closed notice */}
      {isClosed && (
        <div className={cn('flex items-start gap-3 rounded-2xl p-4 border', statusCfg.bg)}>
          <StatusIcon size={18} className={`${statusCfg.color} flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`text-sm font-bold ${statusCfg.color}`}>النزاع {statusCfg.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">لا يمكن إضافة أدلة جديدة على نزاع مغلق.</p>
          </div>
        </div>
      )}
    </div>
  );
}
