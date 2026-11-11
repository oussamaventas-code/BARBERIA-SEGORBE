import { Link } from 'react-router-dom'
import { MapPin, Phone, MessageCircle, Clock, ExternalLink } from 'lucide-react'
import { useBusiness } from '../../context/BusinessContext'
import { telLink, whatsappLink } from '../../lib/format'
import OpeningHours from '../../components/public/OpeningHours'

export default function ContactPage() {
  const { settings } = useBusiness()
  const mapsEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(`${settings.business_name} ${settings.address}`)}&output=embed`
  return (
    <section className="bg-obsidian pb-24 pt-32 sm:pt-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <p className="label-mono mb-5">Contacto</p>
        <h1 className="max-w-3xl text-[clamp(2.4rem,6vw,4.5rem)] font-semibold leading-[1] tracking-tightest text-white">
          Ven a vernos, o <span className="editorial font-normal tracking-normal text-champagne">escríbenos.</span>
        </h1>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/[0.07] bg-slate/40 p-7">
              <p className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-label text-champagne"><MapPin size={14} /> Dirección</p>
              <p className="text-lg text-white">{settings.address}</p>
              <a href={settings.google_maps_url} target="_blank" rel="noopener noreferrer" className="link-lift mt-4 inline-flex items-center gap-2 text-sm font-semibold text-champagne">Abrir en Google Maps <ExternalLink size={14} /></a>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <a href={telLink(settings.phone)} className="group rounded-[2rem] border border-white/[0.07] bg-slate/40 p-7 transition-colors hover:border-champagne/40">
                <Phone size={20} className="text-champagne" />
                <p className="mt-6 font-mono text-[11px] uppercase tracking-label text-steel">Llamar</p>
                <p className="mt-1 font-mono text-xl text-white">{settings.phone}</p>
              </a>
              <a href={whatsappLink(settings.whatsapp_phone, 'Hola, me gustaría reservar una cita.')} target="_blank" rel="noopener noreferrer" className="group rounded-[2rem] border border-white/[0.07] bg-slate/40 p-7 transition-colors hover:border-champagne/40">
                <MessageCircle size={20} className="text-champagne" />
                <p className="mt-6 font-mono text-[11px] uppercase tracking-label text-steel">WhatsApp</p>
                <p className="mt-1 text-xl text-white">Escríbenos</p>
              </a>
            </div>
            <div className="rounded-[2rem] border border-white/[0.07] bg-slate/40 p-7">
              <p className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-label text-champagne"><Clock size={14} /> Horario</p>
              <OpeningHours />
            </div>
            <Link to="/reservar" className="btn btn-gold w-full">Reservar cita online</Link>
          </div>
          <div className="min-h-[360px] overflow-hidden rounded-[2.5rem] border border-white/[0.07] bg-slate/40 lg:min-h-full">
            <iframe title={`Mapa de ${settings.business_name}`} src={mapsEmbed} className="h-full min-h-[360px] w-full grayscale invert-[0.92] contrast-[0.9]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </div>
    </section>
  )
}
