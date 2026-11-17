-- =====================================================================================
-- Consola de plataforma de SawaTek (/admin): todo lo que solo puede hacer un super admin.
--
--   · negocios.plan: el plan contratado (texto). Solo lo cambia SawaTek.
--   · negocios_internos: notas internas de SawaTek sobre cada negocio. Van en una tabla aparte y
--     no en `negocios` porque esa tabla la puede leer cualquiera (la app pública del cliente).
--   · admin_resumen(): métricas de la plataforma del mes.
--   · admin_negocios(), admin_negocio(): lista y ficha de los negocios reales.
--   · admin_actualizar_negocio(): estado, plan, notas y marca básica (nombre, color, logo, claim).
--   · admin_cuentas(): cuentas con mail (staff y SawaTek) con sus negocios y roles.
--   · admin_sumar_miembro(): suma una cuenta a un negocio (la usa la Edge Function admin-usuarios).
--   · admin_mensajes(): registro de la cola de mensajes, SIN el código de los mensajes 'codigo'.
--
-- Todas: security definer, search_path vacío y chequeo de es_superadmin() adentro.
-- Se puede volver a correr (create or replace / if not exists).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Plan y notas internas
-- -------------------------------------------------------------------------------------
alter table public.negocios add column if not exists plan text;
alter table public.negocios drop constraint if exists negocios_plan_check;
alter table public.negocios add constraint negocios_plan_check check (plan is null or length(trim(plan)) between 1 and 40);
comment on column public.negocios.plan is 'Plan contratado con SawaTek (texto libre corto). Solo lo cambia un super admin.';

-- El dueño puede editar su negocio (config, reglas de reserva) pero no su plan.
create or replace function public.proteger_plan_negocio()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.es_usuario_app() and not public.es_superadmin() and new.plan is distinct from old.plan then
    raise exception 'solo_superadmin' using errcode = '42501', hint = 'El plan solo lo cambia SawaTek.';
  end if;
  return new;
end;
$$;
drop trigger if exists negocios_proteger_plan on public.negocios;
create trigger negocios_proteger_plan before update on public.negocios
  for each row execute function public.proteger_plan_negocio();
revoke all on function public.proteger_plan_negocio() from public, anon, authenticated;

create table if not exists public.negocios_internos (
  negocio_id      uuid primary key references public.negocios (id) on delete cascade,
  notas_internas  text not null default '' check (length(notas_internas) <= 4000),
  actualizado     timestamptz not null default now(),
  actualizado_por uuid default auth.uid() references auth.users (id) on delete set null
);
comment on table public.negocios_internos is 'Datos internos de SawaTek sobre cada negocio. Solo los ven los super admins.';

alter table public.negocios_internos enable row level security;
drop policy if exists "Solo SawaTek" on public.negocios_internos;
create policy "Solo SawaTek" on public.negocios_internos for all to authenticated
  using ((select public.es_superadmin())) with check ((select public.es_superadmin()));
revoke all on public.negocios_internos from anon;
grant select, insert, update, delete on public.negocios_internos to authenticated;
revoke truncate, references, trigger on public.negocios_internos from authenticated;

-- -------------------------------------------------------------------------------------
-- 2. Resumen de la plataforma (mes en hora argentina)
-- -------------------------------------------------------------------------------------
create or replace function public.admin_resumen(p_mes date default null)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz constant text := 'America/Argentina/Buenos_Aires';
  v_mes date;
  v_desde timestamptz;
  v_hasta timestamptz;
  v_negocios jsonb;
  v_turnos jsonb;
  v_mensajes jsonb;
  v_tipos jsonb;
  v_clientes int;
