const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
/** Orden de visualización: lunes primero */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const weekdayName = (d) => WEEKDAYS[d]

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
export const money = (n) => eur.format(Number(n || 0))

/** Precio de servicio: nunca inventar → "Consultar precio" */
export const formatPrice = (price) =>
  price === null || price === undefined || price === '' ? 'Consultar precio' : eur.format(Number(price))

export const formatDuration = (min) => {
  if (!min) return 'Duración a consultar'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export const hhmm = (t) => (t ? String(t).slice(0, 5) : '')

/** Fecha 'YYYY-MM-DD' de hoy en la zona horaria indicada */
export function todayISO(timeZone = 'Europe/Madrid') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** Hora local 'HH:MM' en la zona horaria indicada */
export function nowHHMM(timeZone = 'Europe/Madrid') {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}

/** Trabaja con fechas ISO sin zonas horarias (mediodía UTC para evitar saltos DST) */
export const parseISO = (iso) => new Date(`${iso}T12:00:00Z`)
export const toISO = (d) => d.toISOString().slice(0, 10)
export const addDays = (iso, n) => {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}
export const dowOf = (iso) => parseISO(iso).getUTCDay()
export const startOfWeek = (iso) => addDays(iso, -((dowOf(iso) + 6) % 7)) // lunes
export const startOfMonth = (iso) => `${iso.slice(0, 7)}-01`
export const endOfMonth = (iso) => {
  const d = parseISO(startOfMonth(iso))
  d.setUTCMonth(d.getUTCMonth() + 1)
  d.setUTCDate(0)
  return toISO(d)
}
export const addMonths = (iso, n) => {
  const d = parseISO(startOfMonth(iso))
  d.setUTCMonth(d.getUTCMonth() + n)
  return toISO(d)
}

export function formatDate(iso, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-ES', { ...opts, timeZone: 'UTC' }).format(parseISO(String(iso).slice(0, 10)))
}
export const formatShortDate = (iso) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })
export const formatMonth = (iso) => formatDate(iso, { month: 'long', year: 'numeric' })
export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Suma minutos a 'HH:MM' */
export function addMinutes(t, mins) {
  const [h, m] = hhmm(t).split(':').map(Number)
  const total = h * 60 + m + Number(mins)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
export const toMinutes = (t) => {
  const [h, m] = hhmm(t).split(':').map(Number)
  return h * 60 + m
}

/** Teléfono: solo dígitos, prefijo 34 si son 9 dígitos (igual que la BD) */
export function normalizePhone(p) {
  let d = String(p || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 9) d = `34${d}`
  return d
}
export const isValidPhone = (p) => /^[0-9]{11,15}$/.test(normalizePhone(p))

export function displayPhone(p) {
  const d = normalizePhone(p)
  if (d.startsWith('34') && d.length === 11) {
    const n = d.slice(2)
    return `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`
  }
  return p
}

export const whatsappLink = (phone, text = '') =>
  `https://wa.me/${normalizePhone(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`
export const telLink = (phone) => `tel:+${normalizePhone(phone)}`

export const STATUS = {
  pending: { label: 'Pendiente', color: 'bg-status-pending', text: 'text-status-pending', ring: 'border-status-pending/40', soft: 'bg-status-pending/10' },
  confirmed: { label: 'Confirmada', color: 'bg-status-confirmed', text: 'text-status-confirmed', ring: 'border-status-confirmed/50', soft: 'bg-status-confirmed/10' },
  completed: { label: 'Completada', color: 'bg-status-completed', text: 'text-status-completed', ring: 'border-status-completed/40', soft: 'bg-status-completed/10' },
  cancelled: { label: 'Cancelada', color: 'bg-status-cancelled', text: 'text-steel', ring: 'border-white/10', soft: 'bg-white/5' },
  no_show: { label: 'No presentado', color: 'bg-status-noshow', text: 'text-status-noshow', ring: 'border-status-noshow/40', soft: 'bg-status-noshow/10' },
}
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'completed']

export const PAYMENT_METHODS = { cash: 'Efectivo', card: 'Tarjeta', other: 'Otros' }

/** Convierte fecha 'YYYY-MM-DD' + hora 'HH:MM' en hora local de `tz` a ISO UTC */
export function zonedToISO(dateISO, time, tz = 'Europe/Madrid') {
  const guess = new Date(`${dateISO}T${hhmm(time)}:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(guess)
  const g = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const asUTC = Date.UTC(g.year, g.month - 1, g.day, g.hour, g.minute)
  const offset = asUTC - guess.getTime()
  return new Date(guess.getTime() - offset).toISOString()
}

/** Muestra un instante ISO como {date, time} en hora local de `tz` */
export function isoToZoned(iso, tz = 'Europe/Madrid') {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return { date, time }
}
