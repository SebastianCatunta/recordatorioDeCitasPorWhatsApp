import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp } from '../src/app.js';
import { patientIdFor } from '../src/patientId.js';

const ics = await readFile(new URL('./fixtures/seguimientos.ics', import.meta.url), 'utf8');
const SECRET = 'clave-de-prueba';
const config = {
  clinicName: 'Consultorio Dental Sonrisa',
  dentistName: 'la Dra. Laura',
  timezone: 'America/La_Paz',
  countryCode: '591',
  patientIdSecret: SECRET,
  followupMinDays: 1,
  followupResendDays: 3,
};

let ahora = new Date('2026-11-10T15:00:00Z');

// Pool falso en memoria que imita las dos consultas de followups_sent.
function createFakePool() {
  const rows = new Map(); // "id|fecha" -> Date
  return {
    rows,
    async query(sql, params) {
      if (sql.startsWith('SELECT')) {
        const ids = new Set(params[0]);
        return {
          rows: [...rows.entries()]
            .map(([key, sent_at]) => {
              const [patient_id, last_visit_date] = key.split('|');
              return { patient_id, last_visit_date, sent_at };
            })
            .filter((row) => ids.has(row.patient_id)),
        };
      }
      rows.set(`${params[0]}|${params[1]}`, new Date(ahora)); // upsert: refresca sent_at
      return { rows: [] };
    },
  };
}

let server, base, pool;
const anaId = patientIdFor('59170000001', SECRET);
const post = (id, body) =>
  fetch(`${base}/${id}/enviado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const get = async () => (await fetch(base)).json();

before(() => {
  pool = createFakePool();
  const app = createApp({ config, pool, getIcal: async () => ics, now: () => ahora });
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api/seguimientos`;
});

after(() => server.close());

test('GET lista solo a los pacientes por retomar, del que más días lleva al que menos', async () => {
  const { seguimientos } = await get();
  assert.deepEqual(seguimientos.map((s) => s.nombre), ['Hugo P.', 'Ana Torres', 'Fabio Luna']);
  const ana = seguimientos[1];
  assert.equal(ana.sesion, '2 de 3');
  assert.equal(ana.diasSinVolver, 5);
  assert.equal(ana.ultimaCita, '2026-11-05');
  assert.equal(ana.pacienteId, anaId);
  assert.equal(ana.enviado, false);
});

test('CA5: el enlace abre el chat correcto con nombre, consultorio, dentista y siguiente sesión', async () => {
  const { seguimientos } = await get();
  const ana = seguimientos.find((s) => s.nombre === 'Ana Torres');
  assert.match(ana.enlaceWhatsapp, /^https:\/\/wa\.me\/59170000001\?text=/);
  const texto = decodeURIComponent(ana.enlaceWhatsapp.split('?text=')[1]);
  assert.match(texto, /Ana Torres/);
  assert.match(texto, /Consultorio Dental Sonrisa, de la Dra\. Laura/);
  assert.match(texto, /sesión 3 de su tratamiento/);
});

test('la respuesta no expone el teléfono como dato aparte', async () => {
  const { seguimientos } = await get();
  for (const item of seguimientos) assert.equal(item.telefono, undefined);
});

test('CA6: POST marca como enviado, es idempotente y el estado persiste', async () => {
  assert.equal((await post(anaId, { ultimaCita: '2026-11-05' })).status, 204);
  assert.equal((await post(anaId, { ultimaCita: '2026-11-05' })).status, 204);
  assert.equal(pool.rows.size, 1);

  const { seguimientos } = await get();
  const ana = seguimientos.find((s) => s.nombre === 'Ana Torres');
  assert.equal(ana.enviado, true);
  assert.ok(ana.enviadoA);
  assert.equal(seguimientos.filter((s) => s.enviado).length, 1);
});

test('CA7: antes de 3 días sigue como enviado; después de 3 días vuelve a pendiente', async () => {
  ahora = new Date('2026-11-12T15:00:00Z'); // 2 días después del envío
  assert.equal((await get()).seguimientos.find((s) => s.nombre === 'Ana Torres').enviado, true);

  ahora = new Date('2026-11-14T16:00:00Z'); // más de 3 días después
  assert.equal((await get()).seguimientos.find((s) => s.nombre === 'Ana Torres').enviado, false);

  assert.equal((await post(anaId, { ultimaCita: '2026-11-05' })).status, 204); // segundo envío
  assert.equal(pool.rows.size, 1, 'sigue habiendo un solo registro por paciente y fecha');
  assert.equal((await get()).seguimientos.find((s) => s.nombre === 'Ana Torres').enviado, true);
});

test('CA9: la tabla solo recibe identificador y fechas', () => {
  for (const key of pool.rows.keys()) {
    const [id, fecha] = key.split('|');
    assert.match(id, /^[0-9a-f]{64}$/);
    assert.match(fecha, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!key.includes('70000001'));
  }
});

test('POST con datos inválidos responde 400', async () => {
  assert.equal((await post('no-es-un-id', { ultimaCita: '2026-11-05' })).status, 400);
  assert.equal((await post(anaId, { ultimaCita: '05/11/2026' })).status, 400);
  assert.equal((await post(anaId, {})).status, 400);
});
