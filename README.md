# Sonrisa al día

Panel para que la asistente de un consultorio dental envíe los recordatorios de las citas de mañana con **un clic por paciente**. Lee las citas de Google Calendar, arma el mensaje de WhatsApp ya escrito y recuerda a quién ya se le envió.

Documentación de los features:
- Recordatorios de un clic: [spec](specs/001-recordatorios-un-clic/spec.md) · [plan](specs/001-recordatorios-un-clic/plan.md) · [tareas](specs/001-recordatorios-un-clic/tasks.md)
- Seguimiento de tratamientos: [spec](specs/002-seguimiento-tratamientos/spec.md) · [plan](specs/002-seguimiento-tratamientos/plan.md) · [tareas](specs/002-seguimiento-tratamientos/tasks.md)

## Requisitos

- Node.js 20 o superior
- PostgreSQL

## 1. Obtener el enlace secreto del calendario

1. En Google Calendar, abre **Configuración** del calendario de citas.
2. En **Integrar calendario**, copia la **Dirección secreta en formato iCal**.
3. Trátala como una contraseña: quien la tenga puede leer la agenda.

## 2. Convención de los eventos

- **Título del evento:** nombre del paciente.
- **Descripción del evento:** teléfono, por ejemplo `+52 55 1234 5678` o `5512345678`.

Las citas sin un teléfono válido aparecen en "Sin teléfono válido" para que las corrijas.

### Citas de tratamientos de varias sesiones

Si la cita es parte de un tratamiento de varias sesiones, agrega en la descripción, en una línea aparte, cuántas sesiones lleva:

```
+591 70000001
Sesión: 2 de 3
```

- No escribas el tipo de tratamiento. No hace falta y no se guarda.
- Si la línea no está, la cita se trata como una cita suelta y no genera seguimiento.
- La sección **Por retomar** muestra a los pacientes cuya última cita fue una sesión a medias (por ejemplo, 2 de 3), que no tienen una próxima cita agendada y que llevan al menos 1 día sin volver.
- Cuando el paciente agenda su siguiente cita en el calendario, desaparece de la lista.
- Después de escribirle, el paciente queda como "Enviado". Si pasan 3 días y sigue sin cita, vuelve a aparecer.

## 3. Configurar

```bash
cd backend
cp .env.example .env     # y edita los valores
npm install
npm run db:init          # crea las tablas en PostgreSQL
```

| Variable | Uso |
|---|---|
| `GOOGLE_CALENDAR_ICAL_URL` | Enlace secreto del paso 1 |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `CLINIC_NAME` | Nombre del consultorio (aparece en el encabezado y en el mensaje) |
| `CLINIC_TIMEZONE` | Zona horaria, por ejemplo `America/Mexico_City` |
| `DEFAULT_COUNTRY_CODE` | Código de país para teléfonos de 10 dígitos |
| `PORT` | Puerto del backend (por defecto 3001) |
| `DENTIST_NAME` | Nombre del dentista en el mensaje de seguimiento, por ejemplo `la Dra. Laura` (opcional) |
| `PATIENT_ID_SECRET` | Texto largo al azar para identificar a los pacientes sin guardar su teléfono. Guárdalo junto con el resto del `.env` |
| `FOLLOWUP_MIN_DAYS` | Días sin volver antes de aparecer en "Por retomar" (opcional, por defecto 1) |
| `FOLLOWUP_RESEND_DAYS` | Días antes de volver a pedir seguimiento tras un envío (opcional, por defecto 3) |

## 4. Ejecutar

En dos terminales:

```bash
cd backend && npm start        # http://localhost:3001
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Abre http://localhost:5173.

## Pruebas

```bash
cd backend && npm test
```

## Limitaciones conocidas

- **Citas recurrentes:** no se expanden; se asume una cita por evento.
- **Sin inicio de sesión:** ejecútalo solo en la computadora de la asistente y no lo expongas a internet.
- **"Enviado" se marca al abrir WhatsApp.** Los enlaces `wa.me` no avisan si el mensaje realmente se envió; el sistema confía en el clic.
- **Seguimiento:** el calendario de Google conserva al menos 1 año de citas pasadas (comprobado), suficiente para tratamientos de semanas o meses. Si un paciente cambia de teléfono, aparecerá como otra persona.
- **Retraso de Google:** el enlace iCal puede tardar en reflejar cambios recientes del calendario. Usa "Actualizar".
