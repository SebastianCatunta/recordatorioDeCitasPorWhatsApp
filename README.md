# Sonrisa al día

Panel para que la asistente de un consultorio dental envíe los recordatorios de las citas de mañana con **un clic por paciente**. Lee las citas de Google Calendar, arma el mensaje de WhatsApp ya escrito y recuerda a quién ya se le envió.

Documentación de los features:
- Recordatorios de un clic: [spec](specs/001-recordatorios-un-clic/spec.md) · [plan](specs/001-recordatorios-un-clic/plan.md) · [tareas](specs/001-recordatorios-un-clic/tasks.md)
- Seguimiento de tratamientos: [spec](specs/002-seguimiento-tratamientos/spec.md) · [plan](specs/002-seguimiento-tratamientos/plan.md) · [tareas](specs/002-seguimiento-tratamientos/tasks.md)
- Despliegue a producción: [spec](specs/003-despliegue-produccion/spec.md) · [plan](specs/003-despliegue-produccion/plan.md) · [tareas](specs/003-despliegue-produccion/tasks.md)

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
| `NODE_ENV` | `production` en el servidor publicado. Activa la clave de acceso obligatoria y la redirección a HTTPS |
| `ACCESS_PASSWORD` | Clave para entrar al panel. **Obligatoria en producción**, mínimo 12 caracteres. En desarrollo no se pide |
| `ACCESS_USER` | Usuario para entrar (opcional, por defecto `asistente`) |
| `TRUST_PROXY` | Cuántos proxies hay delante del servidor: `1` en Render (opcional, por defecto 0) |

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

## Despliegue en Render

La aplicación se publica como **un solo servicio**: Express sirve la API y el panel ya compilado, más una base de datos PostgreSQL. Todo se declara en [render.yaml](render.yaml), sin secretos dentro.

### Antes de empezar

1. **Calendario de demostración.** Crea un calendario nuevo en Google Calendar solo para esto, con **citas ficticias** y teléfonos de ejemplo (nunca datos reales de pacientes, porque quien entre al panel los verá). Agrega citas para mañana y para los próximos días, y pacientes de seguimiento (`Sesión: 2 de 3` sin cita futura, otro con cita futura, otro `Sesión: 3 de 3`). Copia su dirección secreta en formato iCal (paso 1).
2. **Repositorio en GitHub** con el código subido (Render despliega desde ahí). No subas `.env`: ya está en `.gitignore`.

### Pasos

1. En [Render](https://render.com), crea una cuenta y elige **New > Blueprint**.
2. Conecta el repositorio de GitHub. Render lee `render.yaml` y propone el servicio `sonrisa-al-dia` y la base `sonrisa-db`, ambos en plan gratuito.
3. Cuando lo pida, escribe los dos secretos:
   - `ACCESS_PASSWORD`: una clave larga (mínimo 12 caracteres).
   - `GOOGLE_CALENDAR_ICAL_URL`: la dirección secreta del calendario de demostración.
4. Confirma. Render compila el panel, prepara las tablas (`db:init`, que no borra datos) y arranca el servidor. Cuando el estado sea **Live**, abre `https://<tu-servicio>.onrender.com`.
5. El navegador pide usuario y clave: el usuario es `asistente` (o el que pongas en `ACCESS_USER`) y la clave es `ACCESS_PASSWORD`.

`PATIENT_ID_SECRET` lo genera Render solo. Las demás variables (`CLINIC_NAME`, `DENTIST_NAME`, zona horaria, país) vienen con valores de demostración en `render.yaml` y se cambian desde el panel de Render.

### Qué esperar con el plan gratuito

- **Primer arranque lento.** El servicio se duerme tras 15 minutos sin visitas y la primera visita después tarda cerca de **1 minuto** en despertarlo. Si vas a mostrarlo a alguien, ábrelo unos minutos antes.
- **La base de datos vence a los 30 días** de crearse y, tras 14 días de gracia, Render la elimina. Solo guarda las marcas de "Enviado", y las tablas se vuelven a crear solas al arrancar. Para recrearla: crea una base nueva y actualiza `DATABASE_URL`. Fecha de creación de la base actual: _(anótala aquí al desplegar)_.
- **Citas de demostración que caducan.** El panel muestra "mañana", así que renueva las citas del calendario de demostración antes de cada revisión.

### Entregar el acceso a los revisores

Comparte la dirección, el usuario y la clave por el canal de la entrega del curso. **No pongas la clave en el repositorio ni en este archivo.**

### Seguridad

- Sin la clave, el panel y la API responden `401`. Solo `/api/salud` es pública y no muestra datos.
- Después de 10 claves incorrectas desde la misma conexión, el acceso se bloquea 15 minutos.
- Los datos del calendario de demostración son ficticios. La base de datos no guarda nombres ni teléfonos, solo identificadores y fechas.
- La base de datos solo acepta conexiones desde dentro de Render. Para consultarla desde tu computadora, agrega tu IP temporalmente en el panel de Render y quítala al terminar.

## Limitaciones conocidas

- **Citas recurrentes:** no se expanden; se asume una cita por evento.
- **Un solo calendario:** el panel lee el calendario configurado en `GOOGLE_CALENDAR_ICAL_URL`. Los revisores ven ese calendario de demostración, no el suyo.
- **Clave de acceso simple:** una sola clave compartida protege el panel; no hay usuarios ni roles. En desarrollo local no se pide.
- **"Enviado" se marca al abrir WhatsApp.** Los enlaces `wa.me` no avisan si el mensaje realmente se envió; el sistema confía en el clic.
- **Seguimiento:** el calendario de Google conserva al menos 1 año de citas pasadas (comprobado), suficiente para tratamientos de semanas o meses. Si un paciente cambia de teléfono, aparecerá como otra persona.
- **Retraso de Google:** el enlace iCal puede tardar en reflejar cambios recientes del calendario. Usa "Actualizar".
