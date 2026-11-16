import type { EstadoTurno } from '@/dominio/tipos'
import { cn } from './cn'

const ESTADOS: Record<EstadoTurno, { texto: string; clase: string }> = {
  confirmado: { texto: 'Confirmado', clase: 'bg-exito/15 text-exito' },
  pendiente: { texto: 'Sin confirmar', clase: 'bg-aviso/15 text-aviso' },
  cancelado: { texto: 'Cancelado', clase: 'bg-peligro/12 text-peligro' },
  asistio: { texto: 'Vino', clase: 'bg-superficie-2 text-suave' },
  falto: { texto: 'No vino', clase: 'bg-peligro/12 text-peligro' },
}

export function InsigniaEstado({ estado, className }: { estado: EstadoTurno; className?: string }) {
  const e = ESTADOS[estado]
  return <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold', e.clase, className)}>{e.texto}</span>
}

export function Etiqueta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full bg-acento-suave px-2.5 text-xs font-bold text-acento-texto', className)}>
      {children}
    </span>
  )
}
