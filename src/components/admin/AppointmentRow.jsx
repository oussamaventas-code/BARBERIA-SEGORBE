import { Check, X } from 'lucide-react'
import { StatusBadge } from './ui'
import { hhmm, formatDate } from '../../lib/format'

/** Fila de cita: tarjeta en móvil, línea en escritorio */
export default function AppointmentRow({ a, onOpen, onQuick, showDate }) {
  const quick = a.status === 'pending' || a.status === 'confirmed'
  return (
    <li className="rounded-3xl border border-white/[0.06] bg-obsidian/40 p-4 transition-colors hover:border-champagne/30">
      <div className="flex items-center gap-4">
        <button onClick={() => onOpen(a)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <div className="w-14 shrink-0 text-center">
            <p className="font-mono text-lg text-champagne">{hhmm(a.start_time)}</p>
            {showDate && <p className="font-mono text-[10px] text-steel">{formatDate(a.appointment_date, { day: 'numeric', month: 'short' })}</p>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{a.customer?.name}</p>
            <p className="truncate text-xs text-steel">{a.service?.name || 'Sin servicio'} · <span className="font-mono">{a.customer?.phone}</span></p>
          </div>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <StatusBadge status={a.status} />
          {quick && (
            <div className="flex gap-1.5">
              {a.status === 'pending' && <button onClick={() => onQuick(a, 'confirmed')} aria-label="Confirmar" className="flex h-9 w-9 items-center justify-center rounded-full bg-champagne text-obsidian"><Check size={16} /></button>}
              <button onClick={() => onQuick(a, 'cancel')} aria-label="Cancelar" className="flex h-9 w-9 items-center justify-center rounded-full border border-status-noshow/40 text-status-noshow"><X size={16} /></button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
