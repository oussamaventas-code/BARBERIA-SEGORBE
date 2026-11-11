import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarClock, Plus, Users, Wallet } from 'lucide-react'
import { PageHeader, Spinner, EmptyState, useAsync, useToast, ConfirmDialog } from '../../components/admin/ui'
import AppointmentDrawer from '../../components/admin/AppointmentDrawer'
import AppointmentRow from '../../components/admin/AppointmentRow'
import BarChart from '../../components/admin/BarChart'
import * as api from '../../lib/api'
import { friendlyError } from '../../lib/errors'
import { useBusiness } from '../../context/BusinessContext'
import { addDays, formatDate, money, todayISO } from '../../lib/format'

export default function Dashboard() {
  const { settings } = useBusiness()
  const toast = useToast()
  const today = todayISO(settings.timezone)
  const [drawer, setDrawer] = useState(null) // {appointment} | {new:true}
  const [cancelTarget, setCancelTarget] = useState(null)

  const { data, loading, reload } = useAsync(async () => {
    const [counts, upcoming, pays] = await Promise.all([
      api.dashboardCounts(today),
      api.listAppointments(today, addDays(today, 14)),
      api.listPayments(addDays(today, -6), today),
    ])
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
    const series = days.map((d) => ({ label: formatDate(d, { weekday: 'short' }).slice(0, 3), a: pays.filter((p) => p.payment_date === d).reduce((s, p) => s + Number(p.amount), 0) }))
    return { counts, upcoming: upcoming.filter((a) => ['pending', 'confirmed'].includes(a.status)).slice(0, 8), series, hasPayments: pays.length > 0 }
  }, [today])

  const quick = async (a, action) => {
    if (action === 'cancel') return setCancelTarget(a)
    try { await api.updateAppointment(a.id, { status: action }); toast.success('Cita confirmada'); reload() } catch (e) { toast.error(friendlyError(e)) }
  }
  const doCancel = async () => {
    try { await api.updateAppointment(cancelTarget.id, { status: 'cancelled' }); toast.success('Cita cancelada'); setCancelTarget(null); reload() } catch (e) { toast.error(friendlyError(e)) }
  }

  if (loading && !data) return <Spinner />
  const c = data.counts
  const cards = [
    { k: 'Citas de hoy', v: c.today, icon: CalendarCheck, to: '/admin/citas' },
    { k: 'Pendientes', v: c.pending, icon: CalendarClock, to: '/admin/citas', hot: c.pending > 0 },
    { k: 'Ingresos del día', v: money(c.incomeToday), icon: Wallet, to: '/admin/finanzas' },
    { k: 'Clientes', v: c.customers, icon: Users, to: '/admin/clientes' },
  ]
  return (
    <>
      <PageHeader title="Inicio" subtitle="Resumen de tu barbería" actions={<button onClick={() => setDrawer({ new: true })} className="abtn abtn-gold !px-5 !py-3"><Plus size={17} /> Nueva cita</button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ k, v, icon: Icon, to, hot }) => (
          <Link key={k} to={to} className={`card p-5 transition-colors hover:border-champagne/40 ${hot ? '!border-status-pending/40' : ''}`}>
            <Icon size={18} className={hot ? 'text-status-pending' : 'text-champagne'} />
            <p className="mt-5 font-mono text-2xl font-medium sm:text-3xl">{v}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-steel">{k}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5 sm:p-7">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">Próximas citas</h2>
          {data.upcoming.length ? (
            <ul className="space-y-2.5">{data.upcoming.map((a) => <AppointmentRow key={a.id} a={a} showDate onOpen={(x) => setDrawer({ appointment: x })} onQuick={quick} />)}</ul>
          ) : (
            <EmptyState icon={CalendarCheck} title="Aún no hay citas próximas" text="Cuando entren solicitudes de la web o crees citas, aparecerán aquí." action={<button onClick={() => setDrawer({ new: true })} className="abtn abtn-gold">Registrar la primera cita</button>} />
          )}
        </section>
        <section className="card p-5 sm:p-7">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">Ingresos · últimos 7 días</h2>
          {data.hasPayments ? <BarChart series={data.series} /> : <EmptyState icon={Wallet} title="Sin ingresos registrados" text="Los ingresos aparecen cuando completas una cita y registras el cobro." />}
        </section>
      </div>

      <AppointmentDrawer open={Boolean(drawer)} onClose={() => setDrawer(null)} appointment={drawer?.appointment} onChanged={reload} />
      <ConfirmDialog open={Boolean(cancelTarget)} title="¿Cancelar esta cita?" message={cancelTarget ? `Se cancelará la cita de ${cancelTarget.customer?.name}.` : ''} confirmLabel="Cancelar cita" onCancel={() => setCancelTarget(null)} onConfirm={doCancel} />
    </>
  )
}
