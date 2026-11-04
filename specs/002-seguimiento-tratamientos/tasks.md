# Tareas: Seguimiento de tratamientos de varias sesiones

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Marca `[x]` al terminar cada tarea. Hazlas en orden. `[P]` indica que puede hacerse en paralelo con la tarea anterior. `CA1-CA9` son los criterios de aceptación de la spec.

## Fase 1: Base (~5 min)

- [x] **T1. Configuración.** En `src/config.js` leer `FOLLOWUP_MIN_DAYS` (por defecto 1), `FOLLOWUP_RESEND_DAYS` (por defecto 3), `DENTIST_NAME` (opcional) y `PATIENT_ID_SECRET` (obligatoria). Actualizar `.env.example`.
  - Listo cuando: arrancar sin `PATIENT_ID_SECRET` indica qué variable falta y las otras dos tienen su valor por defecto.
- [x] **T2. Tabla `followups_sent`.** En `db/schema.sql` con `patient_id`, `last_visit_date`, `sent_at` y clave primaria (`patient_id`, `last_visit_date`). Aplicarla a la base.
  - Listo cuando: la tabla existe y no tiene columnas de nombre, teléfono ni tratamiento. Apoya **CA9**.

## Fase 2: Lógica pura con pruebas (~15 min)

- [x] **T3. Leer la línea de sesión** en `src/sessions.js`: primero limpia el HTML de la descripción (`<br>` a salto de línea, quitar etiquetas, decodificar entidades) y luego devuelve `{ actual, total }` o nulo. Pruebas en `test/sessions.test.js`: `Sesión: 2 de 3`, `sesion 2 de 3`, mayúsculas, dentro de un texto con teléfono, sin la línea, `4 de 3`, `0 de 3`, y con HTML como `<code>+591 70000003</code><br><code>Sesión: 1 de 2</code>` y `Sesión:&nbsp;2 de 3`.
  - Listo cuando: `npm test` pasa, incluidos los casos con HTML. Apoya **CA4**.
- [x] **T4. [P] Identificador del paciente** en `src/patientId.js`: HMAC-SHA256 del teléfono normalizado con `PATIENT_ID_SECRET`. Pruebas: mismo teléfono da el mismo identificador, teléfonos distintos dan identificadores distintos, el resultado no contiene el teléfono.
  - Listo cuando: `npm test` pasa. Apoya **CA9**.
- [x] **T5. Todas las citas del calendario** en `src/calendar.js`: agregar `allAppointments(icsText, timezone)` que devuelve todas las citas (pasadas y futuras, sin canceladas) con `uid`, `nombre`, `descripcion`, `inicio` y `fecha` en la zona del consultorio. Crear `test/fixtures/seguimientos.ics` con: un paciente en sesión 2 de 3 sin cita futura, uno con cita futura, uno en sesión 3 de 3, una cita suelta, uno sin teléfono y uno ya enviado.
  - Listo cuando: devuelve todas las citas del fixture. Las pruebas de la spec 001 siguen pasando.
- [x] **T6. Regla de "por retomar"** en `src/followups.js`: `findFollowups(citas, ahora, config)` según la decisión 4 del plan. Pruebas en `test/followups.test.js`, una por criterio.
  - Con sesión 2 de 3, sin cita futura y 1 día desde la cita: aparece. Cubre **CA1**.
  - El mismo paciente con una cita futura: no aparece. Cubre **CA2**.
  - Sesión 3 de 3: no aparece. Cubre **CA3**.
  - Cita sin línea `Sesión: X de Y`: no aparece. Cubre **CA4**.
  - Cita de hoy (0 días): no aparece. Cubre el límite de **CA1**.
  - Sin teléfono válido: no aparece. Cubre **CA8**.
  - Dos citas del mismo paciente con el nombre escrito distinto: aparece una sola vez, con los datos de la última.
  - Listo cuando: `npm test` pasa con todos los casos.
- [x] **T7. [P] Mensaje de seguimiento** en `src/message.js`: recibe nombre, siguiente sesión, teléfono, `CLINIC_NAME` y `DENTIST_NAME`, y devuelve el texto y la URL `https://wa.me/<telefono>?text=<codificado>`. Pruebas: tildes y signos de interrogación bien codificados, incluye nombre, consultorio, dentista y "sesión X+1", omite al dentista si no está configurado, no contiene la palabra de ningún tratamiento.
  - Listo cuando: el enlace decodificado coincide con el texto de la spec. Cubre **CA5**.

## Fase 3: API (~10 min)

