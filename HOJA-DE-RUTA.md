# Hoja de ruta: de demo a producto

Qué falta para que SawaTek Turnos deje de ser una demo de venta y la usen negocios reales todos los días.
Última actualización: 18/11/2026.

---

## 1. Dónde estamos hoy

| Parte | Estado |
|---|---|
| App del cliente, panel del dueño, modo escenario | ✅ Funcionan como **demo**: los turnos y los clientes viven en el navegador de cada uno |
| Configuración de cada negocio (marca, servicios, staff, horarios) | ✅ Real: se guarda en Supabase (tabla `negocios`) |
| `/admin` para crear demos | ✅ Real: login con contraseña; solo entran los mails cargados en `admins` |
| Demo en vivo entre celular y compu | ✅ Real (Supabase Realtime), sin guardar nada |
| Instalación con la marca de cada negocio | ✅ Verificado en Android/Chrome · ⏳ falta probar en iPhone |
| Publicación | ✅ Vercel (plan Hobby, uso interno) + Supabase (plan gratis) |
| WhatsApp, recordatorios, señas, notificaciones | ❌ Simulados |
| Login de clientes | ❌ Simulado (el código no se manda de verdad) |

### Pendientes inmediatos (antes de seguir)
- [ ] Crear los usuarios de SawaTek en Supabase (*Authentication → Users*, con "Auto Confirm User") y cargar sus mails en `superadmins` (`insert into public.superadmins (email) values ('...');` en el SQL Editor). Hacerlo después de mergear a `main`, cuando la base ya tenga las migraciones.
- [ ] Que el compañero acepte la invitación a la organización de Supabase y tenga acceso al repo.
- [ ] Probar la demo completa en un **iPhone** y un **Android** reales (sobre todo "Agregar a inicio" en iPhone).
- [ ] Revisar en Supabase → *Integrations → GitHub* que las migraciones se apliquen solas (*Working directory* `.`, *Deploy to production* activado).

---

## Para probar mañana (estado al 17/11/2026, rama `dev`)

**Error intermitente a revisar**
- `tests/e2e/cliente-real/invitado.spec.ts` › "invitado con cuenta (ya tiene nombre): entra al confirmar y reserva sin que le pidan nada más" falló **1 vez** en la suite completa (263/264, el test tardó 13,2 s). Pasó solo (6/6) y en la corrida completa siguiente (264/264). No quedó el detalle del error. Sospechas: carga de la suite en paralelo (timeout) o el límite local de códigos de ingreso por hora/frecuencia (`[auth.sms] max_frequency`, ~30 códigos por hora). Para reproducir: `pnpm exec playwright test --repeat-each=5 tests/e2e/cliente-real/invitado.spec.ts` y la suite completa varias veces; si es el límite de códigos, que los tests reusen sesiones como hace el resto de `cliente-real`.

**Estado de las pruebas:** 264 de Playwright (permisos, panel, app del cliente, consola, sitio público y demo) + 8 de Edge Functions + 50 de Vitest, contra una Supabase local armada de cero con las 13 migraciones.

**Para probar a mano:** `pnpm db:local`, `pnpm local:semilla`, `pnpm dev:local` (ver README).

**Pendientes que dejaron los agentes**
- Sitio público (`src/pantallas/publico/marca.ts`): completar contacto (WhatsApp/mail), precios, nombre comercial, datos de la empresa (razón social, CUIT, domicilio, RNBD) y regenerar `public/compartir.jpg` si cambia el nombre. Los legales son **borradores para revisar con un abogado**.
- WhatsApp: hay 7 plantillas para aprobar en Meta (incluye la nueva `turno_liberado` de la lista de espera). Ver `docs/WHATSAPP.md`.
- Producción: desplegar también la función `admin-usuarios` (`supabase functions deploy admin-usuarios`), además de `enviar-mensajes` y `whatsapp-webhook`.
- No se avisa al cliente cuando el dueño le mueve el turno (falta una plantilla).

## 2. Roles

| Rol | Quién | Qué puede hacer |
|---|---|---|
| **Super admin** | SawaTek | Todo: crear negocios, invitar dueños, activar/suspender, planes, métricas globales, entrar al panel de cualquier negocio para soporte. |
| **Admin del negocio** | El dueño | Solo **su** negocio: servicios, precios, staff, horarios, agenda, clientes, promos, seña y su Mercado Pago. |
| **Profesional** | Empleados (Tulio, Nico…) | Su agenda; marcar "vino / no vino". No toca precios ni configuración. |
| **Cliente** | Quien saca turno | Sus turnos: reservar, confirmar, cancelar, reprogramar. |

