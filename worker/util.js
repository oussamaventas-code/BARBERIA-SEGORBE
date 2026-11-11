// Utilidades comunes del Worker

export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code }
}
export const bad = (code, message, status = 400) => new HttpError(status, code, message)

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })

export async function readJson(request, max = 20000) {
  const text = await request.text()
  if (text.length > max) throw bad('TOO_LARGE', 'Petición demasiado grande', 413)
  if (!text) return {}
  try { return JSON.parse(text) } catch { throw bad('INVALID_JSON', 'Datos no válidos') }
}

/* ---------- Texto / teléfonos / formatos ---------- */
export const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export const optStr = (v, max = 500) => { const s = str(v, max); return s || null }
export const bool = (v) => (v ? 1 : 0)
export const isoDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)
export const hhmm = (v) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null)
export const isHexToken = (v) => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v)
export const tokenList = (v) => (Array.isArray(v) ? [...new Set(v.filter(isHexToken))].slice(0, 30) : [])
export const isEmail = (v) => typeof v === 'string' && v.length <= 160 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)

export function normalizePhone(p) {
  let d = String(p ?? '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 9) d = `34${d}`
  return d
}
export const validPhone = (p) => /^[0-9]{9,15}$/.test(p)

/* ---------- Tiempo (hora local del negocio) ---------- */
export const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
export const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const dayNumber = (iso) => Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000)
export const absMin = (iso, min) => dayNumber(iso) * 1440 + min
export const addDays = (iso, n) => new Date((dayNumber(iso) + n) * 86400000).toISOString().slice(0, 10)
export const dowOf = (iso) => new Date(dayNumber(iso) * 86400000).getUTCDay()

export function localNow(tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date()).map((p) => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) }
}

/* ---------- Criptografía (WebCrypto, sin dependencias) ---------- */
const enc = new TextEncoder()
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (h) => new Uint8Array((h.match(/../g) || []).map((x) => parseInt(x, 16)))
export const randomHex = (bytes = 16) => toHex(crypto.getRandomValues(new Uint8Array(bytes)))
export const sha256Hex = async (s) => toHex(await crypto.subtle.digest('SHA-256', enc.encode(s)))

const ITERATIONS = 100000 // máximo que admite Workers para PBKDF2
async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256))
}
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${await pbkdf2(password, salt, ITERATIONS)}`
}
export async function verifyPassword(password, stored) {
  const [scheme, it, salt, hash] = String(stored).split('$')
  if (scheme !== 'pbkdf2' || !salt || !hash) return false
  const calc = await pbkdf2(password, fromHex(salt), Number(it))
  let diff = calc.length ^ hash.length // comparación en tiempo constante
  for (let i = 0; i < calc.length; i++) diff |= calc.charCodeAt(i) ^ (hash.charCodeAt(i) || 0)
  return diff === 0
}
