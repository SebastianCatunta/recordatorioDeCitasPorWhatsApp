import { createHmac } from 'node:crypto';

// Identificador del paciente: HMAC del teléfono normalizado. No permite recuperar el teléfono sin la clave.
export function patientIdFor(telefono, secret) {
  return createHmac('sha256', secret).update(String(telefono)).digest('hex');
}
