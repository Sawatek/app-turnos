// Contexto de la app del cliente REAL: lo que todas las pantallas necesitan a mano.
import { createContext, use, useEffect, useState } from 'react'
import type { Catalogo, Resumen, TurnoReal } from '@/datos/real/cliente'
import type { Negocio } from '@/dominio/tipos'

export type Tab = 'inicio' | 'turnos' | 'perfil'

export interface OpcionesReserva {
  servicioId?: string
  /** null = cualquiera. undefined = todavía no eligió. */
  profesionalId?: string | null
  /** ISO del horario ya elegido (ej.: "Reservar este" del próximo libre). */
  inicio?: string
  /** Turno que se cambia de horario. */
  reprograma?: TurnoReal
}

export interface CtxReal {
  n: Negocio
  negocioId: string
  /** El negocio toma turnos por la app (estado 'activo'). */
  tomaTurnos: boolean
  uid: string
  /** Celular de la sesión, legible ("11 2345-6789"). */
  telefono: string
  /** Celular de la sesión en formato internacional (+549…), para la ficha de cliente. */
  telefonoE164: string | null
  catalogo: Catalogo
  resumen: Resumen
  turnos: TurnoReal[]
  ahora: Date
  abrirReserva: (o?: OpcionesReserva) => void
  irA: (tab: Tab) => void
  /** Notificación breve arriba (como las del celular). */
  avisar: (texto: string) => void
  /** Marca un turno como "lo toqué yo", así el aviso en vivo no repite lo que el cliente ya sabe. */
  marcarPropio: (id: string) => void
}

export const ContextoReal = createContext<CtxReal | null>(null)

export function useReal() {
  const c = use(ContextoReal)
  if (!c) throw new Error('useReal fuera de la app del cliente real')
  return c
}

/** Reloj que avanza cada 30 segundos (para "Faltan 2 h" y para no ofrecer horarios que ya pasaron). */
export function useAhora() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  return ahora
}

/** Link de WhatsApp del negocio (el número de la configuración, en formato argentino). */
export function linkWhatsApp(numero: string, texto?: string) {
  let d = numero.replace(/\D/g, '')
  if (!d.startsWith('54')) d = `549${d.replace(/^0/, '')}`
  return `https://wa.me/${d}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}

export const linkMapa = (direccion: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
