const PHONE_CANDIDATE = /\+?\d[\d\s().-]{7,}\d/;

// Devuelve el teléfono solo con dígitos y código de país, o null si no es válido.
export function normalizePhone(text, defaultCountryCode) {
  if (!text) return null;
  const match = String(text).match(PHONE_CANDIDATE);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, '');
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}
