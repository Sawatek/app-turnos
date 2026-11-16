# Demo nueva de la app de turnos: decisiones

Estado: **aprobado; pasos 1 a 5 del orden de construcción hechos, más el alta en `/admin` con QR (guardada en el navegador)** (ver [README](README.md)). Faltan Supabase, Netlify y la prueba en celulares reales. Fecha: 16/11/2026.
La demo anterior (un solo HTML) se reemplazó por completo por este proyecto.

## 1. Para qué es

Una demo **para vender a dueños de negocios** (barberías, peluquerías, consultorios, etc.). Los negocios los da de alta SawaTek, no se registran solos.

El argumento de venta en una frase: **"esta ya es TU app"**. En una reunión, en 1 minuto, el prospecto ve su nombre, su logo y sus colores, la instala en su celular y saca un turno. Mientras tanto, ese turno le aparece en vivo en el panel del dueño.

Lo que sigue simulado (no hace falta para vender): el envío real por WhatsApp, el cobro de Mercado Pago y las notificaciones automáticas. Se *ven* como reales, pero no salen de la demo.

## 2. Qué tiene la demo (alcance)

### A. Alta de demo en 1 minuto (pantalla `/admin`, solo SawaTek)
- Datos del negocio: nombre, rubro, dirección y WhatsApp.
- Logo: se sube y **el color de marca se saca del logo automáticamente** (se puede ajustar).
- **Plantillas por rubro**: barbería, peluquería/estética, uñas, consultorio odontológico, salud (kinesio/psico/nutri) y tatuajes. Cada una trae servicios, duraciones, precios típicos, textos y promos. Se edita lo que haga falta.
- Al guardar: un link (`/quetul`) y un **QR** para que el prospecto lo escanee y la instale.

### B. App del cliente (`/:negocio`)
- Entrada con celular + código por "WhatsApp" (simulado, se ve como el mensaje real).
- **Inicio "tiempo primero"**: arriba está el *próximo horario libre* ("Hoy 17:30 con Nico") y un botón **"Lo de siempre"** que repite el último turno con un toque. Abajo, en un grid tipo bento: tu próximo turno, promos y la tarjeta de fidelidad.
- **Reserva en una sola hoja** que sube desde abajo (no 4 pantallas): servicio → profesional (o "cualquiera", que muestra más horarios) → tira de días con indicador de disponibilidad → horarios. Barra de progreso visible.
- **El turno como "pase"** (estilo tarjeta de embarque): cuenta regresiva, agregar al calendario (.ics), cómo llegar, y confirmar, cancelar o reprogramar.
- Seña con un checkout que *parece* el de Mercado Pago.
- Tarjeta de fidelidad con sellos animados.

### C. Panel del dueño (`/:negocio/panel`, pensado para celular y compu)
- Agenda del día por profesional, en línea de tiempo. Se desliza para marcar "llegó" o "no vino".
- Estado de confirmaciones y recordatorios enviados.
- Clientes para recuperar ("hace +5 semanas que no viene") con un mensaje listo para mandar.
- **Calculadora de plata perdida**: el dueño pone cuántas faltas tiene por semana, y la app le muestra cuánto pierde por mes y cuánto recupera. Es el argumento de venta con sus propios números.

### D. Modo escenario (`/:negocio/escenario`, para presentar)
- En la compu: **el celular del cliente a la izquierda y el panel del dueño a la derecha**. Lo que hace uno aparece en vivo en el otro.
- También en vivo **entre dispositivos**: el prospecto reserva desde *su* celular y el turno cae en el panel que está en la compu del vendedor.
- **"Adelantar el tiempo"**: un control para saltar a "mañana 10:00" y mostrar el recordatorio de 24 h, después el de 2 h y la confirmación con un toque. Muestra la automatización sin esperar.
- Los datos de ejemplo se generan **relativos a hoy**, así la agenda siempre se ve llena y creíble.

## 3. Arquitectura

