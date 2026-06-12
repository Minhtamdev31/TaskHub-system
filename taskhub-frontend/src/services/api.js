import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://taskhub-system.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  getCurrentUser: () => apiClient.get('/users/me'),
};

export const projectService = {
  getAll: () => apiClient.get('/projects'),
  getById: (id) => apiClient.get(`/projects/${id}`),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.put(`/projects/${id}`, data),
  delete: (id) => apiClient.delete(`/projects/${id}`),
  getDashboard: (id) => apiClient.get(`/projects/${id}/dashboard`),
  getInvitations: () => apiClient.get('/projectinvitations/my-invitations'),
  respondToInvitation: (invitationId, accept) => apiClient.post('/projectinvitations/respond', { invitationId, accept }),
};

export const passwordVaultService = {
  getAll: () => apiClient.get('/passwordvault'),
  create: (data) => apiClient.post('/passwordvault', data),
  delete: (id) => apiClient.delete(`/passwordvault/${id}`),
};

export const userService = {
  updateProfile: (data) => apiClient.put('/users/me/profile', data),
};

export default apiClient;