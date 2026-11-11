import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Datos confirmados del negocio. Se usan solo mientras carga la BD o si
// Supabase aún no está configurado. Nada de precios ni horarios inventados.
const FALLBACK = {
  business_name: 'Barbería Segorbe',
  tagline: 'Estilo, detalle y personalidad.',
  phone: '643 11 28 58',
  whatsapp_phone: '34643112858',
  address: 'C. Jesús Esteban, 30009 Murcia, España',
  city: 'Murcia',
  timezone: 'Europe/Madrid',
  rating: 4.8,
  review_count: 60,
  google_maps_url:
    'https://www.google.com/maps/search/?api=1&query=Barber%C3%ADa+Segorbe+C.+Jes%C3%BAs+Esteban+30009+Murcia',
  google_reviews_url: null,
  online_booking_enabled: true,
  confirmation_message: 'Hemos recibido tu solicitud. Te confirmaremos la cita lo antes posible por teléfono o WhatsApp.',
}

const BusinessContext = createContext(null)

export function BusinessProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK)
  const [hours, setHours] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    const [s, h, sv] = await Promise.all([
      supabase.from('business_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('opening_hours').select('*').order('weekday').order('opening_time'),
      supabase.from('services').select('*').eq('active', true).order('sort_order').order('name'),
    ])
    if (s.error || h.error || sv.error) setError(s.error || h.error || sv.error)
    else setError(null)
    if (s.data) setSettings({ ...FALLBACK, ...s.data })
    setHours(h.data || [])
    setServices(sv.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const value = useMemo(
    () => ({ settings, hours, services, loading, error, reload: load, configured: isSupabaseConfigured }),
    [settings, hours, services, loading, error, load],
  )
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export const useBusiness = () => useContext(BusinessContext)
