import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Farmer/Buyer portal uses an app-isolated cookie. MUST stay in sync with
// apps/farmer/src/lib/auth.ts. The old name `portal_token` was a leftover and
// caused every request after login to ship without an Authorization header.
const PORTAL_TOKEN_COOKIE = 'jmart_portal_token';
const PORTAL_USER_KEY     = 'jmart_portal_user';
const PORTAL_ROLE_KEY     = 'jmart_active_role';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get(PORTAL_TOKEN_COOKIE);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      const { data, meta } = res.data;
      res.data = meta !== undefined ? { data, meta } : data;
    }
    return res;
  },
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove(PORTAL_TOKEN_COOKIE);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PORTAL_USER_KEY);
        localStorage.removeItem(PORTAL_ROLE_KEY);
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
};

// ── Farmer ────────────────────────────────────────────────────
export const farmerApi = {
  stats: () => api.get('/farmers/me/stats'),
  me: () => api.get('/farmers/me'),
  createProfile: (data: Record<string, unknown>) => api.post('/farmers/profile', data),
  updateProfile: (data: Record<string, unknown>) => api.patch('/farmers/me', data),
  kycDocuments: () => api.get('/farmers/me/kyc-documents'),
  addKycDocument: (data: Record<string, unknown>) => api.post('/farmers/me/kyc-documents', data),
  myFarms: (farmerId: string) => api.get(`/farmers/${farmerId}/farms`),
  createFarm: (farmerId: string, data: Record<string, unknown>) =>
    api.post(`/farmers/${farmerId}/farms`, data),
};

// ── Buyer ─────────────────────────────────────────────────────
export const buyerApi = {
  stats: () => api.get('/buyers/me/stats'),
  createProfile: (data: Record<string, unknown>) => api.post('/buyers/profile', data),
  // Saved delivery addresses (BuyerBranch model)
  myBranches: () => api.get('/buyers/me/branches'),
  createBranch: (data: Record<string, unknown>) => api.post('/buyers/me/branches', data),
  updateBranch: (id: string, data: Record<string, unknown>) => api.patch(`/buyers/me/branches/${id}`, data),
  deleteBranch: (id: string) => api.delete(`/buyers/me/branches/${id}`),
};

// ── Listings (Farmer: my catalog items / Buyer: browse market) ──
export const listingsApi = {
  // Farmer's own catalog listings (with price, qty, isListed toggle)
  myListings: () => api.get('/inventory/catalog/my'),
  updateListing: (id: string, data: Record<string, unknown>) => api.patch(`/inventory/catalog/${id}`, data),
  updatePrice: (id: string, pricePerUnit: number, reason?: string) =>
    api.patch(`/inventory/catalog/${id}/price`, { pricePerUnit, reason }),
  priceHistory: (catalogItemId: string) =>
    api.get(`/inventory/price-history/${catalogItemId}`, { params: { days: 90 } }),
  // Public marketplace lots
  list: (params?: Record<string, unknown>) => api.get('/inventory/lots', { params }),
  get: (id: string) => api.get(`/inventory/lots/${id}`),
  create: (data: Record<string, unknown>) => api.post('/inventory/lots', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/inventory/lots/${id}`, data),
};

// ── Catalog ───────────────────────────────────────────────────
export const catalogApi = {
  list: (params?: Record<string, unknown>) => api.get('/inventory/catalog', { params }),
};

// ── Orders ────────────────────────────────────────────────────
export const ordersApi = {
  list: (params?: Record<string, unknown>) => api.get('/orders/my', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: Record<string, unknown>) => api.post('/orders', data),
  accept: (id: string) => api.post(`/orders/${id}/accept`),
  reject: (id: string, reason: string) => api.post(`/orders/${id}/reject`, { reason }),
  cancel: (id: string, reason: string) => api.post(`/orders/${id}/cancel`, { reason }),
};

// ── Contracts ────────────────────────────────────────────────
export const contractsApi = {
  list: (params?: Record<string, unknown>) => api.get('/contracts/my', { params }),
  get: (id: string) => api.get(`/contracts/${id}`),
  sign: (id: string, signerType: 'farmer' | 'buyer') =>
    api.post(`/contracts/${id}/sign`, { signerType }),
};

// ── Financial ────────────────────────────────────────────────
export const financialApi = {
  payouts: (params?: Record<string, unknown>) => api.get('/financial/payouts/my', { params }),
  invoices: (params?: Record<string, unknown>) => api.get('/financial/invoices/my', { params }),
  summary: () => api.get('/financial/summary/my'),
  recordPayment: (invoiceId: string, data: Record<string, unknown>) =>
    api.post(`/financial/invoices/${invoiceId}/payments`, data),
};

// ── Categories ───────────────────────────────────────────────
export const categoriesApi = {
  flat: () => api.get('/categories/flat'),
  products: (params?: Record<string, unknown>) => api.get('/categories/products', { params }),
};

// ── Disputes ─────────────────────────────────────────────────
export const disputesApi = {
  list: (params?: Record<string, unknown>) => api.get('/disputes/my', { params }),
  get: (id: string) => api.get(`/disputes/${id}`),
  create: (data: Record<string, unknown>) => api.post('/disputes', data),
  addEvidence: (id: string, data: Record<string, unknown>) => api.post(`/disputes/${id}/evidence`, data),
};

// ── Ratings ──────────────────────────────────────────────────
export const ratingsApi = {
  create: (data: Record<string, unknown>) => api.post('/ratings', data),
  getFarmerRatings: (farmerId: string, params?: Record<string, unknown>) =>
    api.get(`/ratings/farmers/${farmerId}`, { params }),
  getBuyerRatings: (buyerId: string, params?: Record<string, unknown>) =>
    api.get(`/ratings/buyers/${buyerId}`, { params }),
  getMyRatingForOrder: (orderId: string) =>
    api.get(`/ratings/my-rating/order/${orderId}`),
};

// ── Farms (Buyer: browse farm profiles and follow) ────────────
export const farmsApi = {
  list: (params?: Record<string, unknown>) => api.get('/farms', { params }),
  get: (farmId: string) => api.get(`/farms/${farmId}`),
  following: () => api.get('/farms/following'),
  follow: (farmId: string) => api.post(`/farms/${farmId}/follow`),
  unfollow: (farmId: string) => api.delete(`/farms/${farmId}/follow`),
};

// ── Logistics / Shipments (Driver portal) ────────────────────
export const logisticsApi = {
  myShipments: (params?: Record<string, unknown>) => api.get('/logistics/shipments/my', { params }),
  get: (id: string) => api.get(`/logistics/shipments/${id}`),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/logistics/shipments/${id}/status`, { status, notes }),
};

