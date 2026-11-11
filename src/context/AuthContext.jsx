import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { http } from '../lib/http'

const AuthContext = createContext(null)

/** Sesión por cookie HttpOnly: el navegador nunca ve ni guarda el token. */
export function AuthProvider({ children }) {
  const [me, setMe] = useState({ user: null, staff: null })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try { setMe(await http.get('/auth/me')) } catch { setMe({ user: null, staff: null }) }
    setLoading(false)
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const value = useMemo(() => {
    // Mantienen la forma {data, error}: así los formularios no dependen del proveedor
    const call = async (path, body) => {
      try { const data = await http.post(path, body); setMe(data); return { data: { session: data.user }, error: null } } catch (error) { return { data: null, error } }
    }
    return {
      session: me.user,
      user: me.user,
      staff: me.staff,
      isStaff: Boolean(me.staff),
      loading,
      signUp: (email, password) => call('/auth/signup', { email, password }),
      signIn: (email, password) => call('/auth/login', { email, password }),
      signOut: async () => { try { await http.post('/auth/logout') } catch { /* noop */ } setMe({ user: null, staff: null }) },
    }
  }, [me, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
