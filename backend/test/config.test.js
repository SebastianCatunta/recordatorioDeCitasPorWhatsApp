import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

const base = {
  GOOGLE_CALENDAR_ICAL_URL: 'https://calendar.google.com/calendar/ical/x/private-abc/basic.ics',
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  CLINIC_NAME: 'Consultorio',
  CLINIC_TIMEZONE: 'America/La_Paz',
  DEFAULT_COUNTRY_CODE: '591',
  PATIENT_ID_SECRET: 'secreto-largo',
};

test('en desarrollo arranca sin ACCESS_PASSWORD', () => {
  const config = loadConfig(base);
  assert.equal(config.production, false);
  assert.equal(config.accessPassword, '');
  assert.equal(config.accessUser, 'asistente');
  assert.equal(config.trustProxy, 0);
});

test('en producción falla sin ACCESS_PASSWORD y dice qué variable falta', () => {
  assert.throws(() => loadConfig({ ...base, NODE_ENV: 'production' }), /ACCESS_PASSWORD/);
});

test('en producción rechaza una clave corta', () => {
  assert.throws(
    () => loadConfig({ ...base, NODE_ENV: 'production', ACCESS_PASSWORD: 'corta123' }),
    /demasiado corta/
  );
});

test('en producción acepta una clave de 12 caracteres o más', () => {
  const config = loadConfig({
    ...base,
    NODE_ENV: 'production',
    ACCESS_PASSWORD: '123456789012',
    ACCESS_USER: 'revisor',
    TRUST_PROXY: '1',
  });
  assert.equal(config.production, true);
  assert.equal(config.accessUser, 'revisor');
  assert.equal(config.trustProxy, 1);
});

test('el mensaje de error no incluye el valor de la clave', () => {
  try {
    loadConfig({ ...base, NODE_ENV: 'production', ACCESS_PASSWORD: 'corta123' });
    assert.fail('debía lanzar');
  } catch (error) {
    assert.ok(!error.message.includes('corta123'));
  }
});

test('TRUST_PROXY inválido usa 0', () => {
  assert.equal(loadConfig({ ...base, TRUST_PROXY: 'abc' }).trustProxy, 0);
  assert.equal(loadConfig({ ...base, TRUST_PROXY: '-1' }).trustProxy, 0);
});

test('faltantes de siempre siguen indicando la variable', () => {
  assert.throws(() => loadConfig({ ...base, DATABASE_URL: '' }), /DATABASE_URL/);
});
