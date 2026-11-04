import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startApp, rawRequest, basic } from './helpers.js';

const PASSWORD = 'una-clave-bien-larga-123';
let temp, open, closed;

before(async () => {
  temp = await mkdtemp(path.join(tmpdir(), 'panel-'));
  const dist = path.join(temp, 'dist');
  await mkdir(path.join(dist, 'assets'), { recursive: true });
  await writeFile(path.join(dist, 'index.html'), '<!doctype html><title>PANEL</title>');
  await writeFile(path.join(dist, 'assets', 'app-abc123.js'), 'console.log("app")');
  await writeFile(path.join(temp, 'secreto.txt'), 'CONTENIDO_SECRETO');
  open = await startApp({ staticDir: dist });
  closed = await startApp({
    config: { accessUser: 'asistente', accessPassword: PASSWORD },
    staticDir: dist,
  });
});

after(async () => {
  open.close();
  closed.close();
  await rm(temp, { recursive: true, force: true });
});

test('la raíz y cualquier ruta del panel devuelven index.html sin caché', async () => {
  for (const route of ['/', '/cualquier/ruta', '/seguimiento']) {
    const response = await rawRequest(open, { path: route });
    assert.equal(response.status, 200, route);
    assert.match(response.body, /PANEL/);
    assert.equal(response.headers['cache-control'], 'no-cache');
  }
});

test('los archivos de assets/ se sirven con caché larga', async () => {
  const response = await rawRequest(open, { path: '/assets/app-abc123.js' });
  assert.equal(response.status, 200);
  assert.match(response.headers['cache-control'], /max-age=31536000/);
});

test('una ruta /api desconocida responde 404 JSON, no el panel', async () => {
  const response = await rawRequest(open, { path: '/api/no-existe' });
  assert.equal(response.status, 404);
  assert.ok(!response.body.includes('PANEL'));
  assert.match(response.headers['content-type'], /application\/json/);
});

test('un recorrido de rutas no devuelve archivos fuera de dist', async () => {
  const intentos = [
    '/../secreto.txt',
    '/..%2fsecreto.txt',
    '/%2e%2e/secreto.txt',
    '/%2e%2e%2fsecreto.txt',
    '/..%5csecreto.txt',
    '/assets/../../secreto.txt',
    '/assets/%2e%2e/%2e%2e/secreto.txt',
    '/%00',
  ];
  for (const intento of intentos) {
    const response = await rawRequest(open, { path: intento });
    assert.ok(!response.body.includes('CONTENIDO_SECRETO'), `filtró contenido con ${intento}`);
  }
});

test('con clave activa el panel y los archivos también están cerrados', async () => {
  for (const route of ['/', '/assets/app-abc123.js', '/cualquier/ruta']) {
    const response = await rawRequest(closed, { path: route });
    assert.equal(response.status, 401, route);
    assert.ok(!response.body.includes('PANEL'));
  }
  const ok = await rawRequest(closed, { path: '/', headers: { Authorization: basic('asistente', PASSWORD) } });
  assert.equal(ok.status, 200);
  assert.match(ok.body, /PANEL/);
});

test('solo se sirve el panel con GET', async () => {
  const response = await rawRequest(open, { method: 'POST', path: '/' });
  assert.equal(response.status, 404);
});
