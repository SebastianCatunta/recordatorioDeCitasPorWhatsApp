import ical from 'node-ical';

export async function fetchIcal(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo leer el calendario (HTTP ${response.status}).`);
  }
  return response.text();
}

function dateInZone(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function timeInZone(date, timezone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function tomorrowInZone(timezone, now = new Date()) {
  return dateInZone(new Date(now.getTime() + 24 * 60 * 60 * 1000), timezone);
}

// Devuelve las citas de `fecha` ("YYYY-MM-DD", en la zona del consultorio), ordenadas por hora.
export function appointmentsForDate(icsText, fecha, timezone) {
  const parsed = ical.sync.parseICS(icsText);
  return Object.values(parsed)
    .filter((event) => event.type === 'VEVENT' && event.start && event.datetype !== 'date')
    .filter((event) => event.status !== 'CANCELLED')
    .filter((event) => dateInZone(event.start, timezone) === fecha)
    .map((event) => ({
      uid: event.uid,
      nombre: String(event.summary ?? '').trim() || 'Paciente',
      descripcion: String(event.description ?? ''),
      hora: timeInZone(event.start, timezone),
      inicio: event.start,
    }))
    .sort((a, b) => a.inicio - b.inicio);
}
