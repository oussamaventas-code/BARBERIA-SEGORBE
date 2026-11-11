import CalendarCursorDemo from './CalendarCursorDemo'
import NotificationsDemo from './NotificationsDemo'
import MiniDashboardDemo from './MiniDashboardDemo'

export default function SystemShowcase() {
  return (
    <section className="relative bg-obsidian pb-24 sm:pb-32" aria-labelledby="showcase-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="mb-12 flex flex-col gap-4 border-t border-white/[0.07] pt-16 sm:pt-24 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-mono mb-5">Sin esperas · Sin llamadas</p>
            <h2 id="showcase-title" className="max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1] tracking-tightest text-white">
              Reservar es tan sencillo <span className="editorial font-normal tracking-normal text-champagne">como debería.</span>
            </h2>
          </div>
          <p className="max-w-sm text-white/60">
            Eliges servicio, día y hora en menos de un minuto. Nosotros recibimos tu solicitud y te confirmamos la cita.
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
