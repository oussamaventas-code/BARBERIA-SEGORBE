import { useBusiness } from '../../context/BusinessContext'

function Doc({ title, children }) {
  return (
    <section className="bg-obsidian pb-24 pt-32 sm:pt-40">
      <article className="mx-auto max-w-3xl px-4 sm:px-6 [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-white [&_li]:mb-1.5 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-white/70 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-white/70">
        <p className="label-mono mb-4">Información legal</p>
        <h1 className="mb-10 text-4xl font-semibold tracking-tightest text-white sm:text-5xl">{title}</h1>
        {children}
        <p className="mt-12 rounded-2xl border border-champagne/25 bg-champagne/5 p-4 text-sm text-white/70">
          Texto base orientativo. Antes de publicar, el titular debe completar sus datos fiscales en el panel (Configuración) y revisarlo con un profesional jurídico.
        </p>
      </article>
    </section>
  )
}

const useOwner = () => {
  const { settings: s } = useBusiness()
  return {
    s,
    owner: s.legal_owner_name || '[Nombre o razón social del titular — pendiente de completar]',
    taxId: s.legal_tax_id || '[NIF/CIF — pendiente de completar]',
    email: s.legal_email || s.email || '[Email de contacto — pendiente de completar]',
  }
}

export function PrivacyPage() {
  const { s, owner, taxId, email } = useOwner()
  return (
    <Doc title="Política de privacidad">
      <h2>1. Responsable del tratamiento</h2>
      <p>{owner} · {taxId}<br />{s.address}<br />Teléfono: {s.phone} · Email: {email}</p>
      <h2>2. Qué datos tratamos y para qué</h2>
      <ul>
        <li><strong>Solicitud de reserva:</strong> nombre, teléfono, email (opcional) y notas (opcionales), para gestionar tu cita y contactarte sobre ella.</li>
        <li><strong>Gestión de clientes:</strong> historial de citas y servicios para prestar el servicio y llevar el control interno del negocio.</li>
      </ul>
      <h2>3. Base jurídica</h2>
      <p>Ejecución de la relación que solicitas (reserva y prestación del servicio) y, en su caso, tu consentimiento al aceptar esta política en el formulario. No realizamos envíos comerciales sin tu consentimiento expreso.</p>
      <h2>4. Conservación</h2>
      <p>Conservaremos tus datos mientras mantengas relación con el negocio y, después, durante los plazos legales aplicables.</p>
      <h2>5. Destinatarios</h2>
      <p>No cedemos datos a terceros salvo obligación legal. Utilizamos como encargado del tratamiento al proveedor de infraestructura (Supabase) para alojar la base de datos.</p>
      <h2>6. Tus derechos</h2>
      <p>Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {email} o llamando al {s.phone}, indicando tu nombre y teléfono. Atenderemos tu solicitud en el plazo máximo de un mes. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).</p>
    </Doc>
  )
}

export function LegalNoticePage() {
  const { s, owner, taxId, email } = useOwner()
  return (
    <Doc title="Aviso legal">
      <h2>Titular del sitio web</h2>
      <p>{owner}<br />NIF/CIF: {taxId}<br />Domicilio: {s.address}<br />Email: {email} · Teléfono: {s.phone}</p>
      <h2>Condiciones de uso</h2>
      <p>El acceso a este sitio implica la aceptación de estas condiciones. Las solicitudes de reserva realizadas a través de la web no constituyen una cita confirmada hasta que Barbería Segorbe la confirme expresamente.</p>
      <h2>Propiedad intelectual</h2>
      <p>Los contenidos, diseño y marca son propiedad del titular o se usan con licencia. Las fotografías proceden de Unsplash bajo su licencia.</p>
    </Doc>
  )
}

export function CookiesPage() {
  return (
    <Doc title="Política de cookies">
      <h2>Uso de cookies</h2>
      <p>Este sitio <strong>no utiliza cookies analíticas, publicitarias ni de seguimiento</strong>. Solo se emplea almacenamiento técnico estrictamente necesario: la sesión de acceso al panel privado (solo para el personal autorizado).</p>
      <p>Las fuentes tipográficas se sirven desde el propio sitio. El mapa de la página de contacto es un contenido incrustado de Google Maps que se carga al visitar esa página y puede establecer sus propias cookies según su política.</p>
      <p>Si en el futuro se incorporan cookies no esenciales, se solicitará tu consentimiento previo.</p>
    </Doc>
  )
}
