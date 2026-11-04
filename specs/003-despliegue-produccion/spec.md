# Spec: Despliegue a producción

Estado: borrador · Proyecto: asistente de citas para consultorios dentales
Stack: React (frontend) · Express.js (backend) · PostgreSQL (base de datos) · Hosting: Render
Depende de: [001-recordatorios-un-clic](../001-recordatorios-un-clic/spec.md) y [002-seguimiento-tratamientos](../002-seguimiento-tratamientos/spec.md)

## 1. Definición del problema

**Situación actual.** La aplicación solo corre en la computadora de quien la desarrolla: backend en `localhost:3001`, panel con el servidor de desarrollo de Vite y PostgreSQL local. Nadie más puede abrirla.

**Problema.**
- Es un proyecto de curso y los revisores necesitan abrirla desde internet con un enlace.
- Si se publica tal cual, **cualquiera con el enlace vería nombres y teléfonos** del calendario y podría marcar envíos en la base de datos.
- El código tiene supuestos de desarrollo que fallan en producción: CORS solo acepta `localhost`, el panel llama a `/api` a través del proxy de Vite (que no existe en producción) y no hay forma de saber si el servidor está vivo.

**A quién afecta.** A los revisores del curso (necesitan probarla) y a la asistente y el dentista si algún día se usa de verdad.

**Idea clave.** **Un solo servicio web.** Express sirve la API **y** el panel ya compilado, en el mismo dominio. Con eso desaparecen CORS y la URL de la API del frontend, y solo hay dos cosas que cuidar: el servicio y la base de datos. El acceso se protege con una **clave simple**, y el calendario conectado es uno de **demostración con citas ficticias**.

**Objetivos medibles.**
- Que un revisor abra una dirección `https://…`, escriba la clave y use los recordatorios y el seguimiento sin instalar nada.
- Que sin la clave no se pueda leer ni escribir nada.
- Que el despliegue se repita desde cero a partir del repositorio, sin pasos manuales ocultos.

**Fuera de alcance.** Dominio propio, que cada persona conecte su propio Google Calendar, cuentas o roles de usuario, copias de seguridad de la base de datos, monitoreo y alertas, despliegue automático en cada cambio de código (CI/CD), múltiples consultorios, envío automático de mensajes.

## 2. Diseño de la solución

### 2.1 Vista general

```
Revisor ──https──► Render: Web Service (Express)
                      │  1. pide clave (autenticación básica)
                      │  2. /api/*  → rutas de 001 y 002
                      │  3. todo lo demás → panel React compilado (frontend/dist)
                      │
                      ├─► Render: PostgreSQL (qué se envió)
                      └─► Google Calendar (enlace iCal secreto del calendario de demostración)
```

Un solo origen: el panel y la API comparten dirección, así que el panel sigue llamando a `/api` sin cambios y no se necesita CORS en producción.

### 2.2 Qué se construye al desplegar

- **Compilación:** se instalan las dependencias del backend y del frontend y se ejecuta `vite build`, que genera `frontend/dist`.
- **Arranque:** se prepara la base de datos con `db:init` (es idempotente: solo crea las tablas si no existen) y luego se inicia Express.
- **Puerto:** el servicio escucha en el puerto que la plataforma entrega en `PORT` (ya soportado por `config.js`).
- **Infraestructura como archivo:** un `render.yaml` en la raíz declara el servicio y la base de datos para poder repetir el despliegue sin tocar paneles a mano. Los secretos no van en el archivo.

### 2.3 Cambios en el backend (Express)

| Cambio | Detalle |
|---|---|
| Servir el panel | Si existe `frontend/dist`, Express lo sirve como archivos estáticos y devuelve `index.html` para cualquier ruta que no empiece por `/api` |
| Acceso con clave | Middleware de autenticación básica sobre **todo** (panel y API) excepto `GET /api/salud`. La clave sale de `ACCESS_PASSWORD`; el usuario, de `ACCESS_USER` (por defecto `asistente`) |
| Ruta de salud | `GET /api/salud` responde `{ "estado": "ok" }` sin datos ni acceso a la base de datos. La plataforma la usa para saber si el servicio vive |
| Detrás de un proxy | `trust proxy` activado (`TRUST_PROXY=1`), para que la IP real de quien consulta no sea siempre la del proxy |
| Límite de intentos | Después de 10 intentos fallidos de clave desde la misma IP en 15 minutos, responde `429` hasta que pase la ventana. Contador en memoria, escrito a mano, sin dependencias nuevas |
| Cabeceras de seguridad | `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` y sin `X-Powered-By` |
| CORS | Se conserva solo para desarrollo (`localhost`). En producción no se necesita porque el origen es el mismo |
| HTTPS | La plataforma termina el HTTPS. Con `NODE_ENV=production`, una petición que llegue como `http` (según `X-Forwarded-Proto`) se redirige a `https` |
| Errores | En producción el manejador de errores no imprime objetos completos, solo el tipo del error, y nunca devuelve trazas ni detalles internos |
| Límite del cuerpo | JSON de 10 KB como máximo |

