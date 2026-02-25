import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://yalla-co-menu-beckend-dev-47c9.twc1.net/api";

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

// Table Sessions
export const getTableSessions = (restaurantId?: string) =>
  api.get('/admin/table-sessions', { params: { restaurantId } });
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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://yalla-co-menu-beckend-dev-47c9.twc1.net";
  return baseUrl.replace('/api', '') + '/hubs/orders';
};
