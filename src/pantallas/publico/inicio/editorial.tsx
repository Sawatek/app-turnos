// Piezas del diseño editorial de la landing (como una revista): grilla, sección numerada, folio, titular y entradas de índice.
// Cada <Seccion id> les pasa su id a Folio y TituloSeccion por contexto: el número y el texto del folio y el id del h2
// salen de SECCIONES (./secciones.ts), así no se escriben a mano en cada sección.
import type { LucideIcon } from 'lucide-react'
import { createContext, use } from 'react'
import { cn } from '@/ui/cn'
import { SECCIONES, numeroSeccion, type IdSeccion } from './secciones'

/** La grilla de la página: 6 columnas en el celular, 12 en la compu. Cada hijo dice qué columnas ocupa. */
export const GRILLA = 'grid grid-cols-6 gap-x-4 lg:grid-cols-12 lg:gap-x-8'
/** Ocupa todo el ancho de la grilla. */
export const TODO = 'col-span-6 lg:col-span-12'

const ContextoSeccion = createContext<IdSeccion | null>(null)

function useIdSeccion() {
  const id = use(ContextoSeccion)
  if (!id) throw new Error('Folio y TituloSeccion van adentro de una <Seccion>.')
  return id
}

/** Sección numerada de la landing: ancla #id, rotulada por su h2 (t-<id>) y con el ancho máximo de la grilla. */
export function Seccion({ id, children, className }: { id: IdSeccion; children: React.ReactNode; className?: string }) {
  return (
    <ContextoSeccion value={id}>
      <section id={id} aria-labelledby={`t-${id}`} className={cn('relative px-5 py-24 sm:px-8 sm:py-32', className)}>
        <div className="mx-auto max-w-7xl">{children}</div>
      </section>
    </ContextoSeccion>
  )
}

/** Antetítulo de sección, como el de una revista: "01 — El problema". El número sale del orden de SECCIONES. */
export function Folio({ className }: { className?: string }) {
  const id = useIdSeccion()
  const { folio } = SECCIONES.find((s) => s.id === id)!
  return (
    <p className={cn('folio flex items-center gap-3 text-acento-texto', className)}>
      <span className="num">{numeroSeccion(id)}</span>
      <span aria-hidden className="h-px w-8 bg-acento-borde" />
      <span>{folio}</span>
    </p>
  )
}

/** El h2 de la sección, con el id que la rotula. Por defecto, titular grande; `className` lo ajusta (tamaño, columnas). */
export function TituloSeccion({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 id={`t-${useIdSeccion()}`} className={cn('titular text-titular', className)}>
      {children}
    </h2>
  )
}

/** Un dato o ventaja en formato "índice": filete arriba, etiqueta y texto. `nivel` 4 cuando va adentro de otro h3. */
export function Entrada({
  Icono,
  titulo,
  nivel = 3,
  children,
  className,
}: {
  Icono?: LucideIcon
  titulo: React.ReactNode
  nivel?: 3 | 4
  children: React.ReactNode
  className?: string
}) {
  const Titulo = nivel === 3 ? 'h3' : 'h4'
  return (
    <li className={cn('border-t border-linea pt-5', className)}>
      <Titulo className="flex items-center gap-2 text-lg font-bold">
        {Icono && <Icono className="size-4 shrink-0 text-acento-texto" aria-hidden />}
        {titulo}
      </Titulo>
      <p className="mt-2 text-suave text-pretty">{children}</p>
    </li>
  )
}

/** Resplandor decorativo del color de acento (un degradé radial, sin desenfoque). `className` lo ubica y le da tamaño. */
export function Halo({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--t-acento)_16%,transparent),transparent)]',
        className,
      )}
    />
  )
}