```
Navegador (PWA)                          Netlify                     Supabase
┌─────────────────────────────┐   ┌──────────────────────┐   ┌──────────────────────────┐
│ /admin     alta de demos    │──▶│ sitio estático       │   │ tabla negocios (config)  │
│ /:negocio  app del cliente  │   │ función: manifest e  │◀─▶│ storage: logos           │
│ /panel     panel del dueño  │   │ íconos por negocio   │   │ realtime: canal por demo │
│ /escenario las dos juntas   │   └──────────────────────┘   │ auth: solo SawaTek       │
│ turnos de la demo: local    │◀────── tiempo real ─────────▶└──────────────────────────┘
└─────────────────────────────┘
```

- **Una sola app para todos los negocios.** Cada negocio es un registro en Supabase, con su configuración (marca, servicios, staff, horarios, textos) y su logo. Nada de editar código para sumar un cliente.
- **Los turnos de la demo viven en el navegador** de quien la usa, así cada prospecto juega sin pisar a otro. Lo único compartido es el canal en vivo de cada demo, que no guarda datos.
- **Instalable con la marca del negocio.** Cada negocio tiene su propio manifest e íconos, generados por una función de Netlify a partir de su logo. Así, al instalarla, en el celular dice "QueTul" con su ícono.
- **Seguridad**: cualquiera puede *leer* la configuración de una demo por su link; solo SawaTek (login con email) puede crear o editar. Esto se controla con reglas en la base (RLS).
- **Preparada para ser producto después.** Toda la lógica de turnos (horarios libres, duraciones, superposiciones) va en un módulo propio, sin pantallas, y con tests. El acceso a datos pasa por una interfaz: hoy hay una versión "demo" (navegador) y mañana una "real" (Supabase), sin rehacer las pantallas.

### Estructura de carpetas

```
App-Turnos-SawaTek/
  src/
    dominio/      tipos, cálculo de horarios libres, reglas (TS puro + tests)
    datos/        interfaz de repositorio: version demo (local) / futura Supabase
    simulador/    reloj simulado, WhatsApp, Mercado Pago, notificaciones
    tema/         tokens y generación de paleta desde el color del negocio
    plantillas/   configuraciones por rubro
    ui/           componentes base (botón, hoja inferior, chips, pase...)
    pantallas/
      cliente/  panel/  escenario/  admin/
  netlify/functions/   manifest e íconos por negocio
  supabase/            migraciones SQL y políticas
```

## 4. Stack (versiones verificadas en npm el 16/11/2026: últimas estables, ninguna deprecated)

| Para qué | Paquete | Versión | Por qué |
|---|---|---|---|
| Runtime | Node | 26.13 LTS | LTS actual |
| Gestor de paquetes | pnpm | 12.21 | el que ya usás en la máquina (la carpeta de usuario está en 11.24; hay que actualizarlo) |
| UI | react / react-dom | 19.3.1 | |
| Optimización automática | babel-plugin-react-compiler | 1.0.0 | React Compiler: evita re-renders sin escribir memo a mano |
| Build | vite | 8.3.8 | |
| Plugin React | @vitejs/plugin-react | 6.3.0 | |
| Lenguaje | typescript | 7.0.2 | compilador nativo, mucho más rápido |
| Lint | oxlint | 1.94.0 | `typescript-eslint` todavía no soporta TS 7; oxlint sí, y es parte del ecosistema de Vite |
| Estilos | tailwindcss + @tailwindcss/vite | 4.3.5 | tokens en CSS (`@theme`), ideal para cambiar la marca por negocio |
| Componentes accesibles | radix-ui | 1.8.1 | diálogos, menús y pestañas accesibles, sin estilos impuestos |
| Animación | motion | 14.14.0 | animaciones con resorte y gestos (la hoja inferior arrastrable) |
| Rutas | react-router | 8.5.1 | |
| Estado de la demo | zustand | 5.1.0 | simple, con guardado en el navegador |
| Datos remotos | @tanstack/react-query | 5.107.1 | cache de la configuración del negocio |
| Backend | @supabase/supabase-js | 2.119.0 | base, storage, tiempo real y login |
| PWA | vite-plugin-pwa (+ workbox-window 7.4.1) | 2.0.0 | funciona sin conexión y es instalable |
| Íconos de la PWA | @vite-pwa/assets-generator | 2.0.0 | |
| Íconos | lucide-react | 1.73.0 | SVG, nada de emojis como íconos |
| Fechas | date-fns + @date-fns/tz | 4.4.0 / 1.5.0 | zona horaria de Argentina bien manejada |
| Color | culori | 4.0.2 (+ @types/culori 4.0.1) | paleta en OKLCH y control de contraste |
| QR | qr | 0.7.2 | mantenido, sin dependencias, con tipos incluidos |
| Tipografía | @fontsource-variable/plus-jakarta-sans | 5.3.0 | incluida en la app, sin depender de Google |
| Tests | vitest | 5.1.0 | lógica de horarios y de paleta |
| Funciones | @netlify/functions | 6.1.1 | |

