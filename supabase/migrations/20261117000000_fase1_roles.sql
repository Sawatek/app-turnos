-- =====================================================================================
-- Fase 1: roles y datos reales.
--
-- Roles:
--   · super admin  → SawaTek (tabla superadmins, por mail). Puede todo.
--   · dueño        → miembros.rol = 'dueno'. Solo su negocio.
--   · profesional  → miembros.rol = 'profesional' + profesionales.user_id. Solo su agenda.
--   · cliente      → clientes.user_id. Solo sus turnos.
--
-- Los permisos los hace cumplir la base (RLS + funciones), no la app.
-- Los negocios "demo" (es_demo = true) siguen funcionando como antes: toda su info en `config`.
-- Los negocios reales usan las tablas de abajo para servicios, staff, horarios y turnos.
-- =====================================================================================

create extension if not exists btree_gist with schema extensions;

-- -------------------------------------------------------------------------------------
-- 1. Super admins (antes "admins")
-- -------------------------------------------------------------------------------------
alter table if exists public.admins rename to superadmins;

create or replace function public.es_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.superadmins s
    join auth.users u on lower(u.email) = s.email
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

-- ¿La operación viene de un usuario de la app (anon/authenticated)? La clave secreta y el SQL Editor
-- (service_role / postgres) no pasan por las protecciones: son herramientas de SawaTek.
create or replace function public.es_usuario_app()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'role', '') in ('anon', 'authenticated')
    and coalesce(current_setting('sawatek.interno', true), '') <> 'si';
$$;

-- -------------------------------------------------------------------------------------
-- 2. Negocios: datos para operar de verdad
-- -------------------------------------------------------------------------------------
alter table public.negocios
  add column if not exists id                uuid    not null default gen_random_uuid(),
  add column if not exists es_demo           boolean not null default true,
  add column if not exists estado            text    not null default 'activo',
  add column if not exists zona_horaria      text    not null default 'America/Argentina/Buenos_Aires',
  add column if not exists intervalo_min     int     not null default 15,
  add column if not exists anticipacion_min  int     not null default 30,
  add column if not exists cancelacion_horas int     not null default 2;

alter table public.negocios
  add constraint negocios_id_key unique (id),
  add constraint negocios_estado_check check (estado in ('prueba', 'activo', 'suspendido')),
  add constraint negocios_intervalo_check check (intervalo_min between 5 and 120),
  add constraint negocios_anticipacion_check check (anticipacion_min between 0 and 10080),
  add constraint negocios_cancelacion_check check (cancelacion_horas between 0 and 168);

comment on column public.negocios.es_demo is 'true = demo de venta (todo simulado, datos en config). false = negocio real.';
comment on column public.negocios.anticipacion_min is 'No se puede reservar un turno que empiece antes de ahora + estos minutos.';
comment on column public.negocios.cancelacion_horas is 'El cliente puede cancelar hasta estas horas antes del turno.';

-- -------------------------------------------------------------------------------------
-- 3. Tablas
-- -------------------------------------------------------------------------------------
create table public.miembros (
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  rol        text not null check (rol in ('dueno', 'profesional')),
  creado     timestamptz not null default now(),
  primary key (negocio_id, user_id)
);
create index miembros_user_idx on public.miembros (user_id);

create table public.profesionales (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  nombre     text not null check (length(trim(nombre)) between 1 and 60),
  rol        text check (length(rol) <= 60),
  activo     boolean not null default true,
  orden      int not null default 0,
  -- Si el profesional tiene usuario (para ver su agenda). Debe ser miembro 'profesional' del negocio.
  user_id    uuid references auth.users (id) on delete set null,
  unique (negocio_id, id),
  unique (negocio_id, user_id)
);

