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
};

export default api;
