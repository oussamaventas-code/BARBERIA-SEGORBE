// Genera worker/schema.js a partir de migrations/*.sql.
// El Worker usa esas sentencias en /admin/setup para crear tablas, datos iniciales y el propietario
// sin necesidad de consola ni de wrangler. Se ejecuta solo antes de cada build (prebuild).
import { readFileSync, writeFileSync } from 'node:fs'

/** Separa un .sql en sentencias (respetando los cuerpos BEGIN … END; de los triggers) */
function split(sql) {
  const out = []
  let cur = ''
  let inBlock = false
  for (const raw of sql.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (/^\s*--/.test(line) || (!cur && !line.trim())) continue
    cur += (cur ? '\n' : '') + line
    const t = line.trim()
    if (/^BEGIN$/i.test(t)) inBlock = true
    if (inBlock) {
      if (/^END;$/i.test(t)) { out.push(cur); cur = ''; inBlock = false }
      continue
    }
    if (/;$/.test(t)) { out.push(cur); cur = '' }
  }
  if (cur.trim()) throw new Error(`Sentencia sin terminar: ${cur.slice(0, 60)}`)
  return out.map((s) => s.replace(/;\s*$/, ''))
}

// Idempotente: si alguna tabla ya existe (p. ej. creada a mano), no falla
const idempotent = (s) => s.replace(/^CREATE (UNIQUE )?(TABLE|INDEX|TRIGGER) /i, 'CREATE $1$2 IF NOT EXISTS ')

const schema = split(readFileSync('migrations/0001_init.sql', 'utf8')).map(idempotent)
const seed = split(readFileSync('migrations/0002_seed.sql', 'utf8'))

writeFileSync(
  'worker/schema.js',
  `// GENERADO por scripts/gen-schema.mjs desde migrations/*.sql. No editar a mano.\nexport const SCHEMA = ${JSON.stringify(schema, null, 2)}\n\nexport const SEED = ${JSON.stringify(seed, null, 2)}\n`,
)
console.log(`worker/schema.js: ${schema.length} sentencias de esquema, ${seed.length} de datos iniciales`)
