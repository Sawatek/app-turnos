// Preguntas frecuentes en acordeón accesible: cada pregunta es un botón con aria-expanded que abre su respuesta.
// Funciona con mouse, toque y teclado (Tab para moverse, Enter o Espacio para abrir y cerrar).
import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '@/ui/cn'

export interface Pregunta {
  pregunta: string
  respuesta: React.ReactNode
}

function Item({ p, n, abierta, alternar }: { p: Pregunta; n: number; abierta: boolean; alternar: () => void }) {
  const id = useId()
  return (
    <li className="border-b border-linea">
      <h3>
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={`${id}-r`}
          onClick={alternar}
          className="group flex min-h-14 w-full items-baseline gap-4 py-5 text-left transition-colors hover:text-acento-texto"
        >
          <span aria-hidden className="folio num w-6 shrink-0 text-suave group-hover:text-acento-texto">
            {String(n).padStart(2, '0')}
          </span>
          <span className="titular flex-1 text-[1.3rem] leading-snug tracking-[-0.015em]">{p.pregunta}</span>
          <ChevronDown className={cn('size-5 shrink-0 self-center text-suave transition-transform duration-200', abierta && 'rotate-180')} aria-hidden />
        </button>
      </h3>
      {/* div y no section: con 9 preguntas serían 9 landmarks "region" que ensucian la navegación.
          hidden común y no "until-found": React 19 trata hidden como booleano y escribe hidden="". */}
      <div
        id={`${id}-r`}
        hidden={!abierta}
        className="pb-6 pl-10 text-base leading-relaxed text-suave [text-wrap:pretty] [&_a]:font-semibold [&_a]:text-acento-texto [&_a]:underline [&_a]:underline-offset-4"
      >
        {p.respuesta}
      </div>
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
        <Item key={p.pregunta} p={p} n={i + 1} abierta={abiertas.has(i)} alternar={() => alternar(i)} />
      ))}
    </ul>
  )
}
