// Cuenta del cliente en TODOS los negocios donde reservó (/mis-turnos).
// Los turnos salen de mis_turnos_global() (solo los propios); la marca de cada negocio, de la tabla pública `negocios`.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { ErrorCliente, type EstadoTurnoReal } from './cliente'

export interface TurnoGlobal {
  id: string
  negocioId: string
  slug: string
  negocio: string
  servicio: string
  profesional: string
  inicio: string
  fin: string
  estado: EstadoTurnoReal
  cancelacionHoras: number
  puntaje: number | null
}

export interface MarcaNegocio {
  nombre: string
  logo?: string
  direccion?: string
}

const clave = (uid: string) => ['cuenta-cliente', uid] as const
const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined)

export function useTurnosGlobales(uid: string | null) {
  return useQuery({
    queryKey: [...clave(uid ?? ''), 'turnos'],
    enabled: !!uid && !!supabase,
    queryFn: async (): Promise<TurnoGlobal[]> => {
      const { data, error } = await supabase!.rpc('mis_turnos_global')
      if (error) throw new ErrorCliente('carga', 'No pudimos traer tus turnos. Revisá tu conexión y probá de nuevo.')
      return (data ?? []).map((t) => ({
        id: t.id,
        negocioId: t.negocio_id,
        slug: t.slug,
        negocio: t.negocio,
        servicio: t.servicio,
        profesional: t.profesional,
        inicio: t.inicio,
        fin: t.fin,
        estado: t.estado as EstadoTurnoReal,
        cancelacionHoras: t.cancelacion_horas,
        puntaje: t.puntaje,
      }))
    },
  })
}

/** Logo y dirección de cada negocio (para las tarjetas). Si falla, se muestran las iniciales. */
export function useMarcas(ids: string[]) {
  const orden = [...new Set(ids)].toSorted()
  return useQuery({
    queryKey: ['cuenta-cliente', 'marcas', orden],
    enabled: orden.length > 0 && !!supabase,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Map<string, MarcaNegocio>> => {
      const { data, error } = await supabase!.from('negocios').select('id, config').in('id', orden)
      if (error) return new Map()
      return new Map(
        (data ?? []).map((n) => {
          const c = (n.config ?? {}) as { nombre?: unknown; logo?: unknown; direccion?: unknown }
          return [n.id, { nombre: texto(c.nombre) ?? '', logo: texto(c.logo), direccion: texto(c.direccion) }]
        }),
      )
    },
  })
}

export function useRefrescarCuenta(uid: string | null) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: clave(uid ?? '') })
}
