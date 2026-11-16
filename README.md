# SawaTek Turnos: demo de venta

La app de turnos de cualquier negocio, con su marca, lista para mostrar en una reunión.
Decisiones de producto, arquitectura, stack y diseño: [`DECISIONES.md`](DECISIONES.md).
Qué falta para que sea un producto real: [`HOJA-DE-RUTA.md`](HOJA-DE-RUTA.md).

## Levantarla

```bash
pnpm install
pnpm dev        # http://localhost:5180
```

`pnpm` se baja solo la versión 12.21 que pide el proyecto (`devEngines`). Necesita Node 24 o más (recomendado: Node 26 LTS).

| Comando | Qué hace |
|---|---|
| `pnpm dev` | servidor de desarrollo |
| `pnpm build` | chequeo de tipos + build de producción con PWA (`dist/`) |
| `pnpm test` | tests de horarios, datos de ejemplo y contraste de colores |
| `pnpm lint` | oxlint |

## Tests

| Comando | Qué prueba |
|---|---|
| `pnpm test` | Lógica pura: horarios, datos de ejemplo, contraste de colores, instalación (Vitest) |
| `pnpm test:e2e` | Permisos de cada rol en la base y la app en el navegador (Playwright) |
| `pnpm exec playwright test -c tests/funciones` | Edge Functions de mensajes (levanta `supabase functions serve` solo) |

`pnpm test:e2e` corre contra una **copia local de Supabase** (Docker), nunca contra la base real:

```bash
pnpm db:local     # una vez: levanta Supabase local y aplica las migraciones
pnpm test:e2e
```

Otros: `pnpm db:reset` (vuelve a crear la base local desde las migraciones) y `pnpm db:tipos` (regenera `src/datos/tipos-db.ts` después de cambiar el esquema).

## Roles y datos (fase 1)

Definido en `supabase/migrations/20261117000000_fase1_roles.sql`. Los permisos los hace cumplir la base (RLS), no la app.

| Rol | Cómo se asigna | Qué ve y hace |
|---|---|---|
| Super admin | tabla `superadmins` (mail) | Todo |
| Dueño | `miembros.rol = 'dueno'` | Solo su negocio: catálogo, horarios, clientes, todos los turnos |
| Profesional | `miembros.rol = 'profesional'` + `profesionales.user_id` | Solo sus turnos (cambiar estado y notas), sus bloqueos |
| Cliente | `clientes.user_id` (se crea al reservar) | Solo sus turnos, vía funciones |

Tablas: `negocios` (con `es_demo`, `estado`, reglas de reserva), `miembros`, `profesionales`, `servicios`, `profesional_servicios`, `horarios` (semanales por profesional), `bloqueos`, `clientes`, `notas_clientes` (privadas del negocio), `turnos` (la base impide turnos superpuestos del mismo profesional).

La clave secreta y el SQL Editor de Supabase no pasan por las protecciones de la app: son herramientas de SawaTek. Un mail en `superadmins` solo da permisos si la cuenta está confirmada.

Funciones para la app del cliente: `horarios_libres` (cálculo en el servidor), `reservar_turno`, `confirmar_turno`, `cancelar_turno`.

## Negocios reales (fases 2 a 4)

Además de las demos, la app maneja **negocios reales**: con base de datos, panel para el dueño y su equipo, y clientes que entran con el celular.

**Alta (SawaTek):**
1. En `/admin` → *3. Publicación* → **Negocio real**, con el mail del dueño. La plantilla del rubro carga servicios, equipo y horarios (`crear_negocio_real`), y queda una invitación para ese mail.
2. En Supabase → *Authentication → Users* → crear el usuario del dueño con ese mail y contraseña ("Auto Confirm User").
3. El dueño entra a `/<negocio>/panel`: la invitación se acepta sola y queda como dueño. Desde ahí ajusta servicios, precios, horarios e invita a su equipo.

**Clientes:** entran a `/<negocio>` con su celular y un código. El código no lo manda un proveedor de SMS: lo deja un hook de Supabase en la cola `mensajes` y de ahí sale por WhatsApp (fase 4, ver [`docs/WHATSAPP.md`](docs/WHATSAPP.md)).
En producción hay que activar: *Authentication → Sign In / Providers → Phone* y *Authentication → Hooks → Send SMS → Postgres* `public.hook_enviar_codigo`.

## Pantallas

