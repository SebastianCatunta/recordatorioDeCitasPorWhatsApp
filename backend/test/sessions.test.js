import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSession, cleanHtml } from '../src/sessions.js';

test('lee "Sesión: 2 de 3"', () => {
  assert.deepEqual(parseSession('Sesión: 2 de 3'), { actual: 2, total: 3 });
});

test('acepta sin tilde y sin importar mayúsculas', () => {
  assert.deepEqual(parseSession('sesion 2 de 3'), { actual: 2, total: 3 });
  assert.deepEqual(parseSession('SESIÓN: 1 DE 2'), { actual: 1, total: 2 });
});

test('la encuentra dentro de un texto con teléfono', () => {
  assert.deepEqual(parseSession('+591 70000001\nSesión: 2 de 3\nTraer estudios'), { actual: 2, total: 3 });
});

test('sin la línea devuelve nulo', () => {
  assert.equal(parseSession('+591 70000001'), null);
  assert.equal(parseSession(''), null);
  assert.equal(parseSession(undefined), null);
});

test('valores imposibles devuelven nulo', () => {
  assert.equal(parseSession('Sesión: 4 de 3'), null);
  assert.equal(parseSession('Sesión: 0 de 3'), null);
});

test('limpia HTML de Google Calendar', () => {
  const html = '<code>+591 70000003</code><br><code>Sesión: 1 de 2</code>';
  assert.deepEqual(parseSession(html), { actual: 1, total: 2 });
  assert.equal(cleanHtml(html), '+591 70000003\nSesión: 1 de 2');
});

test('decodifica entidades como &nbsp;', () => {
  assert.deepEqual(parseSession('Sesión:&nbsp;2 de 3'), { actual: 2, total: 3 });
  assert.deepEqual(parseSession('Sesi&oacute;n: 2 de 3<br>x'), null); // entidad desconocida: se trata como cita suelta
});
