import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, Loader2, MessageCircle } from 'lucide-react'
import { http } from '../../lib/http'
import { useBusiness } from '../../context/BusinessContext'
import { useIdentity } from '../../context/IdentityContext'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../lib/errors'
import { getTokens } from '../../lib/identity'
import { capitalize, formatDate, formatDuration, formatPrice, isValidPhone, normalizePhone, telLink, whatsappLink } from '../../lib/format'
import SlotPicker from '../../components/public/SlotPicker'

export default function BookingPage() {
  const { services, settings, loading, configured } = useBusiness()
  const { profile, customer, remember, forget, refresh } = useIdentity()
  const { session, signOut } = useAuth()
  const [params] = useSearchParams()
  const [service, setService] = useState(null)
  const [slot, setSlot] = useState(null) // {date, time}
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '', privacy: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const step = !service ? 1 : !slot ? 2 : 3
  const known = Boolean(profile?.name && profile?.phone)

  // Servicio preseleccionado (?servicio=) o único servicio disponible
  useEffect(() => {
    if (service || !services.length) return
    const id = params.get('servicio')
    const found = id && services.find((s) => s.id === id)
    if (found) setService(found)
    else if (services.length === 1) setService(services[0])
  }, [params, services, service])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const formOk = known ? true : form.name.trim().length >= 2 && isValidPhone(form.phone) && form.privacy && (!form.email || /^\S+@\S+\.\S+$/.test(form.email))

  async function submit() {
    setSubmitting(true); setError('')
    const name = known ? profile.name : form.name.trim()
    const phone = known ? profile.phone : normalizePhone(form.phone)
    let data
    try {
      data = await http.post('/bookings', {
        service_id: service.id, date: slot.date, start_time: slot.time, name, phone,
        email: form.email.trim() || null, notes: form.notes.trim() || null, privacy_accepted: known ? true : form.privacy, tokens: getTokens(),
      })
    } catch (e) {
      setSubmitting(false)
      setError(friendlyError(e))
      if (e.code === 'SLOT_TAKEN') setSlot(null) // vuelve a elegir hora
      return
    }
    setSubmitting(false)
    remember([data.customer_token, data.manage_token], { name, phone })
    refresh()
    setResult(data)
  }

  const wa = `Hola, me gustaría pedir cita${service ? ` para ${service.name}` : ''}${slot ? ` el ${formatDate(slot.date)} a las ${slot.time}` : ''}.`

  if (!configured || settings.online_booking_enabled === false) {
    return <Shell title="Pedir cita"><div className="rounded-[2rem] border border-white/[0.07] bg-slate/40 p-8">
      <p className="text-lg text-white">{configured ? 'Ahora mismo no aceptamos reservas por la web.' : 'La reserva online aún no está activa.'}</p>
      <p className="mt-2 text-white/60">Pídenos cita por WhatsApp o por teléfono.</p><Contact settings={settings} text={wa} /></div></Shell>
  }

  if (result) {
    return (
      <Shell title="¡Listo!">
        <div className="rounded-[2rem] border border-champagne/25 bg-slate/40 p-7 sm:p-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-champagne text-obsidian"><Check size={22} /></span>
          <p className="mt-6 text-xl font-semibold text-white">{result.service_name} · {capitalize(formatDate(result.date))} · {result.start_time}</p>
          <p className="mt-3 rounded-2xl border border-status-pending/30 bg-status-pending/10 p-4 text-sm text-white/80"><strong className="text-status-pending">Pendiente de confirmar.</strong> {result.message}</p>
          <p className="mt-6 text-sm text-white/60">Puedes cambiarla o cancelarla cuando quieras en <Link to="/mis-citas" className="text-champagne underline underline-offset-4">Mis citas</Link>. Este dispositivo ya te recuerda: la próxima vez no tendrás que escribir nada.</p>
          {!session && <div className="mt-6 rounded-2xl bg-obsidian/60 p-5"><p className="text-sm text-white">¿Quieres ver tus citas desde cualquier móvil?</p>
            <Link to="/cuenta?crear=1" className="btn btn-ghost btn-sm mt-3">Crear mi cuenta</Link></div>}
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={whatsappLink(settings.whatsapp_phone, `Hola, acabo de pedir cita (${result.service_name}, ${formatDate(result.date)} a las ${result.start_time}). ¿Me la confirmáis?`)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><MessageCircle size={14} /> Avisar por WhatsApp</a>
            <Link to="/" className="btn btn-ghost btn-sm">Volver al inicio</Link>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title="Pedir cita">
      <p className="-mt-6 mb-8 font-mono text-[11px] uppercase tracking-label text-steel">Paso {step} de 3 · {['Servicio', 'Día y hora', 'Confirmar'][step - 1]}</p>
      {error && <p role="alert" className="mb-6 rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-4 text-sm text-status-noshow">{error}</p>}

      {step === 1 && (loading ? <p className="text-steel">Cargando servicios…</p> : services.length === 0 ? <p className="text-white/60">Aún no hay servicios para reservar online. Escríbenos por WhatsApp.</p> : (
        <ul className="space-y-2.5">{services.map((s) => (
          <li key={s.id}><button onClick={() => { setService(s); setError('') }} className="flex w-full items-center justify-between gap-4 rounded-[1.5rem] border border-white/[0.08] bg-slate/40 p-5 text-left transition-colors hover:border-champagne/60">
            <span><span className="block text-lg font-semibold tracking-tight text-white">{s.name}</span>
              <span className="mt-1 flex items-center gap-1.5 font-mono text-xs text-steel"><Clock size={12} /> {formatDuration(s.duration_minutes)}</span></span>
            <span className={`font-mono text-sm ${s.price == null ? 'text-steel' : 'text-champagne'}`}>{formatPrice(s.price)}</span></button></li>))}</ul>))}

      {step === 2 && (<>
        <p className="mb-6 text-white/70"><span className="font-semibold text-white">{service.name}</span> · <button className="text-champagne underline underline-offset-4" onClick={() => setService(null)}>cambiar</button></p>
        <SlotPicker serviceId={service.id} onPick={(date, time) => { setSlot({ date, time }); setError('') }} />
      </>)}

      {step === 3 && (<div className="space-y-6">
        <dl className="divide-y divide-white/[0.07] rounded-[1.5rem] border border-white/[0.07] bg-slate/40 px-5 font-mono text-sm">
          {[['Servicio', service.name], ['Día', capitalize(formatDate(slot.date))], ['Hora', slot.time], ['Precio', formatPrice(service.price)]].map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-steel">{k}</dt><dd className="text-right text-white">{v}</dd></div>)}
        </dl>

        {known ? (
          <div className="rounded-[1.5rem] border border-champagne/25 bg-champagne/5 p-5">
            <p className="text-white">Hola, <strong>{profile.name.split(' ')[0]}</strong>. Reservamos a tu nombre.</p>
            <p className="mt-1 font-mono text-xs text-white/50">{profile.phone}</p>
            <button onClick={() => (session ? signOut().then(forget) : forget())} className="mt-3 text-xs text-steel underline underline-offset-4 hover:text-white">No soy {profile.name.split(' ')[0]}</button>
          </div>
        ) : (<>
          <div><label className="input-label" htmlFor="b-name">Tu nombre</label><input id="b-name" className="input" value={form.name} onChange={set('name')} autoComplete="name" /></div>
          <div><label className="input-label" htmlFor="b-phone">Teléfono</label><input id="b-phone" className="input" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="6XX XX XX XX" />
            {form.phone && !isValidPhone(form.phone) && <p className="mt-1.5 text-xs text-status-noshow">Revisa el teléfono.</p>}
            <p className="mt-1.5 text-xs text-steel">Con él te reconocemos la próxima vez, sin cuenta ni contraseña.</p></div>
          <div><label className="input-label" htmlFor="b-email">Email (opcional)</label><input id="b-email" className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" /></div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70"><input type="checkbox" checked={form.privacy} onChange={set('privacy')} className="mt-1 h-4 w-4 accent-[#C9A84C]" />
            <span>Acepto la <Link to="/privacidad" target="_blank" className="text-champagne underline">política de privacidad</Link>. Usaremos tus datos solo para gestionar tus citas.</span></label>
          <p className="text-sm text-steel">¿Ya tienes cuenta? <Link to="/cuenta" className="text-champagne underline underline-offset-4">Entrar</Link></p>
        </>)}

        <div><label className="input-label" htmlFor="b-notes">Algo que debamos saber (opcional)</label><textarea id="b-notes" className="input min-h-[70px]" maxLength={500} value={form.notes} onChange={set('notes')} /></div>
        <p className="text-sm text-white/55">Tu cita quedará <strong className="text-white">pendiente</strong> hasta que la confirmemos.</p>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={submit} disabled={!formOk || submitting} className="btn btn-gold">{submitting ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : 'Pedir cita'}</button>
          <button onClick={() => setSlot(null)} className="flex items-center gap-2 text-sm text-steel hover:text-white"><ArrowLeft size={14} /> Cambiar hora</button>
        </div>
      </div>)}

      {step < 3 && <div className="mt-14 border-t border-white/[0.07] pt-6"><p className="text-sm text-white/55">¿Prefieres hacerlo por teléfono o WhatsApp?</p><Contact settings={settings} text={wa} /></div>}
    </Shell>
  )
}

function Shell({ title, children }) {
  return <section className="bg-obsidian pb-24 pt-28 sm:pt-36"><div className="mx-auto max-w-2xl px-4 sm:px-6">
    <h1 className="mb-10 text-[clamp(2.2rem,6vw,3.5rem)] font-semibold leading-[1] tracking-tightest text-white">{title}</h1>{children}</div></section>
}
function Contact({ settings, text }) {
  return <div className="mt-4 flex flex-col gap-3 sm:flex-row">
    <a href={whatsappLink(settings.whatsapp_phone, text)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><MessageCircle size={14} /> Reservar por WhatsApp</a>
    <a href={telLink(settings.phone)} className="btn btn-ghost btn-sm">Llamar · {settings.phone}</a></div>
}
