---
name: brand-design
description: Guía de diseño de marca "Sonrisa al día" para el panel de recordatorios de consultorios dentales (celeste y blanco, curva de sonrisa, tono cercano). Úsala siempre que se cree o modifique la interfaz React, estilos CSS, textos visibles al usuario o cualquier elemento visual de la aplicación.
---

# Diseño de marca: Sonrisa al día

Esta skill define cómo se ve y cómo suena la aplicación. Todo lo visual debe seguirla. La aplicación sirve a cualquier dentista: nunca nombrar a una persona concreta en la interfaz; el nombre del consultorio sale de la configuración (`CLINIC_NAME`).

> **Nombre de trabajo:** "Sonrisa al día" es un nombre provisional. Si el dueño del proyecto elige otro, cambiarlo solo en el encabezado y en esta skill.

## Idea central: la sonrisa

La marca no es "una app médica azul". Su rasgo propio es **la curva de sonrisa**: una línea suave y cóncava. Todo lo demás es calma: mucho blanco, celeste claro, formas redondeadas.

La curva aparece **en un solo lugar**: el borde inferior del encabezado, donde el celeste cae en una curva suave, como una sonrisa. No usarla en la barra de progreso, en el mensaje de cierre, en estados vacíos ni en ningún otro componente.

Reglas de la curva: sin cara completa ni ojos, sin ilustraciones de dientes con rostro. Debe verse elegante, no infantil.

## Colores: celeste y blanco

Definir siempre como variables CSS en `:root` y usarlas por nombre. No escribir colores sueltos en los componentes.

```css
:root {
  /* Celestes: identidad */
  --celeste-vivo: #7DD3FC;     /* decorativo: curva del encabezado, acentos, barra de progreso */
  --celeste-medio: #BAE6FD;    /* encabezado, selección */
  --celeste-suave: #E0F2FE;    /* fondos de etiquetas, hover de filas */

  /* Blancos */
  --blanco: #FFFFFF;           /* tarjetas, filas */
  --blanco-diente: #F4FAFE;    /* fondo de página (blanco con un toque frío) */

  /* Acción: celeste profundo para que el texto blanco se lea */
  --accion: #0369A1;
  --accion-hover: #075985;

  /* Texto: azul marino, no negro puro */
  --texto: #0B2A3C;
  --texto-suave: #4A6579;
  --borde: #D5E6F0;

  /* Estados */
  --exito: #0F7A4A;   --exito-suave: #DDF5E8;
  --aviso: #8A4B08;   --aviso-suave: #FFF1D6;
  --error: #B3261E;   --error-suave: #FDE7E5;
}
```

**Contrastes verificados (WCAG, calculados, no estimados):**

| Uso | Ratio |
|---|---|
| Blanco sobre `--accion` (botón) | 5.93:1 |
| Blanco sobre `--accion-hover` | 7.56:1 |
| `--accion` sobre `--blanco-diente` (enlaces) | 5.64:1 |
| `--accion` sobre `--celeste-suave` | 5.17:1 |
| `--texto` sobre `--blanco-diente` | 14.14:1 |
| `--texto` sobre `--celeste-medio` | 11.22:1 |
| `--texto` sobre `--celeste-vivo` | 8.93:1 |
| `--texto-suave` sobre blanco | 6.12:1 |
| `--exito` sobre `--exito-suave` | 4.69:1 |
| `--aviso` sobre `--aviso-suave` | 6.08:1 |
| `--error` sobre `--error-suave` | 5.52:1 |

**Regla importante:** `--celeste-vivo` sobre blanco da solo 1.67:1. Úsalo **únicamente** como elemento decorativo (curva del encabezado, barra de progreso, fondos grandes), nunca como color de texto ni de un botón con texto blanco. Para texto o botones sobre blanco, usar `--accion`.

