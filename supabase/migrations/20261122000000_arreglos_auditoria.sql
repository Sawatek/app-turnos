-- Arreglos de la auditoría de seguridad (17/11/2026). Re-ejecutable.
-- 1. Miembros: el dueño ya no suma cuentas directo; la membresía nace de una invitación aceptada
--    (aceptar_invitaciones) o la da SawaTek (admin_sumar_miembro).
-- 2. WhatsApp: en las fichas con cuenta, el destino es SOLO el celular verificado de la cuenta.
-- 3. Tope de cancelaciones del cliente y enfriamiento del aviso de lista de espera.
-- 4. Push: un endpoint es de un solo usuario (al cambiar de cuenta, se borran las del anterior).

-- -------------------------------------------------------------------------------------
-- 1. Miembros solo por invitación
-- -------------------------------------------------------------------------------------
drop policy if exists "Sumar miembros" on public.miembros;
create policy "Sumar miembros" on public.miembros for insert to authenticated
  with check ((select public.es_superadmin()));

-- -------------------------------------------------------------------------------------
-- 2. Destino de WhatsApp verificado
-- Ficha con cuenta (user_id): el celular con el que entró (auth.users.phone, sin "+").
-- Ficha cargada por el staff (sin cuenta): el teléfono de la ficha.
-- -------------------------------------------------------------------------------------
create or replace function public.telefono_cliente(p_cliente uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select case when c.user_id is null then public.normalizar_telefono(c.telefono)
              else public.normalizar_telefono('+' || u.phone) end
  from public.clientes c
  left join auth.users u on u.id = c.user_id
  where c.id = p_cliente;
$$;

create or replace function public.telefono_es_del_turno(p_turno uuid, p_telefono text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.normalizar_telefono(p_telefono) = public.telefono_cliente(t.cliente_id), false)
  from public.turnos t
  where t.id = p_turno;
$$;

revoke all on function public.telefono_cliente(uuid), public.telefono_es_del_turno(uuid, text) from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 3a. Cancelar (cliente): además, como mucho 3 cancelaciones por día en el mismo negocio
-- (cada cancelación manda WhatsApp pagos: al cliente y a la lista de espera).
-- -------------------------------------------------------------------------------------
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
  if (select count(*) from public.turnos t
      where t.cliente_id = v_t.cliente_id and t.estado = 'cancelado' and t.actualizado > now() - interval '1 day') >= 3 then
    raise exception 'demasiadas_cancelaciones' using errcode = 'P0001';
  end if;
  perform set_config('sawatek.interno', 'si', true);
  update public.turnos set estado = 'cancelado' where id = p_turno;
end;
$$;

revoke all on function public.cancelar_turno(uuid) from public, anon;
grant execute on function public.cancelar_turno(uuid) to authenticated;

-- -------------------------------------------------------------------------------------
-- 3b. Lista de espera: a quien ya se le avisó en las últimas 12 h, no se le vuelve a avisar.
-- (Igual a la de 20261120300000_cliente_completo.sql, con el enfriamiento en el where.)
-- -------------------------------------------------------------------------------------
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
      -- Enfriamiento: si alguna de sus anotaciones de ese día y servicio ya se avisó hace poco, se saltea.
      having bool_and(le.avisado is null or le.avisado < now() - interval '12 hours')
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

revoke all on function public.turnos_avisar_lista_espera() from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 4. Push: el endpoint (este navegador) queda solo para el usuario que lo registra.
-- -------------------------------------------------------------------------------------
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
  -- Si este navegador estaba suscripto con otra cuenta (en cualquier negocio), deja de recibir lo de esa cuenta.
  delete from public.push_suscripciones where endpoint = p_endpoint and user_id <> v_uid;
  insert into public.push_suscripciones (user_id, negocio_id, endpoint, p256dh, auth)
  values (v_uid, p_negocio, p_endpoint, p_p256dh, p_auth)
  on conflict (negocio_id, endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.guardar_push(uuid, text, text, text) from public, anon;
grant execute on function public.guardar_push(uuid, text, text, text) to authenticated;
