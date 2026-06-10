'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { setToken, setUser, clearAuth, getUser, getToken, ALLOWED_USER_TYPES } from '@/lib/auth';

export interface PortalUser {
  id: string;
  email: string;
  userType: string;
  farmer?: { id: string; businessName: string; kycStatus: string };
  buyer?: { id: string; businessName: string; kycStatus: string };
}

export type ActiveRole = 'FARMER' | 'BUYER';

const ROLE_KEY = 'jmart_active_role';

export function useAuth() {
  const [user, setUserState] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<ActiveRole>('FARMER');
  const router = useRouter();

  useEffect(() => {
    const stored = getUser<PortalUser>();
    if (stored && getToken()) {
      // Render immediately from cache so the UI doesn't blink.
      setUserState(stored);
      const savedRole = localStorage.getItem(ROLE_KEY) as ActiveRole | null;
      const hasFarmer = !!stored.farmer;
      const hasBuyer = !!stored.buyer;
      if (savedRole === 'BUYER' && hasBuyer) setActiveRoleState('BUYER');
      else if (hasFarmer) setActiveRoleState('FARMER');
      else if (hasBuyer) setActiveRoleState('BUYER');

      // Then quietly re-fetch from /auth/me so server-side changes (KYC
      // approval, profile updates) show up without a logout/login cycle.
      // Failures are swallowed: if the token is invalid the next protected
      // call's 401 interceptor will redirect.
      authApi.me().then((r) => {
        const me = r.data as PortalUser;
        if (me) { setUser(me); setUserState(me); }
      }).catch(() => { /* tolerate transient errors */ });
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { accessToken } = res.data;
    setToken(accessToken);

    // If /me fails after setting token, roll back so no orphan cookie is left
    let me: PortalUser;
    try {
      const meRes = await authApi.me();
      me = meRes.data as PortalUser;
    } catch (err) {
      clearAuth();
      throw err;
    }

    const hasFarmer = !!me.farmer;
    const hasBuyer = !!me.buyer;

    // Defence in depth: reject by userType first (catches DRIVER/INTERNAL),
    // then require an actual farmer/buyer profile attached.
    if (!ALLOWED_USER_TYPES.includes(me.userType as any) || (!hasFarmer && !hasBuyer)) {
      clearAuth();
      throw new Error('هذه البوابة مخصصة للمزارعين والمشترين فقط');
    }

    setUser(me);
    setUserState(me);

    // Set default active role
    const defaultRole: ActiveRole = hasFarmer ? 'FARMER' : 'BUYER';
    setActiveRoleState(defaultRole);
    localStorage.setItem(ROLE_KEY, defaultRole);

    return me;
  }, []);

  const switchRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
    localStorage.setItem(ROLE_KEY, role);
    router.push('/');
  }, [router]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    localStorage.removeItem(ROLE_KEY);
    setUserState(null);
    router.push('/login');
  }, [router]);

  const hasFarmer = !!user?.farmer;
  const hasBuyer = !!user?.buyer;
  const hasBothRoles = hasFarmer && hasBuyer;

  const isFarmer = activeRole === 'FARMER' && hasFarmer;
  const isBuyer = activeRole === 'BUYER' && hasBuyer;

  const displayName = isFarmer
    ? user?.farmer?.businessName
    : user?.buyer?.businessName;

  const kycStatus = isFarmer
    ? user?.farmer?.kycStatus
    : user?.buyer?.kycStatus;

  return {
    user,
    loading,
    login,
    logout,
    switchRole,
    activeRole,
    isFarmer,
    isBuyer,
    hasFarmer,
    hasBuyer,
    hasBothRoles,
    displayName,
    kycStatus,
    isAuthenticated: !!user,
  };
}
