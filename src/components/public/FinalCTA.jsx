import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import Magnetic from '../ui/Magnetic'

export default function FinalCTA() {
  const root = useRef(null)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-cta]', { y: 40, autoAlpha: 0, duration: 1.1, stagger: 0.1, scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } })
    }, root)
    return () => ctx.revert()
  }, [])
  return (
    <section ref={root} className="relative overflow-hidden bg-obsidian py-28 text-center sm:py-40">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne/[0.08] blur-[110px]" />
      <div className="relative mx-auto max-w-4xl px-4">
        <h2 data-cta className="text-[clamp(2.6rem,8vw,6rem)] font-semibold leading-[0.98] tracking-tightest text-white">
          Tu próximo corte <span className="editorial font-normal tracking-normal text-champagne">empieza aquí.</span>
        </h2>
        <p data-cta className="mx-auto mt-6 max-w-md text-lg text-white/60">Encuentra tu momento. Nosotros nos ocupamos del resto.</p>
        <div data-cta className="mt-10">
          <Magnetic><Link to="/reservar" className="btn btn-gold">Reservar mi cita <ArrowRight size={16} /></Link></Magnetic>
        </div>
        <p data-cta className="mt-12 font-mono text-[11px] uppercase tracking-label text-steel">Barbería Segorbe · Murcia</p>
      </div>
    </section>
  )
}
