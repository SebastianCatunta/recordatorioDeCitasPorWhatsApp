# Spec: Seguimiento de tratamientos de varias sesiones

Estado: borrador · Proyecto: asistente de citas para consultorios dentales
Stack: React (frontend) · Express.js (backend) · PostgreSQL (base de datos)
Depende de: [001-recordatorios-un-clic](../001-recordatorios-un-clic/spec.md) (misma fuente de citas y mismo panel)

## 1. Definición del problema

**Situación actual.** En tratamientos de varias sesiones (endodoncias, ortodoncia), el paciente deja de sentir dolor y no vuelve. Nadie revisa quién quedó a medias, así que nadie le escribe.

**Problema.**
- Los tratamientos se abandonan antes de terminar.
- La asistente no tiene una lista de "pacientes que debían volver y no tienen próxima cita".
- Buscarlos a mano en el calendario toma tiempo que no tiene.

**A quién afecta.** Al dentista (tratamientos sin terminar, ingresos perdidos) y al paciente (el problema reaparece). La asistente es quien opera la herramienta.

**Idea clave.** Igual que en la spec 001, no automatizamos el envío. El sistema revisa el calendario, detecta a los pacientes con tratamiento en curso que **no tienen una próxima cita agendada** y arma una lista con un botón de WhatsApp y el mensaje ya escrito. La asistente revisa y envía.

**Objetivos medibles.**
- Que la asistente identifique a todos los pacientes con tratamiento a medias sin cita futura en menos de 5 minutos a la semana.
- Que más pacientes terminen sus tratamientos de varias sesiones.

**Fuera de alcance.** Envío automático, lectura de respuestas del paciente, agendar la cita desde el sistema (se agenda en Google Calendar), datos clínicos (tipo de tratamiento, diagnóstico, notas), facturación, expediente clínico, inicio de sesión.

## 2. Diseño de la solución

### 2.1 Vista general

```
Google Calendar (mismo enlace iCal secreto de la spec 001)
        │
        ▼
Backend Express ──► PostgreSQL (a quién ya se le escribió el seguimiento)
        ▲
        │ API REST
Panel React ──► abre WhatsApp con el mensaje listo (enlace wa.me)
```

### 2.2 Cómo se detecta un tratamiento en curso

Se usa el mismo calendario, sin datos clínicos. **Convención:** en la descripción de la cita, además del teléfono, la asistente agrega una línea con las sesiones:

```
Sesión: 2 de 3
```

- Si la línea no existe, la cita se trata como cita suelta y esta función la ignora.
- El tipo de tratamiento **no** se escribe ni se guarda.
- Un paciente se identifica por su teléfono normalizado (misma regla de la spec 001).

Un paciente aparece en "Por retomar" cuando cumple todo lo siguiente:
1. Su última cita pasada tiene "Sesión: X de Y" con X menor que Y.
2. No tiene ninguna cita futura en el calendario.
3. Pasaron al menos `FOLLOWUP_MIN_DAYS` días desde esa última cita (por defecto, 1).
4. Tiene teléfono válido.

### 2.3 Backend (Express)

| Método y ruta | Uso |
|---|---|
| `GET /api/seguimientos` | Devuelve los pacientes por retomar, del que lleva más días sin volver al que menos |
| `POST /api/seguimientos/:pacienteId/enviado` | Marca el seguimiento como enviado |

Cada paciente devuelto incluye: `pacienteId`, `nombre`, `ultimaCita` (fecha), `diasSinVolver`, `sesion` (por ejemplo "2 de 3"), `enlaceWhatsapp` y `enviado`.

