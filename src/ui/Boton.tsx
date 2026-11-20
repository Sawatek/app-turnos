import { motion, type HTMLMotionProps } from 'motion/react'
import { LoaderCircle } from 'lucide-react'
import { cn } from './cn'
import { clasesBoton, type Tamano, type Variante } from './clasesBoton'

export { clasesBoton, type Tamano, type Variante } from './clasesBoton'

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
      className={cn(clasesBoton({ variante, tamano, ancho }), className)}
      {...resto}
    >
      {cargando ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : (children as React.ReactNode)}
    </motion.button>
  )
}
