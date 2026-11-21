import { cn } from './cn'

export type TonoSello = 'exito' | 'aviso' | 'peligro' | 'acento' | 'suave'

const TONOS: Record<TonoSello, string> = {
  exito: 'text-exito',
  aviso: 'text-aviso',
  peligro: 'text-peligro',
  acento: 'text-acento-texto',
  suave: 'text-suave',
}
const TAMANOS = {
  chico: 'text-[0.75rem]',
  medio: 'text-sm',
  grande: 'text-lg sm:text-xl',
}

interface Props {
  children: React.ReactNode
  tono?: TonoSello
  /** Todavía sin tinta: contorno punteado (algo que espera confirmarse). */
  vacio?: boolean
  /** Cae con el golpe del sello al montarse (para remarcar que algo acaba de pasar). Con "reducir movimiento", aparece quieto. */
  animar?: boolean
  tamano?: keyof typeof TAMANOS
  /** Inclinación en grados (cada sello un poco distinto queda más "a mano"). */
  giro?: number
  className?: string
}

/** Sello de goma: el estado de algo dicho como lo diría un papel sellado. Es texto: se lee igual con lector de pantalla. */
export function Sello({ children, tono = 'acento', vacio, animar, tamano = 'chico', giro, className }: Props) {
  return (
    <span
      className={cn('sello', vacio && 'sello-vacio', animar && 'sellar', TONOS[tono], TAMANOS[tamano], className)}
      style={giro === undefined ? undefined : ({ '--giro': `${giro}deg` } as React.CSSProperties)}
    >
      {children}
    </span>
  )
}
