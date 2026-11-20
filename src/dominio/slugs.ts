// Links de los negocios. Módulo puro (sin dependencias) para poder usarlo también desde middleware.ts.

/** Links que usa la plataforma: ningún negocio puede llamarse así. */
export const SLUGS_RESERVADOS = new Set([
  'admin', 'demos', 'terminos', 'privacidad', 'mis-turnos', 'm', 'assets', 'api', 'panel', 'login', 'ingresar',
  'precios', 'ayuda', 'contacto', 'sawatek', 'app', 'www', 'icono', 'manifest', 'sw', 'workbox',
])

/** Forma válida de un link (la misma regla que el check de la tabla negocios). */
export const FORMA_SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/
