import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X, Phone } from 'lucide-react'
import { useBusiness } from '../../context/BusinessContext'
import { telLink } from '../../lib/format'

const LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/servicios', label: 'Servicios' },
  { to: '/#barberia', label: 'La barbería' },
  { to: '/contacto', label: 'Contacto' },
]

export default function Navbar() {
  const { settings } = useBusiness()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname, location.hash])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const solid = scrolled || open

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-5">
      <nav
        aria-label="Principal"
        className={`pointer-events-auto w-full max-w-5xl rounded-[2rem] border transition-all duration-500 ease-luxe ${
          solid
            ? 'border-champagne/15 bg-obsidian/75 shadow-luxe backdrop-blur-xl'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between gap-3 py-2 pl-5 pr-2 sm:pl-6">
          <Link to="/" className="group flex flex-col leading-none" aria-label={`${settings.business_name}, inicio`}>
            <span className="text-[13px] font-semibold uppercase tracking-[0.28em] text-white sm:text-sm">
              Barbería <span className="text-champagne">Segorbe</span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `link-lift rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                      isActive && !l.to.includes('#') ? 'text-champagne' : 'text-white/80 hover:text-white'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <Link to="/reservar" className="btn btn-gold btn-sm whitespace-nowrap !px-4 xs:!px-5">
              <span className="hidden xs:inline">Reservar cita</span>
              <span className="xs:hidden">Reservar</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={`grid overflow-hidden transition-[grid-template-rows] duration-500 ease-luxe md:hidden ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="min-h-0">
            <ul className="flex flex-col gap-1 px-3 pb-3 pt-1">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-lg font-medium tracking-tight text-white hover:bg-white/5">
                    {l.label}
                    <span className="font-mono text-[10px] text-steel">→</span>
                  </Link>
                </li>
              ))}
              <li className="mt-2 border-t border-white/10 pt-3">
                <a href={telLink(settings.phone)} className="flex items-center gap-3 rounded-2xl px-4 py-3 font-mono text-sm text-champagne">
                  <Phone size={16} /> {settings.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  )
}
