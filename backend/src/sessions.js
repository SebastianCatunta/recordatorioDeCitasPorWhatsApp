const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

// Las descripciones del iCal de Google pueden traer HTML (<br>, <code>, &nbsp;...).
export function cleanHtml(text) {
  return String(text ?? '')
    .replace(/<br\s*\/?>|<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, name) => {
      if (name[0] === '#') {
        const hex = name[1].toLowerCase() === 'x';
        const code = parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return ENTITIES[name.toLowerCase()] ?? match;
    })
    .replace(/ /g, ' ');
}

const SESSION_LINE = /sesi[oó]n\s*:?\s*(\d+)\s*de\s*(\d+)/i;

// Devuelve { actual, total } o null si no hay una línea "Sesión: X de Y" válida.
export function parseSession(description) {
  const match = cleanHtml(description).match(SESSION_LINE);
  if (!match) return null;
  const actual = Number(match[1]);
  const total = Number(match[2]);
  if (actual < 1 || total < 1 || actual > total) return null;
  return { actual, total };
}
