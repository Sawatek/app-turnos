# Plan de mejoras: landing, código y sitio público

## Estado (19/11/2026)

**Hecho** (tandas 1 y 2, sin commitear al escribir esto): A1, A2, B1 (rama sin contacto), B2, B3 (menos el chip
"Sin permanencia"), B4 (menos la línea de precio), B5, B6 (menos las preguntas comerciales), B7 (con "simple" en precios),
C1–C11 (C7: se quedó con `hidden` común porque React 19 escribe `hidden="until-found"` como `hidden=""`), D-SEO1–3
(con la variable `VITE_URL_SITIO`, que falta cargar), D-REN1–3, E1–E11, F1, F2, F4, F5, F6, T1–T8.

**Cambios respecto de lo escrito abajo:**
- E9/F4: la página quedó en 8 bloques. "Cómo funciona" absorbió "Recordatorios por WhatsApp" y "Tu marca" absorbió
  "Funciones", así que no existen `WhatsApp.tsx` ni `Funciones.tsx`: las secciones están en
  `src/pantallas/publico/inicio/secciones/` y el orden en `inicio/secciones.ts`.
- D-SEO1: el canonical no va fijo en `index.html`: lo pone `Raiz` (src/main.tsx) por ruta. `robots.txt` y `sitemap.xml`
  los genera el plugin `seoDelSitio` de `vite.config.ts`.
- F1: todo pasa adentro de `vite build` (plugin `portadaPreGenerada`): `dist/index.html` es la portada dibujada y
  `dist/app.html` el shell de las demás rutas. `middleware.ts` (F2) pide `/app.html`.
- D-REN4: no se hizo (la fuente sigue en `opsz.css`; decidirlo mirándola).

**Pendiente:**
- Lo que depende de tus decisiones D1–D7: B1 completo, B4 (línea "el abono se paga solo"), B6 (preguntas
  comerciales), B8, B9, F3, el chip "Sin permanencia", D-SEO1/D-SEO3 con el dominio real.
- Probar en un deploy de preview de Vercel: F1 (portada en el HTML, `/quetul` con el shell, PWA instalada sin conexión,
  Lighthouse) y F2 (`curl -A WhatsApp https://<preview>/<slug>` trae el nombre del negocio).
- Restos de F6 que no entraron: selectores segmentados repetidos (`real/panel/Clientes.tsx`, `Reportes.tsx`,
  `admin/Admin.tsx`) → un `ui/Segmentado`; `Interruptor`, `Encabezado` y `BotonConfirmar` del panel → `src/ui`;
  las pastillas de marca de `VitrinaApp` → `ui/Pastillas` con lugar para un ícono.

Sale de una revisión con 4 agentes (UX y ventas, accesibilidad, código, rendimiento y SEO) sobre el commit `627a6ab`.
Los hallazgos marcados **[verificado]** se comprobaron a mano contra el código o el build. Las líneas son de ese commit:
si algo se movió, buscá por el texto citado.

## Cómo usar este plan

- Cada tarea tiene un ID (`A1`, `B3`…), los **archivos que toca**, **qué hacer** (con el código o el texto exacto),
  **listo cuando** (criterio de aceptación) y **tests** a tocar o agregar.
- `Bloqueada por Dx` = necesita una decisión tuya de la sección 1 antes de empezar.
- Para repartir entre agentes, usá la **sección 9**: agrupa las tareas por archivos para que nadie pise a nadie.
- Definición de terminado (de `CLAUDE.md`), para cada tanda: `pnpm exec tsc -b`, `pnpm lint`, `pnpm test`,
  `pnpm exec playwright test`, `pnpm exec playwright test -c tests/funciones` y `pnpm build`. Mirar la landing en el
  navegador a 375 px y a 1280 px. Apagar los servidores que se levantaron.
- Si una tarea cambia un texto, rol o etiqueta que usa un test, **se actualiza el test** (no se borra).

---

## 1. Decisiones tuyas (destraban tareas)

| ID | Qué hay que decidir | Destraba | Mientras tanto |
|---|---|---|---|
| D1 | **WhatsApp comercial** (y/o mail) para cargar en `CONTACTO` de `src/pantallas/publico/marca.ts:20-27` | B1 completo, B4, B6 | B1 parcial: los botones dicen lo que hacen |
| D2 | **Precios**: un número, un "desde $X" o un "precio de lanzamiento" sin número | B8 | Se deja como está |
| D3 | **Quiénes somos**: nombre, foto, ciudad, "te atiendo yo"; y los datos de `EMPRESA` (`marca.ts:30-38`) para los legales | B9 | — |
| D4 | **`/demos`**: ¿se separa en una página pública (solo las 3 demos fijas) y una interna (todas, dentro de `/admin`)? Toca rutas | F3 | B1 deja de mandar gente a `/demos` |
| D5 | **Respuestas comerciales para el FAQ**: ¿los WhatsApp van incluidos en el abono? ¿hay permanencia? ¿cuántos días tarda el alta? ¿qué pasa si el cliente no confirma? ¿se exporta la lista de clientes si se van? | B6 | B6 sin esas preguntas |
| D6 | **Dominio final** del sitio (ej. `https://confirmo.com.ar`) | D-SEO1, D-SEO3 | Se prepara con variable de entorno |
| D7 | **Nombre comercial** (hoy "SawaTek Turnos"; candidato "Confirmo"). Es el remitente que ve el cliente en WhatsApp | B2 queda mejor con el nombre final | B2 usa `MARCA.corto` |

---

## 2. Bugs (hacer primero)

### A1. `cn` no resuelve conflictos de clases: los redondeos que se le pasan a `Logo` no se aplican en toda la app [verificado]

- **Qué pasa.** `src/ui/cn.ts:2` solo concatena. `Logo` (`src/ui/Logo.tsx:16,18`) trae `rounded-medio` y quien lo usa lo
  pisa con `rounded-full`, `rounded-chico`, `rounded-[15px]`… Con dos clases de la misma especificidad gana la que sale
  después en el CSS, y en el build `.rounded-medio` sale después de `.rounded-full` y `.rounded-chico`. Resultado: los
  logos "redondos" son cuadrados redondeados (se ve en el "QT" del chat de la landing) y en personalidad `clasica` el
  círculo queda cuadradito.
