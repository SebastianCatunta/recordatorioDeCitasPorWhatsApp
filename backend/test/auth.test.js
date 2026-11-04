import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startApp, rawRequest, basic } from './helpers.js';
import { createAttemptLimiter } from '../src/auth.js';

const ics = await readFile(new URL('./fixtures/ejemplo.ics', import.meta.url), 'utf8');
const PASSWORD = 'una-clave-bien-larga-123';
const servers = [];

async function app(extra = {}) {
  const clock = { ms: Date.parse('2026-11-04T12:00:00Z') };
  const attemptLimiter = createAttemptLimiter({ now: () => clock.ms });
  const server = await startApp({
    config: { accessUser: 'asistente', accessPassword: PASSWORD, attemptLimiter, ...extra },
    getIcal: async () => ics,
  });
  servers.push(server);
  return { server, clock };
}
after(() => servers.forEach((server) => server.close()));

const good = basic('asistente', PASSWORD);
const wrong = (i) => ({ Authorization: basic('asistente', `mal${i}`) });

test('sin clave todo responde 401: panel, API y escrituras', async () => {
  const { server } = await app();
  for (const [method, path] of [
    ['GET', '/'],
    ['GET', '/api/recordatorios'],
    ['GET', '/api/seguimientos'],
    ['POST', '/api/recordatorios/x/enviado'],
    ['POST', '/api/seguimientos/x/enviado'],
    ['GET', '/api/desconocida'],
  ]) {
    const response = await rawRequest(server, { method, path });
    assert.equal(response.status, 401, `${method} ${path}`);
    assert.match(response.headers['www-authenticate'], /^Basic realm=/);
  }
});

test('/api/salud responde 200 sin clave', async () => {
  const { server } = await app();
  assert.equal((await rawRequest(server, { path: '/api/salud' })).status, 200);
});

test('clave y usuario correctos dan acceso', async () => {
  const { server } = await app();
  const response = await rawRequest(server, {
    path: '/api/recordatorios?fecha=2026-11-04',
    headers: { Authorization: good },
  });
  assert.equal(response.status, 200);
});

test('clave incorrecta, usuario incorrecto y cabeceras mal formadas dan 401, nunca 500', async () => {
  // Cada intento sale de una IP distinta para no activar el bloqueo de la prueba siguiente.
  const { server } = await app({ trustProxy: 1 });
  const malas = [
    basic('asistente', 'otra-clave'),
    basic('otro', PASSWORD),
    basic('asistente', ''),
    basic('', ''),
    'Basic',
    'Basic ',
    'Basic !!!no-es-base64!!!',
    `Basic ${Buffer.from('sin-dos-puntos').toString('base64')}`,
    `Bearer ${PASSWORD}`,
    'basic abc',
    `Basic ${'A'.repeat(5000)}`,
  ];
  for (const [i, authorization] of malas.entries()) {
    const response = await rawRequest(server, {
      path: '/api/recordatorios',
      headers: { Authorization: authorization, 'X-Forwarded-For': `10.0.0.${i}` },
    });
    assert.equal(response.status, 401, authorization.slice(0, 40));
  }
});

test('el 401 no revela si falló el usuario o la clave', async () => {
  const { server } = await app();
  const wrongUser = await rawRequest(server, { path: '/', headers: { Authorization: basic('otro', PASSWORD) } });
  const wrongPass = await rawRequest(server, { path: '/', headers: { Authorization: basic('asistente', 'x') } });
  assert.equal(wrongUser.body, wrongPass.body);
});

test('el intento fallido número 11 responde 429 con Retry-After, incluso con la clave correcta', async () => {
  const { server } = await app();
  for (let i = 1; i <= 10; i += 1) {
    const response = await rawRequest(server, { path: '/', headers: wrong(i) });
    assert.equal(response.status, 401, `intento ${i}`);
  }
  const blocked = await rawRequest(server, { path: '/', headers: wrong(11) });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers['retry-after']) > 0);
  const withGoodKey = await rawRequest(server, { path: '/api/recordatorios', headers: { Authorization: good } });
  assert.equal(withGoodKey.status, 429);
});

test('pedir la clave sin enviar credenciales no cuenta como intento', async () => {
  const { server } = await app();
  for (let i = 0; i < 30; i += 1) await rawRequest(server, { path: '/' });
  const response = await rawRequest(server, { path: '/api/recordatorios', headers: { Authorization: good } });
  assert.equal(response.status, 200);
});

test('pasada la ventana de 15 minutos el contador se reinicia', async () => {
  const { server, clock } = await app();
  for (let i = 0; i < 11; i += 1) await rawRequest(server, { path: '/', headers: wrong(i) });
  assert.equal((await rawRequest(server, { path: '/api/recordatorios', headers: { Authorization: good } })).status, 429);
  clock.ms += 15 * 60 * 1000 + 1;
  assert.equal((await rawRequest(server, { path: '/api/recordatorios', headers: { Authorization: good } })).status, 200);
});

test('con TRUST_PROXY=1 cada IP real (X-Forwarded-For) se cuenta por separado', async () => {
  const { server } = await app({ trustProxy: 1 });
  for (let i = 0; i < 10; i += 1) {
    await rawRequest(server, { path: '/', headers: { 'X-Forwarded-For': '1.1.1.1', ...wrong(i) } });
  }
  const blocked = await rawRequest(server, { path: '/', headers: { 'X-Forwarded-For': '1.1.1.1', Authorization: good } });
  assert.equal(blocked.status, 429);
  const other = await rawRequest(server, {
    path: '/api/recordatorios',
    headers: { 'X-Forwarded-For': '2.2.2.2', Authorization: good },
  });
  assert.equal(other.status, 200);
});

test('sin TRUST_PROXY un X-Forwarded-For falso no evita el bloqueo', async () => {
  const { server } = await app({ trustProxy: 0 });
  for (let i = 0; i < 10; i += 1) {
    await rawRequest(server, { path: '/', headers: { 'X-Forwarded-For': `9.9.9.${i}`, ...wrong(i) } });
  }
  const response = await rawRequest(server, { path: '/', headers: { 'X-Forwarded-For': '8.8.8.8', Authorization: good } });
  assert.equal(response.status, 429);
});

test('el contador no crece más del tope de entradas', () => {
  const limiter = createAttemptLimiter({ maxEntries: 50, now: () => 1000 });
  for (let i = 0; i < 500; i += 1) limiter.fail(`ip-${i}`);
  assert.ok(limiter.size <= 50, `tamaño ${limiter.size}`);
});

test('sin ACCESS_PASSWORD (desarrollo) no se pide clave', async () => {
  const server = await startApp({ config: {}, getIcal: async () => ics });
  servers.push(server);
  assert.equal((await rawRequest(server, { path: '/api/recordatorios?fecha=2026-11-04' })).status, 200);
});
