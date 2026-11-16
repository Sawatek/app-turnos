import { useLayoutEffect, useMemo } from 'react'
import type { Negocio } from '@/dominio/tipos'
import { generarTema } from './paleta'

/** Aplica la marca del negocio a toda la página: colores, personalidad, título y color de la barra del celular. */
export function useTemaNegocio(n: Pick<Negocio, 'color' | 'modo' | 'personalidad' | 'nombre'> | undefined, titulo?: string) {
  const color = n?.color
  const modo = n?.modo
  const tema = useMemo(() => (color && modo ? generarTema(color, modo) : null), [color, modo])

  useLayoutEffect(() => {
    if (!n || !tema) return
    const raiz = document.documentElement
    for (const [k, v] of Object.entries(tema)) raiz.style.setProperty(k, v)
    raiz.dataset.personalidad = n.personalidad
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', tema['--t-fondo']!)
    document.title = titulo ?? `${n.nombre} · Turnos`
  }, [n, tema, titulo])
}

/** Variables del tema para aplicar a un elemento puntual (ej.: vista previa en /admin). */
export function estiloTema(n: Pick<Negocio, 'color' | 'modo'>): React.CSSProperties {
  const { 'color-scheme': colorScheme, ...variables } = generarTema(n.color, n.modo)
  return { ...variables, colorScheme } as React.CSSProperties
}
