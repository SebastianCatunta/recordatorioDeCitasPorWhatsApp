import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { fetchIcal } from './calendar.js';
import { createApp } from './app.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const app = createApp({ config, pool, getIcal: () => fetchIcal(config.icalUrl) });

app.listen(config.port, () => {
  console.log(`Backend listo en http://localhost:${config.port}`);
});
