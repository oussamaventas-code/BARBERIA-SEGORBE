import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { friendlyError } from '../../lib/errors'
import { addDays, dowOf, formatDate, hhmm, todayISO, WEEKDAYS_SHORT } from '../../lib/format'
import { useBusiness } from '../../context/BusinessContext'

/** Día + hora en una sola pantalla. Se usa al reservar y al cambiar una cita. */
export default function SlotPicker({ serviceId, excludeId = null, onPick, disabled = false }) {
  const { settings } = useBusiness()
  const today = todayISO(settings.timezone)
  const horizon = Math.min(settings.max_advance_days || 60, 60)
  const [days, setDays] = useState(null)
  const [date, setDate] = useState(null)
  const [slots, setSlots] = useState(null)
  const [error, setError] = useState('')
  const slotsRef = useRef(null)

  useEffect(() => {
    let off = false
    setDays(null); setDate(null); setSlots(null)
    supabase.rpc('get_available_days', { p_service_id: serviceId, p_from: today, p_to: addDays(today, horizon), p_exclude_appointment: excludeId })
      .then(({ data, error: e }) => {
        if (off) return
        if (e) return setError(friendlyError(e))
        const map = Object.fromEntries((data || []).map((r) => [r.day, r.slots]))
        setDays(map)
        const first = Object.keys(map).find((d) => map[d] > 0)
        if (first) setDate(first) // abre ya el primer día con hueco: un toque menos
      })
    return () => { off = true }
  }, [serviceId, excludeId, today, horizon])

  useEffect(() => {
    if (!date) return
    let off = false
    setSlots(null)
    supabase.rpc('get_available_slots', { p_service_id: serviceId, p_date: date, p_exclude_appointment: excludeId })
      .then(({ data, error: e }) => { if (off) return; if (e) setError(friendlyError(e)); else setSlots((data || []).map((r) => hhmm(r.slot_time))) })
    return () => { off = true }
  }, [serviceId, excludeId, date])

  const available = useMemo(() => (days ? Object.keys(days).filter((d) => days[d] > 0) : []), [days])
  const groups = useMemo(() => (slots ? [['Mañana', slots.filter((t) => t < '14:00')], ['Tarde', slots.filter((t) => t >= '14:00')]].filter(([, l]) => l.length) : []), [slots])

  if (error) return <p role="alert" className="text-sm text-status-noshow">{error}</p>
  if (!days) return <p className="text-steel">Buscando huecos…</p>
  if (!available.length) return <p className="text-white/60">No hay huecos libres en los próximos días. Escríbenos por WhatsApp y lo vemos.</p>

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none sm:mx-0 sm:px-0" role="listbox" aria-label="Día">
        {available.map((iso) => (
          <button key={iso} role="option" aria-selected={date === iso} onClick={() => { setDate(iso); setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50) }}
            className={`flex w-[62px] shrink-0 flex-col items-center rounded-2xl border py-3 transition-colors ${date === iso ? 'border-champagne bg-champagne text-obsidian' : 'border-white/10 text-white hover:border-champagne/60'}`}>
            <span className="text-[10px] uppercase tracking-wider opacity-70">{iso === today ? 'Hoy' : WEEKDAYS_SHORT[dowOf(iso)]}</span>
            <span className="font-mono text-xl leading-tight">{iso.slice(8)}</span>
            <span className="text-[10px] opacity-60">{formatDate(iso, { month: 'short' })}</span>
          </button>
        ))}
      </div>

      <div ref={slotsRef} className="mt-6 space-y-5">
        {slots === null ? <p className="text-steel">Cargando horas…</p> : groups.map(([label, list]) => (
          <div key={label}>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-label text-steel">{label}</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {list.map((t) => <button key={t} disabled={disabled} onClick={() => onPick(date, t)} className="rounded-xl border border-white/10 py-3 font-mono text-sm text-white transition-colors hover:border-champagne hover:bg-champagne hover:text-obsidian disabled:opacity-50">{t}</button>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
