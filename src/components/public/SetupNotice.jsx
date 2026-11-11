import { useState } from 'react'
import { useBusiness } from '../../context/BusinessContext'

/** Aviso honesto: si la BD no está conectada, se dice. Nunca se simula. */
export default function SetupNotice() {
  const { configured, error } = useBusiness()
  const [hidden, setHidden] = useState(false)
  // Solo en desarrollo: el visitante nunca ve avisos técnicos
  if (!import.meta.env.DEV || hidden || (configured && !error)) return null
  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-3xl border border-champagne/30 bg-obsidian/95 p-4 text-sm text-ivory shadow-luxe backdrop-blur md:bottom-6">
      <p className="label-mono mb-1">Modo configuración</p>
      <p className="text-steel">
        {configured
          ? 'No se ha podido conectar con la base de datos. Revisa la configuración de Supabase.'
          : 'La base de datos (Supabase) aún no está conectada: servicios y reservas online no están activos. Mientras tanto, las reservas se atienden por WhatsApp o teléfono.'}
      </p>
      <button onClick={() => setHidden(true)} className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-champagne">
        Entendido
      </button>
    </div>
  )
}
