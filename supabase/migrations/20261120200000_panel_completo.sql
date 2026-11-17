-- =====================================================================================
-- Panel completo del dueño.
--   · cuidar_config_negocio: el dueño edita su marca en negocios.config (logo, colores, promos, avisos,
--     fidelidad, textos de los mensajes). La base mantiene config.slug = slug y limita el tamaño.
--   · panel_para_recuperar / panel_recuperar_cliente: clientes que no vienen hace N días y el mensaje
--     "te extrañamos" (tipo 'recuperar' en la cola), como máximo uno cada 30 días por cliente.
--   · panel_reporte: los números de un período (semana, mes o rango), por profesional, servicio y hora,
--     clientes nuevos y recurrentes, y las calificaciones si existe public.resenas.
--   · panel_atiendo_yo: el dueño vincula SU cuenta a una ficha de profesional (agenda propia).
-- El historial de mensajes se lee directo de public.mensajes (la regla ya oculta los códigos de ingreso).
-- Re-ejecutable: se puede correr varias veces sin romper nada.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Configuración del negocio (marca)
-- -------------------------------------------------------------------------------------
create or replace function public.cuidar_config_negocio()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if jsonb_typeof(new.config) = 'object' and new.config ->> 'slug' is distinct from new.slug then
    new.config := jsonb_set(new.config, '{slug}', to_jsonb(new.slug));
  end if;
  -- El logo viaja como data URL chica (256 px): una configuración enorme es un error (o un abuso).
  if public.es_usuario_app() and not public.es_superadmin() and octet_length(new.config::text) > 600000 then
    raise exception 'config_muy_grande' using errcode = '54000',
      hint = 'La configuración es demasiado grande (probá con un logo más liviano).';
  end if;
  return new;
end;
$$;

drop trigger if exists negocios_cuidar_config on public.negocios;
create trigger negocios_cuidar_config before update on public.negocios
  for each row when (new.config is distinct from old.config or new.slug is distinct from old.slug)
  execute function public.cuidar_config_negocio();

-- Historial de mensajes de un cliente (ficha) y de un turno (detalle).
create index if not exists mensajes_cliente_idx on public.mensajes (cliente_id, creado desc);

-- Estado de un mensaje para mostrar: pendiente, enviando, enviado, entregado, leido, error, cancelado.
create or replace function public.estado_mensaje(p_estado text, p_entregado timestamptz, p_leido timestamptz)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when p_estado = 'enviado' and p_leido is not null then 'leido'
    when p_estado = 'enviado' and p_entregado is not null then 'entregado'
    else p_estado
  end;
$$;