- **Afecta** (todos los `<Logo className="… rounded-…">`): `publico/ConversacionWhatsApp.tsx:33`, `publico/Inicio.tsx:329`,
  `publico/PantallaDeInicio.tsx:45,64`, `publico/VitrinaApp.tsx:102`, `cliente/Marco.tsx:16`, `cliente/AppCliente.tsx:74`,
  `cliente/Pase.tsx:59`, `real/cliente/Pase.tsx:42`, `real/cliente/ClienteReal.tsx:131,137`, `cuenta/MisTurnos.tsx:147,216,243`.
  Mismo problema tapado con `!` en `real/panel/comunes.tsx:248` (`bg-peligro! text-white!`) y resuelto de casualidad en
  `admin/comunes.tsx:207` (`h-10` + `h-11`).
- **Archivos:** `package.json`, `src/ui/cn.ts`, `src/ui/cn.test.ts` (nuevo), `src/pantallas/real/panel/comunes.tsx:248`.
- **Qué hacer.**
  1. `pnpm view tailwind-merge version deprecated` → `pnpm add tailwind-merge@<esa versión>`.
  2. `src/ui/cn.ts`, **configurado con los tokens propios** (sin esto, tailwind-merge trata `text-entrada` como un color y
     `cn('text-entrada text-suave')` borraría el tamaño):
     ```ts
     /** Une clases condicionales y resuelve conflictos de Tailwind: cn('rounded-medio', 'rounded-full') → 'rounded-full'. */
     import { extendTailwindMerge } from 'tailwind-merge'

     const unir = extendTailwindMerge({
       extend: {
         theme: {
           radius: ['chico', 'medio', 'grande'],
           text: ['portada', 'titular', 'entrada'],
         },
       },
     })

     export const cn = (...c: (string | false | null | undefined)[]) => unir(c.filter(Boolean).join(' '))
     ```
  3. Sacar los `!` de `real/panel/comunes.tsx:248`.
- **Tests:** `src/ui/cn.test.ts` (Vitest):
  ```ts
  expect(cn('rounded-medio', 'rounded-full')).toBe('rounded-full')
  expect(cn('rounded-chico rounded-medio')).toBe('rounded-medio')
  expect(cn('text-entrada text-suave')).toBe('text-entrada text-suave') // tamaño + color conviven
  expect(cn('text-suave', 'text-texto')).toBe('text-texto')
  expect(cn('h-12', 'min-h-12')).toBe('h-12 min-h-12')
  expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  ```
- **Listo cuando:** el logo del chat de la landing es un círculo; los íconos del celular de "Tu marca" tienen 15 px de radio;
  pasa la suite e2e completa (el cambio toca toda la app: mirar también `/quetul`, `/mis-turnos` y el panel).

### A2. El efecto del `#ancla` de la portada rompe "atrás" y puede tirar la página [verificado]

- **Qué pasa.** `src/pantallas/publico/Inicio.tsx:692-698`:
  - el `else window.scrollTo(0, 0)` corre después de `<ScrollRestoration>` (`src/main.tsx:25`), así que volver con
    "atrás" desde una demo te deja arriba de todo;
  - `decodeURIComponent('%')` tira `URIError` con `/#%` y se ve la pantalla de error de react-router;
  - el efecto existe porque el pie usa `<a href="/#precios">` (`comunes.tsx:135-136`), que recarga el documento.
- **Archivos:** `src/main.tsx`, `src/pantallas/publico/Inicio.tsx` (solo borrar el efecto y el import de `useEffect`),
  `src/pantallas/publico/comunes.tsx:135-136`.
- **Qué hacer.**
  1. En `src/main.tsx`, la ruta `/` pasa de `element: <InicioPublico />` a carga perezosa del router (la ruta no cambia),
     y la raíz suma un `HydrateFallback` igual al fallback actual:
     ```ts
     { path: '/', lazy: async () => ({ Component: (await import('@/pantallas/publico/Inicio')).default }) },
     // en la ruta raíz:
     HydrateFallback: () => <div className="min-h-dvh bg-fondo" />,
     ```
     y borrar `const InicioPublico = lazy(...)` (`main.tsx:9`).
  2. Borrar el `useEffect` de `Inicio.tsx:692-698`.
  3. En el pie: `<Link to="/#precios">` y `<Link to="/#preguntas">`.
  4. **Si `ScrollRestoration` no resuelve el hash al entrar directo** (probarlo), plan B mínimo: dejar el efecto sin el
     `else` y con `try { … } catch {}` alrededor del `decodeURIComponent`.
- **Tests** (`tests/e2e/publico/publico.spec.ts`): entrar directo a `/#precios` → el h2 de precios está en pantalla;
  `/#%` → carga la landing sin errores de consola; bajar hasta Rubros, entrar a `/nailed`, `page.goBack()` → el h2 de
  Rubros sigue en pantalla.

---

## 3. Textos y conversión (lado del usuario)

### B1. Ningún botón lleva a una persona [verificado]

- **Qué pasa.** Con `CONTACTO` vacío, `linkContacto()` (`marca.ts:77-84`) devuelve `/demos`, así que "Pedí tu demo"
  (encabezado, portada `Inicio.tsx:124`, cierre `Inicio.tsx:680`), "Consultar el plan X" (`Inicio.tsx:560-566`) y
  "Pedí la demo de tu rubro" terminan en una lista interna. En el cierre los dos botones van al mismo lugar.
