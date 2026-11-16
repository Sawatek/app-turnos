-- =====================================================================================
-- Base común de las fases 2 a 4.
--   · invitaciones: el dueño suma profesionales (y SawaTek suma dueños) por mail.
--   · mensajes: cola única de todo lo que sale hacia afuera (código de ingreso, confirmaciones,
--     recordatorios, avisos). La procesa la fase 4 (WhatsApp / SMS / mail / push).
--   · hook de Auth: el código para entrar con el celular va a esa cola (no a un proveedor de SMS).
--   · mis_negocios(): a qué negocios puede entrar el usuario logueado y con qué rol.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Invitaciones
-- -------------------------------------------------------------------------------------
create table public.invitaciones (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.negocios (id) on delete cascade,
  email          text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  rol            text not null check (rol in ('dueno', 'profesional')),
  -- Para invitar a un profesional que ya está cargado (se le vincula el usuario al aceptar).
  profesional_id uuid,
  creado_por     uuid default auth.uid() references auth.users (id) on delete set null,
  creado         timestamptz not null default now(),
  aceptada       timestamptz,
  foreign key (negocio_id, profesional_id) references public.profesionales (negocio_id, id) on delete cascade,
  unique (negocio_id, email)
);

alter table public.invitaciones enable row level security;
-- El dueño ve e invita profesionales de su negocio; SawaTek invita dueños.
create policy "Ver invitaciones" on public.invitaciones for select to authenticated
  using ((select public.es_dueno(negocio_id)));
create policy "Crear invitaciones" on public.invitaciones for insert to authenticated
  with check ((select public.es_superadmin()) or (rol = 'profesional' and (select public.es_dueno(negocio_id))));
create policy "Borrar invitaciones" on public.invitaciones for delete to authenticated
  using ((select public.es_superadmin()) or (rol = 'profesional' and (select public.es_dueno(negocio_id))));

-- Al iniciar sesión, la app llama a esta función: convierte las invitaciones pendientes del mail
-- (confirmado) del usuario en membresías. Devuelve cuántas aceptó.
create or replace function public.aceptar_invitaciones()
returns int
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv record;
  v_n int := 0;
begin
  select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then
    return 0;
  end if;
  perform set_config('sawatek.interno', 'si', true);
  for v_inv in select * from public.invitaciones where email = v_email and aceptada is null loop
    insert into public.miembros (negocio_id, user_id, rol) values (v_inv.negocio_id, v_uid, v_inv.rol)
      on conflict (negocio_id, user_id) do nothing;
    if v_inv.profesional_id is not null then
      update public.profesionales set user_id = v_uid where id = v_inv.profesional_id and user_id is null;
    end if;
    update public.invitaciones set aceptada = now() where id = v_inv.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Mis negocios (para el panel: a dónde puede entrar el usuario logueado)
-- -------------------------------------------------------------------------------------
create or replace function public.mis_negocios()
returns table (id uuid, slug text, nombre text, rol text, es_demo boolean, estado text)
language sql stable security definer set search_path = ''
as $$
  select n.id, n.slug, n.config ->> 'nombre', m.rol, n.es_demo, n.estado
  from public.miembros m join public.negocios n on n.id = m.negocio_id
  where m.user_id = auth.uid()
  union
  select n.id, n.slug, n.config ->> 'nombre', 'superadmin', n.es_demo, n.estado
  from public.negocios n
  where public.es_superadmin() and not n.es_demo
  order by 3;
$$;

-- -------------------------------------------------------------------------------------
-- Cola de mensajes salientes
-- -------------------------------------------------------------------------------------
create table public.mensajes (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null check (tipo in ('codigo', 'confirmacion', 'recordatorio24', 'recordatorio2', 'cancelacion', 'recuperar', 'aviso')),
  canal        text not null default 'whatsapp' check (canal in ('whatsapp', 'sms', 'email', 'push')),
  -- Teléfono en formato internacional sin "+" (5491123456789), mail, o id de suscripción push.
  destino      text not null check (length(destino) between 3 and 320),
  negocio_id   uuid references public.negocios (id) on delete cascade,
  turno_id     uuid references public.turnos (id) on delete cascade,
  cliente_id   uuid references public.clientes (id) on delete set null,
  -- Datos para armar el mensaje (plantilla y parámetros). Para 'codigo': {"codigo": "123456"}.
  contenido    jsonb not null default '{}'::jsonb,
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'enviando', 'enviado', 'error', 'cancelado')),
  intentos     int not null default 0,
  programado   timestamptz not null default now(),
  enviado      timestamptz,
  error        text,
  -- Id que devuelve el proveedor (ej.: wamid de WhatsApp), para cruzar respuestas y estados.
  proveedor_id text,
  creado       timestamptz not null default now()
);
create index mensajes_pendientes_idx on public.mensajes (programado) where estado = 'pendiente';
create index mensajes_turno_idx on public.mensajes (turno_id);
-- Un mismo recordatorio no se programa dos veces para el mismo turno.
create unique index mensajes_recordatorio_unico on public.mensajes (turno_id, tipo)
  where tipo in ('recordatorio24', 'recordatorio2') and estado <> 'cancelado';

alter table public.mensajes enable row level security;
-- El staff ve lo que se le mandó a SUS clientes (nunca los códigos de ingreso). Nadie más los ve ni escribe:
-- los procesa el servidor con la clave secreta.
create policy "Staff ve mensajes de su negocio" on public.mensajes for select to authenticated
  using (tipo <> 'codigo' and negocio_id is not null and (select public.es_staff(negocio_id)));

-- -------------------------------------------------------------------------------------
-- Hook "Send SMS" de Supabase Auth: el código de ingreso va a la cola.
-- Supabase llama a esta función con {"user": {...}, "sms": {"otp": "123456"}}.
-- -------------------------------------------------------------------------------------
create or replace function public.hook_enviar_codigo(event jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_tel text := regexp_replace(coalesce(event -> 'user' ->> 'phone', ''), '\D', '', 'g');
  v_otp text := event -> 'sms' ->> 'otp';
begin
  if v_tel = '' or v_otp is null then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400, 'message', 'Falta el teléfono o el código'));
  end if;
  insert into public.mensajes (tipo, canal, destino, contenido)
  values ('codigo', 'whatsapp', v_tel, jsonb_build_object('codigo', v_otp));
  return '{}'::jsonb;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Permisos
-- -------------------------------------------------------------------------------------
revoke all on function public.aceptar_invitaciones(), public.mis_negocios(), public.hook_enviar_codigo(jsonb) from public;
grant execute on function public.aceptar_invitaciones(), public.mis_negocios() to authenticated;
-- Solo Supabase Auth puede llamar al hook.
revoke execute on function public.hook_enviar_codigo(jsonb) from anon, authenticated;
grant execute on function public.hook_enviar_codigo(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant insert on public.mensajes to supabase_auth_admin;

grant select, insert, delete on public.invitaciones to authenticated;
grant select on public.mensajes to authenticated;
revoke all on public.invitaciones, public.mensajes from anon;
revoke truncate, references, trigger on public.invitaciones, public.mensajes from authenticated;
