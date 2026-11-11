import CalendarCursorDemo from './CalendarCursorDemo'
import NotificationsDemo from './NotificationsDemo'
import MiniDashboardDemo from './MiniDashboardDemo'

export default function SystemShowcase() {
  return (
    <section className="relative bg-obsidian pb-24 sm:pb-32" aria-labelledby="showcase-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mb-12 flex flex-col gap-4 border-t border-white/[0.07] pt-16 sm:pt-24 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-6 flex items-center gap-4 font-mono text-[11px] uppercase tracking-label text-steel"><span className="text-champagne">02</span><span className="h-px w-10 bg-white/20" />Reservas</p>
            <h2 id="showcase-title" className="max-w-xl text-[clamp(2rem,4.6vw,3.25rem)] font-semibold leading-[1.02] tracking-tightest text-white">
              Elige día y hora. Nosotros te confirmamos.
            </h2>
          </div>
          <p className="max-w-sm text-white/60">
            Escoges el servicio, ves los huecos libres y mandas la solicitud. En cuanto la revisamos, te confirmamos la cita. Las demos de aquí abajo son ilustrativas.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          <CalendarCursorDemo />
          <NotificationsDemo />
          <div className="md:col-span-2 lg:col-span-1"><MiniDashboardDemo /></div>
        </div>
      </div>
    </section>
  )
}