-- -------------------------------------------------------------------------------------
-- 2. Clientes para recuperar
--   Un cliente "no viene" si su última visita (turno pasado, que vino o estaba confirmado) fue hace más
--   de p_dias días y no tiene turnos por delante. p_dias null = config.recuperarDias (o 30).
--   Staff del negocio (dueño o profesional).
-- -------------------------------------------------------------------------------------
drop function if exists public.panel_para_recuperar(uuid, int);
create or replace function public.panel_para_recuperar(p_negocio uuid, p_dias int default null)
returns table (
  cliente_id uuid, nombre text, telefono text, con_celular boolean, ultima_visita timestamptz,
  ultimo_servicio text, visitas int, recuperar_enviado timestamptz, recuperar_estado text
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_dias int := p_dias;
begin
  if not public.es_staff(p_negocio) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if v_dias is null then
    select case when n.config ->> 'recuperarDias' ~ '^\d{1,4}$' then (n.config ->> 'recuperarDias')::int end
    into v_dias from public.negocios n where n.id = p_negocio;
  end if;
  v_dias := greatest(1, least(coalesce(v_dias, 30), 3650));

  return query
  with visitas as (
    select t.cliente_id, t.inicio, s.nombre as servicio,
           row_number() over (partition by t.cliente_id order by t.inicio desc) as rn,
           count(*) over (partition by t.cliente_id) as total
    from public.turnos t
    join public.servicios s on s.id = t.servicio_id
    where t.negocio_id = p_negocio and t.inicio < now() and t.estado in ('asistio', 'confirmado')
  ),
  rec as (
    select distinct on (m.cliente_id) m.cliente_id, m.creado,
           public.estado_mensaje(m.estado, m.entregado, m.leido) as estado
    from public.mensajes m
    where m.negocio_id = p_negocio and m.tipo = 'recuperar' and m.estado <> 'cancelado'
    order by m.cliente_id, m.creado desc
  )
  select c.id, c.nombre, c.telefono, public.telefono_cliente(c.id) is not null,
         v.inicio, v.servicio, v.total::int, r.creado, r.estado
  from public.clientes c
  join visitas v on v.cliente_id = c.id and v.rn = 1
  left join rec r on r.cliente_id = c.id
  where c.negocio_id = p_negocio
    and v.inicio < now() - make_interval(days => v_dias)
    and not exists (
      select 1 from public.turnos f
      where f.cliente_id = c.id and f.estado in ('pendiente', 'confirmado') and f.inicio >= now()
    )
  order by v.inicio desc
  limit 500;
end;
$$;

-- Encola el "te extrañamos" (tipo 'recuperar') al celular del cliente. Devuelve el id del mensaje.
-- La plantilla de WhatsApp (cliente_recuperar) usa {nombre} y {negocio}; el texto armado (push, consola,
-- panel) usa config.mensajes.recuperar o uno por defecto.
-- Errores: sin_permiso, negocio_demo, recuperar_reciente (ya se le mandó en los últimos 30 días), sin_telefono.
drop function if exists public.panel_recuperar_cliente(uuid);
create or replace function public.panel_recuperar_cliente(p_cliente uuid)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_c public.clientes%rowtype;
  v_n public.negocios%rowtype;
  v_tel text;
  v_datos jsonb;
  v_plantilla text;
  v_id uuid;
begin
  select * into v_c from public.clientes where id = p_cliente;
  if not found or not public.es_staff(v_c.negocio_id) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  select * into v_n from public.negocios where id = v_c.negocio_id;
  if v_n.es_demo then
    raise exception 'negocio_demo' using errcode = 'P0001';
  end if;

  -- De a uno por cliente: dos toques simultáneos no mandan dos mensajes.
  perform pg_advisory_xact_lock(hashtextextended('recuperar:' || p_cliente::text, 0));
  if exists (
    select 1 from public.mensajes m
    where m.cliente_id = p_cliente and m.tipo = 'recuperar'
      and m.estado in ('pendiente', 'enviando', 'enviado') and m.creado > now() - interval '30 days'
  ) then
    raise exception 'recuperar_reciente' using errcode = 'P0001',
      hint = 'A este cliente ya se le mandó el mensaje en los últimos 30 días.';
  end if;

  v_tel := public.telefono_cliente(p_cliente);
  if v_tel is null then
    raise exception 'sin_telefono' using errcode = 'P0001';
  end if;

  v_datos := jsonb_build_object(
    'slug', v_n.slug,
    'nombre', split_part(trim(v_c.nombre), ' ', 1),
    'negocio', coalesce(nullif(trim(v_n.config ->> 'nombre'), ''), v_n.slug),
    'direccion', coalesce(trim(v_n.config ->> 'direccion'), '')
  );
  v_plantilla := coalesce(
    nullif(trim(case when jsonb_typeof(v_n.config -> 'mensajes') = 'object' then v_n.config -> 'mensajes' ->> 'recuperar' end), ''),
    'Hola {nombre}, hace un tiempo que no te vemos por {negocio}. ¿Querés sacar un turno? Entrá a la app y elegí el horario que te quede mejor: {link}'
  );

  insert into public.mensajes (tipo, canal, destino, negocio_id, cliente_id, contenido)
  values ('recuperar', 'whatsapp', v_tel, v_n.id, p_cliente,
          v_datos || jsonb_build_object('texto', public.sustituir_plantilla(v_plantilla, v_datos), 'enviado_por', auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 3. Reporte de un período [p_desde, p_hasta] (días en la zona del negocio, ambos incluidos, hasta 366 días).
--   El profesional ve solo lo suyo (se ignora p_profesional). Devuelve un JSON:
--   { desde, hasta, profesional_id,
--     totales: { reservados, turnos, cancelados, confirmados, asistio, falto, sin_marcar, facturacion, facturacion_asistidos },
--     clientes: { total, nuevos, recurrentes },
--     por_profesional: [{ id, nombre, turnos, asistio, falto, cancelados, facturacion }],
--     por_servicio:    [{ id, nombre, turnos, asistio, facturacion }],
--     por_hora:        [{ hora, turnos }],   por_dia_semana: [{ dia, turnos }]  (0 = domingo),
--     resenas: null | { cantidad, promedio, distribucion: {"1".."5"}, ultimas: [...] } }
--   "turnos" = no cancelados. confirmados = confirmado o vino. facturación estimada = sin cancelados ni faltas.
--   Cliente nuevo = su primer turno (no cancelado) en el negocio cae dentro del período.
-- -------------------------------------------------------------------------------------
drop function if exists public.panel_reporte(uuid, date, date, uuid);
create or replace function public.panel_reporte(p_negocio uuid, p_desde date, p_hasta date, p_profesional uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_prof uuid := p_profesional;
  v_zona text;
  v_ini timestamptz;
  v_fin timestamptz;
  v_res jsonb;
  v_resenas jsonb;
begin
  if p_desde is null or p_hasta is null or not public.es_staff(p_negocio) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if not public.es_dueno(p_negocio) then
    v_prof := public.mi_profesional(p_negocio);
    if v_prof is null then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
  end if;
  if p_hasta < p_desde or p_hasta - p_desde > 366 then
    raise exception 'rango_invalido' using errcode = 'P0001';
  end if;

  select n.zona_horaria into v_zona from public.negocios n where n.id = p_negocio;
  v_ini := p_desde::timestamp at time zone v_zona;
  v_fin := (p_hasta + 1)::timestamp at time zone v_zona;

  with t as (
    select t.id, t.cliente_id, t.profesional_id, t.servicio_id, t.estado, t.inicio,
           s.precio, s.nombre as servicio, p.nombre as profesional,
           (t.inicio at time zone v_zona) as hora_local
    from public.turnos t
    join public.servicios s on s.id = t.servicio_id
    join public.profesionales p on p.id = t.profesional_id
    where t.negocio_id = p_negocio and t.inicio >= v_ini and t.inicio < v_fin
      and (v_prof is null or t.profesional_id = v_prof)
  )
  select jsonb_build_object(
    'desde', p_desde,
    'hasta', p_hasta,
    'profesional_id', v_prof,
    'totales', (
      select jsonb_build_object(
        'reservados', count(*),
        'turnos', count(*) filter (where estado <> 'cancelado'),
        'cancelados', count(*) filter (where estado = 'cancelado'),
        'confirmados', count(*) filter (where estado in ('confirmado', 'asistio')),
        'asistio', count(*) filter (where estado = 'asistio'),
        'falto', count(*) filter (where estado = 'falto'),
        'sin_marcar', count(*) filter (where estado in ('pendiente', 'confirmado') and inicio < now()),
        'facturacion', coalesce(sum(precio) filter (where estado not in ('cancelado', 'falto')), 0),
        'facturacion_asistidos', coalesce(sum(precio) filter (where estado = 'asistio'), 0)
      ) from t
    ),
    'clientes', (
      select jsonb_build_object(
        'total', count(*),
        'nuevos', count(*) filter (where x.primero >= v_ini),
        'recurrentes', count(*) filter (where x.primero < v_ini)
      )
      from (
        select c.cliente_id,
               (select min(t2.inicio) from public.turnos t2 where t2.cliente_id = c.cliente_id and t2.estado <> 'cancelado') as primero
        from (select distinct cliente_id from t where estado <> 'cancelado') c
      ) x
    ),
    'por_profesional', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', g.profesional_id, 'nombre', g.profesional, 'turnos', g.turnos, 'asistio', g.asistio,
               'falto', g.falto, 'cancelados', g.cancelados, 'facturacion', g.facturacion)
             order by g.turnos desc, g.profesional)
      from (
        select profesional_id, profesional,
               count(*) filter (where estado <> 'cancelado') as turnos,
               count(*) filter (where estado = 'asistio') as asistio,
               count(*) filter (where estado = 'falto') as falto,
               count(*) filter (where estado = 'cancelado') as cancelados,
               coalesce(sum(precio) filter (where estado not in ('cancelado', 'falto')), 0) as facturacion
        from t group by profesional_id, profesional
      ) g
    ), '[]'::jsonb),
    'por_servicio', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', g.servicio_id, 'nombre', g.servicio, 'turnos', g.turnos, 'asistio', g.asistio, 'facturacion', g.facturacion)
             order by g.turnos desc, g.servicio)
      from (
        select servicio_id, servicio,
               count(*) filter (where estado <> 'cancelado') as turnos,
               count(*) filter (where estado = 'asistio') as asistio,
               coalesce(sum(precio) filter (where estado not in ('cancelado', 'falto')), 0) as facturacion
        from t group by servicio_id, servicio
      ) g
    ), '[]'::jsonb),
    'por_hora', coalesce((
      select jsonb_agg(jsonb_build_object('hora', g.hora, 'turnos', g.turnos) order by g.hora)
      from (select extract(hour from hora_local)::int as hora, count(*) as turnos from t where estado <> 'cancelado' group by 1) g
    ), '[]'::jsonb),
    'por_dia_semana', coalesce((
      select jsonb_agg(jsonb_build_object('dia', g.dia, 'turnos', g.turnos) order by g.dia)
      from (select extract(dow from hora_local)::int as dia, count(*) as turnos from t where estado <> 'cancelado' group by 1) g
    ), '[]'::jsonb)
  ) into v_res;

  -- Calificaciones: la tabla public.resenas puede no existir todavía (o cambiar): si algo falla, va null.
  if to_regclass('public.resenas') is not null then
    begin
      execute $q$
        with r as (
          select r.puntaje, r.comentario, r.creado, c.nombre as cliente, s.nombre as servicio, p.nombre as profesional
          from public.resenas r
          left join public.turnos t on t.id = r.turno_id
          left join public.clientes c on c.id = r.cliente_id
          left join public.servicios s on s.id = t.servicio_id
          left join public.profesionales p on p.id = t.profesional_id
          where r.negocio_id = $1 and r.creado >= $2 and r.creado < $3
            and ($4::uuid is null or t.profesional_id = $4)
        )
        select jsonb_build_object(
          'cantidad', (select count(*) from r),
          'promedio', (select round(avg(puntaje)::numeric, 2) from r),
          'distribucion', (select jsonb_build_object(
              '1', count(*) filter (where puntaje = 1), '2', count(*) filter (where puntaje = 2),
              '3', count(*) filter (where puntaje = 3), '4', count(*) filter (where puntaje = 4),
              '5', count(*) filter (where puntaje = 5)) from r),
          'ultimas', coalesce((select jsonb_agg(to_jsonb(u)) from (
              select puntaje, comentario, creado, cliente, servicio, profesional from r order by creado desc limit 10) u), '[]'::jsonb)
        )
      $q$ into v_resenas using p_negocio, v_ini, v_fin, v_prof;
    exception when others then
      v_resenas := null;
    end;
  end if;

  return v_res || jsonb_build_object('resenas', v_resenas);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 4. "Yo también atiendo": el dueño vincula su cuenta a una ficha de profesional del negocio.
