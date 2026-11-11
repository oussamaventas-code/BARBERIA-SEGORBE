import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import { useBusiness } from '../../context/BusinessContext'
import { whatsappLink } from '../../lib/format'
import ServiceCard from './ServiceCard'

// Grid asimétrico: alterna columnas anchas y estrechas
const SPANS = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7']

export default function ServicesSection({ limit, showHeader = true }) {
  const root = useRef(null)
  const { services, loading, configured, settings } = useBusiness()
  const list = limit ? services.slice(0, limit) : services

  useEffect(() => {
    if (prefersReducedMotion() || loading || !list.length) return
    const ctx = gsap.context(() => {
      gsap.from('[data-service-card]', {
        y: 60,
        autoAlpha: 0,
        duration: 1.1,
        stagger: 0.15,
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      })
    }, root)
    return () => ctx.revert()
  }, [loading, list.length])

  return (
    <section ref={root} id="servicios" className="relative bg-obsidian py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        {showHeader && (
          <div className="mb-14 grid gap-6 lg:mb-20 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="mb-6 flex items-center gap-4 font-mono text-[11px] uppercase tracking-label text-steel"><span className="text-champagne">01</span><span className="h-px w-10 bg-white/20" />Servicios</p>
              <h2 className="max-w-3xl text-[clamp(2.4rem,6vw,4.5rem)] font-semibold leading-[0.98] tracking-tightest text-white">
                El cuidado está en los <span className="editorial font-normal tracking-normal">detalles.</span>
              </h2>
            </div>
            <p className="max-w-sm text-base text-white/60 lg:text-right">Cada servicio comienza escuchando lo que buscas.</p>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-12" aria-busy="true" aria-label="Cargando servicios">
            {SPANS.map((s, i) => (
              <div key={i} className={`${s} h-[420px] animate-pulse rounded-[2.5rem] bg-slate/40`} />
            ))}
          </div>
        ) : list.length ? (
          <div className="grid gap-5 lg:grid-cols-12">
            {list.map((s, i) => (
              <div key={s.id} className={SPANS[i % SPANS.length]}>
                <ServiceCard service={s} index={i} tall={i % 4 === 0 || i % 4 === 3} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2.5rem] border border-white/[0.07] bg-slate/30 px-6 py-16 text-center sm:px-12">
            <p className="editorial text-3xl text-champagne">Carta en preparación</p>
            <p className="mx-auto mt-4 max-w-md text-white/60">
              {configured
                ? 'Estamos actualizando nuestros servicios. Escríbenos y te contamos todo lo que podemos hacer por ti.'
                : 'Los servicios se mostrarán aquí en cuanto se conecte la base de datos. Mientras tanto, consúltanos directamente.'}
            </p>
            <a href={whatsappLink(settings.whatsapp_phone, 'Hola, me gustaría información sobre vuestros servicios.')} target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-8">
              <MessageCircle size={16} /> Consultar por WhatsApp
            </a>
          </div>
        )}

        {limit && services.length > limit && (
          <div className="mt-12 text-center">
            <Link to="/servicios" className="btn btn-ghost">Ver todos los servicios</Link>
          </div>
        )}
      </div>
    </section>
  )
}
