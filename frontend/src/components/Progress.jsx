export default function Progress({ sent, total }) {
  if (total === 0) return null;
  const done = sent === total;
  const percent = Math.round((sent / total) * 100);

  return (
    <section className="progress" aria-label="Progreso de recordatorios">
      <p className="progress__label">
        {sent} de {total} recordatorios enviados
      </p>
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={sent}
        aria-valuetext={`${sent} de ${total} enviados`}
      >
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
      {done && (
        <p className="progress__done">
          ¡Listo por hoy! Todas las citas de mañana tienen su recordatorio.
        </p>
      )}
    </section>
  );
}
