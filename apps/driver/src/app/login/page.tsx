'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Truck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/shipments');
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'فشل تسجيل الدخول');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-700 to-emerald-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-3 shadow-2xl">
            <Truck size={32} className="text-amber-300" />
          </div>
          <h1 className="text-3xl font-black text-white">جمارت</h1>
          <p className="text-emerald-100 text-sm mt-1">تطبيق سائقي الشحن</p>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          <h2 className="font-bold text-gray-900">تسجيل الدخول</h2>

          {err && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{err}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">البريد الإلكتروني</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="driver@example.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">كلمة المرور</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
          </button>

          <p className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
            سائق جديد؟ <Link href="/register" className="text-emerald-600 font-bold">انضم الآن</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
