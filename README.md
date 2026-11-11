# Barbería Segorbe · Web + gestión de citas

Web pública de la barbería y panel privado del propietario, **todo sobre Cloudflare**:

- **Base de datos:** Cloudflare **D1** (`barberia-segorbe`, región WEUR) — ya creada con el esquema y los datos iniciales.
- **Backend:** un **Worker** (`worker/`) con la API en `/api/*`. El navegador nunca habla con la base de datos.
- **Web:** React 19 · Vite · Tailwind 3.4.17 · GSAP · Lucide, servida por el mismo Worker (mismo dominio → cookies seguras).

Páginas públicas: `/` (una pantalla), `/servicios`, `/reservar`, `/mis-citas`, `/cuenta`, `/la-barberia`, `/contacto`.
Panel: `/admin/login`, `/admin`, `/admin/citas`, `/admin/clientes`, `/admin/servicios`, `/admin/finanzas`, `/admin/configuracion`.

## Publicar (lo hace el propietario, una vez)

Necesita Node 20+ y su cuenta de Cloudflare.

```bash
npm install
npx wrangler login
```

La base de datos ya existe y ya tiene tablas y datos (ID en `wrangler.toml`). Para crear la cuenta del propietario en producción:

```bash
node scripts/create-owner.mjs tu@correo.com "una-contraseña-larga" --remote
```

Y para publicar la web y la API:

```bash
npm run deploy
```

Cloudflare devuelve una URL `*.workers.dev`; el dominio propio se añade en *Workers & Pages → barberia-segorbe → Settings → Domains*. Después, entrar en `/admin/login` → **Configuración** (horario real, datos legales, enlace de reseñas) y **Servicios** (precios y duraciones).

Si el esquema cambia en el futuro: `npm run db:migrate` aplica las migraciones nuevas de `migrations/`.

## Desarrollo local

```bash
npm run db:migrate:local                                   # crea la D1 local con esquema y datos
node scripts/create-owner.mjs dueno@prueba.es "clave-de-prueba-1"
npm run build && npm run dev:api                           # web + API en http://localhost:8787
```

(`npm run dev` arranca Vite con recarga en caliente y reenvía `/api` al Worker local de `dev:api`.)

## Cómo funciona la identidad del cliente

- **Sin cuenta (invitado):** nombre + teléfono. Un teléfono = un cliente. El dispositivo guarda un token secreto y la web **lo reconoce** (saludo, datos rellenados, *Mis citas*, cambiar y cancelar).
- **Con cuenta (email + contraseña):** además ve y gestiona sus citas desde cualquier móvil; al crearla se vincula el historial del dispositivo.
- **El teléfono no es una contraseña:** teclear el teléfono de otra persona no da acceso a sus citas ni a sus datos. Si alguien con historial intenta crear cuenta sin ser reconocido, se le pide entrar desde su móvil o llamar.
- El panel marca **Habitual** (3+ visitas completadas) y **Cuenta**. Cancelar/cambiar: hasta X horas antes (Configuración); un cambio vuelve a *pendiente*.
- Las cuentas de cliente **no verifican el email** (no hay servicio de correo conectado): el email no sirve como prueba de identidad ni da acceso a datos de nadie más.

## Seguridad

- La D1 solo es accesible desde el Worker. Las rutas `/api/admin/*` exigen sesión de personal; una cuenta de cliente recibe 403.
- Sesiones: token aleatorio en cookie `HttpOnly; SameSite=Lax; Secure`; en la base de datos solo se guarda su hash (SHA-256). Contraseñas: PBKDF2-SHA256 con sal. Límite de intentos en login, alta y reservas. Protección CSRF por comprobación de origen.
- La agenda es **atómica**: los triggers de D1 rechazan solapes (según capacidad y margen) y bloqueos dentro de la propia sentencia; D1 serializa las escrituras. Probado con 8 reservas simultáneas al mismo hueco → 1 aceptada.
- Datos de clientes, citas, pagos y gastos nunca salen en rutas públicas.

## Reglas de negocio

- Una reserva web nace **Pendiente**; nunca se muestra como confirmada hasta que el propietario la confirma.
- Los **ingresos** solo existen cuando se registra un cobro; una cita reservada no suma. No es un programa de contabilidad ni de facturación certificada.
- Sin precio configurado, la web muestra «Consultar precio». No hay precios, nombres, testimonios ni cifras inventados.
- WhatsApp: enlaces `wa.me` con mensaje predefinido; lo envía el usuario, no el sistema.

## Pendiente de datos del negocio

- Horario definitivo y días de apertura (se carga 10:00–20:30 de lunes a sábado como **referencia no verificada**; el panel lo avisa hasta que se guarda).
- Precios y duraciones; URL de reseñas de Google; datos fiscales para los textos legales (revisar con un profesional).
- Fotografías: hoy son de Unsplash (`src/lib/images.js` y el campo imagen de cada servicio); conviene sustituirlas por fotos reales del local.
- Avisos automáticos por email/WhatsApp: no implementados (requieren proveedor y consentimiento); el panel muestra las solicitudes pendientes.
