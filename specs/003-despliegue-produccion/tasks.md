# Tareas: Despliegue a producción

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Marca `[x]` al terminar cada tarea. Hazlas en orden. `[P]` indica que puede hacerse en paralelo con la tarea anterior. `[TÚ]` indica un paso que solo puede hacer el dueño de la cuenta (yo te guío). `CA1-CA13` son los criterios de aceptación de la spec. Las pruebas se corren con `npm test` dentro de `backend/`.

## Fase 1: Configuración y salud (~10 min)

- [ ] **T1. Configuración de producción** en `backend/src/config.js`: leer `NODE_ENV`, `ACCESS_PASSWORD`, `ACCESS_USER` (por defecto `asistente`) y `TRUST_PROXY` (entero, por defecto 0). Con `NODE_ENV=production`, exigir `ACCESS_PASSWORD` de al menos 12 caracteres. Agregar `engines` en `backend/package.json`. Actualizar `.env.example` sin valores reales.
  - Listo cuando: en producción, sin clave o con una clave corta, `loadConfig` falla diciendo qué variable falta o por qué es débil; en desarrollo sigue arrancando sin clave. Pruebas en `test/config.test.js`. Cubre **CA12**.
- [ ] **T2. Ruta de salud** `GET /api/salud` en `src/app.js` que responde `{ "estado": "ok" }`, sin base de datos ni calendario.
  - Listo cuando: responde 200 con y sin cabeceras de autorización y no hace ninguna consulta. Apoya **CA2**.

## Fase 2: Seguridad y clave de acceso, con pruebas (~25 min)

Es la fase más importante. No pases a la Fase 3 sin que todas estas pruebas pasen.

- [ ] **T3. Cabeceras de seguridad y HTTPS** en `src/security.js`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, sin `X-Powered-By`; en producción redirigir `http` a `https` con 301 según `X-Forwarded-Proto`, validando el `Host`. Pruebas en `test/security.test.js`:
  - Las tres cabeceras están presentes y `X-Powered-By` no.
  - En producción, `X-Forwarded-Proto: http` redirige a `https://…` con 301; con `https` no redirige.
  - Un `Host` con caracteres raros responde 400 y no redirige.
  - `/api/salud` con `http` **no** redirige.
  - En desarrollo no redirige.
  - Listo cuando: `npm test` pasa. Cubre **CA7, CA8**.
- [ ] **T4. Clave de acceso** en `src/auth.js`: autenticación básica con SHA-256 y `timingSafeEqual` para usuario y clave; aplicada con `app.use` antes de las rutas y de los archivos estáticos; `/api/salud` exenta. Respuesta `401` con `WWW-Authenticate: Basic realm="Sonrisa al dia"`. Pruebas en `test/auth.test.js`:
  - Sin cabecera de autorización: 401 en `/`, `/api/recordatorios`, `/api/seguimientos` y en un `POST /api/recordatorios/x/enviado`.
  - Clave incorrecta, usuario incorrecto y cabecera mal formada (`Basic` sin valor, base64 inválido, `Bearer x`, valores larguísimos): todos 401, sin error 500.
  - Clave correcta: 200.
  - Ninguna respuesta de error revela cuál de los dos datos falló.
  - Las pruebas de rutas existentes de 001 y 002 siguen pasando.
  - Listo cuando: `npm test` pasa. Cubre **CA1, CA2**.
- [ ] **T5. Límite de intentos fallidos** en `src/auth.js`: 10 intentos fallidos por IP en 15 minutos y luego `429` con `Retry-After`, comprobado **antes** de validar la clave, con tope de entradas. La IP sale de `req.ip` (con `trust proxy` desde `TRUST_PROXY`). Pruebas con reloj falso:
  - El intento 11 desde la misma IP responde 429, incluso con la clave correcta mientras dure el bloqueo.
  - Otra IP no se ve afectada.
  - Con `TRUST_PROXY=1`, dos `X-Forwarded-For` distintos se cuentan por separado; con `TRUST_PROXY=0` un `X-Forwarded-For` falso **no** cambia la IP contada.
  - Pasada la ventana el contador se reinicia.
  - El `Map` no crece más del tope.
  - Listo cuando: `npm test` pasa. Cubre **CA3**.
