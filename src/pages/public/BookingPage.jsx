import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Clock, Loader2, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../context/BusinessContext'
import { friendlyError } from '../../lib/errors'
import { addDays, capitalize, dowOf, formatDate, formatDuration, formatPrice, hhmm, isValidPhone, normalizePhone, todayISO, whatsappLink, WEEKDAYS_SHORT } from '../../lib/format'
import BookingSteps from '../../components/public/BookingSteps'

const LABELS = ['Servicio', 'Fecha', 'Hora', 'Tus datos', 'Confirmar']

export default function BookingPage() {
  const { services, settings, loading, configured } = useBusiness()
  const [params] = useSearchParams()
  const [step, setStep] = useState(1)
  const [service, setService] = useState(null)
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '', privacy: false })
  const [days, setDays] = useState({}) // iso -> nº de huecos
  const [daysLoading, setDaysLoading] = useState(false)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const tz = settings.timezone
  const today = todayISO(tz)
  const horizon = Math.min(settings.max_advance_days || 60, 60)

  // Servicio preseleccionado desde la URL
  useEffect(() => {
    const id = params.get('servicio')
    if (id && !service && services.length) {
      const found = services.find((s) => s.id === id)
      if (found) { setService(found); setStep(2) }
    }
  }, [params, services, service])

  // Días con disponibilidad
  useEffect(() => {
    if (!service || !configured) return
    let cancelled = false
    setDaysLoading(true)
    supabase.rpc('get_available_days', { p_service_id: service.id, p_from: today, p_to: addDays(today, horizon) }).then(({ data, error: e }) => {
      if (cancelled) return
      if (e) setError(friendlyError(e))
      else setDays(Object.fromEntries((data || []).map((r) => [r.day, r.slots])))
      setDaysLoading(false)
    })
    return () => { cancelled = true }
  }, [service, today, horizon, configured])

  // Huecos del día
  useEffect(() => {
    if (!service || !date) return
    let cancelled = false
    setSlotsLoading(true)
    setSlots([])
    supabase.rpc('get_available_slots', { p_service_id: service.id, p_date: date }).then(({ data, error: e }) => {
      if (cancelled) return
      if (e) setError(friendlyError(e)); else setSlots((data || []).map((r) => hhmm(r.slot_time)))
      setSlotsLoading(false)
    })
    return () => { cancelled = true }
  }, [service, date])

  const calendar = useMemo(() => {
    const list = []
    for (let i = 0; i <= horizon; i++) list.push(addDays(today, i))
    return list
  }, [today, horizon])

  const waText = `Hola, me gustaría reservar${service ? ` ${service.name}` : ' una cita'}${date ? ` el ${formatDate(date)}` : ''}${time ? ` a las ${time}` : ''}. Mi nombre es ${form.name || ''}.`
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const formValid = form.name.trim().length >= 2 && isValidPhone(form.phone) && form.privacy && (!form.email || /^\S+@\S+\.\S+$/.test(form.email))

  async function submit() {
    setSubmitting(true); setError('')
    const { data, error: e } = await supabase.rpc('create_booking', {
      p_service_id: service.id, p_date: date, p_start_time: time, p_name: form.name.trim(),
      p_phone: normalizePhone(form.phone), p_email: form.email.trim() || null, p_notes: form.notes.trim() || null, p_privacy_accepted: form.privacy,
    })
    setSubmitting(false)
    if (e) {
      setError(friendlyError(e))
      if (e.message?.includes('SLOT_TAKEN')) { setTime(null); setStep(3); supabase.rpc('get_available_slots', { p_service_id: service.id, p_date: date }).then(({ data: d }) => setSlots((d || []).map((r) => hhmm(r.slot_time)))) }
      return
    }
    setResult(data)
  }

  const Header = (
    <>
      <p className="label-mono mb-5">Reservar</p>
      <h1 className="mb-10 text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1] tracking-tightest text-white">Reserva tu cita.</h1>
    </>
  )

  // Sin base de datos / reservas desactivadas → canal alternativo honesto
  if (!configured || settings.online_booking_enabled === false) {
    return (
      <Shell>{Header}
        <div className="rounded-[2.5rem] border border-white/[0.07] bg-slate/40 p-8 sm:p-12">
          <p className="text-lg text-white">{configured ? 'La reserva online está desactivada temporalmente.' : 'La reserva online aún no está activa.'}</p>
          <p className="mt-3 text-white/60">Reserva ahora mismo por WhatsApp o por teléfono y te confirmamos la cita.</p>
          <WaButtons settings={settings} text="Hola, me gustaría reservar una cita." />
        </div>
      </Shell>
    )
  }

  if (result) {
    return (
      <Shell>
        <div className="rounded-[2.5rem] border border-champagne/25 bg-slate/40 p-8 sm:p-12">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-champagne text-obsidian"><Check size={26} /></span>
          <h1 className="mt-8 text-3xl font-semibold tracking-tightest text-white sm:text-4xl">Solicitud <span className="editorial font-normal text-champagne">recibida.</span></h1>
          <p className="mt-4 rounded-2xl border border-status-pending/30 bg-status-pending/10 p-4 text-sm text-white/80">
            <strong className="text-status-pending">Cita pendiente de confirmar.</strong> {result.message}
          </p>
          <dl className="mt-8 grid gap-4 font-mono text-sm sm:grid-cols-3">
            <div><dt className="text-[11px] uppercase tracking-label text-steel">Servicio</dt><dd className="mt-1 text-white">{result.service_name}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-label text-steel">Fecha</dt><dd className="mt-1 text-white">{capitalize(formatDate(result.date))}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-label text-steel">Hora</dt><dd className="mt-1 text-white">{result.start_time}</dd></div>
          </dl>
          <p className="mt-8 text-sm text-white/60">Si quieres agilizarlo, puedes avisarnos también por WhatsApp (el mensaje no se envía automáticamente: lo envías tú).</p>
          <WaButtons settings={settings} text={`Hola, acabo de solicitar una cita (${result.service_name}, ${formatDate(result.date)} a las ${result.start_time}) a nombre de ${form.name}. ¿Me la podéis confirmar?`} label="Avisar por WhatsApp" />
          <Link to="/" className="link-lift mt-8 inline-block text-sm font-semibold text-champagne">Volver al inicio</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {Header}
      <BookingSteps step={step} labels={LABELS} />
      {error && <p role="alert" className="mb-6 rounded-2xl border border-status-noshow/40 bg-status-noshow/10 p-4 text-sm text-status-noshow">{error}</p>}

      {step === 1 && (
        loading ? <p className="text-steel">Cargando servicios…</p> :
        services.length === 0 ? <p className="text-white/60">Aún no hay servicios disponibles para reservar online. Escríbenos por WhatsApp.</p> :
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button key={s.id} onClick={() => { setService(s); setDate(null); setTime(null); setError(''); setStep(2) }} className={`rounded-[1.75rem] border p-6 text-left transition-colors hover:border-champagne/50 ${service?.id === s.id ? 'border-champagne bg-champagne/5' : 'border-white/[0.08] bg-slate/40'}`}>
              <p className="text-lg font-semibold tracking-tight text-white">{s.name}</p>
              {s.description && <p className="mt-1.5 line-clamp-2 text-sm text-white/55">{s.description}</p>}
              <p className="mt-4 flex items-center justify-between font-mono text-xs"><span className="flex items-center gap-1.5 text-steel"><Clock size={12} /> {formatDuration(s.duration_minutes)}</span><span className={s.price == null ? 'text-steel' : 'text-champagne'}>{formatPrice(s.price)}</span></p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="mb-4 text-sm text-white/60">Elige el día. Los días sin huecos aparecen deshabilitados.</p>
          {daysLoading ? <p className="text-steel">Consultando disponibilidad…</p> : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-7">
              {calendar.map((iso) => {
                const n = days[iso] || 0
                const ok = n > 0
                return (
                  <button key={iso} disabled={!ok} onClick={() => { setDate(iso); setTime(null); setError(''); setStep(3) }} className={`rounded-2xl border py-3 text-center transition-colors ${date === iso ? 'border-champagne bg-champagne text-obsidian' : ok ? 'border-white/10 text-white hover:border-champagne/60' : 'cursor-not-allowed border-white/[0.04] text-white/20'}`}>
                    <span className="block text-[10px] uppercase tracking-wider opacity-70">{WEEKDAYS_SHORT[dowOf(iso)]}</span>
                    <span className="font-mono text-lg">{iso.slice(8)}</span>
                    <span className="block text-[10px] opacity-60">{formatDate(iso, { month: 'short' })}</span>
                  </button>
                )
              })}
            </div>
          )}
          {!daysLoading && !Object.values(days).some((n) => n > 0) && <p className="mt-6 text-white/60">No hay huecos disponibles próximamente. Escríbenos por WhatsApp.</p>}
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="mb-4 text-sm text-white/60">{date && capitalize(formatDate(date))}</p>
          {slotsLoading ? <p className="text-steel">Cargando horas…</p> : slots.length === 0 ? <p className="text-white/60">No quedan huecos ese día. Elige otro.</p> : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {slots.map((t) => (
                <button key={t} onClick={() => { setTime(t); setError(''); setStep(4) }} className={`rounded-xl border py-3 font-mono text-sm transition-colors ${time === t ? 'border-champagne bg-champagne text-obsidian' : 'border-white/10 text-white hover:border-champagne/60'}`}>{t}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <form onSubmit={(e) => { e.preventDefault(); if (formValid) { setError(''); setStep(5) } }} className="space-y-5" noValidate>
          <div><label className="input-label" htmlFor="b-name">Nombre</label><input id="b-name" className="input" value={form.name} onChange={set('name')} autoComplete="name" required /></div>
          <div><label className="input-label" htmlFor="b-phone">Teléfono</label><input id="b-phone" className="input" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="6XX XX XX XX" required />
            {form.phone && !isValidPhone(form.phone) && <p className="mt-1.5 text-xs text-status-noshow">Introduce un teléfono válido.</p>}</div>
          <div><label className="input-label" htmlFor="b-email">Email (opcional)</label><input id="b-email" className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" /></div>
          <div><label className="input-label" htmlFor="b-notes">Notas (opcional)</label><textarea id="b-notes" className="input min-h-[90px]" maxLength={500} value={form.notes} onChange={set('notes')} /></div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70">
            <input type="checkbox" checked={form.privacy} onChange={set('privacy')} className="mt-1 h-4 w-4 accent-[#C9A84C]" />
            <span>He leído y acepto la <Link to="/privacidad" target="_blank" className="text-champagne underline">política de privacidad</Link>. Tus datos se usarán solo para gestionar tu cita.</span>
          </label>
          <button type="submit" disabled={!formValid} className="btn btn-gold w-full sm:w-auto">Revisar solicitud <ArrowRight size={16} /></button>
        </form>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <dl className="divide-y divide-white/[0.07] rounded-[2rem] border border-white/[0.07] bg-slate/40 px-6 font-mono text-sm">
            {[['Servicio', service.name], ['Fecha', capitalize(formatDate(date))], ['Hora', time], ['Precio', formatPrice(service.price)], ['Nombre', form.name], ['Teléfono', form.phone]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3.5"><dt className="text-steel">{k}</dt><dd className="text-right text-white">{v}</dd></div>
            ))}
          </dl>
          <p className="text-sm text-white/60">Al enviar, tu cita quedará <strong className="text-white">pendiente de confirmación</strong> hasta que la barbería la confirme.</p>
          <button onClick={submit} disabled={submitting} className="btn btn-gold w-full sm:w-auto">{submitting ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : 'Enviar solicitud'}</button>
        </div>
      )}

      {step > 1 && (
        <button onClick={() => { setError(''); setStep(step - 1) }} className="mt-8 flex items-center gap-2 text-sm text-steel hover:text-white"><ArrowLeft size={14} /> Atrás</button>
      )}

      <div className="mt-14 border-t border-white/[0.07] pt-8">
        <p className="mb-4 text-sm text-white/60">¿Prefieres hacerlo por WhatsApp?</p>
        <WaButtons settings={settings} text={waText} />
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return <section className="bg-obsidian pb-24 pt-32 sm:pt-40"><div className="mx-auto max-w-3xl px-4 sm:px-6">{children}</div></section>
}

function WaButtons({ settings, text, label = 'Reservar por WhatsApp' }) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <a href={whatsappLink(settings.whatsapp_phone, text)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><MessageCircle size={16} /> {label}</a>
      <a href={`tel:+${normalizePhone(settings.phone)}`} className="btn btn-ghost">Llamar · {settings.phone}</a>
    </div>
  )
}