// ── Geo Zones ─────────────────────────────────────────────────
export const geoZonesApi = {
  list: (params?: Record<string, unknown>) => api.get('/geo-zones', { params }),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/notifications/my', { params }),
  markRead: (id: string) => api.post(`/notifications/my/${id}/read`),
  markAllRead: () => api.post('/notifications/my/read-all'),
  unreadCount: () => api.get('/notifications/my/unread-count'),
};

// ── Marketplace Banners (read-only for buyers/farmers) ───────
export const bannersApi = {
  marketplace: (zoneId?: string) =>
    api.get('/banners/marketplace', { params: zoneId ? { zoneId } : undefined }),
};

// ── Shipment Bids — buyer & driver flows ─────────────────────
// Drivers post offers; buyers pick the winning offer.
export const shipmentBidsApi = {
  // Buyer
  listForShipment: (shipmentId: string) => api.get(`/shipments/${shipmentId}/bids`),
  accept: (bidId: string) => api.post(`/shipment-bids/${bidId}/accept`),
  // Driver
  listOpen: () => api.get('/shipment-bids/open'),
  listMine: (status?: string) => api.get('/shipment-bids/mine', { params: status ? { status } : undefined }),
  submit: (shipmentId: string, data: Record<string, unknown>) => api.post(`/shipments/${shipmentId}/bids`, data),
  withdraw: (bidId: string) => api.delete(`/shipment-bids/${bidId}`),
};

// ── Social (profile walls, posts, comments, likes) ───────────
// `as` = 'FARMER' | 'BUYER' disambiguates dual-role accounts.
export const socialApi = {
  feed: (as?: string, params?: Record<string, unknown>) =>
    api.get('/social/feed', { params: { ...(as ? { as } : {}), ...params } }),
  wall: (authorType: string, authorId: string, as?: string) =>
    api.get(`/social/wall/${authorType}/${authorId}`, { params: as ? { as } : undefined }),
  createPost: (data: Record<string, unknown>, as?: string) =>
    api.post('/social/posts', data, { params: as ? { as } : undefined }),
  deletePost: (id: string, as?: string) =>
    api.delete(`/social/posts/${id}`, { params: as ? { as } : undefined }),
  comments: (postId: string) => api.get(`/social/posts/${postId}/comments`),
  addComment: (postId: string, data: Record<string, unknown>, as?: string) =>
    api.post(`/social/posts/${postId}/comments`, data, { params: as ? { as } : undefined }),
  deleteComment: (id: string, as?: string) =>
    api.delete(`/social/comments/${id}`, { params: as ? { as } : undefined }),
  toggleLike: (postId: string, as?: string) =>
    api.post(`/social/posts/${postId}/like`, {}, { params: as ? { as } : undefined }),
};
