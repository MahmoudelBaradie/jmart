import axios from 'axios';
import { router } from 'expo-router';
import { storage } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await storage.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error?.response?.status === 401) {
      await storage.delete('token');
      try { router.replace('/(auth)/login'); } catch {}
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: Record<string, unknown>) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Listings (marketplace lots + farmer catalog)
export const listingsApi = {
  // Public marketplace lots (buyers browse)
  list: (params?: Record<string, unknown>) =>
    api.get('/inventory/lots', { params }),
  // Single lot detail
  get: (id: string) => api.get(`/inventory/lots/${id}`),
  // Farmer's own catalog listings
  myListings: (params?: Record<string, unknown>) =>
    api.get('/inventory/catalog/my', { params }),
};

// Orders
export const ordersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/orders/my', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: Record<string, unknown>) => api.post('/orders', data),
  cancel: (id: string, reason: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
  confirm: (id: string) => api.post(`/orders/${id}/confirm`),
};

// Contracts
export const contractsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/contracts/my', { params }),
  get: (id: string) => api.get(`/contracts/${id}`),
};

// Notifications
export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/notifications/my', { params }),
  markRead: (id: string) => api.post(`/notifications/my/${id}/read`),
  markAllRead: () => api.post('/notifications/my/read-all'),
  unreadCount: () => api.get('/notifications/my/unread-count'),
};

// Farms
export const farmsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/farms', { params }),
  get: (id: string) => api.get(`/farms/${id}`),
  follow: (id: string) => api.post(`/farms/${id}/follow`),
  unfollow: (id: string) => api.delete(`/farms/${id}/follow`),
};

// Financial
export const financialApi = {
  invoices: (params?: Record<string, unknown>) =>
    api.get('/financial/invoices/my', { params }),
  summary: () => api.get('/financial/summary/my'),
};

// Categories
export const categoriesApi = {
  list: () => api.get('/categories/flat'),
};

// Ratings
export const ratingsApi = {
  create: (data: Record<string, unknown>) => api.post('/ratings', data),
};

// Disputes
export const disputesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/disputes', { params }),
  get: (id: string) => api.get(`/disputes/${id}`),
  create: (data: Record<string, unknown>) => api.post('/disputes', data),
};

// Marketplace banners (admin-managed, geo-zone-aware)
// Mirrors apps/farmer/src/lib/api.ts → bannersApi.marketplace
export const bannersApi = {
  marketplace: (zoneId?: string) =>
    api.get('/banners/marketplace', { params: zoneId ? { zoneId } : undefined }),
};

// Buyer profile + branches (geo zone of the active branch drives banner targeting)
export const buyerApi = {
  me: () => api.get('/buyers/me'),
  myBranches: () => api.get('/buyers/me/branches'),
};
