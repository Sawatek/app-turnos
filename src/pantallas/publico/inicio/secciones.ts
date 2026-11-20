// Las secciones numeradas de la landing, en orden. Es la única fuente de:
// - el orden en que se arma la página (Inicio.tsx las recorre),
// - el número y el texto de cada folio ("02 — Cómo funciona"),
// - el ancla de cada una (#id) y el id de su h2 (t-<id>),
// - la navegación del encabezado y del menú "Secciones" del celular (las que tienen `nav`).
// Reordenar la página = mover una línea. La portada no va acá: no lleva número.

export const SECCIONES = [
  { id: 'problema', folio: 'El problema' },
  { id: 'como-funciona', folio: 'Cómo funciona', nav: 'Cómo funciona' },
  { id: 'precios', folio: 'Precios', nav: 'Precios' },
  { id: 'tu-marca', folio: 'Tu marca y funciones', nav: 'Funciones' },
  { id: 'rubros', folio: 'Rubros', nav: 'Rubros' },
  { id: 'preguntas', folio: 'Dudas', nav: 'Preguntas' },
  { id: 'final', folio: 'Tu turno' },
] as const satisfies readonly { id: string; folio: string; nav?: string }[]

export type IdSeccion = (typeof SECCIONES)[number]['id']

/** Número de folio de una sección según su lugar en la lista: "01", "02"… */
export const numeroSeccion = (id: IdSeccion) => String(SECCIONES.findIndex((s) => s.id === id) + 1).padStart(2, '0')

/** Las secciones que van en la navegación, con su número y su texto. */
export const NAV = SECCIONES.filter((s): s is Extract<(typeof SECCIONES)[number], { nav: string }> => 'nav' in s).map((s) => ({
  href: `#${s.id}`,
  texto: s.nav,
  n: numeroSeccion(s.id),
}))
