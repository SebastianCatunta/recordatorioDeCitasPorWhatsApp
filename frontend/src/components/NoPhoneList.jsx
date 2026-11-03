export default function NoPhoneList({ citas }) {
  if (citas.length === 0) return null;

  return (
    <section className="section" aria-labelledby="sin-telefono">
      <h2 id="sin-telefono" className="section__title">Sin teléfono válido</h2>
      <p className="section__hint">
        Corrige el teléfono en la descripción del evento del calendario y pulsa Actualizar.
      </p>
      <ul className="list">
        {citas.map((cita) => (
          <li key={cita.eventUid} className="row">
            <div className="row__info">
              <span className="row__time">{cita.hora}</span>
              <span className="row__name">{cita.nombre}</span>
            </div>
            <span className="tag tag--warning">
              <svg className="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M12 7v6m0 4h.01" />
              </svg>
              Sin teléfono válido
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
