// Repositorio de negocios (la configuración de cada demo).
//
// - Con Supabase configurado: las demos viven en la tabla `negocios`. Cualquiera las lee (así el link y el QR
//   abren en el celular del prospecto) y solo los admins las crean o editan (reglas RLS en supabase/migrations).
// - Sin Supabase: se guardan en este navegador, como antes.
// - Siempre: se recuerda una copia local de cada demo abierta, para que la app abra al instante y sin conexión.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Negocio } from '@/dominio/tipos'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { supabase } from './supabase'
import type { Json } from './tipos-db'

interface EstadoNegocios {
  /** Demos creadas sin nube (solo en este navegador). */
  propios: Negocio[]
  /** Copia local de las demos traídas de la nube. */
  recordados: Record<string, Negocio>
  guardarLocal: (n: Negocio) => void
  borrarLocal: (slug: string) => void
  recordar: (n: Negocio) => void
}

export const useNegocios = create<EstadoNegocios>()(
  persist(
    (set) => ({
      propios: [],
      recordados: {},
      guardarLocal: (n) => set((s) => ({ propios: [n, ...s.propios.filter((x) => x.slug !== n.slug)] })),
      borrarLocal: (slug) =>
        set((s) => {
          const { [slug]: _, ...recordados } = s.recordados
          return { propios: s.propios.filter((x) => x.slug !== slug), recordados }
        }),
      recordar: (n) => set((s) => (s.recordados[n.slug] === n ? s : { recordados: { ...s.recordados, [n.slug]: n } })),
    }),
    { name: 'sawatek-negocios-v1', version: 2, migrate: (viejo) => ({ recordados: {}, ...(viejo as object) }) as EstadoNegocios },
  ),
)

const fija = (slug: string) => DEMOS_FIJAS.find((n) => n.slug === slug)

// ---------- Acceso a la nube ----------

// La configuración viaja como JSON en la columna `config`; acá se la trata como Negocio.
const comoNegocio = (c: Json) => c as unknown as Negocio
const comoJson = (n: Negocio) => n as unknown as NonNullable<Json>

async function traer(slug: string): Promise<Negocio | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('negocios').select('config').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? comoNegocio(data.config) : null
}

async function listar(): Promise<Negocio[]> {
  if (!supabase) return []
  // Solo demos: los negocios reales se administran desde su propio panel (fase 2).
  const { data, error } = await supabase.from('negocios').select('config').eq('es_demo', true).order('actualizado', { ascending: false })
  if (error) throw error
  return data.map((f) => comoNegocio(f.config))
}

export class SinPermiso extends Error {}

/** Guarda en la nube (si hay) o en el navegador. */
export async function guardarNegocio(n: Negocio) {
  if (!supabase) return useNegocios.getState().guardarLocal(n)
  const { error } = await supabase.from('negocios').upsert({ slug: n.slug, config: comoJson(n), es_demo: true })
  if (error) {
    // 42501 = bloqueado por las reglas: la cuenta no es admin.
    if (error.code === '42501') throw new SinPermiso('Tu cuenta no tiene permiso para crear demos.')
    throw new Error(error.message)
  }
  useNegocios.getState().recordar(n)
}

export async function borrarNegocio(slug: string) {
  if (supabase) {
    const { error } = await supabase.from('negocios').delete().eq('slug', slug)
    if (error) throw new Error(error.message)
  }
  useNegocios.getState().borrarLocal(slug)
}

/** ¿Está libre este link? Revisa las demos fijas, las del navegador y las de la nube. */
export async function slugLibre(slug: string, ignorar?: string) {
  if (slug === ignorar) return true
  if (fija(slug) || useNegocios.getState().propios.some((p) => p.slug === slug)) return false
  return supabase ? (await traer(slug)) === null : true
}

// ---------- Hooks ----------

/** Un negocio por su link. Muestra la copia local al instante y la actualiza desde la nube. */
export function useNegocio(slug: string | undefined): { negocio: Negocio | undefined; cargando: boolean } {
  const local = useNegocios((s) => (slug ? (s.propios.find((n) => n.slug === slug) ?? s.recordados[slug]) : undefined))
  const recordar = useNegocios((s) => s.recordar)
  const deFabrica = slug ? fija(slug) : undefined
  const consulta = useQuery({
    queryKey: ['negocio', slug],
    queryFn: () => traer(slug!),
    enabled: !!supabase && !!slug && !deFabrica,
    staleTime: 60_000,
    retry: 1,
  })
  useEffect(() => {
    if (consulta.data) recordar(consulta.data)
  }, [consulta.data, recordar])

  const negocio = deFabrica ?? consulta.data ?? local
  return { negocio, cargando: !negocio && consulta.isPending && consulta.fetchStatus !== 'idle' }
}

/** Todas las demos: las fijas, las de la nube y las del navegador. */
export function useTodosLosNegocios() {
  const propios = useNegocios((s) => s.propios)
  const consulta = useQuery({ queryKey: ['negocios'], queryFn: listar, enabled: !!supabase, staleTime: 30_000 })
  const nube = consulta.data ?? []
  const vistos = new Set<string>()
  const lista = [...nube, ...propios, ...DEMOS_FIJAS].filter((n) => !vistos.has(n.slug) && vistos.add(n.slug))
  return { lista, nube, propios, cargando: consulta.isPending && !!supabase }
}

export function useRefrescarNegocios() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['negocios'] })
}
