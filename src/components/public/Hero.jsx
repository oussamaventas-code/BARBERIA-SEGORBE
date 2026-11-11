import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import { useBusiness } from '../../context/BusinessContext'
import { useIdentity } from '../../context/IdentityContext'
import { IMAGES } from '../../lib/images'
import { hhmm, telLink } from '../../lib/format'
import Img from '../ui/Img'
import Magnetic from '../ui/Magnetic'

function todayHours(hours, tz) {
  const dow = new Date(new Date().toLocaleString('en-US', { timeZone: tz })).getDay()
  const rows = hours.filter((h) => h.weekday === dow)
  if (!rows.length) return null
  if (rows.some((r) => r.is_closed)) return 'Hoy cerrado'
  return `Hoy ${rows.map((r) => `${hhmm(r.opening_time)}–${hhmm(r.closing_time)}`).join(' · ')}`
}

/** Portada de una sola pantalla: lo justo para pedir cita */
export default function Hero() {
  const root = useRef(null)
  const { settings, hours } = useBusiness()
  const { customer, isRegular } = useIdentity()
  const rating = settings.rating ? Number(settings.rating).toLocaleString('es-ES', { minimumFractionDigits: 1 }) : null
  const today = todayHours(hours, settings.timezone)
  const firstName = customer?.name?.split(' ')[0]

  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-hero-item]', { y: 40, autoAlpha: 0, duration: 1.1, stagger: 0.08 })
        .from('[data-hero-image]', { scale: 0.9, x: 60, autoAlpha: 0, duration: 1.5 }, 0.15)
        .from('[data-hero-chip]', { y: 20, autoAlpha: 0, duration: 0.9 }, 0.9)
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} className="relative flex min-h-[100svh] flex-col overflow-hidden bg-obsidian pt-24 sm:pt-28">
      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-4 pb-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10">
        <div className="flex flex-col justify-center">
          <p data-hero-item className="label-mono mb-5 flex items-center gap-3"><span className="h-px w-8 bg-champagne" /> Barbería · Murcia</p>
          <h1 data-hero-item className="text-[clamp(3rem,10vw,5.25rem)] font-semibold leading-[0.92] tracking-tightest text-white">
            Tu estilo.
            <br />
            Nuestra <span className="editorial inline-block pr-2 text-[1.12em] font-normal leading-none tracking-normal text-champagne">firma.</span>
          </h1>
          <p data-hero-item className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
            Un buen corte no es solamente cuestión de imagen. Es cuestión de confianza, detalle y personalidad. Encuentra tu estilo en Barbería Segorbe.
          </p>
          <div data-hero-item className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            <Magnetic><Link to="/reservar" className="btn btn-gold w-full xs:w-auto">{firstName ? `Reservar, ${firstName}` : 'Reservar mi cita'} <ArrowRight size={16} /></Link></Magnetic>
            <Link to="/servicios" className="btn btn-ghost w-full xs:w-auto">Descubrir servicios</Link>
          </div>
          {firstName && <p data-hero-item className="mt-4 text-sm text-white/55">{isRegular ? `Qué bueno verte otra vez, ${firstName}.` : `Te reconocemos en este dispositivo, ${firstName}.`} <Link to="/mis-citas" className="text-champagne underline underline-offset-4">Ver mis citas</Link></p>}
          {rating && settings.review_count ? <p data-hero-item className="mt-8 font-mono text-xs text-white/60 sm:text-[13px]">{rating} ★ · {settings.review_count} reseñas en Google</p> : null}
        </div>

        <div className="relative mx-auto hidden w-full max-w-md sm:block lg:max-w-none">
          <div data-hero-image className="relative">
            <Img src={IMAGES.hero} alt="Barbero realizando un corte de pelo masculino con iluminación cálida" priority
              className="aspect-[4/5] w-full rounded-[2.5rem] shadow-luxe sm:rounded-[3rem] lg:aspect-auto lg:h-[min(56svh,620px)]" imgClassName="contrast-[1.08] saturate-[0.85]" />
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-gradient-to-t from-obsidian/70 via-transparent to-transparent sm:rounded-[3rem]" />
          </div>
          <div data-hero-chip className="absolute -bottom-4 left-4 rounded-3xl border border-champagne/25 bg-obsidian/85 px-5 py-4 backdrop-blur-xl sm:-left-8 sm:bottom-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white">Barbería Segorbe</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-champagne">Murcia · España</p>
          </div>
        </div>
      </div>

      {/* Barra inferior: lo útil de un vistazo */}
      <div className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 font-mono text-[11px] text-white/55 sm:px-6 lg:px-10">
          <span>{settings.address}</span>
          {today && <span>{today}</span>}
          <a href={telLink(settings.phone)} className="text-white/80 hover:text-champagne">{settings.phone}</a>
        </div>
      </div>
    </section>
  )
}
