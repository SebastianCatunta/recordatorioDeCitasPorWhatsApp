import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { allAppointments } from '../src/calendar.js';
import { findFollowups } from '../src/followups.js';

const ics = await readFile(new URL('./fixtures/seguimientos.ics', import.meta.url), 'utf8');
const TZ = 'America/La_Paz';
const AHORA = new Date('2026-11-10T15:00:00Z'); // 11:00 del 10 de noviembre en La Paz
const config = { timezone: TZ, countryCode: '591', minDays: 1 };

const citas = allAppointments(ics, TZ);
const lista = findFollowups(citas, AHORA, config);
const nombres = lista.map((item) => item.nombre);

test('allAppointments devuelve todas las citas, pasadas y futuras', () => {
  assert.equal(citas.length, 10);
  assert.ok(citas.some((c) => c.inicio > AHORA));
  assert.ok(citas.some((c) => c.inicio < AHORA));
});

test('CA1: sesión 2 de 3, sin cita futura y con días de espera, aparece', () => {
  const ana = lista.find((item) => item.nombre === 'Ana Torres');
  assert.ok(ana);
  assert.deepEqual(ana.sesion, { actual: 2, total: 3 });
  assert.equal(ana.ultimaCita, '2026-11-05');
  assert.equal(ana.diasSinVolver, 5);
});

test('CA1: con exactamente 1 día de espera también aparece (descripción con HTML)', () => {
  const fabio = lista.find((item) => item.nombre === 'Fabio Luna');
  assert.ok(fabio);
  assert.equal(fabio.diasSinVolver, 1);
});

test('CA1 (límite): una cita de hoy no aparece todavía', () => {
  assert.ok(!nombres.includes('Gina Vera'));
});

test('CA2: con una cita futura agendada no aparece', () => {
  assert.ok(!nombres.includes('Beto Rios'));
});

test('CA3: sesión 3 de 3 no aparece', () => {
  assert.ok(!nombres.includes('Carla Mena'));
});

test('CA4: una cita sin línea de sesión no genera seguimiento', () => {
  assert.ok(!nombres.includes('Dario Soto'));
});

test('CA8: sin teléfono válido no aparece', () => {
  assert.ok(!nombres.includes('Elena Paz'));
});

test('el mismo paciente con el nombre escrito distinto aparece una sola vez, con los datos de la última cita', () => {
  const hugo = lista.filter((item) => item.telefono === '59170000008');
  assert.equal(hugo.length, 1);
  assert.equal(hugo[0].nombre, 'Hugo P.');
  assert.deepEqual(hugo[0].sesion, { actual: 2, total: 3 });
});

test('se ordena del que lleva más días sin volver al que menos', () => {
  assert.deepEqual(nombres, ['Hugo P.', 'Ana Torres', 'Fabio Luna']);
});

test('con minDays = 2 no aparece quien lleva 1 día', () => {
  const resultado = findFollowups(citas, AHORA, { ...config, minDays: 2 });
  assert.ok(!resultado.some((item) => item.nombre === 'Fabio Luna'));
});
