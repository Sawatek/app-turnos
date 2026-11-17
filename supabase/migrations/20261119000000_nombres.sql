-- Nombres de las personas.
-- El nombre de cada usuario vive en su cuenta: auth.users.raw_user_meta_data ->> 'display_name'
-- (es el "Display name" que muestra Supabase). Cada uno lo puede editar desde la app (auth.updateUser).
--   · invitaciones.nombre: el nombre de la persona invitada (dueño o profesional).
--   · aceptar_invitaciones(): si la cuenta todavía no tiene nombre, toma el de la invitación o el de su ficha de profesional.
--   · panel_miembros(): devuelve también el nombre.
--   · crear_negocio_real(): recibe el nombre del dueño.

alter table public.invitaciones
  add column if not exists nombre text check (length(trim(nombre)) between 1 and 80);

-- Nombre de un usuario (para usar dentro de otras funciones).
create or replace function public.nombre_de_usuario(p_user uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select nullif(trim(u.raw_user_meta_data ->> 'display_name'), '') from auth.users u where u.id = p_user;
$$;
revoke all on function public.nombre_de_usuario(uuid) from public, anon, authenticated;

create or replace function public.aceptar_invitaciones()
returns int
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv record;
  v_n int := 0;
  v_nombre text;
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
    -- Si la cuenta no tiene nombre, usa el de la invitación o el de su ficha de profesional.
    if public.nombre_de_usuario(v_uid) is null then
      v_nombre := coalesce(
        nullif(trim(v_inv.nombre), ''),
        (select p.nombre from public.profesionales p where p.id = v_inv.profesional_id)
      );
      if v_nombre is not null then
        update auth.users
        set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', v_nombre)
        where id = v_uid;
      end if;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

drop function if exists public.panel_miembros(uuid);
create or replace function public.panel_miembros(p_negocio uuid)
returns table (user_id uuid, email text, nombre text, rol text, profesional_id uuid, profesional text, creado timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.es_dueno(p_negocio) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  return query
  select m.user_id, u.email::text,
         coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), p.nombre),
         m.rol, p.id, p.nombre, m.creado
  from public.miembros m
  join auth.users u on u.id = m.user_id
  left join public.profesionales p on p.negocio_id = m.negocio_id and p.user_id = m.user_id
  where m.negocio_id = p_negocio
  order by m.rol, u.email;
end;
$$;

-- crear_negocio_real con el nombre del dueño (opcional). Se reemplaza la versión de 3 parámetros.
drop function if exists public.crear_negocio_real(text, jsonb, text);
create or replace function public.crear_negocio_real(p_slug text, p_config jsonb, p_email_dueno text, p_nombre_dueno text default null)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_map jsonb := '{}'::jsonb;
  v_sid uuid;
  v_pid uuid;
  v_dia int;
  v_ventanas jsonb;
  v_v jsonb;
  r record;
  h jsonb := coalesce(p_config -> 'horario', '{}'::jsonb);
begin
  if not public.es_superadmin() then
    raise exception 'solo_superadmin' using errcode = '42501';
  end if;
  if coalesce(trim(p_email_dueno), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'mail_invalido' using errcode = 'P0001';
  end if;

  insert into public.negocios (slug, config, es_demo, estado, intervalo_min)
  values (p_slug, p_config || jsonb_build_object('slug', p_slug), false, 'activo', coalesce((h ->> 'intervalo')::int, 15))
  returning id into v_id;

  for r in select e.value as s, e.ordinality as orden
           from jsonb_array_elements(coalesce(p_config -> 'servicios', '[]'::jsonb)) with ordinality e(value, ordinality) loop
    insert into public.servicios (negocio_id, nombre, minutos, precio, detalle, etiqueta, orden)
    values (v_id, r.s ->> 'nombre', (r.s ->> 'minutos')::int, coalesce((r.s ->> 'precio')::int, 0),
            r.s ->> 'detalle', r.s ->> 'etiqueta', r.orden - 1)
    returning id into v_sid;
    v_map := v_map || jsonb_build_object(r.s ->> 'id', v_sid);
  end loop;

  if jsonb_typeof(h -> 'descanso') = 'array' then
    v_ventanas := jsonb_build_array(
      jsonb_build_array(h ->> 'desde', h -> 'descanso' ->> 0),
      jsonb_build_array(h -> 'descanso' ->> 1, h ->> 'hasta'));
  else
    v_ventanas := jsonb_build_array(jsonb_build_array(h ->> 'desde', h ->> 'hasta'));
  end if;

  for r in select e.value as p, e.ordinality as orden
           from jsonb_array_elements(coalesce(p_config -> 'staff', '[]'::jsonb)) with ordinality e(value, ordinality) loop
    insert into public.profesionales (negocio_id, nombre, rol, orden)
    values (v_id, r.p ->> 'nombre', r.p ->> 'rol', r.orden - 1)
    returning id into v_pid;

    insert into public.profesional_servicios (negocio_id, profesional_id, servicio_id)
    select v_id, v_pid, (v_map ->> sid)::uuid
    from jsonb_array_elements_text(coalesce(r.p -> 'servicios', '[]'::jsonb)) sid
    where v_map ? sid;

    for v_dia in select (d)::int from jsonb_array_elements_text(coalesce(h -> 'dias', '[]'::jsonb)) d loop
      for v_v in select * from jsonb_array_elements(v_ventanas) loop
        insert into public.horarios (negocio_id, profesional_id, dia, desde, hasta)
        values (v_id, v_pid, v_dia, (v_v ->> 0)::time, (v_v ->> 1)::time);
      end loop;
    end loop;
  end loop;

  insert into public.invitaciones (negocio_id, email, rol, nombre)
  values (v_id, lower(trim(p_email_dueno)), 'dueno', nullif(trim(p_nombre_dueno), ''));
  return v_id;
end;
$$;

revoke all on function public.crear_negocio_real(text, jsonb, text, text) from public;
grant execute on function public.crear_negocio_real(text, jsonb, text, text) to authenticated;
revoke all on function public.panel_miembros(uuid) from public, anon;
grant execute on function public.panel_miembros(uuid) to authenticated;