**Reglas de diseño**
- El cliente tiene **una sola cuenta** (su celular), aunque sea cliente de varios negocios. Cada negocio ve **solo a sus propios clientes**.
- Los permisos los hace cumplir la **base de datos** (reglas RLS), no la pantalla: un error en la app no puede mostrar datos de otro negocio.
- La tabla `admins` actual pasa a ser la de **super admins**.

---

## 3. Fases

Estimaciones gruesas para una persona a tiempo completo. **Total: 2 a 3 meses** hasta poder vender.
Después de las fases 1 a 3 ya se puede probar con **un negocio amigo** (con recordatorios manuales).

### Fase 1: Roles y base de datos (1–2 semanas) ✅ hecha (rama `fase-1-roles`)
- [x] Tablas reales: negocios (con `es_demo`, `estado` y reglas de reserva), miembros, profesionales, servicios, qué servicio hace cada profesional, horarios semanales por profesional, bloqueos (francos/feriados), clientes, notas privadas de clientes y turnos. *Pagos y mensajes enviados van con las fases 4 y 5; promos y fidelidad siguen en la configuración del negocio.*
- [x] Demos y negocios reales separados: las demos siguen con su configuración en un solo bloque (no cambia nada para vender); los negocios reales usan las tablas.
- [x] Roles y reglas RLS para super admin, dueño, profesional y cliente.
- [x] **La base impide turnos superpuestos** (restricción de Postgres) y serializa las reservas de cada negocio: sin carreras ni trabas.
- [x] Horarios libres calculados en el servidor (`horarios_libres`), más `reservar_turno`, `confirmar_turno` y `cancelar_turno` con todas las validaciones (horario, descanso, bloqueos, anticipación, plazo de cancelación, máximo 3 turnos activos).
- [x] **108 tests con Playwright** contra una Supabase local: 96 de permisos rol por rol (incluye reservas simultáneas) y 12 de punta a punta en el navegador. Encontraron 6 huecos de seguridad en la primera versión, ya corregidos.
- [x] Demo en vivo por **salas**: dos presentaciones de la misma demo no se ven entre sí.

**Listo cuando:** un dueño de prueba solo puede ver y tocar su negocio, y dos reservas simultáneas al mismo horario dejan solo una. ✅ Verificado por los tests.

### Fase 2: Panel del dueño real ✅ hecha (rama `dev`)
- [x] Ingreso del equipo con mail y contraseña; las invitaciones se aceptan solas al entrar. El profesional ve solo su agenda y sus bloqueos.
- [x] Agenda en vivo por día y profesional, con resumen (turnos, confirmados, faltas del mes, facturación estimada); vino / no vino / confirmar / cancelar; carga manual de turnos con aviso si choca; bloqueos de horario.
- [x] Clientes con historial y notas privadas; alta manual.
- [x] Servicios, equipo (qué hace cada uno, invitaciones por mail), horarios semanales con franjas y francos, ajustes de reserva y contacto.
- [x] SawaTek da de alta negocios reales desde `/admin` con la plantilla del rubro e invita al dueño.

### Fase 3: Cliente real ✅ hecha (rama `dev`)
- [x] **Ingreso con el celular y un código** (Supabase Auth por teléfono; el código va a la cola de mensajes y sale por WhatsApp). Decisión 1 resuelta: WhatsApp, sin depender de un proveedor de SMS.
- [x] Reserva real (servicio → profesional → día con disponibilidad → hora), Mis turnos (confirmar, cancelar respetando el plazo, cambiar de horario), fidelidad real, perfil, instalación con la marca y notificaciones.

### Fase 4: WhatsApp y recordatorios ✅ código hecho (rama `dev`) · ⏳ falta activar con Meta
- [x] Cola única de mensajes: confirmación al reservar, recordatorios de 24 h y 2 h, aviso de cancelación; se reprograman o cancelan solos.
- [x] Despachador (Edge Function `enviar-mensajes`) cada minuto con pg_cron, reintentos y proveedor `consola` (desarrollo) o `whatsapp` (API oficial de Meta).
- [x] Webhook (`whatsapp-webhook`) con firma verificada: el botón **"Confirmo"** confirma el turno solo; "Cambiar horario" manda el link.
- [x] Notificaciones push (VAPID) para el recordatorio de 2 h.
- [ ] **Trámite con Meta** y aprobación de las 6 plantillas: paso a paso en [`docs/WHATSAPP.md`](docs/WHATSAPP.md).
- [ ] Mails con servicio propio (Resend) y dominio verificado: sigue pendiente.

