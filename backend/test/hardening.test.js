import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, rawRequest, basic } from './helpers.js';

const servers = [];
async function app(options) {
  const server = await startApp(options);
  servers.push(server);
  return server;
}
after(() => servers.forEach((server) => server.close()));

const json = { 'Content-Type': 'application/json' };

test('un cuerpo de más de 10 KB responde 413 con mensaje amable', async () => {
  const server = await app();
  const body = JSON.stringify({ fecha: 'a'.repeat(11_000) });
  const response = await rawRequest(server, {
    method: 'POST',
    path: '/api/recordatorios/x/enviado',
    headers: { ...json, 'Content-Length': Buffer.byteLength(body) },
    body,
  });
  assert.equal(response.status, 413);
  assert.match(JSON.parse(response.body).error, /demasiado grandes/);
});

test('un JSON mal formado responde 400 sin detalles técnicos', async () => {
  const server = await app();
  const body = '{"fecha": ';
  const response = await rawRequest(server, {
    method: 'POST',
    path: '/api/recordatorios/x/enviado',
    headers: { ...json, 'Content-Length': Buffer.byteLength(body) },
    body,
  });
  assert.equal(response.status, 400);
  assert.ok(!/SyntaxError|Unexpected|position/i.test(response.body));
});

test('un eventUid de más de 256 caracteres responde 400', async () => {
  const server = await app();
  const body = JSON.stringify({ fecha: '2026-11-04' });
  const response = await rawRequest(server, {
    method: 'POST',
    path: `/api/recordatorios/${'a'.repeat(300)}/enviado`,
    headers: { ...json, 'Content-Length': Buffer.byteLength(body) },
    body,
  });
  assert.equal(response.status, 400);
});

test('una ruta /api desconocida responde 404 en JSON', async () => {
  const server = await app();
  const response = await rawRequest(server, { path: '/api/desconocida' });
  assert.equal(response.status, 404);
  assert.match(response.headers['content-type'], /application\/json/);
});

test('en producción un error con URL y clave dentro no se filtra ni a la respuesta ni al registro', async () => {
  const secretos = ['private-abc12345', 'clave-secreta-xyz', 'postgres://u:p@host/db'];
  const server = await app({
    config: { production: true, trustProxy: 1, accessUser: 'asistente', accessPassword: 'una-clave-bien-larga-123' },
    getIcal: async () => {
      throw new Error(
        `fallo ${secretos[0]} en https://calendar.google.com/calendar/ical/x/${secretos[0]}/basic.ics ${secretos[1]} ${secretos[2]}`
      );
    },
  });

  const registrado = [];
  const original = console.error;
  console.error = (...args) => registrado.push(args.map(String).join(' '));
  let response;
  try {
    response = await rawRequest(server, {
      path: '/api/recordatorios?fecha=2026-11-04',
      headers: {
        Authorization: basic('asistente', 'una-clave-bien-larga-123'),
        Host: 'demo.onrender.com',
        'X-Forwarded-Proto': 'https',
      },
    });
  } finally {
    console.error = original;
  }

  assert.equal(response.status, 500);
  assert.ok(registrado.length > 0, 'debe registrar algo');
  for (const secreto of secretos) {
    assert.ok(!response.body.includes(secreto), `la respuesta filtra ${secreto}`);
    assert.ok(!registrado.join('\n').includes(secreto), `el registro filtra ${secreto}`);
  }
  assert.ok(!registrado.join('\n').includes('calendar.google.com'));
});

test('CORS: en producción no hay cabeceras CORS; en desarrollo sí para localhost', async () => {
  const origin = 'http://localhost:5173';
  const prod = await app({ config: { production: true, trustProxy: 1 } });
  const resProd = await rawRequest(prod, {
    path: '/api/salud',
    headers: { Origin: origin, Host: 'demo.onrender.com', 'X-Forwarded-Proto': 'https' },
  });
  assert.equal(resProd.headers['access-control-allow-origin'], undefined);

  const dev = await app();
  const resDev = await rawRequest(dev, { path: '/api/desconocida', headers: { Origin: origin } });
  assert.equal(resDev.headers['access-control-allow-origin'], origin);
});
