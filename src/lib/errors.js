const CODES = {
  SLOT_TAKEN: 'Ese horario ya no está disponible. Elige otra hora, por favor.',
  SLOT_BLOCKED: 'Ese horario está bloqueado en la agenda.',
  PRIVACY_REQUIRED: 'Debes aceptar la política de privacidad para continuar.',
  INVALID_NAME: 'Indica tu nombre (mínimo 2 caracteres).',
  INVALID_PHONE: 'El teléfono no parece válido. Revisa el número.',
  INVALID_EMAIL: 'El email no parece válido.',
  INVALID_NOTES: 'Las notas son demasiado largas (máximo 500 caracteres).',
  INVALID_SERVICE: 'Ese servicio ya no está disponible.',
  BOOKING_DISABLED: 'La reserva online está desactivada temporalmente. Escríbenos por WhatsApp.',
  TOO_MANY_PENDING: 'Ya tienes solicitudes pendientes. Contacta con la barbería para gestionarlas.',
  NOT_FOUND: 'No encontramos esa cita. Revisa el enlace o llámanos.',
  CANNOT_MODIFY: 'Esta cita ya no se puede cambiar por la web. Llámanos y lo resolvemos.',
  DUPLICATE: 'Ya existe una solicitud para ese horario.',
}

/** Traduce errores de Supabase/PostgreSQL a mensajes comprensibles */
export function friendlyError(error) {
  if (!error) return ''
  const msg = error.message || String(error)
  const code = Object.keys(CODES).find((c) => msg.includes(c))
  if (code) return CODES[code]
  if (error.code === '23505') {
    if (msg.includes('customers_phone')) return 'Ya existe un cliente con ese teléfono.'
    if (msg.includes('payments_one_paid')) return 'Esta cita ya tiene un cobro registrado.'
    return 'Ese registro ya existe.'
  }
  if (error.code === '23503') return 'No se puede eliminar porque tiene datos asociados (por ejemplo, citas). Puedes desactivarlo.'
  if (error.code === '23514') return 'Algún dato no es válido. Revisa el formulario.'
  if (error.code === '42501' || msg.includes('permission denied')) return 'No tienes permiso para realizar esta acción.'
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return 'Sin conexión. Comprueba tu internet e inténtalo de nuevo.'
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'
}
