# Rediseño "Talón y sello"

Rama `feat/redesign`. Este documento es el contrato visual del rediseño: leelo entero antes de tocar una pantalla.

## La idea

En Argentina un turno **se saca**: el numerito de la carnicería, el talón del mostrador, la agenda de papel del barbero,
el sello del consultorio. La app deja de verse como "tarjetas redondeadas con sombra" (lo que tienen todas) y habla ese idioma:

- **Hoja cuadriculada** de fondo en zonas puntuales (cuaderno), casi invisible.
- **Estructura a la vista**: líneas finas (`border-linea`) que separan, en vez de tarjetas flotantes con sombra.
- **Letra de ticket** (Martian Mono) para datos: horas, precios, duraciones, contadores, rótulos.
- **Horas gigantes** en mono angosta (`cifra`): se leen de lejos, como el visor de "sacá número".
- **El turno es un talón troquelado** (`<Talon>`): arriba lo importante, abajo del corte el detalle.
- **El estado es un sello de goma** (`<Sello>` / `<InsigniaEstado>`): "Sin confirmar" es un sello sin tinta (punteado);
  cuando el cliente confirma, el sello **cae con un golpe**. Es el argumento de venta (menos faltas, "Confirmo") hecho gesto.

Tiene que funcionar con **cualquier color de marca**, en claro y oscuro, y para un consultorio tanto como para una barbería.

## Reglas (autocrítica incluida)

1. **Un solo gesto fuerte por pantalla.** El sello o el talón protagonista; no los dos compitiendo, no diez sellos.
2. **Nada tapa un dato.** Un sello puede pisar un troquel o un borde, nunca la hora, el precio ni un nombre.
3. **Cuadrícula casi invisible** y solo en zonas (encabezados, estados vacíos). Nunca de fondo de texto largo.
4. **Sin tarjeta-redondeada-con-sombra por defecto.** Preferí: filas separadas por líneas, fichas (`Tarjeta`), talones.
   `sombra-suave`/`sombra-flotante` solo para lo que de verdad flota (hojas, avisos).
5. **Sin sombras duras desplazadas** (el neo-brutalismo de moda) ni gradientes de relleno.
6. **Mono solo para datos y rótulos cortos**, nunca para párrafos. Texto corrido en Plus Jakarta Sans.
7. **Nada de texto menor a 12 px** (`text-xs`). Los rótulos `rotulo` ya miden 12 px.
8. Se mantienen todas las reglas de `CLAUDE.md`: 44 px táctiles, etiquetas visibles, errores al lado del campo,
   contraste AA, foco visible, lucide (sin emojis), `prefers-reduced-motion`, mobile-first, safe areas, tokens (sin hex sueltos).

## Piezas disponibles

### Utilidades CSS (`src/estilos.css`)

| Clase | Qué es |
|---|---|
| `mono` | Martian Mono con números tabulares. Precios, duraciones, teléfonos, códigos. |
| `cifra` | Mono angosta y apretada (`font-stretch: 75%`). Horas y números protagonistas, grandes (`text-[4.5rem]`…). |
| `rotulo` | Mono 12 px en versalitas espaciadas. Etiquetas de dato (`dt`), encabezados chicos, folios. |
| `titulo` (y `h1`–`h3`) | Bricolage Grotesque; peso, ancho y tracking según la personalidad del negocio. |
| `cuadricula` | Hoja cuadriculada. Para desvanecer: `[mask-image:linear-gradient(to_bottom,black,transparent)]`. |
| `troquel` | Renglón punteado de corte (usar en un div `h-[1.5px]`). |
| `muesca-abajo` / `muesca-arriba` | Muescas del talón (ya las usa `<Talon>`). |
| `contorno-talon` | Contorno fino que sigue las muescas. |
| `sello`, `sello-vacio` | Sello de goma (ya lo usa `<Sello>`). |
| `sellar` | Golpe del sello al montarse (solo sin "reducir movimiento"). `--retraso` para escalonar. |
| `golpe` | El papel se hunde un toque cuando le cae un sello. |
| `imprimir` | El talón sale de la impresora a saltitos (para "¡Listo!" después de reservar). |
| `revelar-al-bajar` | Aparece a medida que se baja la página (scroll-driven, con soporte detectado). |
| `aparecer`, `deriva`, `entrar`, `asomar`, `retraso-*` | Las de la landing (ver comentarios en el CSS). |

