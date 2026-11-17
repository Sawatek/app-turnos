// Preguntas frecuentes en acordeón accesible: cada pregunta es un botón con aria-expanded que abre su respuesta.
// Funciona con mouse, toque y teclado (Tab para moverse, Enter o Espacio para abrir y cerrar).
import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '@/ui/cn'

export interface Pregunta {
  pregunta: string
  respuesta: React.ReactNode
}

function Item({ p, abierta, alternar }: { p: Pregunta; abierta: boolean; alternar: () => void }) {
  const id = useId()
  return (
    <li className="border-b border-linea">
      <h3>
        <button
          type="button"
          id={`${id}-b`}
          aria-expanded={abierta}
          aria-controls={`${id}-r`}
          onClick={alternar}
          className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold transition-colors hover:text-acento-texto"
        >
          {p.pregunta}
          <ChevronDown className={cn('size-5 shrink-0 text-suave transition-transform duration-200', abierta && 'rotate-180')} aria-hidden />
        </button>
      </h3>
      <section
        id={`${id}-r`}
        aria-labelledby={`${id}-b`}
        hidden={!abierta}
        className="pb-5 text-[15px] leading-relaxed text-suave [&_a]:font-semibold [&_a]:text-acento-texto [&_a]:underline [&_a]:underline-offset-4"
      >
        {p.respuesta}
      </section>
    </li>
  )
}

export function Preguntas({ items }: { items: Pregunta[] }) {
  const [abiertas, setAbiertas] = useState<Set<number>>(() => new Set())
  const alternar = (i: number) =>
    setAbiertas((prev) => {
      const s = new Set(prev)
      if (s.has(i)) s.delete(i)
      else s.add(i)
      return s
    })
  return (
    <ul className="border-t border-linea">
      {items.map((p, i) => (
        <Item key={p.pregunta} p={p} abierta={abiertas.has(i)} alternar={() => alternar(i)} />
      ))}
    </ul>
  )
}
