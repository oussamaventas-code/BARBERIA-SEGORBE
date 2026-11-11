import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Plus, Search, Users } from 'lucide-react'
import { PageHeader, Spinner, EmptyState, useAsync } from '../../components/admin/ui'
import CustomerDrawer from '../../components/admin/CustomerDrawer'
import * as api from '../../lib/api'
import { displayPhone, formatShortDate, money, whatsappLink } from '../../lib/format'

const FILTERS = [['all', 'Todos'], ['recent', 'Con visitas'], ['new', 'Sin visitas'], ['upcoming', 'Con cita próxima']]

export default function Clientes() {
  const { data, loading, reload } = useAsync(api.listCustomers, [])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(false)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase(); const digits = q.replace(/\D/g, '')
    return (data || []).filter((c) => (!s || c.name.toLowerCase().includes(s) || (digits.length >= 3 && c.phone.includes(digits)))
      && (filter === 'all' || (filter === 'recent' && c.visits > 0) || (filter === 'new' && c.visits === 0) || (filter === 'upcoming' && c.next_appointment)))
  }, [data, q, filter])

  return (
    <>
      <PageHeader title="Clientes" subtitle={data ? `${data.length} registrados` : ''} actions={<button onClick={() => setOpen(true)} className="abtn abtn-gold"><Plus size={16} /> Nuevo cliente</button>} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-steel" /><input className="input !pl-11" placeholder="Buscar por nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar clientes" /></div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`shrink-0 rounded-full border px-4 py-2.5 text-sm ${filter === k ? 'border-champagne bg-champagne/10 text-champagne' : 'border-white/10 text-steel'}`}>{l}</button>)}</div>
      </div>

      {loading && !data ? <Spinner /> : list.length ? (
        <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <li key={c.id} className="card flex items-center gap-3 p-4 !rounded-3xl transition-colors hover:border-champagne/40">
              <Link to={`/admin/clientes/${c.id}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">{c.name}{c.regular && <span className="rounded-full bg-champagne/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-champagne">Habitual</span>}{c.has_account && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-steel">Cuenta</span>}</p>
                <p className="font-mono text-xs text-steel">{displayPhone(c.phone)}</p>
                <p className="mt-2 text-[11px] text-steel">{c.visits} visita{c.visits === 1 ? '' : 's'}{c.last_visit ? ` · última ${formatShortDate(c.last_visit)}` : ''} · {money(c.total_spent)}</p>
              </Link>
              <a href={whatsappLink(c.phone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${c.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-champagne hover:bg-champagne/10"><MessageCircle size={16} /></a>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Users} title={data?.length ? 'Ningún cliente coincide' : 'Aún no hay clientes'} text={data?.length ? 'Prueba con otra búsqueda o filtro.' : 'Se crean solos cuando alguien reserva, o puedes añadirlos tú.'} action={!data?.length && <button onClick={() => setOpen(true)} className="abtn abtn-gold">Añadir el primer cliente</button>} />}
      <CustomerDrawer open={open} onClose={() => setOpen(false)} onSaved={reload} />
    </>
  )
}
