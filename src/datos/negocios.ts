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
import { SLUGS_RESERVADOS } from '@/dominio/slugs'
import type { Negocio } from '@/dominio/tipos'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { supabase } from './supabase'
import type { Json } from './tipos-db'

/** Datos de la base que no son parte de la configuración: si es demo o un negocio real. */
export interface MetaNegocio {
  /** id en la tabla negocios (null en las demos fijas o locales). */
  id: string | null
  esDemo: boolean
  estado: 'prueba' | 'activo' | 'suspendido'
}
const META_DEMO: MetaNegocio = { id: null, esDemo: true, estado: 'activo' }

interface EstadoNegocios {
  /** Demos creadas sin nube (solo en este navegador). */
  propios: Negocio[]
  /** Copia local de las demos traídas de la nube. */
  recordados: Record<string, Negocio>
  metas: Record<string, MetaNegocio>
  guardarLocal: (n: Negocio) => void
  borrarLocal: (slug: string) => void
  recordar: (n: Negocio, meta?: MetaNegocio) => void
}

export const useNegocios = create<EstadoNegocios>()(
  persist(
    (set) => ({
      propios: [],
      recordados: {},
      metas: {},
      guardarLocal: (n) => set((s) => ({ propios: [n, ...s.propios.filter((x) => x.slug !== n.slug)] })),
      borrarLocal: (slug) =>
        set((s) => {
          const { [slug]: _, ...recordados } = s.recordados
          return { propios: s.propios.filter((x) => x.slug !== slug), recordados }
        }),
      recordar: (n, meta) =>
        set((s) => ({
          recordados: s.recordados[n.slug] === n ? s.recordados : { ...s.recordados, [n.slug]: n },
          metas: meta ? { ...s.metas, [n.slug]: meta } : s.metas,
        })),
    }),
    { name: 'sawatek-negocios-v1', version: 3, migrate: (viejo) => ({ recordados: {}, metas: {}, ...(viejo as object) }) as EstadoNegocios },
  ),
)

const fija = (slug: string) => DEMOS_FIJAS.find((n) => n.slug === slug)

// ---------- Acceso a la nube ----------

// La configuración viaja como JSON en la columna `config`; acá se la trata como Negocio.
const comoNegocio = (c: Json) => c as unknown as Negocio
const comoJson = (n: Negocio) => n as unknown as NonNullable<Json>

async function traer(slug: string): Promise<{ negocio: Negocio; meta: MetaNegocio } | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('negocios').select('id, es_demo, estado, config').eq('slug', slug).maybeSingle()
  if (error) throw error
  if (!data) {
    // Un negocio bloqueado por falta de pago no se ve, pero su marca sí: para decir "no disponible"
    // (en vez de "no existe") y para que el equipo pueda entrar al panel y ver el aviso de pago.
    const { data: b, error: eb } = await supabase.rpc('negocio_bloqueado', { p_slug: slug })
    if (eb) throw eb
    if (!b) return null
    const { id, config } = b as { id: string; config: Json }
    return { negocio: comoNegocio(config), meta: { id, esDemo: false, estado: 'suspendido' } }
  }
  return {
    negocio: comoNegocio(data.config),
    meta: { id: data.id, esDemo: data.es_demo, estado: data.estado as MetaNegocio['estado'] },
  }
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

/**
 * Alta de un negocio REAL (solo SawaTek): crea negocio, servicios, equipo y horarios desde la plantilla
 * del rubro (que viaja en la configuración) e invita al dueño por mail. Todo o nada, en la base.
 */
export async function crearNegocioReal(n: Negocio, emailDueno: string, nombreDueno?: string): Promise<string> {
  if (!supabase) throw new Error('Para crear negocios reales hace falta Supabase configurado.')
  const { data, error } = await supabase.rpc('crear_negocio_real', { p_slug: n.slug, p_config: comoJson(n), p_email_dueno: emailDueno, p_nombre_dueno: nombreDueno?.trim() || undefined })
  if (error) {
    if (error.message.includes('solo_superadmin')) throw new SinPermiso('Solo SawaTek puede crear negocios reales.')
    if (error.message.includes('mail_invalido')) throw new Error('Revisá el mail del dueño.')
    throw new Error(error.message)
  }
  return data
}

/** Negocios reales visibles para el usuario (SawaTek ve todos). */
export function useNegociosReales(activo: boolean) {
  return useQuery({
    queryKey: ['negocios-reales'],
    enabled: activo && !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('mis_negocios')
      if (error) throw error
      return data.filter((x) => !x.es_demo)
    },
  })
}

export async function borrarNegocio(slug: string) {
  if (supabase) {
    const { error } = await supabase.from('negocios').delete().eq('slug', slug)
    if (error) throw new Error(error.message)
  }
  useNegocios.getState().borrarLocal(slug)
}

/** Links que usa la plataforma (viven en dominio/slugs.ts para que los use también middleware.ts). */
export { SLUGS_RESERVADOS }

/** ¿Está libre este link? Revisa las reservadas, las demos fijas, las del navegador y las de la nube. */
export async function slugLibre(slug: string, ignorar?: string) {
  if (SLUGS_RESERVADOS.has(slug)) return false
  if (slug === ignorar) return true
  if (fija(slug) || useNegocios.getState().propios.some((p) => p.slug === slug)) return false
  return supabase ? (await traer(slug)) === null : true
}

// ---------- Hooks ----------

/**
 * Un negocio por su link. Muestra la copia local al instante y la actualiza desde la nube.
 * `meta.esDemo` dice si se muestra la demo simulada o la app real (fases 2 y 3).
 */
export function useNegocio(slug: string | undefined): { negocio: Negocio | undefined; meta: MetaNegocio; cargando: boolean } {
  const local = useNegocios((s) => (slug ? (s.propios.find((n) => n.slug === slug) ?? s.recordados[slug]) : undefined))
  const metaLocal = useNegocios((s) => (slug ? s.metas[slug] : undefined))
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
    if (consulta.data) recordar(consulta.data.negocio, consulta.data.meta)
  }, [consulta.data, recordar])

  const negocio = deFabrica ?? consulta.data?.negocio ?? local
  const meta = deFabrica ? META_DEMO : (consulta.data?.meta ?? metaLocal ?? META_DEMO)
  return { negocio, meta, cargando: !negocio && consulta.isPending && consulta.fetchStatus !== 'idle' }
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
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['negocios'] }), qc.invalidateQueries({ queryKey: ['negocios-reales'] })])
}