Otras reglas:
- `--accion` se reserva para una acción principal por fila o pantalla.
- El significado nunca depende solo del color: acompañar con texto o icono.
- No usar el verde de WhatsApp (#25D366) como color de la interfaz; solo en el icono de WhatsApp.
- Recalcular el contraste con la fórmula WCAG si se cambia algún color de esta tabla.

## Tipografía

- **Títulos y números** (hora, contador): `Nunito`, pesos 700-800. Sus terminaciones redondeadas dan la calidez de la marca.
- **Texto corrido y botones:** `Inter`, pesos 400-600.
- Respaldo: `system-ui, -apple-system, "Segoe UI", sans-serif`.
- Escala: título de página 28px, sección 20px, texto 16px, secundario 14px. Mínimo 14px. Interlineado 1.5.
- La **hora de la cita** es el dato más importante de cada fila: Nunito 800, 20px, en `--texto`.

## Espaciado y forma

- Base de 4px: 4, 8, 12, 16, 24, 32, 48.
- Formas **muy redondeadas**, de forma consistente: botones y etiquetas en píldora (radio completo), tarjetas 20px, campos 12px.
- Sombras suaves con tinte celeste en tarjetas: `0 2px 8px rgba(3, 105, 161, 0.08)`. Nada de bordes negros ni sombras duras.
- Contenido centrado, ancho máximo 720px, con mucho aire (blanco) entre filas: mínimo 12px.

## Componentes

**Encabezado**
- Fondo `--celeste-medio` con el borde inferior en curva de sonrisa (`border-radius: 0 0 50% 50% / 0 0 32px 32px` o SVG equivalente).
- Nombre "Sonrisa al día" en Nunito 800 y, debajo, el nombre del consultorio (`CLINIC_NAME`) en 14px `--texto-suave`.

**Botón primario** ("Enviar por WhatsApp")
- Píldora, fondo `--accion`, texto blanco Inter 600 16px, alto mínimo 44px, icono de WhatsApp a la izquierda.
- Hover `--accion-hover`. Foco visible: contorno de 3px en `--celeste-vivo` con separación de 2px.

**Fila de cita**
- Tarjeta blanca de 20px de radio. Izquierda: hora grande (Nunito 800) y nombre. Derecha: botón o estado.
- Cita enviada: contenido atenuado, etiqueta "Enviado" (`--exito` sobre `--exito-suave`) con icono de check y la hora de envío.

**Etiquetas de estado**
- Píldoras pequeñas de 14px peso 600 con icono. "Enviado" (verde) y "Sin teléfono válido" (ámbar).

**Progreso del día**
- Barra recta y delgada (8px, extremos redondeados) que se rellena en `--celeste-vivo` sobre `--celeste-suave`, con "X de Y recordatorios enviados" en Nunito.

**Estados vacíos y de error**
- Vacío: "No hay citas para esta fecha. Disfrute la calma." solo texto, sin ilustraciones.
- Error: fondo `--error-suave`, qué pasó y qué hacer, en una frase.

## Tono y textos

La voz es la de una asistente amable y eficiente: **tranquiliza, no apura.**

- Español. A la asistente se le habla de tú, de forma cálida y neutra; a los pacientes, de usted.
- Frases cortas con verbo de acción: "Enviar por WhatsApp", "Revisar sin teléfono".
- Sin jerga técnica ni códigos de error visibles: decir qué pasó y qué hacer.
- Sin emojis decorativos ni signos de exclamación, con **una excepción**: el cierre del día (ver abajo).
- **Momento de cierre:** cuando todos los recordatorios del día están enviados, mostrar el mensaje "¡Listo por hoy! Todas las citas de mañana tienen su recordatorio." solo texto, sin dibujo. Es el único lugar con exclamación.
- Mensajes al paciente: breves, amables, usan `{consultorio}` y no mencionan el motivo de la consulta.

## Accesibilidad (obligatorio)

- Contraste mínimo de texto 4.5:1; usar solo las combinaciones verificadas de la tabla.
- Todo elemento interactivo se alcanza con teclado y tiene foco visible.
- Áreas táctiles de al menos 44x44px.
- Iconos solos con `aria-label`. La curva decorativa lleva `aria-hidden="true"`; el progreso expone su valor en texto ("3 de 8 enviados").
- Respetar `prefers-reduced-motion`: la barra de progreso se actualiza sin animación; en otro caso, 200ms.

## Logotipo e identidad

No inventar un logotipo ni usar marcas de terceros. Provisionalmente, la identidad es el texto "Sonrisa al día" en Nunito 800 sobre el encabezado con su borde en curva de sonrisa. Si el dueño entrega un logotipo, colocarlo en `public/` y usarlo en el encabezado.

## Antes de dar por terminada una interfaz

1. Los colores salen de las variables, y `--celeste-vivo` solo se usa como decoración.
2. La curva de sonrisa aparece solo en el borde del encabezado.
3. Hay una sola acción principal por fila.
4. Se ve bien a 360px de ancho y con zoom del 200%.
5. Navegación completa por teclado.
6. Ningún texto nombra a una persona concreta; el consultorio viene de `CLINIC_NAME`.
