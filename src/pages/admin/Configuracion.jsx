import { useEffect, useState } from 'react'
import { Ban, Loader2, Trash2 } from 'lucide-react'
import { ConfirmDialog, Field, PageHeader, Spinner, useAsync, useToast } from '../../components/admin/ui'
import BlockDrawer from '../../components/admin/BlockDrawer'
import * as api from '../../lib/api'
import { friendlyError } from '../../lib/errors'
import { useBusiness } from '../../context/BusinessContext'
import { hhmm, isoToZoned, normalizePhone, WEEK_ORDER, weekdayName } from '../../lib/format'

const Section = ({ title, hint, children }) => <section className="card p-5 sm:p-7"><h2 className="text-lg font-semibold">{title}</h2>{hint && <p className="mt-1 text-sm text-steel">{hint}</p>}<div className="mt-5">{children}</div></section>

export default function Configuracion() {
  const { settings, hours, reload } = useBusiness()
  const toast = useToast()
  const [s, setS] = useState(settings)
  const [days, setDays] = useState({})
  const [busy, setBusy] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [delBlock, setDelBlock] = useState(null)
  const blocks = useAsync(api.listUpcomingBlocks, [])

  useEffect(() => { setS(settings) }, [settings])
  useEffect(() => {
    const d = {}
    WEEK_ORDER.forEach((w) => {
      const rows = hours.filter((h) => h.weekday === w)
      const closed = !rows.length || rows.some((r) => r.is_closed)
      d[w] = { closed, ranges: closed ? [{ o: '10:00', c: '20:30' }] : rows.map((r) => ({ o: hhmm(r.opening_time), c: hhmm(r.closing_time) })) }
    })
    setDays(d)
  }, [hours])

  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const num = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value === '' ? '' : Number(e.target.value) }))

  async function save() {
    setBusy(true)
    try {
      for (const w of WEEK_ORDER) for (const r of days[w].ranges) if (!days[w].closed && r.c <= r.o) throw { message: `${weekdayName(w)}: la hora de cierre debe ser posterior a la de apertura.`, custom: true }
      const patch = {
        business_name: s.business_name, phone: s.phone, whatsapp_phone: normalizePhone(s.whatsapp_phone || s.phone), address: s.address, email: s.email || null,
        google_maps_url: s.google_maps_url || null, google_reviews_url: s.google_reviews_url || null, rating: s.rating === '' ? null : s.rating, review_count: s.review_count === '' ? null : s.review_count,
        buffer_minutes: s.buffer_minutes, cancel_min_hours: s.cancel_min_hours, min_notice_minutes: s.min_notice_minutes, max_advance_days: s.max_advance_days, slot_interval_minutes: s.slot_interval_minutes,
        default_duration_minutes: s.default_duration_minutes, capacity: s.capacity, online_booking_enabled: s.online_booking_enabled, confirmation_message: s.confirmation_message,
        legal_owner_name: s.legal_owner_name || null, legal_tax_id: s.legal_tax_id || null, legal_email: s.legal_email || null, hours_verified: true,
      }
      await api.saveSettings(patch)
      const rows = WEEK_ORDER.flatMap((w) => days[w].closed ? [{ weekday: w, is_closed: true }] : days[w].ranges.map((r) => ({ weekday: w, opening_time: r.o, closing_time: r.c, is_closed: false })))
      await api.replaceOpeningHours(rows)
      await reload(); toast.success('Configuración guardada')
    } catch (e) { toast.error(e.custom ? e.message : friendlyError(e)) } finally { setBusy(false) }
  }

  const updRange = (w, i, k, v) => setDays((d) => ({ ...d, [w]: { ...d[w], ranges: d[w].ranges.map((r, j) => (j === i ? { ...r, [k]: v } : r)) } }))

  if (!s) return <Spinner />
  return (
    <>
      <PageHeader title="Configuración" subtitle="Datos del negocio, horario y reglas de reserva" actions={<button onClick={save} disabled={busy} className="abtn abtn-gold !px-6 !py-3">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Guardar cambios'}</button>} />
      <div className="space-y-6">
        {!settings.hours_verified && <p className="rounded-2xl border border-status-pending/40 bg-status-pending/10 p-4 text-sm text-status-pending">El horario es el de referencia (10:00–20:30, lunes a sábado). Revísalo y pulsa «Guardar cambios» para confirmarlo.</p>}

        <Section title="Negocio">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre comercial"><input className="input" value={s.business_name || ''} onChange={set('business_name')} /></Field>
            <Field label="Teléfono"><input className="input" value={s.phone || ''} onChange={set('phone')} /></Field>
            <Field label="WhatsApp (con prefijo)" hint="Ej.: 34643112858"><input className="input" value={s.whatsapp_phone || ''} onChange={set('whatsapp_phone')} /></Field>
            <Field label="Dirección"><input className="input" value={s.address || ''} onChange={set('address')} /></Field>
            <Field label="Enlace de Google Maps"><input className="input" type="url" value={s.google_maps_url || ''} onChange={set('google_maps_url')} /></Field>
            <Field label="Enlace de reseñas de Google"><input className="input" type="url" value={s.google_reviews_url || ''} onChange={set('google_reviews_url')} /></Field>
            <Field label="Valoración (0–5)" hint="Déjalo vacío para ocultarla"><input className="input" type="number" step="0.1" min="0" max="5" value={s.rating ?? ''} onChange={num('rating')} /></Field>
            <Field label="Número de reseñas"><input className="input" type="number" min="0" value={s.review_count ?? ''} onChange={num('review_count')} /></Field>
          </div>
        </Section>

        <Section title="Horario de apertura" hint="Puedes añadir un segundo tramo (por ejemplo, mañana y tarde).">
          <ul className="space-y-3">
            {WEEK_ORDER.map((w) => days[w] && (
              <li key={w} className="flex flex-wrap items-center gap-3 rounded-2xl bg-obsidian/50 p-3">
                <span className="w-24 text-sm font-medium">{weekdayName(w)}</span>
                <label className="flex items-center gap-2 text-xs text-steel"><input type="checkbox" className="h-4 w-4 accent-[#C9A84C]" checked={days[w].closed} onChange={(e) => setDays((d) => ({ ...d, [w]: { ...d[w], closed: e.target.checked } }))} /> Cerrado</label>
                {!days[w].closed && <div className="flex flex-wrap items-center gap-2">
                  {days[w].ranges.map((r, i) => <span key={i} className="flex items-center gap-1.5"><input type="time" className="input !w-auto !py-2" value={r.o} onChange={(e) => updRange(w, i, 'o', e.target.value)} />–<input type="time" className="input !w-auto !py-2" value={r.c} onChange={(e) => updRange(w, i, 'c', e.target.value)} />
                    {days[w].ranges.length > 1 && <button type="button" aria-label="Quitar tramo" onClick={() => setDays((d) => ({ ...d, [w]: { ...d[w], ranges: d[w].ranges.filter((_, j) => j !== i) } }))} className="text-steel hover:text-status-noshow"><Trash2 size={14} /></button>}</span>)}
                  {days[w].ranges.length < 2 && <button type="button" onClick={() => setDays((d) => ({ ...d, [w]: { ...d[w], ranges: [...d[w].ranges, { o: '16:00', c: '20:00' }] } }))} className="text-xs font-semibold text-champagne">+ tramo</button>}
                </div>}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Reservas online">
          <label className="mb-5 flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#C9A84C]" checked={!!s.online_booking_enabled} onChange={set('online_booking_enabled')} /> Aceptar reservas online</label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Margen entre citas (min)"><input className="input" type="number" min="0" value={s.buffer_minutes ?? 0} onChange={num('buffer_minutes')} /></Field>
            <Field label="Antelación mínima (min)" hint="120 = no se reserva con menos de 2 h"><input className="input" type="number" min="0" value={s.min_notice_minutes ?? 0} onChange={num('min_notice_minutes')} /></Field>
            <Field label="Reservar hasta (días)"><input className="input" type="number" min="1" max="365" value={s.max_advance_days ?? 60} onChange={num('max_advance_days')} /></Field>
            <Field label="Intervalo de huecos (min)"><input className="input" type="number" min="5" max="120" step="5" value={s.slot_interval_minutes ?? 15} onChange={num('slot_interval_minutes')} /></Field>
            <Field label="Duración por defecto (min)" hint="Para servicios sin duración"><input className="input" type="number" min="5" step="5" value={s.default_duration_minutes ?? 30} onChange={num('default_duration_minutes')} /></Field>
            <Field label="Cancelar/cambiar hasta (h antes)" hint="El cliente puede gestionar su cita hasta X horas antes"><input className="input" type="number" min="0" max="168" value={s.cancel_min_hours ?? 2} onChange={num('cancel_min_hours')} /></Field>
            <Field label="Clientes a la vez" hint="Nº de barberos / sillones"><input className="input" type="number" min="1" max="20" value={s.capacity ?? 1} onChange={num('capacity')} /></Field>
          </div>
          <div className="mt-4"><Field label="Mensaje de confirmación"><textarea className="input min-h-[80px]" value={s.confirmation_message || ''} onChange={set('confirmation_message')} /></Field></div>
        </Section>

        <Section title="Días bloqueados" hint="Vacaciones, festivos y huecos no disponibles.">
          <button onClick={() => setBlockOpen(true)} className="abtn abtn-ghost mb-4"><Ban size={15} /> Bloquear fechas</button>
          {blocks.data?.length ? <ul className="space-y-2">{blocks.data.map((b) => { const a = isoToZoned(b.start_datetime, settings.timezone), z = isoToZoned(b.end_datetime, settings.timezone); return (
            <li key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-obsidian/50 px-4 py-3 text-sm"><span>{a.date} {a.time} → {z.date} {z.time}{b.reason ? ` · ${b.reason}` : ''}</span><button onClick={() => setDelBlock(b)} className="text-steel hover:text-status-noshow" aria-label="Quitar"><Trash2 size={15} /></button></li>) })}</ul>
            : <p className="text-sm text-steel">No hay bloqueos próximos.</p>}
        </Section>

        <Section title="Datos legales" hint="Aparecen en la política de privacidad y el aviso legal.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Titular / razón social"><input className="input" value={s.legal_owner_name || ''} onChange={set('legal_owner_name')} /></Field>
            <Field label="NIF / CIF"><input className="input" value={s.legal_tax_id || ''} onChange={set('legal_tax_id')} /></Field>
            <Field label="Email de contacto legal"><input className="input" type="email" value={s.legal_email || ''} onChange={set('legal_email')} /></Field>
          </div>
        </Section>
      </div>
      <BlockDrawer open={blockOpen} onClose={() => setBlockOpen(false)} onSaved={blocks.reload} />
      <ConfirmDialog open={Boolean(delBlock)} title="¿Quitar bloqueo?" message="Ese horario volverá a estar disponible." confirmLabel="Quitar" onCancel={() => setDelBlock(null)}
        onConfirm={async () => { try { await api.deleteBlock(delBlock.id); toast.success('Bloqueo eliminado'); blocks.reload() } catch (e) { toast.error(friendlyError(e)) } setDelBlock(null) }} />
    </>
  )
}
