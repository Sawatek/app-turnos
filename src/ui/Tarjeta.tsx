import { useId } from 'react'
import { cn } from './cn'

interface Props {
  titulo?: string
  bajada?: string
  /**
   * Nivel del título. 2: tarjeta principal de una sección (título más grande, bajada y más aire);
   * 3 (por defecto): tarjeta dentro de una sección que ya tiene su h2.
   */
  nivel?: 2 | 3
  id?: string
  className?: string
  children: React.ReactNode
}

/**
 * Ficha: recuadro con su encabezado separado por una línea fina (como una ficha de archivo).
 * Se anuncia como región (el título le da nombre).
 */
export function Tarjeta({ titulo, bajada, nivel = 3, id, className, children }: Props) {
  const idTitulo = useId()
  const Titulo = nivel === 2 ? 'h2' : 'h3'
  const encabezado = titulo || bajada
  return (
    <section aria-labelledby={titulo ? idTitulo : undefined} id={id} className={cn('rounded-grande bg-superficie ring-1 ring-linea', className)}>
      {encabezado && (
        <header className={cn('border-b border-linea px-4 pt-3.5 pb-3', nivel === 2 && 'sm:px-5 sm:pt-4')}>
          {titulo && (
            <Titulo id={idTitulo} className={cn('titulo', nivel === 2 ? 'text-xl' : 'text-[17px]')}>
              {titulo}
            </Titulo>
          )}
          {bajada && <p className="mt-0.5 text-sm text-suave">{bajada}</p>}
        </header>
      )}
      <div className={cn('p-4', nivel === 2 && 'sm:p-5')}>{children}</div>
    </section>
  )
}
