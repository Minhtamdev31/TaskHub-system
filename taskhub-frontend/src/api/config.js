/**
 * API Configuration
 * Sử dụng VITE_API_URL từ .env file
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://taskhub-system.onrender.com";

/**
 * Tạo headers với JWT token
 */
export function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * API Request Helper
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * GET request
 */
export function apiGet(endpoint) {
  return apiRequest(endpoint, { method: "GET" });
}

/**
 * POST request
 */
export function apiPost(endpoint, data) {
  return apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PUT request
 */
export function apiPut(endpoint, data) {
  return apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request
 */
export function apiDelete(endpoint) {
  return apiRequest(endpoint, { method: "DELETE" });
}

/**
 * Auth API calls
 */
export const authAPI = {
  register: (data) => apiPost("/api/auth/register", data),
  verifyRegisterOtp: (data) => apiPost("/api/auth/verify-register-otp", data),
  login: (data) => apiPost("/api/auth/login", data),
  googleLogin: (data) => apiPost("/api/auth/google-login", data),
  forgotPassword: (data) => apiPost("/api/auth/forgot-password", data),
  verifyResetOtp: (data) => apiPost("/api/auth/verify-reset-otp", data),
};

/**
 * User API calls
 */
export const userAPI = {
  getCurrentUser: () => apiGet("/api/users/me"),
  updateProfile: (data) => apiPut("/api/users/me/profile", data),
  getAllUsers: () => apiGet("/api/users"),
  getUserById: (id) => apiGet(`/api/users/${id}`),
  updateUser: (id, data) => apiPut(`/api/users/${id}`, data),
  deleteUser: (id) => apiDelete(`/api/users/${id}`),
};

/**
 * Project API calls
 */
export const projectAPI = {
  createProject: (data) => apiPost("/api/projects", data),
  getAllProjects: () => apiGet("/api/projects"),
  getProjectById: (id) => apiGet(`/api/projects/${id}`),
  updateProject: (id, data) => apiPut(`/api/projects/${id}`, data),
  deleteProject: (id) => apiDelete(`/api/projects/${id}`),
  addMember: (id, data) => apiPost(`/api/projects/${id}/members`, data),
  removeMember: (id, userId) =>
    apiDelete(`/api/projects/${id}/members/${userId}`),
};

/**
 * Task API calls
 */
export const taskAPI = {
  getAllTasks: () => apiGet("/api/tasks"),
  getTaskById: (id) => apiGet(`/api/tasks/${id}`),
  createTask: (data) => apiPost("/api/tasks", data),
  updateTask: (id, data) => apiPut(`/api/tasks/${id}`, data),
  deleteTask: (id) => apiDelete(`/api/tasks/${id}`),
  getTasksByProject: (projectId) => apiGet(`/api/tasks/project/${projectId}`),
  assignTask: (id, data) => apiPut(`/api/tasks/${id}/assign`, data),
};

/**
 * Comment API calls
 */
export const commentAPI = {
  addComment: (data) => apiPost("/api/comments", data),
  getCommentsByTask: (taskId) => apiGet(`/api/comments/task/${taskId}`),
};

/**
 * Notification API calls
 */
export const notificationAPI = {
  getMyNotifications: () => apiGet("/api/notifications"),
  markAsRead: (id) => apiPut(`/api/notifications/${id}/read`, {}),
};

/**
 * Invitation API calls
 */
export const invitationAPI = {
  inviteUser: (data) => apiPost("/api/projectinvitations/invite", data),
  getMyInvitations: () => apiGet("/api/projectinvitations/my-invitations"),
  respondToInvitation: (id, data) =>
    apiPost(`/api/projectinvitations/${id}/respond`, data),
};

/**
 * Password Vault API calls
 */
export const passwordVaultAPI = {
  addCredential: (data) => apiPost("/api/passwordvault", data),
  getMyCredentials: () => apiGet("/api/passwordvault"),
  deleteCredential: (id) => apiDelete(`/api/passwordvault/${id}`),
};

/**
 * Subscription API calls
 */
export const subscriptionAPI = {
  getActivePlans: () => apiGet("/api/subscriptionplans"),
  getAllPlans: () => apiGet("/api/subscriptionplans/admin/all"),
  createPlan: (data) => apiPost("/api/subscriptionplans", data),
  updatePlan: (id, data) => apiPut(`/api/subscriptionplans/${id}`, data),
  deletePlan: (id) => apiDelete(`/api/subscriptionplans/${id}`),
};
