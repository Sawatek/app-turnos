import { Link } from 'react-router'
import { cn } from './cn'
import { clasesBoton, type Tamano, type Variante } from './clasesBoton'

// Link de texto: subrayado suave que se marca al pasar el mouse; mantiene los 44 px táctiles.
const CLASES_TEXTO =
  'inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento-texto underline decoration-acento-borde underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-acento'

interface Props {
  href: string
  /** Fuerza <a> aunque el href parezca interno (p. ej. una ruta que tiene que recargar el documento). */
  externo?: boolean
  /** Con forma de botón (las mismas variantes de Boton) o 'texto' para un link subrayado. */
  variante?: Variante | 'texto'
  /** Solo para las variantes de botón. */
  tamano?: Tamano
  className?: string
  children: React.ReactNode
}

/** Link interno (react-router) o externo (http, mailto, tel, wa.me…), con forma de botón o de texto. */
export function Enlace({ href, externo, variante = 'primario', tamano = 'medio', className, children }: Props) {
  const clases = cn(variante === 'texto' ? CLASES_TEXTO : clasesBoton({ variante, tamano }), className)
  if (externo || /^[a-z][a-z\d+.-]*:/i.test(href)) {
    const nuevaPestana = /^https?:/i.test(href)
    return (
      <a href={href} className={clases} {...(nuevaPestana ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    )
  }
  return (
    <Link to={href} className={clases}>
      {children}
    </Link>
  )
}
