import { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import { useBusiness } from '../../context/BusinessContext'

/** SP4 · Confianza: solo datos verificables de referencia */
export default function TrustSection() {
  const root = useRef(null)
  const { settings } = useBusiness()
  const rating = settings.rating ? Number(settings.rating) : null
  const reviews = settings.review_count || null

  useEffect(() => {
    const ctx = gsap.context(() => {
      const nums = root.current.querySelectorAll('[data-num]')
      const set = (el, v) => {
        const dec = Number(el.dataset.dec || 0)
        el.textContent = v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })
      }
      if (prefersReducedMotion()) { nums.forEach((el) => set(el, Number(el.dataset.num))); return }
      gsap.from('[data-trust]', { y: 40, autoAlpha: 0, duration: 1, stagger: 0.15, scrollTrigger: { trigger: root.current, start: 'top 75%', once: true } })
      nums.forEach((el) => {
        const o = { v: 0 }
        gsap.to(o, { v: Number(el.dataset.num), duration: 1.8, ease: 'power3.out', onUpdate: () => set(el, o.v), scrollTrigger: { trigger: root.current, start: 'top 75%', once: true } })
      })
    }, root)
    return () => ctx.revert()
  }, [rating, reviews])

  const items = [
    rating != null && { big: <><span data-num={rating} data-dec="1">0</span><span className="text-steel"> / 5</span></>, label: 'Valoración de referencia' },
    reviews != null && { big: <><span data-num={reviews}>0</span>+</>, label: 'Reseñas de Google' },
    { big: settings.city || 'Murcia', label: 'Ubicación del negocio' },
  ].filter(Boolean)

  return (
    <section ref={root} className="bg-slate py-20 sm:py-28" aria-label="Confianza">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 md:grid-cols-3 md:gap-0">
          {items.map((it, i) => (
            <div key={it.label} data-trust className={`px-0 md:px-10 ${i > 0 ? 'md:border-l md:border-champagne/25' : 'md:pl-0'}`}>
              <p className="font-serif text-[clamp(3.5rem,8vw,6rem)] font-medium leading-none text-white">{it.big}</p>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-label text-champagne">{it.label}</p>
            </div>
          ))}
        </div>
        {settings.google_reviews_url && (
          <a href={settings.google_reviews_url} target="_blank" rel="noopener noreferrer" className="link-lift mt-12 inline-flex items-center gap-2 text-sm font-semibold text-champagne">
            Ver reseñas en Google <ExternalLink size={14} />
          </a>
        )}
      </div>
    </section>
  )
}