begin
  if not public.es_superadmin() then
    raise exception 'solo_superadmin' using errcode = '42501';
  end if;
  v_mes := date_trunc('month', coalesce(p_mes, (now() at time zone v_tz)::date)::timestamp)::date;
  v_desde := v_mes::timestamp at time zone v_tz;
  v_hasta := (v_mes + interval '1 month')::timestamp at time zone v_tz;

  select jsonb_build_object(
    'prueba', count(*) filter (where not n.es_demo and n.estado = 'prueba'),
    'activo', count(*) filter (where not n.es_demo and n.estado = 'activo'),
    'suspendido', count(*) filter (where not n.es_demo and n.estado = 'suspendido'),
    'nuevos', count(*) filter (where not n.es_demo and n.creado >= v_desde and n.creado < v_hasta),
    'demos', count(*) filter (where n.es_demo))
  into v_negocios
  from public.negocios n;

  -- Turnos que caen en el mes. "Avisaron que no venían": cancelados antes de la hora del turno
  -- (el horario se liberó en vez de quedar una falta).
  select jsonb_build_object(
    'total', count(*) filter (where t.estado <> 'cancelado'),
    'pendiente', count(*) filter (where t.estado = 'pendiente'),
    'confirmado', count(*) filter (where t.estado = 'confirmado'),
    'asistio', count(*) filter (where t.estado = 'asistio'),
    'falto', count(*) filter (where t.estado = 'falto'),
    'cancelado', count(*) filter (where t.estado = 'cancelado'),
    'cancelados_con_aviso', count(*) filter (where t.estado = 'cancelado' and t.actualizado < t.inicio),
    'desde_la_app', count(*) filter (where t.estado <> 'cancelado' and t.origen = 'app'))
  into v_turnos
  from public.turnos t
  join public.negocios n on n.id = t.negocio_id and not n.es_demo
  where t.inicio >= v_desde and t.inicio < v_hasta;

  select jsonb_build_object(
    'total', count(*),
    'pendiente', count(*) filter (where m.estado = 'pendiente'),
    'enviando', count(*) filter (where m.estado = 'enviando'),
    'enviado', count(*) filter (where m.estado = 'enviado'),
    'error', count(*) filter (where m.estado = 'error'),
    'cancelado', count(*) filter (where m.estado = 'cancelado'))
  into v_mensajes
  from public.mensajes m
  where m.creado >= v_desde and m.creado < v_hasta;

  select coalesce(jsonb_object_agg(x.tipo, x.n), '{}'::jsonb) into v_tipos
  from (
    select m.tipo, count(*) as n from public.mensajes m
    where m.creado >= v_desde and m.creado < v_hasta and m.estado = 'enviado'
    group by m.tipo
  ) x;

  select count(*) into v_clientes
  from public.clientes c
  join public.negocios n on n.id = c.negocio_id and not n.es_demo
  where c.creado >= v_desde and c.creado < v_hasta;

  return jsonb_build_object(
    'mes', v_mes,
    'negocios', v_negocios,
    'turnos', v_turnos,
    'mensajes', v_mensajes || jsonb_build_object('enviados_por_tipo', v_tipos),
    'clientes_nuevos', v_clientes);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 3. Negocios reales: lista y ficha
-- -------------------------------------------------------------------------------------
drop function if exists public.admin_negocios();
create or replace function public.admin_negocios()
returns table (
  id uuid, slug text, nombre text, estado text, plan text, color text, creado timestamptz, actualizado timestamptz,
  duenos jsonb, equipo int, invitaciones_pendientes int, turnos_mes int, clientes int
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_tz constant text := 'America/Argentina/Buenos_Aires';
  v_desde timestamptz := date_trunc('month', (now() at time zone v_tz))::timestamp at time zone v_tz;
begin
  if not public.es_superadmin() then
    raise exception 'solo_superadmin' using errcode = '42501';
  end if;
  return query
  select n.id, n.slug, coalesce(n.config ->> 'nombre', n.slug), n.estado, n.plan, n.config ->> 'color', n.creado, n.actualizado,
    coalesce((
      select jsonb_agg(jsonb_build_object('nombre', nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), 'email', u.email) order by u.email)
      from public.miembros m join auth.users u on u.id = m.user_id
      where m.negocio_id = n.id and m.rol = 'dueno'
    ), '[]'::jsonb),
    (select count(*)::int from public.miembros m where m.negocio_id = n.id),
    (select count(*)::int from public.invitaciones i where i.negocio_id = n.id and i.aceptada is null),
    (select count(*)::int from public.turnos t where t.negocio_id = n.id and t.estado <> 'cancelado'
       and t.inicio >= v_desde and t.inicio < v_desde + interval '1 month'),
    (select count(*)::int from public.clientes c where c.negocio_id = n.id)
  from public.negocios n
  where not n.es_demo
  order by n.creado desc;
