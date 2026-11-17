import type { MetaNegocio } from '@/datos/negocios'
import type { Negocio } from '@/dominio/tipos'

/** Lo que reciben las pantallas de un negocio REAL (no demo). */
export interface PropsNegocioReal {
  /** Configuración de marca y textos (colores, logo, claim, promos, mensajes). */
  n: Negocio
  /** id en la base y estado. Para un negocio real, `meta.id` nunca es null. */
  meta: MetaNegocio & { id: string }
}
