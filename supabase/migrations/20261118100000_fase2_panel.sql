-- =====================================================================================
-- Fase 2: panel real del dueño y del profesional.
--   · turnos en la publicación de Realtime: el panel se actualiza en vivo (respeta RLS:
--     cada usuario solo recibe los cambios de los turnos que puede ver).
--   · panel_resumen: números del día y faltas del mes (el profesional, solo los suyos).
--   · panel_miembros / panel_quitar_miembro: el equipo con sus mails (auth.users no es visible).
--   · panel_guardar_horarios / panel_guardar_servicios_profesional: guardan todo junto (atómico).
-- Re-ejecutable: se puede correr varias veces sin romper nada.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Turnos en vivo
-- -------------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'turnos'
     ) then
    alter publication supabase_realtime add table public.turnos;
  end if;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 2. Resumen del día (arriba de la agenda)
--   turnos_dia: activos del día · confirmados: confirmados o que ya vinieron ·
--   faltas_mes: "no vino" en el mes del día pedido · facturacion: precio de los servicios del día
--   (sin cancelados ni faltas). El profesional siempre ve solo lo suyo (se ignora p_profesional).
-- -------------------------------------------------------------------------------------
drop function if exists public.panel_resumen(uuid, date, uuid);
create or replace function public.panel_resumen(p_negocio uuid, p_dia date, p_profesional uuid default null)
returns table (turnos_dia int, confirmados int, faltas_mes int, facturacion bigint)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_prof uuid := p_profesional;
  v_zona text;
  v_ini timestamptz;
  v_fin timestamptz;
  v_mes_ini timestamptz;
  v_mes_fin timestamptz;
begin
  if p_dia is null or not public.es_staff(p_negocio) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if not public.es_dueno(p_negocio) then
    v_prof := public.mi_profesional(p_negocio);
    if v_prof is null then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
  end if;

  select n.zona_horaria into v_zona from public.negocios n where n.id = p_negocio;
  v_ini := p_dia::timestamp at time zone v_zona;
  v_fin := (p_dia + 1)::timestamp at time zone v_zona;
  v_mes_ini := date_trunc('month', p_dia::timestamp) at time zone v_zona;
  v_mes_fin := (date_trunc('month', p_dia::timestamp) + interval '1 month') at time zone v_zona;

  return query
  select
    (count(*) filter (where t.inicio >= v_ini and t.inicio < v_fin and t.estado <> 'cancelado'))::int,
    (count(*) filter (where t.inicio >= v_ini and t.inicio < v_fin and t.estado in ('confirmado', 'asistio')))::int,
    (count(*) filter (where t.estado = 'falto'))::int,
    coalesce(sum(s.precio) filter (where t.inicio >= v_ini and t.inicio < v_fin and t.estado not in ('cancelado', 'falto')), 0)::bigint
  from public.turnos t
  join public.servicios s on s.id = t.servicio_id
  where t.negocio_id = p_negocio
    and t.inicio >= v_mes_ini and t.inicio < v_mes_fin
    and (v_prof is null or t.profesional_id = v_prof);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 3. Equipo: miembros con su mail (solo el dueño o SawaTek)
