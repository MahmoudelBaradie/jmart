import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Admin uses an app-isolated cookie. MUST stay in sync with apps/admin/src/lib/auth.ts.
// Reading the wrong key here meant every request after login went out without an
// Authorization header even though setToken() had stored the token correctly.
const ADMIN_TOKEN_COOKIE = 'jmart_admin_token';
const ADMIN_USER_KEY     = 'jmart_admin_user';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get(ADMIN_TOKEN_COOKIE);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    // Unwrap the standard API envelope { success, statusCode, message, data, meta? }
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      const { data, meta } = res.data;
      // Preserve meta alongside data so paginated responses work: r.data = { data: [], meta: {} }
      res.data = meta !== undefined ? { data, meta } : data;
    }
    return res;
  },
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove(ADMIN_TOKEN_COOKIE);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_USER_KEY);
        // Avoid redirect loop on the login page itself
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
  orderTrends: (days?: number) => api.get('/dashboard/order-trends', { params: { days } }),
  topFarmers: (limit?: number) => api.get('/dashboard/top-farmers', { params: { limit } }),
  topBuyers: (limit?: number) => api.get('/dashboard/top-buyers', { params: { limit } }),
  zoneActivity: () => api.get('/dashboard/zone-activity'),
};

// ── Orders ────────────────────────────────────────────────────
export const ordersApi = {
  list: (params?: Record<string, unknown>) => api.get('/orders', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  stats: () => api.get('/orders/stats'),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/orders/${id}/status`, { status, reason }),
  cancel: (id: string, reason: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
};

// ── Farmers ────────────────────────────────────────────────────
export const farmersApi = {
  list: (params?: Record<string, unknown>) => api.get('/farmers', { params }),
  get: (id: string) => api.get(`/farmers/${id}`),
  kycReview: (id: string, status: string, notes?: string) =>
    api.post(`/farmers/${id}/kyc-review`, { status, notes }),
  suspend: (id: string, reason: string) =>
    api.post(`/farmers/${id}/suspend`, { reason }),
  stats: (id: string) => api.get(`/farmers/${id}/stats`),
};

// ── Buyers ────────────────────────────────────────────────────
export const buyersApi = {
  list: (params?: Record<string, unknown>) => api.get('/buyers', { params }),
  get: (id: string) => api.get(`/buyers/${id}`),
  kycReview: (id: string, status: string, notes?: string) =>
    api.post(`/buyers/${id}/kyc-review`, { status, notes }),
};

// ── Drivers ────────────────────────────────────────────────────
export const driversApi = {
  list: (params?: Record<string, unknown>) => api.get('/drivers', { params }),
  get: (id: string) => api.get(`/drivers/${id}`),
  available: (zoneId?: string) => api.get('/logistics/available-drivers', { params: { zoneId } }),
};

// ── Logistics ────────────────────────────────────────────────
export const logisticsApi = {
  list: (params?: Record<string, unknown>) => api.get('/logistics/shipments', { params }),
  get: (id: string) => api.get(`/logistics/shipments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/logistics/shipments', data),
  assignDriver: (id: string, data: Record<string, unknown>) =>
    api.post(`/logistics/shipments/${id}/assign-driver`, data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/logistics/shipments/${id}/status`, { status, notes }),
  availableDrivers: (zoneId?: string) =>
    api.get('/logistics/available-drivers', { params: { zoneId } }),
  stats: () => api.get('/logistics/shipments/stats'),
};

// ── Quality ────────────────────────────────────────────────────
export const qualityApi = {
  list: (params?: Record<string, unknown>) => api.get('/quality', { params }),
  get: (id: string) => api.get(`/quality/${id}`),
  create: (data: Record<string, unknown>) => api.post('/quality', data),
  complete: (id: string, data: Record<string, unknown>) =>
    api.post(`/quality/${id}/complete`, data),
  stats: () => api.get('/quality/stats'),
};

// ── Financial ────────────────────────────────────────────────
export const financialApi = {
  invoices: (params?: Record<string, unknown>) => api.get('/financial/invoices', { params }),
  invoice: (id: string) => api.get(`/financial/invoices/${id}`),
  createInvoice: (data: Record<string, unknown>) => api.post('/financial/invoices', data),
  issueInvoice: (id: string) => api.post(`/financial/invoices/${id}/issue`),
  recordPayment: (id: string, data: Record<string, unknown>) =>
    api.post(`/financial/invoices/${id}/payments`, data),
  payouts: (params?: Record<string, unknown>) => api.get('/financial/payouts', { params }),
  approvePayouts: (payoutIds: string[]) =>
    api.post('/financial/payouts/approve', { payoutIds }),
  refunds: (params?: Record<string, unknown>) => api.get('/financial/refunds', { params }),
  createRefund: (data: Record<string, unknown>) => api.post('/financial/refunds', data),
  approveRefund: (id: string) => api.post(`/financial/refunds/${id}/approve`),
  summary: () => api.get('/financial/summary'),
};

// ── Disputes ────────────────────────────────────────────────
export const disputesApi = {
  list: (params?: Record<string, unknown>) => api.get('/disputes', { params }),
  get: (id: string) => api.get(`/disputes/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/disputes/${id}`, data),
  assign: (id: string, assignedToId: string) =>
    api.post(`/disputes/${id}/assign`, { assignedToId }),
  addEvidence: (id: string, data: Record<string, unknown>) =>
    api.post(`/disputes/${id}/evidence`, data),
  close: (id: string, data: Record<string, unknown>) =>
    api.post(`/disputes/${id}/close`, data),
  stats: () => api.get('/disputes/stats'),
};

// ── Workflow ────────────────────────────────────────────────
export const workflowApi = {
  tasks: (params?: Record<string, unknown>) => api.get('/workflow/tasks', { params }),
  task: (id: string) => api.get(`/workflow/tasks/${id}`),
  createTask: (data: Record<string, unknown>) => api.post('/workflow/tasks', data),
  updateTask: (id: string, data: Record<string, unknown>) =>
    api.patch(`/workflow/tasks/${id}`, data),
  escalateTask: (id: string, toUserId: string, reason: string) =>
    api.post(`/workflow/tasks/${id}/escalate`, { toUserId, reason }),
  approvals: (params?: Record<string, unknown>) => api.get('/workflow/approvals', { params }),
  createApproval: (data: Record<string, unknown>) => api.post('/workflow/approvals', data),
  decideApproval: (id: string, decision: string, notes: string) =>
    api.post(`/workflow/approvals/${id}/decide`, { decision, decisionNotes: notes }),
  slaDefinitions: () => api.get('/workflow/sla-definitions'),
};

// ── Warehouses ────────────────────────────────────────────────
export const warehousesApi = {
  list: (params?: Record<string, unknown>) => api.get('/warehouses', { params }),
  get: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: Record<string, unknown>) => api.post('/warehouses', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/warehouses/${id}`, data),
  stats: () => api.get('/warehouses/stats'),
};

// ── Geo Zones ────────────────────────────────────────────────
export const geoZonesApi = {
  list: (params?: Record<string, unknown>) => api.get('/geo-zones', { params }),
  get: (id: string) => api.get(`/geo-zones/${id}`),
  hierarchy: () => api.get('/geo-zones/hierarchy'),
  create: (data: Record<string, unknown>) => api.post('/geo-zones', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/geo-zones/${id}`, data),
  rates: (params?: Record<string, unknown>) => api.get('/geo-zones/rates', { params }),
  createRate: (data: Record<string, unknown>) => api.post('/geo-zones/rates', data),
};

// ── Users (Internal) ────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/users/${id}`, data),
};

// ── Contracts ────────────────────────────────────────────────
export const contractsApi = {
  list: (params?: Record<string, unknown>) => api.get('/contracts', { params }),
  get: (id: string) => api.get(`/contracts/${id}`),
  create: (data: Record<string, unknown>) => api.post('/contracts', data),
  sign: (id: string, data: { signerType: 'farmer' | 'buyer' }) =>
    api.post(`/contracts/${id}/sign`, data),
  terminate: (id: string, reason: string) =>
    api.post(`/contracts/${id}/terminate`, { reason }),
};

// ── Products ────────────────────────────────────────────────
export const productsApi = {
  list: (params?: Record<string, unknown>) => api.get('/products', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: Record<string, unknown>) => api.post('/products', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/products/${id}`, data),
  setPriceRange: (id: string, priceFloor: number | null, priceCeiling: number | null) =>
    api.patch(`/products/${id}/price-range`, { priceFloor, priceCeiling }),
  /** Set the central admin price (cascades to all farmer catalog items). */
  setCentralPrice: (id: string, pricePerUnit: number) =>
    api.patch(`/products/${id}/price`, { pricePerUnit }),
  priceOverview: () => api.get('/products/price-overview'),
};

// ── Inventory ─────────────────────────────────────────────────
export const inventoryApi = {
  lots: (params?: Record<string, unknown>) => api.get('/inventory/lots/manage', { params }),
  getLot: (id: string) => api.get(`/inventory/lots/${id}`),
  updateLotStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/inventory/lots/${id}/status`, { status, notes }),
  // Catalog items (prices live here)
  catalog: (params?: Record<string, unknown>) => api.get('/inventory/catalog', { params }),
  updateCatalogPrice: (catalogItemId: string, pricePerUnit: number, reason?: string) =>
    api.patch(`/inventory/catalog/${catalogItemId}/price/admin`, { pricePerUnit, reason }),
  priceHistory: (catalogItemId: string) =>
    api.get(`/inventory/price-history/${catalogItemId}`, { params: { days: 90 } }),
};

// ── Categories ────────────────────────────────────────────────
export const categoriesApi = {
  list: (params?: Record<string, unknown>) => api.get('/categories', { params }),
  flat: () => api.get('/categories/flat'),
  get: (id: string) => api.get(`/categories/${id}`),
  products: (params?: Record<string, unknown>) => api.get('/categories/products', { params }),
  categoryProducts: (id: string, search?: string) =>
    api.get(`/categories/${id}/products`, { params: { search } }),
  create: (data: Record<string, unknown>) => api.post('/categories', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/categories/${id}`, data),
  deactivate: (id: string) => api.delete(`/categories/${id}`),
};

// ── Audit ────────────────────────────────────────────────
export const auditApi = {
  list: (params?: Record<string, unknown>) => api.get('/audit/logs', { params }),
  activity: (params?: Record<string, unknown>) => api.get('/audit/activity', { params }),
};

// ── Notifications ────────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/notifications/my', { params }),
  unreadCount: () => api.get('/notifications/my/unread-count'),
  markRead: (id: string) => api.post(`/notifications/my/${id}/read`),
  markAllRead: () => api.post('/notifications/my/read-all'),
};

// ── Marketplace Banners ──────────────────────────────────────────
export const bannersApi = {
  list: (params?: Record<string, unknown>) => api.get('/banners', { params }),
  get: (id: string) => api.get(`/banners/${id}`),
  create: (data: Record<string, unknown>) => api.post('/banners', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/banners/${id}`, data),
  delete: (id: string) => api.delete(`/banners/${id}`),
};
