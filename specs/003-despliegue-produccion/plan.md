# Plan de implementación: Despliegue a producción

Spec: [spec.md](spec.md) · Stack: React · Express.js · PostgreSQL · Hosting: Render (plan gratuito)
Parte de lo ya construido en [001](../001-recordatorios-un-clic/plan.md) y [002](../002-seguimiento-tratamientos/plan.md): mismas rutas, mismo panel.

## 1. Enfoque

No se agrega ninguna función de negocio. Se agregan al backend tres piezas pequeñas (seguridad, clave de acceso y servir el panel) y los archivos de despliegue. El orden protege la seguridad: **primero se cierra el acceso y se prueba, después se publica**. Nunca debe existir una versión desplegada sin la clave.

Orden de construcción: configuración y ruta de salud → seguridad y clave (con pruebas) → servir el panel → archivos de Render → despliegue → verificación contra la dirección pública.

Orden de los middlewares en `app.js` (importa, porque cada uno depende del anterior):

```
trust proxy
  → cabeceras de seguridad
  → ruta /api/salud (pública)
  → redirección a HTTPS (solo producción)
  → límite de intentos + clave de acceso
  → express.json (10 KB)
  → CORS (solo desarrollo)
  → rutas /api/recordatorios y /api/seguimientos
  → archivos del panel (frontend/dist) y respaldo a index.html
  → manejador de errores
```

`/api/salud` va **antes** de la redirección y de la clave: la comprobación de salud de la plataforma llega por HTTP interno, sin clave, y no debe ser redirigida.

## 2. Qué se reutiliza y qué se agrega

| Pieza | Estado | Cambio |
|---|---|---|
| `backend/src/config.js` | existe | Leer `NODE_ENV`, `ACCESS_PASSWORD`, `ACCESS_USER` (por defecto `asistente`), `TRUST_PROXY`; en producción `ACCESS_PASSWORD` es obligatoria |
| `backend/src/security.js` | nuevo | Cabeceras de seguridad y redirección a HTTPS |
| `backend/src/auth.js` | nuevo | Autenticación básica con comparación en tiempo constante y límite de intentos fallidos en memoria |
| `backend/src/app.js` | existe | Montar todo en el orden de arriba; CORS solo fuera de producción; servir `frontend/dist`; errores sin detalle en producción |
| `backend/src/index.js` | existe | Pasar la configuración nueva; arrancar solo si la configuración es válida |
| `backend/package.json` | existe | `engines` con la versión de Node |
| `render.yaml` | nuevo (raíz) | Servicio web y base de datos; secretos sin valor |
| `.env.example` | existe | Variables nuevas, sin valores reales |
| `README.md` | existe | Sección "Despliegue en Render" |
| `frontend/` | existe | **Sin cambios de código**: sigue llamando a `/api` en el mismo dominio |

## 3. Dependencias

Ninguna nueva. La clave usa `node:crypto`; el límite de intentos es un contador escrito a mano; los archivos estáticos los sirve `express.static` (incluido en Express).

## 4. Configuración (variables de entorno)

Las de la sección 2.7 de la spec. Resumen de lo nuevo respecto a 001 y 002:

| Variable | Obligatoria | Nota |
|---|---|---|
| `NODE_ENV` | no | `production` en Render |
| `ACCESS_PASSWORD` | sí, en producción | Sin ella el servidor no arranca |
| `ACCESS_USER` | no | Por defecto `asistente` |
| `TRUST_PROXY` | no | `1` en Render; por defecto 0 |

## 5. Decisiones de diseño

