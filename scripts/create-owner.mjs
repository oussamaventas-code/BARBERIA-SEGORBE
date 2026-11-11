// Crea (o actualiza la contraseña de) la cuenta del propietario en D1.
//   node scripts/create-owner.mjs correo@ejemplo.com "contraseña-larga" [--remote]
// Sin --remote actúa sobre la base de datos local de desarrollo.
import { execFileSync } from 'node:child_process'
import { webcrypto as crypto } from 'node:crypto'

const [email, password, ...flags] = process.argv.slice(2)
if (!email || !password || password.length < 10) {
  console.error('Uso: node scripts/create-owner.mjs <email> <contraseña de 10+ caracteres> [--remote]')
  process.exit(1)
}
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const salt = crypto.getRandomValues(new Uint8Array(16))
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256)
const hash = `pbkdf2$100000$${hex(salt)}$${hex(bits)}`
const mail = email.trim().toLowerCase().replace(/'/g, "''")
const sql = `INSERT INTO users (email, password_hash, kind, display_name) VALUES ('${mail}', '${hash}', 'staff', 'Propietario')
  ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, kind = 'staff';`
const target = flags.includes('--remote') ? '--remote' : '--local'
// D1_PERSIST permite apuntar a otra carpeta de datos locales (solo desarrollo/pruebas)
const extra = target === '--local' && process.env.D1_PERSIST ? ['--persist-to', process.env.D1_PERSIST] : []
execFileSync('npx', ['wrangler', 'd1', 'execute', 'barberia', target, ...extra, '--command', sql], { stdio: 'inherit' })
console.log(`\nPropietario listo: ${mail} (${target === '--remote' ? 'producción' : 'local'})`)
