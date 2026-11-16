# SawaTek Turnos: demo de venta

La app de turnos de cualquier negocio, con su marca, lista para mostrar en una reunión.
Decisiones de producto, arquitectura, stack y diseño: [`DECISIONES.md`](DECISIONES.md).

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
4. Con la máquina del tiempo de arriba: **Ir al recordatorio de 24 h** → llega el WhatsApp con **Confirmo / Cambiar horario**.
5. En el panel: la calculadora de faltas con los números del dueño.
6. **Reiniciar** deja todo limpio para la próxima.

## Cómo instala la app el cliente del negocio

No hay tiendas de apps: entra por un link (WhatsApp, bio de Instagram, QR en el local, Google Maps), reserva sin instalar nada y, **después de reservar**, se le ofrece tenerla en el inicio:

- **Android / Chrome**: el cartel nativo "Instalar". Se instala con el nombre y el ícono del negocio, y abre directo en su app.
- **iPhone**: guía de 3 pasos (Compartir → Agregar a inicio → Agregar). Apple no permite un botón de instalar.
- **Navegador interno de Instagram, Facebook, TikTok o WhatsApp**: desde ahí no se puede instalar, así que explica cómo abrirla en Safari/Chrome y ofrece copiar el link.

Cómo funciona: cada negocio tiene su manifest e íconos (`src/instalacion/marca.ts`), servidos por el service worker en `/m/<negocio>/…`. Verificado con Chrome: QueTul y Consultorio Lema son instalables, cada uno con su nombre. En iPhone, el ícono y el nombre salen de `apple-touch-icon` y `apple-mobile-web-app-title`.

## Qué falta (próximos pasos)

- **Supabase**: guardar las demos de `/admin` en la nube, para que el link y el QR funcionen en el celular del prospecto (hoy se guardan en el navegador donde se crearon), y el tiempo real entre dispositivos.
- **Netlify**: deploy + función que responda `/m/<negocio>/…` desde el servidor (hoy lo arma el service worker en el celular; en un navegador sin service worker, la app se instalaría con la marca de SawaTek); ahí cambiar la regla de `vite.config.ts` a `NetworkFirst`.
- Probar en iPhone y Android reales.