- **Archivos:** `src/pantallas/publico/comunes.tsx` (`CtaDemo`), `src/pantallas/publico/Inicio.tsx` (Precios y Cierre).
- **Qué hacer.**
  - **Con D1 resuelto:** cargar `CONTACTO.whatsapp` y listo; todo el resto ya funciona.
  - **Sin contacto** (`linkContacto().via === 'demos'`), que cada botón diga lo que hace:
    - `CtaDemo`: texto "Ver la demo" y `href = DEMOS.barberia` (`/quetul`).
    - Precios: no mostrar los botones "Consultar el plan X"; abajo de las tarjetas, una sola línea:
      "¿Querés verla funcionando? **Ver la demo**".
    - Cierre: el botón secundario "Ver todas las demos" se saca (quedaría duplicado).
- **Tests:** `publico.spec.ts:30-39` ("Pedí tu demo" lleva al contacto…) → separar en dos casos según `linkContacto().via`
  (el nombre del link cambia a "Ver la demo" cuando es `demos`).
- **Listo cuando:** sin contacto cargado no queda ningún botón que prometa una persona; con contacto, todos abren WhatsApp.

### B2. El chat de ejemplo promete un remitente que no existe [verificado]

- **Qué pasa.** La cabecera del chat (`ConversacionWhatsApp.tsx:31-38`) muestra logo y nombre del negocio como remitente,
  y `ConversacionWhatsApp.tsx:44` e `Inicio.tsx:271` dicen "con el nombre de tu negocio". Pero sale de **un solo número,
  el de la plataforma** (`docs/WHATSAPP.md` § 1; lo dice el propio FAQ en `Inicio.tsx:592`). La sección 04 refuerza la
  idea con "Tus clientes no ven otra marca" (`Inicio.tsx:308`).
- **Archivos:** `ConversacionWhatsApp.tsx`, `Inicio.tsx`.
- **Qué hacer.**
  - Cabecera del chat: isotipo de la plataforma (`/icono.svg`, como en `MarcaSitio`) y `MARCA.corto` como nombre;
    debajo "Cuenta de empresa" (ver C3 por el contraste). El nombre del negocio sigue en el cuerpo del mensaje.
  - `ConversacionWhatsApp.tsx:44` → `Los mensajes salen del WhatsApp oficial de {MARCA.corto} y siempre dicen el nombre de tu negocio.`
  - `Inicio.tsx:271` → `Los mensajes salen solos desde nuestro WhatsApp oficial, y cada uno dice el nombre de tu negocio. Llegan donde tu cliente ya mira.`
  - `Inicio.tsx:308` → `Tu app no lleva otra marca: <em>lleva la tuya</em>` (la sección habla de la app instalable, ahí sí es cierto).
- **Tests:** `publico.spec.ts:18` cambia el h2 `'Tus clientes no ven otra marca: ven la tuya'` → `'Tu app no lleva otra marca: lleva la tuya'`.

### B3. La portada no dice el resultado y en el celular empuja los botones

- **Archivos:** `Inicio.tsx:107-135`.
- **Qué hacer.**
  - Subtítulo (`Inicio.tsx:120-121`), de ~40 a ~25 palabras:
    `Menos faltas en tu agenda. A tus clientes les llega el recordatorio por WhatsApp y confirman con un toque. Todo con tu logo, y sin que bajen nada.`
    (`menos faltas` en `<strong className="font-semibold text-texto">`).
  - Sin sangría en el celular: `Inicio.tsx:118` de `col-span-5 col-start-2 … lg:col-span-5 lg:col-start-2` a
    `col-span-6 lg:col-span-5 lg:col-start-2`. La sangría editorial queda solo desde `lg`.
  - Chips (`Inicio.tsx:131`): `Sin tiendas de apps` → se queda; `Sin contraseñas para tus clientes` → `Tus clientes no pagan nada`;
    `Hecha en Argentina` → se queda. Agregar `Sin permanencia` **solo si D5 lo confirma**.
- **Listo cuando:** a 375 × 812 los dos botones de la portada se ven sin hacer scroll.

### B4. La calculadora llega al pico y no ofrece nada

- **Archivos:** `CalculadoraFaltas.tsx`.
- **Qué hacer.**
  - Después del párrafo final (`CalculadoraFaltas.tsx:88-91`):
    `<CtaDemo className="mt-5 w-full" texto="Quiero dejar de perder esa plata" />` (si no hay contacto, B1 decide el texto).
  - Supuesto por defecto 50 % → **30 %** (`useState(50)` en `:46`); el texto de ayuda queda igual.
  - Precio del turno: el deslizador de 2.000 a 100.000 de a 500 son 196 pasos, imposible con el dedo. Reemplazarlo por un
    campo numérico **con la misma etiqueta** "Precio promedio del turno" (así el test sigue andando):
    `<input type="number" inputMode="numeric" min={500} step={500}>`, con prefijo `$` visual, y error al lado del campo
    si queda vacío o en 0: "Poné cuánto cobrás un turno".
  - Cuando haya precio (D2): línea puente "Con recuperar {n} turnos por mes, el abono se paga solo".
- **Tests:** `publico.spec.ts:83-91` sigue igual (usa `fill`); sumar el caso de campo vacío → mensaje de error visible.

### B5. La vitrina esconde en el celular la parte del dueño

- **Archivos:** `VitrinaApp.tsx`.
- **Qué hacer.**
  - Tarjeta "En tu agenda · Confirmó" (`VitrinaApp.tsx:220`): sacar `hidden … sm:block`; en el celular más chica y pegada
    abajo: `w-[190px] -left-[2%] bottom-[8%] sm:w-[230px] sm:-left-[6%] sm:bottom-[16%] lg:-left-[26%]`. Verificar que no
    haya scroll horizontal a 375 px.
  - Arrancar en el paso 1 (el recordatorio), no en la pantalla quieta: `useState<Paso>(1)` en lugar de `quieto ? 1 : 0`.
  - Links de abajo (`VitrinaApp.tsx:268-270`): `Probá la app de {n} en vivo` → `Probá cómo reserva tu cliente`, y sumar al
    lado `Mirá el panel del dueño` → `/${n.slug}/panel`.
- **Tests:** `publico.spec.ts:63` busca el link `'Probá la app de Nailed en vivo'` → cambiar al texto nuevo y agregar el del panel.

