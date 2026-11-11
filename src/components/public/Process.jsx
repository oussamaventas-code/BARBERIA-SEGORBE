import { useEffect, useRef } from 'react'
import { Scissors, CalendarCheck, Sparkles } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'

const STEPS = [
  { n: '01', icon: Scissors, title: 'Elige tu servicio', text: 'Descubre los servicios disponibles y encuentra el que necesitas.' },
  { n: '02', icon: CalendarCheck, title: 'Reserva tu cita', text: 'Selecciona el horario disponible y solicita tu reserva.' },
  { n: '03', icon: Sparkles, title: 'Ven y disfruta', text: 'Acércate a Barbería Segorbe y disfruta de tu experiencia.' },
]
// Desfase vertical: rompe la rejilla de tres iguales
const OFFSET = ['md:mt-0', 'md:mt-14', 'md:mt-28']

export default function Process() {
  const root = useRef(null)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-step]', { y: 50, autoAlpha: 0, duration: 1, stagger: 0.15, scrollTrigger: { trigger: root.current, start: 'top 75%', once: true } })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} className="bg-[#101016] py-24 sm:py-32" aria-labelledby="process-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <p className="mb-6 flex items-center gap-4 font-mono text-[11px] uppercase tracking-label text-steel"><span className="text-champagne">03</span><span className="h-px w-10 bg-white/20" />Cómo funciona</p>
        <h2 id="process-title" className="mb-16 max-w-md text-[clamp(2rem,4.6vw,3.25rem)] font-semibold leading-[1.02] tracking-tightest text-white">De la web a la silla, sin complicaciones.</h2>
        <ol className="grid gap-12 md:grid-cols-3 md:gap-8 md:pb-28">
          {STEPS.map(({ n, icon: Icon, title, text }, i) => (
            <li key={n} data-step className={`relative border-t border-champagne/30 pt-6 ${OFFSET[i]}`}>
              <div className="flex items-start justify-between">
                <span className="font-serif text-[5.5rem] font-medium leading-[0.8] text-champagne sm:text-[7rem]">{n}</span>
                <Icon size={22} strokeWidth={1.5} className="mt-1 text-white/50" />
              </div>
              <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-white">{title}</h3>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/60">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
