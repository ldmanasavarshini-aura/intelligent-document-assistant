const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function apiFetch(path, options = {}) {
  return fetch(`${apiBase}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    credentials: 'include',
  });
}