end;
$$;

create or replace function public.admin_negocio(p_negocio uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz constant text := 'America/Argentina/Buenos_Aires';
  v_desde timestamptz := date_trunc('month', (now() at time zone v_tz))::timestamp at time zone v_tz;
  v_n public.negocios%rowtype;
begin
  if not public.es_superadmin() then
    raise exception 'solo_superadmin' using errcode = '42501';
  end if;
  select * into v_n from public.negocios where id = p_negocio;
  if not found then
    raise exception 'negocio_no_encontrado' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'id', v_n.id, 'slug', v_n.slug, 'es_demo', v_n.es_demo, 'estado', v_n.estado, 'plan', v_n.plan,
    'creado', v_n.creado, 'actualizado', v_n.actualizado, 'config', v_n.config,
    'notas_internas', coalesce((select x.notas_internas from public.negocios_internos x where x.negocio_id = v_n.id), ''),
    'equipo', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'email', u.email, 'rol', m.rol,
        'nombre', coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), p.nombre),
        'profesional', p.nombre, 'ultimo_ingreso', u.last_sign_in_at) order by m.rol, u.email)
      from public.miembros m
      join auth.users u on u.id = m.user_id
      left join public.profesionales p on p.negocio_id = m.negocio_id and p.user_id = m.user_id
      where m.negocio_id = v_n.id
    ), '[]'::jsonb),
    'invitaciones', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'nombre', i.nombre, 'rol', i.rol, 'creado', i.creado) order by i.creado)
      from public.invitaciones i where i.negocio_id = v_n.id and i.aceptada is null
    ), '[]'::jsonb),
    'profesionales', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'con_cuenta', p.user_id is not null) order by p.orden, p.nombre)
      from public.profesionales p where p.negocio_id = v_n.id and p.activo
    ), '[]'::jsonb),
    'metricas', jsonb_build_object(
      'turnos_mes', (select count(*) from public.turnos t where t.negocio_id = v_n.id and t.estado <> 'cancelado'
                      and t.inicio >= v_desde and t.inicio < v_desde + interval '1 month'),
      'proximos', (select count(*) from public.turnos t where t.negocio_id = v_n.id and t.estado in ('pendiente', 'confirmado') and t.inicio > now()),
      'clientes', (select count(*) from public.clientes c where c.negocio_id = v_n.id),
      'mensajes_con_error', (select count(*) from public.mensajes m where m.negocio_id = v_n.id and m.estado = 'error'))
  );
end;
$$;

-- Cambios de SawaTek sobre un negocio. Claves aceptadas en p_cambios:
--   estado ('prueba' | 'activo' | 'suspendido'), plan (texto o null), notas_internas,
--   y de la marca (dentro de config): nombre, color ('#rrggbb'), logo (data URL / https, o null para sacarlo), claim.
create or replace function public.admin_actualizar_negocio(p_negocio uuid, p_cambios jsonb)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_clave text;
  v_config jsonb := '{}'::jsonb;
  v_sin_logo boolean := false;
  v_txt text;