--   p_profesional null = se desvincula. Solo un dueño miembro del negocio (mi_profesional exige membresía).
--   Errores: sin_permiso, profesional_no_encontrado, profesional_con_usuario, profesional_invitado.
-- -------------------------------------------------------------------------------------
drop function if exists public.panel_atiendo_yo(uuid, uuid);
create or replace function public.panel_atiendo_yo(p_negocio uuid, p_profesional uuid default null)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user uuid;
begin
  if v_uid is null or public.rol_en(p_negocio) is distinct from 'dueno' then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_profesional is not null then
    select p.user_id into v_user from public.profesionales p
    where p.id = p_profesional and p.negocio_id = p_negocio
    for update;
    if not found then
      raise exception 'profesional_no_encontrado' using errcode = 'P0001';
    end if;
    if v_user is not null and v_user <> v_uid then
      raise exception 'profesional_con_usuario' using errcode = 'P0001',
        hint = 'Esa ficha ya es la agenda de otra persona del equipo.';
    end if;
    if exists (select 1 from public.invitaciones i where i.profesional_id = p_profesional and i.aceptada is null) then
      raise exception 'profesional_invitado' using errcode = 'P0001',
        hint = 'Esa ficha tiene una invitación pendiente: cancelala primero.';
    end if;
  end if;

  update public.profesionales set user_id = null
  where negocio_id = p_negocio and user_id = v_uid and (p_profesional is null or id <> p_profesional);
  if p_profesional is not null then
    update public.profesionales set user_id = v_uid where id = p_profesional and user_id is null;
  end if;
  return p_profesional;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5. Permisos de ejecución
-- -------------------------------------------------------------------------------------
revoke all on function public.cuidar_config_negocio(), public.estado_mensaje(text, timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.panel_para_recuperar(uuid, int), public.panel_recuperar_cliente(uuid),
  public.panel_reporte(uuid, date, date, uuid), public.panel_atiendo_yo(uuid, uuid) from public, anon;
grant execute on function public.panel_para_recuperar(uuid, int), public.panel_recuperar_cliente(uuid),
  public.panel_reporte(uuid, date, date, uuid), public.panel_atiendo_yo(uuid, uuid) to authenticated;
