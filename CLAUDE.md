# CLAUDE.md — SawaTek Turnos

Contexto para trabajar en este repo. Leelo entero antes de tocar algo. Próximo objetivo: **rediseñar el frontend** sin romper datos, permisos ni tests.

## Idioma y forma de trabajar

- **Todo en español rioplatense (vos)**: textos de la interfaz, comentarios, nombres de archivos/funciones/variables, commits, docs y respuestas al usuario.
- **Paquetes siempre en la última versión estable, no deprecada y compatible.** Verificá con `pnpm view <paquete> version deprecated` antes de agregar o actualizar. Gestor: **pnpm** (lo fija `packageManager` en `package.json`; nunca npm/yarn).
- Trabajo en **rama `dev`**. `main` es lo publicado: no se toca directo. Commit/push solo cuando el usuario lo pide (suele pedir "pusheá a dev").
- Al usuario le gusta **paralelizar con varios agentes** en tareas grandes: repartir por archivos que no se pisen, con un contrato claro (rutas/tipos/stubs) armado antes.
- Antes de dar algo por terminado: `pnpm exec tsc -b`, `pnpm lint`, `pnpm test`, `pnpm exec playwright test` y `pnpm build`. Al terminar, **apagar los servidores** que se levantaron.
- Nunca usar la base real ni leer `.env.local` en tests o scripts: todo contra la **Supabase local**.

## El producto

App de turnos **white-label** para negocios chicos de Argentina (barberías, peluquerías, uñas, consultorios, salud, tatuajes). Cada negocio tiene su app con **su marca** (logo, color, estilo), instalable (PWA) sin tiendas. Argumento de venta: **menos faltas** gracias a recordatorios y confirmación por WhatsApp ("Confirmo"). Nombre comercial **no decidido** (candidato: "Confirmo"; slogan "Turnos que se confirman solos"); hoy se usa "SawaTek Turnos".

Dos mundos conviven:
- **Demos de venta** (`negocios.es_demo = true` y las fijas `/quetul`, `/lema`, `/nailed`): todo simulado en el navegador (localStorage), con modo escenario y "máquina del tiempo" para presentar.
- **Negocios reales** (`es_demo = false`): base de datos, roles, panel y clientes reales.

Documentos: `README.md` (cómo levantar, rutas, nube), `HOJA-DE-RUTA.md` (fases, pendientes, **"Para probar mañana"**), `DECISIONES.md` (decisiones originales de diseño/arquitectura), `docs/WHATSAPP.md` (Meta, plantillas, secretos).

## Stack

React 19 + **React Compiler** (Babel 7) · Vite 8 · TypeScript 7 (`tsc -b`) · Tailwind CSS 4 (tokens en CSS con `@theme`) · radix-ui (diálogos accesibles) · motion (animaciones) · react-router 8 · zustand (estado de demos) · @tanstack/react-query (datos reales) · Supabase (Postgres + Auth + Realtime + Edge Functions en Deno) · vite-plugin-pwa · culori (color OKLCH) · date-fns + @date-fns/tz · lucide-react (íconos) · Plus Jakarta Sans (fontsource) · oxlint · Vitest · Playwright. Node ≥ 24.

## Comandos

```bash
pnpm install
pnpm db:local          # Supabase local en Docker con todas las migraciones (Docker abierto)
pnpm local:semilla     # usuarios y negocio real de prueba (idempotente)
pnpm dev:local         # app en http://localhost:5180 contra la base LOCAL
pnpm local:codigo      # último código de ingreso por celular (el "WhatsApp" local)
pnpm dev               # app contra la base de .env.local (la REAL) — no usar para probar lo nuevo
pnpm exec tsc -b       # tipos (incluye tests y configs)
pnpm lint              # oxlint sobre src
pnpm test              # Vitest (lógica pura en src/**/*.test.ts)
pnpm exec playwright test                  # permisos + e2e (levanta Vite :5190 y las Edge Functions)
pnpm exec playwright test -c tests/funciones   # tests de Edge Functions
pnpm db:reset          # rearma la base local de cero con las migraciones
pnpm db:tipos          # regenera src/datos/tipos-db.ts (después agregar arriba: // Generado con: pnpm db:tipos (no editar a mano).)
pnpm exec supabase stop   # apaga la base local (los datos quedan)
```

Usuarios locales (contraseña `sawatek-local-123`): `admin@sawatek.local` (SawaTek, `/admin`), `dueno@sawatek.local` (Tulio, `/barberia-de-prueba/panel`), `profesional@sawatek.local` (Nico, mismo panel), clientes con cualquier celular en `/barberia-de-prueba`.

## Rutas (`src/main.tsx`)

