import { useCallback, useEffect, useState } from 'react';
import { getRecordatorios, markSent } from './api.js';
import Header from './components/Header.jsx';
import Progress from './components/Progress.jsx';
import AppointmentRow from './components/AppointmentRow.jsx';
import NoPhoneList from './components/NoPhoneList.jsx';

export default function App() {
  const [fecha, setFecha] = useState(null); // null = mañana (lo decide el servidor)
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState(null);

  const load = useCallback(async (selected) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getRecordatorios(selected ?? undefined));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(fecha);
  }, [fecha, load]);

  async function handleSend(cita) {
    // El enlace se abre dentro del clic para que el navegador no lo bloquee.
    window.open(cita.enlaceWhatsapp, '_blank', 'noopener');
    setBusyUid(cita.eventUid);
    setError(null);
    try {
      await markSent(cita.eventUid, data.fecha);
      setData((current) => ({
        ...current,
        citas: current.citas.map((item) =>
          item.eventUid === cita.eventUid
            ? { ...item, enviado: true, enviadoA: new Date().toISOString() }
            : item
        ),
      }));
    } catch (err) {
      setError(`No pudimos guardar que ya enviaste este recordatorio. ${err.message}`);
    } finally {
      setBusyUid(null);
    }
  }

  const citas = data?.citas ?? [];
  const conTelefono = citas.filter((cita) => cita.enlaceWhatsapp);
  const sinTelefono = citas.filter((cita) => !cita.enlaceWhatsapp);
  const enviados = conTelefono.filter((cita) => cita.enviado).length;

  return (
    <>
      <Header consultorio={data?.consultorio} />
      <main className="page">
        <div className="toolbar">
          <label className="toolbar__field">
            <span>Fecha de las citas</span>
            <input
              type="date"
              value={data?.fecha ?? ''}
              onChange={(event) => event.target.value && setFecha(event.target.value)}
            />
          </label>
          <button type="button" className="button button--secondary" onClick={() => load(fecha)} disabled={loading}>
            Actualizar
          </button>
        </div>

        {error && (
          <p className="message message--error" role="alert">
            {error}
          </p>
        )}

        {loading && !data && <p className="message">Cargando las citas…</p>}

        {data && (
          <>
            <Progress sent={enviados} total={conTelefono.length} />

            {citas.length === 0 && !loading && (
              <p className="message">No hay citas para esta fecha. Disfrute la calma.</p>
            )}

            {conTelefono.length > 0 && (
              <ul className="list">
                {conTelefono.map((cita) => (
                  <AppointmentRow
                    key={cita.eventUid}
                    cita={cita}
                    onSend={handleSend}
                    busy={busyUid === cita.eventUid}
                  />
                ))}
              </ul>
            )}

            <NoPhoneList citas={sinTelefono} />
          </>
        )}
      </main>
    </>
  );
}
