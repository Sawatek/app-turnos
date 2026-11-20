import { cn } from './cn'

interface Props<T extends string> {
  /** Nombre del grupo. Se ve arriba, salvo con `ocultarEtiqueta` (queda solo para lectores de pantalla). */
  etiqueta: string
  ocultarEtiqueta?: boolean
  valor: T
  opciones: readonly { id: T; texto: string }[]
  onCambiar: (v: T) => void
  className?: string
}

/** Grupo de pastillas excluyentes (una elegida, marcada con aria-pressed). Cada una mide 44 px de alto. */
export function Pastillas<T extends string>({ etiqueta, ocultarEtiqueta, valor, opciones, onCambiar, className }: Props<T>) {
  return (
    <fieldset className={className}>
      <legend className={ocultarEtiqueta ? 'sr-only' : 'mb-1.5 text-sm font-semibold text-suave'}>{etiqueta}</legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={valor === o.id}
            onClick={() => onCambiar(o.id)}
            className={cn(
              'h-11 rounded-full px-4 text-sm font-semibold transition-colors',
              valor === o.id ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea hover:ring-acento-borde',
            )}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
