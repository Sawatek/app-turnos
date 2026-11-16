# Mensajes salientes: WhatsApp, recordatorios y notificaciones push

Fase 4. Cómo funciona y cómo se pone en marcha, paso a paso.

## Cómo funciona

```
turnos (reservar / cancelar / mover)
   │  triggers de la base (migración 20261118300000_fase4_mensajes.sql)
   ▼
public.mensajes  ← cola única (también recibe el código de ingreso del hook de Auth)
   │  pg_cron, cada minuto → pg_net → Edge Function enviar-mensajes (URL y secreto en Vault)
   ▼
enviar-mensajes ── tomar_mensajes() ──▶ WhatsApp Cloud API (plantillas) / Web Push / consola
   │               registrar_envio()  (enviado, o reintento 2-4-8-16 min; al 5.º intento, error)
   ▼
El cliente toca "Confirmo" o "Cambiar horario" en WhatsApp
   │  Meta → Edge Function whatsapp-webhook (firma X-Hub-Signature-256)
   ▼
confirmar_por_whatsapp() / pedir_cambio_por_whatsapp()  → respuesta enseguida ("¡Gracias!" o el link)
```

Qué se encola solo (los negocios **demo** no generan nada; un cliente sin celular, tampoco):

| Cuándo | Mensaje | Programado |
|---|---|---|
| Se crea un turno futuro | `confirmacion` | ya |
| | `recordatorio24` | inicio − 24 h (solo si todavía es futuro) |
| | `recordatorio2` | inicio − 2 h (solo si todavía es futuro); también por **push** si el cliente activó las notificaciones en ese negocio |
| Se cancela | se cancelan los pendientes + `cancelacion` | ya |
| Asistió / faltó | se cancelan los pendientes | — |
| El dueño lo mueve | los recordatorios pendientes se reprograman (los que quedarían en el pasado, se cancelan; si aparecen nuevos, se agregan) | |

El celular sale del usuario del cliente (el que usó para entrar) o, si no tiene, de la ficha (`clientes.telefono`, texto libre). Se normaliza a solo dígitos con `549` (ej.: `011 15 1234-5678` → `5491112345678`).

Cada mensaje guarda en `contenido` los datos de la plantilla (nombre, negocio, servicio, profesional, día y hora en la zona del negocio, dirección, turno_id, slug) y un `texto` ya armado (con los textos de recordatorio que configuró el negocio, si los tiene). Ese texto es el que se ve en el panel, en las notificaciones push y en el modo consola. Por WhatsApp salen las **plantillas aprobadas** (Meta no deja mandar texto libre a quien no te escribió en las últimas 24 h).

## 1. Meta: cuenta, número y app (una sola vez)

1. **Business Manager** (business.facebook.com): crear la cuenta de SawaTek y hacer la **verificación de la empresa** (Configuración del negocio → Centro de seguridad → Verificación). Sin verificación hay límites bajos de envío y no se puede tener nombre visible.
2. **Número**: conseguir un número que **no** esté usando WhatsApp ni WhatsApp Business en un celular (si lo está, hay que borrar esa cuenta primero). Puede ser un fijo: Meta verifica con llamada.
3. **App**: developers.facebook.com → Mis apps → Crear app → tipo **Empresa** → agregar el producto **WhatsApp**. Vincularla al Business Manager.
4. En WhatsApp → **Configuración de la API**: agregar el número real (nombre visible, categoría, verificación por SMS o llamada). Anotar el **Phone number ID** (`WHATSAPP_PHONE_NUMBER_ID`). Mientras la app está en desarrollo, solo se puede mandar a hasta 5 números de prueba verificados ahí mismo (si no, error 131030).
5. **Token permanente** (el temporal dura 24 h): Business Manager → Usuarios → **Usuarios del sistema** → Agregar (rol administrador) → Asignar activos: la app y la cuenta de WhatsApp (control total) → **Generar token** → elegir la app, vencimiento **Nunca**, permisos `whatsapp_business_messaging` y `whatsapp_business_management`. Ese es `WHATSAPP_TOKEN` (guardarlo solo en los secretos de Supabase).
6. **App secret**: en la app, Configuración de la app → Básica → Clave secreta de la app (`WHATSAPP_APP_SECRET`). Con esto se verifica que cada aviso del webhook venga de Meta.
7. **Webhook**: WhatsApp → Configuración → Webhook → Editar:
   - URL de devolución de llamada: `https://<ref-del-proyecto>.supabase.co/functions/v1/whatsapp-webhook`
   - Token de verificación: un texto largo al azar que inventamos (`WHATSAPP_VERIFY_TOKEN`). La función tiene que estar desplegada y con el secreto cargado **antes** de tocar "Verificar y guardar".
   - Campos del webhook: suscribirse a **messages** (trae las respuestas y los estados de entrega).
