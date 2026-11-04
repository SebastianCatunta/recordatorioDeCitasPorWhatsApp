import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const config = { clinicName: 'Consultorio', timezone: 'America/La_Paz', countryCode: '591' };
let server, base, queries, icalCalls;

before(() => {
  queries = 0;
  icalCalls = 0;
  const pool = { async query() { queries += 1; return { rows: [] }; } };
  const getIcal = async () => { icalCalls += 1; return ''; };
  server = createApp({ config, pool, getIcal }).listen(0);
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test('GET /api/salud responde ok', async () => {
  const response = await fetch(`${base}/api/salud`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { estado: 'ok' });
});

test('responde igual con cabecera de autorización', async () => {
  const response = await fetch(`${base}/api/salud`, { headers: { Authorization: 'Basic eDp5' } });
  assert.equal(response.status, 200);
});

test('no consulta la base de datos ni el calendario', async () => {
  await fetch(`${base}/api/salud`);
  assert.equal(queries, 0);
  assert.equal(icalCalls, 0);
});