-- -------------------------------------------------------------------------------------
drop function if exists public.panel_miembros(uuid);
create or replace function public.panel_miembros(p_negocio uuid)
returns table (user_id uuid, email text, rol text, profesional_id uuid, profesional text, creado timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.es_dueno(p_negocio) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  return query
  select m.user_id, u.email::text, m.rol, p.id, p.nombre, m.creado
  from public.miembros m
  join auth.users u on u.id = m.user_id
  left join public.profesionales p on p.negocio_id = m.negocio_id and p.user_id = m.user_id
  where m.negocio_id = p_negocio
  order by m.rol, u.email;
end;
$$;

-- Quita a un profesional del negocio: borra la membresía, lo desvincula de su ficha de profesional
-- (la agenda queda, sin usuario) y borra su invitación (así se lo puede volver a invitar).
-- Los dueños no se quitan desde la app.
drop function if exists public.panel_quitar_miembro(uuid, uuid);
create or replace function public.panel_quitar_miembro(p_negocio uuid, p_user uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_rol text;
  v_email text;
begin
  if not public.es_dueno(p_negocio) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  select m.rol into v_rol from public.miembros m where m.negocio_id = p_negocio and m.user_id = p_user;
  if v_rol is null then
    raise exception 'miembro_no_encontrado' using errcode = 'P0001';
  end if;
  if v_rol <> 'profesional' then
    raise exception 'no_se_puede_quitar' using errcode = '42501',
      hint = 'Desde el panel solo se quitan profesionales.';
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = p_user;
  delete from public.miembros where negocio_id = p_negocio and user_id = p_user;
  update public.profesionales set user_id = null where negocio_id = p_negocio and user_id = p_user;
  delete from public.invitaciones where negocio_id = p_negocio and email = v_email;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 4. Horario semanal de un profesional, de una sola vez.
--   p_franjas: [{"dia": 1, "desde": "09:00", "hasta": "13:00"}, ...]  (dia 0 = domingo)
--   Errores: sin_permiso, franjas_invalidas, franjas_superpuestas.
-- -------------------------------------------------------------------------------------
drop function if exists public.panel_guardar_horarios(uuid, jsonb);
create or replace function public.panel_guardar_horarios(p_profesional uuid, p_franjas jsonb)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_negocio uuid;
begin
  select p.negocio_id into v_negocio from public.profesionales p where p.id = p_profesional;
  if v_negocio is null or not public.es_dueno(v_negocio) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_franjas is null or jsonb_typeof(p_franjas) <> 'array' then
    raise exception 'franjas_invalidas' using errcode = 'P0001';
  end if;

  -- Valida (si un valor no es un número o una hora, el cast falla y se informa como franjas_invalidas).
  begin
    if exists (
      select 1 from jsonb_array_elements(p_franjas) as f(e)
      cross join lateral (select (f.e ->> 'dia')::smallint as dia, (f.e ->> 'desde')::time as desde, (f.e ->> 'hasta')::time as hasta) x
      where jsonb_typeof(f.e) <> 'object' or x.dia is null or x.desde is null or x.hasta is null
        or x.dia not between 0 and 6 or x.hasta <= x.desde
    ) then
      raise exception 'franjas_invalidas' using errcode = 'P0001';
    end if;
    if exists (
      with fr as (
        select f.n, (f.e ->> 'dia')::smallint as dia, (f.e ->> 'desde')::time as desde, (f.e ->> 'hasta')::time as hasta
        from jsonb_array_elements(p_franjas) with ordinality as f(e, n)
      )
      select 1 from fr a join fr b on a.dia = b.dia and a.n < b.n and a.desde < b.hasta and b.desde < a.hasta
    ) then
      raise exception 'franjas_superpuestas' using errcode = 'P0001';
    end if;
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
    raise exception 'franjas_invalidas' using errcode = 'P0001';
  end;

  delete from public.horarios where profesional_id = p_profesional;
  insert into public.horarios (negocio_id, profesional_id, dia, desde, hasta)
  select v_negocio, p_profesional, (f.e ->> 'dia')::smallint, (f.e ->> 'desde')::time, (f.e ->> 'hasta')::time
  from jsonb_array_elements(p_franjas) as f(e);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5. Qué servicios hace un profesional, de una sola vez. Lista vacía = hace todos.
--   Errores: sin_permiso, servicio_invalido (de otro negocio o inexistente).
-- -------------------------------------------------------------------------------------
drop function if exists public.panel_guardar_servicios_profesional(uuid, uuid[]);
create or replace function public.panel_guardar_servicios_profesional(p_profesional uuid, p_servicios uuid[])
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_negocio uuid;
begin
  select p.negocio_id into v_negocio from public.profesionales p where p.id = p_profesional;
  if v_negocio is null or not public.es_dueno(v_negocio) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_servicios, '{}')) as x(id)
    where not exists (select 1 from public.servicios s where s.id = x.id and s.negocio_id = v_negocio)
  ) then
    raise exception 'servicio_invalido' using errcode = 'P0001';
  end if;
  delete from public.profesional_servicios where profesional_id = p_profesional;
  insert into public.profesional_servicios (negocio_id, profesional_id, servicio_id)
  select distinct v_negocio, p_profesional, x.id from unnest(coalesce(p_servicios, '{}')) as x(id);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 6. Permisos de ejecución
-- -------------------------------------------------------------------------------------
revoke all on function public.panel_resumen(uuid, date, uuid), public.panel_miembros(uuid),
  public.panel_quitar_miembro(uuid, uuid), public.panel_guardar_horarios(uuid, jsonb),
  public.panel_guardar_servicios_profesional(uuid, uuid[]) from public, anon;
grant execute on function public.panel_resumen(uuid, date, uuid), public.panel_miembros(uuid),
  public.panel_quitar_miembro(uuid, uuid), public.panel_guardar_horarios(uuid, jsonb),
  public.panel_guardar_servicios_profesional(uuid, uuid[]) to authenticated;
