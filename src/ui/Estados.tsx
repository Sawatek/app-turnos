// Estados de una pantalla o acción: error, éxito, cargando, vacío y fallo de carga.
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { Boton } from './Boton'
import { cn } from './cn'

export function ErrorEnLinea({ texto, className }: { texto?: string; className?: string }) {
  if (!texto) return null
  return (
    <p role="alert" className={cn('flex items-start gap-2 text-sm font-semibold text-peligro', className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {texto}
    </p>
  )
}

/** Aviso de que algo salió bien. Siempre ocupa su lugar (no salta el layout cuando aparece). */
export function Exito({ texto }: { texto?: string }) {
  return (
    <p aria-live="polite" className="flex min-h-5 items-center gap-2 text-sm font-semibold text-exito">
      {texto && <CircleCheck className="size-4 shrink-0" aria-hidden />}
      {texto}
    </p>
  )
}

export function Cargando({ texto = 'Cargando' }: { texto?: string }) {
  return (
    <div className="grid place-items-center py-10" aria-busy="true">
      <LoaderCircle className="size-7 animate-spin text-suave" aria-label={texto} />
    </div>
  )
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-grande bg-superficie p-8 text-center text-suave ring-1 ring-linea">{children}</p>
}

export interface PropsFalloCarga {
  error: unknown
  onReintentar: () => void
}

/** Error al cargar una consulta, con botón para reintentar. `mensaje` traduce el error a texto. */
export function FalloCarga({ error, onReintentar, mensaje }: PropsFalloCarga & { mensaje: (e: unknown) => string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-grande bg-superficie p-6 text-center ring-1 ring-linea">
      <ErrorEnLinea texto={mensaje(error)} />
      <Boton variante="secundario" tamano="chico" onClick={onReintentar}>
        Reintentar
      </Boton>
    </div>
  )
}
