import { cn } from './cn'

interface Props extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Parte principal (arriba del troquel). */
  cuerpo: React.ReactNode
  /** El talón que se corta (abajo del troquel). Sin esto, es un ticket entero sin corte. */
  talon?: React.ReactNode
  /** Color del papel. Por defecto la superficie; 'acento' para el talón protagonista. */
  papel?: 'superficie' | 'acento' | 'fondo'
  as?: 'article' | 'div' | 'section'
  /** Sello que muerde el troquel (pisa el corte, a la derecha), como un sello real sobre el talón. */
  sello?: React.ReactNode
}

const PAPEL = {
  superficie: 'bg-superficie',
  acento: 'bg-acento text-sobre-acento',
  fondo: 'bg-fondo',
}

/**
 * Talón troquelado: el turno como el ticket que se saca en el mostrador.
 * Dos partes con muescas que coinciden en la unión (mida lo que mida cada una) y un renglón punteado de corte.
 * El contorno fino sigue las muescas (drop-shadow en una capa propia).
 *
 * Rendimiento: el sello va AFUERA de la capa con filtro. Si quedara adentro, cualquier animación del sello (el golpe,
 * o el sello atado al scroll) obligaría a recalcular el filtro de todo el talón en cada cuadro. Para ubicarlo justo en
 * el corte sin medir nada: el contenedor es una grilla de dos filas (cuerpo y talón), la capa con filtro las ocupa
 * con subgrid y el sello va en la segunda fila, subido a la mitad.
 */
export function Talon({ cuerpo, talon, papel = 'superficie', as: Elemento = 'article', sello, className, ...resto }: Props) {
  return (
    <Elemento className={cn('grid', className)} {...resto}>
      <div className={cn('contorno-talon col-start-1 row-start-1 grid', !!talon && 'row-span-2 grid-rows-subgrid')}>
        <div className={cn('rounded-t-grande', talon ? 'muesca-abajo' : 'rounded-b-grande', PAPEL[papel])}>{cuerpo}</div>
        {talon && (
          <div className={cn('muesca-arriba relative rounded-b-grande', PAPEL[papel])}>
            <div
              aria-hidden
              className={cn('troquel absolute inset-x-[calc(var(--muesca)+6px)] top-0 h-[1.5px]', papel === 'acento' && 'opacity-60 [--t-linea:var(--t-sobre-acento)]')}
            />
            {talon}
          </div>
        )}
      </div>
      {!!sello && !!talon && <div className="relative z-10 col-start-1 row-start-2 mr-5 -translate-y-1/2 self-start justify-self-end">{sello}</div>}
    </Elemento>
  )
}
