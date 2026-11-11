import { Link } from 'react-router-dom'
import { MapPin, Phone, MessageCircle } from 'lucide-react'
import { useBusiness } from '../../context/BusinessContext'
import { telLink, whatsappLink } from '../../lib/format'
import OpeningHours from './OpeningHours'

const h = 'mb-5 font-mono text-[11px] uppercase tracking-label text-champagne'
const l = 'link-lift text-sm text-white/70 hover:text-white'

export default function Footer() {
  const { settings, services } = useBusiness()
  return (
    <footer className="rounded-t-[2.5rem] bg-slate pb-8 pt-16 sm:rounded-t-[3rem] sm:pt-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white">Barbería <span className="text-champagne">Segorbe</span></p>
            <p className="editorial mt-4 text-2xl font-normal text-white/80">{settings.tagline || 'Estilo, detalle y personalidad.'}</p>
          </div>
          <nav aria-label="Navegación del pie">
            <p className={h}>Navegación</p>
            <ul className="space-y-3">
              <li><Link className={l} to="/">Inicio</Link></li>
              <li><Link className={l} to="/servicios">Servicios</Link></li>
              <li><Link className={l} to="/reservar">Reservar cita</Link></li>
              <li><Link className={l} to="/contacto">Contacto</Link></li>
            </ul>
          </nav>
          <div>
            <p className={h}>Servicios</p>
            <ul className="space-y-3">
              {services.length ? services.slice(0, 5).map((s) => (
                <li key={s.id}><Link className={l} to={`/reservar?servicio=${s.id}`}>{s.name}</Link></li>
              )) : <li><Link className={l} to="/servicios">Ver servicios</Link></li>}
            </ul>
          </div>
          <div>
            <p className={h}>Contacto</p>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex gap-2.5"><MapPin size={16} className="mt-0.5 shrink-0 text-champagne" />
                <a href={settings.google_maps_url} target="_blank" rel="noopener noreferrer" className="link-lift hover:text-white">{settings.address}</a></li>
              <li className="flex gap-2.5"><Phone size={16} className="shrink-0 text-champagne" /><a className="link-lift font-mono hover:text-white" href={telLink(settings.phone)}>{settings.phone}</a></li>
              <li className="flex gap-2.5"><MessageCircle size={16} className="shrink-0 text-champagne" />
                <a className="link-lift hover:text-white" target="_blank" rel="noopener noreferrer" href={whatsappLink(settings.whatsapp_phone, 'Hola, me gustaría reservar una cita.')}>WhatsApp</a></li>
            </ul>
            <div className="mt-6"><OpeningHours compact /></div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-steel sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.business_name}. Murcia.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><Link className="hover:text-white" to="/privacidad">Política de privacidad</Link></li>
            <li><Link className="hover:text-white" to="/aviso-legal">Aviso legal</Link></li>
            <li><Link className="hover:text-white" to="/cookies">Política de cookies</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
