import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5079/api';

// Helper to build full image URL from relative path
export const getImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  // Remove /api from the base URL to get the server URL
  const serverUrl = API_BASE_URL.replace('/api', '');
  return `${serverUrl}${imageUrl}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin-auth');
        // Use replace to avoid redirect loop
        if (!window.location.pathname.includes('/login')) {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const adminLogin = (email: string, password: string) =>
  api.post('/admin/auth/login', { email, password });

// Restaurants
export const getRestaurants = () => api.get('/admin/restaurants');
export const getRestaurant = (id: string) => api.get(`/admin/restaurants/${id}`);
export const createRestaurant = (data: any) => api.post('/admin/restaurants', data);
export const updateRestaurant = (id: string, data: any) => api.put(`/admin/restaurants/${id}`, data);
export const deleteRestaurant = (id: string) => api.delete(`/admin/restaurants/${id}`);
export const toggleRestaurantOrders = (id: string, acceptingOrders: boolean, pauseMessage?: string) =>
  api.post(`/admin/restaurants/${id}/toggle-orders`, { acceptingOrders, pauseMessage });
export const getRestaurantStatus = (id: string) => api.get(`/admin/restaurants/${id}/status`);
export const uploadRestaurantImage = (id: string, formData: FormData) =>
  api.post(`/admin/restaurants/${id}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteRestaurantImage = (id: string) => api.delete(`/admin/restaurants/${id}/image`);

// Menus
export const getMenus = (restaurantId?: string) =>
  api.get('/admin/menus', { params: { restaurantId } });
export const getMenu = (id: string) => api.get(`/admin/menus/${id}`);
export const createMenu = (data: any) => api.post('/admin/menus', data);
export const updateMenu = (id: string, data: any) => api.put(`/admin/menus/${id}`, data);
export const deleteMenu = (id: string) => api.delete(`/admin/menus/${id}`);
export const addCategoryToMenu = (menuId: string, categoryId: string, sortOrder: number) =>
  api.post(`/admin/menus/${menuId}/categories`, { categoryId, sortOrder });
export const removeCategoryFromMenu = (menuId: string, categoryId: string) =>
  api.delete(`/admin/menus/${menuId}/categories/${categoryId}`);

// Tables
export const getTables = (restaurantId?: string) =>
  api.get('/admin/tables', { params: { restaurantId } });
export const getTable = (id: string) => api.get(`/admin/tables/${id}`);
export const getTableTypes = () => api.get('/admin/tables/types');
export const createTable = (data: any) => api.post('/admin/tables', data);
export const updateTable = (id: string, data: any) => api.put(`/admin/tables/${id}`, data);
export const deleteTable = (id: string) => api.delete(`/admin/tables/${id}`);
export const toggleTable = (id: string) => api.put(`/admin/tables/${id}/toggle`);
export const getTableQr = (id: string) => api.get(`/admin/tables/${id}/qr`);
export const generateTableQr = (id: string, menuId: string, baseUrl?: string) =>
  api.post(`/admin/tables/${id}/generate-qr`, { tableId: id, menuId, baseUrl });
export const bulkGenerateQr = (tableIds: string[], menuId: string, baseUrl?: string) =>
  api.post('/admin/tables/bulk-generate-qr', { tableIds, menuId, baseUrl });

// Categories
export const getCategories = () => api.get('/admin/categories');
export const createCategory = (data: any) => api.post('/admin/categories', data);
export const updateCategory = (id: string, data: any) => api.put(`/admin/categories/${id}`, data);
export const deleteCategory = (id: string) => api.delete(`/admin/categories/${id}`);
export const toggleCategoryAvailability = (id: string, isTemporarilyDisabled: boolean) =>
  api.post(`/admin/categories/${id}/toggle-availability`, { isTemporarilyDisabled });
export const setCategorySchedule = (id: string, availableFrom?: string, availableTo?: string) =>
  api.post(`/admin/categories/${id}/schedule`, { availableFrom, availableTo });

// Products
export const getProducts = (categoryId?: string, menuId?: string) =>
  api.get('/admin/products', { params: { categoryId, menuId } });
