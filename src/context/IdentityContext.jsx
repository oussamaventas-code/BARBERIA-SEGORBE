import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { http } from '../lib/http'
import { useAuth } from './AuthContext'
import { addTokens, clearIdentity, getProfile, getTokens, setProfile } from '../lib/identity'

const Ctx = createContext(null)
const EMPTY = { customer: null, bookings: [], cancelMinHours: 2 }

/** Quién es el cliente que tiene delante la web: cuenta, dispositivo conocido o invitado */
export function IdentityProvider({ children }) {
  const { session, loading: authLoading } = useAuth()
  const [state, setState] = useState({ ...EMPTY, loading: true })

  const apply = useCallback((data) => {
    setState({ customer: data?.customer || null, bookings: data?.bookings || [], cancelMinHours: data?.cancel_min_hours ?? 2, loading: false })
    if (data?.customer) setProfile({ name: data.customer.name, phone: data.customer.phone, privacy: true })
  }, [])

  const refresh = useCallback(async () => {
    const tokens = getTokens()
    if (!tokens.length && !session) return apply(null)
    try { apply(await http.post('/my/bookings', { tokens })) } catch { apply(null) }
  }, [session, apply])

  useEffect(() => { if (!authLoading) refresh() }, [authLoading, refresh])

  const value = useMemo(() => ({
    ...state,
    refresh,
    apply,
    /** Guarda los tokens y el perfil tras reservar */
    remember: (tokens, profile) => { addTokens(...tokens); if (profile) setProfile({ ...profile, privacy: true }) },
    /** «No soy yo»: olvida este dispositivo */
    forget: () => { clearIdentity(); apply(null) },
    // Perfil para rellenar formularios: el del servidor o el guardado en el dispositivo
    profile: state.customer ? { name: state.customer.name, phone: state.customer.phone, privacy: true } : getProfile(),
    isRegular: Boolean(state.customer?.regular),
  }), [state, refresh, apply])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useIdentity = () => useContext(Ctx)