create table public.servicios (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  nombre     text not null check (length(trim(nombre)) between 1 and 80),
  minutos    int  not null check (minutos between 5 and 720),
  precio     int  not null default 0 check (precio >= 0),
  detalle    text check (length(detalle) <= 200),
  etiqueta   text check (length(etiqueta) <= 40),
  activo     boolean not null default true,
  orden      int not null default 0,
  unique (negocio_id, id)
);

-- Qué servicios hace cada profesional. Un profesional SIN filas acá hace todos los servicios.
create table public.profesional_servicios (
  negocio_id     uuid not null,
  profesional_id uuid not null,
  servicio_id    uuid not null,
  primary key (profesional_id, servicio_id),
  foreign key (negocio_id, profesional_id) references public.profesionales (negocio_id, id) on delete cascade,
  foreign key (negocio_id, servicio_id) references public.servicios (negocio_id, id) on delete cascade
);

-- Horario semanal de cada profesional. Varias filas por día = turno cortado (ej.: 9–13 y 14–20).
create table public.horarios (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null,
  profesional_id uuid not null,
  dia            smallint not null check (dia between 0 and 6), -- 0 = domingo
  desde          time not null,
  hasta          time not null,
  check (hasta > desde),
  foreign key (negocio_id, profesional_id) references public.profesionales (negocio_id, id) on delete cascade
);
create index horarios_prof_dia_idx on public.horarios (profesional_id, dia);

-- Francos, vacaciones, feriados. profesional_id null = cierra todo el negocio.
create table public.bloqueos (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.negocios (id) on delete cascade,
  profesional_id uuid,
  rango          tstzrange not null check (not isempty(rango)),
  motivo         text check (length(motivo) <= 120),
  foreign key (negocio_id, profesional_id) references public.profesionales (negocio_id, id) on delete cascade
);
create index bloqueos_negocio_idx on public.bloqueos using gist (negocio_id, rango);

-- Clientes de cada negocio. user_id null = cliente cargado a mano por el negocio.
create table public.clientes (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete set null,
  nombre     text not null check (length(trim(nombre)) between 1 and 80),
  telefono   text check (length(telefono) <= 30),
  creado     timestamptz not null default now(),
  unique (negocio_id, id),
  unique (negocio_id, user_id)
);
create index clientes_user_idx on public.clientes (user_id);

-- Notas del negocio sobre un cliente: PRIVADAS (el cliente no las ve).
create table public.notas_clientes (
  cliente_id  uuid primary key,
  negocio_id  uuid not null,
  texto       text not null check (length(texto) <= 1000),
  actualizado timestamptz not null default now(),
  foreign key (negocio_id, cliente_id) references public.clientes (negocio_id, id) on delete cascade
);

create table public.turnos (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.negocios (id) on delete cascade,
  cliente_id     uuid not null,
  profesional_id uuid not null,
  servicio_id    uuid not null,
  inicio         timestamptz not null,
  fin            timestamptz not null,
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'cancelado', 'asistio', 'falto')),
  sena           int not null default 0 check (sena >= 0),
  origen         text not null default 'app' check (origen in ('app', 'manual')),
  notas          text check (length(notas) <= 500),
  creado         timestamptz not null default now(),
  creado_por     uuid default auth.uid() references auth.users (id) on delete set null,
  actualizado    timestamptz not null default now(),
  check (fin > inicio),
  foreign key (negocio_id, cliente_id) references public.clientes (negocio_id, id),
  foreign key (negocio_id, profesional_id) references public.profesionales (negocio_id, id),
  foreign key (negocio_id, servicio_id) references public.servicios (negocio_id, id),
  -- LA garantía: un profesional nunca tiene dos turnos activos superpuestos,
  -- aunque dos personas reserven en el mismo instante.
  constraint turnos_sin_superposicion exclude using gist (
    profesional_id with =,
    tstzrange(inicio, fin, '[)') with &&
  ) where (estado <> 'cancelado')
);
create index turnos_negocio_inicio_idx on public.turnos (negocio_id, inicio);
create index turnos_cliente_idx on public.turnos (cliente_id);

