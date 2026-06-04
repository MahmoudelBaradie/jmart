'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  userType: string;
  driver?: { id: string; fullName: string; status: string; vehicleType?: string; vehicleCapacityKg?: number };
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Hydrate from cookie + /auth/me on first paint
  useEffect(() => {
    const token = Cookies.get('jmart_driver_token');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then((r) => setUser(r.data?.data ?? r.data))
      .catch(() => { Cookies.remove('jmart_driver_token'); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await authApi.login(email, password);
    const token = r.data?.data?.accessToken;
    const me = r.data?.data?.user;
    if (!token) throw new Error('login failed');

    // Role guard: this portal is for DRIVER user types only. Reject anyone
    // else (admin / farmer / buyer) so a leaked or misused credential cannot
    // hijack the driver bidding flow.
    if (me?.userType !== 'DRIVER') {
      throw new Error('هذه البوابة مخصّصة للسائقين فقط. سجّل الدخول بحساب سائق.');
    }

    Cookies.set('jmart_driver_token', token, { expires: 1, sameSite: 'lax' });
    setUser(me);
  };

  const logout = async () => {
    Cookies.remove('jmart_driver_token');
    setUser(null);
    router.replace('/login');
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
