// Identidad del cliente en ESTE dispositivo (invitado recurrente).
// Guardamos solo: tokens secretos (del cliente y de sus citas) y nombre/teléfono para
// no volver a escribirlos. Si el navegador no permite almacenar, todo sigue funcionando.
const TOKENS = 'segorbe.tokens'
const PROFILE = 'segorbe.perfil'
const PENDING = 'segorbe.pendiente'

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

export const getTokens = () => read(TOKENS, [])
export const addTokens = (...t) => write(TOKENS, [...new Set([...t.filter(Boolean), ...getTokens()])].slice(0, 30))
export const getProfile = () => read(PROFILE, null)
export const setProfile = (p) => write(PROFILE, p)
export const getPending = () => read(PENDING, null)
export const setPending = (p) => write(PENDING, p)
export const clearPending = () => { try { localStorage.removeItem(PENDING) } catch { /* noop */ } }
export const clearIdentity = () => { try { localStorage.removeItem(TOKENS); localStorage.removeItem(PROFILE) } catch { /* noop */ } }