### B6. El FAQ no responde lo que traba la compra — parcialmente bloqueada por D5

- **Archivos:** `Inicio.tsx:579-645`.
- **Qué hacer.**
  - "¿Cuánto sale?" pasa a ser la **primera** pregunta.
  - Título `Lo que nos preguntan siempre` → `Preguntas frecuentes` (y el folio "08 — Preguntas frecuentes" pasa a "08 — Dudas").
  - Con D5, sumar (redacción base, ajustar a lo decidido):
    - ¿Pago aparte los mensajes de WhatsApp? → "No, están incluidos en el abono."
    - ¿Hay permanencia? → "No. Pagás mes a mes y te das de baja cuando quieras."
    - ¿Cuánto tarda y quién la arma? → "La armamos nosotros. Nos pasás tu logo, servicios y horarios, y en {X} días tenés tu link y tu QR."
    - ¿Y si el cliente no confirma? → explicar qué pasa con el turno (¿se libera?, ¿te avisamos?).
    - ¿Si me voy, me llevo mis clientes? → "Sí, te pasamos la lista."
- **Tests:** `publico.spec.ts:22` (h2) y `:93-116` (teclado: la primera pregunta pasa a ser "¿Cuánto sale?"; ajustar
  cuál se abre y cuál recibe el foco con Tab).

### B7. Textos que prometen de más

| Dónde | Hoy | Cambiar a |
|---|---|---|
| `Inicio.tsx:382` | Todo lo que necesitás para *llenar la agenda* | Todo para que tu agenda *no tenga huecos* |
| `Inicio.tsx:464` | Pensada para cada *tipo de negocio* | Ya viene armada *para tu rubro* |
| `Inicio.tsx:512` | Un abono mensual, *sin sorpresas* | Un abono mensual, *sin permanencia* (solo si D5 lo confirma; si no, *simple*) |

- **Tests:** `publico.spec.ts:15-24` (lista de h2) y `:42` (`region` "Pensada para cada tipo de negocio").

### B8. Precios "A definir" — bloqueada por D2

- **Archivos:** `Inicio.tsx:503-571`, `marca.ts`.
- **Qué hacer.** Si hay número: cargar `precioMensual` en `PLANES` (ya funciona). Si no hay número: reemplazar las 3
  tarjetas "A definir" por **un solo bloque**: "Precio de lanzamiento para los primeros negocios. Te lo pasamos por
  WhatsApp en el día, sin permanencia y con el primer mes para probar." + un botón; abajo, qué incluye cada plan como
  lista simple (sin precio). Unificar `sinPrecios` (`Inicio.tsx:505` y `:618`) en `export const hayPrecios = () => PLANES.some((p) => p.precioMensual != null)` en `marca.ts`.
- **Tests:** sección de precios sin test hoy → ver T3.

### B9. Quiénes somos — bloqueada por D3

- **Archivos:** `Inicio.tsx` (sección nueva antes de Precios), `marca.ts` (`EMPRESA` + foto en `public/`).
- **Qué hacer.** Bloque corto: foto, nombre, ciudad y "Te atiendo yo por WhatsApp". Mientras no haya clientes:
  "Estamos sumando los primeros negocios: te la armamos nosotros y tenés precio de fundador". Cuando haya piloto, una
  cita con un dato real (faltas antes y después). **Nada inventado.**
- **Tests:** agregar el h2 nuevo a la lista de `publico.spec.ts:15-24`.

---

## 4. Accesibilidad

| ID | Qué pasa | Archivo:línea | Arreglo exacto | Test |
|---|---|---|---|---|
| C1 | El encabezado fijo tapa el foco al navegar con teclado (WCAG 2.4.11) | `comunes.tsx:97`, `Inicio.tsx:69` | En `estilos.css` `@layer base`: `html:has([data-encabezado-sitio]) { scroll-padding-top: calc(4rem + env(safe-area-inset-top) + 1rem); }`; poner `data-encabezado-sitio` en el `<header>` de `Encabezado`; sacar `scroll-mt-20` de `Seccion` | El de `#precios` (A2) sigue pasando |
| C2 | La calculadora anuncia los dos montos en cada paso del deslizador | `CalculadoraFaltas.tsx:72` | Sacar `aria-live` de la grilla; agregar `<p className="sr-only" aria-live="polite" aria-atomic="true">{anuncio}</p>` con `anuncio` actualizado a los 900 ms del último cambio y salteando el primer render (snippet abajo) | — |
| C3 | Chat: "Cuenta de empresa" con 3,99:1; `aria-label` en un `div` sin rol; la hora pegada al texto ("venís?9:00"); ícono "Leído" sin rol | `ConversacionWhatsApp.tsx:37,55,53/73/85,76` | `text-white/85` → `text-white`; `role="group"` en el `div` de botones; `<Hora><span className="sr-only">, a las </span>9:00</Hora>`; `role="img"` en `CheckCheck` | — |
| C4 | Link "Mis turnos" del pie solo se distingue por color (1.4.1) | `comunes.tsx:157` | Agregar `underline decoration-acento-borde underline-offset-4 hover:decoration-acento` | — |
| C5 | La ayuda del deslizador no está asociada | `CalculadoraFaltas.tsx:27-35` | `<p id={`${id}-ayuda`}>` y en el `input` `aria-describedby={props.ayuda ? `${id}-ayuda` : undefined}` | — |
| C6 | En el celular no hay forma de saltar a Precios o Preguntas | `comunes.tsx:101` (`hidden lg:block`) | Botón "Secciones" (ícono `Menu`, 44 px) visible bajo `lg` que abre la `Hoja` de `src/ui/Hoja.tsx` con los mismos `NAV`; al tocar uno, cierra y navega | Celular: tocar "Secciones" → "Precios" → h2 de precios en pantalla |
| C7 | Cada respuesta abierta del FAQ crea un landmark `region` (hasta 9) y con `hidden` no se encuentran con Ctrl+F | `Preguntas.tsx:32-37` | `<section aria-labelledby>` → `<div id={`${id}-r`}>`; probar `hidden={abierta ? undefined : 'until-found'}` + listener `beforematch` (por ref) que abre el ítem. Si React no pasa `until-found`, dejar `hidden` y solo sacar el `region` | `publico.spec.ts:107` busca `getByRole('region', …)` → cambiar a `expect(respuesta).toBeVisible()` |
| C8 | Safari con VoiceOver les saca el rol de lista a las listas sin viñeta | `Inicio.tsx:174,230,388,472,522` | `role="list"` en esos `ol`/`ul` | — |
| C9 | Vitrina: la pausa queda después de 3 botones y un link; hay un `<main>` dentro del celular | `VitrinaApp.tsx:267-278`, `:108` | Mover el botón de pausa a primer control del bloque; `<main>` → `<div>` | — |
| C10 | "Recomendado" queda fuera del título del plan; "Mercado PagoPróximamente" pegado | `Inicio.tsx:534-540`, `:408-409` | `<h3>{p.nombre}{p.destacado && <span className="sr-only"> (recomendado)</span>}</h3>`; `{' '}` + `<span className="sr-only">(</span>Próximamente<span className="sr-only">)</span>` | — |
| C11 | Los números de paso calados casi no se ven (2,26:1) | `Inicio.tsx:234` | Solo en los pasos: `[-webkit-text-stroke:2px_var(--t-acento-texto)] opacity-70` (el "Confirmo" gigante queda igual) | — |