8. Publicar la app (modo **Activo**) cuando esté todo probado.
9. **Método de pago** en la cuenta de WhatsApp (Business Manager → WhatsApp → Configuración de pagos): las plantillas de utilidad y autenticación se cobran por mensaje entregado.

## 2. Plantillas a crear y hacer aprobar

WhatsApp Manager → Administrar plantillas → Crear plantilla. Idioma: **Español (ARG)** (`es_AR`). Los nombres son los que usan las funciones por defecto (se pueden cambiar con variables de entorno). El orden de las variables **importa**: es el que mandan las funciones. Meta pide un ejemplo para cada variable: usar los de abajo.

### `codigo_ingreso` — Autenticación
- Tipo de entrega del código: **Copiar código** (botón "Copiar código").
- El texto lo pone Meta: "*{{1}}* es tu código de verificación." Tildar "Agregar recomendación de seguridad" y "vence en 10 minutos".
- Ejemplo: `123456`.

### `turno_confirmacion` — Utilidad
> Hola {{1}}, tu turno en {{2}} quedó reservado: {{3}} con {{4}}, el {{5}} a las {{6}}. Dirección: {{7}}. ¿Nos confirmás que venís?

Botones de **respuesta rápida**: `Confirmo` (primero) y `Cambiar horario` (segundo).
Ejemplos: Ana · Barbería Don Juan · Corte · Nico · jueves 19/11 · 10:30 · Av. Corrientes 1234.

### `turno_recordatorio_24` — Utilidad
> Hola {{1}}, te recordamos tu turno de mañana en {{2}}: {{3}} con {{4}}, el {{5}} a las {{6}}. Dirección: {{7}}. ¿Confirmás que venís?

Botones de respuesta rápida: `Confirmo` y `Cambiar horario`. Mismos ejemplos.

### `turno_recordatorio_2` — Utilidad
> Hola {{1}}, en un rato tenés tu turno en {{2}}: {{3}} con {{4}}, hoy {{5}} a las {{6}}. Dirección: {{7}}. ¡Te esperamos!

Botones de respuesta rápida: `Confirmo` y `Cambiar horario`. Mismos ejemplos.

### `turno_cancelado` — Utilidad
> Hola {{1}}, tu turno de {{2}} del {{3}} a las {{4}} en {{5}} quedó cancelado. Si querés, podés sacar otro desde la app.

Sin botones. Ejemplos: Ana · Corte · jueves 19/11 · 10:30 · Barbería Don Juan.

### `cliente_recuperar` — Marketing (opcional, para "clientes para recuperar")
> Hola {{1}}, hace un tiempo que no te vemos por {{2}}. ¿Querés sacar un turno? Entrá a la app y elegí el horario que te quede mejor.

Ejemplos: Ana · Barbería Don Juan.

> Los botones mandan, sin que el cliente lo vea, `CONFIRMAR:<id del turno>` o `CAMBIAR:<id del turno>`. Al tocar uno, el cliente abre la ventana de 24 h: por eso la respuesta ("¡Gracias!", o el link para cambiar el horario) sale como texto libre (`aviso`), sin plantilla.

## 3. Variables de entorno de las funciones

```bash
supabase secrets set \
  MENSAJES_PROVEEDOR=whatsapp \
  MENSAJES_SECRETO="$(openssl rand -hex 32)" \
  APP_URL=https://turnos.sawatek.com \
  WHATSAPP_TOKEN=... \
  WHATSAPP_PHONE_NUMBER_ID=... \
  WHATSAPP_VERIFY_TOKEN=... \
  WHATSAPP_APP_SECRET=... \
  VAPID_PUBLIC_KEY=... \
  VAPID_PRIVATE_KEY=... \
  VAPID_SUBJECT=mailto:hola@sawatek.com
```

