import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Drawer, Field, useToast } from './ui'
import * as api from '../../lib/api'
import { friendlyError } from '../../lib/errors'
import { useBusiness } from '../../context/BusinessContext'
import { todayISO, zonedToISO, addDays } from '../../lib/format'

/** Bloquear horario: franja concreta, día completo o varios días (vacaciones, festivos) */
export default function BlockDrawer({ open, onClose, defaultDate, onSaved }) {
  const { settings } = useBusiness()
  const toast = useToast()
  const tz = settings.timezone
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { const d = defaultDate || todayISO(tz); setF({ from: d, to: d, allDay: true, start: '14:00', end: '16:00', reason: '' }); setError('') }
  }, [open, defaultDate, tz])

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function save() {
    setBusy(true); setError('')
    try {
      const start = zonedToISO(f.from, f.allDay ? '00:00' : f.start, tz)
      const end = f.allDay ? zonedToISO(addDays(f.to || f.from, 1), '00:00', tz) : zonedToISO(f.from, f.end, tz)
      if (new Date(end) <= new Date(start)) throw { message: 'El fin debe ser posterior al inicio.', code: 'custom' }
      await api.createBlock({ start_datetime: start, end_datetime: end, reason: f.reason || null })
      toast.success('Horario bloqueado'); onSaved?.(); onClose()
    } catch (e) { setError(e.code === 'custom' ? e.message : friendlyError(e)) } finally { setBusy(false) }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Bloquear horario">
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-3 text-sm text-status-noshow">{error}</p>}
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#C9A84C]" checked={!!f.allDay} onChange={set('allDay')} /> Días completos (vacaciones, festivos)</label>
        <div className="grid grid-cols-2 gap-3">
          <Field label={f.allDay ? 'Desde' : 'Fecha'}><input type="date" className="input" value={f.from || ''} onChange={set('from')} /></Field>
          {f.allDay && <Field label="Hasta (incluido)"><input type="date" className="input" min={f.from} value={f.to || ''} onChange={set('to')} /></Field>}
        </div>
        {!f.allDay && <div className="grid grid-cols-2 gap-3">
          <Field label="Desde"><input type="time" className="input" value={f.start || ''} onChange={set('start')} /></Field>
          <Field label="Hasta"><input type="time" className="input" value={f.end || ''} onChange={set('end')} /></Field>
        </div>}
        <Field label="Motivo (opcional)"><input className="input" placeholder="Vacaciones, festivo, descanso…" value={f.reason || ''} onChange={set('reason')} /></Field>
        <p className="text-xs text-steel">Los huecos bloqueados no se pueden reservar desde la web. Las citas ya existentes no se modifican.</p>
        <button disabled={busy} onClick={save} className="abtn abtn-gold w-full py-3">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Bloquear'}</button>
      </div>
    </Drawer>
  )
}
