import type { EstadoTurno } from '@/dominio/tipos'
import { cn } from './cn'
import { Sello, type TonoSello } from './Sello'

const ESTADOS: Record<EstadoTurno, { texto: string; tono: TonoSello; vacio?: boolean }> = {
  confirmado: { texto: 'Confirmado', tono: 'exito' },
  pendiente: { texto: 'Sin confirmar', tono: 'aviso', vacio: true },
  cancelado: { texto: 'Cancelado', tono: 'peligro' },
  asistio: { texto: 'Vino', tono: 'suave' },
  falto: { texto: 'No vino', tono: 'peligro' },
}

/**
 * Estado del turno como sello. "Sin confirmar" es un sello sin tinta (punteado): espera el golpe.
 * Con `animar`, el sello cae al aparecer (usar con key={estado} para que golpee cuando cambia).
 */
export function InsigniaEstado({ estado, animar, className }: { estado: EstadoTurno; animar?: boolean; className?: string }) {
  const e = ESTADOS[estado]
  return (
    <Sello tono={e.tono} vacio={e.vacio} animar={animar} giro={-4} className={className}>
      {e.texto}
    </Sello>
  )
}

const PUNTO: Record<EstadoTurno, string> = {
  confirmado: 'bg-exito',
  pendiente: 'border border-dashed border-aviso',
  cancelado: 'bg-peligro',
  asistio: 'bg-suave',
  falto: 'bg-peligro',
}

/**
 * El mismo estado, en voz baja: rótulo de ticket con un punto de color (el pendiente, punteado: todavía sin tinta).
 * Para listas largas, donde un sello por fila sería ruido; el sello queda para cuando el estado cambia frente a los ojos.
 */
export function EstadoQuieto({ estado, className }: { estado: EstadoTurno; className?: string }) {
  return (
    <span className={cn('rotulo inline-flex items-center gap-1.5 whitespace-nowrap', estado === 'pendiente' ? 'text-aviso' : 'text-suave', className)}>
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', PUNTO[estado])} />
      {ESTADOS[estado].texto}
    </span>
  )
}

export function Etiqueta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('rotulo inline-flex min-h-6 items-center rounded-chico bg-acento-suave px-2 text-acento-texto', className)}>
      {children}
    </span>
  )
}
