// Repositorio de negocios (configuración de cada demo).
// Hoy: demos fijas + las dadas de alta en /admin, guardadas en este navegador.
// Después: la misma interfaz leyendo de Supabase, para que el link funcione en cualquier celular.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Negocio } from '@/dominio/tipos'
import { DEMOS_FIJAS } from '@/plantillas/demos'

interface EstadoNegocios {
  propios: Negocio[]
  guardar: (n: Negocio) => void
  borrar: (slug: string) => void
}

export const useNegocios = create<EstadoNegocios>()(
  persist(
    (set) => ({
      propios: [],
      guardar: (n) => set((s) => ({ propios: [n, ...s.propios.filter((x) => x.slug !== n.slug)] })),
      borrar: (slug) => set((s) => ({ propios: s.propios.filter((x) => x.slug !== slug) })),
    }),
    { name: 'sawatek-negocios-v1' },
  ),
)

export const todosLosNegocios = (propios: Negocio[]) => [...propios, ...DEMOS_FIJAS.filter((d) => !propios.some((p) => p.slug === d.slug))]

export function useNegocio(slug: string | undefined): Negocio | undefined {
  const propios = useNegocios((s) => s.propios)
  if (!slug) return undefined
  return propios.find((n) => n.slug === slug) ?? DEMOS_FIJAS.find((n) => n.slug === slug)
}

export const slugLibre = (slug: string, propios: Negocio[]) => !todosLosNegocios(propios).some((n) => n.slug === slug)