Radios: `rounded-chico/medio/grande` (más chicos que antes; la personalidad `clasica` es casi recta).

### Componentes (`src/ui/`)

- `Sello` — `tono` (exito/aviso/peligro/acento/suave), `vacio`, `animar`, `tamano`, `giro`.
- `InsigniaEstado` — el estado del turno como sello. Con `animar` + `key={estado}` golpea al cambiar.
  **Mantiene los textos** ("Confirmado", "Sin confirmar", "Cancelado", "Vino", "No vino": los usan los tests).
- `Talon` — `cuerpo`, `talon`, `papel` (superficie/acento/fondo), `sello` (muerde el troquel), `as`.
- `Tarjeta` — ahora "ficha": encabezado separado por una línea; el contenido va con su padding.
- `Campo` / `Selector` / `AreaTexto` — renglón de formulario en papel; etiqueta en `rotulo`.
- `Pastillas` — teclas rectas; la elegida entintada con la marca.
- `Boton` / `clasesBoton` — primario con filo inferior que se hunde al apretar; secundario de línea.
- `Estados` — `Vacio` es un recuadro punteado sobre cuadrícula; `Cargando` dice "Cargando…" en rótulo.
- `Hoja` — encabezado con troquel abajo (arrancado de un talonario).

### Patrones de referencia (ya hechos: copiá de acá)

- `src/pantallas/real/cliente/Inicio.tsx` — vidriera, talón "Próximo libre" en `papel="acento"`, **lista de precios**
  con puntitos guía (`border-b-2 border-dotted` en un span `flex-1`), **tarjeta de sellos**, celdas separadas por líneas.
- `src/pantallas/real/cliente/Pase.tsx` — el turno como talón: N.º de talón (`numeroDeTalon`), día + "faltan…",
  hora `cifra`, sello en el troquel, `dl` con `dt` en `rotulo`.
- `src/pantallas/real/cliente/ClienteReal.tsx` — encabezado con línea fina, cuadrícula desvanecida arriba,
  barra inferior plana como una regla (marca de tinta arriba de la pestaña activa).
- Títulos de sección: `titulo text-xl border-b-2 border-texto pb-2` (un filete grueso, como un encabezado de planilla).

## Sitio de la plataforma: claro y oscuro

La landing, legales, /demos y el 404 tienen modo claro (papel cálido) y oscuro (papel carbónico), con la misma tinta azul.
Sigue al sistema; el botón del encabezado pasa al opuesto (dos estados: el del sistema y el otro). Los colores van en un
`<style id="tema-sitio">` que manda según `<meta name="color-scheme">` y solo vale con `data-sitio` en `<html>`
(ver `src/pantallas/publico/temaSitio.ts`). Para algo que cambie según el modo, usar la variante `sitio-oscuro:`.

## Qué no se toca

`datos/**`, `dominio/**`, `tema/paleta.ts`, rutas, migraciones, Edge Functions (ver `CLAUDE.md`).
**Textos y nombres accesibles**: si cambiás uno, actualizá el test de `tests/e2e/**` que lo usa (no lo borres).
`src/ui/**` y `src/estilos.css` son compartidos: si necesitás una pieza nueva común, hacela local en tu carpeta y avisá.

## Cómo mirar lo que hacés

Hay un Vite corriendo en `http://localhost:5181` contra la Supabase local (usuarios en `CLAUDE.md`).
No levantes otro servidor ni corras Playwright e2e (choca el puerto 5190 entre agentes). Para ver tus pantallas, un script
de Playwright en tu scratchpad que abra la URL en 412×915 (y 1280×800 para el panel), haga captura y la leas. Mirá **claro y oscuro**
(QueTul es oscuro dorado; Nailed `/nailed` es claro rosado; Lema `/lema` es consultorio sereno).
