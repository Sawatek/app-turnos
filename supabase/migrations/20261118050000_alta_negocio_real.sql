-- Alta de un negocio REAL por SawaTek, de una sola vez (todo o nada):
-- crea el negocio, sus servicios, profesionales, qué hace cada uno y sus horarios a partir de la plantilla
-- del rubro (que viaja en la configuración), y deja invitado al dueño por mail.
-- El dueño entra después a /<slug>/panel con su cuenta y la invitación se acepta sola.
create or replace function public.crear_negocio_real(p_slug text, p_config jsonb, p_email_dueno text)
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

  -- Servicios (se guarda la equivalencia id de plantilla → id real).
  for r in select e.value as s, e.ordinality as orden
           from jsonb_array_elements(coalesce(p_config -> 'servicios', '[]'::jsonb)) with ordinality e(value, ordinality) loop
    insert into public.servicios (negocio_id, nombre, minutos, precio, detalle, etiqueta, orden)
    values (v_id, r.s ->> 'nombre', (r.s ->> 'minutos')::int, coalesce((r.s ->> 'precio')::int, 0),
            r.s ->> 'detalle', r.s ->> 'etiqueta', r.orden - 1)
    returning id into v_sid;
    v_map := v_map || jsonb_build_object(r.s ->> 'id', v_sid);
  end loop;

  -- Franjas del día: de "desde" a "hasta", partido por el descanso si hay.
  if jsonb_typeof(h -> 'descanso') = 'array' then
    v_ventanas := jsonb_build_array(
      jsonb_build_array(h ->> 'desde', h -> 'descanso' ->> 0),
      jsonb_build_array(h -> 'descanso' ->> 1, h ->> 'hasta'));
  else
    v_ventanas := jsonb_build_array(jsonb_build_array(h ->> 'desde', h ->> 'hasta'));
  end if;

  -- Profesionales, qué servicios hacen y sus horarios.
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

  insert into public.invitaciones (negocio_id, email, rol) values (v_id, lower(trim(p_email_dueno)), 'dueno');
  return v_id;
end;
$$;

revoke all on function public.crear_negocio_real(text, jsonb, text) from public;
grant execute on function public.crear_negocio_real(text, jsonb, text) to authenticated;
