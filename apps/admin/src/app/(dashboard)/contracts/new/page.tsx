'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { contractsApi, farmersApi, buyersApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight, ChevronLeft, CheckCircle2, User, Building2,
  Calendar, Package, FileText, Send, Loader2, Search,
  AlertCircle, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'اختيار الأطراف',    icon: User },
  { id: 2, label: 'نوع العقد والمدة',  icon: Calendar },
  { id: 3, label: 'الكميات والسعر',    icon: Package },
  { id: 4, label: 'الشروط',            icon: FileText },
  { id: 5, label: 'المراجعة والإرسال', icon: Send },
];

const CONTRACT_TYPES = [
  { value: 'SUPPLY',        label: 'عقد توريد',      desc: 'اتفاقية توريد عادية بين مزارع ومشتري' },
  { value: 'EXCLUSIVE',     label: 'عقد حصري',       desc: 'حصرية توريد لجهة معينة خلال الفترة' },
  { value: 'TENDER_AWARD',  label: 'منح مناقصة',     desc: 'عقد ناتج عن مناقصة رسمية' },
];

const PRICE_LOCK_TYPES = [
  { value: 'FIXED',               label: 'سعر ثابت',           desc: 'يُحدد السعر مرة واحدة للمدة كلها' },
  { value: 'BANDED',              label: 'نطاق سعري',          desc: 'حد أدنى وأعلى للسعر' },
  { value: 'MARKET_RATE',         label: 'سعر السوق',          desc: 'يتبع سعر السوق الجاري' },
  { value: 'NEGOTIATED_MONTHLY',  label: 'تفاوض شهري',         desc: 'يُراجَع السعر كل شهر' },
];

const SETTLEMENT_OPTIONS = [
  { value: 'PER_ORDER', label: 'لكل طلب' },
  { value: 'WEEKLY',    label: 'أسبوعي' },
  { value: 'MONTHLY',   label: 'شهري' },
];

interface ContractForm {
  farmerId: string;
  farmerName: string;
  buyerId: string;
  buyerName: string;
  title: string;
  contractType: string;
  startDate: string;
  endDate: string;
  totalVolumeMin: string;
  totalVolumeMax: string;
  volumeUnit: string;
  priceLockType: string;
  settlementFrequency: string;
  paymentTermsDays: string;
  autoRenew: boolean;
  renewalNoticeDays: string;
  description: string;
  internalNotes: string;
}