Snippet de C2:
```tsx
const [anuncio, setAnuncio] = useState('')
const primero = useRef(true)
useEffect(() => {
  if (primero.current) { primero.current = false; return }
  const t = setTimeout(
    () => setAnuncio(`Perdés ${precio(perdida)} por mes. Podés recuperar ${precio(recuperas)} por mes, ${precio(redondear(recuperas * 12))} al año.`),
    900,
  )
  return () => clearTimeout(t)
}, [perdida, recuperas])
```

---

## 5. Rendimiento y SEO rápidos

### D-SEO1. `og:image` relativa, sin `og:url` ni canonical [verificado] — completar con D6

- **Archivos:** `index.html:18-33`, `.env.example`, variables de Vercel.
- **Qué hacer.** Vite reemplaza `%VITE_…%` en el HTML:
  ```html
  <link rel="canonical" href="%VITE_URL_SITIO%/" />
  <meta property="og:url" content="%VITE_URL_SITIO%/" />
  <meta property="og:image" content="%VITE_URL_SITIO%/compartir.jpg" />
  <meta name="twitter:image" content="%VITE_URL_SITIO%/compartir.jpg" />
  ```
  `VITE_URL_SITIO` en Vercel (Production) y en `.env.example`. Borrar el comentario "Cuando haya dominio…" de `index.html:18`.
- **Listo cuando:** `dist/index.html` tiene URLs absolutas; el depurador de Facebook muestra la imagen.

### D-SEO2. El service worker precachea toda la app en la primera visita [verificado]

- **Qué pasa.** `src/main.tsx:68` registra el SW de inmediato y `vite.config.ts:23` precachea `**/*.{js,css,html,svg,png,woff2,webmanifest}`:
  78 archivos, ~1,76 MB (~735 KB por la red, estimado), incluidos Admin, PanelReal, supabase y todos los subsets de fuentes.
  Compite con la carga de la landing para un dueño que todavía no es cliente.
- **Archivos:** `src/main.tsx`, `vite.config.ts`.
- **Qué hacer.**
  ```ts
  // main.tsx: en la landing, registrar cuando el navegador esté ocioso
  const registrar = () => registerSW({ immediate: true, onRegisterError /* el que ya está */ })
  if (location.pathname === '/') addEventListener('load', () => (window.requestIdleCallback ?? setTimeout)(registrar))
  else registrar()
  ```
  ```ts
  // vite.config.ts, en workbox:
  globIgnores: ['**/Admin-*', '**/*-vietnamese-*', '**/*-cyrillic*', '**/*-greek*', '**/bricolage-*'],
  runtimeCaching: [{ urlPattern: /\.woff2$/, handler: 'CacheFirst', options: { cacheName: 'fuentes', expiration: { maxEntries: 20 } } }],
  ```
- **Listo cuando:** el build reporta bastante menos que 1.956 KiB de precache; la PWA instalada de `/quetul` sigue
  andando sin conexión (probar con DevTools → Offline).

### D-SEO3. Sin `robots.txt` ni `sitemap`; las rutas internas se indexan y lo inexistente da 200 [verificado]

- **Archivos:** `public/robots.txt` (nuevo), `public/sitemap.xml` (nuevo), `vercel.json`, `src/pantallas/NoEncontrado.tsx`.
- **Qué hacer.**
  - `robots.txt`: `User-agent: *` / `Allow: /` / `Disallow: /admin` / `Sitemap: https://<dominio>/sitemap.xml` (D6).
  - `sitemap.xml` con `/`, `/terminos`, `/privacidad`.
  - `vercel.json`, `headers` (aplican aunque haya rewrite):
    `{"source":"/(admin|demos|mis-turnos)(.*)","headers":[{"key":"X-Robots-Tag","value":"noindex"}]}` y lo mismo para
    `/:slug/panel(.*)` y `/:slug/escenario`.
  - `NoEncontrado`: agregar `<meta name="robots" content="noindex">` (React 19 lo sube al `<head>`).

### D-REN1. Desenfoques caros

- **Archivos:** `comunes.tsx:97`, `VitrinaApp.tsx:205`.
- **Qué hacer.** Encabezado: `bg-fondo/85 backdrop-blur-md` → `bg-fondo/95 lg:bg-fondo/85 lg:backdrop-blur-md`.
  Halo de la vitrina: `blur-[70px]` → `bg-[radial-gradient(closest-side,var(--t-acento),transparent)] opacity-30`
  (sin `filter`, como el círculo de la portada).

### D-REN2. El título arranca invisible

