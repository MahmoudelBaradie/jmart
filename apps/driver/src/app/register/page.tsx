'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Truck, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await authApi.register({ email: email.trim(), password, phone, userType: 'DRIVER' });
      // Driver profile creation requires admin approval; we just show success.
      setDone(true);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'فشل التسجيل');
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">تم إنشاء حسابك!</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            سيراجع فريق جمارت بياناتك ومستندات الترخيص. ستتلقى إشعاراً بالموافقة خلال 24-48 ساعة.
          </p>
          <Link href="/login" className="inline-block mt-5 bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm mb-2">
            <Truck size={28} className="text-amber-300" />
          </div>
          <h1 className="text-2xl font-black text-white">انضم كسائق شحن</h1>
          <p className="text-emerald-100 text-xs mt-1">احصل على فرص شحن في منطقتك</p>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-2xl p-6 space-y-3">
          {err && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{err}</p>
            </div>
          )}

          <Field label="الاسم الكامل">
            <input
              type="text" required value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="خالد محمد العتيبي"
              className={inputCls}
            />
          </Field>

          <Field label="البريد الإلكتروني">
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="driver@example.com"
              className={inputCls}
            />
          </Field>

          <Field label="كلمة المرور">
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="٨ أحرف على الأقل (حروف وأرقام)"
              className={inputCls}
            />
          </Field>

          <Field label="رقم الجوال">
            <input
              type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966500000000"
              className={inputCls}
            />
          </Field>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            ملاحظة: بعد التسجيل سيُطلب منك تزويد فريق جمارت ببيانات الرخصة، السيارة، وحجم الحمولة لتفعيل حسابك.
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
          </button>

          <p className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
            لديك حساب؟ <Link href="/login" className="text-emerald-600 font-bold">تسجيل الدخول</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-700 block mb-1">{label}</label>
      {children}
    </div>
  );
}