const INITIAL_FORM: ContractForm = {
  farmerId: '', farmerName: '',
  buyerId: '',  buyerName: '',
  title: '',
  contractType: 'SUPPLY',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10),
  totalVolumeMin: '',
  totalVolumeMax: '',
  volumeUnit: 'KG',
  priceLockType: 'FIXED',
  settlementFrequency: 'PER_ORDER',
  paymentTermsDays: '30',
  autoRenew: false,
  renewalNoticeDays: '30',
  description: '',
  internalNotes: '',
};

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              'flex flex-col items-center gap-1 flex-shrink-0',
            )}>
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                done   ? 'bg-emerald-500 border-emerald-500 text-white' :
                active ? 'bg-brand-600 border-brand-600 text-white ring-4 ring-brand-100' :
                         'bg-white border-gray-200 text-gray-400'
              )}>
                {done ? <CheckCircle2 size={16} /> : s.id}
              </div>
              <span className={cn(
                'text-[10px] font-semibold hidden sm:block whitespace-nowrap',
                active ? 'text-brand-700' : done ? 'text-emerald-600' : 'text-gray-400'
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-2 mt-[-14px]', done ? 'bg-emerald-400' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PartyPicker({
  label, searchPlaceholder, items, selectedId, onSelect, loading,
}: {
  label: string;
  searchPlaceholder: string;
  items: { id: string; name: string; sub?: string }[];
  selectedId: string;
  onSelect: (id: string, name: string) => void;
  loading: boolean;
}) {
  const [q, setQ] = useState('');
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(q.toLowerCase()) ||
    (i.sub && i.sub.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <div className="relative mb-2">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full border border-gray-200 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 size={18} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">لا توجد نتائج</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id, item.name)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all',
                selectedId === item.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              )}
            >
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                {item.sub && <p className="text-xs text-gray-400">{item.sub}</p>}
              </div>
              {selectedId === item.id && <CheckCircle2 size={16} className="text-brand-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewContractPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ContractForm>(INITIAL_FORM);
  const [error, setError] = useState('');

  const upd = (k: keyof ContractForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const { data: farmersData, isLoading: loadingFarmers } = useQuery({
    queryKey: ['farmers-list-for-contract'],
    queryFn: () => farmersApi.list({ limit: 100, page: 1 }).then((r) => r.data),
    enabled: step === 1,
  });

  const { data: buyersData, isLoading: loadingBuyers } = useQuery({
    queryKey: ['buyers-list-for-contract'],
    queryFn: () => buyersApi.list({ limit: 100, page: 1 }).then((r) => r.data),
    enabled: step === 1,
  });

  const farmers = (farmersData?.data || []).map((f: { id: string; businessName: string; contactPersonName: string }) => ({
    id: f.id,
    name: f.businessName,
    sub: f.contactPersonName,
  }));

  const buyers = (buyersData?.data || []).map((b: { id: string; businessName: string; contactPersonName: string }) => ({
    id: b.id,
    name: b.businessName,
    sub: b.contactPersonName,
  }));

  const createMutation = useMutation({
    mutationFn: () => contractsApi.create({
      farmerId: form.farmerId,
      buyerId: form.buyerId,
      title: form.title,
      contractType: form.contractType,
      startDate: form.startDate,
      endDate: form.endDate,
      totalVolumeMin: form.totalVolumeMin ? parseFloat(form.totalVolumeMin) : undefined,
      totalVolumeMax: form.totalVolumeMax ? parseFloat(form.totalVolumeMax) : undefined,
      volumeUnit: form.volumeUnit,
      priceLockType: form.priceLockType,
      settlementFrequency: form.settlementFrequency,
      paymentTermsDays: parseInt(form.paymentTermsDays || '0'),
      autoRenew: form.autoRenew,
      renewalNoticeDays: parseInt(form.renewalNoticeDays || '30'),
      description: form.description || undefined,
      internalNotes: form.internalNotes || undefined,
    }),
    onSuccess: (res) => {
      router.push(`/contracts/${res.data?.id || ''}`);
    },
    onError: () => setError('حدث خطأ أثناء إنشاء العقد. يرجى المحاولة مجدداً.'),
  });

  const validate = () => {
    if (step === 1) {
      if (!form.farmerId) return 'يرجى اختيار المزارع';
      if (!form.buyerId) return 'يرجى اختيار المشتري';
    }
    if (step === 2) {
      if (!form.title.trim()) return 'يرجى إدخال عنوان العقد';
      if (!form.startDate || !form.endDate) return 'يرجى تحديد مدة العقد';
      if (new Date(form.startDate) >= new Date(form.endDate)) return 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية';
    }
    return '';
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const prev = () => { setError(''); setStep((s) => Math.max(s - 1, 1)); };

  return (
    <div className="max-w-3xl mx-auto p-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/contracts" className="hover:text-brand-600 transition-colors">العقود</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-bold">إنشاء عقد جديد</span>
      </div>

      <StepIndicator current={step} />

      <Card className="p-6">
        {/* ── Step 1: Parties ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">اختيار أطراف العقد</h2>
              <p className="text-sm text-gray-500">حدد المزارع والمشتري الذين سيرتبطان بهذا العقد</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <PartyPicker
                label="المزارع"
                searchPlaceholder="ابحث عن مزارع…"
                items={farmers}
                selectedId={form.farmerId}
                onSelect={(id, name) => { upd('farmerId', id); upd('farmerName', name); }}
                loading={loadingFarmers}
              />
              <PartyPicker
                label="المشتري"
                searchPlaceholder="ابحث عن مشتري…"
                items={buyers}
                selectedId={form.buyerId}
                onSelect={(id, name) => { upd('buyerId', id); upd('buyerName', name); }}
                loading={loadingBuyers}
              />
            </div>

            {form.farmerId && form.buyerId && (
              <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl border border-brand-200">
                <CheckCircle2 size={16} className="text-brand-600 flex-shrink-0" />
                <p className="text-sm text-brand-800 font-semibold">
                  {form.farmerName} ← → {form.buyerName}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Type & Duration ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">نوع العقد والمدة الزمنية</h2>
              <p className="text-sm text-gray-500">حدد نوع العقد وعنوانه ومدة سريانه</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">عنوان العقد *</label>
              <input
                value={form.title}
                onChange={(e) => upd('title', e.target.value)}
                placeholder="مثال: عقد توريد تمور — مزرعة الهدا 2026"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">نوع العقد *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CONTRACT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => upd('contractType', ct.value)}
                    className={cn(
                      'flex flex-col gap-1 p-3 rounded-xl border-2 text-right transition-all',
                      form.contractType === ct.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    <p className="text-sm font-bold text-gray-800">{ct.label}</p>
                    <p className="text-xs text-gray-500">{ct.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">تاريخ البداية *</label>
                <input type="date" value={form.startDate}
                  onChange={(e) => upd('startDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">تاريخ الانتهاء *</label>
                <input type="date" value={form.endDate}
                  onChange={(e) => upd('endDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Volumes & Price ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">الكميات وآلية التسعير</h2>
              <p className="text-sm text-gray-500">حدد الكميات المتوقعة وطريقة تحديد السعر</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الكمية الدنيا</label>
                <input type="number" value={form.totalVolumeMin}
                  onChange={(e) => upd('totalVolumeMin', e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الكمية العليا</label>
                <input type="number" value={form.totalVolumeMax}
                  onChange={(e) => upd('totalVolumeMax', e.target.value)}
                  placeholder="∞"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الوحدة</label>
                <select value={form.volumeUnit} onChange={(e) => upd('volumeUnit', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                  {['KG', 'TON', 'BOX', 'PALLET', 'UNIT'].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">آلية تحديد السعر *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRICE_LOCK_TYPES.map((pl) => (
                  <button
                    key={pl.value}
                    onClick={() => upd('priceLockType', pl.value)}
                    className={cn(
                      'flex flex-col gap-1 p-3 rounded-xl border-2 text-right transition-all',
                      form.priceLockType === pl.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    <p className="text-sm font-bold text-gray-800">{pl.label}</p>
                    <p className="text-xs text-gray-500">{pl.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">دورية التسوية</label>
                <select value={form.settlementFrequency}
                  onChange={(e) => upd('settlementFrequency', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                  {SETTLEMENT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">مدة السداد (أيام)</label>
                <input type="number" value={form.paymentTermsDays}
                  onChange={(e) => upd('paymentTermsDays', e.target.value)}
                  placeholder="30"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Terms ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">الشروط والأحكام</h2>
              <p className="text-sm text-gray-500">أضف وصف العقد وخيارات التجديد والملاحظات الداخلية</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">وصف العقد</label>
              <textarea value={form.description}
                onChange={(e) => upd('description', e.target.value)}
                rows={4}
                placeholder="اكتب وصفاً مفصلاً لشروط هذا العقد، الالتزامات، والملاحظات الجوهرية…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">التجديد التلقائي</p>
                <p className="text-xs text-gray-500 mt-0.5">تجديد العقد تلقائياً عند انتهاء مدته</p>
              </div>
              <button
                onClick={() => upd('autoRenew', !form.autoRenew)}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                  form.autoRenew ? 'bg-brand-600' : 'bg-gray-300'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  form.autoRenew ? 'translate-x-[-2px] right-0' : 'translate-x-[2px] left-0'
                )} />
              </button>
            </div>

            {form.autoRenew && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">إشعار التجديد قبل (أيام)</label>
                <input type="number" value={form.renewalNoticeDays}
                  onChange={(e) => upd('renewalNoticeDays', e.target.value)}
                  placeholder="30"
                  className="w-48 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">ملاحظات داخلية (للأدمن فقط)</label>
              <textarea value={form.internalNotes}
                onChange={(e) => upd('internalNotes', e.target.value)}
                rows={3}
                placeholder="ملاحظات غير مرئية للأطراف…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>
        )}

        {/* ── Step 5: Review & Submit ── */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">مراجعة وإرسال العقد</h2>
              <p className="text-sm text-gray-500">راجع تفاصيل العقد قبل الإرسال</p>
            </div>

            <div className="bg-gray-50 rounded-2xl border border-gray-200 divide-y divide-gray-200">
              {[
                { label: 'المزارع', value: form.farmerName },
                { label: 'المشتري', value: form.buyerName },
                { label: 'عنوان العقد', value: form.title },
                { label: 'نوع العقد', value: CONTRACT_TYPES.find((c) => c.value === form.contractType)?.label },
                { label: 'تاريخ البداية', value: form.startDate },
                { label: 'تاريخ الانتهاء', value: form.endDate },
                { label: 'الكمية (دنيا → عليا)', value: form.totalVolumeMin || form.totalVolumeMax ? `${form.totalVolumeMin || '—'} → ${form.totalVolumeMax || '—'} ${form.volumeUnit}` : '—' },
                { label: 'آلية السعر', value: PRICE_LOCK_TYPES.find((p) => p.value === form.priceLockType)?.label },
                { label: 'التسوية', value: SETTLEMENT_OPTIONS.find((s) => s.value === form.settlementFrequency)?.label },
                { label: 'مدة السداد', value: `${form.paymentTermsDays} يوم` },
                { label: 'تجديد تلقائي', value: form.autoRenew ? `نعم (إشعار قبل ${form.renewalNoticeDays} يوم)` : 'لا' },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex gap-3 px-4 py-3">
                  <span className="text-xs text-gray-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm font-semibold text-gray-800">{value}</span>
                </div>
              ) : null)}
            </div>

            {form.description && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-800 mb-1">الوصف</p>
                <p className="text-sm text-blue-700">{form.description}</p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <Zap size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                سيُنشأ العقد بحالة <strong>مسودة (DRAFT)</strong> ويمكنك بعدها إرساله للمراجعة وجمع التوقيعات.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && step !== 5 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 rounded-xl border border-red-200">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
          <button
            onClick={prev}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2.5 text-gray-600 font-semibold text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            السابق
          </button>

          <div className="flex items-center gap-1">
            {STEPS.map((s) => (
              <div key={s.id} className={cn(
                'w-2 h-2 rounded-full transition-all',
                step === s.id ? 'bg-brand-600 w-5' : step > s.id ? 'bg-emerald-400' : 'bg-gray-200'
              )} />
            ))}
          </div>

          {step < STEPS.length ? (
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              التالي
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              إنشاء العقد
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
