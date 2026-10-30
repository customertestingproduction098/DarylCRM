import axios from 'axios';

// Ensure baseURL doesn't have a trailing slash
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let csrfToken = null;

// Fetch CSRF token on initialization
export const initCSRFToken = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });
    csrfToken = response.data?.csrfToken;
  } catch {
    // Graceful fallback for local development without backend
  }
};

// Request interceptor to attach JWT token and CSRF token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for unified error logging & session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only warn about session expiration on non-auth requests
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      console.warn('Authentication expired or unauthorized access.');
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Trigger initial CSRF token retrieval
initCSRFToken();

export default api;
