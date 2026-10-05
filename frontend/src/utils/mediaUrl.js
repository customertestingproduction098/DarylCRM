const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const apiOrigin = baseURL.replace(/\/api\/?$/, '');

// Resolves backend-served files (e.g. /uploads/...) to an absolute URL
export default function mediaUrl(url) {
  if (!url) return null;
  if (/^(https?:|blob:|data:)/.test(url)) return url;
  return `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}