**Descartados**: `vaul` (hoja inferior; sin publicar desde dic/2024, la hacemos con Radix + motion), `qrcode` (reemplazado por `qr`), `typescript-eslint` (no soporta TS 7).

## 5. Diseño

Base: recomendaciones de ui-ux-pro-max para apps de reserva de turnos ("Soft UI Evolution" + grid bento + micro-interacciones). **Se evitan** el 3D, el vidrio exagerado y las sombras pesadas.

### Personalización: el negocio cambia 1 color + logo, nada más
Tokens en tres capas:
1. **Primitivos**: grises neutros, radios, espacios y tipografía (fijos).
2. **Semánticos**: `fondo`, `superficie`, `texto`, `acento`, `sobre-acento`, `éxito`, `peligro`...
3. **De componente**: `boton-fondo`, `pase-borde`, `chip-activo`...

A partir del color del negocio se genera **toda la escala en OKLCH** (claro y oscuro). El color del texto sobre el acento (blanco o negro) se calcula **para que siempre cumpla contraste 4.5:1**. Así cualquier logo queda bien y nunca se rompe la legibilidad. Cada negocio elige modo claro, oscuro o "según el celular".

### Personalidad tipográfica por rubro
- Familia base: **Plus Jakarta Sans** (cálida, moderna, buena con tildes, números tabulares para horarios).
- Tres "personalidades" que cambian títulos, radios y densidad: **Moderna** (uñas, estética), **Clásica** (barbería: títulos con más peso y tracking, radios más chicos) y **Serena** (salud: más aire, radios grandes, tonos suaves).

### Movimiento
- Resortes cortos (200–300 ms). Las salidas son más rápidas que las entradas.
- Transiciones entre pantallas con View Transitions; el horario elegido "viaja" hasta el pase.
- Momentos de festejo chicos: el sello de fidelidad y la confirmación del turno.
- Respeta "reducir movimiento" del sistema.

### Reglas de calidad (checklist de ui-ux-pro-max)
- Botones de 44×44 px como mínimo, contraste 4.5:1 y foco visible.
- Navegación inferior con 4 ítems como máximo, y "atrás" siempre predecible.
- Respeta los bordes del celular (notch, barra inferior).
- Sin saltos de diseño al cargar (lugar reservado para imágenes y horarios).
- Textos en español rioplatense, precios en pesos con formato argentino y horarios en la zona de Argentina.

## 6. Lo que necesito de vos para arrancar

1. **Cuentas**: Supabase y Netlify (¿usamos la de netlify donde está `quetul-app-sawatek`?).
2. **Nombre y dominio del producto** para los links de demo (ej. `turnos.sawatek.com.ar/quetul`).
3. OK para actualizar pnpm a la 12 en tu máquina.

## 7. Orden de construcción propuesto

1. Base del proyecto + sistema de tokens + componentes base.
2. Lógica de horarios (con tests) + datos de ejemplo relativos a hoy.
3. App del cliente.
4. Panel del dueño.
5. Modo escenario + reloj simulado.
6. Alta en `/admin` + Supabase + manifest por negocio + QR.
7. Pulido, accesibilidad y prueba en iPhone y Android reales.
