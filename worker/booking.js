// Parte pública: datos del negocio, disponibilidad, reservas e identidad del cliente.
import { absMin, addDays, bad, bool, dowOf, fromMin, hhmm, isEmail, isoDate, localNow, normalizePhone, optStr, readJson, str, toMin, tokenList, validPhone } from './util.js'

const ACTIVE = "('pending', 'confirmed', 'completed')"
const FLAGS = ['online_booking_enabled', 'hours_verified']

export const settingsOut = (s) => (s ? { ...s, ...Object.fromEntries(FLAGS.map((k) => [k, !!s[k]])) } : s)
export const getSettings = (env) => env.DB.prepare('SELECT * FROM business_settings WHERE id = 1').first()

/** Datos comerciales que muestra la web: negocio, horario y servicios activos */
export async function publicBundle(env) {
  const [s, h, sv] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM business_settings WHERE id = 1'),
    env.DB.prepare('SELECT id, weekday, opening_time, closing_time, is_closed FROM opening_hours ORDER BY weekday, opening_time'),
    env.DB.prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort_order, name'),
  ])
  return {
    settings: settingsOut(s.results[0]),
    hours: h.results.map((r) => ({ ...r, is_closed: !!r.is_closed })),
    services: sv.results.map((r) => ({ ...r, active: !!r.active })),
  }
}

/* ---------- Disponibilidad ---------- */
async function loadAgenda(env, from, to, excludeId) {
  const [a, b, h] = await env.DB.batch([
    env.DB.prepare(`SELECT appointment_date AS d, start_min, end_min FROM appointments
                    WHERE appointment_date BETWEEN ? AND ? AND status IN ${ACTIVE} AND id IS NOT ?`).bind(from, to, excludeId || null),
    env.DB.prepare('SELECT start_local, end_local FROM blocked_slots WHERE start_local < ? AND end_local > ?').bind(`${to} 24:00`, `${from} 00:00`),
    env.DB.prepare('SELECT weekday, opening_time, closing_time, is_closed FROM opening_hours'),
  ])
  return { appts: a.results, blocks: b.results, hours: h.results }
}

/** Huecos libres de un día (minutos desde 00:00) para una duración dada */
function slotsForDay(ctx, date, duration) {
  const { settings: s, now, agenda } = ctx
  if (date < now.date || date > addDays(now.date, s.max_advance_days)) return []
  const rows = agenda.hours.filter((r) => r.weekday === dowOf(date))
  if (!rows.length || rows.some((r) => r.is_closed)) return []
  const dayAppts = agenda.appts.filter((a) => a.d === date)
  const out = []
  for (const r of rows) {
    const open = toMin(r.opening_time), close = toMin(r.closing_time)
    for (let t = open; t + duration <= close; t += s.slot_interval_minutes) {
      if (absMin(date, t) < absMin(now.date, now.min) + s.min_notice_minutes) continue
      const overlap = dayAppts.filter((a) => a.start_min < t + duration + s.buffer_minutes && a.end_min + s.buffer_minutes > t).length
      if (overlap >= s.capacity) continue
      const from = `${date} ${fromMin(t)}`, to = `${date} ${fromMin(t + duration)}`
      if (agenda.blocks.some((b) => b.start_local < to && b.end_local > from)) continue
      out.push(t)
    }
  }
  return out
}

async function availabilityContext(env, serviceId, from, to, excludeId) {
  const settings = await getSettings(env)
  if (!settings || !settings.online_booking_enabled) return null
  const svc = await env.DB.prepare('SELECT id, name, duration_minutes FROM services WHERE id = ? AND active = 1').bind(serviceId).first()
  if (!svc) return null
  return { ctx: { settings, now: localNow(settings.timezone), agenda: await loadAgenda(env, from, to, excludeId) }, duration: svc.duration_minutes || settings.default_duration_minutes, svc, settings }
}

export async function availableDays(env, q) {
  const from = isoDate(q.from), to = isoDate(q.to)
  if (!from || !to || to < from || (Date.parse(to) - Date.parse(from)) / 86400000 > 62) throw bad('INVALID_RANGE', 'Rango de fechas no válido')
  const a = await availabilityContext(env, q.service, from, to, q.exclude)
  if (!a) return []
  const out = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ day: d, slots: slotsForDay(a.ctx, d, a.duration).length })
  return out
}

export async function availableSlots(env, q) {
  const date = isoDate(q.date)
  if (!date) throw bad('INVALID_RANGE', 'Fecha no válida')
  const a = await availabilityContext(env, q.service, date, date, q.exclude)
  return a ? slotsForDay(a.ctx, date, a.duration).map(fromMin) : []
}

