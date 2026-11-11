// Cliente de la API (Cloudflare Worker, mismo dominio). La sesión viaja en una cookie HttpOnly.
export class ApiError extends Error {
  constructor(status, code, message) { super(`${code}: ${message}`); this.status = status; this.code = code; this.userMessage = message }
}

async function request(method, path, body) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Sin conexión. Comprueba tu internet e inténtalo de nuevo.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error?.code || 'ERROR', data?.error?.message || 'Ha ocurrido un error inesperado.')
  return data
}

const qs = (params) => {
  const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  return p.toString() ? `?${p}` : ''
}

export const http = {
  get: (path, params = {}) => request('GET', path + qs(params)),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
}
