import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flinkit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Only redirect if it is a genuine session authentication failure,
    // NOT from login/signup attempts or third-party payment endpoints
    const isLoginOrSignup =
      url.includes('/auth/login') ||
      url.includes('/auth/signup') ||
      url.includes('/admin/auth/') ||
      url.includes('/admin/login') ||
      url.includes('/admin/register');
    const isPaymentEndpoint = url.includes('/payments/');

    if (status === 401 && !isLoginOrSignup && !isPaymentEndpoint) {
      localStorage.removeItem('flinkit_token');
      localStorage.removeItem('flinkit_user');
      const pathname = window.location.pathname;
      const search = window.location.search;
      if (!['/login', '/signup', '/admin/login', '/admin/signup'].includes(pathname)) {
        const redirectParam = encodeURIComponent(pathname + search);
        if (pathname.startsWith('/admin')) {
          window.location.href = `/admin/login?redirect=${redirectParam}`;
        } else {
          window.location.href = `/login?redirect=${redirectParam}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Exported Services ─────────────────────────────────────────

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/update-profile', data),
  changePassword: (data) => api.patch('/auth/change-password', data),
};

export const productService = {
  getProducts: (params) => api.get('/products', { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  searchProducts: (q) => api.get(`/products/search?q=${encodeURIComponent(q)}`),
};

export const categoryService = {
  getCategories: () => api.get('/categories'),
  getCategoryBySlug: (slug) => api.get(`/categories/${slug}`),
};

export const cartService = {
  getCart: () => api.get('/cart'),
  addToCart: (productId, quantity = 1) => api.post('/cart/items', { productId, quantity }),
  updateCartItem: (productId, quantity) => api.patch(`/cart/items/${productId}`, { quantity }),
  removeCartItem: (productId) => api.delete(`/cart/items/${productId}`),
  clearCart: () => api.delete('/cart/clear'),
};

export const addressService = {
  getAddresses: () => api.get('/addresses'),
  addAddress: (addressData) => api.post('/addresses', addressData),
  updateAddress: (id, addressData) => api.patch(`/addresses/${id}`, addressData),
  deleteAddress: (id) => api.delete(`/addresses/${id}`),
  checkServiceability: (pinCode) => api.post('/addresses/check-serviceability', { pinCode }),
};

export const orderService = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id, reason) => api.patch(`/orders/${id}/cancel`, { cancellationReason: reason }),
};

export const paymentService = {
  createRazorpayOrder: (orderId) => api.post('/payments/create-order', { orderId }),
  verifyPayment: (data) => api.post('/payments/verify', data),
};

export const adminAuthService = {
  getSetupStatus: () => api.get('/admin/setup/status'),
  setupInitialAdmin: (data) => api.post('/admin/setup/initial-admin', data),
  register: (data) => api.post('/admin/auth/register', data),
  login: (credentials) => api.post('/admin/auth/login', credentials),
  getMe: () => api.get('/admin/auth/me'),
  updateProfile: (data) => api.patch('/admin/auth/profile', data),
};

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getProducts: (params) => api.get('/admin/products', { params }),
  getProductById: (id) => api.get(`/admin/products/${id}`),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.patch(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  updateStock: (id, data) => api.patch(`/admin/products/${id}/stock`, data),
  updateAvailability: (id, data) => api.patch(`/admin/products/${id}/availability`, data),
  uploadImage: (formData) =>
    api.post('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, data) => api.patch(`/admin/orders/${id}/status`, data),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserActive: (id) => api.patch(`/admin/users/${id}/toggle-active`),
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.patch(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  getShopkeepers: (params) => api.get('/admin/shopkeepers', { params }),
  inviteShopkeeper: (data) => api.post('/admin/shopkeepers/invite', data),
  updateShopkeeperStatus: (id, data) => api.patch(`/admin/shopkeepers/${id}/status`, data),
  approveShopkeeper: (id, isApproved) => api.patch(`/admin/shopkeepers/${id}/status`, { action: isApproved ? 'approve' : 'reject' }),
  deleteShopkeeper: (id) => api.delete(`/admin/shopkeepers/${id}`),
};

export default api;
