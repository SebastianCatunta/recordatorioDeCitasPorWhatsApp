import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../src/phone.js';

test('10 dígitos: antepone el código de país por defecto', () => {
  assert.equal(normalizePhone('5512345678', '52'), '525512345678');
});

test('formato internacional con espacios y signo +', () => {
  assert.equal(normalizePhone('+52 55 1234 5678', '52'), '525512345678');
});

test('con guiones, paréntesis y texto alrededor', () => {
  assert.equal(normalizePhone('Tel: (55) 8765-4321', '52'), '525587654321');
});

test('número demasiado corto es inválido', () => {
  assert.equal(normalizePhone('12345', '52'), null);
});

test('texto sin números es inválido', () => {
  assert.equal(normalizePhone('llamar después', '52'), null);
});

test('vacío o nulo es inválido', () => {
  assert.equal(normalizePhone('', '52'), null);
  assert.equal(normalizePhone(undefined, '52'), null);
});
