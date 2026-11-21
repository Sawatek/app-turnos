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
      <legend className={ocultarEtiqueta ? 'sr-only' : 'rotulo mb-2 text-suave'}>{etiqueta}</legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={valor === o.id}
            onClick={() => onCambiar(o.id)}
            className={cn(
              'h-11 rounded-chico px-4 text-sm font-semibold transition-colors',
              valor === o.id
                ? 'bg-acento text-sobre-acento shadow-[inset_0_-3px_0_rgb(0_0_0/0.16)]'
                : 'bg-superficie ring-1 ring-inset ring-linea hover:ring-suave/60',
            )}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