begin
  if not public.es_superadmin() then
    raise exception 'solo_superadmin' using errcode = '42501';
  end if;
  if jsonb_typeof(p_cambios) is distinct from 'object' then
    raise exception 'cambios_invalidos' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.negocios where id = p_negocio) then
    raise exception 'negocio_no_encontrado' using errcode = 'P0001';
  end if;

  for v_clave in select jsonb_object_keys(p_cambios) loop
    if v_clave not in ('estado', 'plan', 'notas_internas', 'nombre', 'color', 'logo', 'claim') then
      raise exception 'campo_invalido' using errcode = 'P0001', detail = v_clave;
    end if;
  end loop;

  if p_cambios ? 'estado' and coalesce(p_cambios ->> 'estado', '') not in ('prueba', 'activo', 'suspendido') then
    raise exception 'estado_invalido' using errcode = 'P0001';
  end if;
  if p_cambios ? 'plan' and length(trim(coalesce(p_cambios ->> 'plan', ''))) > 40 then
    raise exception 'plan_invalido' using errcode = 'P0001';
  end if;
  if p_cambios ? 'notas_internas' and length(coalesce(p_cambios ->> 'notas_internas', '')) > 4000 then
    raise exception 'notas_largas' using errcode = 'P0001';
  end if;
  if p_cambios ? 'nombre' then
    v_txt := regexp_replace(trim(coalesce(p_cambios ->> 'nombre', '')), '\s+', ' ', 'g');
    if length(v_txt) not between 2 and 80 then
      raise exception 'nombre_invalido' using errcode = 'P0001';
    end if;
    v_config := v_config || jsonb_build_object('nombre', v_txt);
  end if;
  if p_cambios ? 'color' then
    if coalesce(p_cambios ->> 'color', '') !~* '^#[0-9a-f]{6}$' then
      raise exception 'color_invalido' using errcode = 'P0001';
    end if;
    v_config := v_config || jsonb_build_object('color', lower(p_cambios ->> 'color'));
  end if;
  if p_cambios ? 'claim' then
    if length(trim(coalesce(p_cambios ->> 'claim', ''))) > 160 then
      raise exception 'claim_largo' using errcode = 'P0001';
    end if;
    v_config := v_config || jsonb_build_object('claim', trim(coalesce(p_cambios ->> 'claim', '')));
  end if;
  if p_cambios ? 'logo' then
    v_txt := nullif(trim(coalesce(p_cambios ->> 'logo', '')), '');
    if v_txt is null then
      v_sin_logo := true;
    elsif v_txt !~ '^(data:image/(png|jpeg|webp|svg\+xml);base64,|https://)' or length(v_txt) > 250000 then
      raise exception 'logo_invalido' using errcode = 'P0001';
    else
      v_config := v_config || jsonb_build_object('logo', v_txt);
    end if;
  end if;

  update public.negocios n set
    estado = case when p_cambios ? 'estado' then p_cambios ->> 'estado' else n.estado end,
    plan = case when p_cambios ? 'plan' then nullif(trim(coalesce(p_cambios ->> 'plan', '')), '') else n.plan end,
    config = case when v_sin_logo then (n.config || v_config) - 'logo' else n.config || v_config end
  where n.id = p_negocio;

  if p_cambios ? 'notas_internas' then
    insert into public.negocios_internos (negocio_id, notas_internas, actualizado, actualizado_por)
    values (p_negocio, coalesce(p_cambios ->> 'notas_internas', ''), now(), auth.uid())
    on conflict (negocio_id) do update
      set notas_internas = excluded.notas_internas, actualizado = now(), actualizado_por = auth.uid();
  end if;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 4. Cuentas (mail + contraseña: dueños, profesionales y SawaTek)
-- -------------------------------------------------------------------------------------
drop function if exists public.admin_cuentas();
create or replace function public.admin_cuentas()
returns table (
  user_id uuid, email text, nombre text, creado timestamptz, ultimo_ingreso timestamptz,
  confirmada boolean, es_superadmin boolean, negocios jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.es_superadmin() then
    raise exception 'solo_superadmin' using errcode = '42501';
  end if;
  return query
  select u.id, u.email::text, nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), u.created_at, u.last_sign_in_at,
    u.email_confirmed_at is not null,
    exists (select 1 from public.superadmins s where s.email = lower(u.email)),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'slug', n.slug, 'nombre', coalesce(n.config ->> 'nombre', n.slug), 'rol', m.rol) order by n.slug)
      from public.miembros m join public.negocios n on n.id = m.negocio_id
      where m.user_id = u.id
    ), '[]'::jsonb)
  from auth.users u
  where u.email is not null and u.email <> '' and u.deleted_at is null
  order by u.created_at desc
  limit 1000;
end;
$$;

