import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock } from 'lucide-react'
import Img from '../ui/Img'
import { formatDuration, formatPrice } from '../../lib/format'
import { SERVICE_FALLBACKS } from '../../lib/images'

export default function ServiceCard({ service, index = 0, tall = false }) {
  const img = service.image_url || SERVICE_FALLBACKS[index % SERVICE_FALLBACKS.length]
  return (
    <article
      data-service-card
      className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/[0.07] bg-slate/40 transition-colors duration-500 hover:border-champagne/30 sm:rounded-[2.5rem]"
    >
      <div className={`relative overflow-hidden ${tall ? 'aspect-[4/3] lg:aspect-auto lg:min-h-[340px] lg:flex-1' : 'aspect-[4/3]'}`}>
        <Img
          src={img}
          alt={service.name}
          className="absolute inset-0 h-full w-full"
          imgClassName="transition-transform duration-[1400ms] ease-luxe group-hover:scale-[1.04] saturate-[0.85]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />
        <span className="absolute left-5 top-5 font-mono text-[11px] tracking-[0.2em] text-white/70">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="relative flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold tracking-tighter text-white sm:text-[1.75rem]">{service.name}</h3>
          <p className={`shrink-0 pt-1 text-right font-mono text-sm ${service.price == null ? 'text-steel' : 'text-champagne'}`}>
            {formatPrice(service.price)}
          </p>
        </div>
        {service.description && <p className="text-[15px] leading-relaxed text-white/60">{service.description}</p>}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-xs text-steel">
            <Clock size={13} /> {formatDuration(service.duration_minutes)}
          </span>
          <Link
            to={`/reservar?servicio=${service.id}`}
            className="link-lift flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-champagne"
            aria-label={`Reservar ${service.name}`}
          >
            Reservar <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  )
}
