// Primera puesta en marcha desde el navegador (sin consola):
//   1) en Cloudflare, el Worker tiene un secreto SETUP_KEY (clave larga que elige el propietario)
//   2) en /admin/setup se escribe esa clave + correo + contraseña del propietario
// Crea tablas y datos iniciales si faltan, y el usuario propietario. Después queda bloqueado para siempre.
import { SCHEMA, SEED } from './schema.js'
import { bad, hashPassword, isEmail, readJson, sha256Hex, str } from './util.js'

const keyConfigured = (env) => typeof env.SETUP_KEY === 'string' && env.SETUP_KEY.length >= 20

async function ownerExists(env) {
  try { return !!(await env.DB.prepare("SELECT 1 FROM users WHERE kind = 'staff' LIMIT 1").first()) } catch { return false } // tablas aún sin crear
}

export async function setupStatus(env) {
  return { configured: keyConfigured(env), done: await ownerExists(env) }
}

async function sameSecret(a, b) {
  const [x, y] = await Promise.all([sha256Hex(a), sha256Hex(b)])
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}

async function batch(env, statements) {
  for (let i = 0; i < statements.length; i += 20) await env.DB.batch(statements.slice(i, i + 20).map((s) => env.DB.prepare(s)))
}

export async function runSetup(env, request) {
  const b = await readJson(request)
  if (!keyConfigured(env)) throw bad('SETUP_DISABLED', 'Falta el secreto SETUP_KEY en Cloudflare (mínimo 20 caracteres).', 503)
  if (!(await sameSecret(String(b.key || ''), env.SETUP_KEY))) {
    await new Promise((r) => setTimeout(r, 1000)) // frena los intentos a ciegas
    throw bad('INVALID_KEY', 'La clave de instalación no es correcta.', 403)
  }
  const email = str(b.email, 160).toLowerCase()
  const password = typeof b.password === 'string' ? b.password : ''
  if (!isEmail(email)) throw bad('INVALID_EMAIL', 'El email no parece válido.')
  if (password.length < 10 || password.length > 200) throw bad('WEAK_PASSWORD', 'La contraseña debe tener al menos 10 caracteres.')

  await batch(env, SCHEMA)
  if (await ownerExists(env)) throw bad('ALREADY_SETUP', 'Esto ya está configurado. Entra en /admin/login.', 409)

  const hasData = await env.DB.prepare('SELECT 1 FROM business_settings WHERE id = 1').first()
  if (!hasData) await batch(env, SEED)

  await env.DB.prepare("INSERT INTO users (email, password_hash, kind, display_name) VALUES (?, ?, 'staff', 'Propietario') ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, kind = 'staff'")
    .bind(email, await hashPassword(password)).run()
  return { ok: true }
}
