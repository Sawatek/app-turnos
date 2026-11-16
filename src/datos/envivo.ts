// Demo EN VIVO entre dispositivos (Supabase Realtime, canal "broadcast" por demo; no guarda nada en la base).
//
// El prospecto reserva desde SU celular → el turno aparece en el panel de la compu del vendedor.
// El vendedor marca "vino" o adelanta el tiempo en la compu → el celular del prospecto se entera
// (y le llegan los recordatorios).
//
// Cada dispositivo sigue teniendo su propia copia de la demo; acá solo viajan los cambios.
// Los datos de ejemplo son iguales en todos lados (se generan igual a partir de la fecha), así que
// los cambios de estado de esos turnos también se entienden en cualquier dispositivo.
import { useEffect } from 'react'
import type { Negocio, Turno } from '@/dominio/tipos'
import { useDemo, type EstadoNegocio } from './demo'
import { supabase } from './supabase'

type Mensaje =
  | { tipo: 'turno'; turno: Turno }
  | { tipo: 'estado'; id: string; estado: Turno['estado'] }
  | { tipo: 'reloj'; desfase: number }

export function useEnVivo(n: Negocio | undefined) {
  const slug = n?.slug
  useEffect(() => {
    if (!supabase || !slug) return
    const nube = supabase
    // Cambios que llegaron de afuera: no se reenvían (evita el eco).
    const recibidos = new Set<string>()
    const canal = nube.channel(`demo:${slug}`, { config: { broadcast: { self: false } } })

    canal
      .on('broadcast', { event: 'cambio' }, ({ payload }) => {
        const m = payload as Mensaje
        const { aplicarRemoto } = useDemo.getState()
        if (m.tipo === 'turno') {
          recibidos.add(`t:${m.turno.id}`)
          aplicarRemoto(slug, { turno: m.turno })
        } else if (m.tipo === 'estado') {
          recibidos.add(`e:${m.id}:${m.estado}`)
          aplicarRemoto(slug, { id: m.id, estado: m.estado })
        } else if (m.tipo === 'reloj' && useDemo.getState().desfase !== m.desfase) {
          recibidos.add(`r:${m.desfase}`)
          useDemo.setState({ desfase: m.desfase })
        }
      })
      .subscribe()

    const enviar = (m: Mensaje, clave: string) => {
      if (recibidos.delete(clave)) return
      void canal.send({ type: 'broadcast', event: 'cambio', payload: m })
    }

    const quitar = useDemo.subscribe((ahora, antes) => {
      if (ahora.desfase !== antes.desfase) enviar({ tipo: 'reloj', desfase: ahora.desfase }, `r:${ahora.desfase}`)
      const a: EstadoNegocio | undefined = ahora.negocios[slug]
      const b: EstadoNegocio | undefined = antes.negocios[slug]
      if (!a || !b || a.turnos === b.turnos) return
      const previos = new Map(b.turnos.map((t) => [t.id, t]))
      for (const t of a.turnos) {
        const p = previos.get(t.id)
        // Turno nuevo sacado en este dispositivo.
        if (!p && t.propio) enviar({ tipo: 'turno', turno: t }, `t:${t.id}`)
        // Cambio de estado (confirmó, canceló, vino, no vino).
        else if (p && p.estado !== t.estado) enviar({ tipo: 'estado', id: t.id, estado: t.estado }, `e:${t.id}:${t.estado}`)
      }
    })

    return () => {
      quitar()
      void nube.removeChannel(canal)
    }
  }, [slug])
}
