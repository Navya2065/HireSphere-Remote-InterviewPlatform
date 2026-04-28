import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
});

// Attach JWT on every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rip_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 — drop the token so the AuthContext can redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('rip_token');
      localStorage.removeItem('rip_user');
    }
    return Promise.reject(err);
  }
);

export default api;
