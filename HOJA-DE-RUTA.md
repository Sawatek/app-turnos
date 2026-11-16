# Hoja de ruta: de demo a producto

Qué falta para que SawaTek Turnos deje de ser una demo de venta y la usen negocios reales todos los días.
Última actualización: 17/11/2026.

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
- [ ] Crear los usuarios de SawaTek en Supabase (*Authentication → Users*, con "Auto Confirm User") y cargarlos en `admins`.
- [ ] Que el compañero acepte la invitación a la organización de Supabase y tenga acceso al repo.
- [ ] Probar la demo completa en un **iPhone** y un **Android** reales (sobre todo "Agregar a inicio" en iPhone).
- [ ] Revisar en Supabase → *Integrations → GitHub* que las migraciones se apliquen solas (*Working directory* `.`, *Deploy to production* activado).

---

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

### Fase 2: Panel del dueño real (~2 semanas)
- [ ] Configurar el negocio: servicios, precios, staff, horarios, francos, seña, política de cancelación (ej.: hasta 24 h antes).
- [ ] Agenda real; cargar turnos a mano (teléfono / mostrador); bloquear horarios.
- [ ] Clientes e historial; recordatorios enviados; métricas reales.
- [ ] Invitar a sus profesionales.

**Listo cuando:** un dueño configura su negocio de cero sin ayuda y maneja una semana de agenda.

### Fase 3: Cliente real (1–2 semanas)
- [ ] Login real con el celular (ver decisión 1).
- [ ] Reservar contra la base; ver, cancelar y reprogramar respetando las reglas del negocio.
- [ ] Fidelidad real (sellos al marcar "vino").

**Listo cuando:** un cliente real saca, cambia y cancela un turno, y el dueño lo ve al instante.

### Fase 4: WhatsApp y recordatorios (~2 semanas + espera de Meta)
- [ ] Verificar la empresa en Meta y aprobar las plantillas de mensajes (puede tardar días o semanas: **arrancar el trámite temprano**).
- [ ] Recordatorios automáticos a las 24 h y 2 h desde el servidor (aunque nadie tenga la app abierta).
- [ ] Botón **"Confirmo"** del WhatsApp que actualiza el turno solo.
- [ ] Notificaciones push reales.
- [ ] Mails con servicio propio (Resend) y dominio verificado (`@sawatek.com.ar`).

**Listo cuando:** un turno sacado hoy para mañana recibe el recordatorio y se confirma desde WhatsApp sin intervención.

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
| 1 | **Cómo entra el cliente** | WhatsApp (costo por mensaje, requiere aprobación de Meta) · SMS (costo por mensaje) · Google o mail (gratis, más fricción) | Arrancar con uno barato y sumar WhatsApp en la fase 4 |
| 2 | **Desde qué número salen los WhatsApp** | Un número de SawaTek que manda en nombre de cada negocio · El número de cada negocio | Número de SawaTek para empezar |
| 3 | **Rol de profesional desde el inicio** | Sí · Más adelante | Sí, en la fase 1 (sumarlo después obliga a rehacer permisos) |
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
