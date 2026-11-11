# Barbería Segorbe · Web + CRM/ERP

Web pública cinematográfica y panel privado de gestión sobre **una misma base de datos Supabase**.

- **Stack:** React 19 · Vite · Tailwind 3.4.17 · GSAP 3 (ScrollTrigger, SplitText) · Lucide · Supabase (Postgres, Auth, RLS)
- **Web pública:** `/`, `/servicios`, `/reservar`, `/mis-citas`, `/contacto` (+ privacidad, aviso legal, cookies)
- **Panel privado:** `/admin/login`, `/admin` (inicio), `/admin/citas`, `/admin/clientes`, `/admin/servicios`, `/admin/finanzas`, `/admin/configuracion`

## Puesta en marcha (lo que necesita el propietario)

1. **Crear proyecto en [supabase.com](https://supabase.com)** (plan gratuito sirve).
2. En **SQL Editor** ejecutar, en orden: `supabase/migrations/20261111000001_init.sql` y después `supabase/seed.sql`.
3. En **Authentication → Users → Add user** crear el usuario del propietario (email + contraseña). Desactivar el registro público en *Authentication → Providers → Email → "Allow new users to sign up"*.
4. Dar acceso al panel a ese usuario (SQL Editor):
   ```sql
   insert into public.staff (user_id, display_name)
   select id, 'Propietario' from auth.users where email = 'EMAIL_DEL_PROPIETARIO';
   ```
5. Copiar `.env.example` a `.env` y rellenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Project Settings → API). **Nunca** uses la `service_role key` en el frontend.
6. `npm install && npm run dev` (desarrollo) o `npm run build` (producción; carpeta `dist/`). Hay rewrites SPA para Vercel (`vercel.json`) y Netlify/Cloudflare (`public/_redirects`).
7. Entrar en `/admin/login` → **Configuración**: revisar horario real, datos legales y enlace de reseñas; **Servicios**: poner precios y duraciones.

## Seguridad

- RLS activo en todas las tablas. Un visitante anónimo solo puede leer negocio, horario y servicios activos, consultar huecos libres y crear solicitudes mediante `create_booking`.
- Clientes, citas, pagos, gastos, bloqueos y notas solo son accesibles a usuarios de la tabla `staff`. Tener una cuenta en Auth **no** basta.
- La reserva es atómica: bloqueo consultivo por día + trigger de integridad en `appointments` (también protege las altas manuales). Probado con 6 reservas simultáneas al mismo hueco → 1 aceptada.
- Un teléfono = un cliente (índice único con teléfono normalizado).

## Autogestión del cliente (sin cuenta)

Al reservar, el cliente recibe un enlace secreto (`/mis-citas/<token>`) y su navegador lo recuerda. Desde ahí puede **cambiar día/hora o cancelar solo esa cita** hasta X horas antes (Configuración → «Cancelar/cambiar hasta»). Un cambio vuelve a quedar *pendiente* hasta que la barbería lo confirme. Si pierde el enlace, la barbería gestiona la cita desde el panel.

## Reglas de negocio

- Una reserva web nace **Pendiente**; nunca se muestra como confirmada hasta que el propietario la confirma.
- Los **ingresos** solo existen cuando se registra un cobro; una cita reservada no suma.
- Sin precio configurado, la web muestra «Consultar precio». No hay precios, nombres, testimonios ni cifras inventados. Los datos DEMO de la landing están etiquetados como tales.
- WhatsApp: enlaces `wa.me` con mensaje predefinido; el mensaje lo envía el usuario, no el sistema.

## Pendiente de datos externos

- Horario definitivo y días de apertura (el seed carga 10:00–20:30 de lunes a sábado como **referencia no verificada**; el panel lo avisa hasta que se guarda).
- Precios y duraciones de servicios; URL de reseñas de Google; datos fiscales para los textos legales (revisar con un profesional).
- Fotografías: se usan imágenes de Unsplash (`src/lib/images.js` y campo imagen de cada servicio); conviene sustituirlas por fotos reales del local.
- Avisos automáticos por email/WhatsApp no están implementados (requerirían un proveedor y consentimiento): el panel muestra las solicitudes pendientes.
