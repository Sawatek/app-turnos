-- El visitante anónimo ve los profesionales de un negocio (nombre, rol, orden) pero no qué cuenta
-- de usuario tienen vinculada: esa columna queda solo para usuarios con sesión (el staff la usa).
revoke select on public.profesionales from anon;
grant select (id, negocio_id, nombre, rol, activo, orden) on public.profesionales to anon;
