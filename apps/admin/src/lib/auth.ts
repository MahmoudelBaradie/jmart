import Cookies from 'js-cookie';

// App-isolated cookie/storage names. MUST NOT match farmer/driver portals.
// Sharing `access_token` across all three apps on localhost caused cross-
// portal session leaks (admin token bleeding into driver portal).
const TOKEN_KEY = 'jmart_admin_token';
const USER_KEY  = 'jmart_admin_user';

/** Allowed user types for this portal (Admin only accepts INTERNAL staff). */
export const ALLOWED_USER_TYPES = ['INTERNAL'] as const;

export function setToken(token: string) {
  Cookies.set(TOKEN_KEY, token, { expires: 1, sameSite: 'lax' });
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function clearToken() {
  Cookies.remove(TOKEN_KEY);
}

export function setUser(user: unknown) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function clearUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearAuth() {
  clearToken();
  clearUser();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
