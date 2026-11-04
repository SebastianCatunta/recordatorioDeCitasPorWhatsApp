import { readFile } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { createPool } from './db.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
await pool.query(schema);
console.log('Tablas reminders_sent y followups_sent listas.');
await pool.end();
