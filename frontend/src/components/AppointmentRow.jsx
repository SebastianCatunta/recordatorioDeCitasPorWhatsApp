function formatSentTime(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function WhatsappIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="currentColor" d="M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-4.300 3.600A.5.5 0 0 1 4 20.200V17a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5 9-10" />
    </svg>
  );
}

export default function AppointmentRow({ cita, onSend, busy }) {
  return (
    <li className={`row${cita.enviado ? ' row--sent' : ''}`}>
      <div className="row__info">
        <span className="row__time">{cita.hora}</span>
        <span className="row__name">{cita.nombre}</span>
      </div>
      {cita.enviado ? (
        <span className="tag tag--success">
          <CheckIcon />
          Enviado{cita.enviadoA ? ` a las ${formatSentTime(cita.enviadoA)}` : ''}
        </span>
      ) : (
        <button type="button" className="button" onClick={() => onSend(cita)} disabled={busy}>
          <WhatsappIcon />
          Enviar por WhatsApp
        </button>
      )}
    </li>
  );
}
