-- =====================================================================================
-- Fase 4: mensajes salientes (WhatsApp, recordatorios automáticos, confirmación desde WhatsApp y push).
--
--   · La base ENCOLA sola (triggers en turnos): confirmación al reservar, recordatorios de 24 h y 2 h,
--     cancelación, y reprogramación si el dueño mueve el turno. Los negocios demo no generan nada.
--   · El despachador (Edge Function `enviar-mensajes`) toma la cola con tomar_mensajes() y anota el
--     resultado con registrar_envio(). Lo dispara pg_cron cada minuto (URL y secreto en Supabase Vault).
--   · El webhook de WhatsApp (Edge Function `whatsapp-webhook`) confirma turnos con
--     confirmar_por_whatsapp() y pide el cambio de horario con pedir_cambio_por_whatsapp().
--   · push_suscripciones: el celular del cliente se suscribe a las notificaciones de un negocio;
--     el recordatorio de 2 h también sale por push.
--
-- Re-ejecutable (create or replace / if not exists / drop ... if exists).
-- Ver docs/WHATSAPP.md para la puesta en marcha.
-- =====================================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- -------------------------------------------------------------------------------------
-- 1. Ajustes a la cola de mensajes (creada en fase2a)
-- -------------------------------------------------------------------------------------
alter table public.mensajes
  add column if not exists tomado    timestamptz, -- cuándo lo tomó el despachador (para rescatar los trabados)
  add column if not exists entregado timestamptz, -- WhatsApp avisó que llegó al celular
  add column if not exists leido     timestamptz; -- WhatsApp avisó que lo leyó

comment on column public.mensajes.tomado is 'Cuándo lo tomó el despachador. Si queda "enviando" más de 10 min, se vuelve a tomar.';
comment on column public.mensajes.entregado is 'Estado de entrega informado por WhatsApp (delivered).';
comment on column public.mensajes.leido is 'Estado de lectura informado por WhatsApp (read).';

-- El recordatorio de 2 h sale por WhatsApp Y por push: el "no duplicar" ahora es por canal.
drop index if exists public.mensajes_recordatorio_unico;
create unique index mensajes_recordatorio_unico on public.mensajes (turno_id, tipo, canal)
  where tipo in ('recordatorio24', 'recordatorio2') and estado <> 'cancelado';
create index if not exists mensajes_proveedor_idx on public.mensajes (proveedor_id) where proveedor_id is not null;
create index if not exists mensajes_enviando_idx on public.mensajes (tomado) where estado = 'enviando';

-- -------------------------------------------------------------------------------------
-- 2. Suscripciones push (un celular/navegador suscripto a las notificaciones de un negocio)
-- -------------------------------------------------------------------------------------
create table if not exists public.push_suscripciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  negocio_id  uuid not null references public.negocios (id) on delete cascade,
  endpoint    text not null check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh      text not null check (length(p256dh) between 20 and 200),
  auth        text not null check (length(auth) between 8 and 100),
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  unique (negocio_id, endpoint)
);
create index if not exists push_suscripciones_user_idx on public.push_suscripciones (user_id, negocio_id);

alter table public.push_suscripciones enable row level security;
drop policy if exists "Cada uno ve sus suscripciones" on public.push_suscripciones;
drop policy if exists "Cada uno guarda sus suscripciones" on public.push_suscripciones;
drop policy if exists "Cada uno cambia sus suscripciones" on public.push_suscripciones;
drop policy if exists "Cada uno borra sus suscripciones" on public.push_suscripciones;
create policy "Cada uno ve sus suscripciones" on public.push_suscripciones for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Cada uno guarda sus suscripciones" on public.push_suscripciones for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Cada uno cambia sus suscripciones" on public.push_suscripciones for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Cada uno borra sus suscripciones" on public.push_suscripciones for delete to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists push_suscripciones_actualizado on public.push_suscripciones;
create trigger push_suscripciones_actualizado before update on public.push_suscripciones
  for each row execute function public.tocar_actualizado();

