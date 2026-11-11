// Panel privado: todas estas rutas exigen sesión de personal (kind = 'staff').
import { bad, bool, fromMin, hhmm, isEmail, isoDate, normalizePhone, optStr, str, toMin, validPhone } from './util.js'
import { getSettings, mapDbError } from './booking.js'

const STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']
const METHODS = ['cash', 'card', 'other']

const num = (v, { min = -Infinity, max = Infinity, nullable = false, int = false } = {}) => {
  if ((v === null || v === '' || v === undefined) && nullable) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw bad('INVALID', 'Algún dato no es válido. Revisa el formulario.')
  return n
}
const oneOf = (list) => (v) => { if (!list.includes(v)) throw bad('INVALID', 'Algún dato no es válido. Revisa el formulario.'); return v }
const date = (v) => { const d = isoDate(v); if (!d) throw bad('INVALID', 'Fecha no válida'); return d }

/** UPDATE dinámico solo con las columnas permitidas (nunca interpola valores del cliente) */
async function patch(env, table, id, body, spec, stamp = true) {
  const sets = [], binds = []
  for (const [col, fn] of Object.entries(spec)) {
    if (body[col] !== undefined) { sets.push(`${col} = ?`); binds.push(fn(body[col])) }
  }
  if (!sets.length) throw bad('INVALID', 'No hay cambios que guardar')
  if (stamp) sets.push("updated_at = datetime('now')")
  try { await env.DB.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${table === 'business_settings' ? 'id = 1' : 'id = ?'}`).bind(...binds, ...(table === 'business_settings' ? [] : [id])).run() } catch (e) { throw mapDbError(e) }
}
const run = async (p) => { try { return await p } catch (e) { throw mapDbError(e) } }

/* ---------- Citas ---------- */
const APPT_SQL = `SELECT a.id, a.customer_id, a.service_id, a.appointment_date, a.start_time, a.end_time, a.status, a.customer_notes, a.internal_notes, a.source,
  c.name AS c_name, c.phone AS c_phone, c.email AS c_email, s.name AS s_name, s.price AS s_price, s.duration_minutes AS s_dur
  FROM appointments a JOIN customers c ON c.id = a.customer_id LEFT JOIN services s ON s.id = a.service_id`
const apptOut = (r) => ({
  id: r.id, customer_id: r.customer_id, service_id: r.service_id, appointment_date: r.appointment_date, start_time: r.start_time, end_time: r.end_time,
  status: r.status, customer_notes: r.customer_notes, internal_notes: r.internal_notes, source: r.source,
  customer: { id: r.customer_id, name: r.c_name, phone: r.c_phone, email: r.c_email },
  service: r.service_id ? { id: r.service_id, name: r.s_name, price: r.s_price, duration_minutes: r.s_dur } : null,
})

async function listAppointments(env, q) {
  const where = [], binds = []
  if (q.customer) { where.push('a.customer_id = ?'); binds.push(q.customer) }
  if (q.from && q.to) { where.push('a.appointment_date BETWEEN ? AND ?'); binds.push(date(q.from), date(q.to)) }
  const { results } = await env.DB.prepare(`${APPT_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.appointment_date, a.start_min`).bind(...binds).all()
  return results.map(apptOut)
}

async function createAppointment(env, b) {
  const st = b.status === undefined ? 'confirmed' : oneOf(STATUSES)(b.status)
  const d = date(b.date), t = hhmm(b.start_time), dur = num(b.duration, { min: 5, max: 480, int: true })
  if (!t) throw bad('INVALID', 'Hora no válida')
  if (!await env.DB.prepare('SELECT 1 FROM customers WHERE id = ?').bind(str(b.customer_id, 40)).first()) throw bad('NOT_FOUND', 'Cliente no encontrado', 404)
  const start = toMin(t), end = start + dur
  if (end > 1439) throw bad('INVALID', 'La cita no puede pasar de medianoche')
  const r = await run(env.DB.prepare(`INSERT INTO appointments (customer_id, service_id, appointment_date, start_time, end_time, start_min, end_min, status, internal_notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin') RETURNING id`).bind(b.customer_id, optStr(b.service_id, 40), d, t, fromMin(end), start, end, st, optStr(b.internal_notes, 2000)).first())
  return { id: r.id }
}

async function updateAppointment(env, id, b) {
  const spec = {
    status: oneOf(STATUSES), service_id: (v) => optStr(v, 40), appointment_date: date,
    start_time: (v) => hhmm(v) || (() => { throw bad('INVALID', 'Hora no válida') })(),
    end_time: (v) => hhmm(v) || (() => { throw bad('INVALID', 'Hora no válida') })(),
    internal_notes: (v) => optStr(v, 2000),
  }
  const extra = {}
  if (b.start_time !== undefined || b.end_time !== undefined) {
    const cur = await env.DB.prepare('SELECT start_time, end_time FROM appointments WHERE id = ?').bind(id).first()
    if (!cur) throw bad('NOT_FOUND', 'Cita no encontrada', 404)
    const s = hhmm(b.start_time ?? cur.start_time), e = hhmm(b.end_time ?? cur.end_time)
    if (!s || !e || toMin(e) <= toMin(s)) throw bad('INVALID', 'La hora de fin debe ser posterior a la de inicio')
    extra.start_min = toMin(s); extra.end_min = toMin(e)
    spec.start_min = (v) => v; spec.end_min = (v) => v
  }
  await patch(env, 'appointments', id, { ...b, ...extra }, spec)
  return { ok: true }
}

/* ---------- Clientes ---------- */
const CUSTOMER_SQL = `SELECT c.id, c.name, c.phone, c.email, c.notes, c.created_at, c.marketing_consent, c.source, (c.user_id IS NOT NULL) AS has_account,
  (SELECT count(*) FROM appointments a WHERE a.customer_id = c.id AND a.status = 'completed') AS visits,
  (SELECT max(a.appointment_date) FROM appointments a WHERE a.customer_id = c.id AND a.status = 'completed') AS last_visit,
  (SELECT a.appointment_date FROM appointments a WHERE a.customer_id = c.id AND a.status IN ('pending', 'confirmed') AND a.appointment_date >= ? ORDER BY a.appointment_date, a.start_min LIMIT 1) AS next_appointment,
  COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.customer_id = c.id AND p.status = 'paid'), 0) AS total_spent
  FROM customers c`
const customerOut = (r) => ({ ...r, has_account: !!r.has_account, marketing_consent: !!r.marketing_consent, regular: r.visits >= 3 })
const customerSpec = {
  name: (v) => { const s = str(v, 100); if (s.length < 2) throw bad('INVALID', 'Indica el nombre'); return s },
  phone: (v) => { const p = normalizePhone(v); if (!validPhone(p)) throw bad('INVALID_PHONE', 'El teléfono no es válido'); return p },
  email: (v) => { const e = str(v, 160).toLowerCase(); if (e && !isEmail(e)) throw bad('INVALID_EMAIL', 'El email no es válido'); return e || null },
  notes: (v) => optStr(v, 4000), marketing_consent: bool,
}

async function createCustomer(env, b) {
  const name = customerSpec.name(b.name), phone = customerSpec.phone(b.phone)
  const r = await run(env.DB.prepare("INSERT INTO customers (name, phone, email, notes, marketing_consent, source) VALUES (?, ?, ?, ?, ?, 'admin') RETURNING id")
    .bind(name, phone, customerSpec.email(b.email ?? ''), optStr(b.notes, 4000), bool(b.marketing_consent)).first())
  return { id: r.id }
}

/* ---------- Dinero ---------- */
async function listPayments(env, q) {
  if (q.appointment) return (await env.DB.prepare("SELECT * FROM payments WHERE appointment_id = ? AND status = 'paid'").bind(q.appointment).first()) || null
  const { results } = await env.DB.prepare(`SELECT p.*, c.name AS c_name, s.name AS s_name FROM payments p LEFT JOIN customers c ON c.id = p.customer_id LEFT JOIN services s ON s.id = p.service_id
    WHERE p.status = 'paid' AND p.payment_date BETWEEN ? AND ? ORDER BY p.payment_date DESC, p.created_at DESC`).bind(date(q.from), date(q.to)).all()
  return results.map(({ c_name, s_name, ...p }) => ({ ...p, customer: c_name ? { name: c_name } : null, service: s_name ? { name: s_name } : null }))
}
async function createPayment(env, b) {
  const r = await run(env.DB.prepare(`INSERT INTO payments (appointment_id, customer_id, service_id, concept, amount, payment_method, payment_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`).bind(optStr(b.appointment_id, 40), optStr(b.customer_id, 40), optStr(b.service_id, 40), optStr(b.concept, 200),
    num(b.amount, { min: 0.01, max: 100000 }), oneOf(METHODS)(b.payment_method || 'cash'), date(b.payment_date), optStr(b.notes, 500)).first())
  return { id: r.id }
}
const expenseSpec = {
  concept: (v) => { const s = str(v, 120); if (s.length < 2) throw bad('INVALID', 'Indica el concepto'); return s },
  category: (v) => str(v, 60) || 'Otros', amount: (v) => num(v, { min: 0.01, max: 1000000 }), expense_date: date, notes: (v) => optStr(v, 500),
}

/* ---------- Ajustes ---------- */
const settingsSpec = {
  business_name: (v) => str(v, 100) || 'Barbería Segorbe', phone: (v) => str(v, 40), whatsapp_phone: (v) => normalizePhone(v), address: (v) => str(v, 200), email: (v) => optStr(v, 160),
  google_maps_url: (v) => optStr(v, 500), google_reviews_url: (v) => optStr(v, 500),
  rating: (v) => num(v, { min: 0, max: 5, nullable: true }), review_count: (v) => num(v, { min: 0, nullable: true, int: true }),
  slot_interval_minutes: (v) => num(v, { min: 5, max: 120, int: true }), default_duration_minutes: (v) => num(v, { min: 5, max: 480, int: true }),
  buffer_minutes: (v) => num(v, { min: 0, max: 120, int: true }), min_notice_minutes: (v) => num(v, { min: 0, max: 10080, int: true }),
  max_advance_days: (v) => num(v, { min: 1, max: 365, int: true }), capacity: (v) => num(v, { min: 1, max: 20, int: true }),
  cancel_min_hours: (v) => num(v, { min: 0, max: 168, int: true }), online_booking_enabled: bool, hours_verified: bool,
  confirmation_message: (v) => str(v, 600), legal_owner_name: (v) => optStr(v, 160), legal_tax_id: (v) => optStr(v, 40), legal_email: (v) => optStr(v, 160),
}
const serviceSpec = {
  name: (v) => { const s = str(v, 80); if (s.length < 2) throw bad('INVALID', 'Indica el nombre'); return s },
  description: (v) => optStr(v, 600), category: (v) => optStr(v, 60), price: (v) => num(v, { min: 0, nullable: true }),
  duration_minutes: (v) => num(v, { min: 5, max: 480, nullable: true, int: true }), image_url: (v) => optStr(v, 500), active: bool, sort_order: (v) => num(v, { int: true }),
}

/** [método, patrón, manejador(ctx)] — ctx: {env, q, params, body} */
export const adminRoutes = [
  ['GET', /^\/appointments$/, ({ env, q }) => listAppointments(env, q)],
  ['POST', /^\/appointments$/, ({ env, body }) => createAppointment(env, body)],
  ['PATCH', /^\/appointments\/([0-9a-f]+)$/, ({ env, params, body }) => updateAppointment(env, params[0], body)],

  ['GET', /^\/customers$/, async ({ env, q }) => (await env.DB.prepare(`${CUSTOMER_SQL} ORDER BY lower(c.name)`).bind(date(q.today || '2000-01-01')).all()).results.map(customerOut)],
  ['GET', /^\/customers\/([0-9a-f]+)$/, async ({ env, params, q }) => { const r = await env.DB.prepare(`${CUSTOMER_SQL} WHERE c.id = ?`).bind(date(q.today || '2000-01-01'), params[0]).first(); return r ? customerOut(r) : null }],
  ['POST', /^\/customers$/, ({ env, body }) => createCustomer(env, body)],
  ['POST', /^\/customers\/find-or-create$/, async ({ env, body }) => {
    const p = customerSpec.phone(body.phone)
    const ex = await env.DB.prepare('SELECT id, name, phone FROM customers WHERE phone = ?').bind(p).first()
    return ex || createCustomer(env, body)
  }],
  ['PATCH', /^\/customers\/([0-9a-f]+)$/, async ({ env, params, body }) => { await patch(env, 'customers', params[0], body, customerSpec); return { ok: true } }],
  ['DELETE', /^\/customers\/([0-9a-f]+)$/, async ({ env, params }) => { await run(env.DB.prepare('DELETE FROM customers WHERE id = ?').bind(params[0]).run()); return { ok: true } }],

  ['GET', /^\/services$/, async ({ env }) => (await env.DB.prepare('SELECT * FROM services ORDER BY sort_order, name').all()).results.map((s) => ({ ...s, active: !!s.active }))],
  ['POST', /^\/services$/, async ({ env, body }) => {
    const v = Object.fromEntries(Object.entries(serviceSpec).map(([k, fn]) => [k, fn(body[k] ?? (k === 'active' ? true : k === 'sort_order' ? 0 : null))]))
    await run(env.DB.prepare('INSERT INTO services (name, description, category, price, duration_minutes, image_url, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(v.name, v.description, v.category, v.price, v.duration_minutes, v.image_url, v.active, v.sort_order).run()); return { ok: true }
  }],
  ['PATCH', /^\/services\/([0-9a-f]+)$/, async ({ env, params, body }) => { await patch(env, 'services', params[0], body, serviceSpec); return { ok: true } }],
  ['DELETE', /^\/services\/([0-9a-f]+)$/, async ({ env, params }) => { await run(env.DB.prepare('DELETE FROM services WHERE id = ?').bind(params[0]).run()); return { ok: true } }],

  ['GET', /^\/payments$/, ({ env, q }) => listPayments(env, q)],
  ['POST', /^\/payments$/, ({ env, body }) => createPayment(env, body)],
  ['DELETE', /^\/payments\/([0-9a-f]+)$/, async ({ env, params }) => { await env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(params[0]).run(); return { ok: true } }],

  ['GET', /^\/expenses$/, async ({ env, q }) => (await env.DB.prepare('SELECT * FROM expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC, created_at DESC').bind(date(q.from), date(q.to)).all()).results],
  ['POST', /^\/expenses$/, async ({ env, body }) => {
    const v = Object.fromEntries(Object.entries(expenseSpec).map(([k, fn]) => [k, fn(body[k] ?? (k === 'category' ? 'Otros' : null))]))
    await run(env.DB.prepare('INSERT INTO expenses (concept, category, amount, expense_date, notes) VALUES (?, ?, ?, ?, ?)').bind(v.concept, v.category, v.amount, v.expense_date, v.notes).run()); return { ok: true }
  }],
  ['PATCH', /^\/expenses\/([0-9a-f]+)$/, async ({ env, params, body }) => { await patch(env, 'expenses', params[0], body, expenseSpec, false); return { ok: true } }],
  ['DELETE', /^\/expenses\/([0-9a-f]+)$/, async ({ env, params }) => { await env.DB.prepare('DELETE FROM expenses WHERE id = ?').bind(params[0]).run(); return { ok: true } }],

  ['GET', /^\/blocks$/, async ({ env, q }) => {
    const s = await getSettings(env)
    if (q.upcoming) {
      const now = new Intl.DateTimeFormat('sv-SE', { timeZone: s.timezone, dateStyle: 'short', timeStyle: 'short' }).format(new Date()) // 'YYYY-MM-DD HH:MM'
      return (await env.DB.prepare('SELECT * FROM blocked_slots WHERE end_local >= ? ORDER BY start_local').bind(now).all()).results
    }
    return (await env.DB.prepare('SELECT * FROM blocked_slots WHERE start_local < ? AND end_local > ? ORDER BY start_local').bind(`${date(q.to)} 24:00`, `${date(q.from)} 00:00`).all()).results
  }],
  ['POST', /^\/blocks$/, async ({ env, body }) => {
    const ok = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v) ? v : (() => { throw bad('INVALID', 'Fecha u hora no válidas') })())
    await run(env.DB.prepare('INSERT INTO blocked_slots (start_local, end_local, reason) VALUES (?, ?, ?)').bind(ok(body.start_local), ok(body.end_local), optStr(body.reason, 200)).run()); return { ok: true }
  }],
  ['DELETE', /^\/blocks\/([0-9a-f]+)$/, async ({ env, params }) => { await env.DB.prepare('DELETE FROM blocked_slots WHERE id = ?').bind(params[0]).run(); return { ok: true } }],

  ['PATCH', /^\/settings$/, async ({ env, body }) => { await patch(env, 'business_settings', 1, body, settingsSpec); return { ok: true } }],
  ['PUT', /^\/opening-hours$/, async ({ env, body }) => {
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 30) : []
    const stmts = [env.DB.prepare('DELETE FROM opening_hours')]
    for (const r of rows) {
      const closed = !!r.is_closed
      stmts.push(env.DB.prepare('INSERT INTO opening_hours (weekday, opening_time, closing_time, is_closed) VALUES (?, ?, ?, ?)')
        .bind(num(r.weekday, { min: 0, max: 6, int: true }), closed ? null : hhmm(r.opening_time), closed ? null : hhmm(r.closing_time), closed ? 1 : 0))
    }
    try { await env.DB.batch(stmts) } catch (e) { throw mapDbError(e) }
    return { ok: true }
  }],

  ['GET', /^\/dashboard$/, async ({ env, q }) => {
    const today = date(q.today)
    const [a, p, c, pay] = await env.DB.batch([
      env.DB.prepare(`SELECT count(*) AS n FROM appointments WHERE appointment_date = ? AND status IN ('pending', 'confirmed', 'completed')`).bind(today),
      env.DB.prepare("SELECT count(*) AS n FROM appointments WHERE status = 'pending' AND appointment_date >= ?").bind(today),
      env.DB.prepare('SELECT count(*) AS n FROM customers'),
      env.DB.prepare("SELECT COALESCE(sum(amount), 0) AS s FROM payments WHERE status = 'paid' AND payment_date = ?").bind(today),
    ])
    return { today: a.results[0].n, pending: p.results[0].n, customers: c.results[0].n, incomeToday: pay.results[0].s }
  }],
]
