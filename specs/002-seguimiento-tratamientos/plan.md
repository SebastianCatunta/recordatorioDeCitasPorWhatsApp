# Plan de implementación: Seguimiento de tratamientos de varias sesiones

Spec: [spec.md](spec.md) · Stack: React · Express.js · PostgreSQL
Parte de lo ya construido en [001-recordatorios-un-clic](../001-recordatorios-un-clic/plan.md): mismo calendario, mismo backend, mismo panel.

## 1. Enfoque

No se crea una aplicación nueva. Se agrega al backend una pieza de lógica pura que, dado el listado completo de citas del calendario, decide quién está "por retomar", una ruta para consultarlo y marcarlo, y una sección nueva en el panel.

Orden de construcción: **lógica pura primero** (se prueba sin red ni base de datos), luego la tabla y las rutas, y al final el panel. Es el mismo orden de la spec 001.

## 2. Qué se reutiliza y qué se agrega

| Pieza | Estado | Cambio |
|---|---|---|
| `backend/src/calendar.js` | existe | Agregar `allAppointments(icsText, timezone)`: todas las citas, pasadas y futuras, con su fecha |
| `backend/src/phone.js` | existe | Sin cambios; identifica al paciente |
| `backend/src/config.js` | existe | Agregar `FOLLOWUP_MIN_DAYS`, `FOLLOWUP_RESEND_DAYS`, `DENTIST_NAME` y `PATIENT_ID_SECRET` |
| `backend/src/sessions.js` | nuevo | Lee la línea `Sesión: X de Y` de la descripción |
| `backend/src/followups.js` | nuevo | Regla de "por retomar" (función pura) |
| `backend/src/patientId.js` | nuevo | Identificador del paciente a partir del teléfono |
| `backend/src/message.js` | existe | Agregar el mensaje de seguimiento |
| `backend/src/routes/seguimientos.js` | nuevo | Las dos rutas de la spec |
| `backend/db/schema.sql` | existe | Agregar tabla `followups_sent` |
| `frontend/src/components/FollowupSection.jsx`, `FollowupRow.jsx` | nuevo | Sección "Por retomar" |
| `frontend/src/api.js`, `App.jsx` | existe | Llamadas nuevas y montar la sección |

## 3. Dependencias

Ninguna nueva. Se usa `node:crypto` (incluido en Node) y las pruebas siguen con `node:test`.

## 4. Configuración (variables de entorno nuevas)

| Variable | Ejemplo | Uso |
|---|---|---|
| `FOLLOWUP_MIN_DAYS` | `1` | días mínimos desde la última cita para aparecer (opcional, por defecto 1) |
| `FOLLOWUP_RESEND_DAYS` | `3` | días antes de volver a pedir seguimiento tras un envío (opcional, por defecto 3) |
| `DENTIST_NAME` | `la Dra. Laura` | nombre del dentista en el mensaje de seguimiento (opcional) |
| `PATIENT_ID_SECRET` | texto largo al azar | clave para generar el identificador del paciente (secreta) |

Se agregan a `.env.example`. `PATIENT_ID_SECRET` es obligatoria; `FOLLOWUP_MIN_DAYS` y `FOLLOWUP_RESEND_DAYS` tienen valor por defecto y `DENTIST_NAME` es opcional.

## 5. Decisiones de diseño

1. **Se evalúa sobre todo el calendario, no por fecha.** Para saber si un paciente "no tiene cita futura" hay que ver todas sus citas. `allAppointments` devuelve todo y `followups.js` decide.
2. **El paciente se identifica por su teléfono normalizado.** Una persona puede tener el nombre escrito distinto en cada cita, pero el teléfono es el mismo. Citas sin teléfono válido no se pueden agrupar y quedan fuera de la lista, como pide el criterio 8.
3. **El identificador es un HMAC del teléfono, no un hash simple.** Un teléfono tiene pocas combinaciones y un hash simple se adivina probando todos los números. Con `PATIENT_ID_SECRET` la base no permite recuperar teléfonos. Se usa `HMAC-SHA256` de `node:crypto`.
4. **Regla de "por retomar" como función pura.** `findFollowups(citas, ahora, config)` recibe datos y devuelve la lista. No toca red ni base de datos, así que se prueba con citas inventadas. Pasos: agrupar por teléfono, tomar la última cita pasada, descartar si el paciente tiene alguna cita futura, exigir `Sesión: X de Y` con X < Y y contar los días desde esa cita.
5. **Los días se cuentan por fecha en la zona del consultorio**, no por horas. "Al menos 1 día" significa que la última cita fue en una fecha anterior a hoy. Se usa `CLINIC_TIMEZONE`, igual que en la spec 001.
6. **Formato de la línea de sesión tolerante.** Acepta `Sesión: 2 de 3` y `sesion 2 de 3`, sin importar mayúsculas ni tilde. Si X > Y o falta algo, la cita se trata como cita suelta.
   - **Limpieza de HTML.** Las descripciones del iCal de Google pueden traer etiquetas HTML (`<br>`, `<code>`, `<b>`), comprobado con el calendario de prueba: `<code>+591 70000003</code><br><code>Sesión: 1 de 2</code>`. Antes de buscar la sesión, se convierten los `<br>` en saltos de línea, se quitan las demás etiquetas y se decodifican entidades como `&nbsp;`.
7. **Reenvío con `FOLLOWUP_RESEND_DAYS`.** La tabla tiene clave (`patient_id`, `last_visit_date`). Marcar como enviado hace `INSERT ... ON CONFLICT DO UPDATE SET sent_at = now()`, para que un segundo envío después de los 3 días actualice la fecha en lugar de fallar. Un paciente se muestra como "Enviado" si `sent_at` es más reciente que `FOLLOWUP_RESEND_DAYS`; pasado ese plazo vuelve a pendiente.
8. **Se confía en el clic**, igual que en la spec 001: no hay forma de saber si la asistente realmente envió el mensaje.
9. **El mensaje no menciona el tratamiento.** Solo la siguiente sesión (X + 1), según la spec. Nombra al consultorio y al dentista porque sale del WhatsApp personal de la asistente.
10. **Marca.** Todo el frontend sigue la skill [brand-design](../../.claude/skills/brand-design/SKILL.md).

## 6. Riesgos y límites

| Riesgo | Mitigación |
|---|---|
| El iCal de Google podría limitar el historial de citas pasadas | Comprobado el 2026-11-03: conserva al menos 1 año (365 días), suficiente para tratamientos de semanas o meses. No se guardan citas en la base de datos. Documentarlo en el README |
| La asistente olvida escribir `Sesión: X de Y` | La cita no genera seguimiento; se explica la convención en el README |
| Citas recurrentes | Fuera de alcance, igual que en la spec 001 |
| Un paciente cambia de teléfono | Aparecerá como otra persona; límite asumido |
| Se pierde `PATIENT_ID_SECRET` | Los identificadores cambian y los envíos anteriores dejan de reconocerse; guardar la clave junto con el resto del `.env` |
| Sin inicio de sesión | Ejecutar solo en la computadora de la asistente, igual que en la spec 001 |

## 7. Cómo se verifica

Cada criterio de aceptación (CA1-CA9) de la spec tiene una tarea de verificación en [tasks.md](tasks.md). Se agrega un iCal de ejemplo en `backend/test/fixtures/seguimientos.ics` con citas pasadas y futuras para no depender del calendario real.
