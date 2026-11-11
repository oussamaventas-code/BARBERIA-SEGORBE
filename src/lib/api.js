import { supabase } from './supabase'
import { normalizePhone, addMinutes } from './format'

const unwrap = ({ data, error }) => { if (error) throw error; return data }

/* ---------- Citas ---------- */
const APPT_SELECT = '*, customer:customers(id,name,phone,email), service:services(id,name,price,duration_minutes)'

export const listAppointments = (from, to) =>
  supabase.from('appointments').select(APPT_SELECT).gte('appointment_date', from).lte('appointment_date', to)
    .order('appointment_date').order('start_time').then(unwrap)

export const listCustomerAppointments = (customerId) =>
  supabase.from('appointments').select('*, service:services(id,name,price)').eq('customer_id', customerId)
    .order('appointment_date', { ascending: false }).order('start_time', { ascending: false }).then(unwrap)

export const updateAppointment = (id, patch) => supabase.from('appointments').update(patch).eq('id', id).then(unwrap)
export const deleteAppointment = (id) => supabase.from('appointments').delete().eq('id', id).then(unwrap)

export async function findOrCreateCustomer({ name, phone, email }) {
  const p = normalizePhone(phone)
  const found = unwrap(await supabase.from('customers').select('*').eq('phone', p).maybeSingle())
  if (found) return found
  return unwrap(await supabase.from('customers').insert({ name: name.trim(), phone: p, email: email || null, source: 'admin' }).select().single())
}

export async function createAppointment({ customer_id, service_id, date, start_time, duration, status = 'confirmed', internal_notes }) {
  return unwrap(await supabase.from('appointments').insert({
    customer_id, service_id: service_id || null, appointment_date: date, start_time,
    end_time: addMinutes(start_time, duration), status, internal_notes: internal_notes || null, source: 'admin',
  }).select().single())
}

/* ---------- Cobros ---------- */
export const registerPayment = ({ appointment_id, customer_id, service_id, amount, payment_method, payment_date, concept, notes }) =>
  supabase.from('payments').insert({ appointment_id: appointment_id || null, customer_id: customer_id || null, service_id: service_id || null, amount, payment_method, payment_date, concept: concept || null, notes: notes || null }).select().single().then(unwrap)

export const listPayments = (from, to) =>
  supabase.from('payments').select('*, customer:customers(name), service:services(name)').eq('status', 'paid')
    .gte('payment_date', from).lte('payment_date', to).order('payment_date', { ascending: false }).order('created_at', { ascending: false }).then(unwrap)

export const getAppointmentPayment = (appointmentId) =>
  supabase.from('payments').select('*').eq('appointment_id', appointmentId).eq('status', 'paid').maybeSingle().then(unwrap)

export const deletePayment = (id) => supabase.from('payments').delete().eq('id', id).then(unwrap)

/* ---------- Gastos ---------- */
export const listExpenses = (from, to) =>
  supabase.from('expenses').select('*').gte('expense_date', from).lte('expense_date', to).order('expense_date', { ascending: false }).then(unwrap)
export const saveExpense = (e) => (e.id ? supabase.from('expenses').update(e).eq('id', e.id) : supabase.from('expenses').insert(e)).then(unwrap)
export const deleteExpense = (id) => supabase.from('expenses').delete().eq('id', id).then(unwrap)

/* ---------- Clientes ---------- */
export const listCustomers = () => supabase.from('customer_stats').select('*').order('name').then(unwrap)
export const getCustomer = (id) => supabase.from('customer_stats').select('*').eq('id', id).maybeSingle().then(unwrap)
export const saveCustomer = (c) => {
  const row = { name: c.name, phone: normalizePhone(c.phone), email: c.email || null, notes: c.notes || null, marketing_consent: !!c.marketing_consent }
  return (c.id ? supabase.from('customers').update(row).eq('id', c.id).select().single() : supabase.from('customers').insert({ ...row, source: 'admin' }).select().single()).then(unwrap)
}
export const deleteCustomer = (id) => supabase.from('customers').delete().eq('id', id).then(unwrap)

/* ---------- Servicios ---------- */
export const listAllServices = () => supabase.from('services').select('*').order('sort_order').order('name').then(unwrap)
export const saveService = (s) => {
  const row = { name: s.name, description: s.description || null, category: s.category || null,
    price: s.price === '' || s.price == null ? null : Number(s.price),
    duration_minutes: s.duration_minutes === '' || s.duration_minutes == null ? null : Number(s.duration_minutes),
    image_url: s.image_url || null, active: !!s.active, sort_order: Number(s.sort_order || 0) }
  return (s.id ? supabase.from('services').update(row).eq('id', s.id) : supabase.from('services').insert(row)).then(unwrap)
}
export const deleteService = (id) => supabase.from('services').delete().eq('id', id).then(unwrap)

/* ---------- Bloqueos ---------- */
export const listBlocks = (fromTs, toTs) =>
  supabase.from('blocked_slots').select('*').lt('start_datetime', toTs).gt('end_datetime', fromTs).order('start_datetime').then(unwrap)
export const listUpcomingBlocks = () =>
  supabase.from('blocked_slots').select('*').gte('end_datetime', new Date().toISOString()).order('start_datetime').then(unwrap)
export const createBlock = (b) => supabase.from('blocked_slots').insert(b).then(unwrap)
export const deleteBlock = (id) => supabase.from('blocked_slots').delete().eq('id', id).then(unwrap)

/* ---------- Configuración ---------- */
export const saveSettings = (patch) => supabase.from('business_settings').update(patch).eq('id', 1).then(unwrap)
export const replaceOpeningHours = async (rows) => {
  unwrap(await supabase.from('opening_hours').delete().gte('weekday', 0))
  if (rows.length) unwrap(await supabase.from('opening_hours').insert(rows))
}

/* ---------- Dashboard ---------- */
export async function dashboardCounts(today) {
  const [todayAppts, pending, customers, payToday, pays7] = await Promise.all([
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today).in('status', ['pending', 'confirmed', 'completed']),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending').gte('appointment_date', today),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('payments').select('amount').eq('status', 'paid').eq('payment_date', today),
    null,
  ])
  const sum = (payToday.data || []).reduce((a, p) => a + Number(p.amount), 0)
  return { today: todayAppts.count || 0, pending: pending.count || 0, customers: customers.count || 0, incomeToday: sum }
}
