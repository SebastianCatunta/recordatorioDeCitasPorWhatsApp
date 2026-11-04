import { Router } from 'express';
import { allAppointments } from '../calendar.js';
import { findFollowups } from '../followups.js';
import { patientIdFor } from '../patientId.js';
import { buildFollowupLink } from '../message.js';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const PATIENT_ID_FORMAT = /^[0-9a-f]{64}$/;

function isValidDate(fecha) {
  if (typeof fecha !== 'string' || !DATE_FORMAT.test(fecha)) return false;
  const date = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === fecha;
}

export function createSeguimientosRouter({ config, pool, getIcal, now = () => new Date() }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const ahora = now();
      const citas = allAppointments(await getIcal(), config.timezone);
      const pendientes = findFollowups(citas, ahora, {
        timezone: config.timezone,
        countryCode: config.countryCode,
        minDays: config.followupMinDays,
      }).map((item) => ({ ...item, pacienteId: patientIdFor(item.telefono, config.patientIdSecret) }));

      const { rows } = pendientes.length
        ? await pool.query(
            'SELECT patient_id, last_visit_date::text AS last_visit_date, sent_at FROM followups_sent WHERE patient_id = ANY($1)',
            [pendientes.map((item) => item.pacienteId)]
          )
        : { rows: [] };
      const enviados = new Map(rows.map((row) => [`${row.patient_id}|${row.last_visit_date}`, row.sent_at]));
      const plazoMs = config.followupResendDays * 24 * 60 * 60 * 1000;

      const seguimientos = pendientes.map((item) => {
        const sentAt = enviados.get(`${item.pacienteId}|${item.ultimaCita}`);
        const enviado = Boolean(sentAt) && ahora - new Date(sentAt) < plazoMs;
        return {
          pacienteId: item.pacienteId,
          nombre: item.nombre,
          ultimaCita: item.ultimaCita,
          diasSinVolver: item.diasSinVolver,
          sesion: `${item.sesion.actual} de ${item.sesion.total}`,
          enlaceWhatsapp: buildFollowupLink({
            telefono: item.telefono,
            nombre: item.nombre,
            siguienteSesion: item.sesion.actual + 1,
            consultorio: config.clinicName,
            dentista: config.dentistName,
          }),
          enviado,
          enviadoA: enviado ? sentAt : null,
        };
      });

      res.json({ seguimientos });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:pacienteId/enviado', async (req, res, next) => {
    try {
      const { ultimaCita } = req.body ?? {};
      if (!PATIENT_ID_FORMAT.test(req.params.pacienteId) || !isValidDate(ultimaCita)) {
        return res
          .status(400)
          .json({ error: 'Los datos del seguimiento no son válidos. Actualiza la lista e intenta de nuevo.' });
      }
      await pool.query(
        `INSERT INTO followups_sent (patient_id, last_visit_date) VALUES ($1, $2)
         ON CONFLICT (patient_id, last_visit_date) DO UPDATE SET sent_at = now()`,
        [req.params.pacienteId, ultimaCita]
      );
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
