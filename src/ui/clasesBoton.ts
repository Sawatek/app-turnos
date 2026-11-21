// Clases de los botones, sin dependencias pesadas: las usan Boton (con motion) y Enlace (que va en la portada,
// donde no queremos cargar motion).
import { cn } from './cn'

export type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'wa'
export type Tamano = 'chico' | 'medio' | 'grande'

// Un solo mapa de variantes para Boton y Enlace. Las que tienen fondo aclaran al pasar el mouse;
// las transparentes (fantasma, peligro) se tiñen, porque el brillo no se notaría.
const VARIANTES: Record<Variante, string> = {
  // Primario: tecla de la marca, con un filo más oscuro abajo (se "hunde" al apretar).
  primario: 'bg-acento text-sobre-acento shadow-[inset_0_-3px_0_rgb(0_0_0/0.16)] hover:brightness-105 active:translate-y-px active:shadow-[inset_0_-1px_0_rgb(0_0_0/0.16)]',
  secundario: 'bg-superficie text-texto ring-1 ring-inset ring-linea hover:bg-superficie-2 hover:ring-suave/60',
  fantasma: 'bg-transparent text-acento-texto hover:bg-acento-suave',
  peligro: 'bg-transparent text-peligro hover:bg-peligro/10',
  wa: 'bg-wa text-[#062b14] hover:brightness-105',
}
// Alto MÍNIMO (no fijo): todos llegan a los 44 px táctiles y, si el texto no entra en una línea, crecen en vez de cortarlo.
const TAMANOS: Record<Tamano, string> = {
  chico: 'min-h-11 px-3.5 py-2 text-sm gap-1.5',
  medio: 'min-h-12 px-5 py-2.5 text-[15px] gap-2',
  grande: 'min-h-14 px-6 py-3 text-base gap-2.5',
}

/** Clases de un botón (para usar en <button>, <Link> o <a>). Lo que se pase después en `cn` las pisa. */
export function clasesBoton({ variante = 'primario', tamano = 'medio', ancho }: { variante?: Variante; tamano?: Tamano; ancho?: boolean } = {}) {
  return cn(
    'inline-flex select-none items-center justify-center rounded-medio text-center font-semibold transition-[background-color,filter,opacity,translate,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-45',
    VARIANTES[variante],
    TAMANOS[tamano],
    ancho && 'w-full',
  )
}
