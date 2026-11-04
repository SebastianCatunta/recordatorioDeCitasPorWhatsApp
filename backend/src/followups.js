import { dateInZone } from './calendar.js';
import { cleanHtml, parseSession } from './sessions.js';
import { normalizePhone } from './phone.js';

function daysBetween(fromDate, toDate) {
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

// citas: resultado de allAppointments(). Devuelve los pacientes "por retomar",
// del que lleva más días sin volver al que menos.
export function findFollowups(citas, ahora, { timezone, countryCode, minDays }) {
  const hoy = dateInZone(ahora, timezone);
  const porPaciente = new Map();

  for (const cita of citas) {
    const telefono = normalizePhone(cleanHtml(cita.descripcion), countryCode);
    if (!telefono) continue;
    if (!porPaciente.has(telefono)) porPaciente.set(telefono, []);
    porPaciente.get(telefono).push(cita);
  }

  const resultado = [];
  for (const [telefono, lista] of porPaciente) {
    if (lista.some((cita) => cita.inicio > ahora)) continue; // ya tiene próxima cita
    const pasadas = lista.filter((cita) => cita.inicio <= ahora);
    if (pasadas.length === 0) continue;
    const ultima = pasadas.reduce((a, b) => (b.inicio > a.inicio ? b : a));
    const sesion = parseSession(ultima.descripcion);
    if (!sesion || sesion.actual >= sesion.total) continue;
    const diasSinVolver = daysBetween(ultima.fecha, hoy);
    if (diasSinVolver < minDays) continue;
    resultado.push({ telefono, nombre: ultima.nombre, ultimaCita: ultima.fecha, diasSinVolver, sesion });
  }
  return resultado.sort((a, b) => b.diasSinVolver - a.diasSinVolver);
}
