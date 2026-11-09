import axios from 'axios';

export const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codev_token') || localStorage.getItem('collabcode_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = localStorage.getItem('codev_refresh') || localStorage.getItem('collabcode_refresh');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          const newToken = res.data.accessToken;
          localStorage.setItem('codev_token', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api(error.config);
        } catch (e) {
          localStorage.removeItem('codev_token');
          localStorage.removeItem('codev_refresh');
          localStorage.removeItem('codev_user');
          localStorage.removeItem('collabcode_token');
          localStorage.removeItem('collabcode_refresh');
          localStorage.removeItem('collabcode_user');
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);