**Reglas:**
- `pacienteId` es un hash del teléfono normalizado. No se guarda el teléfono.
- Mensaje: "Hola {nombre}, le escribimos del consultorio {consultorio}, de {dentista}. Quedó pendiente la sesión {X+1} de su tratamiento. ¿Le agendamos su próxima cita? Gracias."
- `{consultorio}` sale de `CLINIC_NAME`, igual que en la spec 001. `{dentista}` sale de `DENTIST_NAME` (por ejemplo "la Dra. Laura"). Como el mensaje sale del WhatsApp personal de la asistente, nombrar al consultorio y al dentista le dice al paciente de quién viene. Si `DENTIST_NAME` no está configurada, el mensaje omite ", de {dentista}".
- El mensaje no menciona el tipo de tratamiento ni el motivo de la consulta.
- Una vez enviado, el paciente no vuelve a aparecer hasta que pasen `FOLLOWUP_RESEND_DAYS` días (por defecto, 3) sin que haya agendado cita.
- Si el paciente agenda una cita futura, desaparece de la lista automáticamente.

### 2.4 Base de datos (PostgreSQL)

Una sola tabla:

**`followups_sent`**

| Campo | Tipo | Nota |
|---|---|---|
| patient_id | text | hash del teléfono normalizado |
| last_visit_date | date | fecha de la última cita al enviar |
| sent_at | timestamptz | cuándo se marcó como enviado |

Clave primaria: (`patient_id`, `last_visit_date`). No se guarda nombre, teléfono ni tipo de tratamiento.

### 2.5 Panel (React)

Una sección nueva en el panel de la spec 001, llamada **"Por retomar"**:
- Lista de pacientes con nombre, "última cita hace N días", sesión ("2 de 3") y botón **"Escribir por WhatsApp"**.
- Al pulsar el botón se abre WhatsApp en una pestaña nueva y el paciente pasa a **"Enviado"**, atenuado y con la fecha de envío.
- Contador visible: "X de Y seguimientos enviados".
- Si no hay nadie por retomar, se muestra un mensaje positivo y breve.
- Todo texto visible sigue la skill `brand-design`.

### 2.6 Privacidad

Se guarda solo lo mínimo: un hash del teléfono y fechas. Nada clínico. El enlace iCal sigue en variables de entorno.

## 3. Criterios de aceptación

Se verifican con un calendario de prueba con citas pasadas y futuras.

1. **Detección.** Un paciente con última cita "Sesión: 2 de 3", sin cita futura y con al menos 1 día desde esa cita aparece en "Por retomar".
2. **Exclusión por cita futura.** Si ese paciente tiene una cita agendada a futuro, no aparece.
3. **Exclusión por tratamiento terminado.** Un paciente cuya última cita es "Sesión: 3 de 3" no aparece.
4. **Exclusión de citas sueltas.** Una cita sin la línea "Sesión: X de Y" no genera ningún seguimiento.
5. **Enlace prellenado.** Al pulsar "Escribir por WhatsApp", se abre el chat de ese número con un mensaje que incluye el nombre del paciente, el consultorio, el dentista y la siguiente sesión pendiente, sin mencionar el tipo de tratamiento.
6. **Estado persistente.** Después de pulsar el botón, el paciente aparece como "Enviado" y sigue así al recargar. El contador "X de Y" se actualiza.
7. **Sin reenvío inmediato.** Un paciente ya marcado como enviado no vuelve a aparecer como pendiente antes de que pasen 3 días desde el envío. Si pasados los 3 días sigue sin cita futura, vuelve a aparecer como pendiente.
8. **Sin teléfono válido.** Un paciente sin teléfono válido no aparece con botón de envío.
9. **Privacidad.** La base de datos no contiene nombres, teléfonos ni tipo de tratamiento.

## 4. Cómo se mide el éxito

- **Tratamientos terminados:** porcentaje de pacientes que, tras recibir el seguimiento, agendan su siguiente sesión en los 14 días posteriores. Meta inicial: al menos 30%.
- **Cobertura:** 100% de los pacientes que cumplen las reglas de la sección 2.2 reciben su mensaje de seguimiento dentro de la semana en que aparecen.
- **Tiempo de la asistente:** menos de 5 minutos a la semana en revisar y enviar seguimientos, según su propio reporte.
- **Abandono de tratamientos:** observar la baja del porcentaje de tratamientos de varias sesiones que quedan sin terminar, respecto a la situación actual (todavía sin medir).
