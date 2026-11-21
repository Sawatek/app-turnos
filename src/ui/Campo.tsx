import { useId } from 'react'
import { cn } from './cn'

/** Clases base de un control de formulario (input, select, textarea). Cada uno le suma su alto. */
// Renglón de formulario en papel: fondo apenas marcado y una línea firme abajo (con contraste 3:1 para ubicar el campo).
// Al enfocar, la línea se engrosa en el color de la marca.
export const claseControl =
  'rounded-t-chico rounded-b-none border-0 border-b-2 border-suave bg-superficie-2/70 px-3.5 text-[17px] text-texto outline-none transition-[border-color,background-color,box-shadow] placeholder:text-suave/70 hover:bg-superficie-2 focus:border-acento focus:bg-superficie-2 focus:shadow-[inset_0_-1px_0_var(--t-acento)] focus-visible:outline-none aria-invalid:border-peligro'

interface PropsMarco {
  etiqueta: string
  ayuda?: string
  error?: string
}

/** Etiqueta arriba, control en el medio y ayuda o error abajo (el error pisa a la ayuda). */
function Marco({ id, etiqueta, ayuda, error, className, children }: PropsMarco & { id: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="rotulo text-suave">
        {etiqueta}
      </label>
      {children}
      {(error || ayuda) && (
        <p id={`${id}-d`} className={cn('text-sm', error ? 'text-peligro' : 'text-suave')}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
}

/** Atributos que enlazan el control con su etiqueta y su ayuda o error. */
const accesible = (id: string, error?: string, ayuda?: string) => ({
  id,
  'aria-invalid': !!error || undefined,
  'aria-describedby': error || ayuda ? `${id}-d` : undefined,
})

/** Campo con etiqueta visible siempre (nunca solo placeholder) y error al lado del campo. */
export function Campo({ etiqueta, ayuda, error, className, ...resto }: PropsMarco & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Marco id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <input {...accesible(id, error, ayuda)} className={cn(claseControl, 'h-13')} {...resto} />
    </Marco>
  )
}

export function Selector({ etiqueta, ayuda, error, className, children, ...resto }: PropsMarco & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Marco id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <select {...accesible(id, error, ayuda)} className={cn(claseControl, 'h-13 min-w-0 appearance-auto')} {...resto}>
        {children}
      </select>
    </Marco>
  )
}

export function AreaTexto({ etiqueta, ayuda, error, className, ...resto }: PropsMarco & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Marco id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <textarea rows={3} {...accesible(id, error, ayuda)} className={cn(claseControl, 'min-h-24 py-3 leading-snug')} {...resto} />
    </Marco>
  )
}
