import { useMemo, useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { ConfirmDialog, Drawer, EmptyState, Field, PageHeader, Spinner, useAsync, useToast } from '../../components/admin/ui'
import BarChart from '../../components/admin/BarChart'
import * as api from '../../lib/api'
import { friendlyError } from '../../lib/errors'
import { useBusiness } from '../../context/BusinessContext'
import { addDays, endOfMonth, formatShortDate, money, PAYMENT_METHODS, startOfMonth, todayISO, formatDate } from '../../lib/format'

const CATEGORIES = ['Productos', 'Alquiler', 'Suministros', 'Material', 'Nóminas', 'Impuestos', 'Marketing', 'Otros']

export default function Finanzas() {
  const { settings } = useBusiness()
  const toast = useToast()
  const today = todayISO(settings.timezone)
  const [from, setFrom] = useState(startOfMonth(today))
  const [to, setTo] = useState(endOfMonth(today))
  const [tab, setTab] = useState('income')
  const [drawer, setDrawer] = useState(null) // 'income' | 'expense'
  const [form, setForm] = useState({})
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const { data, loading, reload } = useAsync(async () => {
    const [pays, exps, customers, services, todayPays] = await Promise.all([api.listPayments(from, to), api.listExpenses(from, to), api.listCustomers(), api.listAllServices(), api.listPayments(today, today)])
    return { pays, exps, customers, services, incomeToday: todayPays.reduce((s, p) => s + Number(p.amount), 0) }
  }, [from, to])

  const totals = useMemo(() => {
    const income = (data?.pays || []).reduce((s, p) => s + Number(p.amount), 0)
    const expenses = (data?.exps || []).reduce((s, e) => s + Number(e.amount), 0)
    return { income, expenses, balance: income - expenses }
  }, [data])

  const series = useMemo(() => {
    if (!data) return []
    const days = []; for (let d = from; d <= to && days.length < 62; d = addDays(d, 1)) days.push(d)
    const monthly = days.length > 31
    const key = (iso) => (monthly ? iso.slice(0, 7) : iso)
    const buckets = new Map()
    days.forEach((d) => buckets.set(key(d), { label: monthly ? key(d).slice(5) : String(Number(d.slice(8))), a: 0, b: 0 }))
    data.pays.forEach((p) => { const b = buckets.get(key(p.payment_date)); if (b) b.a += Number(p.amount) })
    data.exps.forEach((e) => { const b = buckets.get(key(e.expense_date)); if (b) b.b += Number(e.amount) })
    return [...buckets.values()]
  }, [data, from, to])

  const openForm = (kind) => { setError(''); setForm(kind === 'income' ? { payment_date: today, payment_method: 'cash', amount: '', customer_id: '', service_id: '', concept: '' } : { expense_date: today, category: 'Otros', amount: '', concept: '', notes: '' }); setDrawer(kind) }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    setBusy(true); setError('')
    try {
      if (drawer === 'income') await api.registerPayment({ ...form, amount: Number(form.amount), customer_id: form.customer_id || null, service_id: form.service_id || null })
      else await api.saveExpense({ ...form, amount: Number(form.amount) })
      toast.success(drawer === 'income' ? 'Ingreso registrado' : 'Gasto registrado'); setDrawer(null); reload()
    } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }

  const quickRange = (k) => {
    if (k === 'month') { setFrom(startOfMonth(today)); setTo(endOfMonth(today)) }
    if (k === 'prev') { const p = addDays(startOfMonth(today), -1); setFrom(startOfMonth(p)); setTo(endOfMonth(p)) }
    if (k === 'year') { setFrom(`${today.slice(0, 4)}-01-01`); setTo(`${today.slice(0, 4)}-12-31`) }
  }

  const cards = [
    { k: 'Ingresos de hoy', v: data ? money(data.incomeToday) : '—' },
    { k: 'Ingresos del periodo', v: money(totals.income) },
    { k: 'Gastos del periodo', v: money(totals.expenses) },
    { k: 'Balance', v: money(totals.balance), tone: totals.balance < 0 ? 'text-status-noshow' : 'text-status-completed' },
  ]

  return (
    <>
      <PageHeader title="Finanzas" subtitle="Control interno de ingresos y gastos" actions={<>
        <button onClick={() => openForm('expense')} className="abtn abtn-ghost"><Plus size={15} /> Gasto</button>
        <button onClick={() => openForm('income')} className="abtn abtn-gold"><Plus size={15} /> Ingreso</button></>} />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Desde"><input type="date" className="input !py-2.5" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Hasta"><input type="date" className="input !py-2.5" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
        <div className="flex gap-1.5">{[['month', 'Este mes'], ['prev', 'Mes anterior'], ['year', 'Este año']].map(([k, l]) => <button key={k} onClick={() => quickRange(k)} className="rounded-full border border-white/10 px-3.5 py-2.5 text-xs text-steel hover:text-champagne">{l}</button>)}</div>
      </div>

      {loading && !data ? <Spinner /> : (<>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map((c) => <div key={c.k} className="card p-5"><p className={`font-mono text-xl font-medium sm:text-2xl ${c.tone || ''}`}>{c.v}</p><p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-steel">{c.k}</p></div>)}</div>

        <section className="card mt-6 p-5 sm:p-7"><h2 className="mb-5 text-lg font-semibold">Ingresos y gastos</h2>
          {totals.income || totals.expenses ? <BarChart series={series} /> : <EmptyState icon={Wallet} title="Sin movimientos en este periodo" text="Registra un ingreso o un gasto, o completa citas cobrando desde el calendario." />}</section>

        <div className="mb-4 mt-8 inline-flex rounded-full border border-white/10 p-1">{[['income', 'Ingresos'], ['expense', 'Gastos']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-5 py-2 text-sm font-medium ${tab === k ? 'bg-champagne text-obsidian' : 'text-steel'}`}>{l}</button>)}</div>
        <ul className="space-y-2">
          {tab === 'income' ? data.pays.map((p) => (
            <li key={p.id} className="card flex items-center gap-3 !rounded-3xl p-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.service?.name || p.concept || 'Ingreso'}{p.customer?.name ? ` · ${p.customer.name}` : ''}</p><p className="font-mono text-xs text-steel">{formatShortDate(p.payment_date)} · {PAYMENT_METHODS[p.payment_method]}</p></div><p className="font-mono text-status-completed">+{money(p.amount)}</p>
              <button onClick={() => setDel({ kind: 'income', id: p.id })} aria-label="Eliminar" className="text-steel hover:text-status-noshow"><Trash2 size={15} /></button></li>
          )) : data.exps.map((e) => (
            <li key={e.id} className="card flex items-center gap-3 !rounded-3xl p-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e.concept}</p><p className="font-mono text-xs text-steel">{formatShortDate(e.expense_date)} · {e.category}</p></div><p className="font-mono text-status-noshow">−{money(e.amount)}</p>
              <button onClick={() => setDel({ kind: 'expense', id: e.id })} aria-label="Eliminar" className="text-steel hover:text-status-noshow"><Trash2 size={15} /></button></li>
          ))}
          {(tab === 'income' ? data.pays : data.exps).length === 0 && <EmptyState title={tab === 'income' ? 'Sin ingresos en este periodo' : 'Sin gastos en este periodo'} />}
        </ul>
        <p className="mt-8 text-xs text-steel">Herramienta de gestión interna. No sustituye a un programa de contabilidad ni de facturación certificada.</p>
      </>)}

      <Drawer open={Boolean(drawer)} onClose={() => setDrawer(null)} title={drawer === 'income' ? 'Registrar ingreso' : 'Registrar gasto'}>
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-3 text-sm text-status-noshow">{error}</p>}
          {drawer === 'income' ? <>
            <Field label="Cliente (opcional)"><select className="input" value={form.customer_id} onChange={set('customer_id')}><option value="">—</option>{data?.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Servicio (opcional)"><select className="input" value={form.service_id} onChange={(e) => { const s = data.services.find((x) => x.id === e.target.value); setForm((f) => ({ ...f, service_id: e.target.value, amount: f.amount || s?.price || '' })) }}><option value="">—</option>{data?.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Importe (€)"><input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} /></Field>
              <Field label="Método"><select className="input" value={form.payment_method} onChange={set('payment_method')}>{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
            <Field label="Fecha"><input className="input" type="date" value={form.payment_date} onChange={set('payment_date')} /></Field>
            <Field label="Concepto (opcional)"><input className="input" value={form.concept} onChange={set('concept')} /></Field>
          </> : <>
            <Field label="Concepto"><input className="input" value={form.concept} onChange={set('concept')} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Importe (€)"><input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} /></Field>
              <Field label="Categoría"><select className="input" value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field></div>
            <Field label="Fecha"><input className="input" type="date" value={form.expense_date} onChange={set('expense_date')} /></Field>
            <Field label="Notas"><textarea className="input" value={form.notes} onChange={set('notes')} /></Field>
          </>}
          <button disabled={busy || !(Number(form.amount) > 0) || (drawer === 'expense' && (form.concept || '').trim().length < 2)} onClick={save} className="abtn abtn-gold w-full py-3">Guardar</button>
        </div>
      </Drawer>
      <ConfirmDialog open={Boolean(del)} title="¿Eliminar registro?" message="Se borrará este movimiento de las cuentas. No se puede deshacer." onCancel={() => setDel(null)}
        onConfirm={async () => { try { await (del.kind === 'income' ? api.deletePayment(del.id) : api.deleteExpense(del.id)); toast.success('Registro eliminado'); reload() } catch (e) { toast.error(friendlyError(e)) } setDel(null) }} />
    </>
  )
}
