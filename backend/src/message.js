// fecha: "YYYY-MM-DD". Se formatea en UTC para que la zona horaria del servidor no cambie el día.
export function formatDay(fecha) {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function buildMessage({ nombre, fecha, hora, consultorio }) {
  return `Hola ${nombre}, le recordamos su cita en ${consultorio} el ${formatDay(fecha)} a las ${hora}. ¿Nos confirma su asistencia? Gracias.`;
}

export function buildWhatsappLink({ telefono, ...datos }) {
  if (!telefono) return null;
  return `https://wa.me/${telefono}?text=${encodeURIComponent(buildMessage(datos))}`;
}