-- Suma una cuenta a un negocio (dueño o profesional) sin esperar a que acepte una invitación.
-- Si se pasa p_profesional, le vincula la cuenta a esa ficha (así ve su agenda).
create or replace function public.admin_sumar_miembro(p_user uuid, p_negocio uuid, p_rol text, p_profesional uuid default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_email text;
  v_otro uuid;
begin
  if not public.es_superadmin() then
    raise exception 'solo_superadmin' using errcode = '42501';
  end if;
  if p_rol is null or p_rol not in ('dueno', 'profesional') then
    raise exception 'rol_invalido' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.negocios where id = p_negocio and not es_demo) then
    raise exception 'negocio_no_encontrado' using errcode = 'P0001';
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = p_user;
  if not found then
    raise exception 'cuenta_no_encontrada' using errcode = 'P0001';
  end if;

  insert into public.miembros (negocio_id, user_id, rol) values (p_negocio, p_user, p_rol)
  on conflict (negocio_id, user_id) do update set rol = excluded.rol;

  if p_profesional is not null then
    select p.user_id into v_otro from public.profesionales p where p.id = p_profesional and p.negocio_id = p_negocio;
    if not found then
      raise exception 'profesional_no_encontrado' using errcode = 'P0001';
    end if;
    if v_otro is not null and v_otro <> p_user then
      raise exception 'profesional_con_cuenta' using errcode = 'P0001';
    end if;
    update public.profesionales set user_id = p_user where id = p_profesional;
  end if;

  update public.invitaciones set aceptada = now()
  where negocio_id = p_negocio and email = v_email and aceptada is null;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5. Registro de mensajes (nunca devuelve el código de los mensajes 'codigo')
-- -------------------------------------------------------------------------------------
drop function if exists public.admin_mensajes(uuid, text, text, timestamptz, int);
create or replace function public.admin_mensajes(
  p_negocio uuid default null, p_tipo text default null, p_estado text default null,
  p_antes timestamptz default null, p_limite int default 50
)
returns table (
  id uuid, creado timestamptz, programado timestamptz, enviado timestamptz, tipo text, canal text, destino text,
  negocio_id uuid, negocio text, estado text, intentos int, error text, texto text
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.es_superadmin() then
    raise exception 'solo_superadmin' using errcode = '42501';
  end if;
  return query
  select m.id, m.creado, m.programado, m.enviado, m.tipo, m.canal,
    -- El destino, tapado a medias (alcanza para reconocerlo en soporte).
    case when m.canal = 'push' then 'notificación push'
         when length(m.destino) <= 6 then repeat('•', length(m.destino))
         else left(m.destino, 4) || repeat('•', least(length(m.destino) - 7, 12)) || right(m.destino, 3) end,
    m.negocio_id, coalesce(n.config ->> 'nombre', n.slug), m.estado, m.intentos,
    case when m.tipo = 'codigo' then regexp_replace(coalesce(m.error, ''), '\d{4,}', '••••', 'g') else m.error end,
    case when m.tipo = 'codigo' then null else m.contenido ->> 'texto' end
  from public.mensajes m
  left join public.negocios n on n.id = m.negocio_id
  where (p_negocio is null or m.negocio_id = p_negocio)
    and (p_tipo is null or m.tipo = p_tipo)
    and (p_estado is null or m.estado = p_estado)
    and (p_antes is null or m.creado < p_antes)
  order by m.creado desc, m.id
  limit greatest(1, least(coalesce(p_limite, 50), 200));
end;
$$;

-- -------------------------------------------------------------------------------------
-- 6. Permisos de ejecución: solo usuarios logueados (y adentro, solo super admins)
-- -------------------------------------------------------------------------------------
revoke all on function public.admin_resumen(date), public.admin_negocios(), public.admin_negocio(uuid),
  public.admin_actualizar_negocio(uuid, jsonb), public.admin_cuentas(), public.admin_sumar_miembro(uuid, uuid, text, uuid),
  public.admin_mensajes(uuid, text, text, timestamptz, int) from public, anon;
grant execute on function public.admin_resumen(date), public.admin_negocios(), public.admin_negocio(uuid),
  public.admin_actualizar_negocio(uuid, jsonb), public.admin_cuentas(), public.admin_sumar_miembro(uuid, uuid, text, uuid),
  public.admin_mensajes(uuid, text, text, timestamptz, int) to authenticated;
