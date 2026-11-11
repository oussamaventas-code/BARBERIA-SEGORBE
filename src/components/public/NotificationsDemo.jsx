import { useEffect, useRef, useState } from 'react'
import { CalendarPlus, UserPlus, CalendarCheck } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import DemoBadge from './DemoBadge'

const MESSAGES = [
  { icon: CalendarPlus, text: 'Nueva solicitud de reserva', status: 'Pendiente', tone: 'bg-status-pending' },
  { icon: UserPlus, text: 'Cliente registrado', status: 'Nuevo', tone: 'bg-steel' },
  { icon: CalendarCheck, text: 'Cita confirmada', status: 'Confirmada', tone: 'bg-champagne' },
]
const SIM_TIMES = ['10:02', '10:14', '10:31', '11:05', '11:20', '11:48']

/** F6 · Notificaciones simuladas del sistema (no es actividad real) */
export default function NotificationsDemo() {
  const root = useRef(null)
  const listRef = useRef(null)
  const counter = useRef(3)
  const [items, setItems] = useState(() => MESSAGES.map((m, i) => ({ ...m, id: i, time: SIM_TIMES[i] })))

  useEffect(() => {
    if (prefersReducedMotion()) return
    let timer = null
    const tick = () => {
      const n = counter.current++
      setItems((prev) => [...prev, { ...MESSAGES[n % 3], id: n, time: SIM_TIMES[n % SIM_TIMES.length] }].slice(-3))
    }
    const io = new IntersectionObserver(([entry]) => {
      clearInterval(timer)
      if (entry.isIntersecting) timer = setInterval(tick, 2500)
    })
    io.observe(root.current)
    return () => {
      io.disconnect()
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      const last = listRef.current?.lastElementChild
      if (last) gsap.fromTo(last, { y: 36, autoAlpha: 0, scale: 0.96 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power3.out' })
    }, root)
    return () => ctx.revert()
  }, [items])

  return (
    <div ref={root} className="flex h-full flex-col rounded-[2rem] border border-white/[0.07] bg-slate/50 p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight text-white">Avisos al instante</p>
        <DemoBadge>Simulación</DemoBadge>
      </div>
      <ul ref={listRef} className="flex flex-1 flex-col justify-end gap-2.5" aria-label="Ejemplo de notificaciones del sistema (simulación)">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-obsidian/70 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-champagne/10 text-champagne">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.text}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-steel">
                  <span className={`h-1.5 w-1.5 rounded-full ${item.tone}`} /> {item.status}
                </p>
              </div>
              <span className="font-mono text-[11px] text-steel">{item.time}</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-steel">Ejemplo ilustrativo del panel de gestión. No refleja actividad real.</p>
    </div>
  )
}
