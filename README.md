# Sonrisa al día

Panel para que la asistente de un consultorio dental envíe los recordatorios de las citas de mañana con **un clic por paciente**. Lee las citas de Google Calendar, arma el mensaje de WhatsApp ya escrito y recuerda a quién ya se le envió.

Documentación del feature: [spec](specs/001-recordatorios-un-clic/spec.md) · [plan](specs/001-recordatorios-un-clic/plan.md) · [tareas](specs/001-recordatorios-un-clic/tasks.md)

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

## 3. Configurar

```bash
cd backend
cp .env.example .env     # y edita los valores
npm install
npm run db:init          # crea la tabla en PostgreSQL
```

| Variable | Uso |
|---|---|
| `GOOGLE_CALENDAR_ICAL_URL` | Enlace secreto del paso 1 |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `CLINIC_NAME` | Nombre del consultorio (aparece en el encabezado y en el mensaje) |
| `CLINIC_TIMEZONE` | Zona horaria, por ejemplo `America/Mexico_City` |
| `DEFAULT_COUNTRY_CODE` | Código de país para teléfonos de 10 dígitos |
| `PORT` | Puerto del backend (por defecto 3001) |

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
- **Retraso de Google:** el enlace iCal puede tardar en reflejar cambios recientes del calendario. Usa "Actualizar".
