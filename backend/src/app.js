import express from 'express';
import cors from 'cors';
import { createRecordatoriosRouter } from './routes/recordatorios.js';
import { createSeguimientosRouter } from './routes/seguimientos.js';

export function createApp({ config, pool, getIcal, now }) {
  const app = express();
  app.use(cors({ origin: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ }));
  app.use(express.json());

  app.use('/api/recordatorios', createRecordatoriosRouter({ config, pool, getIcal }));

  app.use('/api/seguimientos', createSeguimientosRouter({ config, pool, getIcal, now }));

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({
      error: 'No pudimos cargar las citas. Revisa la conexión e intenta de nuevo.',
    });
  });

  return app;
}
