import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog, EmptyState, Spinner, StatusBadge, useAsync, useToast } from '../../components/admin/ui'
import CustomerDrawer from '../../components/admin/CustomerDrawer'
import AppointmentDrawer from '../../components/admin/AppointmentDrawer'
import * as api from '../../lib/api'
import { friendlyError } from '../../lib/errors'
import { capitalize, displayPhone, formatDate, formatShortDate, hhmm, money, telLink, whatsappLink } from '../../lib/format'

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [edit, setEdit] = useState(false)
  const [newAppt, setNewAppt] = useState(false)
  const [openAppt, setOpenAppt] = useState(null)
  const [del, setDel] = useState(false)
  const { data, loading, reload } = useAsync(async () => ({ c: await api.getCustomer(id), appts: await api.listCustomerAppointments(id) }), [id])

  if (loading && !data) return <Spinner />
  if (!data?.c) return <EmptyState title="Cliente no encontrado" action={<Link to="/admin/clientes" className="abtn abtn-gold">Volver a clientes</Link>} />
  const { c, appts } = data

  return (
    <>
      <Link to="/admin/clientes" className="mb-5 inline-flex items-center gap-2 text-sm text-steel hover:text-ivory"><ArrowLeft size={14} /> Clientes</Link>
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-2xl font-semibold tracking-tighter sm:text-3xl">{c.name}</h1>
            <p className="mt-1 font-mono text-sm text-steel">{displayPhone(c.phone)}{c.email ? ` · ${c.email}` : ''}</p>
            <p className="mt-1 text-xs text-steel">Alta: {formatShortDate(c.created_at.slice(0, 10))}</p></div>
          <div className="flex flex-wrap gap-2">
            <a href={telLink(c.phone)} className="abtn abtn-ghost"><Phone size={14} /> Llamar</a>
            <a href={whatsappLink(c.phone)} target="_blank" rel="noopener noreferrer" className="abtn abtn-ghost"><MessageCircle size={14} /> WhatsApp</a>
            <button onClick={() => setEdit(true)} className="abtn abtn-ghost"><Pencil size={14} /> Editar</button>
            <button onClick={() => setDel(true)} className="abtn abtn-danger" aria-label="Eliminar cliente"><Trash2 size={14} /></button>
          </div>
        </div>
        <dl className="mt-7 grid grid-cols-3 gap-3">
          {[['Visitas', c.visits], ['Última visita', c.last_visit ? formatShortDate(c.last_visit) : '—'], ['Total gastado', money(c.total_spent)]].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-obsidian/60 p-4"><dt className="text-[10px] uppercase tracking-[0.14em] text-steel">{k}</dt><dd className="mt-1.5 font-mono text-base sm:text-xl">{v}</dd></div>
          ))}
        </dl>
        {c.notes && <p className="mt-5 whitespace-pre-line rounded-2xl bg-obsidian/60 p-4 text-sm text-steel"><span className="text-ivory">Notas internas:</span> {c.notes}</p>}
      </div>

      <div className="mb-4 mt-8 flex items-center justify-between"><h2 className="text-lg font-semibold">Historial</h2>
        <button onClick={() => setNewAppt(true)} className="abtn abtn-gold"><Plus size={15} /> Nueva cita para este cliente</button></div>
      {appts.length ? (
        <ul className="space-y-2.5">{appts.map((a) => (
          <li key={a.id}><button onClick={() => setOpenAppt({ ...a, customer: { id: c.id, name: c.name, phone: c.phone, email: c.email } })} className="card flex w-full items-center justify-between gap-3 !rounded-3xl p-4 text-left hover:border-champagne/40">
            <div><p className="font-medium">{a.service?.name || 'Sin servicio'}</p><p className="font-mono text-xs text-steel">{capitalize(formatDate(a.appointment_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))} · {hhmm(a.start_time)}</p></div>
            <StatusBadge status={a.status} /></button></li>
        ))}</ul>
      ) : <EmptyState title="Sin citas todavía" text="Cuando este cliente reserve, su historial aparecerá aquí." />}

      <CustomerDrawer open={edit} onClose={() => setEdit(false)} customer={c} onSaved={reload} />
      <AppointmentDrawer open={newAppt} onClose={() => setNewAppt(false)} defaults={{ customer_id: c.id }} onChanged={reload} />
      <AppointmentDrawer open={Boolean(openAppt)} onClose={() => setOpenAppt(null)} appointment={openAppt} onChanged={reload} />
      <ConfirmDialog open={del} title="¿Eliminar cliente?" message="Se eliminará el cliente y todo su historial de citas. Los cobros registrados se conservan en finanzas. Esta acción no se puede deshacer." onCancel={() => setDel(false)}
        onConfirm={async () => { try { await api.deleteCustomer(id); toast.success('Cliente eliminado'); navigate('/admin/clientes') } catch (e) { toast.error(friendlyError(e)); setDel(false) } }} />
    </>
  )
}
