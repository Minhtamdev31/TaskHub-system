import axios from 'axios';

const baseURL = (import.meta.env.MODE === 'production' || window.location.hostname.includes('vercel.app'))
  ? 'https://taskhub-system.onrender.com/api'
  : '/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Auth Service: Handles all authentication & identity
 */
export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  googleLogin: (idToken) => apiClient.post('/auth/google-login', { idToken }),
  getCurrentUser: () => apiClient.get('/users/me'),
  verifyRegisterOtp: (data) => apiClient.post('/auth/verify-register-otp', data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  verifyResetOtp: (data) => apiClient.post('/auth/verify-reset-otp', data),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data),
};

/**
 * Project Service: Lifecycle and member management
 */
export const projectService = {
  getAll: () => apiClient.get('/projects'),
  getById: (id) => apiClient.get(`/projects/${id}`),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.put(`/projects/${id}`, data),
  delete: (id) => apiClient.delete(`/projects/${id}`),
  getDashboard: (id) => apiClient.get(`/projects/${id}/dashboard`),
  aiSummary: (id) => apiClient.get(`/projects/${id}/ai-summary`),
  addMember: (id, data) => apiClient.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => apiClient.delete(`/projects/${id}/members/${userId}`),
  changeMemberRole: (id, targetUserId, newProjectRole) => apiClient.put(`/projects/${id}/members/role`, { targetUserId, newProjectRole }),
  transferOwnership: (id, newOwnerUserId) => apiClient.put(`/projects/${id}/transfer-owner`, { newOwnerUserId }),
  memberContributions: (id) => apiClient.get(`/projects/${id}/member-contributions`),
  getInvitations: () => apiClient.get('/projects/invitations'),
  respondToInvitation: (id, accept) => apiClient.post(`/projects/invitations/${id}/respond`, { accept }),
};

/**
 * Task Service: Operations within projects
 */
export const taskService = {
  getAll: () => apiClient.get('/tasks'),
  getDashboardStats: () => apiClient.get('/tasks/stats'),
  getWorkspace: () => apiClient.get('/tasks/workspace'),
  getByProject: (projectId) => apiClient.get(`/tasks/project/${projectId}`),
  create: (data) => apiClient.post('/tasks', data),
  update: (id, data) => apiClient.put(`/tasks/${id}`, data),
  delete: (id) => apiClient.delete(`/tasks/${id}`),
  assign: (id, targetUserId) => apiClient.put(`/tasks/${id}/assign`, { targetUserId }),
};

/**
 * Password Vault Service: Encrypted credentials
 */
// Token mở khóa vault (lớp 2) được giữ trong sessionStorage, gắn vào mỗi request dữ liệu.
const vaultAuth = () => {
  const token = sessionStorage.getItem('vaultToken');
  return token ? { headers: { 'X-Vault-Token': token } } : {};
};

export const passwordVaultService = {
  getAll: () => apiClient.get('/passwordvault', vaultAuth()),
  create: (data) => apiClient.post('/passwordvault', data, vaultAuth()),
  delete: (id) => apiClient.delete(`/passwordvault/${id}`, vaultAuth()),
  // Xác thực 2 lớp (PIN)
  pinStatus: () => apiClient.get('/passwordvault/pin/status'),
  setupPin: (pin) => apiClient.post('/passwordvault/pin/setup', { pin }),
  unlock: (pin) => apiClient.post('/passwordvault/unlock', { pin }),
  changePin: (oldPin, newPin) => apiClient.put('/passwordvault/pin/change', { oldPin, newPin }),
  // Đổi PIN bằng OTP (gửi về email, không cần PIN cũ)
  requestChangePinOtp: () => apiClient.post('/passwordvault/pin/change/request-otp'),
  confirmChangePin: (otp, newPin) => apiClient.post('/passwordvault/pin/change/confirm', { otp, newPin }),
};

/**
 * Comment Service: Task discussion threads
 */
export const commentService = {
  getByTask: (taskId) => apiClient.get(`/comments/task/${taskId}`),
  create: (data) => apiClient.post('/comments', data),
};

/**
 * Invitation & Notification Service
 */
export const notificationService = {
  getAll: () => apiClient.get('/notifications'),
  markAsRead: (id) => apiClient.put(`/notifications/${id}/read`),
};

export const invitationService = {
  getMyInvitations: () => apiClient.get('/projectinvitations/my-invitations'),
  respond: (id, accept) => apiClient.post(`/projectinvitations/${id}/respond`, { accept }),
  invite: (data) => apiClient.post('/projectinvitations/invite', data),
};

export const userService = {
  getProfile: (id) => apiClient.get(`/users/${id}/profile`),
  updateProfile: (data) => apiClient.put('/users/me/profile', data),
  changePassword: (data) => apiClient.put('/users/me/change-password', data),
  // Đổi mật khẩu bằng OTP (gửi về email, không cần mật khẩu cũ)
  requestChangePasswordOtp: () => apiClient.post('/users/me/change-password/request-otp'),
  confirmChangePassword: (data) => apiClient.post('/users/me/change-password/confirm', data),
  lookup: (ids) => apiClient.post('/users/lookup', { ids }),
};

/**
 * Subscription & Payment Service
 */
export const subscriptionService = {
  getPlans: () => apiClient.get('/subscriptionplans'),
};

export const paymentService = {
  checkoutPayOS: (data) => apiClient.post('/payments/checkout/payos', data),
  confirmPayOS: (orderCode) => apiClient.get(`/payments/payos/confirm/${orderCode}`),
  myOrders: () => apiClient.get('/payments/my-orders'),
};

/**
 * Admin Service: quản trị hệ thống (yêu cầu role Admin)
 */
export const adminService = {
  getDashboard: () => apiClient.get('/payments/admin/dashboard'),
  getAllOrders: () => apiClient.get('/payments/admin/orders'),
  getUsers: () => apiClient.get('/users'),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
  grantPremium: (id, durationDays) => apiClient.post(`/users/${id}/grant-premium`, { durationDays }),
  revokePremium: (id) => apiClient.post(`/users/${id}/revoke-premium`),
  // Subscription plans (admin)
  getAllPlans: () => apiClient.get('/subscriptionplans/admin/all'),
  createPlan: (data) => apiClient.post('/subscriptionplans', data),
  updatePlan: (id, data) => apiClient.put(`/subscriptionplans/${id}`, data),
  deletePlan: (id) => apiClient.delete(`/subscriptionplans/${id}`),
  // Hệ thống: chống ngủ đông (Render keep-alive)
  getKeepAlive: () => apiClient.get('/system/keep-alive'),
  setKeepAlive: (enabled) => apiClient.put('/system/keep-alive', { enabled }),
};

export default apiClient;