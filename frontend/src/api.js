async function request(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('No pudimos conectar con el servidor. Revisa que esté encendido e intenta de nuevo.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? 'Algo salió mal. Intenta de nuevo.');
  }
  return response;
}

export async function getRecordatorios(fecha) {
  const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
  const response = await request(`/api/recordatorios${query}`);
  return response.json();
}

export async function markSent(eventUid, fecha) {
  await request(`/api/recordatorios/${encodeURIComponent(eventUid)}/enviado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha }),
  });
}

export async function getSeguimientos() {
  const response = await request('/api/seguimientos');
  return response.json();
}

export async function markFollowupSent(pacienteId, ultimaCita) {
  await request(`/api/seguimientos/${encodeURIComponent(pacienteId)}/enviado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ultimaCita }),
  });
}
