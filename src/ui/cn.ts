/**
 * Une clases condicionales y resuelve conflictos de Tailwind: cn('rounded-medio', cond && 'rounded-full') → 'rounded-full'.
 * Gana la última clase de cada grupo, así quien usa un componente puede pisar sus clases sin `!`.
 *
 * tailwind-merge (v3) no conoce los tokens propios de `@theme` (src/estilos.css): sin registrarlos acá,
 * `text-entrada` se tomaría como un color y `cn('text-entrada text-suave')` borraría el tamaño.
 * Si agregás un token de radio, tamaño de texto, fuente o curva en `@theme`, sumalo también acá.
 */
import { extendTailwindMerge } from 'tailwind-merge'

const unir = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['chico', 'medio', 'grande'],
      text: ['portada', 'titular', 'entrada', 'subtitular', 'destacado', 'numeral', 'gigante'],
      font: ['editorial'],
      ease: ['resorte', 'salida', 'suave'],
    },
  },
})

export const cn = (...c: (string | false | null | undefined)[]) => unir(c.filter(Boolean).join(' '))
