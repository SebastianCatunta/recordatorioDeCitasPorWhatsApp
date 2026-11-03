# Proyecto: Asistente de citas para consultorios dentales

## Contexto del negocio
- Pensado para consultorios dentales pequeños: un dentista (doctor o doctora) y una asistente. No está atado a una persona concreta; el nombre del dentista y del consultorio son configurables.
- Las citas se agendan en **Google Calendar** y ese flujo funciona bien. No se reemplaza.
- Hoy la asistente envía recordatorios por **WhatsApp uno por uno**, y le consume buena parte de la mañana.

## Problemas a resolver
1. **Inasistencias:** ~30% de los pacientes no llegan y el espacio se pierde.
2. **Abandono de tratamientos de varias sesiones** (endodoncias, ortodoncia): el paciente deja de sentir dolor y nadie le da seguimiento.

## Usuarios
- **Asistente (usuario principal):** opera el sistema a diario. Tiene poco tiempo y no es técnica. La herramienta debe ahorrarle trabajo, no darle más.
- **Dentista:** quiere ver menos huecos en su agenda y tratamientos terminados.
- **Pacientes:** interactúan solo por WhatsApp. No instalan nada ni crean cuentas.

## Fuera de alcance (no proponer ni construir)
- Facturación o cobros.
- Expediente clínico o datos médicos del paciente.
- Reemplazar Google Calendar.

## Feature en foco (una sola spec)
**Recordatorios de un clic para las citas de mañana.**
- Lee las citas de Google Calendar (enlace iCal secreto) y arma la lista del día siguiente.
- Cada cita tiene un botón que abre WhatsApp con el mensaje ya escrito; la asistente solo revisa y envía.
- Se marca qué recordatorios ya se enviaron.
- Debe poder implementarse en menos de 1 hora.
- Métrica de éxito: reducir el tiempo de la asistente en recordatorios y, con ello, las inasistencias del ~30%.

**Fuera de esta spec:** envío automático, confirmación del paciente y seguimiento de tratamientos incompletos.

## Stack técnico
- **Frontend:** React (panel para la asistente).
- **Backend:** Express.js (Node).
- **Base de datos:** PostgreSQL.
- Integraciones externas (feature actual): enlace iCal secreto de Google Calendar y enlaces `wa.me` de WhatsApp. Sin OAuth ni API de WhatsApp Business por ahora.

## Spec-driven development
- Cada feature vive en su propia carpeta: `specs/NNN-nombre-del-feature/`.
- La spec va en `specs/NNN-nombre-del-feature/spec.md`. Los archivos posteriores (plan, tareas) van en la misma carpeta.
- Feature actual: [specs/001-recordatorios-un-clic/spec.md](specs/001-recordatorios-un-clic/spec.md).- Primero la spec, luego el plan y las tareas, y al final el código. No escribir código que la spec no respalde.

## Diseño de marca
- Toda interfaz, estilo o texto visible debe seguir la skill `brand-design` ([.claude/skills/brand-design/SKILL.md](.claude/skills/brand-design/SKILL.md)).

## Principios
- Simplicidad: es un consultorio de dos personas; evitar sobreingeniería.
- Google Calendar es la fuente de verdad de las citas.
- Privacidad: guardar solo lo mínimo (nombre, teléfono, fecha/hora de cita). Nada clínico.
- Mensajes breves, en español, tono cercano y profesional.

## Cómo trabajar
- Idioma: español en documentos, specs y comunicación con el usuario.
- Escribir la spec de un solo feature; no mezclar alcance de otros.
- Si falta una decisión de producto, plantear la pregunta con una recomendación, no una lista de opciones.
- Usar siempre el stack definido arriba; no proponer otras tecnologías sin preguntar.
- Antes de asumir otros detalles técnicos (proveedor de WhatsApp, hosting), confirmarlos con el usuario.
