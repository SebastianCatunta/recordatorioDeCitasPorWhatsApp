import http from 'node:http';
import { createApp } from '../src/app.js';

export const baseConfig = {
  clinicName: 'Consultorio Dental Sonrisa',
  timezone: 'America/La_Paz',
  countryCode: '591',
  patientIdSecret: 'clave-de-prueba',
  followupMinDays: 1,
  followupResendDays: 3,
};

export function fakePool() {
  return {
    queries: 0,
    async query() {
      this.queries += 1;
      return { rows: [] };
    },
  };
}

export function basic(user, password) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
}

// Petición HTTP con control total de ruta y cabeceras (fetch normaliza demasiado).
export function rawRequest(server, { method = 'GET', path = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: '127.0.0.1', port: server.address().port, method, path, headers },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        );
      }
    );
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

export function startApp({ config = {}, getIcal = async () => '', pool = fakePool(), now, staticDir } = {}) {
  const app = createApp({ config: { ...baseConfig, ...config }, pool, getIcal, now, staticDir });
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}