- [ ] **T6. Endurecer entradas y errores** en `src/app.js` y las rutas: `express.json({ limit: '10kb' })` (cuerpo mayor responde 413 con mensaje amable), CORS solo si no es producción, `eventUid` con largo máximo de 256, y un manejador de errores que en producción registra solo `error.name` y responde el mismo mensaje genérico. Pruebas:
  - Cuerpo de más de 10 KB: 413.
  - `eventUid` de 300 caracteres: 400.
  - Un error cuyo mensaje contiene una URL de calendario y una clave **no aparece** ni en la respuesta ni en lo registrado (se espía `console.error`).
  - Una ruta `/api/desconocida` responde 404 en JSON.
  - Listo cuando: `npm test` pasa. Cubre **CA9**.
- [ ] **T7. Revisión de secretos y entradas** (sin código nuevo): buscar en `backend/src` cualquier `console.` que pueda imprimir el enlace iCal, la clave, `DATABASE_URL`, `req.headers` o un objeto de error completo; consultas SQL con concatenación; y uso de `dangerouslySetInnerHTML` en `frontend/src`. Anotar aquí el resultado.
  - Listo cuando: no queda coincidencia sin justificar. Apoya **CA9, CA10**.

## Fase 3: Servir el panel (~10 min)

- [ ] **T8. Servir `frontend/dist`** en `src/app.js`: `express.static` con `index.html` sin caché y `assets/` con caché larga; cualquier `GET` que no empiece por `/api` y no sea un archivo devuelve `index.html`; solo si existe `frontend/dist`. Pruebas con una carpeta temporal que imita `dist`:
  - `/` devuelve el `index.html`; `/cualquier/ruta` también.
  - `/api/desconocida` devuelve 404 JSON, **no** el HTML.
  - Un intento de recorrido de rutas (`/..%2f..%2fbackend%2f.env`, `/%2e%2e/package.json`) no devuelve archivos fuera de `dist`.
  - Todo lo anterior sin clave devuelve 401 (el panel también está cerrado).
  - Listo cuando: `npm test` pasa. Cubre **CA1, CA2, CA13**.
- [ ] **T9. Prueba local de producción.** Compilar el panel (`npm run build` en `frontend/`), arrancar el backend con `NODE_ENV=production`, una `ACCESS_PASSWORD` de prueba y la base de datos local, y abrir `http://localhost:3001` en el navegador.
  - Listo cuando: pide clave, muestra el panel con datos y marcar "Enviado" persiste. Cubre una parte de **CA1, CA4, CA5, CA6**.

## Fase 4: Archivos de despliegue (~15 min)

- [ ] **T10. `render.yaml`** en la raíz: servicio web de Node (plan `free`) con
  - `buildCommand`: `npm install --include=dev --prefix frontend && npm run build --prefix frontend && npm install --prefix backend`
  - `startCommand`: `npm run db:init --prefix backend && npm start --prefix backend`
  - `healthCheckPath: /api/salud`
  - variables: `NODE_ENV=production`, `TRUST_PROXY=1`, `NODE_VERSION`, `DATABASE_URL` desde la base de datos, `PATIENT_ID_SECRET` con `generateValue: true`, `ACCESS_PASSWORD` y `GOOGLE_CALENDAR_ICAL_URL` con `sync: false`, y las de configuración del consultorio;
  - y una base de datos PostgreSQL (plan `free`) en la misma región.
  - Listo cuando: el archivo no contiene ningún valor secreto y es YAML válido. Cubre **CA11**.
- [ ] **T11. Revisión del repositorio antes de publicar:** `.gitignore` cubre `.env`, `node_modules/` y `frontend/dist/`; buscar en el **historial de git** (no solo en los archivos actuales) la clave, `DATABASE_URL`, el enlace iCal y `PATIENT_ID_SECRET`; correr `npm audit` en `backend/` y `frontend/` y corregir las vulnerabilidades altas y críticas.
  - Listo cuando: el historial está limpio (si no, se cambia el secreto afectado) y `npm audit` no muestra altas ni críticas. Cubre **CA9**.
- [ ] **T12. [TÚ] Calendario de demostración.** Crear un calendario nuevo en Google Calendar solo para la demostración, con citas ficticias para los próximos días: varias para mañana con teléfono de ejemplo, una sin teléfono, y pacientes de seguimiento (sesión 2 de 3 sin cita futura, una con cita futura, una sesión 3 de 3). Copiar su dirección secreta en formato iCal.
  - Listo cuando: tienes el enlace y confirmaste que no hay datos reales de nadie. Cubre **CA4, CA6**.
- [ ] **T13. Subir los cambios a GitHub.** Hacer commit de todo (incluidas las specs 002 y 003) en una rama y subirla; Render despliega desde el repositorio.
  - Listo cuando: el repositorio remoto tiene `render.yaml` y el código. No se hace commit ni push sin que lo confirmes.

