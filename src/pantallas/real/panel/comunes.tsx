// Piezas compartidas por las secciones del panel real (mismo estilo que src/ui).
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { createContext, use, useId, useState } from 'react'
import type { Acceso } from '@/datos/real/panel'
import { mensajeDe } from '@/datos/real/panel'
import type { Negocio } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { cn } from '@/ui/cn'

// ---------- Contexto del panel ----------

export interface CtxPanel {
  n: Negocio
  negocioId: string
  acceso: Acceso & { rol: NonNullable<Acceso['rol']> }
  esDueno: boolean
}

const Contexto = createContext<CtxPanel | null>(null)
export const ProveedorPanel = Contexto.Provider

export function usePanel() {
  const c = use(Contexto)
  if (!c) throw new Error('usePanel fuera del panel')
  return c
}

// ---------- Acciones con estado de carga y error ----------

/** Corre una acción async: maneja "cargando" y deja el error listo para mostrar al lado del botón o campo. */
export function useAccion() {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string>()
  const correr = async (fn: () => Promise<unknown>) => {
    setOcupado(true)
    setError(undefined)
    try {
      await fn()
      return true
    } catch (e) {
      setError(mensajeDe(e))
      return false
    } finally {
      setOcupado(false)
    }
  }
  return { ocupado, error, setError, correr }
}

// ---------- Campos ----------

const claseControl =
  'rounded-medio border border-linea bg-superficie px-4 text-[17px] text-texto outline-none transition-colors placeholder:text-suave/70 focus:border-acento aria-invalid:border-peligro'

interface PropsSelector extends React.SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string
  error?: string
  ayuda?: string
}

export function Selector({ etiqueta, error, ayuda, className, children, ...resto }: PropsSelector) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-suave">
        {etiqueta}
      </label>
      <select
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error || ayuda ? `${id}-d` : undefined}
        className={cn(claseControl, 'h-13 appearance-auto')}
        {...resto}
      >
        {children}
      </select>
      {(error || ayuda) && (
        <p id={`${id}-d`} className={cn('text-sm', error ? 'text-peligro' : 'text-suave')}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
}

interface PropsArea extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta: string
  error?: string
  ayuda?: string
}

export function AreaTexto({ etiqueta, error, ayuda, className, ...resto }: PropsArea) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-suave">
        {etiqueta}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={!!error || undefined}
        aria-describedby={error || ayuda ? `${id}-d` : undefined}
        className={cn(claseControl, 'min-h-24 py-3 leading-snug')}
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

/** Interruptor (checkbox con rol switch) con etiqueta visible. Toda la fila es clickeable (44 px). */
export function Interruptor({
  etiqueta,
  ayuda,
  activo,
  onCambiar,
}: {
  etiqueta: string
  ayuda?: string
  activo: boolean
  onCambiar: (v: boolean) => void
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-h-11 items-center justify-between gap-3 rounded-medio bg-superficie px-4 py-2.5 ring-1 ring-linea">
      <span>
        <span className="block font-semibold">{etiqueta}</span>
        {ayuda && <span className="block text-sm text-suave">{ayuda}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" aria-checked={activo} checked={activo} onChange={(e) => onCambiar(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-superficie-2 ring-1 ring-linea transition-colors peer-checked:bg-acento peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-texto after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-sobre-acento"
      />
    </label>
  )
}

// ---------- Mensajes ----------

export function ErrorEnLinea({ texto, className }: { texto?: string; className?: string }) {
  if (!texto) return null
  return (
    <p role="alert" className={cn('flex items-start gap-2 text-sm font-semibold text-peligro', className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {texto}
    </p>
  )
}

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

/** Error al cargar una consulta, con botón para reintentar. */
export function FalloCarga({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-grande bg-superficie p-6 text-center ring-1 ring-linea">
      <ErrorEnLinea texto={mensajeDe(error)} />
      <Boton variante="secundario" tamano="chico" onClick={onReintentar}>
        Reintentar
      </Boton>
    </div>
  )
}

// ---------- Estructura ----------

export function Encabezado({ titulo, bajada, children }: { titulo: string; bajada?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl">{titulo}</h2>
        {bajada && <p className="mt-0.5 text-sm text-suave">{bajada}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Tarjeta({ titulo, children, className, id }: { titulo?: string; children: React.ReactNode; className?: string; id?: string }) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={titulo ? idTitulo : undefined} id={id} className={cn('rounded-grande bg-superficie p-4 ring-1 ring-linea', className)}>
      {titulo && (
        <h3 id={idTitulo} className="titulo mb-3 text-base">
          {titulo}
        </h3>
      )}
      {children}
    </section>
  )
}

/** Botón de acción destructiva en dos pasos: el primer toque pide confirmar. */
export function BotonConfirmar({
  texto,
  confirmar,
  onConfirmar,
  cargando,
  tamano = 'medio',
  ancho,
}: {
  texto: string
  confirmar: string
  onConfirmar: () => void
  cargando?: boolean
  tamano?: 'chico' | 'medio'
  ancho?: boolean
}) {
  const [pidiendo, setPidiendo] = useState(false)
  if (!pidiendo)
    return (
      <Boton variante="peligro" tamano={tamano} ancho={ancho} onClick={() => setPidiendo(true)}>
        {texto}
      </Boton>
    )
  return (
    <div className={cn('flex gap-2', ancho && 'w-full')}>
      <Boton variante="secundario" tamano={tamano} className={ancho ? 'flex-1' : undefined} onClick={() => setPidiendo(false)}>
        No
      </Boton>
      <Boton variante="primario" tamano={tamano} className={cn('bg-peligro! text-white!', ancho && 'flex-1')} cargando={cargando} onClick={onConfirmar}>
        {confirmar}
      </Boton>
    </div>
  )
}

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const
/** Orden de la semana para mostrar: lunes primero. */
export const SEMANA = [1, 2, 3, 4, 5, 6, 0] as const

/** '09:00:00' → '09:00'. */
export const hhmm = (t: string) => t.slice(0, 5)
