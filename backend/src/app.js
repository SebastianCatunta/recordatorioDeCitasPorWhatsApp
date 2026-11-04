import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { createRecordatoriosRouter } from './routes/recordatorios.js';
import { createSeguimientosRouter } from './routes/seguimientos.js';
import { securityHeaders, noStore, httpsRedirect } from './security.js';
import { createAuth } from './auth.js';

const GENERIC_ERROR = 'No pudimos cargar las citas. Revisa la conexión e intenta de nuevo.';

function describeError(error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (error?.type === 'entity.too.large') {
    return { status: 413, message: 'Los datos enviados son demasiado grandes.' };
  }
  if (status === 400) return { status, message: 'La solicitud no es válida.' };
  if (status === 403 || status === 404) return { status: 404, message: 'No encontramos esa página.' };
  if (status !== 500) return { status, message: 'No pudimos procesar la solicitud.' };
  return { status, message: GENERIC_ERROR };
}

export function createApp({ config, pool, getIcal, now, staticDir }) {
  const app = express();
  app.disable('x-powered-by');
  // Detrás del proxy de la plataforma: así req.ip y req.protocol salen de X-Forwarded-*.
  app.set('trust proxy', config.trustProxy ?? 0);

  app.use(securityHeaders);

  // Comprobación de salud para la plataforma: pública, sin base de datos ni calendario.
  // Va antes de la redirección a HTTPS y de la clave de acceso.
  app.get('/api/salud', (req, res) => {
    res.json({ estado: 'ok' });
  });

  app.use(httpsRedirect({ enabled: Boolean(config.production) }));

  // Todo lo que se monte desde aquí queda cerrado con clave.
  if (config.accessPassword) {
    app.use(
      createAuth({
        user: config.accessUser ?? 'asistente',
        password: config.accessPassword,
        limiter: config.attemptLimiter,
      })
    );
  }

  app.use(express.json({ limit: '10kb' }));

  // En producción el panel y la API comparten origen, así que CORS solo hace falta en desarrollo.
  if (!config.production) {
    app.use(cors({ origin: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ }));
  }

  app.use('/api', noStore);
  app.use('/api/recordatorios', createRecordatoriosRouter({ config, pool, getIcal }));
  app.use('/api/seguimientos', createSeguimientosRouter({ config, pool, getIcal, now }));
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'No encontramos esa ruta.' });
  });

  if (staticDir) {
    const root = path.resolve(staticDir);
    app.use(
      express.static(root, {
        index: false,
        setHeaders(res, filePath) {
          const hashed = filePath.split(path.sep).includes('assets');
          res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
        },
      })
    );
    // Cualquier otra ruta que no sea de la API devuelve el panel.
    app.get(/^\/(?!api(?:\/|$))/, (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(root, 'index.html'));
    });
  }

  app.use((error, req, res, next) => {
    const { status, message } = describeError(error);
    // Los errores del cliente (JSON roto, cuerpo grande) no son fallos del servidor: no se registran.
    // En producción solo se registra el tipo de error: el objeto puede traer URLs o claves.
    if (status === 500) {
      console.error(config.production ? `Error: ${error?.name ?? 'desconocido'}` : error);
    }
    res.status(status).json({ error: message });
  });

  return app;
}
