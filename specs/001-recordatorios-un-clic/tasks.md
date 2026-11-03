# Tareas: Recordatorios de un clic

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Marca `[x]` al terminar cada tarea. Hazlas en orden. `[P]` indica que puede hacerse en paralelo con la tarea anterior. `CA1-CA4` son los criterios de aceptación de la spec.

## Fase 1: Base del proyecto (~5 min)

- [x] **T1. Crear estructura y paquetes del backend.** Carpeta `backend/` con `package.json`, dependencias (`express`, `pg`, `node-ical`, `dotenv`, `cors`) y scripts `start` y `test`.
  - Listo cuando: `npm install` termina sin errores.
- [x] **T2. Configuración y `.env.example`.** `src/config.js` lee las variables del plan y falla con un mensaje claro si falta alguna. Agregar `.env` a `.gitignore`.
  - Listo cuando: arrancar sin `GOOGLE_CALENDAR_ICAL_URL` muestra qué variable falta.
- [x] **T3. Base de datos.** `db/schema.sql` con `reminders_sent` (`event_uid`, `event_date`, `sent_at`, clave primaria compuesta) y `src/db.js` con el pool. Crear la base y aplicar el esquema.
  - Listo cuando: la tabla existe y `db.js` ejecuta `SELECT 1`.

## Fase 2: Lógica pura con pruebas (~10 min)

- [x] **T4. Normalizar teléfonos** en `src/phone.js` según la decisión 4 del plan. Pruebas en `test/phone.test.js`: 10 dígitos con código por defecto, `+52 55 1234 5678`, con guiones y paréntesis, muy corto, vacío, texto sin números.
  - Listo cuando: `npm test` pasa. Cubre **CA4** (teléfono inválido → nulo).
- [x] **T5. [P] Mensaje y enlace** en `src/message.js`: función que recibe nombre, fecha, hora, teléfono y `CLINIC_NAME`, y devuelve el texto y la URL `https://wa.me/<telefono>?text=<codificado>`. Pruebas: tildes, espacios y signos de interrogación bien codificados.
  - Listo cuando: el enlace decodificado contiene nombre, día, hora y consultorio. Cubre **CA2**.
- [x] **T6. Leer el calendario** en `src/calendar.js`: descargar el iCal, parsear eventos y filtrar los de una fecha en `CLINIC_TIMEZONE`, ordenados por hora, devolviendo `uid`, nombre (título), descripción y hora. Crear `test/fixtures/ejemplo.ics` con citas de varios días, una sin teléfono y una con formato raro.
  - Listo cuando: el filtro devuelve exactamente las citas de la fecha pedida y en orden. Cubre **CA1**.

## Fase 3: API (~10 min)

- [x] **T7. Ruta `GET /api/recordatorios?fecha=`** en `src/routes/recordatorios.js`: por defecto mañana; combina citas del calendario con la tabla `reminders_sent` y devuelve `eventUid`, `nombre`, `hora`, `telefono`, `enlaceWhatsapp` y `enviado` (más `enviadoA` con la hora de envío). Validar el formato de `fecha`.
  - Listo cuando: con un iCal de prueba, la respuesta lista las citas esperadas y `fecha` inválida devuelve error 400. Cubre **CA1, CA2, CA4**.
- [x] **T8. Ruta `POST /api/recordatorios/:eventUid/enviado`** con cuerpo `{ fecha }`. Insertar con `ON CONFLICT DO NOTHING`.
  - Listo cuando: llamarla dos veces no da error y deja un solo registro. Cubre **CA3**.
- [x] **T9. Servidor.** `src/app.js` y `src/index.js`: JSON, CORS solo para el origen local, rutas montadas y manejo de errores con mensajes en español (sin detalles técnicos hacia el panel).
  - Listo cuando: `npm start` levanta en el puerto configurado y las dos rutas responden con `curl`.

## Fase 4: Panel React (~20 min)

Todas las tareas de esta fase siguen la skill [brand-design](../../.claude/skills/brand-design/SKILL.md). Léela antes de empezar.

- [x] **T10. Crear el frontend** con Vite + React en `frontend/`, proxy de `/api` al backend, fuentes Nunito e Inter, y `src/styles.css` con las variables de color de la skill.
  - Listo cuando: `npm run dev` muestra una página vacía con el fondo `--blanco-diente`.
- [x] **T11. Encabezado** (`Header.jsx`): "Sonrisa al día", el nombre del consultorio y el borde inferior en curva de sonrisa. La curva solo va aquí.
  - Listo cuando: se ve como describe la skill en 360px y en escritorio.
- [x] **T12. Lista de citas** (`api.js`, `App.jsx`, `AppointmentRow.jsx`): selector de fecha con "mañana" por defecto y filas por hora, cada una con hora, nombre y botón "Enviar por WhatsApp". Estados de carga, vacío y error según la skill.
  - Listo cuando: con el backend corriendo se ven las citas de mañana. Cubre **CA1**.
- [x] **T13. Envío y estado.** Al pulsar el botón: abrir `enlaceWhatsapp` en una pestaña nueva, llamar a `POST .../enviado` y mostrar la fila como "Enviado" con la hora.
  - Listo cuando: el estado sigue al recargar la página. Cubre **CA2, CA3**.
- [x] **T14. [P] Progreso y cierre** (`Progress.jsx`): barra recta con "X de Y recordatorios enviados" y, al llegar al total, el mensaje de cierre solo texto.
  - Listo cuando: el contador cambia al marcar un envío.
- [x] **T15. [P] Sin teléfono válido** (`NoPhoneList.jsx`): sección con las citas sin enlace, sin botón, con etiqueta ámbar y texto que explica qué corregir.
  - Listo cuando: una cita sin teléfono aparece aquí y no en la lista con botón. Cubre **CA4**.

## Fase 5: Verificación final (~10 min)

- [ ] **T16. Pasar los criterios de aceptación** (parcial: la API se verificó de punta a punta el 2026-11-03 con PostgreSQL real; falta recorrer la interfaz en un navegador) con el iCal de prueba o un calendario de prueba:
  - **CA1:** N citas en el calendario → N filas, ordenadas por hora, con nombre y hora.
  - **CA2:** el botón abre `wa.me` con el número correcto y un mensaje con nombre, día y hora correctos.
  - **CA3:** tras pulsar, queda "Enviado", se mantiene al recargar y el contador se actualiza.
  - **CA4:** cita sin teléfono o con formato inválido → aparece en "Sin teléfono válido" sin botón.
  - Listo cuando: los 4 criterios están comprobados y anotados aquí con la fecha.
- [ ] **T17. Revisión de la marca.** Recorrer la lista "Antes de dar por terminada una interfaz" de la skill (variables de color, curva solo en el encabezado, 360px y zoom 200%, teclado, sin nombres de personas).
  - Listo cuando: los 6 puntos cumplen.
- [x] **T18. README breve** en la raíz: cómo obtener el enlace iCal secreto de Google Calendar, configurar `.env`, crear la base, arrancar backend y frontend, y las limitaciones (citas recurrentes, sin inicio de sesión, confianza en el clic).
  - Listo cuando: alguien que no conoce el proyecto puede ponerlo a funcionar solo con el README.

## Resumen

| Fase | Tareas | Tiempo estimado |
|---|---|---|
| 1. Base | T1-T3 | 5 min |
| 2. Lógica pura | T4-T6 | 10 min |
| 3. API | T7-T9 | 10 min |
| 4. Panel | T10-T15 | 20 min |
| 5. Verificación | T16-T18 | 10 min |
| **Total** | **18 tareas** | **~55 min** |
