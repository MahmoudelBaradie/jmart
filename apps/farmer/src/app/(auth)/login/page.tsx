'use client';
import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const loginRes = await authApi.login(email, password);
      const accessToken = loginRes.data?.accessToken;
      if (!accessToken) throw new Error('لم يتم استلام التوكن');
      setToken(accessToken);
      const meRes = await authApi.me();
      const me = meRes.data;
      if (!me?.farmer && !me?.buyer) {
        throw new Error('هذه البوابة للمزارعين والمشترين فقط');
      }
      setUser(me);
      window.location.replace('/');
    } catch (err: unknown) {
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const errMsg = (err as { message?: string })?.message;
      const raw = axiosMsg || errMsg || 'حدث خطأ في الاتصال بالسيرفر';
      setError(Array.isArray(raw) ? raw[0] : raw);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #166534 0%, #16a34a 100%)',
      padding: '16px',
      boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: '384px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '32px',
          }}>🌾</div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>جمارت</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '4px' }}>بوابة المزارعين والمشترين</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '16px',
          padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginTop: 0, marginBottom: '24px' }}>
            تسجيل الدخول
          </h2>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                borderRadius: '10px', fontSize: '14px', outline: 'none',
                boxSizing: 'border-box', direction: 'ltr', textAlign: 'right',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                borderRadius: '10px', fontSize: '14px', outline: 'none',
                boxSizing: 'border-box', direction: 'ltr', textAlign: 'right',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: '10px', padding: '12px', marginBottom: '16px',
              color: '#dc2626', fontSize: '14px', fontWeight: '500',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Button — onClick بدل onSubmit لتجاوز أي مشكلة في الـ form */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading || !mounted}
            style={{
              width: '100%', padding: '13px',
              background: loading ? '#9ca3af' : '#16a34a',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              transition: 'background 0.2s',
            }}
          >
            {!mounted ? '...' : loading ? '⏳ جارٍ الدخول…' : 'تسجيل الدخول'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', marginTop: '20px', marginBottom: 0 }}>
            ليس لديك حساب؟{' '}
            <Link href="/register" style={{ color: '#16a34a', fontWeight: '600', textDecoration: 'none' }}>
              أنشئ حساباً
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
