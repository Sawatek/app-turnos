-- =====================================================================================
-- App del cliente completa.
--   · mis_turnos_global(): los turnos del cliente logueado en TODOS los negocios donde reservó (/mis-turnos).
--   · lista_espera: "Avisame si se libera". Cada cliente ve y borra las suyas; el staff, las de su negocio.
--     Se anota con anotarme_lista_espera(). Cuando se cancela un turno, un trigger encola un mensaje
--     'aviso' en `mensajes` a los anotados para ese negocio, día y servicio (uno por persona y cancelación).
--   · resenas: el cliente califica (1 a 5, con comentario opcional) un turno al que vino, una sola vez.
--     calificacion_negocio(): solo el promedio y la cantidad (es pública).
--
-- Lo que ve un visitante SIN sesión (servicios, profesionales, horarios libres, disponibilidad) ya era
-- público desde las fases 1 y 3: acá no se abre nada más que calificacion_negocio (números, sin datos personales).
-- Re-ejecutable: se puede correr varias veces sin romper nada.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Mis turnos en todos los negocios
-- -------------------------------------------------------------------------------------
create or replace function public.mis_turnos_global()
returns table (
  id uuid, negocio_id uuid, slug text, negocio text, servicio text, profesional text,
  inicio timestamptz, fin timestamptz, estado text, cancelacion_horas int, puntaje smallint
)
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
  select t.id, n.id, n.slug, coalesce(nullif(trim(n.config ->> 'nombre'), ''), n.slug),
         s.nombre, p.nombre, t.inicio, t.fin, t.estado, n.cancelacion_horas, r.puntaje
  from public.clientes c
  join public.turnos t on t.cliente_id = c.id
  join public.negocios n on n.id = t.negocio_id
  join public.servicios s on s.id = t.servicio_id
  join public.profesionales p on p.id = t.profesional_id
  left join public.resenas r on r.turno_id = t.id
  where c.user_id = v_uid and not n.es_demo
  order by t.inicio desc
  limit 300;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 2. Reseñas (la tabla la muestra también el panel del negocio)
