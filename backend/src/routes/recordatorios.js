import { Router } from 'express';
import { appointmentsForDate, tomorrowInZone } from '../calendar.js';
import { normalizePhone } from '../phone.js';
import { buildWhatsappLink } from '../message.js';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EVENT_UID_LENGTH = 256;

function isValidDate(fecha) {
  if (typeof fecha !== 'string' || !DATE_FORMAT.test(fecha)) return false;
  const date = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === fecha;
}

export function createRecordatoriosRouter({ config, pool, getIcal }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const fecha = req.query.fecha ?? tomorrowInZone(config.timezone);
      if (!isValidDate(fecha)) {
        return res.status(400).json({ error: 'La fecha debe tener el formato AAAA-MM-DD.' });
      }

      const icsText = await getIcal();
      const appointments = appointmentsForDate(icsText, fecha, config.timezone);
      const { rows } = await pool.query(
        'SELECT event_uid, sent_at FROM reminders_sent WHERE event_date = $1',
        [fecha]
      );
      const sentAt = new Map(rows.map((row) => [row.event_uid, row.sent_at]));

      const citas = appointments.map((cita) => {
        const telefono = normalizePhone(cita.descripcion, config.countryCode);
        return {
          eventUid: cita.uid,
          nombre: cita.nombre,
          hora: cita.hora,
          telefono,
          enlaceWhatsapp: buildWhatsappLink({
            telefono,
            nombre: cita.nombre,
            fecha,
            hora: cita.hora,
            consultorio: config.clinicName,
          }),
          enviado: sentAt.has(cita.uid),
          enviadoA: sentAt.get(cita.uid) ?? null,
        };
      });

      res.json({ fecha, consultorio: config.clinicName, citas });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:eventUid/enviado', async (req, res, next) => {
    try {
      const { fecha } = req.body ?? {};
      if (req.params.eventUid.length > MAX_EVENT_UID_LENGTH) {
        return res.status(400).json({ error: 'La cita no es válida. Actualiza la lista e intenta de nuevo.' });
      }
      if (!isValidDate(fecha)) {
        return res.status(400).json({ error: 'La fecha debe tener el formato AAAA-MM-DD.' });
      }
      await pool.query(
        'INSERT INTO reminders_sent (event_uid, event_date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.eventUid, fecha]
      );
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
