import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let csrfToken = null;

// Fetch CSRF token on initialization
export const initCSRFToken = async () => {
  try {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await axios.get(`${baseURL}/csrf-token`, { withCredentials: true });
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
    if (error.response?.status === 401) {
      // If unauthorized, token may have expired
      console.warn('Authentication expired or unauthorized access.');
    }
    return Promise.reject(error);
  }
);

// Trigger initial CSRF token retrieval
initCSRFToken();

export default api;