-- -------------------------------------------------------------------------------------
create table if not exists public.resenas (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  turno_id   uuid not null unique references public.turnos (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  puntaje    smallint not null check (puntaje between 1 and 5),
  comentario text check (length(comentario) <= 500),
  creado     timestamptz not null default now()
);
create index if not exists resenas_negocio_idx on public.resenas (negocio_id, creado desc);
create index if not exists resenas_cliente_idx on public.resenas (cliente_id);

-- ¿El usuario logueado puede calificar este turno? Tiene que ser SUYO, de ese negocio y con estado 'asistio'.
create or replace function public.puede_calificar(p_turno uuid, p_cliente uuid, p_negocio uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.turnos t
    join public.clientes c on c.id = t.cliente_id
    where t.id = p_turno and t.cliente_id = p_cliente and t.negocio_id = p_negocio
      and t.estado = 'asistio' and c.user_id = auth.uid()
  );
$$;

-- Desde la app, la fecha la pone la base y un comentario en blanco queda vacío.
create or replace function public.resenas_preparar()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if public.es_usuario_app() then
    new.creado := now();
  end if;
  new.comentario := nullif(trim(new.comentario), '');
  return new;
end;
$$;
drop trigger if exists resenas_preparar on public.resenas;
create trigger resenas_preparar before insert on public.resenas
  for each row execute function public.resenas_preparar();

alter table public.resenas enable row level security;
drop policy if exists "Ver reseñas" on public.resenas;
drop policy if exists "El cliente califica sus turnos" on public.resenas;
create policy "Ver reseñas" on public.resenas for select to authenticated
  using ((select public.es_mi_cliente(cliente_id)) or (select public.es_staff(negocio_id)));
-- Una por turno (unique turno_id). No hay update ni delete desde la app.
create policy "El cliente califica sus turnos" on public.resenas for insert to authenticated
  with check (public.puede_calificar(turno_id, cliente_id, negocio_id));

-- Promedio y cantidad de un negocio (público: no expone quién calificó ni qué escribió).
create or replace function public.calificacion_negocio(p_negocio uuid)
returns table (promedio numeric, cantidad int)
language sql stable security definer set search_path = ''
as $$
  select round(avg(r.puntaje)::numeric, 1), count(r.id)::int
  from public.negocios n
  left join public.resenas r on r.negocio_id = n.id
  where n.id = p_negocio and not n.es_demo and n.estado <> 'suspendido';
$$;

-- -------------------------------------------------------------------------------------
-- 3. Lista de espera
-- -------------------------------------------------------------------------------------
create table if not exists public.lista_espera (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.negocios (id) on delete cascade,
  cliente_id     uuid not null,
  servicio_id    uuid not null,
  -- null = con cualquiera
  profesional_id uuid,
  dia            date not null,
  creado         timestamptz not null default now(),
  -- Última vez que se le avisó que se liberó algo (para mostrarlo en la app).
  avisado        timestamptz,
  foreign key (negocio_id, cliente_id) references public.clientes (negocio_id, id) on delete cascade,
  foreign key (negocio_id, servicio_id) references public.servicios (negocio_id, id) on delete cascade,
  foreign key (negocio_id, profesional_id) references public.profesionales (negocio_id, id) on delete cascade,
  constraint lista_espera_unica unique nulls not distinct (cliente_id, servicio_id, dia, profesional_id)
);
create index if not exists lista_espera_busqueda_idx on public.lista_espera (negocio_id, dia, servicio_id);

alter table public.lista_espera enable row level security;
drop policy if exists "Ver lista de espera" on public.lista_espera;
drop policy if exists "Borrar de la lista de espera" on public.lista_espera;
create policy "Ver lista de espera" on public.lista_espera for select to authenticated
  using ((select public.es_mi_cliente(cliente_id)) or (select public.es_staff(negocio_id)));
create policy "Borrar de la lista de espera" on public.lista_espera for delete to authenticated
  using ((select public.es_mi_cliente(cliente_id)) or (select public.es_staff(negocio_id)));
-- Anotarse: solo con anotarme_lista_espera() (valida todo y crea la ficha la primera vez).

-- Anota al usuario logueado para que le avisen si se libera un horario. Devuelve el id (si ya estaba, el mismo).
-- Errores: sin_sesion, negocio_no_disponible, servicio_no_disponible, profesional_no_disponible,
-- dia_invalido, falta_nombre, demasiadas_esperas.
create or replace function public.anotarme_lista_espera(
  p_negocio uuid, p_servicio uuid, p_dia date, p_profesional uuid default null, p_nombre text default null
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_neg public.negocios%rowtype;
  v_hoy date;
  v_cliente uuid;
  v_nombre text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  select * into v_neg from public.negocios where id = p_negocio;
  if not found or v_neg.es_demo or v_neg.estado <> 'activo' then
    raise exception 'negocio_no_disponible' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.servicios where id = p_servicio and negocio_id = p_negocio and activo) then
    raise exception 'servicio_no_disponible' using errcode = 'P0001';
  end if;
  if p_profesional is not null and not exists (
    select 1 from public.profesionales p
    where p.id = p_profesional and p.negocio_id = p_negocio and p.activo
      and (
        not exists (select 1 from public.profesional_servicios ps where ps.profesional_id = p.id)
        or exists (select 1 from public.profesional_servicios ps where ps.profesional_id = p.id and ps.servicio_id = p_servicio)
      )
  ) then
    raise exception 'profesional_no_disponible' using errcode = 'P0001';
  end if;
  v_hoy := (now() at time zone v_neg.zona_horaria)::date;
  if p_dia is null or p_dia < v_hoy or p_dia > v_hoy + 60 then
    raise exception 'dia_invalido' using errcode = 'P0001';
  end if;

  -- Igual que reservar_turno: de a una por negocio (milisegundos), así la ficha no se crea dos veces.
  perform pg_advisory_xact_lock(hashtextextended(p_negocio::text, 0));
  perform set_config('sawatek.interno', 'si', true);

  select id into v_cliente from public.clientes where negocio_id = p_negocio and user_id = v_uid;
  if v_cliente is null then
    v_nombre := coalesce(nullif(trim(p_nombre), ''), public.nombre_de_usuario(v_uid));
    if v_nombre is null then
      raise exception 'falta_nombre' using errcode = 'P0001';
    end if;
    insert into public.clientes (negocio_id, user_id, nombre, telefono)
    select p_negocio, v_uid, left(v_nombre, 80), nullif('+' || coalesce(u.phone, ''), '+')
    from auth.users u where u.id = v_uid
    returning id into v_cliente;
  end if;

  select le.id into v_id from public.lista_espera le
  where le.cliente_id = v_cliente and le.servicio_id = p_servicio and le.dia = p_dia
    and le.profesional_id is not distinct from p_profesional;
  if v_id is not null then
    return v_id;
  end if;

  -- Anti abuso: como mucho 5 anotaciones a futuro por cliente y negocio.
  if (select count(*) from public.lista_espera where cliente_id = v_cliente and dia >= v_hoy) >= 5 then
    raise exception 'demasiadas_esperas' using errcode = 'P0001';
  end if;

  insert into public.lista_espera (negocio_id, cliente_id, servicio_id, profesional_id, dia)
  values (p_negocio, v_cliente, p_servicio, p_profesional, p_dia)
  returning id into v_id;
  return v_id;
end;
$$;

-- Al cancelarse un turno (a futuro), avisa a los anotados para ese negocio, día y servicio
-- (con cualquiera o con ese profesional). Uno por persona: aunque tenga dos anotaciones que coincidan.
-- Si algo falla acá, NO se frena la cancelación.
create or replace function public.turnos_avisar_lista_espera()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_neg public.negocios%rowtype;
  v_dia date;
  v_servicio text;
  r record;
  v_tel text;
  v_datos jsonb;
begin
  if new.estado <> 'cancelado' or old.estado not in ('pendiente', 'confirmado') or new.inicio <= now() then
    return null;
  end if;
  begin
    select * into v_neg from public.negocios where id = new.negocio_id and not es_demo;
    if not found then
      return null;
    end if;
    v_dia := (new.inicio at time zone v_neg.zona_horaria)::date;
    select s.nombre into v_servicio from public.servicios s where s.id = new.servicio_id;

    for r in
      select le.cliente_id, split_part(trim(c.nombre), ' ', 1) as nombre
      from public.lista_espera le
      join public.clientes c on c.id = le.cliente_id
      where le.negocio_id = new.negocio_id and le.dia = v_dia and le.servicio_id = new.servicio_id
        and (le.profesional_id is null or le.profesional_id = new.profesional_id)
        and le.cliente_id <> new.cliente_id
      group by le.cliente_id, c.nombre
    loop
      v_tel := public.telefono_cliente(r.cliente_id);
      continue when v_tel is null;
      v_datos := jsonb_build_object(
        'motivo', 'lista_espera',
        'slug', v_neg.slug,
        'turno_liberado', new.id,
        'nombre', r.nombre,
        'negocio', coalesce(nullif(trim(v_neg.config ->> 'nombre'), ''), v_neg.slug),
        'servicio', v_servicio,
        'dia', (array['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'])
                 [extract(dow from v_dia)::int + 1] || ' ' || to_char(v_dia, 'DD/MM'),
        'hora', to_char(new.inicio at time zone v_neg.zona_horaria, 'HH24:MI')
      );
      insert into public.mensajes (tipo, canal, destino, negocio_id, cliente_id, contenido)
      values ('aviso', 'whatsapp', v_tel, new.negocio_id, r.cliente_id,
              v_datos || jsonb_build_object('texto', public.sustituir_plantilla(
                'Hola {nombre}! Se liberó un horario de {servicio} el {dia} a las {hora} en {negocio}. Si lo querés, reservalo desde la app: {link}',
                v_datos)));
      update public.lista_espera le set avisado = now()
      where le.cliente_id = r.cliente_id and le.dia = v_dia and le.servicio_id = new.servicio_id
        and (le.profesional_id is null or le.profesional_id = new.profesional_id);
    end loop;
  exception when others then
    raise warning 'turnos_avisar_lista_espera (turno %): %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists turnos_lista_espera on public.turnos;
create trigger turnos_lista_espera after update of estado on public.turnos
  for each row when (old.estado is distinct from new.estado and new.estado = 'cancelado')
  execute function public.turnos_avisar_lista_espera();

-- -------------------------------------------------------------------------------------
-- 4. Permisos
-- (Supabase da por defecto todo a anon y authenticated en lo nuevo: se saca y se da solo lo necesario.)
-- -------------------------------------------------------------------------------------
revoke all on function public.mis_turnos_global(), public.puede_calificar(uuid, uuid, uuid),
  public.calificacion_negocio(uuid), public.anotarme_lista_espera(uuid, uuid, date, uuid, text),
  public.turnos_avisar_lista_espera(), public.resenas_preparar() from public, anon, authenticated;
grant execute on function public.mis_turnos_global(), public.puede_calificar(uuid, uuid, uuid),
  public.anotarme_lista_espera(uuid, uuid, date, uuid, text) to authenticated;
grant execute on function public.calificacion_negocio(uuid) to anon, authenticated;

revoke all on public.resenas, public.lista_espera from anon, authenticated;
grant select, insert on public.resenas to authenticated;
grant select, delete on public.lista_espera to authenticated;
