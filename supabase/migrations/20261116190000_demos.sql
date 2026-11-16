-- Demos de SawaTek Turnos.
-- Cada fila es la configuración de la app de un negocio (marca, servicios, staff, horarios, textos).
-- Cualquiera puede LEER una demo (así el link y el QR abren en el celular del prospecto);
-- solo los administradores de SawaTek pueden crear, editar o borrar.

-- Administradores: se cargan a mano desde el SQL Editor (no hay API para verlos ni editarlos):
--   insert into public.admins (email) values ('tu-mail@ejemplo.com');
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);
alter table public.admins enable row level security;
-- Sin políticas: nadie la lee ni la escribe por la API. Solo la función de abajo.

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

create table if not exists public.negocios (
  slug        text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  config      jsonb not null check (jsonb_typeof(config) = 'object' and config ->> 'slug' = slug),
  creado_por  uuid default auth.uid() references auth.users (id) on delete set null,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  -- El logo viaja dentro de la config (256 px, webp): se limita el tamaño para que nadie suba cualquier cosa.
  constraint config_liviana check (pg_column_size(config) < 300000)
);

comment on table public.negocios is 'Configuración de cada demo (app de turnos con la marca de un negocio).';

create or replace function public.tocar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

drop trigger if exists negocios_actualizado on public.negocios;
create trigger negocios_actualizado
  before update on public.negocios
  for each row execute function public.tocar_actualizado();

alter table public.negocios enable row level security;

drop policy if exists "Cualquiera ve las demos" on public.negocios;
create policy "Cualquiera ve las demos"
  on public.negocios for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins crean demos" on public.negocios;
create policy "Admins crean demos"
  on public.negocios for insert
  to authenticated
  with check ((select public.es_admin()));

drop policy if exists "Admins editan demos" on public.negocios;
create policy "Admins editan demos"
  on public.negocios for update
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "Admins borran demos" on public.negocios;
create policy "Admins borran demos"
  on public.negocios for delete
  to authenticated
  using ((select public.es_admin()));

grant select on public.negocios to anon, authenticated;
grant insert, update, delete on public.negocios to authenticated;
