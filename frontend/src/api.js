// Nazifa — 261112966

// Built a wrapper so prod builds dont use localhost as API (messed up CORS on the mimi url)

function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE
  if (raw == null || !String(raw).trim()) return ''
  const base = String(raw).replace(/\/$/, '')
  
  // Dev can point at 3000; for actual deploy bundle we want same site as the page
  if (import.meta.env.PROD && /localhost|127\.0\.0\.1/.test(base)) {
    return ''
  }
  return base
}

export function apiUrl(path) {
  if (import.meta.env.PROD && typeof path === 'string' && path.startsWith('http')) {
    try {
      const u = new URL(path)
      if (/localhost|127\.0\.0\.1/.test(u.hostname)) {
        return u.pathname + u.search + u.hash
      }
    } catch {
      // ignore
    }
  }
  const p = path.startsWith('/') ? path : `/${path}`
  return getApiBase() + p
}

export function apiFetch(path, init) {
  return fetch(apiUrl(path), init)
}