1. **Un servicio, un origen.** Express sirve el panel compilado. No hay CORS en producción ni `VITE_API_URL`. En desarrollo no cambia nada: Vite sigue con su proxy a `localhost:3001`.
2. **Cerrado por defecto.** La clave se aplica con `app.use` **antes** de las rutas y de los archivos estáticos; la única excepción es `/api/salud`. Una ruta nueva en el futuro queda protegida sin acordarse de nada.
3. **Clave en tiempo constante.** Se calcula SHA-256 de lo recibido y de lo esperado y se comparan con `crypto.timingSafeEqual`, que exige mismo largo. El usuario también se compara así. Se evita responder distinto según qué parte falló.
4. **Límite de intentos escrito a mano.** Un `Map` por IP con contador y hora de vencimiento de ventana (15 minutos, 10 intentos). Se limpia al vencer y tiene un tope de entradas para no crecer sin límite. Un acierto no reinicia el contador de otras IPs. Responde `429` con `Retry-After`. Va **antes** de comprobar la clave, para que un atacante no pueda seguir probando mientras está bloqueado.
5. **La IP real exige `trust proxy`.** Sin él, Render entregaría siempre la IP del proxy y diez intentos fallidos de un atacante bloquearían a todos. Con `TRUST_PROXY=1` se usa la IP de `X-Forwarded-For`. Se prueba con un `X-Forwarded-For` falso para comprobar que se cuenta por la IP correcta.
6. **Fallar rápido.** `loadConfig` lanza error si `NODE_ENV=production` y no hay `ACCESS_PASSWORD`, o si esta tiene menos de 12 caracteres. Mejor no arrancar que publicar débil.
7. **HTTPS.** La plataforma termina el TLS; Express confía en `X-Forwarded-Proto` (vía `trust proxy`) y redirige con `301` si llega `http`. La redirección usa el `Host` de la petición solo si coincide con un patrón seguro; en caso contrario responde `400`, para evitar redirecciones a hosts inventados.
8. **Respaldo a `index.html`.** Toda ruta `GET` que no empiece por `/api` y no sea un archivo devuelve `index.html`. Una ruta `/api/...` desconocida responde `404` en JSON, no el panel. El HTML no se guarda en caché (`no-cache`); los archivos con hash de `assets/` sí, por un año.
9. **Compilación con devDependencies.** Vite es una dependencia de desarrollo y Render fija `NODE_ENV=production`, lo que haría que `npm install` la omita. El comando de compilación usa `npm install --include=dev` para el frontend. Se comprueba en el primer despliegue.
10. **`db:init` en cada arranque.** Es idempotente (`CREATE TABLE IF NOT EXISTS`). Si falla, el servicio no arranca y el registro lo dice. Evita un paso manual cuando la base de datos gratuita se recrea cada 30 días.
11. **`render.yaml` sin secretos.** `PATIENT_ID_SECRET` con `generateValue: true`; `ACCESS_PASSWORD` y `GOOGLE_CALENDAR_ICAL_URL` con `sync: false` (Render las pide en el panel al crear el servicio). `DATABASE_URL` viene de la propia base de datos (`fromDatabase`), dirección interna, misma región.
12. **Ruta de salud mínima.** Responde `{ "estado": "ok" }` sin tocar la base de datos ni el calendario, para que un fallo de Google no haga que Render reinicie el servicio.
13. **Errores en producción.** El manejador registra solo `error.name`, nunca el objeto, y responde el mismo mensaje genérico en español de hoy.
14. **Marca.** El panel no cambia, así que sigue la skill [brand-design](../../.claude/skills/brand-design/SKILL.md). Solo se verifica que se vea igual ya desplegado.

## 6. Riesgos y límites

| Riesgo | Mitigación |
|---|---|
| Se publica sin clave por olvido | El servidor no arranca sin `ACCESS_PASSWORD` en producción (decisión 6) y hay una prueba que lo comprueba |
| Un secreto quedó en el historial de git | Tarea de revisión del historial antes de publicar; si aparece, se cambia el secreto |
| Vite no se instala en la compilación | Decisión 9; se ve en el primer registro de compilación |
| El servicio duerme y el primer revisor ve "cargando" un minuto | El README lo avisa. Opcional: abrir el enlace unos minutos antes de la revisión |
| La base de datos vence a los 30 días | README con la fecha de creación y cómo recrearla. Las tablas se vuelven a crear solas por `db:init` |
| Calendario de demostración sin citas futuras el día de la revisión | Tarea para crear citas en varios días y recordatorio de renovarlas |
| El límite de intentos se reinicia al dormirse el servicio | Aceptado: un servidor, demostración |
| La clave circula por autenticación básica | Solo por HTTPS; se prueba que `http` redirige y que no se sirve nada antes |
| La redirección a HTTPS rompe la comprobación de salud | `/api/salud` va antes de la redirección (sección 1) |
| El enlace iCal se filtra | Solo en variables de Render; nunca en registros ni en el repositorio |
| Dependencias con vulnerabilidades | `npm audit` en backend y frontend antes de publicar |

## 7. Cómo se verifica

Cada criterio de aceptación (CA1-CA13) de la spec tiene una tarea de verificación en [tasks.md](tasks.md). Lo de seguridad (clave, límite, cabeceras, redirección, arranque sin clave, salud) se cubre con **pruebas automáticas** sobre un servidor Express en un puerto libre, como ya hace `test/routes.test.js`. Lo que solo se ve en producción (HTTPS real, reinicio del servicio, despertar tras dormirse, marca a 360 px) se comprueba contra la dirección pública de Render.