| Ruta | Para qué |
|---|---|
| `/` | todas las demos, con acceso a cliente / dueño / escenario |
| `/admin` | alta de una demo nueva en 1 minuto (logo → color automático, plantilla por rubro, QR) |
| `/:negocio` | app del cliente (ej.: `/quetul`) |
| `/:negocio/panel` | panel del dueño |
| `/:negocio/escenario` | celular + panel lado a lado, en vivo, con "máquina del tiempo" |

Demos de fábrica: `/quetul` (barbería, oscuro), `/lema` (consultorio, claro), `/nailed` (uñas, claro).

## Cómo presentar (guion corto)

1. Antes de la reunión: `/admin` → nombre del negocio, rubro y logo → **Crear demo**.
2. Abrí `/<negocio>/escenario` en la compu.
3. En el celular de la izquierda: ingresar (el código llega como notificación de WhatsApp, tocala y se completa sola) y **Reservar este** en "Próximo libre". El turno aparece en vivo en el panel.
   Mejor todavía: **Conectar un celular** (arriba) muestra un QR; el prospecto lo escanea y reserva desde *su* celular. Cada presentación tiene su propia sala: otras personas que abran la misma demo no ven nada.
4. Con la máquina del tiempo de arriba: **Ir al recordatorio de 24 h** → llega el WhatsApp con **Confirmo / Cambiar horario**.
5. En el panel: la calculadora de faltas con los números del dueño.
6. **Reiniciar** deja todo limpio para la próxima.

## Cómo instala la app el cliente del negocio

No hay tiendas de apps: entra por un link (WhatsApp, bio de Instagram, QR en el local, Google Maps), reserva sin instalar nada y, **después de reservar**, se le ofrece tenerla en el inicio:

- **Android / Chrome**: el cartel nativo "Instalar". Se instala con el nombre y el ícono del negocio, y abre directo en su app.
- **iPhone**: guía de 3 pasos (Compartir → Agregar a inicio → Agregar). Apple no permite un botón de instalar.
- **Navegador interno de Instagram, Facebook, TikTok o WhatsApp**: desde ahí no se puede instalar, así que explica cómo abrirla en Safari/Chrome y ofrece copiar el link.

Cómo funciona: cada negocio tiene su manifest e íconos (`src/instalacion/marca.ts`), servidos por el service worker en `/m/<negocio>/…`. Verificado con Chrome: QueTul y Consultorio Lema son instalables, cada uno con su nombre. En iPhone, el ícono y el nombre salen de `apple-touch-icon` y `apple-mobile-web-app-title`.

## Nube: Supabase + Vercel

Sin configurar nada, la app funciona igual pero las demos de `/admin` quedan solo en el navegador. Con Supabase:
- las demos se guardan en la tabla `negocios` y **el link y el QR abren en cualquier celular**;
- `/admin` pide ingresar con un link al mail, y solo pueden guardar los mails cargados en `admins`;
- **en vivo entre dispositivos**: el prospecto escanea el QR de "Conectar un celular" del modo escenario, reserva desde su celular y aparece en el panel de tu compu; la máquina del tiempo de tu compu le hace llegar los recordatorios. Solo se conectan los dispositivos de esa sala.

### Vercel (una sola vez)

1. *Add New → Project → Import* `Sawatek/app-turnos`. **Framework Preset: Vite**, Root Directory `./`. Install, build y salida ya están en `vercel.json` (pnpm 12 vía corepack, carpeta `dist`); Node 24 sale de `package.json`.
2. Conectar Supabase desde la integración de Vercel (*Integrations → Supabase*): carga sola `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, que la app ya lee.
3. Deploy. Desde ahí, cada `git push` a `main` publica solo (y cada rama, una vista previa).

### Supabase (una sola vez)

1. **Base de datos**: con la integración de GitHub, las migraciones de `supabase/migrations/` se aplican solas al subir a `main` (*Working directory* = `.` y *Deploy to production* activado). Alternativa: pegar el SQL en el *SQL Editor*.
2. **Admins**: en el *SQL Editor*, una vez por persona:
   ```sql
   insert into public.admins (email) values ('mail@sawatek.com.ar');
   ```
3. **Auth → URL Configuration**: *Site URL* = la URL de Vercel. En *Redirect URLs*: `https://<tu-proyecto>.vercel.app/admin` y `http://localhost:5180/admin`.
4. **Local**: `.env.local` con las mismas variables (ver `.env.example`, o `vercel env pull .env.local`).

## Qué falta

- Probar en iPhone y Android reales (sobre todo la instalación en iPhone).
- Opcional: dominio propio (ej.: `turnos.sawatek.com.ar`).
