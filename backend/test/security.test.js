import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, rawRequest } from './helpers.js';

const servers = [];
async function app(config) {
  const server = await startApp({ config });
  servers.push(server);
  return server;
}
after(() => servers.forEach((server) => server.close()));

const production = { production: true, trustProxy: 1 };

test('las cabeceras de seguridad están en las respuestas y no hay X-Powered-By', async () => {
  const server = await app({});
  for (const path of ['/api/salud', '/api/desconocida']) {
    const response = await rawRequest(server, { path });
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['referrer-policy'], 'no-referrer');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.equal(response.headers['x-powered-by'], undefined);
  }
});

test('las respuestas de la API no se guardan en caché', async () => {
  const server = await app({});
  const response = await rawRequest(server, { path: '/api/desconocida' });
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('en producción, http redirige a https con 301 conservando la ruta y la consulta', async () => {
  const server = await app(production);
  const response = await rawRequest(server, {
    path: '/api/recordatorios?fecha=2026-11-04',
    headers: { Host: 'demo.onrender.com', 'X-Forwarded-Proto': 'http' },
  });
  assert.equal(response.status, 301);
  assert.equal(response.headers.location, 'https://demo.onrender.com/api/recordatorios?fecha=2026-11-04');
});

test('en producción, https no redirige', async () => {
  const server = await app(production);
  const response = await rawRequest(server, {
    path: '/api/desconocida',
    headers: { Host: 'demo.onrender.com', 'X-Forwarded-Proto': 'https' },
  });
  assert.equal(response.status, 404);
});

test('un Host raro responde 400 y no redirige', async () => {
  const server = await app(production);
  for (const host of ['evil.com/<script>', 'a b', 'x.com@evil.com', 'evil.com\\@x', '-.com']) {
    const response = await rawRequest(server, {
      path: '/',
      headers: { Host: host, 'X-Forwarded-Proto': 'http' },
    });
    assert.equal(response.status, 400, `Host ${host}`);
    assert.equal(response.headers.location, undefined);
  }
});

test('/api/salud con http no redirige', async () => {
  const server = await app(production);
  const response = await rawRequest(server, {
    path: '/api/salud',
    headers: { Host: 'demo.onrender.com', 'X-Forwarded-Proto': 'http' },
  });
  assert.equal(response.status, 200);
});

test('en desarrollo no redirige', async () => {
  const server = await app({});
  const response = await rawRequest(server, { path: '/api/desconocida', headers: { 'X-Forwarded-Proto': 'http' } });
  assert.equal(response.status, 404);
});
