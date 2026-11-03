# Plan de implementación: Recordatorios de un clic

Spec: [spec.md](spec.md) · Stack: React · Express.js · PostgreSQL
Estimación: menos de 1 hora con ayuda de IA

## 1. Enfoque

Una aplicación con dos partes: un backend Express pequeño que lee el calendario y guarda qué recordatorios se enviaron, y un panel React de una sola pantalla. Sin OAuth, sin API de WhatsApp Business y sin inicio de sesión, como indica la spec.

Orden de construcción: **datos y lógica pura primero** (se prueban sin red), luego las rutas, luego el panel. Así cada capa se verifica antes de depender de ella.

## 2. Estructura del proyecto

```
tarea2-prod-engineer/
├── backend/
│   ├── db/schema.sql              # tabla reminders_sent
│   ├── src/
│   │   ├── config.js              # lee y valida variables de entorno
│   │   ├── db.js                  # pool de PostgreSQL
│   │   ├── calendar.js            # descarga y parsea el iCal, filtra por fecha
│   │   ├── phone.js               # normaliza teléfonos
│   │   ├── message.js             # arma el mensaje y el enlace wa.me
│   │   ├── routes/recordatorios.js
│   │   ├── app.js                 # configura Express
│   │   └── index.js               # arranca el servidor
│   ├── test/                      # pruebas de phone, message y calendar
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api.js                 # llamadas al backend
│   │   ├── styles.css             # variables de marca y estilos
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── Progress.jsx
│   │       ├── AppointmentRow.jsx
│   │       └── NoPhoneList.jsx
│   ├── index.html
│   └── package.json
├── specs/001-recordatorios-un-clic/
└── CLAUDE.md
```

## 3. Dependencias

| Parte | Paquetes | Para qué |
|---|---|---|
| Backend | `express`, `pg`, `node-ical`, `dotenv`, `cors` | servidor, base de datos, leer iCal, configuración |
| Backend (pruebas) | `node:test` (incluido en Node) | pruebas sin instalar nada |
| Frontend | `react`, `react-dom`, `vite`, `@vitejs/plugin-react` | panel |
| Frontend (fuentes) | Nunito e Inter desde Google Fonts | tipografía de la marca |

## 4. Configuración (variables de entorno)

| Variable | Ejemplo | Uso |
|---|---|---|
| `GOOGLE_CALENDAR_ICAL_URL` | `https://calendar.google.com/.../basic.ics` | fuente de citas (secreta) |
| `DATABASE_URL` | `postgres://usuario:clave@localhost:5432/recordatorios` | PostgreSQL |
| `CLINIC_NAME` | `Consultorio Dental Sonrisa` | nombre en mensajes y encabezado |
| `CLINIC_TIMEZONE` | `America/Mexico_City` | decidir qué citas son "de mañana" |
| `DEFAULT_COUNTRY_CODE` | `52` | completar teléfonos de 10 dígitos |
| `PORT` | `3001` | puerto del backend |

`.env` va en `.gitignore`; solo se versiona `.env.example`.

## 5. Decisiones de diseño

1. **Fechas en la zona horaria del consultorio.** "Mañana" se calcula con `CLINIC_TIMEZONE`, no con la del servidor, para no mostrar citas del día equivocado.
2. **Lógica pura separada de la red.** `phone.js` y `message.js` son funciones sin efectos secundarios, fáciles de probar. `calendar.js` separa descargar el iCal de filtrar por fecha, para probar el filtro con un iCal de ejemplo.
3. **Identificador de la cita.** Se usa el `UID` del evento iCal más la fecha como clave (`event_uid`, `event_date`), tal como define la spec.
4. **Normalización del teléfono.** Se extrae el primer número de la descripción, se dejan solo dígitos y se acepta si tiene 10 dígitos (se antepone `DEFAULT_COUNTRY_CODE`) o entre 11 y 15 dígitos (se usa tal cual). Cualquier otro caso es inválido.
5. **Marcar como enviado es idempotente.** `INSERT ... ON CONFLICT DO NOTHING`: pulsar dos veces no duplica ni falla.
6. **El panel marca como enviado al abrir WhatsApp.** No hay forma de saber si la asistente realmente envió el mensaje; se confía en el clic. Esto es una limitación asumida de los enlaces `wa.me`.
7. **Proxy en desarrollo.** Vite redirige `/api` al backend para evitar configuración de CORS en el panel.
8. **Marca.** Todo el frontend sigue la skill [brand-design](../../.claude/skills/brand-design/SKILL.md), incluidas las variables de color, la tipografía y los textos.

## 6. Riesgos y límites

| Riesgo | Mitigación |
|---|---|
| Citas recurrentes en el iCal | Fuera de alcance según la spec; documentarlo en el README |
| El iCal de Google tarda en reflejar cambios | Botón de recarga en el panel; es una limitación de Google |
| Teléfono escrito en formato inesperado | Va a "Sin teléfono válido" para corrección manual |
| Enlace iCal filtrado | Vive solo en `.env`; si se filtra, se regenera desde Google Calendar |
| No hay inicio de sesión | Ejecutar solo en la computadora de la asistente; no exponer a internet |

## 7. Cómo se verifica

Cada criterio de aceptación de la spec tiene una tarea de verificación en [tasks.md](tasks.md), con un iCal de ejemplo versionado en `backend/test/fixtures/` para no depender del calendario real.
