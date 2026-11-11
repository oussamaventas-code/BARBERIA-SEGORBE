import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [staff, setStaff] = useState(null) // fila de public.staff o null
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true

    async function resolve(sess) {
      if (!active) return
      setSession(sess)
      if (!sess) {
        setStaff(null)
        setLoading(false)
        return
      }
      const { data } = await supabase.from('staff').select('*').eq('user_id', sess.user.id).maybeSingle()
      if (!active) return
      setStaff(data || null)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      // Evita llamadas a Supabase dentro del callback (recomendación oficial)
      setTimeout(() => resolve(sess), 0)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      staff,
      isStaff: Boolean(staff),
      loading,
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, staff, loading],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
