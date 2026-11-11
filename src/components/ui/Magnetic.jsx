import { useRef } from 'react'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'

/** Sensación magnética sutil: el hijo sigue levemente al cursor */
export default function Magnetic({ children, strength = 0.18, className = '' }) {
  const ref = useRef(null)
  const onMove = (e) => {
    if (prefersReducedMotion() || e.pointerType !== 'mouse') return
    const el = ref.current
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * strength
    const y = (e.clientY - (r.top + r.height / 2)) * strength
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = 'translate3d(0,0,0)'
  }
  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`inline-block transition-transform duration-500 ease-luxe will-change-transform ${className}`}
    >
      {children}
    </span>
  )
}
