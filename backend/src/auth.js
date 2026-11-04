import { createHash, timingSafeEqual } from 'node:crypto';

const BASIC_HEADER = /^Basic ([A-Za-z0-9+/]{1,1024}={0,2})$/;

function digest(value) {
  return createHash('sha256').update(String(value)).digest();
}

function sameValue(received, expectedDigest) {
  return timingSafeEqual(digest(received), expectedDigest);
}

// Contador de intentos fallidos por clave (IP), en memoria y con tamaño acotado.
export function createAttemptLimiter({
  windowMs = 15 * 60 * 1000,
  maxAttempts = 10,
  maxEntries = 10_000,
  now = () => Date.now(),
} = {}) {
  const entries = new Map(); // clave -> { count, resetAt }

  function current(key) {
    const entry = entries.get(key);
    if (!entry) return null;
    if (entry.resetAt <= now()) {
      entries.delete(key);
      return null;
    }
    return entry;
  }

  function purge() {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now()) entries.delete(key);
    }
    while (entries.size >= maxEntries) {
      entries.delete(entries.keys().next().value);
    }
  }

  return {
    // Segundos que faltan para poder reintentar, o 0 si no está bloqueado.
    retryAfter(key) {
      const entry = current(key);
      if (!entry || entry.count < maxAttempts) return 0;
      return Math.max(1, Math.ceil((entry.resetAt - now()) / 1000));
    },
    fail(key) {
      const entry = current(key);
      if (entry) {
        entry.count += 1;
        return;
      }
      if (entries.size >= maxEntries) purge();
      entries.set(key, { count: 1, resetAt: now() + windowMs });
    },
    get size() {
      return entries.size;
    },
  };
}

// Autenticación básica HTTP. Cierra todo lo que se monte después de este middleware.
export function createAuth({ user, password, limiter = createAttemptLimiter() }) {
  const expectedUser = digest(user);
  const expectedPassword = digest(password);

  return (req, res, next) => {
    const key = req.ip ?? 'desconocida';

    const wait = limiter.retryAfter(key);
    if (wait > 0) {
      res.setHeader('Retry-After', String(wait));
      return res
        .status(429)
        .json({ error: 'Hiciste muchos intentos seguidos. Espera unos minutos e intenta de nuevo.', codigo: 'limite' });
    }

    const header = req.headers.authorization;
    const challenge = () => {
      res.setHeader('WWW-Authenticate', 'Basic realm="Sonrisa al dia", charset="UTF-8"');
      return res.status(401).json({ error: 'Necesitas el usuario y la clave para entrar.', codigo: 'acceso' });
    };

    // Sin credenciales es el primer paso normal del navegador: se pide la clave sin contar un intento.
    if (typeof header !== 'string' || header === '') return challenge();

    const match = BASIC_HEADER.exec(header);
    let givenUser = '';
    let givenPassword = '';
    let wellFormed = false;
    if (match) {
      const decoded = Buffer.from(match[1], 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator !== -1) {
        givenUser = decoded.slice(0, separator);
        givenPassword = decoded.slice(separator + 1);
        wellFormed = true;
      }
    }

    // Se comparan siempre las dos partes para no responder distinto según cuál falló.
    const userOk = sameValue(givenUser, expectedUser);
    const passwordOk = sameValue(givenPassword, expectedPassword);
    if (wellFormed && userOk && passwordOk) return next();

    limiter.fail(key);
    return challenge();
  };
}
