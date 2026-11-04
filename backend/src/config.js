import 'dotenv/config';

const REQUIRED = [
  'GOOGLE_CALENDAR_ICAL_URL',
  'DATABASE_URL',
  'CLINIC_NAME',
  'CLINIC_TIMEZONE',
  'DEFAULT_COUNTRY_CODE',
  'PATIENT_ID_SECRET',
];

function nonNegativeInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

const MIN_PASSWORD_LENGTH = 12;

export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno: ${missing.join(', ')}. Revisa backend/.env (ejemplo en backend/.env.example).`
    );
  }

  const production = env.NODE_ENV === 'production';
  const accessPassword = env.ACCESS_PASSWORD ?? '';
  if (production && !accessPassword) {
    throw new Error(
      'Falta la variable de entorno ACCESS_PASSWORD. En producción es obligatoria para que el panel no quede abierto.'
    );
  }
  if (production && accessPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `ACCESS_PASSWORD es demasiado corta: usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    );
  }

  return {
    production,
    accessPassword,
    accessUser: env.ACCESS_USER || 'asistente',
    trustProxy: nonNegativeInt(env.TRUST_PROXY, 0),
    icalUrl: env.GOOGLE_CALENDAR_ICAL_URL,
    databaseUrl: env.DATABASE_URL,
    clinicName: env.CLINIC_NAME,
    timezone: env.CLINIC_TIMEZONE,
    countryCode: env.DEFAULT_COUNTRY_CODE,
    port: Number(env.PORT) || 3001,
    dentistName: env.DENTIST_NAME || '',
    patientIdSecret: env.PATIENT_ID_SECRET,
    followupMinDays: nonNegativeInt(env.FOLLOWUP_MIN_DAYS, 1),
    followupResendDays: nonNegativeInt(env.FOLLOWUP_RESEND_DAYS, 3),
  };
}
