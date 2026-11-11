import { useEffect, useRef } from 'react'
import { gsap, SplitText } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import { IMAGES } from '../../lib/images'
import Img from '../ui/Img'

/** M1 · Filosofía: pantalla completa, parallax sutil, SplitText palabra a palabra */
export default function Manifesto() {
  const root = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to('[data-parallax]', {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
      })
      const splits = []
      root.current.querySelectorAll('[data-split]').forEach((el) => {
        const split = SplitText.create(el, { type: 'words', aria: 'auto' })
        splits.push(split)
        gsap.from(split.words, {
          y: 40,
          autoAlpha: 0,
          duration: 1,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        })
      })
      gsap.from('[data-fade]', {
        y: 24, autoAlpha: 0, duration: 1.1, delay: 0.4,
        scrollTrigger: { trigger: '[data-fade]', start: 'top 90%', once: true },
      })
      return () => splits.forEach((s) => s.revert())
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} id="barberia" className="relative flex min-h-[100svh] items-center overflow-hidden bg-obsidian py-28">
      <div className="absolute inset-x-0 -top-[12%] bottom-[-12%]" data-parallax aria-hidden>
        <Img src={IMAGES.tools} alt="" className="h-full w-full" imgClassName="grayscale-[0.4] contrast-[1.1]" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-obsidian/80" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-obsidian via-transparent to-obsidian" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <p className="label-mono mb-8">La barbería</p>
        <p data-split className="text-[clamp(1.6rem,4.4vw,3.2rem)] font-medium leading-[1.1] tracking-tighter text-white/85">
          Muchos ven un corte.
        </p>
        <p data-split className="editorial mt-3 text-[clamp(2.6rem,9vw,7.5rem)] font-normal leading-[0.98] text-champagne">
          Nosotros vemos una forma de expresarte.
        </p>
        <div data-fade className="mt-14 flex max-w-md items-start gap-5">
          <span className="mt-3 h-px w-12 shrink-0 bg-champagne" />
          <p className="text-base leading-relaxed text-white/70">
            El estilo está en los detalles. La diferencia, en cómo te hacen sentir.
          </p>
        </div>
      </div>
    </section>
  )
}
