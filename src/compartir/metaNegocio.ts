// Vista previa del link de cada negocio (WhatsApp, Instagram, Facebook…). Esos bots no ejecutan JS, así que
// middleware.ts les reescribe las etiquetas <meta> de index.html con la marca del negocio. Acá va la lógica
// pura (sin red ni dependencias, con imports relativos: la empaqueta Vercel junto al middleware).
import { FORMA_SLUG, SLUGS_RESERVADOS } from '../dominio/slugs'

/** Bots que arman vistas previas de links. */
export const BOTS_DE_VISTA_PREVIA = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|skypeuripreview|pinterest/i

export interface DatosCompartir {
  titulo: string
  descripcion: string
  /** URL absoluta de la imagen. */
  imagen: string
  /** true si la imagen es el logo (cuadrado) y no la imagen de la plataforma (1200×630). */
  imagenEsLogo: boolean
  /** URL canónica del link del negocio. */
  url: string
}

/** Lo que se usa de la columna `config` de negocios (un Negocio, pero viene de la base: se valida todo). */
interface ConfigCompartir {
  nombre?: unknown
  bajada?: unknown
  claim?: unknown
  logo?: unknown
}

const texto = (v: unknown, max = 300) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** El slug de una ruta de un solo segmento (`/barberia-x` o `/barberia-x/`), si puede ser un negocio. */
export function slugDeRuta(ruta: string): string | null {
  const m = /^\/([^/]+)\/?$/.exec(ruta)
  const slug = m?.[1]
  if (!slug || !FORMA_SLUG.test(slug) || SLUGS_RESERVADOS.has(slug)) return null
  return slug
}

/** Solo sirve como og:image una URL absoluta http(s) (un data: no lo lee ningún bot). */
export function esUrlDeImagen(v: string) {
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Arma título, descripción e imagen a partir de la config del negocio. null si no tiene ni nombre. */
export function datosDeNegocio(config: unknown, slug: string, origen: string): DatosCompartir | null {
  if (!config || typeof config !== 'object') return null
  const c = config as ConfigCompartir
  const nombre = texto(c.nombre, 80)
  if (!nombre) return null
  const logo = texto(c.logo, 2000)
  const usarLogo = esUrlDeImagen(logo)
  const bajada = texto(c.bajada, 120)
  const claim = texto(c.claim, 200)
  const descripcion = [claim, bajada].filter(Boolean).join(' · ') || `Sacá tu turno en ${nombre} en segundos, desde el celular.`
  return {
    titulo: `${nombre} · Reservá tu turno`,
    descripcion,
    imagen: usarLogo ? logo : `${origen}/compartir.jpg`,
    imagenEsLogo: usarLogo,
    url: `${origen}/${slug}`,
  }
}

/** Escapa lo que viene de la base para meterlo en el HTML (texto o atributo entre comillas dobles). */
export function escapar(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const escRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const etiquetaMeta = (atributo: string, clave: string) =>
  new RegExp(`<meta\\s+[^>]*${atributo}\\s*=\\s*["']${escRegex(clave)}["'][^>]*>`, 'gi')

/** Agrega antes de </head> (o al final si no hay). */
function sumarAlHead(html: string, etiqueta: string) {
  const i = html.search(/<\/head>/i)
  return i === -1 ? html + etiqueta : `${html.slice(0, i)}${etiqueta}\n  ${html.slice(i)}`
}

/** Reemplaza la primera etiqueta que coincide (borra las repetidas) o la agrega. Siempre con función de
 *  reemplazo: así un `$&` que venga de la base no se interpreta. */
function ponerEtiqueta(html: string, patron: RegExp, etiqueta: string) {
  let puesta = false
  const nuevo = html.replace(patron, () => {
    if (puesta) return ''
    puesta = true
    return etiqueta
  })
  return puesta ? nuevo : sumarAlHead(nuevo, etiqueta)
}

const meta = (html: string, atributo: 'name' | 'property', clave: string, valor: string) =>
  ponerEtiqueta(html, etiquetaMeta(atributo, clave), `<meta ${atributo}="${clave}" content="${escapar(valor)}" />`)

const sacarMeta = (html: string, atributo: 'name' | 'property', clave: string) => html.replace(etiquetaMeta(atributo, clave), '')

/** Reescribe title, description, og:*, twitter:* y canonical de index.html con los datos del negocio. */
export function reescribirMeta(html: string, d: DatosCompartir): string {
  let h = ponerEtiqueta(html, /<title[^>]*>[\s\S]*?<\/title>/gi, `<title>${escapar(d.titulo)}</title>`)
  h = meta(h, 'name', 'description', d.descripcion)
  h = meta(h, 'property', 'og:type', 'website')
  h = meta(h, 'property', 'og:title', d.titulo)
  h = meta(h, 'property', 'og:description', d.descripcion)
  h = meta(h, 'property', 'og:url', d.url)
  h = meta(h, 'property', 'og:image', d.imagen)
  if (d.imagenEsLogo) {
    // Las medidas de index.html son las de compartir.jpg: con el logo no valen.
    h = sacarMeta(h, 'property', 'og:image:width')
    h = sacarMeta(h, 'property', 'og:image:height')
  }
  h = meta(h, 'property', 'og:image:alt', d.titulo)
  h = meta(h, 'name', 'twitter:card', d.imagenEsLogo ? 'summary' : 'summary_large_image')
  h = meta(h, 'name', 'twitter:title', d.titulo)
  h = meta(h, 'name', 'twitter:description', d.descripcion)
  h = meta(h, 'name', 'twitter:image', d.imagen)
  h = ponerEtiqueta(h, /<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi, `<link rel="canonical" href="${escapar(d.url)}" />`)
  return h
}
