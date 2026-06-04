import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { storage } from '@/lib/storage';

export interface User {
  id: string;
  email: string;
  userType: string;
  name?: string;
  phone?: string;
  farmer?: { id: string; businessName: string; contactPersonName?: string; phone?: string };
  buyer?: { id: string; businessName: string; contactPersonName?: string; phone?: string };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isFarmer: boolean;
  isBuyer: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await storage.get('token');
        if (t) {
          setToken(t);
          const res = await authApi.me();
          setUser(res.data?.data ?? res.data);
        }
      } catch {
        await storage.delete('token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const data = res.data?.data ?? res.data;
    const t = data.accessToken ?? data.token;
    await storage.set('token', t);
    setToken(t);
    const me = await authApi.me();
    setUser(me.data?.data ?? me.data);
  };

  const logout = async () => {
    await storage.delete('token');
    setToken(null);
    setUser(null);
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        token,
        loading,
        login,
        logout,
        isFarmer: user?.userType === 'FARMER' || !!user?.farmer,
        isBuyer: user?.userType === 'BUYER' || !!user?.buyer,
      },
    },
    children
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
