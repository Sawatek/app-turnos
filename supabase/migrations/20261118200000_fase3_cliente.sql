-- =====================================================================================
-- Fase 3: app del cliente final para un negocio REAL.
--   · disponibilidad_dias(): cuántos horarios libres hay cada día (la tira de 14 días de la reserva).
--   · mi_resumen(): la ficha del cliente logueado en un negocio (nombre, sellos de fidelidad, plazo para cancelar).
--   · turnos en vivo: la tabla `turnos` entra a la publicación de Realtime (cada uno recibe solo lo que
--     puede ver por RLS), así el cliente ve al instante si su turno se confirmó desde WhatsApp.
-- Re-ejecutable: se puede correr varias veces sin romper nada.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Disponibilidad por día
-- Para cada día desde p_desde (por defecto, hoy en la zona del negocio) devuelve:
--   · libres:    cuántos horarios se pueden reservar (lo mismo que contar horarios_libres de ese día).
--   · capacidad: cuántos horarios tendría el día sin turnos ni bloqueos (0 = ese día no se atiende).
-- Es pública como horarios_libres: no expone datos personales, solo cantidades.
-- -------------------------------------------------------------------------------------
create or replace function public.disponibilidad_dias(
  p_negocio uuid, p_servicio uuid, p_profesional uuid default null, p_desde date default null, p_dias int default 14
)
returns table (dia date, libres int, capacidad int)
language sql stable security definer set search_path = ''
as $$
  with neg as (
    select n.zona_horaria as tz, n.intervalo_min from public.negocios n
    where n.id = p_negocio and n.estado = 'activo' and not n.es_demo
  ),
  serv as (
    select s.minutos from public.servicios s
    where s.id = p_servicio and s.negocio_id = p_negocio and s.activo
  ),
  -- Los mismos candidatos que horarios_libres: activos y que hagan el servicio (sin filas = hacen todos).
  cand as (
    select p.id from public.profesionales p
    where p.negocio_id = p_negocio and p.activo
      and (p_profesional is null or p.id = p_profesional)
      and (
        not exists (select 1 from public.profesional_servicios ps where ps.profesional_id = p.id)
        or exists (select 1 from public.profesional_servicios ps where ps.profesional_id = p.id and ps.servicio_id = p_servicio)
      )
  ),
  -- Nunca antes de hoy, y como mucho 31 días por consulta.
  dias as (
    select (greatest(coalesce(p_desde, (now() at time zone neg.tz)::date), (now() at time zone neg.tz)::date) + i)::date as d
    from neg
    cross join generate_series(0, least(greatest(coalesce(p_dias, 14), 1), 31) - 1) as i
    where exists (select 1 from serv)
  )
  select
    dias.d,
    (select count(*)::int from public.horarios_libres(p_negocio, p_servicio, dias.d, p_profesional)),
    (
      select count(distinct g.t)::int
      from public.horarios h
      join cand on cand.id = h.profesional_id
      cross join neg
      cross join serv
      cross join lateral generate_series(
        (dias.d + h.desde) at time zone neg.tz,
        (dias.d + h.hasta) at time zone neg.tz - make_interval(mins => serv.minutos),
        make_interval(mins => neg.intervalo_min)
      ) as g(t)
      where h.dia = extract(dow from dias.d)
    )
  from dias
  order by dias.d;
$$;

-- -------------------------------------------------------------------------------------
-- Resumen del cliente logueado en un negocio.
-- Siempre devuelve una fila si el negocio existe (y no está suspendido): si todavía no reservó nunca,
-- cliente_id/nombre/telefono vienen en null (la app le pide el nombre en la primera reserva).
-- sellos = turnos a los que vino (estado 'asistio'). activos = turnos pendientes o confirmados a futuro.
-- -------------------------------------------------------------------------------------
create or replace function public.mi_resumen(p_negocio uuid)
returns table (cliente_id uuid, nombre text, telefono text, sellos int, activos int, cancelacion_horas int)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  return query
    select
      c.id,
      c.nombre,
      c.telefono,
      coalesce((select count(*)::int from public.turnos t where t.cliente_id = c.id and t.estado = 'asistio'), 0),
      coalesce((select count(*)::int from public.turnos t
                where t.cliente_id = c.id and t.estado in ('pendiente', 'confirmado') and t.inicio > now()), 0),
      n.cancelacion_horas
    from public.negocios n
    left join public.clientes c on c.negocio_id = n.id and c.user_id = v_uid
    where n.id = p_negocio and (n.estado <> 'suspendido' or public.es_staff(n.id));
end;
$$;

-- -------------------------------------------------------------------------------------
-- Turnos en vivo (Realtime respeta las reglas RLS de la tabla: cada cliente recibe solo los suyos).
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
-- Permisos
-- -------------------------------------------------------------------------------------
revoke all on function public.disponibilidad_dias(uuid, uuid, uuid, date, int), public.mi_resumen(uuid) from public;
grant execute on function public.disponibilidad_dias(uuid, uuid, uuid, date, int) to anon, authenticated;
-- Supabase da permiso de ejecución a anon por defecto: se le saca explícitamente (sin sesión no hay resumen).
revoke execute on function public.mi_resumen(uuid) from anon;
grant execute on function public.mi_resumen(uuid) to authenticated;
