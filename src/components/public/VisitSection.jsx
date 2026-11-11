import { Link } from 'react-router-dom'
import { Clock, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useBusiness } from '../../context/BusinessContext'
import { telLink, whatsappLink } from '../../lib/format'
import OpeningHours from './OpeningHours'

/** Cómo llegar y cuándo estamos: lo que busca quien quiere pasarse por la barbería */
export default function VisitSection() {
  const { settings } = useBusiness()
  return (
    <section className="bg-slate py-20 sm:py-28" aria-labelledby="visit-title">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:px-10">
        <div>
          <h2 id="visit-title" className="text-[clamp(2rem,4.6vw,3.25rem)] font-semibold leading-[1.02] tracking-tightest text-white">Dónde estamos</h2>
          <p className="mt-6 flex items-start gap-3 text-lg text-white/80"><MapPin size={20} className="mt-1 shrink-0 text-champagne" />{settings.address}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={settings.google_maps_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Cómo llegar</a>
            <a href={telLink(settings.phone)} className="btn btn-ghost"><Phone size={15} /> {settings.phone}</a>
            <a href={whatsappLink(settings.whatsapp_phone, 'Hola, me gustaría pedir cita.')} target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><MessageCircle size={15} /> WhatsApp</a>
          </div>
          {settings.rating && settings.review_count ? (
            <p className="mt-10 font-mono text-sm text-white/60">
              {Number(settings.rating).toLocaleString('es-ES', { minimumFractionDigits: 1 })} ★ · {settings.review_count} reseñas en Google
              {settings.google_reviews_url && <> · <a href={settings.google_reviews_url} target="_blank" rel="noopener noreferrer" className="text-champagne underline underline-offset-4">leerlas</a></>}
            </p>
          ) : null}
        </div>
        <div>
          <p className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-label text-champagne"><Clock size={14} /> Horario</p>
          <OpeningHours />
          <Link to="/reservar" className="btn btn-gold mt-10 w-full sm:w-auto">Pedir cita</Link>
        </div>
      </div>
    </section>
  )
}
