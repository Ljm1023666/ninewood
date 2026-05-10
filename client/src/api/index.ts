import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let redirecting = false;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (!redirecting) {
        redirecting = true;
        // Hash change doesn't reload page; use replace to avoid history pollution
        window.location.replace('#/login');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
