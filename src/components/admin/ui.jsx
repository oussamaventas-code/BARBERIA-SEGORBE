import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react'
import { STATUS } from '../../lib/format'

/* ---------- Toasts ---------- */
const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((type, text) => {
    const id = crypto.randomUUID()
    setItems((i) => [...i, { id, type, text }])
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3500)
  }, [])
  const api = useMemo(() => ({ success: (t) => push('success', t), error: (t) => push('error', t) }), [push])
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-24 z-[100] flex flex-col items-center gap-2 lg:bottom-6 lg:items-end lg:pr-3" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-luxe backdrop-blur ${t.type === 'error' ? 'border-status-noshow/40 bg-obsidian/95 text-status-noshow' : 'border-champagne/30 bg-obsidian/95 text-ivory'}`}>
            {t.type === 'error' ? <XCircle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-status-completed" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------- Estado de cita ---------- */
export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${s.ring} ${s.soft} ${s.text}`}><span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />{s.label}</span>
}

/* ---------- Drawer / Modal ---------- */
export function Drawer({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute bottom-0 right-0 flex max-h-[94svh] w-full flex-col rounded-t-[2rem] border border-white/10 bg-slate shadow-luxe sm:inset-y-0 sm:max-h-none sm:rounded-none sm:rounded-l-[2rem] ${wide ? 'sm:w-[560px]' : 'sm:w-[460px]'}`}>
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 pb-safe">{children}</div>
      </div>
    </div>
  )
}

/* ---------- Confirmación de acciones destructivas ---------- */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel, busy }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-[2rem] border border-white/10 bg-slate p-7 shadow-luxe">
        <AlertTriangle className="text-status-noshow" size={26} />
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-steel">{message}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="abtn abtn-ghost flex-1">Cancelar</button>
          <button onClick={onConfirm} disabled={busy} className="abtn flex-1 bg-status-noshow text-obsidian hover:opacity-90">{busy ? <Loader2 size={15} className="animate-spin" /> : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Pequeños bloques ---------- */
export function Spinner({ label = 'Cargando' }) {
  return <div className="flex items-center justify-center gap-3 py-16 text-steel" role="status"><Loader2 className="animate-spin" size={18} /> {label}…</div>
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-[2rem] border border-dashed border-white/10 px-6 py-14 text-center">
      {Icon && <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-champagne/10 text-champagne"><Icon size={24} /></span>}
      <p className="text-lg font-semibold">{title}</p>
      {text && <p className="mt-2 max-w-sm text-sm text-steel">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Field({ label, children, hint }) {
  return <label className="block"><span className="input-label">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-steel">{hint}</span>}</label>
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tighter sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-steel">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Hook genérico de carga con recarga manual */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await fnRef.current()
      setState({ data, loading: false, error: null })
    } catch (e) {
      setState({ data: null, loading: false, error: e })
    }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, deps)
  return { ...state, reload: run }
}