- [x] **T8. Ruta `GET /api/seguimientos`** en `src/routes/seguimientos.js`: descarga el calendario, aplica `findFollowups`, cruza con `followups_sent` y devuelve `pacienteId`, `nombre`, `ultimaCita`, `diasSinVolver`, `sesion`, `enlaceWhatsapp`, `enviado` y `enviadoA`. Orden: más días sin volver primero. Un paciente cuenta como `enviado` si su `sent_at` es más reciente que `FOLLOWUP_RESEND_DAYS`.
  - Listo cuando: con el iCal de prueba la respuesta lista solo a los pacientes esperados y un paciente enviado hace más de 3 días vuelve como pendiente. Cubre **CA1-CA4, CA7, CA8**.
- [x] **T9. Ruta `POST /api/seguimientos/:pacienteId/enviado`** con cuerpo `{ ultimaCita }`: `INSERT ... ON CONFLICT DO UPDATE SET sent_at = now()`. Validar el formato de `ultimaCita`.
  - Listo cuando: llamarla dos veces no da error y deja un solo registro por paciente y fecha. Cubre **CA6, CA7**.
- [x] **T10. Montar las rutas** en `src/app.js` con errores en español, sin detalles técnicos hacia el panel. Agregar pruebas de rutas en `test/routes.test.js`.
  - Listo cuando: las dos rutas responden con `curl` y las pruebas pasan.

## Fase 4: Panel React (~15 min)

Todas las tareas de esta fase siguen la skill [brand-design](../../.claude/skills/brand-design/SKILL.md). Léela antes de empezar.

- [x] **T11. Llamadas al backend** en `frontend/src/api.js`: obtener seguimientos y marcar uno como enviado.
  - Listo cuando: las funciones devuelven los datos con el backend corriendo.
- [x] **T12. Fila de seguimiento** (`FollowupRow.jsx`): nombre, "última cita hace N días", sesión ("2 de 3") y botón "Escribir por WhatsApp". Al pulsar, abre el enlace en una pestaña nueva, llama a `POST .../enviado` y muestra la fila atenuada como "Enviado" con la fecha.
  - Listo cuando: el estado sigue al recargar la página. Cubre **CA5, CA6**.
- [x] **T13. Sección "Por retomar"** (`FollowupSection.jsx` y `App.jsx`): lista de filas, contador "X de Y seguimientos enviados", y estados de carga, error y vacío (mensaje positivo y breve) según la skill.
  - Listo cuando: la sección aparece en el panel debajo de los recordatorios y el contador cambia al marcar un envío. Cubre **CA1, CA6**.

## Fase 5: Verificación final (~10 min)

- [ ] **T14. Pasar los criterios de aceptación** (parcial: CA1-CA9 verificados con pruebas automáticas sobre el iCal de ejemplo, y de punta a punta el 2026-11-03 con PostgreSQL y el calendario de prueba reales; falta recorrer la interfaz en un navegador) con el iCal de prueba o un calendario de prueba:
  - **CA1:** sesión 2 de 3, sin cita futura, 1 día o más → aparece en "Por retomar".
  - **CA2:** el mismo paciente con cita futura → no aparece.
  - **CA3:** sesión 3 de 3 → no aparece.
  - **CA4:** cita sin `Sesión: X de Y` → no genera seguimiento.
  - **CA5:** el botón abre `wa.me` con el número correcto y un mensaje con nombre, consultorio, dentista y siguiente sesión, sin tipo de tratamiento.
  - **CA6:** tras pulsar, queda "Enviado", se mantiene al recargar y el contador se actualiza.
  - **CA7:** un paciente enviado no vuelve a pendiente antes de 3 días; después de 3 días sin cita, sí vuelve.
  - **CA8:** paciente sin teléfono válido → no aparece con botón.
  - **CA9:** revisar la base con `SELECT * FROM followups_sent`: sin nombres, teléfonos ni tratamiento.
  - Listo cuando: los 9 criterios están comprobados y anotados aquí con la fecha.
- [ ] **T15. Revisión de la marca** (parcial: revisada en el código, falta verla en un navegador a 360px y con zoom del 200%). Recorrer la lista "Antes de dar por terminada una interfaz" de la skill (variables de color, curva solo en el encabezado, 360px y zoom 200%, teclado, sin nombres de personas).
  - Listo cuando: los 6 puntos cumplen.
- [x] **T16. Actualizar el README**: cómo escribir `Sesión: X de Y` en la descripción de la cita, las cuatro variables nuevas, y las limitaciones (cambio de teléfono, confianza en el clic). Anotar que el iCal conserva al menos 1 año de historial (comprobado).
  - Listo cuando: la asistente puede usar el seguimiento solo con el README.

## Resumen

| Fase | Tareas | Tiempo estimado |
|---|---|---|
| 1. Base | T1-T2 | 5 min |
| 2. Lógica pura | T3-T7 | 15 min |
| 3. API | T8-T10 | 10 min |
| 4. Panel | T11-T13 | 15 min |
| 5. Verificación | T14-T16 | 10 min |
| **Total** | **16 tareas** | **~55 min** |
