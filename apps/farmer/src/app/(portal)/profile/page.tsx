'use client';
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { farmerApi } from '@/lib/api';
import { getInitials } from '@/lib/utils';
import {
  CheckCircle, Clock, XCircle, LogOut, Mail, Building2,
  Phone, User, Pencil, Save, X, CreditCard, Hash,
  AlertCircle, ChevronRight, Shield, Upload, FileCheck,
  FileX, FileClock, Plus, Eye,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── KYC status config ──────────────────────────────────────────
const kycInfo: Record<string, { text: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING_REVIEW: { text: 'قيد المراجعة', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  PENDING:        { text: 'قيد المراجعة', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  APPROVED:       { text: 'معتمد',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
  REJECTED:       { text: 'مرفوض',       color: 'text-red-700',    bg: 'bg-red-50 border-red-200', icon: XCircle },
};

// ── Document types required ────────────────────────────────────
const REQUIRED_DOCS = [
  { type: 'NATIONAL_ID',       label: 'الهوية الوطنية',      icon: '🪪', required: true },
  { type: 'COMMERCIAL_REG',    label: 'السجل التجاري',       icon: '📋', required: true },
  { type: 'BANK_STATEMENT',    label: 'كشف حساب بنكي',      icon: '🏦', required: false },
  { type: 'FARM_CERTIFICATE',  label: 'شهادة ملكية المزرعة', icon: '🌾', required: false },
];

interface KycDoc {
  id: string;
  documentType: string;
  fileName?: string;
  fileUrl: string;
  verified: boolean;
  rejectionReason?: string;
  uploadedAt: string;
}

interface FarmerProfile {
  businessName?: string;
  contactPersonName?: string;
  contactPhone?: string;
  farmerType?: string;
  nationalId?: string;
  commercialRegNo?: string;
  bankAccountIban?: string;
  bankName?: string;
  kycStatus?: string;
}

function InputField({
  label, name, value, onChange, type = 'text', placeholder, icon: Icon,
}: {
  label: string; name: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; icon?: React.ElementType;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon size={15} className="text-gray-400" />
          </div>
        )}
        <input
          type={type} name={name} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all pr-9"
        />
      </div>
    </div>
  );
}

function DocStatusIcon({ doc }: { doc: KycDoc | undefined }) {
  if (!doc) return <FileClock size={16} className="text-gray-300" />;
  if (doc.verified) return <FileCheck size={16} className="text-emerald-500" />;
  if (doc.rejectionReason) return <FileX size={16} className="text-red-400" />;
  return <Clock size={16} className="text-amber-400" />;
}

export default function ProfilePage() {
  const { user, isFarmer, kycStatus, logout, loading } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [showUploadFor, setShowUploadFor] = useState<string | null>(null);

  const { data: farmerData, isLoading } = useQuery({
    queryKey: ['farmer-profile'],
    queryFn: () => farmerApi.me().then((r) => r.data),
    enabled: isFarmer,
  });

  const { data: kycDocs = [] } = useQuery<KycDoc[]>({
    queryKey: ['kyc-documents'],
    queryFn: () => farmerApi.kycDocuments().then((r) => r.data),
    enabled: isFarmer,
  });

  const farmer: FarmerProfile = farmerData || {};
  const [form, setForm] = useState({
    businessName: '', contactPersonName: '', contactPhone: '',
    nationalId: '', commercialRegNo: '', bankAccountIban: '', bankName: '',
  });

  const startEdit = () => {
    setForm({
      businessName: farmer.businessName || '',
      contactPersonName: farmer.contactPersonName || '',
      contactPhone: farmer.contactPhone || '',
      nationalId: farmer.nationalId || '',
      commercialRegNo: farmer.commercialRegNo || '',
      bankAccountIban: farmer.bankAccountIban || '',
      bankName: farmer.bankName || '',
    });
    setEditing(true);
    setSaved(false);
  };

  const update = useMutation({
    mutationFn: (data: Record<string, unknown>) => farmerApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmer-profile'] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const uploadDoc = useMutation({
    mutationFn: async ({ documentType, file }: { documentType: string; file: File }) => {
      // Send real file via FormData instead of a fake path
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', documentType);
      fd.append('fileName', file.name);
      return farmerApi.addKycDocument(fd as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kyc-documents'] });
      setShowUploadFor(null);
      setUploadingDocType(null);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'فشل رفع الملف — حاول مرة أخرى';
      alert(msg); // Simple feedback; can be improved with a toast
    },
  });

  const handleFileSelect = (docType: string, file: File) => {
    uploadDoc.mutate({ documentType: docType, file });
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined) payload[k] = v || null;
    });
    update.mutate(payload);
  };

  // Show skeleton while auth is still loading (prevents blank flash)
  if (loading) {
    return (
      <div className="sm:p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded-2xl" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = farmer.businessName || farmer.contactPersonName || user.email;
  const effectiveKyc = kycStatus || farmer.kycStatus || 'PENDING';
  const kyc = kycInfo[effectiveKyc] || kycInfo['PENDING'];
  const KycIcon = kyc?.icon || Clock;

  // Build doc map by type (last uploaded per type)
  const docMap: Record<string, KycDoc> = {};
  kycDocs.forEach((d) => { docMap[d.documentType] = d; });

  const uploadedCount = REQUIRED_DOCS.filter((rd) => docMap[rd.type]).length;
  const requiredCount = REQUIRED_DOCS.filter((rd) => rd.required).length;
  const requiredUploaded = REQUIRED_DOCS.filter((rd) => rd.required && docMap[rd.type]).length;

  return (
    <div className="sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">الملف الشخصي</h1>
        {!editing && !isLoading && isFarmer && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Pencil size={13} />
            تعديل البيانات
          </button>
        )}
      </div>

      {/* Avatar / header card */}
      <div className={cn(
        'rounded-2xl p-6 text-center text-white shadow-lg',
        isFarmer
          ? 'bg-gradient-to-bl from-brand-700 to-brand-600'
          : 'bg-gradient-to-bl from-blue-700 to-blue-600'
      )}>
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl font-black">
          {getInitials(displayName)}
        </div>
        <h2 className="text-lg font-bold">{displayName}</h2>
        <p className="text-white/70 text-sm mt-1">{isFarmer ? 'مزارع' : 'مشتري'}</p>
        {kyc && (
          <div className="inline-flex items-center gap-1.5 mt-2 bg-white/15 px-3 py-1 rounded-full">
            <KycIcon size={13} />
            <span className="text-xs font-medium">{kyc.text}</span>
          </div>
        )}
      </div>

      {/* Success toast */}
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">تم حفظ البيانات بنجاح</span>
        </div>
      )}

      {/* Edit form */}
      {editing ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-gray-800">تعديل البيانات</h2>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField label="اسم النشاط التجاري" name="businessName" value={form.businessName}
              onChange={(v) => setForm((f) => ({ ...f, businessName: v }))} icon={Building2} placeholder="Al-Hada Farms" />
            <InputField label="اسم جهة الاتصال" name="contactPersonName" value={form.contactPersonName}
              onChange={(v) => setForm((f) => ({ ...f, contactPersonName: v }))} icon={User} placeholder="أحمد محمد" />
            <InputField label="رقم الجوال" name="contactPhone" value={form.contactPhone}
              onChange={(v) => setForm((f) => ({ ...f, contactPhone: v }))} icon={Phone} type="tel" placeholder="+966501234567" />
            <InputField label="رقم الهوية الوطنية" name="nationalId" value={form.nationalId}
              onChange={(v) => setForm((f) => ({ ...f, nationalId: v }))} icon={Hash} placeholder="1234567890" />
            <InputField label="رقم السجل التجاري" name="commercialRegNo" value={form.commercialRegNo}
              onChange={(v) => setForm((f) => ({ ...f, commercialRegNo: v }))} icon={CreditCard} placeholder="1010123456" />
            <InputField label="اسم البنك" name="bankName" value={form.bankName}
              onChange={(v) => setForm((f) => ({ ...f, bankName: v }))} icon={Building2} placeholder="بنك الراجحي" />
          </div>
          <InputField label="رقم الآيبان البنكي" name="bankAccountIban" value={form.bankAccountIban}
            onChange={(v) => setForm((f) => ({ ...f, bankAccountIban: v }))} icon={CreditCard} placeholder="SA0380000000608010167519" />
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={update.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {update.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
              حفظ التغييرات
            </button>
            <button onClick={() => setEditing(false)} disabled={update.isPending}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
              إلغاء
            </button>
          </div>
          {update.isError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="text-red-500" />
              <p className="text-xs text-red-600">حدث خطأ أثناء الحفظ. يرجى المحاولة مجدداً.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {[
            { icon: Mail, label: 'البريد الإلكتروني', value: user.email },
            ...(farmer.contactPhone ? [{ icon: Phone, label: 'رقم الجوال', value: farmer.contactPhone }] : []),
            ...(farmer.contactPersonName ? [{ icon: User, label: 'جهة الاتصال', value: farmer.contactPersonName }] : []),
            ...(farmer.farmerType ? [{ icon: Building2, label: 'نوع المزارع', value: farmer.farmerType === 'INDIVIDUAL' ? 'فردي' : 'شركة' }] : []),
            ...(farmer.commercialRegNo ? [{ icon: CreditCard, label: 'السجل التجاري', value: farmer.commercialRegNo }] : []),
            ...(farmer.bankName ? [{ icon: Building2, label: 'البنك', value: farmer.bankName }] : []),
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── KYC Documents Section ── */}
      {isFarmer && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-brand-500" />
              <h2 className="text-sm font-bold text-gray-800">وثائق التحقق (KYC)</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                requiredUploaded === requiredCount
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              )}>
                {uploadedCount}/{REQUIRED_DOCS.length} مُرفقة
              </span>
            </div>
          </div>

          {/* KYC status banner */}
          {effectiveKyc !== 'APPROVED' && (
            <div className={cn('flex items-start gap-3 rounded-xl p-3 border mb-4', kyc.bg)}>
              <KycIcon size={16} className={cn(kyc.color, 'flex-shrink-0 mt-0.5')} />
              <div>
                <p className={cn('text-xs font-bold', kyc.color)}>
                  {effectiveKyc === 'PENDING' || effectiveKyc === 'PENDING_REVIEW'
                    ? 'حسابك قيد المراجعة — يُرجى رفع الوثائق المطلوبة'
                    : 'تم رفض طلبك — يرجى مراجعة الوثائق وإعادة الرفع'}
                </p>
                <p className={cn('text-xs mt-0.5 opacity-80', kyc.color)}>
                  سيتم مراجعة وثائقك خلال 24-48 ساعة من الرفع الكامل
                </p>
              </div>
            </div>
          )}

          {/* Document cards */}
          <div className="space-y-3">
            {REQUIRED_DOCS.map((docDef) => {
              const uploaded = docMap[docDef.type];
              const isUploading = uploadDoc.isPending && uploadingDocType === docDef.type;
              const isShowingUpload = showUploadFor === docDef.type;

              return (
                <div key={docDef.type} className={cn(
                  'rounded-xl border-2 p-3 transition-all',
                  uploaded?.verified ? 'border-emerald-200 bg-emerald-50' :
                  uploaded?.rejectionReason ? 'border-red-200 bg-red-50' :
                  uploaded ? 'border-amber-200 bg-amber-50' :
                  'border-dashed border-gray-200 bg-gray-50'
                )}>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl flex-shrink-0">{docDef.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-800">{docDef.label}</p>
                        {docDef.required && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">مطلوب</span>
                        )}
                      </div>
                      {uploaded ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <DocStatusIcon doc={uploaded} />
                          <p className={cn(
                            'text-xs font-medium',
                            uploaded.verified ? 'text-emerald-600' :
                            uploaded.rejectionReason ? 'text-red-600' :
                            'text-amber-600'
                          )}>
                            {uploaded.verified ? 'تم التحقق' :
                             uploaded.rejectionReason ? `مرفوض: ${uploaded.rejectionReason}` :
                             'قيد المراجعة'}
                          </p>
                          {uploaded.fileName && (
                            <span className="text-xs text-gray-400">— {uploaded.fileName}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">لم يُرفع بعد</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {uploaded && !uploaded.rejectionReason && (
                        <button
                          title="عرض"
                          className="w-7 h-7 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600"
                        >
                          <Eye size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowUploadFor(isShowingUpload ? null : docDef.type);
                          setUploadingDocType(docDef.type);
                        }}
                        className={cn(
                          'flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors',
                          uploaded
                            ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            : 'bg-brand-600 hover:bg-brand-700 text-white'
                        )}
                      >
                        <Upload size={11} />
                        {uploaded ? 'إعادة رفع' : 'رفع'}
                      </button>
                    </div>
                  </div>

                  {/* Inline upload area */}
                  {isShowingUpload && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(docDef.type, file);
                        }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed border-brand-300 rounded-xl bg-brand-50 hover:bg-brand-100 transition-colors disabled:opacity-60"
                      >
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload size={18} className="text-brand-500" />
                        )}
                        <p className="text-xs font-semibold text-brand-700">
                          {isUploading ? 'جاري الرفع…' : 'اضغط لاختيار ملف (صورة أو PDF)'}
                        </p>
                        <p className="text-[10px] text-brand-500">الحجم الأقصى 10 ميجابايت</p>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* All verified message — only count REQUIRED docs that are verified */}
          {REQUIRED_DOCS.filter((rd) => rd.required && docMap[rd.type]?.verified).length === requiredCount && requiredCount > 0 && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-emerald-700">تم التحقق من جميع الوثائق المطلوبة ✓</p>
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <Link href="/orders" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
          <span className="text-sm text-gray-700 flex-1">طلباتي</span>
          <ChevronRight size={16} className="text-gray-400" />
        </Link>
        <Link href="/contracts" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
          <span className="text-sm text-gray-700 flex-1">عقودي</span>
          <ChevronRight size={16} className="text-gray-400" />
        </Link>
        <Link href="/payments" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
          <span className="text-sm text-gray-700 flex-1">مدفوعاتي</span>
          <ChevronRight size={16} className="text-gray-400" />
        </Link>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors"
      >
        <LogOut size={16} />
        تسجيل الخروج
      </button>
    </div>
  );
}
