import { bad, hashPassword, isEmail, optStr, randomHex, readJson, sha256Hex, str, verifyPassword } from './util.js'

const COOKIE = 'sid'
const DAYS = { customer: 30, staff: 7 }

/* ---------- Sesiones: token opaco en cookie HttpOnly; en D1 solo su hash ---------- */
export async function createSession(env, user, request) {
  const token = randomHex(32)
  const days = DAYS[user.kind] || 7
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', ?))")
    .bind(await sha256Hex(token), user.id, `+${days} days`).run()
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${days * 86400}${secure}`
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`

const readCookie = (request) =>
  (request.headers.get('cookie') || '').split(/;\s*/).map((c) => c.split('=')).find(([k]) => k === COOKIE)?.[1]

/** Devuelve {id, email, kind, display_name} o null */
export async function getUser(env, request) {
  const token = readCookie(request)
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null
  return env.DB.prepare(`SELECT u.id, u.email, u.kind, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id
                         WHERE s.token_hash = ? AND s.expires_at > datetime('now')`).bind(await sha256Hex(token)).first()
}
export async function destroySession(env, request) {
  const token = readCookie(request)
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run()
}
export async function requireStaff(env, request) {
  const u = await getUser(env, request)
  if (!u) throw bad('UNAUTHENTICATED', 'Inicia sesión para continuar', 401)
  if (u.kind !== 'staff') throw bad('FORBIDDEN', 'No tienes permiso para realizar esta acción', 403)
  return u
}

/* ---------- Límite de intentos ---------- */
export async function rateLimit(env, key, max, windowSec) {
  const now = Math.floor(Date.now() / 1000)
  const row = await env.DB.prepare('SELECT window_start, hits FROM rate_limits WHERE key = ?').bind(key).first()
  if (!row || now - row.window_start > windowSec) {
    await env.DB.prepare('INSERT INTO rate_limits (key, window_start, hits) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, hits = 1').bind(key, now).run()
    return
  }
  if (row.hits >= max) throw bad('RATE_LIMITED', 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.', 429)
  await env.DB.prepare('UPDATE rate_limits SET hits = hits + 1 WHERE key = ?').bind(key).run()
}

/* ---------- Endpoints de acceso ---------- */
export async function signup(env, request) {
  const b = await readJson(request)
  const email = str(b.email, 160).toLowerCase()
  const password = typeof b.password === 'string' ? b.password : ''
  if (!isEmail(email)) throw bad('INVALID_EMAIL', 'El email no parece válido.')
  if (password.length < 8 || password.length > 200) throw bad('WEAK_PASSWORD', 'La contraseña debe tener al menos 8 caracteres.')
  await rateLimit(env, `signup:${request.headers.get('cf-connecting-ip') || 'x'}`, 10, 3600)
  if (await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()) throw bad('EMAIL_TAKEN', 'Ya existe una cuenta con ese email. Prueba a entrar.', 409)
  const id = randomHex(16)
  await env.DB.prepare("INSERT INTO users (id, email, password_hash, kind, display_name) VALUES (?, ?, ?, 'customer', ?)")
    .bind(id, email, await hashPassword(password), optStr(b.name, 100)).run()
  return { user: { id, email, kind: 'customer' }, cookie: await createSession(env, { id, kind: 'customer' }, request) }
}

export async function login(env, request) {
  const b = await readJson(request)
  const email = str(b.email, 160).toLowerCase()
  const password = typeof b.password === 'string' ? b.password : ''
  const ip = request.headers.get('cf-connecting-ip') || 'x'
  await rateLimit(env, `login:${ip}:${email}`, 8, 900)
  const u = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  // Se verifica siempre una contraseña para que el tiempo no delate si el email existe
  const ok = await verifyPassword(password, u?.password_hash || 'pbkdf2$100000$00$00')
  if (!u || !ok) throw bad('INVALID_LOGIN', 'Email o contraseña incorrectos.', 401)
  return { user: { id: u.id, email: u.email, kind: u.kind, display_name: u.display_name }, cookie: await createSession(env, u, request) }
}
