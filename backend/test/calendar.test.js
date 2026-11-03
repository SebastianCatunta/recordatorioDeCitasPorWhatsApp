import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { appointmentsForDate, tomorrowInZone } from '../src/calendar.js';

const ics = await readFile(new URL('./fixtures/ejemplo.ics', import.meta.url), 'utf8');
const TZ = 'America/Mexico_City';

test('devuelve solo las citas de la fecha, ordenadas por hora', () => {
  const citas = appointmentsForDate(ics, '2026-11-04', TZ);
  assert.deepEqual(
    citas.map((c) => [c.nombre, c.hora]),
    [
      ['Luis Pérez', '09:00'],
      ['María Gómez', '11:00'],
      ['Ana Torres', '15:00'],
      ['Sofía Vega', '22:00'],
    ]
  );
});

test('usa la zona horaria del consultorio: 04:00 UTC del día 5 es la noche del día 4', () => {
  const citas = appointmentsForDate(ics, '2026-11-05', TZ);
  assert.deepEqual(citas.map((c) => c.nombre), ['Pedro Ruiz']);
});

test('una fecha sin citas devuelve lista vacía', () => {
  assert.deepEqual(appointmentsForDate(ics, '2026-12-01', TZ), []);
});

test('mañana se calcula en la zona del consultorio', () => {
  const now = new Date('2026-11-04T03:00:00Z'); // 21:00 del día 3 en Ciudad de México
  assert.equal(tomorrowInZone(TZ, now), '2026-11-04');
});
