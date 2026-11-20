// Vercel Routing Middleware (file convention: middleware.ts en la raíz; runtime Node.js por defecto).
//
// WhatsApp, Instagram, Facebook y compañía no ejecutan JS: sin esto, el link de cada negocio se compartiría con el
// título y la imagen de la plataforma. Solo para esos bots y para /<slug> de un negocio, trae app.html del mismo
// sitio (el shell de la app; index.html es la portada pre-generada) y le pone el nombre, la descripción y el logo del
// negocio. A la gente le llega el pedido normal.
// La lógica de reemplazo está en src/compartir/metaNegocio.ts (pura y con tests); acá solo se orquesta.
// Imports relativos (no '@/'): este archivo lo empaqueta Vercel, no Vite.
import { BOTS_DE_VISTA_PREVIA, datosDeNegocio, reescribirMeta, slugDeRuta } from './src/compartir/metaNegocio'

// Un solo segmento con forma de link (sin puntos: no toca /app.html, /sw.js ni /assets/…).
export const config = { matcher: '/:slug([a-z0-9-]+)' }

/** Más que esto y el bot se cansa: mejor la vista previa genérica. */
const ESPERA_MAXIMA_MS = 1500

// Mismos nombres que usa la app (src/datos/supabase.ts); los carga la integración Vercel ↔ Supabase.
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const CLAVE_SUPABASE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// app.html cambia solo con cada deploy (y cada deploy arranca instancias nuevas): se guarda por instancia.
let indexGuardado: Promise<string | null> | null = null

function traerIndex(origen: string, senal: AbortSignal) {
  indexGuardado ??= (async () => {
    const encabezados: Record<string, string> = {}
    // Si el deploy está protegido (previews con Vercel Authentication), el pedido a sí mismo necesita el bypass.
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    if (bypass) encabezados['x-vercel-protection-bypass'] = bypass
    const r = await fetch(`${origen}/app.html`, { headers: encabezados, signal: senal })
    return r.ok ? r.text() : null
  })().catch(() => null)
  const p = indexGuardado
  // Si falló, que el próximo pedido lo vuelva a intentar.
  void p.then((html) => {
    if (html === null && indexGuardado === p) indexGuardado = null
  })
  return p
}

async function traerConfig(slug: string, senal: AbortSignal): Promise<unknown> {
  const r = await fetch(`${URL_SUPABASE}/rest/v1/negocios?slug=eq.${encodeURIComponent(slug)}&select=config&limit=1`, {
    headers: { apikey: CLAVE_SUPABASE!, Authorization: `Bearer ${CLAVE_SUPABASE}`, Accept: 'application/json' },
    signal: senal,
  })
  if (!r.ok) return null
  const filas = (await r.json()) as unknown
  return Array.isArray(filas) ? (filas[0] as { config?: unknown } | undefined)?.config : null
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  // Devolver undefined = seguir con el pedido normal (la SPA de siempre).
  if (request.method !== 'GET' || !URL_SUPABASE || !CLAVE_SUPABASE) return
  if (!BOTS_DE_VISTA_PREVIA.test(request.headers.get('user-agent') ?? '')) return
  const url = new URL(request.url)
  const slug = slugDeRuta(url.pathname)
  if (!slug) return

  try {
    const senal = AbortSignal.timeout(ESPERA_MAXIMA_MS)
    const [configNegocio, html] = await Promise.all([traerConfig(slug, senal), traerIndex(url.origin, senal)])
    const datos = datosDeNegocio(configNegocio, slug, url.origin)
    if (!datos || !html) return
    return new Response(reescribirMeta(html, datos), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, s-maxage=600, stale-while-revalidate=86400',
        // La respuesta depende del user agent: que la caché no se la sirva a una persona.
        vary: 'user-agent',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch {
    // Timeout, base caída o respuesta rara: vista previa genérica.
    return
  }
}
