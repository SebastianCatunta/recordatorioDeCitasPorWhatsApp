import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFollowupMessage, buildFollowupLink } from '../src/message.js';

const datos = {
  nombre: 'Ana Torres',
  siguienteSesion: 3,
  consultorio: 'Consultorio Dental Sonrisa',
  dentista: 'la Dra. Laura',
};

test('el mensaje incluye nombre, consultorio, dentista y la siguiente sesión', () => {
  const texto = buildFollowupMessage(datos);
  assert.match(texto, /Ana Torres/);
  assert.match(texto, /Consultorio Dental Sonrisa, de la Dra\. Laura/);
  assert.match(texto, /sesión 3 de su tratamiento/);
});

test('si no hay dentista configurado, lo omite', () => {
  const texto = buildFollowupMessage({ ...datos, dentista: '' });
  assert.ok(!texto.includes(', de '));
  assert.match(texto, /consultorio Consultorio Dental Sonrisa\./);
});

test('no menciona ningún tipo de tratamiento', () => {
  const texto = buildFollowupMessage(datos).toLowerCase();
  for (const palabra of ['endodoncia', 'ortodoncia', 'caries', 'conducto', 'dolor']) {
    assert.ok(!texto.includes(palabra), palabra);
  }
});

test('el enlace codifica tildes, espacios y signos de interrogación', () => {
  const enlace = buildFollowupLink({ ...datos, telefono: '59170000001' });
  assert.match(enlace, /^https:\/\/wa\.me\/59170000001\?text=/);
  assert.ok(!enlace.includes(' '));
  const texto = decodeURIComponent(enlace.split('?text=')[1]);
  assert.equal(texto, buildFollowupMessage(datos));
});

test('sin teléfono no hay enlace', () => {
  assert.equal(buildFollowupLink({ ...datos, telefono: null }), null);
});