| Ruta | Pantalla | Quién |
|---|---|---|
| `/` | `pantallas/publico/Inicio.tsx` — landing del producto | público |
| `/terminos`, `/privacidad` | `publico/Legal.tsx` (borradores, revisar con abogado) | público |
| `/demos` | `pantallas/Portada.tsx` — lista de demos | interno |
| `/admin`, `/admin/:seccion` | `pantallas/admin/*` — consola de SawaTek (resumen, negocios, demos, nuevo, cuentas, mensajes) | superadmin |
| `/mis-turnos` | `pantallas/cuenta/MisTurnos.tsx` — turnos del cliente en todos los negocios | cliente |
| `/:slug` | `pantallas/cliente/AppCliente.tsx` → si es demo: app simulada; si es real: `pantallas/real/cliente/ClienteReal.tsx` | cliente |
| `/:slug/panel`, `/:slug/panel/:seccion` | `pantallas/panel/Panel.tsx` → demo simulado o `pantallas/real/panel/PanelReal.tsx` (agenda, clientes, reportes, servicios, equipo, horarios, marca, ajustes) | dueño / profesional |
| `/:slug/escenario` | `pantallas/escenario/Escenario.tsx` — celular + panel lado a lado para presentar (demo) | interno |
| `*` | `pantallas/NoEncontrado.tsx` | — |

Links reservados (ningún negocio puede usarlos): `SLUGS_RESERVADOS` en `src/datos/negocios.ts`.

## Estructura de `src/`

- `dominio/` — tipos (`Negocio`, `Turno`…), tiempo en hora argentina, cálculo de horarios (demo) y semilla de datos de ejemplo. Lógica pura con tests.
- `datos/` — acceso a datos. `supabase.ts` (cliente tipado; lee `VITE_SUPABASE_*` o `NEXT_PUBLIC_SUPABASE_*`), `negocios.ts` (config de negocios + `meta.esDemo`), `sesion.ts` (login, `nombreDeUsuario`, `guardarMiNombre`), `demo.ts` (estado simulado), `envivo.ts` + `sala.ts` (tiempo real por sala en demos), `admin.ts`, `real/cliente*.ts`, `real/panel*.ts`, `real/push.ts`, `tipos-db.ts` (generado).
- `pantallas/` — una carpeta por superficie (ver rutas). `real/` = negocios reales; `cliente/` y `panel/` sueltas = demo.
- `ui/` — componentes base: `Boton`, `Campo`, `Hoja` (bottom sheet Radix + motion, arrastrable), `Insignia`, `Logo`, `Notificacion`, `cn`.
- `tema/` — `paleta.ts` (genera TODA la paleta desde un color + modo, en OKLCH, con contraste WCAG garantizado y testeado; `colorDelLogo`), `TemaNegocio.tsx` (`useTemaNegocio`, `estiloTema`).
- `instalacion/` — PWA con la marca de cada negocio (manifest e íconos por negocio servidos por el service worker en `/m/<slug>/…`), oferta de instalar y guías iPhone/Android/navegador interno.
- `plantillas/` — plantillas por rubro y demos fijas.
- `estilos.css` — Tailwind + tokens.

## Sistema de diseño actual (punto de partida del rediseño)

- **Tokens en 3 capas** (`src/estilos.css`): primitivos (tipografía, radios, espacios) → semánticos `--t-*` (los genera `generarTema`: fondo, superficie, superficie-2, linea, texto, suave, acento, sobre-acento, acento-texto, acento-suave, acento-borde, peligro, exito, aviso) → clases Tailwind (`bg-fondo`, `text-suave`, `bg-acento`, `text-sobre-acento`, `rounded-medio`…). **Nunca hex sueltos en componentes** (excepciones a propósito: verde de WhatsApp, azul de Mercado Pago simulado, marcos de celular).
- **Marca por negocio**: cada negocio cambia solo color + logo + modo (claro/oscuro) + **personalidad** (`moderna` / `clasica` / `serena`, vía `data-personalidad`: cambia radios, peso de títulos y aire). Todo lo demás se deriva. El rediseño tiene que seguir funcionando con CUALQUIER color de marca (los tests de `paleta.test.ts` lo garantizan).
- Tipografía Plus Jakarta Sans; números tabulares (`num`) para horas y precios.
- Patrones: bottom sheets para acciones, barra inferior en celular / lateral en compu, "pase" del turno estilo tarjeta de embarque, grid bento en el inicio del cliente, notificaciones tipo WhatsApp.
- Reglas (de ui-ux-pro-max, mantenerlas): objetivos táctiles ≥ 44 px, etiquetas visibles (no solo placeholder), errores al lado del campo, contraste AA (4.5:1), foco visible, sin emojis como íconos (lucide), respetar `prefers-reduced-motion`, mobile-first sin scroll horizontal, safe areas del celular.
- Para diseñar usar las skills `ui-ux-pro-max:*` (ui-ux-pro-max, design-system, ui-styling…).
- **Deuda para el rediseño**: hay piezas repetidas por superficie (`pantallas/admin/comunes.tsx`, `pantallas/real/panel/comunes.tsx`, `pantallas/publico/comunes.tsx`, y pantallas demo vs reales que se parecen: `cliente/` vs `real/cliente/`). Conviene consolidar en `src/ui/` un set de componentes común (selector/segmented, interruptor, tarjeta, tabla, lista, estado vacío/error, encabezado de sección, navegación) y que las pantallas lo usen.

