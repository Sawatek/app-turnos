// Sala de una presentación: el código que une SOLO a los dispositivos de una misma reunión
// (la compu del vendedor y el celular del prospecto). Sin sala no hay tiempo real: cada uno juega solo.
// Así dos prospectos que abren la misma demo al mismo tiempo nunca se pisan.
import { useState } from 'react'

const clave = (slug: string) => `sawatek-sala:${slug}`
const valida = (s: string | null) => (s && /^[a-z0-9]{4,12}$/.test(s) ? s : null)

export const nuevaSala = () => Math.random().toString(36).slice(2, 8)

function leer(slug: string): string | null {
  const deUrl = valida(new URLSearchParams(location.search).get('sala'))
  try {
    if (deUrl) sessionStorage.setItem(clave(slug), deUrl)
    return deUrl ?? valida(sessionStorage.getItem(clave(slug)))
  } catch {
    return deUrl
  }
}

/** Sala a la que entró este dispositivo (por el link `?sala=` o antes en esta pestaña). */
export function useSala(slug: string): string | null {
  const [sala] = useState(() => leer(slug))
  return sala
}

/** Para el modo escenario: usa la sala del link o crea una nueva. */
export function useSalaDeEscenario(slug: string): string {
  const [sala] = useState(() => {
    const s = leer(slug) ?? nuevaSala()
    try {
      sessionStorage.setItem(clave(slug), s)
    } catch {
      // sin sessionStorage: la sala dura lo que la pestaña
    }
    return s
  })
  return sala
}

export const linkConSala = (slug: string, sala: string, ruta = '') => `${location.origin}/${slug}${ruta}?sala=${sala}`
