import Cookies from 'js-cookie';

// App-isolated cookie/storage. Distinct from admin and driver portals to
// prevent localhost session bleed between apps.
const TOKEN_KEY = 'jmart_portal_token';
const USER_KEY  = 'jmart_portal_user';

/** Farmer/Buyer portal accepts only farmers and buyers — NEVER internal/driver. */
export const ALLOWED_USER_TYPES = ['FARMER', 'BUYER'] as const;

const isBrowser = typeof window !== 'undefined';

// ── Token (cookie) ────────────────────────────────────────────────────────────
export const setToken   = (token: string) =>
  Cookies.set(TOKEN_KEY, token, { expires: 1, sameSite: 'Strict' });
export const getToken   = () => Cookies.get(TOKEN_KEY);
export const clearToken = () => Cookies.remove(TOKEN_KEY);

// ── User (localStorage) ───────────────────────────────────────────────────────
export const setUser = (user: unknown) => {
  if (!isBrowser) return;                        // SSR guard (was missing)
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = <T>(): T | null => {
  if (!isBrowser) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
};

export const clearUser = () => {
  if (!isBrowser) return;                        // SSR guard (was missing)
  localStorage.removeItem(USER_KEY);
};

export const clearAuth = () => { clearToken(); clearUser(); };
