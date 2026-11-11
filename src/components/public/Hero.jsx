import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Star, ArrowRight } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import { useBusiness } from '../../context/BusinessContext'
import { IMAGES } from '../../lib/images'
import Img from '../ui/Img'
import Magnetic from '../ui/Magnetic'

export default function Hero() {
  const root = useRef(null)
  const { settings } = useBusiness()
  const rating = settings.rating ? Number(settings.rating).toLocaleString('es-ES', { minimumFractionDigits: 1 }) : null

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
    <section ref={root} className="relative overflow-hidden bg-obsidian pb-16 pt-28 sm:pt-32 lg:flex lg:min-h-[100svh] lg:items-center lg:pb-12">
      {/* Luz lateral cálida */}
      <div aria-hidden className="pointer-events-none absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full bg-champagne/[0.07] blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10">
        <div className="flex flex-col justify-center">
          <p data-hero-item className="label-mono mb-6 flex items-center gap-3">
            <span className="h-px w-8 bg-champagne" /> Barbería · Murcia
          </p>

          <h1 data-hero-item className="text-[clamp(3rem,10vw,5.25rem)] font-semibold leading-[0.92] tracking-tightest text-white">
            Tu estilo.
            <br />
            Nuestra{' '}
            <span className="editorial inline-block pr-2 text-[1.12em] font-normal leading-none tracking-normal text-champagne">firma.</span>
          </h1>

          <p data-hero-item className="mt-7 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
            Un buen corte no es solamente cuestión de imagen. Es cuestión de confianza, detalle y personalidad. Encuentra tu estilo en Barbería Segorbe.
          </p>

          <div data-hero-item className="mt-9 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            <Magnetic>
              <Link to="/reservar" className="btn btn-gold w-full xs:w-auto">
                Reservar mi cita <ArrowRight size={16} />
              </Link>
            </Magnetic>
            <Link to="/servicios" className="btn btn-ghost w-full xs:w-auto">
              Descubrir servicios
            </Link>
          </div>

          {rating && settings.review_count ? (
            <p data-hero-item className="mt-9 flex items-center gap-3 font-mono text-xs text-white/60 sm:text-[13px]">
              <span className="flex text-champagne" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} fill="currentColor" strokeWidth={0} />)}
              </span>
              {rating} ★ · {settings.review_count} reseñas en Google
            </p>
          ) : null}
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div data-hero-image className="relative">
            <Img
              src={IMAGES.hero}
              alt="Barbero realizando un corte de pelo masculino con iluminación cálida"
              priority
              className="aspect-[4/5] w-full rounded-[2.5rem] shadow-luxe sm:rounded-[3rem] lg:aspect-[4/5] lg:max-h-[78svh]"
              imgClassName="contrast-[1.08] saturate-[0.85]"
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-gradient-to-t from-obsidian/70 via-transparent to-transparent sm:rounded-[3rem]" />
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/10 sm:rounded-[3rem]" />
          </div>

          <div
            data-hero-chip
            className="absolute -bottom-5 left-4 rounded-3xl border border-champagne/25 bg-obsidian/85 px-5 py-4 backdrop-blur-xl sm:-left-8 sm:bottom-10"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white">Barbería Segorbe</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-champagne">Murcia · España</p>
          </div>
        </div>
      </div>
    </section>
  )
}
