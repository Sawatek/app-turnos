import { motion, type HTMLMotionProps } from 'motion/react'
import { LoaderCircle } from 'lucide-react'
import { cn } from './cn'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'wa'
type Tamano = 'chico' | 'medio' | 'grande'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-acento text-sobre-acento hover:brightness-105',
  secundario: 'bg-superficie-2 text-texto hover:bg-linea/60',
  fantasma: 'bg-transparent text-acento-texto hover:bg-acento-suave',
  peligro: 'bg-transparent text-peligro hover:bg-peligro/10',
  wa: 'bg-wa text-[#062b14] hover:brightness-105',
}
const TAMANOS: Record<Tamano, string> = {
  chico: 'h-10 px-3.5 text-sm gap-1.5',
  medio: 'h-12 px-5 text-[15px] gap-2',
  grande: 'h-14 px-6 text-base gap-2.5',
}

interface Props extends HTMLMotionProps<'button'> {
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
  ancho?: boolean
}

export function Boton({ variante = 'primario', tamano = 'medio', cargando, ancho, className, children, disabled, ...resto }: Props) {
  return (
    <motion.button
      type="button"
      whileTap={disabled || cargando ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-medio font-semibold transition-[background-color,filter,opacity] duration-200 disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTES[variante],
        TAMANOS[tamano],
        ancho && 'w-full',
        className,
      )}
      {...resto}
    >
      {cargando ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : (children as React.ReactNode)}
    </motion.button>
  )
}