### 2.4 Clave de acceso

- **Autenticación básica HTTP:** el navegador muestra su propio cuadro de usuario y clave, la recuerda y la reenvía. No hay pantalla de login que construir.
- La comparación de la clave se hace en **tiempo constante** (`crypto.timingSafeEqual` sobre hashes del mismo largo) para no filtrar información por tiempos.
- `ACCESS_PASSWORD` es **obligatoria** en producción: si falta, el servidor no arranca. Esto evita publicar la app abierta por olvido.
- La clave se entrega a los revisores junto con la dirección de la entrega del curso, no en el repositorio.
- Es una protección sencilla para una demostración, no un sistema de usuarios. El panel no distingue quién es quién.

### 2.5 Base de datos (PostgreSQL)

- Base gestionada por Render, en la **misma región** que el servicio, usando su dirección **interna** en `DATABASE_URL` (no sale a internet).
- Las tablas son las de 001 y 002 (`reminders_sent`, `followups_sent`), sin cambios de esquema.
- `db:init` se ejecuta en cada arranque; al ser idempotente no borra datos.
- No se guardan datos del paciente, solo identificadores y fechas, igual que hoy.

### 2.6 Datos de la demostración

- `GOOGLE_CALENDAR_ICAL_URL` apunta a un calendario creado **solo para la demostración**, con citas ficticias para mañana y fechas pasadas y futuras que muestren el seguimiento (sesión 2 de 3, sesión 3 de 3, sin teléfono, etc.). Teléfonos de ejemplo, nunca reales.
- Las citas ficticias deben ser **recurrentes a mano o renovables**: como el panel muestra "mañana", conviene crear citas para varios días y la guía de despliegue explica cómo renovarlas.
- El enlace iCal es un secreto: solo vive en las variables de entorno de Render.

### 2.7 Variables de entorno de producción

| Variable | Origen | Nota |
|---|---|---|
| `NODE_ENV` | `production` | Activa redirección a HTTPS y errores sin detalle |
| `PORT` | la entrega Render | No se define a mano |
| `DATABASE_URL` | Render, desde la base de datos | Dirección interna |
| `GOOGLE_CALENDAR_ICAL_URL` | a mano, secreta | Calendario de demostración |
| `PATIENT_ID_SECRET` | generada por Render | Texto largo al azar, secreta |
| `ACCESS_PASSWORD` | a mano, secreta | Obligatoria |
| `ACCESS_USER` | opcional | Por defecto `asistente` |
| `CLINIC_NAME`, `CLINIC_TIMEZONE`, `DEFAULT_COUNTRY_CODE`, `DENTIST_NAME` | a mano | Los de `.env.example` |
| `FOLLOWUP_MIN_DAYS`, `FOLLOWUP_RESEND_DAYS` | opcionales | Valores por defecto de 002 |
| `TRUST_PROXY` | `1` | Un proxy de confianza |

Todas se documentan en `.env.example` sin valores reales.

### 2.8 Seguridad

- **Ningún secreto en el repositorio.** `.env` está en `.gitignore`; se revisa el historial de git por si alguna vez se subió algo.
- **Todo cerrado por defecto:** salvo `GET /api/salud`, nada responde sin clave, ni siquiera los archivos del panel.
- **Entradas validadas.** Las rutas existentes ya validan `fecha`, `pacienteId` y `ultimaCita`; se comprueba que `eventUid` tenga un largo máximo. Todas las consultas SQL siguen usando parámetros.
- **Contenido del calendario hostil.** React escapa el texto; no se usa `dangerouslySetInnerHTML`. El panel abre solo enlaces que empiecen por `https://wa.me/`.
- **Sin SSRF.** El servidor solo descarga la URL fija de `GOOGLE_CALENDAR_ICAL_URL`; ninguna petición del cliente puede cambiarla.
- **Registros sin secretos.** Nunca se imprimen el enlace iCal, la clave, `DATABASE_URL` ni cabeceras de autorización.
- **Dependencias.** Se ejecuta `npm audit` en backend y frontend antes de publicar y se corrigen las vulnerabilidades altas y críticas.

