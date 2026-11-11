// Citas guardadas en este dispositivo (solo el enlace secreto de cada cita).
const KEY = 'segorbe.citas'

export function savedTokens() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
export function saveToken(token) {
  try {
    const list = savedTokens().filter((t) => t !== token)
    localStorage.setItem(KEY, JSON.stringify([token, ...list].slice(0, 20)))
  } catch { /* almacenamiento no disponible: el enlace sigue funcionando */ }
}
export function forgetToken(token) {
  try { localStorage.setItem(KEY, JSON.stringify(savedTokens().filter((t) => t !== token))) } catch { /* noop */ }
}