-- -------------------------------------------------------------------------------------
-- 3. Ayudas: teléfono, datos y texto de cada mensaje
-- -------------------------------------------------------------------------------------

-- Teléfono a solo dígitos, formato internacional sin "+" (Argentina: 549 + área + número, sin 0 ni 15).
-- Devuelve null si no se puede interpretar con confianza (ej.: un número local sin código de área).
create or replace function public.normalizar_telefono(p text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v_intl boolean := coalesce(p, '') ~ '^\s*(\+|00)';
  d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if v_intl then
    d := regexp_replace(d, '^00', '');
  else
    d := regexp_replace(d, '^0+', ''); -- el 0 del código de área
  end if;

  if d ~ '^54' and (v_intl or length(d) in (12, 13)) then
    d := substr(d, 3);
    if d ~ '^9' and length(d) = 11 then
      d := substr(d, 2);
    end if;
    d := regexp_replace(d, '^0', '');
  elsif v_intl then
    -- otro país: se deja como vino
    return case when length(d) between 8 and 15 then d end;
  end if;

  -- Acá queda un número argentino: área + (15 opcional) + número.
  if length(d) = 12 then
    -- Se saca el 15 que va después del código de área (2, 3 o 4 dígitos; el 11 es el único de 2).
    if d ~ '^11' and substr(d, 3, 2) = '15' then
      d := '11' || substr(d, 5);
    elsif substr(d, 4, 2) = '15' then
      d := substr(d, 1, 3) || substr(d, 6);
    elsif substr(d, 5, 2) = '15' then
      d := substr(d, 1, 4) || substr(d, 7);
    end if;
  end if;
  if length(d) <> 10 then
    return null;
  end if;
  return '549' || d;
end;
$$;

-- Celular de un cliente: el de su usuario (verificado al entrar con el celular) o el de la ficha.
create or replace function public.telefono_cliente(p_cliente uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.normalizar_telefono(u.phone), public.normalizar_telefono(c.telefono))
  from public.clientes c
  left join auth.users u on u.id = c.user_id
  where c.id = p_cliente;
$$;

-- ¿Este teléfono es el del cliente del turno? (cualquiera de los dos que tenga cargados)
create or replace function public.telefono_es_del_turno(p_turno uuid, p_telefono text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    public.normalizar_telefono(p_telefono) in (public.normalizar_telefono(u.phone), public.normalizar_telefono(c.telefono)),
    false)
  from public.turnos t
  join public.clientes c on c.id = t.cliente_id
  left join auth.users u on u.id = c.user_id
  where t.id = p_turno;
$$;

-- Reemplaza {nombre} {hora} {dia} {servicio} {profesional} {negocio} {direccion}.
-- {link} queda tal cual: lo completa el despachador con la URL de la app (variable APP_URL).
create or replace function public.sustituir_plantilla(p_plantilla text, p_datos jsonb)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v text := coalesce(p_plantilla, '');
  k text;
begin
  foreach k in array array['nombre', 'hora', 'dia', 'servicio', 'profesional', 'negocio', 'direccion'] loop
    v := replace(v, '{' || k || '}', coalesce(p_datos ->> k, ''));
  end loop;
  return v;
end;
$$;

-- Datos de un turno para las plantillas (día y hora en la zona del negocio).
create or replace function public.datos_turno(p_turno uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'turno_id', t.id,
    'slug', n.slug,
    'inicio', t.inicio,
    'nombre', split_part(trim(c.nombre), ' ', 1),
    'negocio', coalesce(nullif(trim(n.config ->> 'nombre'), ''), n.slug),
    'direccion', coalesce(trim(n.config ->> 'direccion'), ''),
    'servicio', s.nombre,
    'profesional', p.nombre,
    'dia', (array['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'])
             [extract(dow from t.inicio at time zone n.zona_horaria)::int + 1]
           || ' ' || to_char(t.inicio at time zone n.zona_horaria, 'DD/MM'),
    'hora', to_char(t.inicio at time zone n.zona_horaria, 'HH24:MI')
  )
  from public.turnos t
  join public.negocios n on n.id = t.negocio_id
  join public.clientes c on c.id = t.cliente_id
  join public.servicios s on s.id = t.servicio_id
  join public.profesionales p on p.id = t.profesional_id
  where t.id = p_turno;
$$;

-- Contenido de un mensaje de turno: los datos + el texto ya armado (para push, consola y el panel).
-- Los recordatorios usan los textos que el negocio configuró (config.mensajes); si están vacíos, uno por defecto.
create or replace function public.contenido_turno(p_turno uuid, p_tipo text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_datos jsonb := public.datos_turno(p_turno);
  v_config jsonb;
  v_plantilla text;
begin
  if v_datos is null then
    return null;
  end if;
  select n.config into v_config from public.negocios n join public.turnos t on t.negocio_id = n.id where t.id = p_turno;
  v_plantilla := case p_tipo
    when 'confirmacion' then
      'Hola {nombre}! Tu turno en {negocio} quedó reservado: {servicio} con {profesional}, el {dia} a las {hora}. ¿Nos confirmás que venís?'
    when 'recordatorio24' then coalesce(nullif(trim(v_config -> 'mensajes' ->> 'recordatorio24'), ''),
      'Hola {nombre}! Mañana a las {hora} tenés turno de {servicio} con {profesional} en {negocio}. ¿Confirmás?')
    when 'recordatorio2' then coalesce(nullif(trim(v_config -> 'mensajes' ->> 'recordatorio2'), ''),
      'En 2 horas te esperamos en {negocio} ({hora}, {profesional}). {direccion}.')
    when 'cancelacion' then
      'Hola {nombre}, tu turno de {servicio} del {dia} a las {hora} en {negocio} quedó cancelado. Si querés, sacá otro desde la app: {link}'
    else ''
  end;
  return v_datos || jsonb_build_object('texto', public.sustituir_plantilla(v_plantilla, v_datos));
end;
$$;

-- -------------------------------------------------------------------------------------
-- 4. Encolado
-- -------------------------------------------------------------------------------------

-- Un mensaje de turno por WhatsApp al celular del cliente (si tiene). No hace nada en negocios demo.
create or replace function public.encolar_mensaje_turno(p_turno uuid, p_tipo text, p_programado timestamptz default now())
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_neg uuid;
  v_cli uuid;
  v_tel text;
begin
  select t.negocio_id, t.cliente_id into v_neg, v_cli
  from public.turnos t join public.negocios n on n.id = t.negocio_id
  where t.id = p_turno and not n.es_demo;
  if not found then
    return;
  end if;
  v_tel := public.telefono_cliente(v_cli);
  if v_tel is null then
    return;
  end if;
  insert into public.mensajes (tipo, canal, destino, negocio_id, turno_id, cliente_id, contenido, programado)
  values (p_tipo, 'whatsapp', v_tel, v_neg, p_turno, v_cli, public.contenido_turno(p_turno, p_tipo), p_programado)
  on conflict (turno_id, tipo, canal) where tipo in ('recordatorio24', 'recordatorio2') and estado <> 'cancelado'
  do nothing;
end;
$$;

-- Recordatorio de 2 h por push, si el cliente tiene el celular suscripto a ESE negocio.
-- destino = user_id del cliente: el despachador lo manda a todas sus suscripciones en el negocio.
create or replace function public.programar_push_turno(p_turno uuid)
returns void
language sql volatile security definer set search_path = ''
as $$
  insert into public.mensajes (tipo, canal, destino, negocio_id, turno_id, cliente_id, contenido, programado)
  select 'recordatorio2', 'push', c.user_id::text, t.negocio_id, t.id, c.id,
         public.contenido_turno(t.id, 'recordatorio2'), t.inicio - interval '2 hours'
  from public.turnos t
  join public.clientes c on c.id = t.cliente_id
  join public.negocios n on n.id = t.negocio_id
  where t.id = p_turno and not n.es_demo
    and t.estado in ('pendiente', 'confirmado')
    and t.inicio - interval '2 hours' > now()
    and exists (select 1 from public.push_suscripciones s where s.user_id = c.user_id and s.negocio_id = t.negocio_id)
  on conflict (turno_id, tipo, canal) where tipo in ('recordatorio24', 'recordatorio2') and estado <> 'cancelado'
  do nothing;
$$;

-- Recordatorios de 24 h y 2 h (solo los que todavía quedan en el futuro). No duplica los que ya existen.
create or replace function public.programar_recordatorios(p_turno uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_inicio timestamptz;
begin
  select inicio into v_inicio from public.turnos where id = p_turno and estado in ('pendiente', 'confirmado');
  if v_inicio is null then
    return;
  end if;
  if v_inicio - interval '24 hours' > now() then
    perform public.encolar_mensaje_turno(p_turno, 'recordatorio24', v_inicio - interval '24 hours');
  end if;
  if v_inicio - interval '2 hours' > now() then
    perform public.encolar_mensaje_turno(p_turno, 'recordatorio2', v_inicio - interval '2 hours');
  end if;
  perform public.programar_push_turno(p_turno);
end;
$$;

-- Aviso libre por WhatsApp (respuesta dentro de la ventana de 24 h que abre el cliente al tocar un botón).
create or replace function public.encolar_aviso(p_turno uuid, p_telefono text, p_motivo text, p_plantilla text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_datos jsonb := public.datos_turno(p_turno);
begin
  insert into public.mensajes (tipo, canal, destino, negocio_id, turno_id, cliente_id, contenido)
  select 'aviso', 'whatsapp', public.normalizar_telefono(p_telefono), t.negocio_id, t.id, t.cliente_id,
         v_datos || jsonb_build_object('motivo', p_motivo, 'texto', public.sustituir_plantilla(p_plantilla, v_datos))
  from public.turnos t where t.id = p_turno;
end;
$$;

-- Trigger de turnos: qué se encola al crear, cancelar o mover un turno.
-- Si algo falla acá, NO se frena la reserva: se registra una advertencia y el turno sigue.
create or replace function public.turnos_encolar_mensajes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.negocios where id = new.negocio_id and es_demo) then
    return null;
  end if;

  begin
    if tg_op = 'INSERT' then
      -- Los turnos cargados en el pasado (historial) no generan mensajes.
      if new.estado in ('pendiente', 'confirmado') and new.inicio > now() then
        perform public.encolar_mensaje_turno(new.id, 'confirmacion');
        perform public.programar_recordatorios(new.id);
      end if;
      return null;
    end if;

    -- Se canceló o ya pasó (asistió / faltó): fuera los pendientes. Si se canceló, se avisa.
    if new.estado in ('cancelado', 'asistio', 'falto') and old.estado in ('pendiente', 'confirmado') then
      update public.mensajes set estado = 'cancelado', error = 'turno ' || new.estado
      where turno_id = new.id and estado = 'pendiente' and tipo in ('confirmacion', 'recordatorio24', 'recordatorio2');
      if new.estado = 'cancelado' and new.inicio > now() then
        perform public.encolar_mensaje_turno(new.id, 'cancelacion');
      end if;
      return null;
    end if;

    -- Se reactivó un turno cancelado: vuelven los recordatorios.
    if old.estado = 'cancelado' and new.estado in ('pendiente', 'confirmado') then
      perform public.programar_recordatorios(new.id);
      return null;
    end if;

    -- Se movió el horario (reprogramación del dueño): se reprograman los recordatorios pendientes.
    if new.estado in ('pendiente', 'confirmado') and new.inicio is distinct from old.inicio then
      -- Los que con el horario nuevo quedarían en el pasado, se cancelan (no tiene sentido mandarlos tarde).
      update public.mensajes m set estado = 'cancelado', error = 'turno reprogramado'
      where m.turno_id = new.id and m.estado = 'pendiente' and m.tipo in ('recordatorio24', 'recordatorio2')
        and new.inicio - case m.tipo when 'recordatorio24' then interval '24 hours' else interval '2 hours' end <= now();
      update public.mensajes m
      set programado = new.inicio - case m.tipo when 'recordatorio24' then interval '24 hours' else interval '2 hours' end,
          contenido = coalesce(public.contenido_turno(new.id, m.tipo), m.contenido)
      where m.turno_id = new.id and m.estado = 'pendiente' and m.tipo in ('recordatorio24', 'recordatorio2');
      -- Una confirmación que todavía no salió, sale con el horario nuevo.
      update public.mensajes m set contenido = coalesce(public.contenido_turno(new.id, m.tipo), m.contenido)
      where m.turno_id = new.id and m.estado = 'pendiente' and m.tipo = 'confirmacion';
      -- Y si el horario nuevo da lugar a recordatorios que antes no había (ej.: se pasó para la semana que viene).
      perform public.programar_recordatorios(new.id);
    end if;
  exception when others then
    raise warning 'turnos_encolar_mensajes (turno %): %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists turnos_mensajes on public.turnos;
create trigger turnos_mensajes after insert on public.turnos
  for each row execute function public.turnos_encolar_mensajes();
drop trigger if exists turnos_mensajes_cambios on public.turnos;
create trigger turnos_mensajes_cambios after update of inicio, estado on public.turnos
  for each row when (old.inicio is distinct from new.inicio or old.estado is distinct from new.estado)
  execute function public.turnos_encolar_mensajes();

-- Al suscribirse a un negocio, los turnos que ya tenía también reciben el recordatorio por push.
create or replace function public.push_programar_turnos()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_turno uuid;
begin
  for v_turno in
    select t.id from public.turnos t join public.clientes c on c.id = t.cliente_id
    where c.user_id = new.user_id and t.negocio_id = new.negocio_id
      and t.estado in ('pendiente', 'confirmado') and t.inicio > now()
  loop
    perform public.programar_push_turno(v_turno);
  end loop;
  return null;
exception when others then
  raise warning 'push_programar_turnos: %', sqlerrm;
  return null;
end;
$$;
drop trigger if exists push_suscripciones_turnos on public.push_suscripciones;
create trigger push_suscripciones_turnos after insert or update of user_id on public.push_suscripciones
  for each row execute function public.push_programar_turnos();

-- La app guarda la suscripción del celular con esta función (si el celular ya estaba suscripto con
-- otro usuario —se cambió la sesión—, pasa a ser del usuario actual). Devuelve el id.
create or replace function public.guardar_push(p_negocio uuid, p_endpoint text, p_p256dh text, p_auth text)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  if not exists (select 1 from public.negocios where id = p_negocio and not es_demo and estado <> 'suspendido') then
    raise exception 'negocio_no_disponible' using errcode = 'P0001';
  end if;
  insert into public.push_suscripciones (user_id, negocio_id, endpoint, p256dh, auth)
  values (v_uid, p_negocio, p_endpoint, p_p256dh, p_auth)
  on conflict (negocio_id, endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
  returning id into v_id;
  return v_id;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5. Despachador (solo la clave secreta / service_role)
-- -------------------------------------------------------------------------------------

-- Toma hasta p_limite mensajes vencidos y los marca 'enviando'. Con "skip locked", dos despachadores
-- a la vez nunca toman el mismo. También rescata los que quedaron 'enviando' más de 10 minutos.
-- p_negocio (opcional) limita a un negocio: lo usan los tests para no tocar mensajes ajenos.
drop function if exists public.tomar_mensajes(int);
create or replace function public.tomar_mensajes(p_limite int default 50, p_negocio uuid default null)
returns setof public.mensajes
language plpgsql volatile security definer set search_path = ''
as $$
begin
  -- Lo que ya no tiene sentido mandar.
  update public.mensajes m set estado = 'cancelado', error = 'vencido: el turno ya empezó'
  from public.turnos t
  where m.turno_id = t.id and m.estado = 'pendiente' and m.programado <= now()
    and m.tipo in ('confirmacion', 'recordatorio24', 'recordatorio2') and t.inicio <= now();
  update public.mensajes set estado = 'cancelado', error = 'vencido: el código ya expiró'
  where estado = 'pendiente' and tipo = 'codigo' and creado < now() - interval '15 minutes';

  return query
  update public.mensajes m
  set estado = 'enviando', intentos = m.intentos + 1, tomado = now()
  where m.id in (
    select x.id from public.mensajes x
    where ((x.estado = 'pendiente' and x.programado <= now())
           or (x.estado = 'enviando' and x.tomado < now() - interval '10 minutes'))
      and (p_negocio is null or x.negocio_id = p_negocio)
    order by x.programado
    limit greatest(1, least(coalesce(p_limite, 50), 500))
    for update skip locked
  )
  returning m.*;
end;
$$;

-- Resultado de un envío:
--   'enviado'    → listo (con el id del proveedor)
--   'reintentar' → vuelve a la cola con espera creciente (2, 4, 8, 16 min); al 5.º intento queda 'error'
--   'error'      → error definitivo (número inválido, plantilla inexistente...)
--   'cancelado'  → no corresponde mandarlo (ej.: push sin suscripciones)
create or replace function public.registrar_envio(p_id uuid, p_resultado text, p_proveedor_id text default null, p_error text default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if p_resultado not in ('enviado', 'reintentar', 'error', 'cancelado') then
    raise exception 'resultado_invalido' using errcode = '22023';
  end if;
  update public.mensajes m set
    estado = case
      when p_resultado = 'reintentar' then case when m.intentos >= 5 then 'error' else 'pendiente' end
      else p_resultado end,
    enviado = case when p_resultado = 'enviado' then now() else m.enviado end,
    proveedor_id = coalesce(p_proveedor_id, m.proveedor_id),
    error = case when p_resultado = 'enviado' then null else left(p_error, 500) end,
    programado = case
      when p_resultado = 'reintentar' and m.intentos < 5 then now() + make_interval(mins => power(2, m.intentos)::int)
      else m.programado end
  where m.id = p_id and m.estado = 'enviando';
end;
$$;

-- -------------------------------------------------------------------------------------
-- 6. Respuestas desde WhatsApp (solo la clave secreta / service_role: las llama el webhook)
-- -------------------------------------------------------------------------------------

-- Botón "Confirmo". Confirma SOLO si el teléfono es el del cliente del turno, y el turno está pendiente y es futuro.
-- Devuelve: 'confirmado' | 'ya_confirmado' | 'no_confirmable' | 'telefono_no_coincide' | 'no_encontrado'.
create or replace function public.confirmar_por_whatsapp(p_turno uuid, p_telefono text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_t public.turnos%rowtype;
begin
  select t.* into v_t from public.turnos t join public.negocios n on n.id = t.negocio_id
  where t.id = p_turno and not n.es_demo
  for update of t;
  if not found then
    return 'no_encontrado';
  end if;
  if not public.telefono_es_del_turno(p_turno, p_telefono) then
    return 'telefono_no_coincide';
  end if;
  if v_t.estado = 'confirmado' and v_t.inicio > now() then
    return 'ya_confirmado'; -- (WhatsApp a veces manda el mismo aviso dos veces: no se responde de nuevo)
  end if;
  if v_t.estado <> 'pendiente' or v_t.inicio <= now() then
    perform public.encolar_aviso(p_turno, p_telefono, 'no_confirmable',
      'Ese turno ya no se puede confirmar. Podés ver tus turnos o sacar uno nuevo en la app de {negocio}: {link}');
    return 'no_confirmable';
  end if;
  perform set_config('sawatek.interno', 'si', true);
  update public.turnos set estado = 'confirmado' where id = p_turno;
  perform public.encolar_aviso(p_turno, p_telefono, 'confirmado',
    '¡Gracias {nombre}! Tu turno del {dia} a las {hora} en {negocio} quedó confirmado. Te esperamos.');
  return 'confirmado';
end;
$$;

-- Botón "Cambiar horario": se le manda el link a la app del negocio para que elija otro.
-- Devuelve: 'aviso_encolado' | 'repetido' | 'telefono_no_coincide' | 'no_encontrado'.
create or replace function public.pedir_cambio_por_whatsapp(p_turno uuid, p_telefono text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.turnos t join public.negocios n on n.id = t.negocio_id where t.id = p_turno and not n.es_demo) then
    return 'no_encontrado';
  end if;
  if not public.telefono_es_del_turno(p_turno, p_telefono) then
    return 'telefono_no_coincide';
  end if;
  -- Si tocó el botón dos veces (o WhatsApp repitió el aviso), no se le manda el link de nuevo.
  if exists (select 1 from public.mensajes where turno_id = p_turno and tipo = 'aviso'
             and contenido ->> 'motivo' = 'cambio' and creado > now() - interval '5 minutes') then
    return 'repetido';
  end if;
  perform public.encolar_aviso(p_turno, p_telefono, 'cambio',
    'Para cambiar tu turno de {servicio} del {dia} a las {hora}, entrá a la app de {negocio} y elegí otro horario: {link}');
  return 'aviso_encolado';
end;
$$;

-- -------------------------------------------------------------------------------------
-- 7. Programación: pg_cron llama a la Edge Function cada minuto (con pg_net)
-- La URL y el secreto se leen de Supabase Vault (ver docs/WHATSAPP.md):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/enviar-mensajes', 'mensajes_url');
--   select vault.create_secret('<mismo valor que MENSAJES_SECRETO>', 'mensajes_secreto');
-- Si no están, no hace nada (no falla).
-- -------------------------------------------------------------------------------------
create or replace function public.disparar_envio_mensajes()
returns bigint
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_url text;
  v_secreto text;
begin
  -- Si no hay nada para mandar, ni se llama a la función (ahorra invocaciones).
  if not exists (
    select 1 from public.mensajes
    where (estado = 'pendiente' and programado <= now()) or (estado = 'enviando' and tomado < now() - interval '10 minutes')
  ) then
    return null;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'mensajes_url';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'mensajes_secreto';
  if coalesce(v_url, '') = '' or coalesce(v_secreto, '') = '' then
    raise notice 'enviar-mensajes: faltan los secretos mensajes_url / mensajes_secreto en Vault (ver docs/WHATSAPP.md)';
    return null;
  end if;
  return net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secreto),
    timeout_milliseconds := 55000
  );
end;
$$;

-- cron.schedule con el mismo nombre actualiza el trabajo existente (re-ejecutable).
select cron.schedule('enviar-mensajes', '* * * * *', 'select public.disparar_envio_mensajes()');

-- -------------------------------------------------------------------------------------
-- 8. Permisos
-- Ojo: en Supabase las funciones nuevas de "public" nacen ejecutables por anon y authenticated
-- (privilegios por defecto), así que además de PUBLIC se les revoca explícitamente.
-- -------------------------------------------------------------------------------------
revoke all on function
  public.normalizar_telefono(text), public.telefono_cliente(uuid), public.telefono_es_del_turno(uuid, text),
  public.sustituir_plantilla(text, jsonb), public.datos_turno(uuid), public.contenido_turno(uuid, text),
  public.encolar_mensaje_turno(uuid, text, timestamptz), public.programar_push_turno(uuid),
  public.programar_recordatorios(uuid), public.encolar_aviso(uuid, text, text, text),
  public.turnos_encolar_mensajes(), public.push_programar_turnos(), public.guardar_push(uuid, text, text, text),
  public.tomar_mensajes(int, uuid), public.registrar_envio(uuid, text, text, text),
  public.confirmar_por_whatsapp(uuid, text), public.pedir_cambio_por_whatsapp(uuid, text),
  public.disparar_envio_mensajes()
from public, anon, authenticated;

grant execute on function public.guardar_push(uuid, text, text, text) to authenticated;
grant execute on function public.tomar_mensajes(int, uuid), public.registrar_envio(uuid, text, text, text),
  public.confirmar_por_whatsapp(uuid, text), public.pedir_cambio_por_whatsapp(uuid, text) to service_role;

grant select, insert, update, delete on public.push_suscripciones to authenticated;
revoke all on public.push_suscripciones from anon;
revoke truncate, references, trigger on public.push_suscripciones from authenticated;
