import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Ban, Plus } from 'lucide-react'
import { PageHeader, Spinner, EmptyState, useAsync, useToast, ConfirmDialog, StatusBadge } from '../../components/admin/ui'
import AppointmentDrawer from '../../components/admin/AppointmentDrawer'
import AppointmentRow from '../../components/admin/AppointmentRow'
import BlockDrawer from '../../components/admin/BlockDrawer'
import * as api from '../../lib/api'
import { friendlyError } from '../../lib/errors'
import { useBusiness } from '../../context/BusinessContext'
import { addDays, addMonths, capitalize, dowOf, formatDate, formatMonth, hhmm, startOfMonth, startOfWeek, STATUS, todayISO, WEEKDAYS_SHORT } from '../../lib/format'
import { CalendarDays } from 'lucide-react'

const VIEWS = [['day', 'Día'], ['week', 'Semana'], ['month', 'Mes'], ['list', 'Pendientes']]

export default function Citas() {
  const { settings } = useBusiness()
  const tz = settings.timezone
  const toast = useToast()
  const today = todayISO(tz)
  const [view, setView] = useState('week')
  const [cursor, setCursor] = useState(today)
  const [drawer, setDrawer] = useState(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [delBlock, setDelBlock] = useState(null)

  const range = useMemo(() => {
    if (view === 'day') return [cursor, cursor]
    if (view === 'week') { const s = startOfWeek(cursor); return [s, addDays(s, 6)] }
    if (view === 'month') { const s = startOfWeek(startOfMonth(cursor)); return [s, addDays(s, 41)] }
    return [today, addDays(today, 120)]
  }, [view, cursor, today])

  const { data, loading, reload } = useAsync(async () => {
    const [appts, blocks] = await Promise.all([api.listAppointments(range[0], range[1]), api.listBlocks(range[0], range[1])])
    return { appts: view === 'list' ? appts.filter((a) => a.status === 'pending') : appts, blocks }
  }, [range[0], range[1], view])

  const byDay = useMemo(() => {
    const m = {}
    ;(data?.appts || []).forEach((a) => { (m[a.appointment_date] ||= []).push(a) })
    return m
  }, [data])
  // Bloqueos en hora local 'YYYY-MM-DD HH:MM'; un fin a las 00:00 no cuenta ese día
  const lastDay = (b) => (b.end_local.slice(11) === '00:00' ? addDays(b.end_local.slice(0, 10), -1) : b.end_local.slice(0, 10))
  const blocksOn = (iso) => (data?.blocks || []).filter((b) => b.start_local.slice(0, 10) <= iso && lastDay(b) >= iso)

  const step = (n) => setCursor(view === 'month' ? addMonths(cursor, n) : addDays(cursor, view === 'week' ? 7 * n : n))
  const title = view === 'month' ? capitalize(formatMonth(cursor)) : view === 'week' ? `${formatDate(range[0], { day: 'numeric', month: 'short' })} – ${formatDate(range[1], { day: 'numeric', month: 'short', year: 'numeric' })}` : capitalize(formatDate(cursor, { weekday: 'long', day: 'numeric', month: 'long' }))

  const quick = async (a, action) => {
    if (action === 'cancel') return setCancelTarget(a)
    try { await api.updateAppointment(a.id, { status: action }); toast.success('Cita confirmada'); reload() } catch (e) { toast.error(friendlyError(e)) }
  }
  const open = (a) => setDrawer({ appointment: a })

  const BlockChip = ({ b }) => {
    const s = { time: b.start_local.slice(11) }, e = { time: b.end_local.slice(11) }
    return <li className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-steel"><span className="flex items-center gap-2"><Ban size={13} /> Bloqueado {s.time === '00:00' && e.time === '00:00' ? 'todo el día' : `${s.time}–${e.time}`}{b.reason ? ` · ${b.reason}` : ''}</span><button onClick={() => setDelBlock(b)} className="font-semibold text-champagne">Quitar</button></li>
  }

  return (
    <>
      <PageHeader title="Citas" subtitle="Calendario y gestión de reservas" actions={<>
        <button onClick={() => setBlockOpen(true)} className="abtn abtn-ghost"><Ban size={15} /> Bloquear</button>
        <button onClick={() => setDrawer({ date: view === 'list' ? today : cursor })} className="abtn abtn-gold"><Plus size={16} /> Nueva cita</button>
      </>} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-white/10 p-1" role="tablist">
          {VIEWS.map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${view === k ? 'bg-champagne text-obsidian' : 'text-steel hover:text-ivory'}`}>{l}</button>)}
        </div>
        {view !== 'list' && (
          <div className="flex items-center gap-2">
            <button onClick={() => step(-1)} aria-label="Anterior" className="abtn abtn-ghost !p-2.5"><ChevronLeft size={16} /></button>
            <button onClick={() => setCursor(today)} className="abtn abtn-ghost !py-2">Hoy</button>
            <button onClick={() => step(1)} aria-label="Siguiente" className="abtn abtn-ghost !p-2.5"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
      {view !== 'list' && <p className="mb-4 font-semibold tracking-tight">{title}</p>}

      <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-steel">
        {Object.entries(STATUS).map(([k, s]) => <span key={k} className="flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${s.color}`} />{s.label}</span>)}
      </div>

      {loading && !data ? <Spinner /> : (
        <>
          {view === 'day' && (
            <div>
              <ul className="mb-3 space-y-2">{blocksOn(cursor).map((b) => <BlockChip key={b.id} b={b} />)}</ul>
              {(byDay[cursor] || []).length ? <ul className="space-y-2.5">{byDay[cursor].map((a) => <AppointmentRow key={a.id} a={a} onOpen={open} onQuick={quick} />)}</ul>
                : <EmptyState icon={CalendarDays} title="Sin citas este día" action={<button onClick={() => setDrawer({ date: cursor })} className="abtn abtn-gold">Crear cita</button>} />}
            </div>
          )}

          {view === 'week' && (
            <div className="grid gap-3 lg:grid-cols-7">
              {Array.from({ length: 7 }, (_, i) => addDays(range[0], i)).map((iso) => (
                <div key={iso} className={`card min-h-[120px] p-3 ${iso === today ? '!border-champagne/50' : ''}`}>
                  <button onClick={() => { setCursor(iso); setView('day') }} className="mb-3 flex w-full items-baseline justify-between"><span className="text-xs uppercase tracking-wider text-steel">{WEEKDAYS_SHORT[dowOf(iso)]}</span><span className={`font-mono text-lg ${iso === today ? 'text-champagne' : ''}`}>{iso.slice(8)}</span></button>
                  <ul className="space-y-1.5">
                    {blocksOn(iso).map((b) => <li key={b.id} className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-2 py-1.5 text-[11px] text-steel"><Ban size={11} /> {b.reason || 'Bloqueado'}</li>)}
                    {(byDay[iso] || []).map((a) => (
                      <li key={a.id}><button onClick={() => open(a)} className={`w-full rounded-xl border px-2.5 py-2 text-left text-xs ${STATUS[a.status].ring} ${STATUS[a.status].soft}`}>
                        <span className={`font-mono font-medium ${STATUS[a.status].text}`}>{hhmm(a.start_time)}</span> <span className="block truncate">{a.customer?.name}</span><span className="block truncate text-[10px] text-steel">{a.service?.name}</span></button></li>
                    ))}
                    {!(byDay[iso] || []).length && !blocksOn(iso).length && <li className="text-[11px] text-steel/60">—</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {view === 'month' && (
            <div className="card overflow-hidden p-2 sm:p-4">
              <div className="grid grid-cols-7 pb-2 text-center text-[11px] uppercase tracking-wider text-steel">{[1, 2, 3, 4, 5, 6, 0].map((d) => <span key={d}>{WEEKDAYS_SHORT[d]}</span>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 42 }, (_, i) => addDays(range[0], i)).map((iso) => {
                  const list = byDay[iso] || []
                  const inMonth = iso.slice(0, 7) === cursor.slice(0, 7)
                  return (
                    <button key={iso} onClick={() => { setCursor(iso); setView('day') }} className={`min-h-[64px] rounded-2xl border p-1.5 text-left transition-colors hover:border-champagne/40 sm:min-h-[92px] sm:p-2 ${iso === today ? 'border-champagne/60' : 'border-white/[0.05]'} ${inMonth ? '' : 'opacity-35'}`}>
                      <span className="font-mono text-xs">{Number(iso.slice(8))}</span>
                      <span className="mt-1 flex flex-wrap gap-1">{list.slice(0, 6).map((a) => <i key={a.id} className={`h-1.5 w-1.5 rounded-full ${STATUS[a.status].color}`} />)}</span>
                      {list.length > 0 && <span className="mt-1 hidden text-[10px] text-steel sm:block">{list.length} cita{list.length > 1 ? 's' : ''}</span>}
                      {blocksOn(iso).length > 0 && <Ban size={10} className="mt-1 text-steel" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {view === 'list' && (data.appts.length
            ? <ul className="space-y-2.5">{data.appts.map((a) => <AppointmentRow key={a.id} a={a} showDate onOpen={open} onQuick={quick} />)}</ul>
            : <EmptyState icon={CalendarDays} title="No hay solicitudes pendientes" text="Las nuevas solicitudes de la web aparecerán aquí para que las confirmes." />)}
        </>
      )}

      <AppointmentDrawer open={Boolean(drawer)} onClose={() => setDrawer(null)} appointment={drawer?.appointment} defaults={{ date: drawer?.date }} onChanged={reload} />
      <BlockDrawer open={blockOpen} onClose={() => setBlockOpen(false)} defaultDate={cursor} onSaved={reload} />
      <ConfirmDialog open={Boolean(cancelTarget)} title="¿Cancelar esta cita?" message={cancelTarget ? `Se cancelará la cita de ${cancelTarget.customer?.name}.` : ''} confirmLabel="Cancelar cita" onCancel={() => setCancelTarget(null)}
        onConfirm={async () => { try { await api.updateAppointment(cancelTarget.id, { status: 'cancelled' }); toast.success('Cita cancelada'); setCancelTarget(null); reload() } catch (e) { toast.error(friendlyError(e)) } }} />
      <ConfirmDialog open={Boolean(delBlock)} title="¿Quitar el bloqueo?" message="El horario volverá a estar disponible para reservar." confirmLabel="Quitar" onCancel={() => setDelBlock(null)}
        onConfirm={async () => { try { await api.deleteBlock(delBlock.id); toast.success('Bloqueo eliminado'); setDelBlock(null); reload() } catch (e) { toast.error(friendlyError(e)) } }} />
    </>
  )
}
