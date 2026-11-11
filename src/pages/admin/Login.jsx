import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../lib/errors'

export default function Login() {
  const { signIn, signOut, session, isStaff, loading } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!loading && session && isStaff) return <Navigate to="/admin" replace />
  const denied = params.get('denied') && session && !isStaff

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error: err } = await signIn(email.trim(), password)
    setBusy(false)
    if (err) setError(friendlyError(err)); else navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="editorial text-5xl text-champagne">S</span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.28em]">Barbería Segorbe</p>
          <p className="label-mono mt-2 text-steel">Panel privado</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-5 p-7">
          {denied && (
            <p role="alert" className="rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-3 text-sm text-status-noshow">
              Esta cuenta no tiene acceso al panel. <button type="button" onClick={signOut} className="underline">Cerrar sesión</button>
            </p>
          )}
          <div><label className="input-label" htmlFor="email">Email</label><input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></div>
          <div><label className="input-label" htmlFor="password">Contraseña</label><input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></div>
          {error && <p role="alert" className="text-sm text-status-noshow">{error}</p>}
          <button type="submit" disabled={busy} className="abtn abtn-gold w-full py-3.5">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Entrar'}</button>
        </form>
        <a href="/" className="mt-6 block text-center text-xs text-steel hover:text-ivory">← Volver a la web</a>
      </div>
    </div>
  )
}
