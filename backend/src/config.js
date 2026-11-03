import 'dotenv/config';

const REQUIRED = [
  'GOOGLE_CALENDAR_ICAL_URL',
  'DATABASE_URL',
  'CLINIC_NAME',
  'CLINIC_TIMEZONE',
  'DEFAULT_COUNTRY_CODE',
];

export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno: ${missing.join(', ')}. Revisa backend/.env (ejemplo en backend/.env.example).`
    );
  }
  return {
    icalUrl: env.GOOGLE_CALENDAR_ICAL_URL,
    databaseUrl: env.DATABASE_URL,
    clinicName: env.CLINIC_NAME,
    timezone: env.CLINIC_TIMEZONE,
    countryCode: env.DEFAULT_COUNTRY_CODE,
    port: Number(env.PORT) || 3001,
  };
}
