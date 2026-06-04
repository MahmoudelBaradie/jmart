'use client';
import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';
import { setToken, setUser, clearAuth, getUser, getToken, ALLOWED_USER_TYPES } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AuthUser {
  id: string;
  email: string;
  userType: string;
  internalUser?: { id: string; fullName: string; role: string };
}

export function useAuth() {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getUser<AuthUser>();
    if (stored && getToken()) {
      setUserState(stored);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { accessToken } = res.data;
    setToken(accessToken);

    const meRes = await authApi.me();
    const me = meRes.data;

    // Role guard: the admin panel is ONLY for internal staff. Reject any
    // farmer / buyer / driver login attempt — they have their own portals.
    if (!ALLOWED_USER_TYPES.includes(me?.userType as any)) {
      clearAuth();
      throw new Error('هذه اللوحة مخصّصة للموظفين الداخليين فقط.');
    }

    setUser(me);
    setUserState(me);

    return me;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    setUserState(null);
    router.push('/login');
  }, [router]);

  return { user, loading, login, logout, isAuthenticated: !!user };
}
