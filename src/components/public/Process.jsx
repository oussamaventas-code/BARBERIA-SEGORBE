import { useEffect, useRef } from 'react'
import { Scissors, CalendarCheck, Sparkles } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'

const STEPS = [
  { n: '01', icon: Scissors, title: 'Elige tu servicio', text: 'Descubre los servicios disponibles y encuentra el que necesitas.' },
  { n: '02', icon: CalendarCheck, title: 'Reserva tu cita', text: 'Selecciona el horario disponible y solicita tu reserva.' },
  { n: '03', icon: Sparkles, title: 'Ven y disfruta', text: 'Acércate a Barbería Segorbe y disfruta de tu experiencia.' },
]

export default function Process() {
  const root = useRef(null)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-step]', {
        y: 50, autoAlpha: 0, duration: 1, stagger: 0.15,
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} className="bg-obsidian py-24 sm:py-32" aria-labelledby="process-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mb-14 max-w-2xl">
          <p className="label-mono mb-5">Cómo funciona</p>
          <h2 id="process-title" className="text-[clamp(2.2rem,5.5vw,4rem)] font-semibold leading-[1] tracking-tightest text-white">
            Tres pasos. <span className="editorial font-normal tracking-normal text-champagne">Nada más.</span>
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ n, icon: Icon, title, text }) => (
            <li key={n} data-step className="group relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-slate/40 p-7 transition-colors duration-500 hover:border-champagne/30 sm:p-9">
              <div className="flex items-start justify-between">
                <span className="editorial text-6xl font-normal leading-none text-champagne sm:text-7xl">{n}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-champagne"><Icon size={19} /></span>
              </div>
              <h3 className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-white">{title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/60">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
