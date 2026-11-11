import { useState } from 'react'
import { Loader2, Pencil, Plus, Scissors, Trash2 } from 'lucide-react'
import { ConfirmDialog, Drawer, EmptyState, Field, PageHeader, Spinner, useAsync, useToast } from '../../components/admin/ui'
import * as api from '../../lib/api'
import { friendlyError } from '../../lib/errors'
import { formatDuration, formatPrice } from '../../lib/format'

const EMPTY = { name: '', description: '', price: '', duration_minutes: '', image_url: '', active: true, sort_order: 0 }

export default function Servicios() {
  const toast = useToast()
  const { data, loading, reload } = useAsync(api.listAllServices, [])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setEdit((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function save() {
    setBusy(true); setError('')
    try { await api.saveService(edit); toast.success('Servicio guardado'); setEdit(null); reload() } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }
  async function toggle(s) { try { await api.saveService({ ...s, active: !s.active }); toast.success(s.active ? 'Servicio desactivado' : 'Servicio activado'); reload() } catch (e) { toast.error(friendlyError(e)) } }

  return (
    <>
      <PageHeader title="Servicios" subtitle="Lo que cambies aquí se refleja en la web pública" actions={<button onClick={() => { setError(''); setEdit({ ...EMPTY, sort_order: (data?.length || 0) + 1 }) }} className="abtn abtn-gold"><Plus size={16} /> Nuevo servicio</button>} />
      {loading && !data ? <Spinner /> : data?.length ? (
        <ul className="space-y-2.5">
          {data.map((s) => (
            <li key={s.id} className={`card flex flex-wrap items-center gap-4 !rounded-3xl p-5 ${s.active ? '' : 'opacity-60'}`}>
              <div className="min-w-0 flex-1"><p className="font-medium">{s.name} {!s.active && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-steel">Inactivo</span>}</p>
                {s.description && <p className="mt-1 line-clamp-1 text-sm text-steel">{s.description}</p>}</div>
              <p className="font-mono text-sm text-champagne">{formatPrice(s.price)}</p>
              <p className="w-24 font-mono text-xs text-steel">{formatDuration(s.duration_minutes)}</p>
              <div className="flex gap-1.5">
                <button onClick={() => toggle(s)} className="abtn abtn-ghost !py-2">{s.active ? 'Desactivar' : 'Activar'}</button>
                <button onClick={() => { setError(''); setEdit({ ...s, price: s.price ?? '', duration_minutes: s.duration_minutes ?? '' }) }} aria-label="Editar" className="abtn abtn-ghost !p-2.5"><Pencil size={15} /></button>
                <button onClick={() => setDel(s)} aria-label="Eliminar" className="abtn abtn-danger !p-2.5"><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Scissors} title="Aún no hay servicios" text="Crea tu primer servicio para que aparezca en la web y se pueda reservar." />}

      <Drawer open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? 'Editar servicio' : 'Nuevo servicio'}>
        {edit && <div className="space-y-4">
          {error && <p role="alert" className="rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-3 text-sm text-status-noshow">{error}</p>}
          <Field label="Nombre"><input className="input" value={edit.name} onChange={set('name')} /></Field>
          <Field label="Descripción"><textarea className="input min-h-[90px]" value={edit.description || ''} onChange={set('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio (€)" hint="Vacío = «Consultar precio»"><input className="input" type="number" min="0" step="0.01" value={edit.price} onChange={set('price')} /></Field>
            <Field label="Duración (min)" hint="Vacío = usa la duración por defecto"><input className="input" type="number" min="5" max="480" step="5" value={edit.duration_minutes} onChange={set('duration_minutes')} /></Field>
          </div>
          <Field label="Imagen (URL, opcional)"><input className="input" type="url" value={edit.image_url || ''} onChange={set('image_url')} placeholder="https://…" /></Field>
          <Field label="Orden"><input className="input" type="number" value={edit.sort_order} onChange={set('sort_order')} /></Field>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#C9A84C]" checked={edit.active} onChange={set('active')} /> Activo (visible y reservable en la web)</label>
          <button disabled={busy || edit.name.trim().length < 2} onClick={save} className="abtn abtn-gold w-full py-3">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}</button>
        </div>}
      </Drawer>
      <ConfirmDialog open={Boolean(del)} title="¿Eliminar servicio?" message="Si tiene citas asociadas no se podrá eliminar: en ese caso desactívalo para conservar el historial." onCancel={() => setDel(null)}
        onConfirm={async () => { try { await api.deleteService(del.id); toast.success('Servicio eliminado'); reload() } catch (e) { toast.error(friendlyError(e)) } setDel(null) }} />
    </>
  )
}
