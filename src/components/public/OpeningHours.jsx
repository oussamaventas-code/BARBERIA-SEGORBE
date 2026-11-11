import { useBusiness } from '../../context/BusinessContext'
import { WEEK_ORDER, weekdayName, hhmm } from '../../lib/format'

/** Horario agrupado por día, desde la BD */
export function hoursByDay(hours) {
  return WEEK_ORDER.map((d) => {
    const rows = hours.filter((h) => h.weekday === d)
    const closed = rows.length === 0 || rows.some((r) => r.is_closed)
    return { day: d, closed, ranges: closed ? [] : rows.map((r) => `${hhmm(r.opening_time)} – ${hhmm(r.closing_time)}`) }
  })
}

export default function OpeningHours({ compact = false }) {
  const { hours, settings, loading } = useBusiness()
  if (loading) return <p className="font-mono text-xs text-steel">Cargando horario…</p>
  if (!hours.length) return <p className="font-mono text-xs text-steel">Horario: consúltanos por teléfono o WhatsApp.</p>
  return (
    <div>
      <ul className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
        {hoursByDay(hours).map((r) => (
          <li key={r.day} className="flex items-baseline justify-between gap-4 font-mono text-xs">
            <span className="text-white/70">{weekdayName(r.day)}</span>
            <span className={r.closed ? 'text-steel' : 'text-white'}>{r.closed ? 'Cerrado' : r.ranges.join(' · ')}</span>
          </li>
        ))}
      </ul>
      {settings.hours_verified === false && (
        <p className="mt-3 text-[11px] leading-relaxed text-steel">Horario orientativo. Confirma por teléfono o WhatsApp.</p>
      )}
    </div>
  )
}
