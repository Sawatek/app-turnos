import { useId } from 'react'
import { cn } from './cn'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  ayuda?: string
  error?: string
}

/** Campo con etiqueta visible siempre (nunca solo placeholder) y error al lado del campo. */
export function Campo({ etiqueta, ayuda, error, className, ...resto }: Props) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-suave">
        {etiqueta}
      </label>
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error || ayuda ? `${id}-d` : undefined}
        className="h-13 rounded-medio border border-linea bg-superficie px-4 text-[17px] text-texto outline-none transition-colors placeholder:text-suave/70 focus:border-acento aria-invalid:border-peligro"
        {...resto}
      />
      {(error || ayuda) && (
        <p id={`${id}-d`} className={cn('text-sm', error ? 'text-peligro' : 'text-suave')}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
}
