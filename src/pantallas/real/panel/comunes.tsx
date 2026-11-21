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

/**
 * Interruptor (checkbox con rol switch) con etiqueta visible: un renglón con una llave de corredera a la derecha
 * (recta, como la de un aparato; con "SÍ"/"NO" en letra de ticket para no depender solo del color). Toda la fila es clickeable (44 px).
 */
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
    <label htmlFor={id} className="flex min-h-13 items-center justify-between gap-4 border-b border-linea pb-3">
      <span>
        <span className="block font-semibold">{etiqueta}</span>
        {ayuda && <span className="block text-sm text-suave">{ayuda}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" aria-checked={activo} checked={activo} onChange={(e) => onCambiar(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="mono relative grid h-8 w-15 shrink-0 grid-cols-2 items-center rounded-chico bg-superficie-2 text-[0.6875rem] font-bold ring-1 ring-inset ring-linea transition-colors peer-checked:bg-acento peer-checked:text-sobre-acento peer-checked:ring-acento peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento"
      >
        <span className={cn('text-center transition-opacity', !activo && 'opacity-0')}>SÍ</span>
        <span className={cn('text-center text-suave transition-opacity', activo && 'opacity-0')}>NO</span>
        <span
          className={cn(
            'absolute top-1 left-1 h-6 w-[1.625rem] rounded-[calc(var(--p-radio-chico)-2px)] bg-texto shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-transform duration-200 ease-suave',
            activo && 'translate-x-[1.625rem] bg-sobre-acento',
          )}
        />
      </span>
    </label>
  )
}

// ---------- Estructura ----------

/** Encabezado de sección: título grande con un filete grueso abajo, como el encabezado de una planilla. */
export function Encabezado({ titulo, bajada, children }: { titulo: string; bajada?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b-2 border-texto pb-3">
      <div className="min-w-0">
        <h2 className="text-[2rem] leading-none sm:text-[2.5rem]">{titulo}</h2>
        {bajada && <p className="mt-2 max-w-xl text-sm text-suave">{bajada}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

/** Rayado diagonal (lo tachado de la libreta): bloqueos y francos. Tokens, sin colores sueltos. */
export const RAYADO = 'bg-[repeating-linear-gradient(135deg,var(--t-linea)_0_1.5px,transparent_1.5px_7px)]'

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
