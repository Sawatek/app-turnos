import { createContext, use } from 'react'
import type { EstadoNegocio } from '@/datos/demo'
import type { Negocio, Turno } from '@/dominio/tipos'

export interface OpcionesReserva {
  servicioId?: string
  profesionalId?: string | null
  /** ISO del horario ya elegido (ej.: "Reservar este" del próximo libre). */
  inicio?: string
  reprograma?: Turno
}

export interface CtxCliente {
  n: Negocio
  e: EstadoNegocio
  ahora: Date
  abrirReserva: (o?: OpcionesReserva) => void
  irA: (tab: 'inicio' | 'turnos' | 'perfil') => void
}

export const ContextoCliente = createContext<CtxCliente | null>(null)

export function useCliente() {
  const c = use(ContextoCliente)
  if (!c) throw new Error('useCliente fuera de la app del cliente')
  return c
}

export const servicioDe = (n: Negocio, id: string) => n.servicios.find((s) => s.id === id)
export const profesionalDe = (n: Negocio, id: string) => n.staff.find((p) => p.id === id)
