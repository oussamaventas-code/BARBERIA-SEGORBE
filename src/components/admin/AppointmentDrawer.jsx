import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Loader2, MessageCircle, Phone, X } from 'lucide-react'
import { Drawer, Field, ConfirmDialog, StatusBadge, useToast } from './ui'
import * as api from '../../lib/api'
import { friendlyError } from '../../lib/errors'
import { useBusiness } from '../../context/BusinessContext'
import { capitalize, formatDate, hhmm, money, normalizePhone, PAYMENT_METHODS, STATUS, telLink, todayISO, toMinutes, whatsappLink } from '../../lib/format'

const duration = (a) => (a ? toMinutes(a.end_time) - toMinutes(a.start_time) : 30)

/** Crear / ver / editar una cita (panel lateral) */
export default function AppointmentDrawer({ open, onClose, appointment, defaults = {}, onChanged }) {
  const toast = useToast()
  const { settings } = useBusiness()
  const [services, setServices] = useState([])
  const [customers, setCustomers] = useState([])
  const isNew = !appointment
  const [f, setF] = useState({})
  const [newCustomer, setNewCustomer] = useState(false)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [payment, setPayment] = useState(null) // cobro existente
  const [payForm, setPayForm] = useState(null) // formulario de cobro abierto

  useEffect(() => {
    if (!open) return
    setError(''); setPayForm(null); setSearch(''); setNewCustomer(false)
    api.listAllServices().then((s) => setServices(s.filter((x) => x.active || x.id === appointment?.service_id)))
    if (isNew) api.listCustomers().then(setCustomers)
    if (appointment) {
      setF({ service_id: appointment.service_id || '', date: appointment.appointment_date, start_time: hhmm(appointment.start_time), duration: duration(appointment), internal_notes: appointment.internal_notes || '' })
      api.getAppointmentPayment(appointment.id).then(setPayment)
    } else {
      setF({ customer_id: defaults.customer_id || '', service_id: '', date: defaults.date || todayISO(settings.timezone), start_time: defaults.time || '10:00', duration: 30, internal_notes: '', name: '', phone: '' })
      setPayment(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment?.id])

  const svc = useMemo(() => services.find((s) => s.id === f.service_id), [services, f.service_id])
  useEffect(() => { if (isNew && svc?.duration_minutes) setF((x) => ({ ...x, duration: svc.duration_minutes })) }, [svc, isNew])
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const guard = async (fn, ok) => {
    setBusy(true); setError('')
    try { await fn(); if (ok) toast.success(ok); onChanged?.() } catch (e) { setError(friendlyError(e)); return false } finally { setBusy(false) }
    return true
  }

  const create = () => guard(async () => {
    let customerId = f.customer_id
    if (newCustomer) customerId = (await api.findOrCreateCustomer({ name: f.name, phone: f.phone })).id
    if (!customerId) throw { message: 'Selecciona o crea un cliente.' }
    await api.createAppointment({ customer_id: customerId, service_id: f.service_id, date: f.date, start_time: f.start_time, duration: Number(f.duration), internal_notes: f.internal_notes })
  }, 'Cita creada').then((ok) => ok && onClose())

  const saveEdit = () => guard(() => api.updateAppointment(appointment.id, {
    service_id: f.service_id || null, appointment_date: f.date, start_time: f.start_time,
    end_time: `${String(Math.floor((toMinutes(f.start_time) + Number(f.duration)) / 60)).padStart(2, '0')}:${String((toMinutes(f.start_time) + Number(f.duration)) % 60).padStart(2, '0')}`,
    internal_notes: f.internal_notes || null,
  }), 'Cambios guardados')

  const setStatus = (status, msg) => guard(() => api.updateAppointment(appointment.id, { status }), msg).then((ok) => ok && status !== 'completed' && onClose())

  const openComplete = () => setPayForm({ amount: appointment.service?.price ?? '', payment_method: 'cash', pay: true })
  const complete = () => guard(async () => {
    await api.updateAppointment(appointment.id, { status: 'completed' })
    if (payForm.pay && Number(payForm.amount) > 0) {
      await api.registerPayment({ appointment_id: appointment.id, customer_id: appointment.customer_id, service_id: appointment.service_id, amount: Number(payForm.amount), payment_method: payForm.payment_method, payment_date: todayISO(settings.timezone) })
    }
  }, payForm.pay ? 'Cita completada y cobro registrado' : 'Cita completada').then((ok) => { if (ok) { setPayForm(null); onClose() } })

  const registerLater = () => guard(async () => {
    await api.registerPayment({ appointment_id: appointment.id, customer_id: appointment.customer_id, service_id: appointment.service_id, amount: Number(payForm.amount), payment_method: payForm.payment_method, payment_date: todayISO(settings.timezone) })
    setPayment(await api.getAppointmentPayment(appointment.id)); setPayForm(null)
  }, 'Cobro registrado')

  const filtered = customers.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(normalizePhone(search) || search)).slice(0, 6)
  const st = appointment?.status

  return (
    <Drawer open={open} onClose={onClose} title={isNew ? 'Nueva cita' : 'Detalle de la cita'}>
      {error && <p role="alert" className="mb-4 rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-3 text-sm text-status-noshow">{error}</p>}

      {!isNew && (
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xl font-semibold tracking-tight">{appointment.customer?.name}</p>
              <p className="mt-1 font-mono text-xs text-steel">{capitalize(formatDate(appointment.appointment_date))} · {hhmm(appointment.start_time)}–{hhmm(appointment.end_time)}</p></div>
            <StatusBadge status={st} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="abtn abtn-ghost !py-2" href={telLink(appointment.customer?.phone)}><Phone size={14} /> Llamar</a>
            <a className="abtn abtn-ghost !py-2" target="_blank" rel="noopener noreferrer" href={whatsappLink(appointment.customer?.phone, `Hola ${appointment.customer?.name}, te escribimos de ${settings.business_name} sobre tu cita del ${formatDate(appointment.appointment_date)} a las ${hhmm(appointment.start_time)}.`)}><MessageCircle size={14} /> WhatsApp</a>
            <Link className="abtn abtn-ghost !py-2" to={`/admin/clientes/${appointment.customer_id}`} onClick={onClose}>Ver cliente</Link>
          </div>
          {appointment.customer_notes && <p className="mt-4 rounded-2xl bg-obsidian/60 p-3 text-sm text-steel"><span className="text-ivory">Nota del cliente:</span> {appointment.customer_notes}</p>}
          {payment && <p className="mt-4 rounded-2xl border border-status-completed/30 bg-status-completed/10 p-3 text-sm text-status-completed">Cobrado: {money(payment.amount)} · {PAYMENT_METHODS[payment.payment_method]}</p>}

          {/* Acciones de estado */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {st === 'pending' && <button disabled={busy} onClick={() => setStatus('confirmed', 'Cita confirmada')} className="abtn abtn-gold col-span-2"><Check size={16} /> Confirmar cita</button>}
            {(st === 'pending' || st === 'confirmed') && <>
              <button disabled={busy} onClick={openComplete} className="abtn abtn-ghost">Completar</button>
              <button disabled={busy} onClick={() => setStatus('no_show', 'Marcada como no presentado')} className="abtn abtn-ghost">No se presentó</button>
              <button disabled={busy} onClick={() => setConfirm('cancel')} className="abtn abtn-danger col-span-2"><X size={16} /> Cancelar cita</button>
            </>}
            {(st === 'cancelled' || st === 'no_show') && <button disabled={busy} onClick={() => setStatus('pending', 'Cita reabierta como pendiente')} className="abtn abtn-ghost col-span-2">Reabrir cita</button>}
            {st === 'completed' && !payment && <button onClick={() => setPayForm({ amount: appointment.service?.price ?? '', payment_method: 'cash', later: true })} className="abtn abtn-gold col-span-2">Registrar cobro</button>}
          </div>

          {payForm && (
            <div className="mt-4 space-y-3 rounded-2xl border border-champagne/25 bg-obsidian/60 p-4">
              <p className="text-sm font-medium">{payForm.later ? 'Registrar cobro' : 'Completar cita'}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Importe (€)"><input className="input" type="number" min="0" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></Field>
                <Field label="Método"><select className="input" value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              </div>
              {payForm.later
                ? <button disabled={busy || !(Number(payForm.amount) > 0)} onClick={registerLater} className="abtn abtn-gold w-full">Guardar cobro</button>
                : <div className="grid grid-cols-2 gap-2">
                    <button disabled={busy || !(Number(payForm.amount) > 0)} onClick={() => { payForm.pay = true; complete() }} className="abtn abtn-gold">Completar y cobrar</button>
                    <button disabled={busy} onClick={() => { payForm.pay = false; complete() }} className="abtn abtn-ghost">Sin cobro</button>
                  </div>}
              <p className="text-xs text-steel">Los ingresos solo cuentan cuando registras el cobro.</p>
            </div>
          )}
          <hr className="my-6 border-white/[0.07]" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-steel">Editar cita</p>
        </div>
      )}

      <div className="space-y-4">
        {isNew && (
          <div className="space-y-3">
            {!newCustomer ? <>
              <Field label="Cliente"><input className="input" placeholder="Buscar por nombre o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} /></Field>
              <ul className="space-y-1.5">
                {filtered.map((c) => (
                  <li key={c.id}><button type="button" onClick={() => setF((x) => ({ ...x, customer_id: c.id }))} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-2.5 text-left text-sm ${f.customer_id === c.id ? 'border-champagne bg-champagne/10' : 'border-white/10 hover:border-champagne/40'}`}><span>{c.name}</span><span className="font-mono text-xs text-steel">{c.phone}</span></button></li>
                ))}
                {!filtered.length && <li className="text-sm text-steel">Sin resultados.</li>}
              </ul>
              <button type="button" onClick={() => { setNewCustomer(true); setF((x) => ({ ...x, customer_id: '' })) }} className="text-sm font-semibold text-champagne">+ Cliente nuevo</button>
            </> : <>
              <Field label="Nombre"><input className="input" value={f.name} onChange={set('name')} /></Field>
              <Field label="Teléfono" hint="Si el teléfono ya existe, se usará ese cliente."><input className="input" type="tel" value={f.phone} onChange={set('phone')} /></Field>
              <button type="button" onClick={() => setNewCustomer(false)} className="text-sm text-steel hover:text-ivory">← Elegir cliente existente</button>
            </>}
          </div>
        )}
        <Field label="Servicio"><select className="input" value={f.service_id || ''} onChange={set('service_id')}><option value="">Sin servicio</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha"><input className="input" type="date" value={f.date || ''} onChange={set('date')} /></Field>
          <Field label="Hora"><input className="input" type="time" step="300" value={f.start_time || ''} onChange={set('start_time')} /></Field>
        </div>
        <Field label="Duración (min)"><input className="input" type="number" min="5" max="480" step="5" value={f.duration || ''} onChange={set('duration')} /></Field>
        <Field label="Notas internas" hint="Solo las ves tú."><textarea className="input min-h-[80px]" value={f.internal_notes || ''} onChange={set('internal_notes')} /></Field>
        <button disabled={busy} onClick={isNew ? create : saveEdit} className="abtn abtn-gold w-full py-3">{busy ? <Loader2 size={16} className="animate-spin" /> : isNew ? 'Crear cita' : 'Guardar cambios'}</button>
      </div>

      <ConfirmDialog open={confirm === 'cancel'} title="¿Cancelar esta cita?" message="La cita quedará cancelada y el hueco volverá a estar disponible. Puedes avisar al cliente por WhatsApp." confirmLabel="Cancelar cita" busy={busy}
        onCancel={() => setConfirm(null)} onConfirm={async () => { await setStatus('cancelled', 'Cita cancelada'); setConfirm(null) }} />
    </Drawer>
  )
}