- **Archivos:** `Inicio.tsx:46-49,108-145`, `estilos.css`.
- **Qué hacer.** Las entradas `motion.p / motion.h1 / motion.div` de la portada pasan a CSS: `@keyframes entrar { from { opacity: 0; translate: 0 14px } }`
  con `animation: entrar .5s var(--ease-suave) backwards` y `animation-delay` escalonado, dentro de
  `@media (prefers-reduced-motion: no-preference)`. Así el texto está en el DOM visible desde el primer cuadro y la portada
  deja de necesitar `motion` (prerrequisito de F1).

### D-REN3. La portada arrastra media app demo

- **Qué pasa.** El chunk de Inicio trae motion (139 KB), culori (48 KB), date-fns (36 KB), `Marco` (25 KB) y zustand con
  `persist` (por `VitrinaApp.tsx:10`, que importa `textoMensaje` de `datos/demo`).
- **Archivos:** `Inicio.tsx`, `VitrinaApp.tsx`, `src/dominio/mensajes.ts` (nuevo), `src/datos/demo.ts` (solo reexportar).
- **Qué hacer.**
  - `VitrinaApp` con `lazy()` y su propio `<Suspense>`; el placeholder es `<Celular>` vacío (mismo `aspect-ratio`, sin CLS).
    Igual con `ConversacionWhatsApp` y `PantallaDeInicio`.
  - Mover `textoMensaje` y `sustituir` a `src/dominio/mensajes.ts`; `datos/demo.ts` los reexporta (no cambia su API).
- **Listo cuando:** el chunk inicial de `/` baja ~80 KB gzip (medir antes y después con `pnpm build`).

### D-REN4. Fuente de los títulos más liviana

- **Archivos:** `Inicio.tsx:5`.
- **Qué hacer.** `@fontsource-variable/bricolage-grotesque/opsz.css` (77 KB) → `wght.css` (41 KB). **Mirarla antes**: se pierde
  el tamaño óptico; si se nota, quedarse con `opsz`.

---

## 6. Código y estructura (lado del desarrollador)

| ID | Qué | Archivos | Qué hacer | Listo cuando |
|---|---|---|---|---|
| E1 | `text-[clamp(...)]` repetidos | `Inicio.tsx:234,274,381,479,640`, `estilos.css` | Tokens en `@theme`: `--text-subtitular: clamp(2.25rem,1.5rem+2.4vw,3.75rem)` (alto 1.02), `--text-destacado: clamp(1.75rem,1.3rem+1.7vw,3rem)` (1.08), `--text-numeral: clamp(5rem,4rem+4vw,8.5rem)` (0.8). Sumarlos a la config de `cn` (A1) | No queda ningún `text-[clamp` en `Inicio.tsx` |
| E2 | `<em className="text-acento-texto">` ×10 | `Inicio.tsx`, `estilos.css:62` | En `@utility titular`: `& em { font-style: normal; color: var(--t-acento-texto); }` y dejar `<em>` pelado | — |
| E3 | Clases arbitrarias que Tailwind 4 ya trae | `Inicio.tsx` (13×), `comunes.tsx:155`, `CalculadoraFaltas.tsx:37` | `[text-wrap:pretty]` → `text-pretty`; `[overflow-wrap:anywhere]` → `wrap-anywhere`; `accent-[var(--t-acento)]` → `accent-acento` | — |
| E4 | `.aparecer` y `.deriva` sueltas, sin capa | `estilos.css:213-233` | Pasarlas a `@utility aparecer { … }` / `@utility deriva { … }` con el `@media` y el `@supports` adentro; los `@keyframes` en el nivel superior | Siguen andando con reduced-motion apagado |
| E5 | Siete estilos distintos de `h3` | `Inicio.tsx:79,181,239,398,479,540`, `Preguntas.tsx:28` | Dos y nada más: editorial `titular text-3xl` e índice `text-lg font-bold` | — |
| E6 | El lugar de cada plan depende de su posición | `Inicio.tsx:502,531` | `const lugarPlan = (p: Plan, i: number) => cn('lg:col-span-4', p.destacado ? 'xl:col-span-5' : i % 2 ? 'lg:mt-44' : 'lg:mt-24')` | Agregar un 4.º plan o cambiar el recomendado no rompe la grilla |
| E7 | `EnlaceBoton` duplica `Boton`; el `Boton` chico mide 40 px (regla de 44 px) | `ui/Boton.tsx:15-19`, `publico/comunes.tsx:12-48`, `Inicio.tsx:430-455` (`LinkRubro`) | `ui/Boton.tsx` exporta `clasesBoton({ variante, tamano, ancho })` con tamaños `min-h-11/12/14`; nuevo `ui/Enlace.tsx` (`Enlace({ href, externo?, variante?: Variante \| 'texto', tamano?, className, children })`) que decide `Link` o `<a>`. `EnlaceBoton` y `LinkRubro` pasan a usarlo. **Toca toda la app**: suite e2e completa | Un solo mapa de variantes; ningún botón de 40 px |
| E8 | Ids y números de sección escritos a mano en 3 lugares | `comunes.tsx:86-92` (`NAV`), `Inicio.tsx` (8 `id="t-…"`, 9 folios) | `inicio/secciones.ts` con `SECCIONES = [{ id: 'problema', folio: 'El problema' }, { id: 'como-funciona', folio: 'Cómo funciona', nav: 'Cómo funciona' }, …] as const`; `Seccion` da `{ id, n }` por contexto; `Folio` saca el número del índice; `TituloSeccion` pone el `id`; `NAV = SECCIONES.filter((s) => 'nav' in s)` | Reordenar secciones = mover una línea |
| E9 | `Inicio.tsx` tiene 718 líneas | `src/pantallas/publico/` | Partir (el path de `Inicio.tsx` no cambia, `main.tsx` no se toca): `inicio/editorial.tsx` (Seccion, Folio, Entrada, TituloSeccion, Halo, GRILLA, TODO), `inicio/secciones.ts` (E8), `inicio/contenido.tsx` (DOLORES, PASOS, MOMENTOS, VENTAJAS_PWA, FUNCIONES, RUBROS, PREGUNTAS con un tipo `Item { Icono?: LucideIcon; titulo: string; texto: string }`), `inicio/secciones/{Portada,Problema,ComoFunciona,WhatsApp,TuMarca,Funciones,Rubros,Precios,Preguntas,Cierre}.tsx`. El contenido **no** va a `marca.ts` (eso es la config "COMPLETAR"). En `RUBROS`, `demo: 'quetul'` y sacar nombre y href de `DEMOS_FIJAS` | `Inicio.tsx` solo compone; cada sección < 100 líneas |
| E10 | La landing depende por dentro de las demos | `VitrinaApp.tsx:10-17` | Fachada `pantallas/cliente/VistaDeMuestra.tsx` que exporte `armarEjemploVitrina(n, ahora)` y `<VistaDeMuestra …/>`; la landing importa solo eso | Cambiar `cliente/Inicio` no obliga a tocar la landing |
| E11 | Textos de WhatsApp en 4 lugares | migración `fase4_mensajes.sql:524`, `docs/WHATSAPP.md:69`, `ConversacionWhatsApp.tsx:51,84`, `VitrinaApp.tsx:28` | Plantillas como constantes en `dominio/mensajes.ts` (junto con D-REN3); los componentes las usan. La migración queda como está (no se edita) con un comentario cruzado en la constante | Un solo lugar en el front |

