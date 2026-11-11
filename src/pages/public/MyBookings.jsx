import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { friendlyError } from '../../lib/errors'
import { getTokens } from '../../lib/identity'
import { capitalize, formatDate, STATUS } from '../../lib/format'
import { useBusiness } from '../../context/BusinessContext'
import { useIdentity } from '../../context/IdentityContext'
import { useAuth } from '../../context/AuthContext'
import SlotPicker from '../../components/public/SlotPicker'

const STATUS_TEXT = { pending: 'Pendiente de confirmar', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada', no_show: 'No presentado' }

export default function MyBookings() {
  const { settings } = useBusiness()
  const { customer, bookings, loading, apply, forget, cancelMinHours } = useIdentity()
  const { session, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [changing, setChanging] = useState(null)

  const run = async (fn, args) => {
    setBusy(true); setError('')
    const { data, error: e } = await supabase.rpc(fn, { ...args, p_tokens: getTokens() })
    setBusy(false)
    if (e) { setError(friendlyError(e)); return false }
    apply(data); return true
  }
  const cancel = (id) => window.confirm('¿Seguro que quieres cancelar esta cita?') && run('cancel_booking', { p_appointment_id: id })
  const upcoming = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed')
  const past = bookings.filter((b) => !(b.status === 'pending' || b.status === 'confirmed'))
  const first = customer?.name?.split(' ')[0]

  const Card = ({ b }) => (
    <li className="rounded-[1.75rem] border border-white/[0.08] bg-slate/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-lg font-semibold tracking-tight text-white">{b.service_name || 'Cita'}</p>
          <p className="mt-1 font-mono text-sm text-white/70">{capitalize(formatDate(b.date))} · {b.start_time}</p></div>
        <span className={`rounded-full border px-3 py-1 text-xs ${STATUS[b.status]?.ring} ${STATUS[b.status]?.soft} ${STATUS[b.status]?.text}`}>{STATUS_TEXT[b.status]}</span>
      </div>
      {b.can_modify ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setChanging(changing === b.id ? null : b.id)} className="btn btn-ghost btn-sm">Cambiar día u hora</button>
          <button disabled={busy} onClick={() => cancel(b.id)} className="btn btn-ghost btn-sm !border-status-noshow/50 !text-status-noshow">Cancelar</button>
        </div>
      ) : (b.status === 'pending' || b.status === 'confirmed') && <p className="mt-3 text-sm text-white/50">Faltan menos de {cancelMinHours} h: para cambiarla, llámanos al {settings.phone}.</p>}
      {changing === b.id && b.service_id && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="mb-4 text-sm text-white/65">Elige el nuevo hueco. La barbería tendrá que volver a confirmarla.</p>
          {busy ? <Loader2 className="animate-spin text-champagne" /> : <SlotPicker serviceId={b.service_id} excludeId={b.id} onPick={async (date, time) => { if (await run('reschedule_booking', { p_appointment_id: b.id, p_date: date, p_start_time: time })) setChanging(null) }} />}
        </div>
      )}
    </li>
  )

  return (
    <section className="bg-obsidian pb-24 pt-28 sm:pt-36">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 className="text-[clamp(2.2rem,6vw,3.5rem)] font-semibold leading-[1] tracking-tightest text-white">{first ? `Hola, ${first}` : 'Mis citas'}</h1>
        {customer?.regular && <p className="mt-3 font-mono text-xs uppercase tracking-label text-champagne">Cliente habitual · {customer.visits} visitas</p>}
        {error && <p role="alert" className="mt-6 rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-4 text-sm text-status-noshow">{error}</p>}

        {loading ? <p className="mt-10 text-steel">Cargando…</p> : bookings.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-white/[0.07] bg-slate/40 p-8">
            <p className="text-white">No tenemos citas tuyas en este dispositivo.</p>
            <p className="mt-2 text-sm text-white/60">Si reservaste desde otro móvil, <Link to="/cuenta" className="text-champagne underline underline-offset-4">entra con tu cuenta</Link> o llámanos al {settings.phone}.</p>
            <Link to="/reservar" className="btn btn-gold mt-6">Pedir cita</Link>
          </div>
        ) : (<>
          <div className="mt-8 flex"><Link to="/reservar" className="btn btn-gold btn-sm">Nueva cita</Link></div>
          {upcoming.length > 0 && <><h2 className="mb-3 mt-10 font-mono text-[11px] uppercase tracking-label text-steel">Próximas</h2><ul className="space-y-3">{upcoming.map((b) => <Card key={b.id} b={b} />)}</ul></>}
          {past.length > 0 && <><h2 className="mb-3 mt-10 font-mono text-[11px] uppercase tracking-label text-steel">Anteriores</h2><ul className="space-y-3 opacity-80">{past.map((b) => <Card key={b.id} b={b} />)}</ul></>}
        </>)}

        <div className="mt-14 border-t border-white/[0.07] pt-6 text-sm text-steel">
          {session ? <>Sesión iniciada. <button onClick={() => signOut().then(forget)} className="text-champagne underline underline-offset-4">Cerrar sesión</button></>
            : <>{customer ? 'Te recordamos en este dispositivo. ' : ''}<Link to="/cuenta?crear=1" className="text-champagne underline underline-offset-4">Crea tu cuenta</Link> para ver tus citas desde cualquier móvil · <Link to="/cuenta" className="text-champagne underline underline-offset-4">Entrar</Link>
              {customer && <> · <button onClick={forget} className="underline underline-offset-4 hover:text-white">No soy {first}</button></>}</>}
        </div>
      </div>
    </section>
  )
}