**Para activar las fases 2 a 4 en producción** (además de mergear, que aplica las migraciones):
1. Supabase → *Authentication → Sign In / Providers → Phone*: activado.
2. Supabase → *Authentication → Hooks → Send SMS*: Postgres → `public.hook_enviar_codigo`.
3. Desplegar las funciones (`supabase functions deploy enviar-mensajes whatsapp-webhook`) y cargar sus secretos (`supabase secrets set …`, lista en `docs/WHATSAPP.md`). Mientras Meta no apruebe: `MENSAJES_PROVEEDOR=consola`.
4. Vault: `mensajes_url` y `mensajes_secreto` para el cron.
5. Vercel: `VITE_VAPID_PUBLIC_KEY` para las push.

**Tests:** 182 de Playwright (permisos de cada rol, reservas simultáneas, cola de mensajes, panel, app del cliente y demo) + 8 de las funciones del servidor + 50 de lógica. Todo contra una Supabase local.

### Fase 5: Señas con Mercado Pago (1–2 semanas)
- [ ] Cada negocio conecta **su** cuenta de Mercado Pago (la plata le llega directo).
- [ ] Mientras se paga, el horario queda reservado unos minutos; si no paga, se libera.
- [ ] Confirmación del pago por aviso automático de Mercado Pago (webhook); devoluciones y "seña a favor" al cancelar.

**Listo cuando:** se cobra una seña real en modo prueba de Mercado Pago y el turno queda confirmado solo.

### Fase 6: SawaTek y salida (1–2 semanas)
- [ ] Panel de super admin: alta de negocios, invitación al dueño, estado (prueba/activo/suspendido), plan, soporte.
- [ ] Cobro de la suscripción de SawaTek a cada negocio (débito automático con Mercado Pago).
- [ ] Legales: términos y condiciones, política de privacidad, ley de datos personales (25.326), consentimiento para WhatsApp.
- [ ] Operación: aviso de errores, pruebas automáticas en cada cambio, entorno de prueba separado del real, protección contra bots en la reserva, soporte.

**Listo cuando:** un negocio nuevo se da de alta, paga y opera sin que SawaTek toque nada a mano.

---

## 4. Decisiones pendientes

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| 1 | ~~**Cómo entra el cliente**~~ ✅ con el celular y un código por WhatsApp (fase 3) | WhatsApp (costo por mensaje, requiere aprobación de Meta) · SMS (costo por mensaje) · Google o mail (gratis, más fricción) | Arrancar con uno barato y sumar WhatsApp en la fase 4 |
| 2 | **Desde qué número salen los WhatsApp** | Un número de SawaTek que manda en nombre de cada negocio · El número de cada negocio | Número de SawaTek para empezar |
| 3 | ~~**Rol de profesional desde el inicio**~~ ✅ incluido | Sí · Más adelante | Sí, en la fase 1 (sumarlo después obliga a rehacer permisos) |
| 4 | **Dirección de cada negocio** | `app.sawatek.com.ar/quetul` · `quetul.sawatek.com.ar` · dominio propio del negocio | Ruta (`/quetul`) ahora; subdominio con Vercel Pro |
| 5 | **Precio y planes de SawaTek** | Mensual fijo · por profesional · por volumen de turnos | Definir antes de la fase 6 |

---

## 5. Servicios y costos a contratar antes de vender

Verificar precios y condiciones actuales al momento de contratar.

| Servicio | Para qué | Cuándo |
|---|---|---|
| **Vercel Pro** (equipo de SawaTek) | El plan Hobby es solo para uso no comercial y no permite sumar compañeros | Al empezar a vender |
| **Supabase Pro** | El plan gratis pausa proyectos inactivos y no da copias de seguridad automáticas | Antes del primer negocio real |
| **WhatsApp Business (API de Meta)** | Login y recordatorios | Fase 4 (trámite antes) |
| **Resend** (o similar) | Mails transaccionales sin el límite actual | Fase 4 |
| **Dominio** (`sawatek.com.ar` o subdominio) | Links prolijos y mails desde la marca | Fase 4–6 |
| **Mercado Pago** | Señas (cuenta de cada negocio) y suscripción de SawaTek | Fases 5 y 6 |

---

## 6. Riesgos a tener en cuenta

- **Aprobación de Meta:** puede demorar y rechazar plantillas; por eso el trámite va primero.
- **Datos personales:** se van a guardar nombres y celulares de clientes de terceros; los legales y la seguridad (RLS) no son opcionales.
- **Dependencia de un solo desarrollador:** documentar cada fase (como `DECISIONES.md` y esta hoja) y mantener tests.
- **Promesas de venta:** el "70% menos de faltas" de la calculadora es un supuesto; validarlo con el primer negocio real antes de usarlo como argumento.
