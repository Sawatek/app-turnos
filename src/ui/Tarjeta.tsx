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

/** Recuadro con título que se anuncia como región (el título le da nombre). */
export function Tarjeta({ titulo, bajada, nivel = 3, id, className, children }: Props) {
  const idTitulo = useId()
  const Titulo = nivel === 2 ? 'h2' : 'h3'
  return (
    <section aria-labelledby={titulo ? idTitulo : undefined} id={id} className={cn('rounded-grande bg-superficie p-4 ring-1 ring-linea', nivel === 2 && 'sm:p-5', className)}>
      {titulo && (
        <Titulo id={idTitulo} className={cn('titulo', nivel === 2 ? 'text-lg' : 'text-base', nivel === 3 && !bajada && 'mb-3')}>
          {titulo}
        </Titulo>
      )}
      {bajada && <p className={cn('mt-0.5 text-sm text-suave', nivel === 3 && 'mb-3')}>{bajada}</p>}
      {nivel === 2 ? <div className={titulo || bajada ? 'mt-4' : undefined}>{children}</div> : children}
    </section>
  )
}
