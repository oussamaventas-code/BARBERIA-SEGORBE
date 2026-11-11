// Puesta en marcha completa en TU cuenta de Cloudflare (la que uses en `wrangler login`):
//   npx wrangler login
//   npm run setup -- tu@correo.com "una-contraseña-larga"
//
// 1) crea la base de datos D1 "barberia-segorbe" (si aún no está en wrangler.toml)
// 2) aplica el esquema y los datos iniciales
// 3) crea la cuenta del propietario
// 4) construye y publica la web + API
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const [email, password] = process.argv.slice(2)
if (!email || !password || password.length < 10) {
  console.error('Uso: npm run setup -- <email del propietario> "<contraseña de 10+ caracteres>"')
  process.exit(1)
}

const npx = (args, capture = false) =>
  execFileSync('npx', args, { encoding: 'utf8', stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit' })

const PLACEHOLDER = 'REEMPLAZAR-CON-EL-ID-DE-D1'
let toml = readFileSync('wrangler.toml', 'utf8')

if (toml.includes(PLACEHOLDER)) {
  console.log('\n→ Creando la base de datos en tu cuenta de Cloudflare…')
  const out = npx(['wrangler', 'd1', 'create', 'barberia-segorbe', '--location', 'weur'], true)
  console.log(out)
  const id = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0]
  if (!id) {
    console.error(`No he podido leer el ID de la base de datos. Cópialo de la salida de arriba, pégalo en wrangler.toml (database_id) y vuelve a ejecutar este comando.`)
    process.exit(1)
  }
  toml = toml.replace(PLACEHOLDER, id)
  writeFileSync('wrangler.toml', toml)
  console.log(`✔ Base de datos creada (${id}) y guardada en wrangler.toml`)
}

console.log('\n→ Aplicando esquema y datos iniciales…')
npx(['wrangler', 'd1', 'migrations', 'apply', 'barberia-segorbe', '--remote'])

console.log('\n→ Creando la cuenta del propietario…')
execFileSync('node', ['scripts/create-owner.mjs', email, password, '--remote'], { stdio: 'inherit' })

console.log('\n→ Construyendo y publicando…')
npx(['vite', 'build'])
npx(['wrangler', 'deploy'])

console.log('\n✔ Listo. Abre la URL *.workers.dev de arriba y entra en /admin/login con el correo y la contraseña que acabas de usar.')
