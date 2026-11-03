import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp } from '../src/app.js';

const ics = await readFile(new URL('./fixtures/ejemplo.ics', import.meta.url), 'utf8');
const config = {
  clinicName: 'Consultorio Dental Sonrisa',
  timezone: 'America/Mexico_City',
  countryCode: '52',
};

// Pool falso en memoria que imita las dos consultas que usa la API.
function createFakePool() {
  const sent = new Map(); // "uid|fecha" -> Date
  return {
    sent,
    async query(sql, params) {
      if (sql.startsWith('SELECT')) {
        const rows = [...sent.entries()]
          .filter(([key]) => key.endsWith(`|${params[0]}`))
          .map(([key, sent_at]) => ({ event_uid: key.split('|')[0], sent_at }));
        return { rows };
      }
      const key = `${params[0]}|${params[1]}`;
      if (!sent.has(key)) sent.set(key, new Date());
      return { rows: [] };
    },
  };
}

let server, base, pool;

before(async () => {
  pool = createFakePool();
  const app = createApp({ config, pool, getIcal: async () => ics });
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api/recordatorios`;
});

after(() => server.close());

test('GET lista las citas de la fecha con enlace y estado', async () => {
  const res = await fetch(`${base}?fecha=2026-11-04`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.citas.length, 4);
  assert.deepEqual(body.citas.map((c) => c.hora), ['09:00', '11:00', '15:00', '22:00']);
  const luis = body.citas[0];
  assert.equal(luis.telefono, '525587654321');
  assert.match(luis.enlaceWhatsapp, /^https:\/\/wa\.me\/525587654321\?text=/);
  assert.equal(luis.enviado, false);
});

test('GET: una cita sin teléfono válido no tiene enlace', async () => {
  const body = await (await fetch(`${base}?fecha=2026-11-04`)).json();
  const maria = body.citas.find((c) => c.nombre === 'María Gómez');
  assert.equal(maria.telefono, null);
  assert.equal(maria.enlaceWhatsapp, null);
});

test('GET: fecha inválida responde 400', async () => {
  const res = await fetch(`${base}?fecha=04-11-2026`);
  assert.equal(res.status, 400);
});

test('POST marca como enviado, es idempotente y el estado persiste', async () => {
  const url = `${base}/cita-manana@prueba/enviado`;
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha: '2026-11-04' }),
  };
  assert.equal((await fetch(url, options)).status, 204);
  assert.equal((await fetch(url, options)).status, 204);
  assert.equal(pool.sent.size, 1);

  const body = await (await fetch(`${base}?fecha=2026-11-04`)).json();
  const luis = body.citas.find((c) => c.eventUid === 'cita-manana@prueba');
  assert.equal(luis.enviado, true);
  assert.ok(luis.enviadoA);
  assert.equal(body.citas.filter((c) => c.enviado).length, 1);
});

test('POST sin fecha válida responde 400', async () => {
  const res = await fetch(`${base}/cita-manana@prueba/enviado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
});
