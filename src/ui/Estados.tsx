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
    <div className="flex items-center justify-center gap-2.5 py-10 text-suave" aria-busy="true">
      <LoaderCircle className="size-5 animate-spin" aria-label={texto} />
      <span className="rotulo" aria-hidden>
        {texto}…
      </span>
    </div>
  )
}

export function Vacio({ children }: { children: React.ReactNode }) {
  // Hoja en blanco: recuadro punteado sobre la cuadrícula, como un renglón todavía sin escribir.
  return <p className="cuadricula rounded-grande border border-dashed border-linea p-8 text-center text-suave">{children}</p>
}

export interface PropsFalloCarga {
  error: unknown
  onReintentar: () => void
}

/** Error al cargar una consulta, con botón para reintentar. `mensaje` traduce el error a texto. */
export function FalloCarga({ error, onReintentar, mensaje }: PropsFalloCarga & { mensaje: (e: unknown) => string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-grande border border-dashed border-peligro/50 p-6 text-center">
      <ErrorEnLinea texto={mensaje(error)} />
      <Boton variante="secundario" tamano="chico" onClick={onReintentar}>
        Reintentar
      </Boton>
    </div>
  )
}
