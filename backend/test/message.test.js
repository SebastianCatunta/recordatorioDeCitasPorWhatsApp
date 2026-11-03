import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsappLink, formatDay } from '../src/message.js';

const datos = {
  telefono: '525512345678',
  nombre: 'Luis Pérez',
  fecha: '2026-11-04',
  hora: '09:00',
  consultorio: 'Consultorio Dental Sonrisa',
};

test('el día se escribe en español', () => {
  assert.equal(formatDay('2026-11-04'), 'miércoles, 4 de noviembre');
});

test('el enlace apunta al chat del paciente y el mensaje incluye nombre, día, hora y consultorio', () => {
  const link = buildWhatsappLink(datos);
  const url = new URL(link);
  assert.equal(url.origin + url.pathname, 'https://wa.me/525512345678');
  const texto = url.searchParams.get('text');
  assert.match(texto, /Luis Pérez/);
  assert.match(texto, /miércoles, 4 de noviembre/);
  assert.match(texto, /09:00/);
  assert.match(texto, /Consultorio Dental Sonrisa/);
  assert.match(texto, /¿Nos confirma su asistencia\?/);
});

test('sin teléfono no hay enlace', () => {
  assert.equal(buildWhatsappLink({ ...datos, telefono: null }), null);
});
