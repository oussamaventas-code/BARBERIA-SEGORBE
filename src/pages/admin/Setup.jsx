import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { http } from '../../lib/http'
import { friendlyError } from '../../lib/errors'

/** Primera puesta en marcha: crea las tablas y el usuario propietario. Se bloquea solo al terminar. */
export default function Setup() {
  const [status, setStatus] = useState(null)
  const [f, setF] = useState({ key: '', email: '', password: '', again: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => { http.get('/setup/status').then(setStatus).catch(() => setStatus({ configured: false, done: false, failed: true })) }, [])
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const ok = f.key && f.email && f.password.length >= 10 && f.password === f.again

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try { await http.post('/setup', { key: f.key.trim(), email: f.email.trim(), password: f.password }); setDone(true) } catch (err) { setError(friendlyError(err)) } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center"><span className="editorial text-5xl text-champagne">S</span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.28em]">Barbería Segorbe</p><p className="label-mono mt-2 text-steel">Primera puesta en marcha</p></div>
        <div className="card space-y-5 p-7">
          {!status ? <p className="text-steel">Comprobando…</p>
            : done ? (<><span className="flex h-12 w-12 items-center justify-center rounded-full bg-champagne text-obsidian"><Check size={22} /></span>
                <p className="text-lg font-semibold">¡Listo!</p><p className="text-sm text-steel">La base de datos está preparada y tu usuario creado. Esta pantalla ya queda bloqueada.</p>
                <Link to="/admin/login" className="abtn abtn-gold w-full py-3">Entrar al panel</Link></>)
            : status.done ? (<><p className="text-lg font-semibold">Ya está configurado</p><p className="text-sm text-steel">El propietario ya existe. Entra con tu correo y contraseña.</p>
                <Link to="/admin/login" className="abtn abtn-gold w-full py-3">Ir al acceso</Link></>)
            : !status.configured ? (<><p className="text-lg font-semibold">Falta un paso en Cloudflare</p>
                <p className="text-sm text-steel">En Cloudflare abre el Worker <strong className="text-ivory">barberia-segorbe</strong> → <strong className="text-ivory">Settings → Variables and Secrets → Add</strong>. Tipo <strong className="text-ivory">Secret</strong>, nombre <code className="font-mono text-champagne">SETUP_KEY</code> y como valor una clave larga inventada (20+ caracteres). Guarda, espera a que se despliegue y recarga esta página.</p></>)
            : (<form onSubmit={submit} className="space-y-5">
                {error && <p role="alert" className="rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-3 text-sm text-status-noshow">{error}</p>}
                <div><label className="input-label" htmlFor="s-key">Clave de instalación (SETUP_KEY)</label><input id="s-key" type="password" className="input" value={f.key} onChange={set('key')} autoComplete="off" /></div>
                <div><label className="input-label" htmlFor="s-email">Tu correo (será tu usuario)</label><input id="s-email" type="email" className="input" value={f.email} onChange={set('email')} autoComplete="username" /></div>
                <div><label className="input-label" htmlFor="s-pass">Contraseña (mínimo 10 caracteres)</label><input id="s-pass" type="password" className="input" value={f.password} onChange={set('password')} autoComplete="new-password" /></div>
                <div><label className="input-label" htmlFor="s-again">Repite la contraseña</label><input id="s-again" type="password" className="input" value={f.again} onChange={set('again')} autoComplete="new-password" />
                  {f.again && f.again !== f.password && <p className="mt-1.5 text-xs text-status-noshow">No coinciden.</p>}</div>
                <button disabled={!ok || busy} className="abtn abtn-gold w-full py-3.5">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Crear base de datos y usuario'}</button></form>)}
        </div>
      </div>
    </div>
  )
}
