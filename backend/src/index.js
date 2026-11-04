import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { fetchIcal } from './calendar.js';
import { createApp } from './app.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);

// El panel compilado (frontend/dist) se sirve desde aquí si existe. En desarrollo lo sirve Vite.
const panelDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
const staticDir = existsSync(path.join(panelDir, 'index.html')) ? panelDir : undefined;

const app = createApp({ config, pool, getIcal: () => fetchIcal(config.icalUrl), staticDir });

app.listen(config.port, () => {
  const modo = config.production ? 'producción' : 'desarrollo';
  console.log(`Backend listo en el puerto ${config.port} (${modo}). Panel: ${staticDir ? 'sí' : 'no'}.`);
});
