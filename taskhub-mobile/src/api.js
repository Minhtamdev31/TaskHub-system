import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Dùng chung backend .NET đã deploy trên Render.
export const API_BASE = 'https://taskhub-system.onrender.com';

const TOKEN_KEY = 'taskhub_token';

export const saveToken = (t) => SecureStore.setItemAsync(TOKEN_KEY, t);
export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 60000, // Render free tier có thể "ngủ" -> request đầu tiên chậm.
  headers: {
    'Content-Type': 'application/json',
    // Báo cho backend đây là client mobile -> bỏ qua bước reCAPTCHA khi đăng nhập.
    'X-Client-Type': 'mobile',
  },
});

// Tự gắn JWT vào mọi request nếu đã đăng nhập.
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  // Không gửi captchaToken: backend đã miễn reCAPTCHA cho client mobile.
  login: (email, password) => api.post('/auth/login', { email, password }),
  googleLogin: (idToken) => api.post('/auth/google-login', { idToken }),
  me: () => api.get('/users/me'),
  // Đăng ký: bước 1 gửi OTP, bước 2 xác minh OTP để hoàn tất.
  register: (data) => api.post('/auth/register', data),
  verifyRegisterOtp: (data) => api.post('/auth/verify-register-otp', data),
  // Quên mật khẩu: gửi OTP rồi đặt lại mật khẩu.
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const projectService = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  aiSummary: (id) => api.get(`/projects/${id}/ai-summary`),
  getDashboard: (id) => api.get(`/projects/${id}/dashboard`),
  memberContributions: (id) => api.get(`/projects/${id}/member-contributions`),
};

export const taskService = {
  getByProject: (projectId) => api.get(`/tasks/project/${projectId}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  remove: (id) => api.delete(`/tasks/${id}`),
  // Tất cả task trong các dự án của tôi (kèm projectName) — dùng cho My Tasks & Dashboard.
  getWorkspace: () => api.get('/tasks/workspace'),
  getDashboardStats: () => api.get('/tasks/stats'),
  // AI (Premium)
  aiMyWork: () => api.get('/tasks/ai-summary'),
  aiAnalyze: (id) => api.get(`/tasks/${id}/ai-analysis`),
};

export const notificationService = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
};

export const budgetService = {
  get: (projectId) => api.get(`/projects/${projectId}/budget`),
  approve: (projectId, requestId) => api.post(`/projects/${projectId}/budget-requests/${requestId}/approve`),
  reject: (projectId, requestId, reason) => api.post(`/projects/${projectId}/budget-requests/${requestId}/reject`, { reason }),
};

export const subscriptionService = {
  getPlans: () => api.get('/subscriptionplans'),
};

export const paymentService = {
  checkoutPayOS: (data) => api.post('/payments/checkout/payos', data),
};

// Chỉ dùng cho tài khoản Admin (bản mobile chỉ xem, không thao tác xoá/cấp quyền).
export const adminService = {
  getDashboard: () => api.get('/payments/admin/dashboard'),
  getOrders: (page = 1, pageSize = 20) => api.get('/payments/admin/orders', { params: { page, pageSize } }),
  getUsers: (page = 1, pageSize = 20) => api.get('/users', { params: { page, pageSize } }),
};

// --- Kho mật khẩu (lớp bảo vệ 2 bằng PIN) ---
// Token mở khoá vault chỉ giữ trong bộ nhớ (hết phiên/app là mất, phải mở lại bằng PIN).
let vaultToken = null;
export const setVaultToken = (t) => { vaultToken = t; };
export const clearVaultToken = () => { vaultToken = null; };
export const hasVaultToken = () => !!vaultToken;
const vaultHeader = () => (vaultToken ? { headers: { 'X-Vault-Token': vaultToken } } : {});

export const vaultService = {
  pinStatus: () => api.get('/passwordvault/pin/status'),
  setupPin: (pin) => api.post('/passwordvault/pin/setup', { pin }),
  unlock: (pin) => api.post('/passwordvault/unlock', { pin }),
  getAll: () => api.get('/passwordvault', vaultHeader()),
  create: (data) => api.post('/passwordvault', data, vaultHeader()),
  remove: (id) => api.delete(`/passwordvault/${id}`, vaultHeader()),
};

export default api;
