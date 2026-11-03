# Spec: Recordatorios de un clic para las citas de mañana

Estado: borrador · Proyecto: asistente de citas para consultorios dentales
Stack: React (frontend) · Express.js (backend) · PostgreSQL (base de datos)
Tiempo estimado de implementación: menos de 1 hora

## 1. Definición del problema

**Situación actual.** La asistente revisa Google Calendar, copia el teléfono de cada paciente, abre WhatsApp, escribe el mensaje y lo envía. Lo repite con cada cita y esto le ocupa buena parte de la mañana.

**Problema.**
- Escribir cada recordatorio a mano es lento y se hace de forma irregular.
- Sin recordatorio, cerca del 30% de los pacientes no llega y el espacio se pierde.
- La asistente no tiene una vista clara de a quién ya le escribió y a quién no.

**A quién afecta.** Principalmente a la asistente (tiempo) y al dentista (huecos en la agenda).

**Idea clave.** No automatizamos el envío. Preparamos todo para que enviar cada recordatorio sea **un solo clic**: el sistema arma la lista de citas de mañana y un enlace de WhatsApp con el mensaje ya escrito. La asistente solo revisa y envía. Esto elimina el trabajo repetitivo sin depender de la API de WhatsApp Business ni de aprobaciones externas.

**Objetivos medibles.**
- Bajar el tiempo de la asistente en recordatorios a menos de 15 minutos al día.
- Que el 100% de las citas del día siguiente con teléfono válido tengan su recordatorio enviado antes del cierre del día anterior.

**Fuera de alcance.** Envío automático, lectura de respuestas del paciente, confirmaciones, seguimiento de tratamientos, facturación, expediente clínico, inicio de sesión.

## 2. Diseño de la solución

### 2.1 Vista general

```
Google Calendar (enlace iCal secreto)
        │
        ▼
Backend Express ──► PostgreSQL (qué recordatorios ya se enviaron)
        ▲
        │ API REST
Panel React ──► abre WhatsApp con el mensaje listo (enlace wa.me)
```

### 2.2 Fuente de las citas

- Se usa la **dirección secreta en formato iCal** que Google Calendar ofrece en Configuración del calendario. No requiere OAuth ni credenciales de Google.
- El backend la lee desde la variable de entorno `GOOGLE_CALENDAR_ICAL_URL`.
- **Convención del evento:** el título es el nombre del paciente y la descripción contiene el teléfono (por ejemplo `+52 55 1234 5678`).
- Limitación aceptada: se asume que las citas son eventos individuales, no recurrentes.

### 2.3 Backend (Express)

| Método y ruta | Uso |
|---|---|
| `GET /api/recordatorios?fecha=YYYY-MM-DD` | Devuelve las citas de esa fecha (por defecto, mañana), ordenadas por hora |
| `POST /api/recordatorios/:eventUid/enviado` | Marca el recordatorio de esa cita como enviado |

Cada cita devuelta incluye: `eventUid`, `nombre`, `hora`, `telefono` (nulo si es inválido), `enlaceWhatsapp` (nulo si no hay teléfono) y `enviado` (verdadero o falso).

**Reglas:**
- El teléfono se normaliza a solo dígitos con código de país. Si tiene 10 dígitos, se antepone el código de país por defecto (`DEFAULT_COUNTRY_CODE`). Si no se puede normalizar, es inválido.
- El enlace tiene la forma `https://wa.me/<telefono>?text=<mensaje codificado>`.
- Mensaje: "Hola {nombre}, le recordamos su cita en {consultorio} el {día} a las {hora}. ¿Nos confirma su asistencia? Gracias."
- `{consultorio}` sale de la variable de entorno `CLINIC_NAME`, para que cualquier dentista use la aplicación sin cambiar el código.
- El mensaje no menciona el motivo de la consulta.

### 2.4 Base de datos (PostgreSQL)

Una sola tabla:

**`reminders_sent`**

| Campo | Tipo | Nota |
|---|---|---|
| event_uid | text | id del evento en el calendario |
| event_date | date | fecha de la cita |
| sent_at | timestamptz | cuándo se marcó como enviado |

Clave primaria: (`event_uid`, `event_date`). No se guarda el nombre ni el teléfono del paciente.

### 2.5 Panel (React)

Una sola pantalla:
- Selector de fecha, con "mañana" por defecto.
- Lista de citas por hora, cada una con nombre, hora y un botón **"Enviar por WhatsApp"**.
- Al pulsar el botón, se abre el enlace en una pestaña nueva y la cita pasa a **"Enviado"** (se muestra atenuada y con la hora de envío).
- Sección **"Sin teléfono válido"** con las citas que no tienen botón, para que la asistente las corrija en el calendario.
- Contador visible: "X de Y recordatorios enviados".

### 2.6 Privacidad

El enlace iCal es secreto y vive solo en variables de entorno, nunca en el código ni en el repositorio. La base de datos no guarda datos del paciente.

## 3. Criterios de aceptación

Se verifican con un calendario de prueba que tenga citas para mañana.

1. **Lista de citas.** Si el calendario tiene N citas para la fecha elegida, el panel muestra exactamente esas N, ordenadas por hora, cada una con nombre y hora.
2. **Enlace prellenado.** Al pulsar "Enviar por WhatsApp" en una cita con teléfono válido, se abre WhatsApp con el chat de ese número y un mensaje que incluye el nombre del paciente, el día y la hora correctos.
3. **Estado persistente.** Después de pulsar el botón, la cita aparece como "Enviado" y sigue así al recargar la página. El contador "X de Y" se actualiza.
4. **Citas sin teléfono válido.** Una cita sin teléfono o con formato inválido aparece en "Sin teléfono válido", sin botón de envío.

## 4. Cómo se mide el éxito

- Tiempo diario de la asistente en recordatorios, según su propio reporte: menos de 15 minutos.
- Porcentaje de citas de mañana marcadas como enviadas antes de que termine el día: 100% de las que tienen teléfono válido.
- Tasa de inasistencia mensual: observar la baja respecto al ~30% actual.
