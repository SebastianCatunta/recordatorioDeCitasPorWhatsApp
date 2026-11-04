import { useCallback, useEffect, useState } from 'react';
import { getSeguimientos, markFollowupSent } from '../api.js';
import FollowupRow from './FollowupRow.jsx';

export default function FollowupSection({ refreshKey }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems((await getSeguimientos()).seguimientos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleSend(seguimiento) {
    // El enlace se abre dentro del clic para que el navegador no lo bloquee.
    window.open(seguimiento.enlaceWhatsapp, '_blank', 'noopener');
    setBusyId(seguimiento.pacienteId);
    setError(null);
    try {
      await markFollowupSent(seguimiento.pacienteId, seguimiento.ultimaCita);
      setItems((current) =>
        current.map((item) =>
          item.pacienteId === seguimiento.pacienteId
            ? { ...item, enviado: true, enviadoA: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      setError(`No pudimos guardar que ya escribiste a este paciente. ${err.message}`);
    } finally {
      setBusyId(null);
    }
  }

  const total = items?.length ?? 0;
  const enviados = items?.filter((item) => item.enviado).length ?? 0;

  return (
    <section className="section" aria-labelledby="por-retomar">
      <h2 id="por-retomar" className="section__title">Por retomar</h2>
      <p className="section__hint">
        Pacientes con tratamiento a medias que todavía no tienen próxima cita.
      </p>

      {error && (
        <p className="message message--error" role="alert">
          {error}
        </p>
      )}

      {loading && !items && <p className="message">Buscando pacientes por retomar…</p>}

      {items && total === 0 && !error && (
        <p className="message">Nadie por retomar por ahora. Todo al día.</p>
      )}

      {total > 0 && (
        <>
          <p className="section__count">
            {enviados} de {total} seguimientos enviados
          </p>
          <ul className="list">
            {items.map((item) => (
              <FollowupRow
                key={item.pacienteId}
                seguimiento={item}
                onSend={handleSend}
                busy={busyId === item.pacienteId}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