---

## 7. Proyectos grandes

### F1. HTML pre-generado de `/` (LCP en 4G y SEO)

- **Por qué.** Hoy la landing es una SPA: hasta bajar ~233 KB gzip de JS la pantalla está vacía (LCP estimado 3–4,5 s en
  4G). Con el HTML ya armado el título aparece en < 1,5 s y los buscadores leen el contenido.
- **Prerrequisitos:** D-REN2 (sin `opacity: 0` inicial) y D-REN3.
- **Qué hacer.**
  1. `vite build --ssr src/estatico.tsx` + script que haga `renderToString(<MemoryRouter><InicioPublico /></MemoryRouter>)`.
  2. Copiar el `dist/index.html` original a `dist/app.html` (shell para el resto de las rutas) e inyectar el HTML en
     `<div id="raiz">` de `dist/index.html`, con `<link rel="modulepreload">` al chunk de Inicio, `<link rel="preload" as="font" crossorigin>`
     a la fuente de títulos y el JSON-LD (`Organization` + `WebSite` + `SoftwareApplication`).
  3. `vercel.json`: `{ "source": "/", "destination": "/index.html" }` y `{ "source": "/(.*)", "destination": "/app.html" }`.
     PWA: `navigateFallback: '/app.html'`, `navigateFallbackDenylist: [/^\/m\//, /^\/$/]`.
  4. `main.tsx`: si `location.pathname === '/'` y `#raiz` tiene contenido, importar Inicio antes del primer render (sin
     `lazy`) para no mostrar el fallback. Usar `createRoot`, **no** `hydrateRoot` (la hora del celular y la semilla usan
     `new Date()` y darían errores de hidratación, que hacen fallar los e2e).
- **Listo cuando:** `curl` de `/` en el deploy de preview muestra el h1 en el HTML; Lighthouse mobile con LCP < 2,5 s;
  `/quetul` y la PWA instalada siguen andando.

### F2. El link de cada negocio se comparte con su marca (clave para el white-label)

- **Por qué.** WhatsApp e Instagram no ejecutan JS: el link de una barbería muestra "SawaTek Turnos" y su imagen.
- **Qué hacer.** `middleware.ts` en la raíz (Vercel Routing Middleware). Solo para bots
  (`/whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot/i`) y slugs que no estén
  en `SLUGS_RESERVADOS`: `GET ${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/negocios?slug=eq.${slug}&select=config` con la
  publishable key (misma consulta pública que `datos/negocios.ts:68`), traer `/index.html` y reemplazar title,
  description, `og:*`, `twitter:*` y canonical, **escapando `& < > "`**. `og:image`: el logo solo si es URL absoluta; si no,
  `compartir.jpg`. `cache-control: public, s-maxage=600`. Para el resto, devolver `undefined` (sigue el pedido normal).
- **Listo cuando:** el depurador de Facebook y una vista previa en WhatsApp de `/<slug>` muestran el nombre del negocio.

### F3. `/demos` pública y `/demos` interna — bloqueada por D4 (toca rutas)

- **Qué pasa [verificado].** `src/pantallas/Portada.tsx:30-33` tiene "Nueva demo" → `/admin`, y lista **todas** las demos
  de la base (`datos/negocios.ts:84-90`, `useTodosLosNegocios`), incluidas las que se arman para cada interesado.
- **Qué hacer.** Vista pública con solo `DEMOS_FIJAS` y dos botones por demo: "Como cliente" (`/<slug>`) y "Como dueño"
  (`/<slug>/panel`); la lista completa pasa a `/admin` (sección Demos ya existe). Actualizar `publico.spec.ts:226-237`.

### F4. Reordenar y acortar la página

- **Por qué.** 10 secciones; el ciclo recordatorio → "Confirmo" → se libera el lugar se explica 5 veces (portada,
  paso 3, los 4 momentos, el chat, el FAQ) y los precios aparecen recién en la sección 07.
- **Orden propuesto:** 1 Portada · 2 Problema + calculadora (con CTA) · 3 Cómo funciona (fusión de 02 y 03, con el chat
  como figura) · 4 Precios · 5 Quiénes somos (B9) · 6 Tu marca + Funciones (fusionadas y más cortas) · 7 Rubros · 8 Preguntas · 9 Cierre.
- **Conviene después de E8/E9** (con `SECCIONES` reordenar es mover líneas). Sacar las sangrías decorativas bajo `sm`
  (`ESCALERA`, `Inicio.tsx:219`; filas corridas de Rubros).

### F5. Sin salto de líneas cuando carga la fuente (CLS)

