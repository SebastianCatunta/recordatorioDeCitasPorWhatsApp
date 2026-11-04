function formatSentDate(iso) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function lastVisitText(dias) {
  if (dias === 1) return 'Última cita ayer';
  return `Última cita hace ${dias} días`;
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

export default function FollowupRow({ seguimiento, onSend, busy }) {
  return (
    <li className={`row${seguimiento.enviado ? ' row--sent' : ''}`}>
      <div className="row__info row__info--stacked">
        <span className="row__name">{seguimiento.nombre}</span>
        <span className="row__meta">
          {lastVisitText(seguimiento.diasSinVolver)} · Sesión {seguimiento.sesion}
        </span>
      </div>
      {seguimiento.enviado ? (
        <span className="tag tag--success">
          <CheckIcon />
          Enviado{seguimiento.enviadoA ? ` el ${formatSentDate(seguimiento.enviadoA)}` : ''}
        </span>
      ) : (
        <button type="button" className="button" onClick={() => onSend(seguimiento)} disabled={busy}>
          <WhatsappIcon />
          Escribir por WhatsApp
        </button>
      )}
    </li>
  );
}
