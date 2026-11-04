// Cabeceras de seguridad básicas para todas las respuestas.
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}

// Las respuestas de la API llevan nombres de pacientes: que nadie las guarde en caché.
export function noStore(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

// Host aceptado para redirigir: solo letras, números, puntos y guiones, con puerto opcional.
const SAFE_HOST = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?(:\d{1,5})?$/i;

// En producción, redirige http a https. Requiere `trust proxy` para leer X-Forwarded-Proto.
export function httpsRedirect({ enabled }) {
  return (req, res, next) => {
    if (!enabled || req.protocol === 'https') return next();
    const host = req.headers.host;
    if (typeof host !== 'string' || !SAFE_HOST.test(host)) {
      return res.status(400).json({ error: 'La dirección de la solicitud no es válida.' });
    }
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  };
}
