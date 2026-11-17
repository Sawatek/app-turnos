-- Bloqueo de un negocio por falta de pago (estado 'suspendido').
--
-- Solo SawaTek lo bloquea o desbloquea: el estado lo cambia el superadmin desde la consola
-- (admin_actualizar_negocio) o, más adelante, la integración con Mercado Pago (clave secreta). El dueño
-- nunca puede cambiar su propio estado (ya lo impide proteger_negocio / cuidar_config_negocio).
--
-- Mientras está bloqueado:
--   · El dueño y los profesionales PIERDEN todo permiso sobre el negocio: rol_en() y mi_profesional()
--     dejan de devolver su rol, así que es_dueno(), es_staff() y todas las reglas (RLS, panel_*, triggers)
--     que se apoyan en ellas los tratan como ajenos. El superadmin no se ve afectado.
--   · Su panel muestra el cartel de pago pendiente: rol_en_bloqueado() le dice al panel que la persona es
--     del equipo pero está bloqueada (y con qué rol, para el texto).
--   · La app de los clientes no abre ni toma turnos (como ya pasaba con 'suspendido'); negocio_bloqueado()
--     da solo la marca, para mostrar "no disponible por el momento" en vez de "no existe".
--   · No sale ningún mensaje del negocio: tomar_mensajes() los saltea y quedan en la cola. Al desbloquear
--     salen solos los que todavía tienen sentido; los de turnos que ya empezaron se descartan como siempre.
--
-- Re-ejecutable (create or replace).

-- -------------------------------------------------------------------------------------
-- 1. Roles: un negocio bloqueado no le da rol a nadie de su equipo
-- -------------------------------------------------------------------------------------
create or replace function public.rol_en(p_negocio uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select m.rol
  from public.miembros m
  join public.negocios n on n.id = m.negocio_id
  where m.negocio_id = p_negocio and m.user_id = auth.uid() and n.estado <> 'suspendido';
$$;

create or replace function public.mi_profesional(p_negocio uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.id
  from public.profesionales p
  join public.miembros m on m.negocio_id = p.negocio_id and m.user_id = p.user_id
  join public.negocios n on n.id = p.negocio_id
  where p.negocio_id = p_negocio and p.user_id = auth.uid() and n.estado <> 'suspendido';
$$;

-- Rol de la persona en un negocio BLOQUEADO ('dueno' | 'profesional'), o null si no está bloqueado o si no
-- es de su equipo. Solo sirve para que el panel muestre el cartel correcto: no da ningún permiso.
create or replace function public.rol_en_bloqueado(p_negocio uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select m.rol
  from public.miembros m
  join public.negocios n on n.id = m.negocio_id
  where m.negocio_id = p_negocio and m.user_id = auth.uid() and n.estado = 'suspendido';
$$;

-- -------------------------------------------------------------------------------------
-- 2. Marca de un negocio bloqueado (la fila no es visible: solo id y configuración pública)
-- -------------------------------------------------------------------------------------
-- Devuelve { id, config } de un negocio REAL bloqueado, o null. Con esto la app del cliente dice
-- "no disponible por el momento" con la marca del negocio, y el panel puede mostrar su ingreso.
create or replace function public.negocio_bloqueado(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('id', n.id, 'config', n.config)
  from public.negocios n
  where n.slug = p_slug and not n.es_demo and n.estado = 'suspendido';
$$;

-- -------------------------------------------------------------------------------------
-- 3. Mensajes: los de un negocio bloqueado esperan en la cola
-- -------------------------------------------------------------------------------------
create or replace function public.tomar_mensajes(p_limite int default 50, p_negocio uuid default null)
returns setof public.mensajes
language plpgsql volatile security definer set search_path = ''
as $$
begin
  -- Lo que ya no tiene sentido mandar.
  update public.mensajes m set estado = 'cancelado', error = 'vencido: el turno ya empezó'
  from public.turnos t
  where m.turno_id = t.id and m.estado = 'pendiente' and m.programado <= now()
    and m.tipo in ('confirmacion', 'recordatorio24', 'recordatorio2') and t.inicio <= now();
  update public.mensajes set estado = 'cancelado', error = 'vencido: el código ya expiró'
  where estado = 'pendiente' and tipo = 'codigo' and creado < now() - interval '15 minutes';

  return query
  update public.mensajes m
  set estado = 'enviando', intentos = m.intentos + 1, tomado = now()
  where m.id in (
    select x.id from public.mensajes x
    where ((x.estado = 'pendiente' and x.programado <= now())
           or (x.estado = 'enviando' and x.tomado < now() - interval '10 minutes'))
      and (p_negocio is null or x.negocio_id = p_negocio)
      -- Negocio bloqueado por falta de pago: no sale nada hasta que se desbloquee.
      and not exists (select 1 from public.negocios n where n.id = x.negocio_id and n.estado = 'suspendido')
    order by x.programado
    limit greatest(1, least(coalesce(p_limite, 50), 500))
    for update skip locked
  )
  returning m.*;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 4. Permisos de ejecución
-- -------------------------------------------------------------------------------------
revoke all on function public.rol_en(uuid), public.mi_profesional(uuid), public.rol_en_bloqueado(uuid),
  public.negocio_bloqueado(text), public.tomar_mensajes(int, uuid) from public;
grant execute on function public.rol_en(uuid), public.mi_profesional(uuid) to anon, authenticated;
grant execute on function public.rol_en_bloqueado(uuid) to authenticated;
grant execute on function public.negocio_bloqueado(text) to anon, authenticated;
grant execute on function public.tomar_mensajes(int, uuid) to service_role;
