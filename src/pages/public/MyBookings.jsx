import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { friendlyError } from '../../lib/errors'
import { savedTokens, saveToken, forgetToken } from '../../lib/myBookings'
import { addDays, capitalize, dowOf, formatDate, hhmm, todayISO, WEEKDAYS_SHORT } from '../../lib/format'
import { useBusiness } from '../../context/BusinessContext'
import { STATUS } from '../../lib/format'

const STATUS_TEXT = {
  pending: 'Pendiente de confirmar por la barbería',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No presentado',
}

export default function MyBookings() {
  const { token } = useParams()
  const { settings } = useBusiness()
  const [items, setItems] = useState(null) // [{token, booking}]
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [changing, setChanging] = useState(null) // token en cambio

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setItems([]); return }
    if (token) saveToken(token)
    const tokens = token ? [token] : savedTokens()
    const out = await Promise.all(tokens.map(async (t) => {
      const { data } = await supabase.rpc('get_booking', { p_token: t })
      return data ? { token: t, booking: data } : null
    }))
    setItems(out.filter(Boolean))
  }, [token])
  useEffect(() => { load() }, [load])

  const cancel = async (t) => {
    if (!window.confirm('¿Seguro que quieres cancelar esta cita?')) return
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('cancel_booking', { p_token: t })
    setBusy(false)
    if (e) setError(friendlyError(e)); else load()
  }

  return (
    <section className="bg-obsidian pb-24 pt-32 sm:pt-40">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 className="text-[clamp(2.2rem,6vw,3.5rem)] font-semibold leading-[1] tracking-tightest text-white">Mis citas</h1>
        <p className="mt-4 text-white/60">Aquí ves las citas que has pedido desde este dispositivo. Puedes cambiarlas de día u hora o cancelarlas.</p>
        {error && <p role="alert" className="mt-6 rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-4 text-sm text-status-noshow">{error}</p>}

        {items === null ? <p className="mt-10 text-steel">Cargando…</p> : items.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-white/[0.07] bg-slate/40 p-8">
            <p className="text-white">No hay citas guardadas en este dispositivo.</p>
            <p className="mt-2 text-sm text-white/60">Si pediste cita desde otro móvil, usa el enlace que te salió al reservar. Si no lo tienes, llámanos al {settings.phone} y te la gestionamos.</p>
            <Link to="/reservar" className="btn btn-gold mt-6">Pedir cita</Link>
          </div>
        ) : (
          <ul className="mt-10 space-y-4">
            {items.map(({ token: t, booking: b }) => (
              <li key={t} className="rounded-[2rem] border border-white/[0.08] bg-slate/40 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-white">{b.service_name || 'Cita'}</p>
                    <p className="mt-1 font-mono text-sm text-white/70">{capitalize(formatDate(b.date))} · {b.start_time}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${STATUS[b.status]?.ring} ${STATUS[b.status]?.soft} ${STATUS[b.status]?.text}`}>{STATUS_TEXT[b.status]}</span>
                </div>
                {b.can_modify ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => setChanging(changing === t ? null : t)} className="btn btn-ghost btn-sm">Cambiar día u hora</button>
                    <button disabled={busy} onClick={() => cancel(t)} className="btn btn-ghost btn-sm !border-status-noshow/50 !text-status-noshow">Cancelar cita</button>
                  </div>
                ) : (b.status === 'pending' || b.status === 'confirmed') ? (
                  <p className="mt-4 text-sm text-white/50">Faltan menos de {b.cancel_min_hours} h: para cambiarla llámanos al {settings.phone}.</p>
                ) : (
                  <div className="mt-4 flex gap-4 text-sm"><Link to="/reservar" className="text-champagne underline underline-offset-4">Pedir otra cita</Link>
                    <button onClick={() => { forgetToken(t); load() }} className="text-steel hover:text-white">Quitar de la lista</button></div>
                )}
                {changing === t && <Reschedule token={t} booking={b} settings={settings} onDone={() => { setChanging(null); load() }} onError={setError} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function Reschedule({ token, booking, settings, onDone, onError }) {
  const today = todayISO(settings.timezone)
  const horizon = Math.min(settings.max_advance_days || 60, 60)
  const [days, setDays] = useState(null)
  const [date, setDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.rpc('get_available_days', { p_service_id: booking.service_id, p_from: today, p_to: addDays(today, horizon), p_exclude_appointment: booking.id }).then(({ data }) => setDays(Object.fromEntries((data || []).map((r) => [r.day, r.slots]))))
  }, [booking.service_id, today, horizon])
  useEffect(() => {
    if (!date) return
    supabase.rpc('get_available_slots', { p_service_id: booking.service_id, p_date: date, p_exclude_appointment: booking.id }).then(({ data }) => setSlots((data || []).map((r) => hhmm(r.slot_time))))
  }, [date, booking.service_id])

  const pick = async (time) => {
    setSaving(true); onError('')
    const { error } = await supabase.rpc('reschedule_booking', { p_token: token, p_date: date, p_start_time: time })
    setSaving(false)
    if (error) onError(friendlyError(error)); else onDone()
  }
  if (!days) return <p className="mt-5 text-sm text-steel">Buscando huecos…</p>
  const avail = Object.keys(days).filter((d) => days[d] > 0)
  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <p className="mb-3 text-sm text-white/70">Elige el nuevo día. Al cambiarla, la barbería tendrá que volver a confirmarla.</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {avail.slice(0, 24).map((iso) => (
          <button key={iso} onClick={() => setDate(iso)} className={`rounded-xl border py-2 text-center ${date === iso ? 'border-champagne bg-champagne text-obsidian' : 'border-white/10 text-white hover:border-champagne/60'}`}>
            <span className="block text-[10px] uppercase opacity-70">{WEEKDAYS_SHORT[dowOf(iso)]}</span><span className="font-mono">{iso.slice(8)}/{iso.slice(5, 7)}</span></button>
        ))}
        {!avail.length && <p className="col-span-full text-sm text-white/60">No hay huecos disponibles ahora mismo.</p>}
      </div>
      {date && <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {slots.map((t) => <button key={t} disabled={saving} onClick={() => pick(t)} className="rounded-xl border border-white/10 py-2.5 font-mono text-sm text-white hover:border-champagne/60 disabled:opacity-50">{saving ? <Loader2 size={14} className="mx-auto animate-spin" /> : t}</button>)}
      </div>}
    </div>
  )
}