## Rediseño: qué se puede tocar y qué no

- **Libre**: JSX, estilos, layout, componentes de `ui/`, tokens visuales, animaciones, microcopy (respetando español rioplatense).
- **No cambiar sin necesidad**: `datos/**` (consultas, mutaciones, react-query keys), `dominio/**`, `tema/paleta.ts` (si se toca, que pasen sus tests), migraciones y funciones SQL, Edge Functions, rutas.
- **Tests e2e dependen de nombres accesibles y textos** (`getByRole`, `getByLabel`, `getByText`). Si el rediseño cambia un texto, una etiqueta o un rol, **actualizá el test correspondiente** en `tests/e2e/**` (no los borres). Ej.: "Recibir código por WhatsApp", "Completar código", "Reservar este", "Ir al inicio", "Mail o contraseña incorrectos.", "Nuevo turno desde la app". Correr la suite completa al final.
- Los temas se aplican con `useTemaNegocio(n)` (página entera) o `estiloTema(n)` (un recuadro, ej. vistas previas).

## Datos y permisos (Supabase)

Migraciones en `supabase/migrations/` (13, en orden; nombres `AAAAMMDDHHMMSS_descripcion.sql`). Puntos clave:
- **Roles**: superadmin (`superadmins` por mail, cuenta confirmada), dueño y profesional (`miembros`), cliente (`clientes.user_id`). Permisos con **RLS** + triggers; funciones `security definer set search_path = ''` con chequeos adentro.
- Tablas: `negocios` (config jsonb con marca/textos, `es_demo`, `estado`, `plan`, reglas de reserva), `negocios_internos` (notas, solo superadmin), `profesionales`, `servicios`, `profesional_servicios`, `horarios`, `bloqueos`, `clientes`, `notas_clientes`, `turnos` (exclusion constraint: nunca dos turnos superpuestos del mismo profesional), `invitaciones`, `mensajes` (cola saliente), `push_suscripciones`, `lista_espera`, `resenas`.
- Funciones del cliente: `horarios_libres`, `disponibilidad_dias`, `reservar_turno`, `confirmar_turno`, `cancelar_turno`, `mi_resumen`, `mis_turnos_global`, `anotarme_lista_espera`, `calificacion_negocio`. Panel: `panel_*`. Consola: `admin_*`. Alta: `crear_negocio_real`.
- Nombre de cada persona: `auth.users.raw_user_meta_data->>'display_name'`.
- Login del cliente: celular + código. El hook "Send SMS" deja el código en `mensajes` (no hay proveedor de SMS); sale por WhatsApp.
- Edge Functions (`supabase/functions/`): `enviar-mensajes` (despachador, cron), `whatsapp-webhook` (botón "Confirmo"), `admin-usuarios` (cuentas desde la consola).
- Cambios de esquema: migración NUEVA (nunca editar una ya aplicada en producción), re-ejecutable, + tests de permisos en `tests/permisos/`, + `pnpm db:tipos`.

## Tests

- `tests/soporte/mundo.ts`: arma un "mundo" aislado por archivo (2 negocios reales, servicios, profesionales, usuarios de cada rol) y lo limpia.
- `tests/permisos/`: reglas de la base rol por rol (sin navegador). `tests/e2e/`: navegador (Pixel 7) contra la app en :5190 conectada a la Supabase local; `tests/e2e/ayudantes.ts` falla el test si hay errores de consola.
- Estado al 17/11/2026: 264 Playwright + 8 Edge Functions + 50 Vitest. **Un test intermitente** documentado en `HOJA-DE-RUTA.md` ("Para probar mañana").

## Nube

- Repo `Sawatek/app-turnos` (GitHub). PR #1 (`fase-1-roles` → `main`) abierto; `dev` tiene todo lo posterior (fases 1–4 + plataforma). Al mergear a `main`, la integración de GitHub de Supabase aplica las migraciones en la base real.
- Vercel (plan Hobby, uso interno por ahora; pasan a Pro al vender), preset Vite, comandos en `vercel.json` (pnpm vía corepack). Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` las carga la integración Vercel ↔ Supabase.
- Producción pendiente: activar ingreso por teléfono + hook Send SMS, desplegar las 3 funciones con sus secretos, Vault para el cron, `VITE_VAPID_PUBLIC_KEY`, trámite con Meta (7 plantillas). Ver `HOJA-DE-RUTA.md` y `docs/WHATSAPP.md`.

## Pendientes conocidos (no de diseño)

Contacto, precios, nombre comercial y datos de la empresa en `src/pantallas/publico/marca.ts`; legales a revisar con abogado; aviso al cliente cuando el dueño le mueve un turno (falta plantilla); señas con Mercado Pago (fase 5); suscripciones de SawaTek (fase 6).
