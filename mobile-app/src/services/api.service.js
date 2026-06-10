// Axios API service - token refresh va error handling bilan
import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { storage } from '../utils/storage';

// Axios instance yaratish
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token yangilash jarayoni flaglari
let isRefreshing = false;
let failedQueue = [];

// Kutayotgan requestlarni qayta yuborish
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - har bir requestga token qo'shish
api.interceptors.request.use(
  config => {
    const token = storage.getString(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor - 401 da tokenni yangilash
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Token muddati tugagan bo'lsa
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Boshqa refresh jarayoni ketayotgan bo'lsa, queue ga qo'shish
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = storage.getString(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Yangi tokenlar olish
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Yangi tokenlarni saqlash
        storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        storage.set(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

        // Kutayotgan requestlarni qayta yuborish
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh ham ishlamasa - logout qilish
        processQueue(refreshError, null);
        storage.delete(STORAGE_KEYS.ACCESS_TOKEN);
        storage.delete(STORAGE_KEYS.REFRESH_TOKEN);
        storage.delete(STORAGE_KEYS.USER_DATA);

        // Auth state ni tozalash uchun event chiqarish
        // Bu hodisani AppNavigator ushlab, login sahifasiga yo'naltiradi
        api.defaults.headers.common['X-Auth-Expired'] = 'true';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