create trigger turnos_actualizado before update on public.turnos
  for each row execute function public.tocar_actualizado();

-- -------------------------------------------------------------------------------------
-- 4. Funciones de permisos (las usan las reglas RLS)
-- -------------------------------------------------------------------------------------
create or replace function public.rol_en(p_negocio uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select m.rol from public.miembros m where m.negocio_id = p_negocio and m.user_id = auth.uid();
$$;

create or replace function public.es_dueno(p_negocio uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.es_superadmin() or coalesce(public.rol_en(p_negocio) = 'dueno', false);
$$;

create or replace function public.es_staff(p_negocio uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.es_superadmin() or public.rol_en(p_negocio) is not null;
$$;

create or replace function public.mi_profesional(p_negocio uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.id from public.profesionales p
  join public.miembros m on m.negocio_id = p.negocio_id and m.user_id = p.user_id
  where p.negocio_id = p_negocio and p.user_id = auth.uid();
$$;

create or replace function public.es_mi_cliente(p_cliente uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.clientes c where c.id = p_cliente and c.user_id = auth.uid());
$$;

-- -------------------------------------------------------------------------------------
-- 5. Reglas (RLS)
-- -------------------------------------------------------------------------------------

-- Negocios: cualquiera ve los que no están suspendidos; el dueño edita el suyo; SawaTek crea y borra.
drop policy if exists "Cualquiera ve las demos" on public.negocios;
drop policy if exists "Admins crean demos" on public.negocios;
drop policy if exists "Admins editan demos" on public.negocios;
drop policy if exists "Admins borran demos" on public.negocios;
drop function if exists public.es_admin();

create policy "Ver negocios" on public.negocios for select to anon, authenticated
  using (estado <> 'suspendido' or (select public.es_staff(id)));
create policy "SawaTek crea negocios" on public.negocios for insert to authenticated
  with check ((select public.es_superadmin()));
create policy "Dueño o SawaTek editan" on public.negocios for update to authenticated
  using ((select public.es_dueno(id))) with check ((select public.es_dueno(id)));
create policy "SawaTek borra negocios" on public.negocios for delete to authenticated
  using ((select public.es_superadmin()));

-- El dueño no puede cambiarse el link, el estado ni pasar de demo a real: eso es de SawaTek.
create or replace function public.proteger_negocio()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.es_usuario_app() and not public.es_superadmin() and (
    new.id is distinct from old.id or new.slug is distinct from old.slug or
    new.es_demo is distinct from old.es_demo or new.estado is distinct from old.estado
  ) then
    raise exception 'solo_superadmin' using errcode = '42501',
      hint = 'El link, el estado y si es demo solo los cambia SawaTek.';
  end if;
  return new;
end;
$$;
create trigger negocios_proteger before update on public.negocios
  for each row execute function public.proteger_negocio();

-- Miembros: cada uno ve su membresía; el dueño ve y maneja a sus profesionales; SawaTek todo.
alter table public.miembros enable row level security;
create policy "Ver miembros" on public.miembros for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_dueno(negocio_id)));
create policy "Sumar miembros" on public.miembros for insert to authenticated
  with check ((select public.es_superadmin()) or (rol = 'profesional' and (select public.es_dueno(negocio_id))));
create policy "Cambiar rol" on public.miembros for update to authenticated
  using ((select public.es_superadmin())) with check ((select public.es_superadmin()));
create policy "Quitar miembros" on public.miembros for delete to authenticated
  using ((select public.es_superadmin()) or (rol = 'profesional' and (select public.es_dueno(negocio_id))));

-- Catálogo público (lo necesita la app del cliente); lo edita el dueño.
alter table public.profesionales enable row level security;
alter table public.servicios enable row level security;
alter table public.profesional_servicios enable row level security;
alter table public.horarios enable row level security;

create policy "Ver profesionales" on public.profesionales for select to anon, authenticated using (true);
create policy "Dueño maneja profesionales" on public.profesionales for all to authenticated
  using ((select public.es_dueno(negocio_id))) with check ((select public.es_dueno(negocio_id)));

create policy "Ver servicios" on public.servicios for select to anon, authenticated using (true);
create policy "Dueño maneja servicios" on public.servicios for all to authenticated
  using ((select public.es_dueno(negocio_id))) with check ((select public.es_dueno(negocio_id)));

create policy "Ver qué hace cada profesional" on public.profesional_servicios for select to anon, authenticated using (true);
create policy "Dueño asigna servicios" on public.profesional_servicios for all to authenticated
  using ((select public.es_dueno(negocio_id))) with check ((select public.es_dueno(negocio_id)));

create policy "Ver horarios" on public.horarios for select to anon, authenticated using (true);
create policy "Dueño maneja horarios" on public.horarios for all to authenticated
  using ((select public.es_dueno(negocio_id))) with check ((select public.es_dueno(negocio_id)));

-- Bloqueos: privados (el motivo puede ser personal). Los ve el staff; los maneja el dueño o el propio profesional.
alter table public.bloqueos enable row level security;
create policy "Staff ve bloqueos" on public.bloqueos for select to authenticated
  using ((select public.es_staff(negocio_id)));
create policy "Dueño o el profesional manejan bloqueos" on public.bloqueos for all to authenticated
  using ((select public.es_dueno(negocio_id)) or (profesional_id is not null and profesional_id = (select public.mi_profesional(negocio_id))))
  with check ((select public.es_dueno(negocio_id)) or (profesional_id is not null and profesional_id = (select public.mi_profesional(negocio_id))));

-- Clientes: el staff ve los de su negocio; cada cliente se ve a sí mismo. Nadie ve clientes de otro negocio.
alter table public.clientes enable row level security;
create policy "Ver clientes" on public.clientes for select to authenticated
  using ((select public.es_staff(negocio_id)) or user_id = (select auth.uid()));
create policy "Staff carga clientes" on public.clientes for insert to authenticated
  with check ((select public.es_staff(negocio_id)) and (user_id is null or (select public.es_superadmin())));
create policy "Editar clientes" on public.clientes for update to authenticated
  using ((select public.es_staff(negocio_id)) or user_id = (select auth.uid()))
  with check ((select public.es_staff(negocio_id)) or user_id = (select auth.uid()));
create policy "Dueño borra clientes" on public.clientes for delete to authenticated
  using ((select public.es_dueno(negocio_id)));

-- Una ficha no se puede pasar a otro negocio ni "adueñarse" cambiándole el usuario.
create or replace function public.proteger_cliente()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.es_usuario_app() and not public.es_superadmin()
     and (new.negocio_id is distinct from old.negocio_id or new.user_id is distinct from old.user_id) then
    raise exception 'campo_protegido' using errcode = '42501',
      hint = 'No se puede cambiar el negocio ni el usuario de una ficha de cliente.';
  end if;
  return new;
end;
$$;
create trigger clientes_proteger before update on public.clientes
  for each row execute function public.proteger_cliente();

alter table public.notas_clientes enable row level security;
create policy "Solo el staff ve y escribe notas" on public.notas_clientes for all to authenticated
  using ((select public.es_staff(negocio_id))) with check ((select public.es_staff(negocio_id)));

-- Turnos: el dueño ve todos los de su negocio; el profesional, solo los suyos; el cliente, solo los propios.
-- El cliente NO inserta ni modifica directo: usa reservar_turno / cancelar_turno / confirmar_turno.
alter table public.turnos enable row level security;
create policy "Ver turnos" on public.turnos for select to authenticated
  using (
    (select public.es_dueno(negocio_id))
    or profesional_id = (select public.mi_profesional(negocio_id))
    or (select public.es_mi_cliente(cliente_id))
  );
create policy "Staff carga turnos" on public.turnos for insert to authenticated
  with check ((select public.es_dueno(negocio_id)) or profesional_id = (select public.mi_profesional(negocio_id)));
create policy "Staff actualiza turnos" on public.turnos for update to authenticated
  using ((select public.es_dueno(negocio_id)) or profesional_id = (select public.mi_profesional(negocio_id)))
  with check ((select public.es_dueno(negocio_id)) or profesional_id = (select public.mi_profesional(negocio_id)));
create policy "SawaTek borra turnos" on public.turnos for delete to authenticated
  using ((select public.es_superadmin()));

-- El profesional solo puede cambiar el estado y las notas de sus turnos (no reasignarlos, ni moverlos, ni la seña).
create or replace function public.proteger_turno()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_usuario_app() or public.es_dueno(new.negocio_id) then
    return new; -- dueño, SawaTek, clave secreta o funciones internas (reservar/cancelar/confirmar)
  end if;
  if tg_op = 'INSERT' then
    if new.sena <> 0 or new.origen <> 'manual' or new.estado not in ('pendiente', 'confirmado') then
      raise exception 'carga_invalida' using errcode = '42501',
        hint = 'Un profesional carga turnos manuales, sin seña y pendientes o confirmados.';
    end if;
    return new;
  end if;
  if new.negocio_id is distinct from old.negocio_id or new.cliente_id is distinct from old.cliente_id
     or new.profesional_id is distinct from old.profesional_id or new.servicio_id is distinct from old.servicio_id
     or new.inicio is distinct from old.inicio or new.fin is distinct from old.fin
     or new.sena is distinct from old.sena or new.origen is distinct from old.origen then
    raise exception 'solo_estado' using errcode = '42501',
      hint = 'Un profesional solo puede cambiar el estado y las notas de sus turnos.';
  end if;
  return new;
end;
$$;
create trigger turnos_proteger before insert or update on public.turnos
  for each row execute function public.proteger_turno();

-- -------------------------------------------------------------------------------------
-- 6. Funciones para la app del cliente
-- -------------------------------------------------------------------------------------

-- Horarios libres de un día, calculados en el servidor (la base es la autoridad).
-- p_profesional null = cualquiera: cada horario se asigna al primer profesional libre (por "orden").
create or replace function public.horarios_libres(
  p_negocio uuid, p_servicio uuid, p_dia date, p_profesional uuid default null
)
returns table (inicio timestamptz, profesional_id uuid)
language sql stable security definer set search_path = ''
as $$
  with neg as (
    select n.* from public.negocios n
    where n.id = p_negocio and n.estado = 'activo' and not n.es_demo
  ),
  serv as (
    select s.* from public.servicios s
    where s.id = p_servicio and s.negocio_id = p_negocio and s.activo
  ),
  cand as (
    select p.id, p.orden from public.profesionales p
    where p.negocio_id = p_negocio and p.activo
      and (p_profesional is null or p.id = p_profesional)
      and (
        not exists (select 1 from public.profesional_servicios ps where ps.profesional_id = p.id)
        or exists (select 1 from public.profesional_servicios ps where ps.profesional_id = p.id and ps.servicio_id = p_servicio)
      )
  ),
  ventanas as (
    select h.profesional_id,
           (p_dia + h.desde) at time zone neg.zona_horaria as v_ini,
           (p_dia + h.hasta) at time zone neg.zona_horaria as v_fin
    from public.horarios h
    join cand on cand.id = h.profesional_id
    cross join neg
    where h.dia = extract(dow from p_dia)
  ),
  inicios as (
    select v.profesional_id, g.t as inicio, g.t + make_interval(mins => serv.minutos) as fin
    from ventanas v
    cross join serv
    cross join neg
    cross join lateral generate_series(
      v.v_ini, v.v_fin - make_interval(mins => serv.minutos), make_interval(mins => neg.intervalo_min)
    ) as g(t)
    where g.t >= now() + make_interval(mins => neg.anticipacion_min)
  ),
  libres as (
    select i.inicio, i.profesional_id from inicios i
    where not exists (
        select 1 from public.turnos t
        where t.profesional_id = i.profesional_id and t.estado <> 'cancelado'
          and tstzrange(t.inicio, t.fin, '[)') && tstzrange(i.inicio, i.fin, '[)')
      )
      and not exists (
        select 1 from public.bloqueos b
        where b.negocio_id = p_negocio
          and (b.profesional_id is null or b.profesional_id = i.profesional_id)
          and b.rango && tstzrange(i.inicio, i.fin, '[)')
      )
  )
  select distinct on (l.inicio) l.inicio, l.profesional_id
  from libres l join cand c on c.id = l.profesional_id
  order by l.inicio, c.orden, c.id;
$$;

-- Reservar: valida todo en el servidor. Devuelve el id del turno.
-- Errores (en el mensaje): sin_sesion, negocio_no_disponible, servicio_no_disponible,
-- falta_nombre, demasiados_turnos, horario_no_disponible.
create or replace function public.reservar_turno(
  p_negocio uuid, p_servicio uuid, p_inicio timestamptz,
  p_profesional uuid default null, p_nombre text default null, p_telefono text default null
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_neg public.negocios%rowtype;
  v_serv public.servicios%rowtype;
  v_cliente uuid;
  v_prof uuid;
  v_turno uuid;
  v_dia date;
  v_intento int := 0;
begin
  if v_uid is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;

  select * into v_neg from public.negocios where id = p_negocio;
  if not found or v_neg.es_demo or v_neg.estado <> 'activo' then
    raise exception 'negocio_no_disponible' using errcode = 'P0001';
  end if;

  select * into v_serv from public.servicios where id = p_servicio and negocio_id = p_negocio and activo;
  if not found then
    raise exception 'servicio_no_disponible' using errcode = 'P0001';
  end if;

  -- Las reservas de un mismo negocio se hacen de a una (dura milisegundos): así el límite de turnos,
  -- la creación del cliente y el chequeo de horario no tienen carreras ni se traban entre sí.
  perform pg_advisory_xact_lock(hashtextextended(p_negocio::text, 0));
  perform set_config('sawatek.interno', 'si', true);

  -- Cliente del negocio (se crea la primera vez).
  select id into v_cliente from public.clientes where negocio_id = p_negocio and user_id = v_uid;
  if v_cliente is null then
    if coalesce(trim(p_nombre), '') = '' then
      raise exception 'falta_nombre' using errcode = 'P0001';
    end if;
    insert into public.clientes (negocio_id, user_id, nombre, telefono)
    values (p_negocio, v_uid, trim(p_nombre), nullif(trim(p_telefono), ''))
    returning id into v_cliente;
  end if;

  -- Anti abuso: como máximo 3 turnos activos a futuro por cliente y negocio.
  if (select count(*) from public.turnos
      where cliente_id = v_cliente and estado in ('pendiente', 'confirmado') and inicio > now()) >= 3 then
    raise exception 'demasiados_turnos' using errcode = 'P0001';
  end if;

  v_dia := (p_inicio at time zone v_neg.zona_horaria)::date;

  -- Hasta 3 intentos: si otra persona toma el horario en el mismo instante, se prueba con otro profesional libre.
  loop
    v_intento := v_intento + 1;
    select hl.profesional_id into v_prof
    from public.horarios_libres(p_negocio, p_servicio, v_dia, p_profesional) hl
    where hl.inicio = p_inicio;

    if v_prof is null then
      raise exception 'horario_no_disponible' using errcode = 'P0001';
    end if;

    begin
      insert into public.turnos (negocio_id, cliente_id, profesional_id, servicio_id, inicio, fin, origen)
      values (p_negocio, v_cliente, v_prof, p_servicio, p_inicio, p_inicio + make_interval(mins => v_serv.minutos), 'app')
      returning id into v_turno;
      return v_turno;
    exception when exclusion_violation or deadlock_detected then
      -- choque con una carga manual del negocio en el mismo instante: se reintenta
      if v_intento >= 3 then
        raise exception 'horario_no_disponible' using errcode = 'P0001';
      end if;
    end;
  end loop;
end;
$$;

-- Cancelar (cliente): solo sus turnos, activos, y respetando el plazo del negocio.
create or replace function public.cancelar_turno(p_turno uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_t public.turnos%rowtype;
  v_horas int;
begin
  select t.* into v_t from public.turnos t
  join public.clientes c on c.id = t.cliente_id
  where t.id = p_turno and c.user_id = auth.uid();
  if not found then
    raise exception 'turno_no_encontrado' using errcode = 'P0001';
  end if;
  if v_t.estado not in ('pendiente', 'confirmado') or v_t.inicio <= now() then
    raise exception 'turno_no_cancelable' using errcode = 'P0001';
  end if;
  select cancelacion_horas into v_horas from public.negocios where id = v_t.negocio_id;
  if v_t.inicio - now() < make_interval(hours => v_horas) then
    raise exception 'fuera_de_plazo' using errcode = 'P0001';
  end if;
  perform set_config('sawatek.interno', 'si', true);
  update public.turnos set estado = 'cancelado' where id = p_turno;
end;
$$;

-- Confirmar asistencia (cliente): solo sus turnos pendientes y futuros.
create or replace function public.confirmar_turno(p_turno uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  perform set_config('sawatek.interno', 'si', true);
  update public.turnos t set estado = 'confirmado'
  from public.clientes c
  where t.id = p_turno and c.id = t.cliente_id and c.user_id = auth.uid()
    and t.estado = 'pendiente' and t.inicio > now();
  if not found then
    raise exception 'turno_no_confirmable' using errcode = 'P0001';
  end if;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 7. Permisos de ejecución y de tablas
-- -------------------------------------------------------------------------------------
revoke all on function public.es_usuario_app(), public.es_superadmin(), public.rol_en(uuid), public.es_dueno(uuid), public.es_staff(uuid),
  public.mi_profesional(uuid), public.es_mi_cliente(uuid), public.horarios_libres(uuid, uuid, date, uuid),
  public.reservar_turno(uuid, uuid, timestamptz, uuid, text, text), public.cancelar_turno(uuid),
  public.confirmar_turno(uuid), public.proteger_negocio(), public.proteger_turno(), public.proteger_cliente() from public;

grant execute on function public.es_usuario_app(), public.es_superadmin(), public.rol_en(uuid), public.es_dueno(uuid), public.es_staff(uuid),
  public.mi_profesional(uuid), public.es_mi_cliente(uuid) to anon, authenticated;
grant execute on function public.horarios_libres(uuid, uuid, date, uuid) to anon, authenticated;
grant execute on function public.reservar_turno(uuid, uuid, timestamptz, uuid, text, text),
  public.cancelar_turno(uuid), public.confirmar_turno(uuid) to authenticated;

grant select on public.profesionales, public.servicios, public.profesional_servicios, public.horarios to anon, authenticated;
grant select, insert, update, delete on public.miembros, public.profesionales, public.servicios,
  public.profesional_servicios, public.horarios, public.bloqueos, public.clientes, public.notas_clientes, public.turnos to authenticated;

-- Defensa extra: además de RLS, el visitante anónimo no tiene ningún permiso sobre las tablas privadas,
-- y nadie de la app puede vaciar tablas (TRUNCATE) ni crearles triggers o referencias.
revoke all on public.superadmins, public.miembros, public.bloqueos, public.clientes, public.notas_clientes, public.turnos from anon;
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
