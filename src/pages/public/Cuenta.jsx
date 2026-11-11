import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { http } from '../../lib/http'
import { useAuth } from '../../context/AuthContext'
import { useIdentity } from '../../context/IdentityContext'
import { friendlyError } from '../../lib/errors'
import { clearPending, getPending, getProfile, getTokens, setPending } from '../../lib/identity'
import { isValidPhone, normalizePhone } from '../../lib/format'

/** Entrar / crear cuenta. La cuenta se vincula al historial del dispositivo si lo hay. */
export default function Cuenta() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { session, loading: authLoading, signIn, signUp } = useAuth()
  const { customer, loading: idLoading, apply } = useIdentity()
  const [mode, setMode] = useState(params.get('crear') ? 'signup' : 'login')
  const prof = getProfile()
  const [f, setF] = useState({ email: '', password: '', name: prof?.name || '', phone: prof?.phone || '', privacy: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  // Si ya reservó desde este dispositivo, el historial se vincula solo con ese token: no necesita escribir el teléfono.
  const hasDevice = getTokens().length > 0

  async function claim(name, phone, privacy) {
    try {
      apply(await http.post('/my/claim', { name, phone, privacy_accepted: privacy, tokens: getTokens() }))
      clearPending(); return true
    } catch (e) { setError(friendlyError(e)); return false }
  }

  // Sesión iniciada pero aún sin ficha de cliente: vincúlala (datos pendientes o del dispositivo)
  useEffect(() => {
    if (!session || customer || idLoading) return
    const pend = getPending()
    if (pend) claim(pend.name, pend.phone, true)
    else if (hasDevice) claim(prof?.name || '', prof?.phone || '', true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, customer, idLoading])

  if (!authLoading && session && customer) return <Navigate to="/mis-citas" replace />

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(f.email.trim(), f.password)
        if (err) throw err
      } else {
        if (!hasDevice) setPending({ name: f.name.trim(), phone: normalizePhone(f.phone) })
        const { data, error: err } = await signUp(f.email.trim(), f.password)
        if (err) throw err
        if (!data.session) setNotice('Te hemos enviado un email. Confírmalo y vuelve a entrar para terminar.')
        else if (!hasDevice) await claim(f.name.trim(), normalizePhone(f.phone), f.privacy)
      }
    } catch (err) { setError(friendlyError(err)) } finally { setBusy(false) }
  }

  // Sesión sin ficha y sin datos: pedir nombre y teléfono
  if (session && !customer && !idLoading && !hasDevice && !getPending()) {
    return (
      <Shell title="Un último paso">
        <form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); if (await claim(f.name.trim(), normalizePhone(f.phone), f.privacy)) navigate('/mis-citas'); setBusy(false) }}>
          {error && <p role="alert" className="text-sm text-status-noshow">{error}</p>}
          <Fields f={f} set={set} />
          <button disabled={busy || !(f.name.trim().length >= 2 && isValidPhone(f.phone) && f.privacy)} className="btn btn-gold">{busy ? <Loader2 className="animate-spin" size={16} /> : 'Continuar'}</button>
        </form>
      </Shell>
    )
  }

  const signupOk = f.email && f.password.length >= 8 && (hasDevice || (f.name.trim().length >= 2 && isValidPhone(f.phone))) && f.privacy
  return (
    <Shell title={mode === 'login' ? 'Entrar' : 'Crear cuenta'}>
      <p className="-mt-6 mb-8 text-white/60">{mode === 'login' ? 'Para ver y gestionar tus citas desde cualquier móvil.' : hasDevice ? 'Vinculamos a tu cuenta las citas que ya has pedido desde este dispositivo.' : 'Guarda tu nombre y teléfono y gestiona tus citas desde cualquier móvil.'} No hace falta cuenta para pedir cita.</p>
      <form onSubmit={submit} className="space-y-5">
        {error && <p role="alert" className="rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-3 text-sm text-status-noshow">{error}</p>}
        {notice && <p role="status" className="rounded-2xl border border-champagne/30 bg-champagne/10 p-3 text-sm text-white/80">{notice}</p>}
        {mode === 'signup' && !hasDevice && <Fields f={f} set={set} withPrivacy={false} />}
        <div><label className="input-label" htmlFor="c-email">Email</label><input id="c-email" type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" required /></div>
        <div><label className="input-label" htmlFor="c-pass">Contraseña</label><input id="c-pass" type="password" className="input" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required />
          {mode === 'signup' && <p className="mt-1.5 text-xs text-steel">Mínimo 8 caracteres.</p>}</div>
        {mode === 'signup' && <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70"><input type="checkbox" checked={f.privacy} onChange={set('privacy')} className="mt-1 h-4 w-4 accent-[#C9A84C]" />
          <span>Acepto la <Link to="/privacidad" target="_blank" className="text-champagne underline">política de privacidad</Link>.</span></label>}
        <button disabled={busy || (mode === 'signup' && !signupOk)} className="btn btn-gold">{busy ? <Loader2 className="animate-spin" size={16} /> : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
      <p className="mt-8 text-sm text-steel">{mode === 'login' ? '¿Primera vez? ' : '¿Ya tienes cuenta? '}
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} className="text-champagne underline underline-offset-4">{mode === 'login' ? 'Crear cuenta' : 'Entrar'}</button></p>
    </Shell>
  )
}

function Fields({ f, set, withPrivacy = true }) {
  return <>
    <div><label className="input-label" htmlFor="c-name">Tu nombre</label><input id="c-name" className="input" value={f.name} onChange={set('name')} autoComplete="name" /></div>
    <div><label className="input-label" htmlFor="c-phone">Teléfono</label><input id="c-phone" type="tel" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" /></div>
    {withPrivacy && <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70"><input type="checkbox" checked={f.privacy} onChange={set('privacy')} className="mt-1 h-4 w-4 accent-[#C9A84C]" /><span>Acepto la <Link to="/privacidad" target="_blank" className="text-champagne underline">política de privacidad</Link>.</span></label>}
  </>
}

function Shell({ title, children }) {
  return <section className="bg-obsidian pb-24 pt-28 sm:pt-36"><div className="mx-auto max-w-md px-4 sm:px-6">
    <h1 className="mb-10 text-[clamp(2.2rem,6vw,3.25rem)] font-semibold leading-[1] tracking-tightest text-white">{title}</h1>{children}</div></section>
}