export const getProduct = (id: string) => api.get(`/admin/products/${id}`);
export const createProduct = (data: any) => api.post('/admin/products', data);
export const updateProduct = (id: string, data: any) => api.put(`/admin/products/${id}`, data);
export const deleteProduct = (id: string) => api.delete(`/admin/products/${id}`);
export const toggleProduct = (id: string) => api.put(`/admin/products/${id}/toggle`);
export const uploadProductImage = (id: string, formData: FormData) =>
  api.post(`/admin/products/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Product Sizes
export const addProductSize = async (productId: string, data: {
  name: string;
  priceModifier: number;
  isDefault: boolean;
}) => {
  const response = await api.post(`/admin/products/${productId}/sizes`, data);
  return response.data;
};

export const updateProductSize = async (
  productId: string,
  sizeId: string,
  data: { name: string; priceModifier: number; isDefault: boolean }
) => {
  const response = await api.put(`/admin/products/${productId}/sizes/${sizeId}`, data);
  return response.data;
};

export const deleteProductSize = async (productId: string, sizeId: string) => {
  await api.delete(`/admin/products/${productId}/sizes/${sizeId}`);
};

// Orders
export const getOrders = (status?: number, restaurantId?: string) =>
  api.get('/admin/orders', { params: { status, restaurantId } });
export const getOrder = (id: string) => api.get(`/admin/orders/${id}`);
export const updateOrderStatus = (id: string, status: number) =>
  api.put(`/admin/orders/${id}/status`, { status });
export const cancelOrderItem = (orderId: string, itemId: string, reason?: string) =>
  api.post(`/admin/orders/${orderId}/items/${itemId}/cancel`, { reason });
export const confirmPendingItems = (orderId: string) =>
  api.post(`/admin/orders/${orderId}/items/confirm`);
export const dismissWaiter = (orderId: string) =>
  api.post(`/admin/orders/${orderId}/dismiss-waiter`);

// Table Sessions
export const getTableSessions = (restaurantId?: string, sessionStatus?: string) =>
  api.get('/admin/table-sessions', { params: { restaurantId, status: sessionStatus } });
export const getTableSession = (id: string) =>
  api.get(`/admin/table-sessions/${id}`);
export const closeTableSession = (id: string, reason?: string) =>
  api.post(`/admin/table-sessions/${id}/close`, { reason });
export const markSessionPaid = (id: string, note?: string) =>
  api.post(`/admin/table-sessions/${id}/mark-paid`, { note });
export const markOrderPaidInSession = (sessionId: string, orderId: string) =>
  api.post(`/admin/table-sessions/${sessionId}/orders/${orderId}/mark-paid`);

// SignalR Hub URL
export const getSignalRUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5079/";
  return baseUrl.replace('/api', '') + '/hubs/orders';
};

/*
 * JURA API TEMPORARILY DISABLED
 * Uncomment when full Jura documentation is available
 *
// Jura Delivery API
export const getJuraTariffs = () => api.get('/admin/jura/tariffs');

export const calculateJuraDelivery = (data: {
  tariffId: number;
  phone: string;
  fromAddress?: {
    id?: string;
    address: string;
    title?: string;
    body?: string;
    lng: number;
    lat: number;
  };
  toAddress?: {
    id?: string;
    address: string;
    title?: string;
    body?: string;
    lng: number;
    lat: number;
  };
}) => api.post('/admin/jura/calculate', data);

export const createJuraDelivery = (data: {
  orderId: string;
  tariffId: number;
  phone: string;
  fromAddress: {
    id?: string;
    address: string;
    title?: string;
    body?: string;
    lng: number;
    lat: number;
  };
  toAddress: {
    id?: string;
    address: string;
    title?: string;
    body?: string;
    lng: number;
    lat: number;
  };
}) => api.post('/admin/jura/orders', data);

export const getJuraOrderStatus = (orderId: string) =>
  api.get(`/admin/jura/orders/${orderId}/status`);

export const cancelJuraOrder = (orderId: string, reason: string) =>
  api.post(`/admin/jura/orders/${orderId}/cancel`, { reason });

export const searchJuraAddress = (text: string, divisionId: number = 6) =>
  api.get(`/admin/jura/address/search?text=${encodeURIComponent(text)}&division_id=${divisionId}`);

export const createDirectJuraOrder = (data: {
  tariffId: number;
  phone: string;
  customerName?: string;
  comment?: string;
  fromAddress: {
    id?: string;
    address: string;
    title?: string;
    body?: string;
    lng: number;
    lat: number;
  };
  toAddress: {
    id?: string;
    address: string;
    title?: string;
    body?: string;
    lng: number;
    lat: number;
  };
}) => api.post('/admin/jura/orders/direct', data);

// Batch get Jura order statuses (real-time from API)
export const getJuraOrderStatuses = (orderIds: string[]) =>
  api.get(`/admin/jura/integration/statuses?orderIds=${orderIds.join(',')}`);

// Get driver position for Jura order
export const getJuraDriverPosition = (orderId: string) =>
  api.get(`/admin/jura/integration/position/${orderId}`);

// Get receipt code for Jura order (code to give driver for package pickup)
export const getJuraReceiptCode = (orderId: string) =>
  api.get(`/admin/jura/orders/${orderId}/receipt-code`);
*/

// JURA STUB EXPORTS (to prevent import errors while Jura is disabled)
export const getJuraTariffs = () => Promise.resolve({ data: [] });
export const calculateJuraDelivery = () => Promise.resolve({ data: { price: 0 } });
export const createJuraDelivery = () => Promise.resolve({ data: {} });
export const getJuraOrderStatus = () => Promise.resolve({ data: {} });
export const cancelJuraOrder = () => Promise.resolve({ data: {} });
export const searchJuraAddress = () => Promise.resolve({ data: [] });
export const createDirectJuraOrder = () => Promise.resolve({ data: {} });
export const getJuraOrderStatuses = () => Promise.resolve({ data: { statuses: {} } });
export const getJuraDriverPosition = () => Promise.resolve({ data: { success: false } });
export const getJuraReceiptCode = () => Promise.resolve({ data: { success: false } });