## Fase 5: Desplegar en Render (~30 min, depende de ti) [TÚ]

Te guío paso a paso; yo no puedo entrar a tu cuenta.

- [ ] **T14. Crear el Blueprint** en Render a partir del repositorio (`New > Blueprint`), con el plan gratuito, y cargar `ACCESS_PASSWORD` (mínimo 12 caracteres) y `GOOGLE_CALENDAR_ICAL_URL` cuando lo pida.
  - Listo cuando: Render muestra el servicio y la base de datos creados.
- [ ] **T15. Primer despliegue.** Leer el registro de compilación y de arranque. Si Vite no se instala o `db:init` falla, corregir con la decisión 9 o 10 del plan.
  - Listo cuando: el estado es "Live" y `https://<servicio>.onrender.com/api/salud` responde `{"estado":"ok"}`.
- [ ] **T16. Anotar la fecha de creación de la base de datos** y calcular su vencimiento (30 días después, más 14 de gracia) para el README.
  - Listo cuando: la fecha queda anotada.

## Fase 6: Verificación en producción (~20 min)

- [ ] **T17. Pasar los criterios de aceptación** contra la dirección pública:
  - **CA1:** abrir la dirección, escribir usuario y clave, ver el panel y "Por retomar".
  - **CA2:** `curl` sin clave a `/`, `/api/recordatorios` y `/api/seguimientos` da 401; `/api/salud` da 200.
  - **CA3:** 11 intentos fallidos seguidos con `curl` dan 429 en el último. (Se desbloquea solo a los 15 minutos; si te bloqueas tú, espera.)
  - **CA4:** las citas ficticias de mañana salen ordenadas y el botón abre `wa.me` con el mensaje correcto.
  - **CA5:** marcar "Enviado", recargar, y luego reiniciar el servicio desde Render; sigue marcado.
  - **CA6:** "Por retomar" muestra los pacientes esperados y su botón funciona.
  - **CA7:** `curl -I http://<servicio>.onrender.com/` redirige a `https://`.
  - **CA8:** `curl -I` muestra las tres cabeceras y no `X-Powered-By`.
  - **CA9:** buscar la clave, el enlace iCal y `DATABASE_URL` en el repositorio y en los registros de Render sin encontrarlos.
  - **CA10:** en la base de datos, `SELECT * FROM reminders_sent; SELECT * FROM followups_sent;` sin nombres ni teléfonos.
  - Listo cuando: los criterios CA1-CA10 están comprobados y anotados aquí con la fecha.
- [ ] **T18. Despertar tras dormirse.** Esperar más de 15 minutos sin tráfico, abrir la dirección y medir cuánto tarda. Anotar el tiempo.
  - Listo cuando: el panel carga bien después de la espera y el tiempo queda anotado para el README.
- [ ] **T19. Revisión de la marca** del panel desplegado: variables de color, curva solo en el encabezado, 360 px y zoom del 200 %, navegación por teclado, sin nombres de personas. Recorrer la lista de la skill [brand-design](../../.claude/skills/brand-design/SKILL.md).
  - Listo cuando: los 6 puntos cumplen en la dirección pública. Cubre **CA13**.
- [ ] **T20. Probar el despliegue repetible (CA11):** leyendo solo el README, ¿alguien podría crear el despliegue desde cero? Completarlo y corregir lo que falte.
  - Listo cuando: el README no depende de nada que solo tú sabes. Cubre **CA11**.
- [ ] **T21. Actualizar el README:** sección "Despliegue en Render" con los pasos, las variables, cómo crear el calendario de demostración y renovar sus citas, el aviso del primer arranque lento (~1 minuto), el vencimiento de la base de datos y cómo recrearla, y cómo entregar la clave a los revisores sin ponerla en el repositorio.
  - Listo cuando: un revisor puede abrir la aplicación y entender qué está viendo solo con el README.

## Resumen

| Fase | Tareas | Tiempo estimado |
|---|---|---|
| 1. Configuración y salud | T1-T2 | 10 min |
| 2. Seguridad y clave | T3-T7 | 25 min |
| 3. Servir el panel | T8-T9 | 10 min |
| 4. Archivos de despliegue | T10-T13 | 15 min |
| 5. Desplegar en Render | T14-T16 | 30 min (tuyo) |
| 6. Verificación | T17-T21 | 20 min |
| **Total** | **21 tareas** | **~1 h 50 min** |

Las tareas T12, T13 y la Fase 5 requieren tus manos: tu cuenta de Google, tu repositorio y tu cuenta de Render. El resto lo hago yo.
