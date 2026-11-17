-- El dueño no puede vincular a un profesional un usuario que no es miembro de su negocio
-- (no daba acceso, porque mi_profesional() exige membresía, pero así queda prolijo y sin sorpresas).
create or replace function public.proteger_profesional()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.user_id is null or not public.es_usuario_app() or public.es_superadmin() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.user_id is not distinct from old.user_id then
      return new;
    end if;
  end if;
  if not exists (select 1 from public.miembros m where m.negocio_id = new.negocio_id and m.user_id = new.user_id) then
    raise exception 'usuario_no_es_miembro' using errcode = '42501',
      hint = 'Primero invitá a esa persona al negocio.';
  end if;
  return new;
end;
$$;

drop trigger if exists profesionales_proteger on public.profesionales;
create trigger profesionales_proteger before insert or update on public.profesionales
  for each row execute function public.proteger_profesional();

revoke all on function public.proteger_profesional() from public;
