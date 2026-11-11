// Barbería Segorbe · API sobre Cloudflare Workers + D1
// La web estática la sirve Workers Assets; este Worker solo atiende /api/*.
import { adminRoutes } from './admin.js'
import { clearCookie, destroySession, getUser, login, rateLimit, requireStaff, signup } from './auth.js'
import { availableDays, availableSlots, cancelBooking, claimCustomer, createBooking, myBookings, publicBundle, rescheduleBooking } from './booking.js'
import { HttpError, bad, json, readJson, tokenList } from './util.js'

const meOut = (u) => (u ? { user: { id: u.id, email: u.email }, staff: u.kind === 'staff' ? { display_name: u.display_name || 'Propietario' } : null } : { user: null, staff: null })

async function handle(request, env) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '') || '/'
  const method = request.method
  const q = Object.fromEntries(url.searchParams)

  // Defensa CSRF: las peticiones que modifican datos solo se aceptan desde nuestro propio origen
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).host !== url.host) throw bad('FORBIDDEN', 'Origen no permitido', 403)
  }

  /* ---------- Público ---------- */
  if (method === 'GET' && path === '/public') return json(await publicBundle(env))
  if (method === 'GET' && path === '/availability/days') return json(await availableDays(env, q))
  if (method === 'GET' && path === '/availability/slots') return json(await availableSlots(env, q))

  if (method === 'POST' && path === '/bookings') {
    await rateLimit(env, `book:${request.headers.get('cf-connecting-ip') || 'x'}`, 20, 3600)
    return json(await createBooking(env, await readJson(request), await getUser(env, request)))
  }
  if (method === 'POST' && path === '/my/bookings') { const b = await readJson(request); return json(await myBookings(env, tokenList(b.tokens), await getUser(env, request))) }
  if (method === 'POST' && path === '/my/cancel') return json(await cancelBooking(env, await readJson(request), await getUser(env, request)))
  if (method === 'POST' && path === '/my/reschedule') return json(await rescheduleBooking(env, await readJson(request), await getUser(env, request)))
  if (method === 'POST' && path === '/my/claim') return json(await claimCustomer(env, await readJson(request), await getUser(env, request)))

  /* ---------- Acceso ---------- */
  if (method === 'GET' && path === '/auth/me') return json(meOut(await getUser(env, request)))
  if (method === 'POST' && path === '/auth/signup') { const r = await signup(env, request); return json(meOut({ ...r.user, kind: 'customer' }), 200, { 'set-cookie': r.cookie }) }
  if (method === 'POST' && path === '/auth/login') { const r = await login(env, request); return json(meOut(r.user), 200, { 'set-cookie': r.cookie }) }
  if (method === 'POST' && path === '/auth/logout') { await destroySession(env, request); return json({ ok: true }, 200, { 'set-cookie': clearCookie() }) }

  /* ---------- Panel privado ---------- */
  if (path.startsWith('/admin/')) {
    await requireStaff(env, request)
    const sub = path.slice('/admin'.length)
    for (const [m, re, fn] of adminRoutes) {
      const match = m === method && sub.match(re)
      if (match) {
        const body = method === 'GET' || method === 'DELETE' ? {} : await readJson(request)
        return json(await fn({ env, q, params: match.slice(1), body }))
      }
    }
  }
  throw bad('NOT_FOUND', 'No encontrado', 404)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 })
    try {
      return await handle(request, env)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: { code: e.code, message: e.message } }, e.status)
      console.error('Error no controlado:', e?.stack || e)
      return json({ error: { code: 'INTERNAL', message: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.' } }, 500)
    }
  },
}
