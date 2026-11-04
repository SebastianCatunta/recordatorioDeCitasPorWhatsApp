import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patientIdFor } from '../src/patientId.js';

test('el mismo teléfono da el mismo identificador', () => {
  assert.equal(patientIdFor('59170000001', 'clave'), patientIdFor('59170000001', 'clave'));
});

test('teléfonos distintos dan identificadores distintos', () => {
  assert.notEqual(patientIdFor('59170000001', 'clave'), patientIdFor('59170000002', 'clave'));
});

test('otra clave da otro identificador', () => {
  assert.notEqual(patientIdFor('59170000001', 'clave'), patientIdFor('59170000001', 'otra'));
});

test('el resultado no contiene el teléfono y tiene 64 caracteres hexadecimales', () => {
  const id = patientIdFor('59170000001', 'clave');
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.ok(!id.includes('59170000001'));
});