## 3. Criterios de aceptación

Se verifican contra la dirección pública real, no contra `localhost`.

1. **Acceso con clave.** Al abrir la dirección pública, el navegador pide usuario y clave. Con la clave correcta se ve el panel de recordatorios y la sección "Por retomar".
2. **Cerrado sin clave.** Sin clave o con una clave incorrecta, el panel y todas las rutas `/api/*` (salvo `/api/salud`) responden `401`. `GET /api/salud` responde `200` sin pedir clave.
3. **Límite de intentos.** El intento fallido número 11 desde la misma IP en 15 minutos responde `429`.
4. **Datos de demostración.** El panel muestra las citas ficticias de mañana ordenadas por hora, y el botón abre `wa.me` con el mensaje correcto.
5. **Estado persistente.** Marcar una cita como "Enviado" sigue así tras recargar y **tras reiniciar el servicio**, porque está en PostgreSQL.
6. **Seguimiento.** La sección "Por retomar" muestra los pacientes esperados del calendario de demostración y su botón funciona.
7. **HTTPS.** Una petición a `http://…` redirige a `https://…`.
8. **Cabeceras.** Una respuesta cualquiera incluye `X-Content-Type-Options`, `Referrer-Policy` y `X-Frame-Options`, y no incluye `X-Powered-By`.
9. **Sin secretos expuestos.** El repositorio no contiene la clave, `DATABASE_URL`, el enlace iCal ni `PATIENT_ID_SECRET`, y los registros del servicio tampoco.
10. **Sin datos de pacientes.** Las tablas de PostgreSQL no tienen nombres ni teléfonos.
11. **Repetible.** Con un `render.yaml` y las variables secretas, el despliegue se puede crear desde cero, siguiendo solo el README.
12. **Servidor no arranca abierto.** En producción, sin `ACCESS_PASSWORD` el servidor se niega a arrancar y dice qué variable falta.
13. **Marca.** El panel desplegado se ve y se comporta como en desarrollo: sigue la skill `brand-design` y se ve bien a 360 px.

## 4. Decisiones y limitaciones aceptadas

- **Un servicio y no dos.** Se descartó un sitio estático separado del backend porque obligaba a configurar CORS, la URL de la API y a pensar en cookies entre dominios. Con un solo origen la autenticación básica funciona sin ajustes.
- **Autenticación básica y no una pantalla de login.** Es mucho más simple y suficiente para una demostración. Su costo: el cuadro del navegador no sigue la marca y no hay "cerrar sesión" hasta cerrar el navegador.
- **Calendario único.** Los revisores ven el calendario de demostración, no el suyo. Conectar el propio queda para el futuro y está fuera de esta spec.
- **Plan gratuito de Render (decidido).** Condiciones verificadas el 2026-11-03 en la [documentación de Render](https://render.com/docs/free):
  - El servicio web se **duerme tras 15 minutos sin tráfico** y la primera petición tarda cerca de **1 minuto** en despertarlo. El README avisa a los revisores de que esperen un momento al abrir el enlace por primera vez.
  - El sistema de archivos del servicio se pierde al dormirse; no importa porque no se guarda nada en disco.
  - La base de datos gratuita **vence a los 30 días** de crearse y, pasados 14 días más de gracia, Render la elimina con sus datos. Tiene un máximo de 1 GB. Se acepta: solo guarda marcas de "enviado" y se vuelve a crear con `db:init`. Anotar la fecha de vencimiento en el README para saber cuándo recrearla.
  - Hay un tope de 750 horas de instancia al mes por cuenta, suficiente para un solo servicio.
  - Sin método de pago en la cuenta, Render suspende en lugar de cobrar si se pasa de los límites.
- **El límite de intentos está en memoria.** Se reinicia al reiniciar el servicio y no se comparte entre instancias. Aceptado con un solo servidor.
- **Citas de demostración que caducan.** Como el panel muestra "mañana", el calendario de demostración debe tener citas futuras; hay que renovarlas antes de la revisión.
- **Zona horaria y país** siguen siendo de la configuración del servidor (`CLINIC_TIMEZONE`, `DEFAULT_COUNTRY_CODE`).

## 5. Cómo se mide el éxito

- Un revisor, con solo la dirección y la clave, usa el panel completo en menos de 2 minutos.
- Cero respuestas con datos sin clave.
- El despliegue se repite desde cero, siguiendo el README, sin pasos no documentados.
