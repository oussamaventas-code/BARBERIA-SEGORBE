import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CalendarDays, Home, LogOut, Scissors, Settings, Users, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { capitalize, formatDate, todayISO } from '../../lib/format'
import { useBusiness } from '../../context/BusinessContext'

const NAV = [
  { to: '/admin', label: 'Inicio', icon: Home, end: true },
  { to: '/admin/citas', label: 'Citas', icon: CalendarDays },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/servicios', label: 'Servicios', icon: Scissors },
  { to: '/admin/finanzas', label: 'Finanzas', icon: Wallet },
  { to: '/admin/configuracion', label: 'Ajustes', icon: Settings },
]

export default function AdminLayout() {
  const { staff, user, signOut } = useAuth()
  const { settings } = useBusiness()
  const navigate = useNavigate()
  const logout = async () => { await signOut(); navigate('/admin/login', { replace: true }) }
  const name = staff?.display_name || user?.email

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/[0.06] bg-obsidian px-5 py-7 lg:flex">
        <div className="mb-10 px-2"><p className="text-[13px] font-semibold uppercase tracking-[0.26em]">Barbería <span className="text-champagne">Segorbe</span></p><p className="label-mono mt-1.5 text-steel">Gestión</p></div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Panel">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-champagne/10 text-champagne' : 'text-steel hover:bg-white/5 hover:text-ivory'}`}>
              <Icon size={18} /> {label === 'Ajustes' ? 'Configuración' : label}
            </NavLink>
          ))}
        </nav>
        <a href="/" target="_blank" className="mb-3 px-2 text-xs text-steel hover:text-ivory">Ver web pública ↗</a>
        <button onClick={logout} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-steel hover:bg-white/5 hover:text-ivory"><LogOut size={18} /> Cerrar sesión</button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-obsidian/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] lg:hidden">Barbería <span className="text-champagne">Segorbe</span></p>
            <p className="font-mono text-xs text-steel">{capitalize(formatDate(todayISO(settings.timezone), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[180px] truncate text-sm text-steel sm:block">{name}</span>
            <button onClick={logout} aria-label="Cerrar sesión" className="abtn abtn-ghost !px-3 !py-2 lg:hidden"><LogOut size={16} /></button>
            <button onClick={logout} className="abtn abtn-ghost hidden !py-2 lg:inline-flex">Cerrar sesión</button>
          </div>
        </header>
        <main className="px-4 pb-28 pt-6 sm:px-8 lg:pb-12"><Outlet /></main>
      </div>

      {/* Navegación inferior móvil */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-white/[0.08] bg-obsidian/95 pt-2 backdrop-blur lg:hidden" aria-label="Panel">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 py-1.5 text-[10px] font-medium ${isActive ? 'text-champagne' : 'text-steel'}`}>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
