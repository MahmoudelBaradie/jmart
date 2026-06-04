import axios from 'axios';
import Cookies from 'js-cookie';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
});

api.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const token = Cookies.get('jmart_driver_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Bounce to /login on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (typeof window !== 'undefined' && err?.response?.status === 401) {
      Cookies.remove('jmart_driver_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const bidsApi = {
  open: () => api.get('/shipment-bids/open'),
  mine: (status?: string) => api.get('/shipment-bids/mine', { params: status ? { status } : undefined }),
  submit: (shipmentId: string, data: Record<string, unknown>) => api.post(`/shipments/${shipmentId}/bids`, data),
  withdraw: (bidId: string) => api.delete(`/shipment-bids/${bidId}`),
};

export const notificationsApi = {
  unreadCount: () => api.get('/notifications/my/unread-count'),
  list: () => api.get('/notifications/my'),
};
