'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, farmerApi, buyerApi } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';
import { Sprout, ShoppingCart, Users, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type RoleChoice = 'FARMER' | 'BUYER' | 'BOTH';

const ROLE_OPTIONS: { value: RoleChoice; icon: React.ElementType; label: string; desc: string; color: string }[] = [
  {
    value: 'FARMER',
    icon: Sprout,
    label: 'مزارع',
    desc: 'أبيع منتجاتي الزراعية على المنصة',
    color: 'border-brand-400 bg-brand-50 text-brand-700',
  },
  {
    value: 'BUYER',
    icon: ShoppingCart,
    label: 'مشتري',
    desc: 'أشتري المنتجات الزراعية من المزارعين',
    color: 'border-blue-400 bg-blue-50 text-blue-700',
  },
  {
    value: 'BOTH',
    icon: Users,
    label: 'مزارع ومشتري',
    desc: 'أبيع وأشتري في نفس الوقت',
    color: 'border-purple-400 bg-purple-50 text-purple-700',
  },
];

const FARMER_TYPES = [
  { value: 'INDIVIDUAL', label: 'مزارع فردي' },
  { value: 'COOPERATIVE', label: 'تعاونية زراعية' },
  { value: 'AGGREGATOR', label: 'جامع محاصيل' },
];

const BUYER_TYPES = [
  { value: 'WHOLESALE_TRADER', label: 'تاجر جملة' },
  { value: 'RESTAURANT', label: 'مطعم' },
  { value: 'RESTAURANT_CHAIN', label: 'سلسلة مطاعم' },
  { value: 'CATERING', label: 'خدمات تموين' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RoleChoice | null>(null);
  const [step, setStep] = useState<'role' | 'account' | 'business' | 'done'>('role');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [account, setAccount] = useState({ email: '', password: '', phone: '' });
  const [business, setBusiness] = useState({
    businessName: '',
    contactPersonName: '',
    contactPhone: '',
    farmerType: 'INDIVIDUAL',
    buyerType: 'WHOLESALE_TRADER',
  });

  const setAcc = (f: string, v: string) => setAccount((p) => ({ ...p, [f]: v }));
  const setBiz = (f: string, v: string) => setBusiness((p) => ({ ...p, [f]: v }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setError('');
    setLoading(true);
    try {
      // 1. Register user account
      const primaryType = role === 'BUYER' ? 'BUYER' : 'FARMER';
      await authApi.register({
        email: account.email,
        password: account.password,
        phone: account.phone || undefined,
        userType: primaryType,
      });

      // 2. Login to get token
      const loginRes = await authApi.login(account.email, account.password);
      setToken(loginRes.data.accessToken);

      // 3. Create profile(s)
      if (role === 'FARMER' || role === 'BOTH') {
        await farmerApi.createProfile({
          businessName: business.businessName,
          farmerType: business.farmerType,
          contactPersonName: business.contactPersonName,
          contactPhone: business.contactPhone || account.phone || '',
        });
      }
      if (role === 'BUYER' || role === 'BOTH') {
        await buyerApi.createProfile({
          businessName: business.businessName,
          buyerType: business.buyerType,
          contactPersonName: business.contactPersonName,
          contactPhone: business.contactPhone || account.phone || '',
        });
      }

      // 4. Fetch updated profile
      const meRes = await authApi.me();
      setUser(meRes.data);
      setStep('done');
    } catch (err: unknown) {
      // Surface ALL backend validation errors (errors[] array) — the previous
      // code only showed `message: 'Validation failed'` which gave the user
      // no idea WHICH field was wrong (password rules, missing field, etc).
      const resp = (err as any)?.response?.data;
      const errs: string[] = Array.isArray(resp?.errors) ? resp.errors
        : Array.isArray(resp?.message) ? resp.message
        : resp?.message ? [resp.message]
        : [];
      // Translate the most common backend rules into Arabic for clarity.
      const translate = (m: string): string => {
        if (/uppercase.*lowercase.*number/i.test(m)) return 'كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم على الأقل';
        if (/password.*8/i.test(m) || /shorter than.*8/i.test(m)) return 'كلمة المرور قصيرة — على الأقل 8 أحرف';
        if (/email/i.test(m)) return 'البريد الإلكتروني غير صالح';
        if (/phone/i.test(m)) return 'صيغة رقم الجوال غير صحيحة';
        if (/email already/i.test(m) || /already exists/i.test(m)) return 'هذا البريد مسجَّل بالفعل';
        if (/farmerType/i.test(m)) return 'نوع النشاط الزراعي غير صحيح';
        if (/businessName/i.test(m)) return 'اسم النشاط التجاري مطلوب';
        return m;
      };
      setError(errs.length ? errs.map(translate).join(' · ') : 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full flex flex-col items-center justify-center p-4"
      style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-black text-2xl">J</span>
          </div>
          <h1 className="text-xl font-bold text-white">إنشاء حساب جديد</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Step: Choose role */}
          {step === 'role' && (
            <div className="p-6 space-y-4">
              <h2 className="text-base font-bold text-gray-800">ما طبيعة نشاطك؟</h2>
              <div className="space-y-3">
                {ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-right transition-all',
                        selected ? opt.color + ' border-2' : 'border-gray-200 hover:border-gray-300 bg-white',
                      )}
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', selected ? 'bg-white/60' : 'bg-gray-100')}>
                        <Icon size={20} className={selected ? '' : 'text-gray-500'} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                      {selected && <CheckCircle size={18} className="mr-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => role && setStep('account')}
                disabled={!role}
                className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors disabled:opacity-40 mt-2"
              >
                التالي
              </button>
              <p className="text-center text-sm text-gray-500">
                لديك حساب؟{' '}
                <Link href="/login" className="text-slate-700 font-bold hover:underline">تسجيل الدخول</Link>
              </p>
            </div>
          )}

          {/* Step: Account info */}
          {step === 'account' && (
            <div className="p-6 space-y-4">
              {/* Role indicator */}
              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold',
                role === 'FARMER' ? 'bg-brand-50 text-brand-700' :
                role === 'BUYER' ? 'bg-blue-50 text-blue-700' :
                'bg-purple-50 text-purple-700')}>
                {role === 'FARMER' ? '🌾 مزارع' : role === 'BUYER' ? '🛒 مشتري' : '🌾🛒 مزارع ومشتري'}
                <button type="button" onClick={() => setStep('role')} className="mr-auto text-xs font-medium opacity-60 hover:opacity-100">
                  تغيير
                </button>
              </div>

              <h2 className="text-base font-bold text-gray-800">بيانات الحساب</h2>

              {[
                { label: 'البريد الإلكتروني', field: 'email', type: 'email', placeholder: 'example@domain.com', required: true },
                { label: 'كلمة المرور', field: 'password', type: 'password', placeholder: '••••••••', required: true },
                { label: 'رقم الجوال', field: 'phone', type: 'tel', placeholder: '+966500000000', required: false },
              ].map(({ label, field, type, placeholder, required }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label} {required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type={type}
                    value={account[field as keyof typeof account]}
                    onChange={(e) => setAcc(field, e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setStep('role')} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  رجوع
                </button>
                <button
                  type="button"
                  onClick={() => account.email && account.password.length >= 8 && setStep('business')}
                  disabled={!account.email || account.password.length < 8}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}

          {/* Step: Business info */}
          {step === 'business' && (
            <form onSubmit={handleRegister} className="p-6 space-y-4">
              <h2 className="text-base font-bold text-gray-800">بيانات النشاط التجاري</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  اسم النشاط التجاري <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={business.businessName}
                  onChange={(e) => setBiz('businessName', e.target.value)}
                  placeholder="مزرعة الرياض للخضروات"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  اسم المسؤول <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={business.contactPersonName}
                  onChange={(e) => setBiz('contactPersonName', e.target.value)}
                  placeholder="أحمد محمد"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم جوال النشاط</label>
                <input
                  type="tel"
                  value={business.contactPhone}
                  onChange={(e) => setBiz('contactPhone', e.target.value)}
                  placeholder={account.phone || '+966500000000'}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              {(role === 'FARMER' || role === 'BOTH') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع النشاط الزراعي</label>
                  <select
                    value={business.farmerType}
                    onChange={(e) => setBiz('farmerType', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  >
                    {FARMER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}

              {(role === 'BUYER' || role === 'BOTH') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع نشاط الشراء</label>
                  <select
                    value={business.buyerType}
                    onChange={(e) => setBiz('buyerType', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  >
                    {BUYER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setStep('account')} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  رجوع
                </button>
                <button
                  type="submit"
                  disabled={loading || !business.businessName || !business.contactPersonName}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50"
                >
                  {loading ? 'جارٍ التسجيل…' : 'إنشاء الحساب'}
                </button>
              </div>
            </form>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">تم إنشاء حسابك!</h2>
              <p className="text-sm text-gray-500">
                حسابك قيد المراجعة من الإدارة. في الغضون ذلك يمكنك استكشاف المنصة.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors"
              >
                ابدأ الآن
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
