// Capa de datos del panel privado: llama a /api/admin/* (exige sesión de personal).
import { http } from './http'
import { normalizePhone, todayISO } from './format'

/* ---------- Citas ---------- */
export const listAppointments = (from, to) => http.get('/admin/appointments', { from, to })
export const listCustomerAppointments = (customer) => http.get('/admin/appointments', { customer })
export const updateAppointment = (id, patch) => http.patch(`/admin/appointments/${id}`, patch)
export const findOrCreateCustomer = ({ name, phone, email }) => http.post('/admin/customers/find-or-create', { name, phone, email })
export const createAppointment = (a) => http.post('/admin/appointments', a)

/* ---------- Cobros ---------- */
export const registerPayment = (p) => http.post('/admin/payments', p)
export const listPayments = (from, to) => http.get('/admin/payments', { from, to })
export const getAppointmentPayment = (appointment) => http.get('/admin/payments', { appointment })
export const deletePayment = (id) => http.del(`/admin/payments/${id}`)

/* ---------- Gastos ---------- */
export const listExpenses = (from, to) => http.get('/admin/expenses', { from, to })
export const saveExpense = (e) => (e.id ? http.patch(`/admin/expenses/${e.id}`, e) : http.post('/admin/expenses', e))
export const deleteExpense = (id) => http.del(`/admin/expenses/${id}`)

/* ---------- Clientes ---------- */
export const listCustomers = () => http.get('/admin/customers', { today: todayISO() })
export const getCustomer = (id) => http.get(`/admin/customers/${id}`, { today: todayISO() })
export const saveCustomer = (c) => {
  const row = { name: c.name, phone: normalizePhone(c.phone), email: c.email || '', notes: c.notes || '', marketing_consent: !!c.marketing_consent }
  return c.id ? http.patch(`/admin/customers/${c.id}`, row) : http.post('/admin/customers', row)
}
export const deleteCustomer = (id) => http.del(`/admin/customers/${id}`)

/* ---------- Servicios ---------- */
export const listAllServices = () => http.get('/admin/services')
export const saveService = (s) => {
  const row = {
    name: s.name, description: s.description || null, category: s.category || null,
    price: s.price === '' || s.price == null ? null : Number(s.price),
    duration_minutes: s.duration_minutes === '' || s.duration_minutes == null ? null : Number(s.duration_minutes),
    image_url: s.image_url || null, active: !!s.active, sort_order: Number(s.sort_order || 0),
  }
  return s.id ? http.patch(`/admin/services/${s.id}`, row) : http.post('/admin/services', row)
}
export const deleteService = (id) => http.del(`/admin/services/${id}`)

/* ---------- Bloqueos (hora local 'YYYY-MM-DD HH:MM') ---------- */
export const listBlocks = (from, to) => http.get('/admin/blocks', { from, to })
export const listUpcomingBlocks = () => http.get('/admin/blocks', { upcoming: 1 })
export const createBlock = (b) => http.post('/admin/blocks', b)
export const deleteBlock = (id) => http.del(`/admin/blocks/${id}`)

/* ---------- Configuración ---------- */
export const saveSettings = (patch) => http.patch('/admin/settings', patch)
export const replaceOpeningHours = (rows) => http.put('/admin/opening-hours', { rows })

/* ---------- Dashboard ---------- */
export const dashboardCounts = (today) => http.get('/admin/dashboard', { today })