| Variable | Para qué | Por defecto |
|---|---|---|
| `MENSAJES_PROVEEDOR` | `consola` (registra en el log y marca enviado) o `whatsapp` | `consola` |
| `MENSAJES_SECRETO` | lo que manda pg_cron en `Authorization: Bearer …` (el mismo valor va en Vault) | — (obligatorio) |
| `MENSAJES_LOTE` | mensajes por vuelta | `50` |
| `APP_URL` | base de los links `{link}` (`APP_URL/<slug>`) | vacío |
| `WHATSAPP_TOKEN` | token permanente del usuario del sistema | — |
| `WHATSAPP_PHONE_NUMBER_ID` | id del número | — |
| `WHATSAPP_GRAPH_VERSION` | versión de la Graph API | `v26.0` |
| `WHATSAPP_IDIOMA` | idioma de las plantillas | `es_AR` |
| `WHATSAPP_PLANTILLA_CODIGO` / `_CONFIRMACION` / `_RECORDATORIO24` / `_RECORDATORIO2` / `_CANCELACION` / `_RECUPERAR` | nombres de plantilla | los de la sección 2 |
| `WHATSAPP_VERIFY_TOKEN` | token de verificación del webhook | — |
| `WHATSAPP_APP_SECRET` | verificar la firma de Meta | — (sin él, el webhook responde 500) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push | — / — / `mailto:hola@sawatek.com` |
| `PUSH_HOSTS` | servicios de push permitidos (lista separada por comas) | FCM, Mozilla, Apple, Windows |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase solo.

Despliegue (las dos **sin** verificación de JWT: Meta no manda JWT y el cron se autentica con `MENSAJES_SECRETO`):

```bash
supabase functions deploy enviar-mensajes --no-verify-jwt
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

## 4. Programación (pg_cron + Vault)

La migración ya deja el trabajo `enviar-mensajes` cada minuto. Llama a `public.disparar_envio_mensajes()`, que no hace nada si no hay mensajes vencidos, y si faltan los secretos solo deja un aviso (no falla). Cargar los secretos en el **SQL Editor** del proyecto:

```sql
select vault.create_secret('https://<ref-del-proyecto>.supabase.co/functions/v1/enviar-mensajes', 'mensajes_url');
select vault.create_secret('<el mismo valor que MENSAJES_SECRETO>', 'mensajes_secreto');

-- Para cambiar uno:
select vault.update_secret((select id from vault.secrets where name = 'mensajes_secreto'), '<nuevo valor>');

