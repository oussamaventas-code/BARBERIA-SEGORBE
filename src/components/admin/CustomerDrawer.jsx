import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Drawer, Field, useToast } from './ui'
import * as api from '../../lib/api'
import { friendlyError } from '../../lib/errors'
import { isValidPhone } from '../../lib/format'

export default function CustomerDrawer({ open, onClose, customer, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setF(customer ? { ...customer } : { name: '', phone: '', email: '', notes: '' }); setError('') } }, [open, customer])
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const valid = (f.name || '').trim().length >= 2 && isValidPhone(f.phone || '')

  async function save() {
    setBusy(true); setError('')
    try { const saved = await api.saveCustomer(f); toast.success(customer ? 'Cliente actualizado' : 'Cliente creado'); onSaved?.(saved); onClose() }
    catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }
  return (
    <Drawer open={open} onClose={onClose} title={customer ? 'Editar cliente' : 'Nuevo cliente'}>
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-3 text-sm text-status-noshow">{error}</p>}
        <Field label="Nombre"><input className="input" value={f.name || ''} onChange={set('name')} /></Field>
        <Field label="Teléfono" hint="No puede repetirse: cada teléfono es un cliente."><input className="input" type="tel" value={f.phone || ''} onChange={set('phone')} /></Field>
        <Field label="Email (opcional)"><input className="input" type="email" value={f.email || ''} onChange={set('email')} /></Field>
        <Field label="Notas internas"><textarea className="input min-h-[100px]" value={f.notes || ''} onChange={set('notes')} placeholder="Preferencias, tipo de corte, alergias…" /></Field>
        <button disabled={!valid || busy} onClick={save} className="abtn abtn-gold w-full py-3">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}</button>
      </div>
    </Drawer>
  )
}
