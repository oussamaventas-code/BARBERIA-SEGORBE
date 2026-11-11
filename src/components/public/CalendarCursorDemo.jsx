import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import DemoBadge from './DemoBadge'

const DAYS = [
  { d: 'Lun', n: '01' }, { d: 'Mar', n: '02' }, { d: 'Mié', n: '03' },
  { d: 'Jue', n: '04' }, { d: 'Vie', n: '05' }, { d: 'Sáb', n: '06' },
]
const HOURS = ['10:00', '11:15', '12:30', '17:00', '18:15', '19:30']
const DAY_PICK = 3
const HOUR_PICK = 4

/** F3 · Demostración animada de lo fácil que es reservar. No crea citas reales. */
export default function CalendarCursorDemo() {
  const root = useRef(null)
  const cursor = useRef(null)
  const dayRef = useRef(null)
  const hourRef = useRef(null)
  const btnRef = useRef(null)
  const [step, setStep] = useState(0) // 0 nada · 1 día · 2 hora · 3 confirmado

  useEffect(() => {
    if (prefersReducedMotion()) {
      setStep(2)
      return
    }
    const ctx = gsap.context(() => {
      const pos = (el) => {
        const c = root.current.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        return { x: r.left - c.left + r.width / 2 - 4, y: r.top - c.top + r.height / 2 - 4 }
      }
      const click = () => gsap.timeline().to(cursor.current, { scale: 0.8, duration: 0.12, ease: 'power2.inOut' }).to(cursor.current, { scale: 1, duration: 0.18, ease: 'power2.inOut' })

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.4,
        paused: true,
        scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'bottom 10%', toggleActions: 'play pause resume pause' },
      })
      tl.call(() => setStep(0))
        .set(cursor.current, { x: () => root.current.offsetWidth + 30, y: () => root.current.offsetHeight * 0.75, autoAlpha: 0 })
        .to(cursor.current, { autoAlpha: 1, duration: 0.3 })
        .to(cursor.current, { x: () => pos(dayRef.current).x, y: () => pos(dayRef.current).y, duration: 1.1, ease: 'power2.inOut' })
        .add(click())
        .call(() => setStep(1))
        .to(cursor.current, { x: () => pos(hourRef.current).x, y: () => pos(hourRef.current).y, duration: 0.95, ease: 'power2.inOut' }, '+=0.35')
        .add(click())
        .call(() => setStep(2))
        .to(cursor.current, { x: () => pos(btnRef.current).x, y: () => pos(btnRef.current).y, duration: 0.9, ease: 'power2.inOut' }, '+=0.35')
        .add(click())
        .call(() => setStep(3))
        .to(cursor.current, { autoAlpha: 0, y: '+=16', duration: 0.6, ease: 'power3.out' }, '+=0.3')
        .to({}, { duration: 1.6 })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="relative h-full overflow-hidden rounded-[2rem] border border-white/[0.07] bg-slate/50 p-5 sm:p-7" aria-label="Demostración animada del calendario de reservas" role="img">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight text-white">Elige tu momento</p>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:gap-2" aria-hidden>
        {DAYS.map((day, i) => {
          const active = i === DAY_PICK && step >= 1
          return (
            <div
              key={day.d}
              ref={i === DAY_PICK ? dayRef : null}
              className={`flex flex-col items-center rounded-2xl border py-2.5 transition-all duration-300 min-w-0 ${
                active ? 'border-champagne bg-champagne text-obsidian' : 'border-white/[0.07] text-white/70'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70">{day.d}</span>
              <span className="mt-0.5 font-mono text-sm font-medium">{day.n}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2" aria-hidden>
        {HOURS.map((h, i) => {
          const active = i === HOUR_PICK && step >= 2
          const dim = step < 1
          return (
            <div
              key={h}
              ref={i === HOUR_PICK ? hourRef : null}
              className={`rounded-xl border py-2.5 text-center font-mono text-xs transition-all duration-300 ${
                active ? 'border-champagne bg-champagne/15 text-champagne' : 'border-white/[0.07] text-white/60'
              } ${dim ? 'opacity-40' : 'opacity-100'}`}
            >
              {h}
            </div>
          )
        })}
      </div>

      <div
        ref={btnRef}
        aria-hidden
        className={`mt-5 flex items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-500 ${
          step === 3 ? 'bg-status-completed/90 text-obsidian' : step === 2 ? 'bg-champagne text-obsidian' : 'bg-white/5 text-white/40'
        }`}
      >
        {step === 3 ? (<><Check size={14} /> Solicitud enviada</>) : 'Confirmar'}
      </div>

      <svg ref={cursor} className="pointer-events-none absolute left-0 top-0 z-10 h-6 w-6 opacity-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" viewBox="0 0 24 24" aria-hidden>
        <path d="M4 2.5 19.5 12 12.6 13.4 9.3 20.2Z" fill="#FAF8F5" stroke="#0D0D12" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
