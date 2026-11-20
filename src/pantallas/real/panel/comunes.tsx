// Piezas compartidas por las secciones del panel real (mismo estilo que src/ui).
import { createContext, use, useId, useState } from 'react'
import type { Acceso } from '@/datos/real/panel'
import { mensajeDe } from '@/datos/real/panel'
import type { Negocio } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { cn } from '@/ui/cn'
import { FalloCarga as FalloCargaBase, type PropsFalloCarga } from '@/ui/Estados'
import { useAccion as useAccionBase } from '@/ui/useAccion'

// ---------- Contexto del panel ----------

export interface CtxPanel {
  n: Negocio
  negocioId: string
  acceso: Acceso & { rol: NonNullable<Acceso['rol']> }
  esDueno: boolean
  /** Usuario logueado y su nombre (si lo cargó). */
  userId: string
  nombre: string | null
}

const Contexto = createContext<CtxPanel | null>(null)
export const ProveedorPanel = Contexto.Provider

export function usePanel() {
  const c = use(Contexto)
  if (!c) throw new Error('usePanel fuera del panel')
  return c
}

// ---------- Piezas de src/ui con los textos del panel ----------

/** Corre una acción async: maneja "cargando" y deja el error listo para mostrar al lado del botón o campo. */
export const useAccion = () => useAccionBase(mensajeDe)

export { AreaTexto, Selector } from '@/ui/Campo'
export { Cargando, ErrorEnLinea, Exito, Vacio } from '@/ui/Estados'
export { Tarjeta } from '@/ui/Tarjeta'

/** Error al cargar una consulta, con botón para reintentar. */
export const FalloCarga = (p: PropsFalloCarga) => <FalloCargaBase mensaje={mensajeDe} {...p} />

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
      <Boton variante="primario" tamano={tamano} className={cn('bg-peligro text-white', ancho && 'flex-1')} cargando={cargando} onClick={onConfirmar}>
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