/* ---------- Identidad: cuenta, dispositivo o cita ---------- */
function authFilter(tokens, userId) {
  const parts = [], binds = []
  if (tokens.length) {
    const ph = tokens.map(() => '?').join(',')
    parts.push(`a.manage_token IN (${ph})`, `c.access_token IN (${ph})`)
    binds.push(...tokens, ...tokens)
  }
  if (userId) { parts.push('c.user_id = ?'); binds.push(userId) }
  return parts.length ? { sql: `(${parts.join(' OR ')})`, binds } : null
}

export async function myBookings(env, tokens, user) {
  const s = await getSettings(env)
  const f = authFilter(tokens, user?.id)
  if (!f) return { customer: null, bookings: [], cancel_min_hours: s.cancel_min_hours }
  const now = localNow(s.timezone), nowAbs = absMin(now.date, now.min)
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.status, a.appointment_date, a.start_time, a.end_time, a.start_min, a.service_id, sv.name AS service_name
     FROM appointments a JOIN customers c ON c.id = a.customer_id LEFT JOIN services sv ON sv.id = a.service_id
     WHERE ${f.sql} ORDER BY a.appointment_date DESC, a.start_min DESC LIMIT 30`).bind(...f.binds).all()
  const bookings = results.map((a) => ({
    id: a.id, status: a.status, date: a.appointment_date, start_time: a.start_time, end_time: a.end_time,
    service_id: a.service_id, service_name: a.service_name,
    can_modify: ['pending', 'confirmed'].includes(a.status) && absMin(a.appointment_date, a.start_min) >= nowAbs + s.cancel_min_hours * 60,
  }))

  // Perfil: solo con prueba de identidad a nivel de cliente (cuenta o token del dispositivo)
  const cf = authFilter(tokens, user?.id)
  const parts = [], binds = []
  if (tokens.length) { parts.push(`c.access_token IN (${tokens.map(() => '?').join(',')})`); binds.push(...tokens) }
  if (user?.id) { parts.push('c.user_id = ?'); binds.push(user.id) }
  let customer = null
  if (cf && parts.length) {
    const c = await env.DB.prepare(`SELECT c.*, (SELECT count(*) FROM appointments x WHERE x.customer_id = c.id AND x.status = 'completed') AS visits
                                    FROM customers c WHERE ${parts.join(' OR ')} LIMIT 1`).bind(...binds).first()
    if (c) customer = { name: c.name, phone: c.phone, email: c.email, visits: c.visits, regular: c.visits >= 3, has_account: !!c.user_id }
  }
  return { customer, bookings, cancel_min_hours: s.cancel_min_hours }
}

async function ownedAppointment(env, id, tokens, user) {
  const f = authFilter(tokens, user?.id)
  const a = f && await env.DB.prepare(`SELECT a.* FROM appointments a JOIN customers c ON c.id = a.customer_id WHERE a.id = ? AND ${f.sql}`).bind(id, ...f.binds).first()
  if (!a) throw bad('NOT_FOUND', 'No encontramos esa cita', 404)
  return a
}
const canModify = (a, s) => {
  const now = localNow(s.timezone)
  return ['pending', 'confirmed'].includes(a.status) && absMin(a.appointment_date, a.start_min) >= absMin(now.date, now.min) + s.cancel_min_hours * 60
}

export async function cancelBooking(env, b, user) {
  const tokens = tokenList(b.tokens)
  const a = await ownedAppointment(env, str(b.appointment_id, 40), tokens, user)
  if (!canModify(a, await getSettings(env))) throw bad('CANNOT_MODIFY', 'Esta cita ya no se puede cancelar online. Llámanos', 409)
  await env.DB.prepare("UPDATE appointments SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").bind(a.id).run()
  return myBookings(env, tokens, user)
}

export async function rescheduleBooking(env, b, user) {
  const tokens = tokenList(b.tokens)
  const date = isoDate(b.date), time = hhmm(b.start_time)
  if (!date || !time) throw bad('INVALID_RANGE', 'Fecha u hora no válidas')
  const a = await ownedAppointment(env, str(b.appointment_id, 40), tokens, user)
  const s = await getSettings(env)
  if (!canModify(a, s) || !a.service_id) throw bad('CANNOT_MODIFY', 'Esta cita ya no se puede cambiar online. Llámanos', 409)
  const av = await availabilityContext(env, a.service_id, date, date, a.id)
  if (!av || !slotsForDay(av.ctx, date, a.end_min - a.start_min).includes(toMin(time))) throw bad('SLOT_TAKEN', 'Ese horario ya no está disponible', 409)
  const start = toMin(time), end = start + (a.end_min - a.start_min)
  try {
    // Un cambio vuelve a necesitar la confirmación de la barbería. El trigger de D1 es la última barrera.
    await env.DB.prepare("UPDATE appointments SET appointment_date = ?, start_time = ?, end_time = ?, start_min = ?, end_min = ?, status = 'pending', updated_at = datetime('now') WHERE id = ?")
      .bind(date, time, fromMin(end), start, end, a.id).run()
  } catch (e) { throw mapDbError(e) }
  return myBookings(env, tokens, user)
}

export function mapDbError(e) {
  const m = String(e?.message || e)
  if (m.includes('SLOT_TAKEN')) return bad('SLOT_TAKEN', 'Ese horario ya no está disponible', 409)
  if (m.includes('SLOT_BLOCKED')) return bad('SLOT_BLOCKED', 'Ese horario está bloqueado en la agenda', 409)
  if (m.includes('customers.phone')) return bad('PHONE_EXISTS', 'Ya existe un cliente con ese teléfono.', 409)
  if (m.includes('payments_one_paid') || m.includes('payments.appointment_id')) return bad('PAYMENT_EXISTS', 'Esta cita ya tiene un cobro registrado.', 409)
  if (m.includes('FOREIGN KEY')) return bad('HAS_DEPENDENCIES', 'No se puede eliminar porque tiene datos asociados (por ejemplo, citas). Puedes desactivarlo.', 409)
  if (m.includes('CHECK constraint')) return bad('INVALID', 'Algún dato no es válido. Revisa el formulario.')
  if (m.includes('UNIQUE')) return bad('DUPLICATE', 'Ese registro ya existe.', 409)
  return e
}

/** Vincula la cuenta (sesión iniciada) con la ficha de cliente. Solo con prueba de identidad. */
export async function claimCustomer(env, b, user) {
  if (!user) throw bad('NOT_AUTH', 'Inicia sesión para continuar', 401)
  const tokens = tokenList(b.tokens)
  const mine = await env.DB.prepare('SELECT id FROM customers WHERE user_id = ?').bind(user.id).first()
  if (mine) return myBookings(env, tokens, user)

  let proof = null
  if (tokens.length) {
    const ph = tokens.map(() => '?').join(',')
    proof = await env.DB.prepare(`SELECT c.id FROM customers c WHERE c.user_id IS NULL AND (c.access_token IN (${ph})
      OR c.id IN (SELECT customer_id FROM appointments WHERE manage_token IN (${ph}))) LIMIT 1`).bind(...tokens, ...tokens).first()
  }
  try {
    if (proof) {
      await env.DB.prepare('UPDATE customers SET user_id = ? WHERE id = ?').bind(user.id, proof.id).run()
    } else {
      const name = str(b.name, 100), phone = normalizePhone(b.phone)
      if (!b.privacy_accepted) throw bad('PRIVACY_REQUIRED', 'Debes aceptar la política de privacidad')
      if (name.length < 2) throw bad('INVALID_NAME', 'Indica tu nombre')
      if (!validPhone(phone)) throw bad('INVALID_PHONE', 'El teléfono no es válido')
      const c = await env.DB.prepare('SELECT id, user_id FROM customers WHERE phone = ?').bind(phone).first()
      if (c) {
        const hist = await env.DB.prepare('SELECT 1 FROM appointments WHERE customer_id = ? LIMIT 1').bind(c.id).first()
        if (c.user_id || hist) throw bad('PHONE_IN_USE', 'Ese teléfono ya tiene historial en la barbería. Entra desde el móvil donde reservaste o llámanos para vincularlo', 409)
        await env.DB.prepare("UPDATE customers SET user_id = ?, name = ?, privacy_accepted_at = COALESCE(privacy_accepted_at, datetime('now')) WHERE id = ?").bind(user.id, name, c.id).run()
      } else {
        await env.DB.prepare("INSERT INTO customers (name, phone, privacy_accepted_at, source, user_id) VALUES (?, ?, datetime('now'), 'web', ?)").bind(name, phone, user.id).run()
      }
    }
  } catch (e) { throw mapDbError(e) }
  return myBookings(env, tokens, user)
}

/* ---------- Crear reserva (pública) ---------- */
export async function createBooking(env, b, user) {
  if (!b.privacy_accepted) throw bad('PRIVACY_REQUIRED', 'Debes aceptar la política de privacidad')
  const name = str(b.name, 100), phone = normalizePhone(b.phone), email = str(b.email, 160).toLowerCase() || null
  const notes = optStr(b.notes, 500), date = isoDate(b.date), time = hhmm(b.start_time), tokens = tokenList(b.tokens)
  if (name.length < 2) throw bad('INVALID_NAME', 'Indica tu nombre')
  if (!validPhone(phone)) throw bad('INVALID_PHONE', 'El teléfono no es válido')
  if (email && !isEmail(email)) throw bad('INVALID_EMAIL', 'El email no es válido')
  if (!date || !time) throw bad('INVALID_RANGE', 'Fecha u hora no válidas')

  const settings = await getSettings(env)
  if (!settings?.online_booking_enabled) throw bad('BOOKING_DISABLED', 'La reserva online no está disponible', 409)
  const svc = await env.DB.prepare('SELECT * FROM services WHERE id = ? AND active = 1').bind(str(b.service_id, 40)).first()
  if (!svc) throw bad('INVALID_SERVICE', 'El servicio no está disponible')
  const duration = svc.duration_minutes || settings.default_duration_minutes
  const start = toMin(time), end = start + duration

  // 1) comprobación amable (horario, cierres, bloqueos, antelación, capacidad, margen)
  const av = await availabilityContext(env, svc.id, date, date)
  if (!av || !slotsForDay(av.ctx, date, duration).includes(start)) throw bad('SLOT_TAKEN', 'Ese horario ya no está disponible', 409)

  // 2) identidad: cuenta → token del dispositivo → invitado por teléfono
  let customerId = null, verified = false, isNew = false
  if (user) customerId = (await env.DB.prepare('SELECT id FROM customers WHERE user_id = ?').bind(user.id).first())?.id ?? null
  if (!customerId && tokens.length) customerId = (await env.DB.prepare(`SELECT id FROM customers WHERE access_token IN (${tokens.map(() => '?').join(',')}) LIMIT 1`).bind(...tokens).first())?.id ?? null
  if (customerId) verified = true
  else {
    customerId = (await env.DB.prepare('SELECT id FROM customers WHERE phone = ?').bind(phone).first())?.id ?? null
    if (!customerId) {
      try {
        customerId = (await env.DB.prepare("INSERT INTO customers (name, phone, email, privacy_accepted_at, source) VALUES (?, ?, ?, datetime('now'), 'web') RETURNING id").bind(name, phone, email).first()).id
        isNew = true
      } catch { customerId = (await env.DB.prepare('SELECT id FROM customers WHERE phone = ?').bind(phone).first())?.id } // carrera: ya existe
    } else {
      await env.DB.prepare("UPDATE customers SET email = COALESCE(email, ?), privacy_accepted_at = COALESCE(privacy_accepted_at, datetime('now')) WHERE id = ?").bind(email, customerId).run()
    }
  }
  if (!customerId) throw bad('INTERNAL', 'No se pudo registrar al cliente', 500)

  // 3) antiabuso y duplicados
  const today = localNow(settings.timezone).date
  const pend = await env.DB.prepare("SELECT count(*) AS n FROM appointments WHERE customer_id = ? AND status = 'pending' AND appointment_date >= ?").bind(customerId, today).first()
  if (pend.n >= settings.max_pending_per_phone) throw bad('TOO_MANY_PENDING', 'Ya tienes solicitudes pendientes. Contacta con la barbería', 409)
  if (await env.DB.prepare("SELECT 1 FROM appointments WHERE customer_id = ? AND appointment_date = ? AND start_min = ? AND status IN ('pending', 'confirmed')").bind(customerId, date, start).first())
    throw bad('DUPLICATE', 'Ya existe una solicitud para ese horario', 409)

  // 4) inserción: el trigger de D1 vuelve a comprobar el hueco dentro de la propia sentencia (atómico)
  let appt
  try {
    appt = await env.DB.prepare(`INSERT INTO appointments (customer_id, service_id, appointment_date, start_time, end_time, start_min, end_min, status, customer_notes, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'web') RETURNING id, manage_token`).bind(customerId, svc.id, date, time, fromMin(end), start, end, notes).first()
  } catch (e) { throw mapDbError(e) }

  const ctoken = isNew || verified ? (await env.DB.prepare('SELECT access_token FROM customers WHERE id = ?').bind(customerId).first()).access_token : null
  return { appointment_id: appt.id, manage_token: appt.manage_token, customer_token: ctoken, status: 'pending', date, start_time: time, end_time: fromMin(end), service_name: svc.name, message: settings.confirmation_message }
}