-- Ver que anda:
select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'enviar-mensajes') order by start_time desc limit 5;
select id, status_code, content, created from net._http_response order by created desc limit 5;
```

## 5. Notificaciones push (VAPID)

1. Generar el par de claves una sola vez (en cualquier compu con Node):
   ```bash
   pnpm dlx web-push generate-vapid-keys
   ```
2. La **pública** va en la app (Vercel → Environment Variables y `.env.local`): `VITE_VAPID_PUBLIC_KEY=...`. Sin ella, `pushSoportado()` da `false` y la app ofrece solo WhatsApp.
3. Las dos van en los secretos de las funciones (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, sección 3). Si se cambian, las suscripciones viejas dejan de servir: la app las rehace la próxima vez que el cliente active las notificaciones.

El cliente activa las notificaciones en su perfil (`activarPush(negocioId)` de `src/datos/real/push.ts`): se guarda la suscripción con `guardar_push()` en `push_suscripciones` (cada usuario ve solo las suyas). El service worker `public/push-sw.js` muestra la notificación y, al tocarla, abre la app del negocio. Las suscripciones que el servicio de push da por muertas (404/410) se borran solas.

## 6. Probar todo en local (proveedor `consola`)

1. Supabase local corriendo (`pnpm db:local`) con las migraciones aplicadas.
2. Copiar `supabase/functions/.env.example` a `supabase/functions/.env` (no se sube al repo) y dejar `MENSAJES_PROVEEDOR=consola`.
3. Servir las funciones:
   ```bash
   pnpm exec supabase functions serve --no-verify-jwt --env-file supabase/functions/.env
   ```
4. Reservar un turno desde la app (o desde los tests) y mandar la cola a mano:
   ```bash
   curl -X POST http://127.0.0.1:54321/functions/v1/enviar-mensajes \
     -H "Authorization: Bearer <MENSAJES_SECRETO>" -d '{}'
   ```
   En la terminal de `functions serve` aparece cada mensaje (`[consola] whatsapp → 549… · confirmacion: Hola Ana! …`). El código de ingreso por celular también aparece ahí: así se entra a la app en local.
5. (Opcional) que el cron local lo haga solo: cargar los secretos en la base local apuntando al gateway interno de Docker:
   ```sql
   select vault.create_secret('http://supabase_kong_sawatek-turnos:8000/functions/v1/enviar-mensajes', 'mensajes_url');
   select vault.create_secret('<MENSAJES_SECRETO>', 'mensajes_secreto');
   ```
   (Ojo: así el cron procesa TODA la cola local cada minuto; borrarlos con `delete from vault.secrets where name like 'mensajes_%';`.)
6. Tests:
   ```bash
   pnpm exec playwright test tests/permisos/mensajes   # reglas y encolado (base)
   pnpm exec playwright test -c tests/funciones        # Edge Functions (levanta functions serve solo)
   ```
7. Probar el webhook a mano: el cuerpo tiene que ir firmado con el app secret, igual que lo hace Meta:
   ```bash
   CUERPO='{"entry":[{"changes":[{"value":{"messages":[{"from":"5491112345678","id":"wamid.x","type":"button","button":{"payload":"CONFIRMAR:<id-del-turno>"}}]}}]}]}'
   FIRMA=$(printf '%s' "$CUERPO" | openssl dgst -sha256 -hmac "<WHATSAPP_APP_SECRET>" | sed 's/^.* //')
   curl -X POST http://127.0.0.1:54321/functions/v1/whatsapp-webhook \
     -H "X-Hub-Signature-256: sha256=$FIRMA" -H 'Content-Type: application/json' -d "$CUERPO"
   ```

## 7. Pasar a producción (resumen)

1. Aplicar la migración (`supabase db push`).
2. Cargar los secretos de las funciones (sección 3) y desplegarlas con `--no-verify-jwt`.
3. Cargar los dos secretos de Vault (sección 4).
4. Hook de Auth: Authentication → Hooks → **Send SMS** → función Postgres `public.hook_enviar_codigo` (fase 2a).
5. Webhook de Meta verificado y suscripto a `messages`; plantillas aprobadas.
6. `VITE_VAPID_PUBLIC_KEY` en Vercel.
7. Probar con un número propio: reservar → llega la confirmación → tocar "Confirmo" → el turno queda confirmado en el panel y llega el "¡Gracias!".

## Funciones de la base (referencia)

| Función | Quién | Qué hace |
|---|---|---|
| `tomar_mensajes(p_limite, p_negocio)` | solo service_role | toma los vencidos con `for update skip locked` y los marca `enviando` (rescata los trabados > 10 min, descarta recordatorios de turnos ya empezados y códigos de más de 15 min) |
| `registrar_envio(p_id, p_resultado, p_proveedor_id, p_error)` | solo service_role | `enviado` / `reintentar` / `error` / `cancelado` |
| `confirmar_por_whatsapp(p_turno, p_telefono)` | solo service_role | confirma si el teléfono es el del cliente y el turno está pendiente y es futuro → `confirmado`, `ya_confirmado`, `no_confirmable`, `telefono_no_coincide`, `no_encontrado` |
| `pedir_cambio_por_whatsapp(p_turno, p_telefono)` | solo service_role | encola el link para cambiar el horario → `aviso_encolado`, `repetido`, `telefono_no_coincide`, `no_encontrado` |
| `guardar_push(p_negocio, p_endpoint, p_p256dh, p_auth)` | usuarios logueados | guarda (o pasa al usuario actual) la suscripción push del celular |
| `disparar_envio_mensajes()` | pg_cron | llama a `enviar-mensajes` con pg_net, leyendo URL y secreto de Vault |