- **Después de F1.** Fallback con métricas igualadas para la fuente de títulos (plugin `fontaine`, verificar con
  `pnpm view fontaine version deprecated`, o valores de `@capsizecss/metrics`):
  `@font-face { font-family: 'Titulos Respaldo'; src: local('Arial'); size-adjust: …; ascent-override: …; descent-override: …; line-gap-override: 0%; }`
  y `--font-editorial: 'Bricolage Grotesque Variable', 'Titulos Respaldo', ui-sans-serif, sans-serif;`.

### F6. Consolidar piezas repetidas en `src/ui` (toda la app)

| Pieza | Hoy | Propuesta |
|---|---|---|
| `useAccion` | `admin/comunes.tsx:12` y `real/panel/comunes.tsx:34` (iguales salvo el mensaje de error) | `ui/useAccion.ts`: `useAccion(mensaje: (e: unknown) => string)` |
| `claseControl` | 3 copias (`admin:31`, `panel:55`, `ui/Campo.tsx:22`) | Una sola en `ui/Campo.tsx` |
| `Selector`, `AreaTexto` | admin y panel | La versión del panel (tiene `error`) |
| `ErrorEnLinea`, `Exito`, `Cargando`, `Vacio`, `FalloCarga` | admin y panel | `ui/Estados.tsx` |
| `Tarjeta` | 2 variantes | `ui/Tarjeta.tsx` con `nivel?: 2 \| 3` |
| Pastillas con `aria-pressed` | `admin Opciones:71`, `VitrinaApp:250-264`, chips de `Inicio:323` | `ui/Pastillas.tsx` |

Los `comunes.tsx` quedan reexportando (`export const useAccion = () => useAccionBase(mensajeAdmin)`) para no tocar cada import.

---

## 8. Tests que faltan o hay que arreglar

| ID | Qué | Dónde |
|---|---|---|
| T1 | `cn` (A1) | `src/ui/cn.test.ts` |
| T2 | `linkContacto` y `precioPlan` con las 3 ramas (whatsapp, mail, demos). Hoy el e2e compara `linkContacto` contra sí mismo. Para testearlo, que reciba el contacto: `linkContacto(contacto = CONTACTO)` | `src/pantallas/publico/marca.test.ts` |
| T3 | Sección Precios: tarjetas, "Recomendado" (en el nombre del h3 tras C10), href de cada botón, rama con precio cargado | `publico.spec.ts` |
| T4 | Entrar a `/#precios`, `/#%` y "atrás" desde una demo (A2) | `publico.spec.ts` |
| T5 | La pausa frena de verdad: con `page.clock.install()`, avanzar el tiempo y ver que "Confirmó" aparece reproduciendo y no en pausa | `publico.spec.ts` |
| T6 | El test de diseño editorial (`publico.spec.ts:152-168`) compara píxeles y `.aparecer` mueve hasta 40 px → `test.use({ reducedMotion: 'reduce' })` en ese bloque | `publico.spec.ts` |
| T7 | Selectores frágiles: `page.locator('figure [inert]')` (`:52,78`) → `page.locator('[data-celular]').first()`; `.locator('xpath=..')` (`:88,90`) → `role="group"` con `aria-label` en cada resultado de la calculadora | `publico.spec.ts`, `CalculadoraFaltas.tsx` |
| T8 | Menú "Secciones" en el celular (C6) y links a demos de "Tu marca" | `publico.spec.ts` |

---

## 9. Orden y reparto entre agentes

### Tanda 1 — sin decisiones tuyas (se puede hacer ya, en paralelo)

| Agente | Tareas | Archivos que es dueño de tocar |
|---|---|---|
| 1 · Base de UI | A1, E7, T1 | `package.json`, `src/ui/**`, `src/pantallas/real/panel/comunes.tsx:248`, `src/pantallas/publico/comunes.tsx` (solo `EnlaceBoton`) |
| 2 · Infra y SEO | A2 (menos el borrado del efecto), D-SEO2, D-SEO3, D-SEO1 (con placeholder), T4 | `src/main.tsx`, `vite.config.ts`, `vercel.json`, `index.html`, `public/**`, `src/pantallas/NoEncontrado.tsx`, `.env.example` |
| 3 · Piezas de la landing | B2 (chat), B4 (sin la línea de precio), B5, C2, C3, C5, C7, C9, D-REN1 (halo), T5, T7 | `ConversacionWhatsApp.tsx`, `CalculadoraFaltas.tsx`, `Preguntas.tsx`, `VitrinaApp.tsx` |
| 4 · Página | B1 (rama sin contacto), B2 (textos de `Inicio`), B3, B6 (sin D5), B7, C1, C4, C6, C8, C10, C11, D-REN1 (encabezado), D-REN2, E1–E6, borrar el efecto de A2 | `Inicio.tsx`, `comunes.tsx` (menos `EnlaceBoton`), `estilos.css` |

- Contrato antes de arrancar: el agente 1 publica la firma de `Enlace` y `clasesBoton` y la config de `cn`; el agente 4
  agrega los tokens de E1 a esa config cuando A1 esté adentro.
- **Los tests** (`publico.spec.ts`) los toca cada agente solo en los `test(...)` de lo suyo; al final, una pasada única
  corre la suite completa.

### Tanda 2 — después de tus decisiones

D1 → B1 completo, B4 (CTA real) · D2 → B8 · D3 → B9 · D5 → B6 completo, B3 (chip "Sin permanencia"), B7 (precios) · D6 → D-SEO1, D-SEO3 · D7 → B2 con el nombre final.

### Tanda 3 — estructura

E8 + E9 (un solo agente, es mover código), luego E10 + E11 + D-REN3 + D-REN4 + T2, T3, T6, T8. Con `Inicio.tsx` partido,
el reordenamiento F4 se puede repartir por sección.

### Tanda 4 — proyectos

F1 (y F5 detrás), F2, F3 (con D4), F6. Cada uno en su propia rama/PR; F1 y F2 conviene probarlos en un deploy de preview
de Vercel antes de pasar a `main`.
