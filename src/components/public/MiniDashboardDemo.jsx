import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import DemoBadge from './DemoBadge'

// Datos FICTICIOS de demostración. No son resultados de Barbería Segorbe.
const DEMO_SERIES = [8, 11, 9, 14, 12, 17, 15]
const DEMO = { citas: 86, ingresos: 1240, ocupacion: 72 }

const W = 300
const H = 110
function buildPath(values) {
  const max = Math.max(...values) * 1.15
  const step = W / (values.length - 1)
  const pts = values.map((v, i) => [i * step, H - (v / max) * H])
  const line = pts.map((p, i) => {
    if (i === 0) return `M${p[0]},${p[1]}`
    const prev = pts[i - 1]
    const cx = (prev[0] + p[0]) / 2
    return `C${cx},${prev[1]} ${cx},${p[1]} ${p[0]},${p[1]}`
  }).join(' ')
  return { line, area: `${line} L${W},${H} L0,${H} Z`, last: pts[pts.length - 1] }
}

/** F7 · Mini dashboard que anticipa el CRM (datos DEMO) */
export default function MiniDashboardDemo() {
  const root = useRef(null)
  const { line, area, last } = buildPath(DEMO_SERIES)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const counters = root.current.querySelectorAll('[data-count]')
      if (prefersReducedMotion()) {
        counters.forEach((el) => { el.textContent = Number(el.dataset.count).toLocaleString('es-ES') })
        return
      }
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 80%', once: true } })
      const path = root.current.querySelector('[data-line]')
      const len = path.getTotalLength()
      tl.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' })
        .from('[data-area]', { autoAlpha: 0, duration: 1.2 }, 0.6)
        .from('[data-dot]', { scale: 0, transformOrigin: 'center', duration: 0.5 }, 1.6)
      counters.forEach((el) => {
        const obj = { v: 0 }
        tl.to(obj, {
          v: Number(el.dataset.count),
          duration: 1.6,
          ease: 'power3.out',
          onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('es-ES') },
        }, 0.1)
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="flex h-full flex-col rounded-[2rem] border border-white/[0.07] bg-slate/50 p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight text-white">Tu negocio, de un vistazo</p>
        <DemoBadge>Datos demo</DemoBadge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { k: 'Citas', v: DEMO.citas, suffix: '' },
          { k: 'Ingresos', v: DEMO.ingresos, suffix: ' €' },
          { k: 'Ocupación', v: DEMO.ocupacion, suffix: ' %' },
        ].map((m) => (
          <div key={m.k} className="rounded-2xl bg-obsidian/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-steel">{m.k}</p>
            <p className="mt-1 font-mono text-base font-medium text-white sm:text-lg">
              <span data-count={m.v}>0</span>{m.suffix}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex-1">
        <svg viewBox={`0 0 ${W} ${H + 4}`} className="h-28 w-full overflow-visible" aria-hidden preserveAspectRatio="none">
          <defs>
            <linearGradient id="demoArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 5" />
          ))}
          <path data-area d={area} fill="url(#demoArea)" />
          <path data-line d={line} fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle data-dot cx={last[0]} cy={last[1]} r="4" fill="#0D0D12" stroke="#C9A84C" strokeWidth="2" />
        </svg>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-steel">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <span key={d}>{d}</span>)}
        </div>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-steel">Cifras ficticias con fines ilustrativos. No son resultados reales del negocio.</p>
    </div>
  )
}
