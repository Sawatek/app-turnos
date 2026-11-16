// Hace que la app se instale CON LA MARCA DEL NEGOCIO: nombre, ícono e inicio propios.
//
// Android/Chrome lee el manifest. Tiene que estar en una URL real del sitio (con blob:/data: el cartel de
// instalar falla), así que la página dibuja los íconos, arma el manifest, los guarda en la caché "marcas"
// y el service worker los sirve en /m/<negocio>/… (ver vite.config.ts). Si algún día se sirve desde el servidor (Vercel),
// esa misma URL la responde el servidor y esto queda como respaldo.
//
// iPhone usa el ícono de <link rel="apple-touch-icon"> y el título de <meta name="apple-mobile-web-app-title">,
// y abre la app en la página desde donde se agregó.
import { useEffect } from 'react'
import type { Negocio } from '@/dominio/tipos'
import { generarTema } from '@/tema/paleta'
import { iniciales } from '@/ui/Logo'

const CACHE = 'marcas'
const FUENTE = '"Plus Jakarta Sans Variable", system-ui, sans-serif'

type Tipo = 'any' | 'maskable' | 'apple'

async function dibujarIcono(n: Negocio, lado: number, tipo: Tipo): Promise<HTMLCanvasElement> {
  const tema = generarTema(n.color, n.modo)
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = lado
  const ctx = lienzo.getContext('2d')!

  if (n.logo) {
    // Logo sobre blanco, centrado. En "maskable" queda dentro de la zona segura (Android recorta un círculo).
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, lado, lado)
    const img = new Image()
    img.src = n.logo
    await img.decode()
    const caja = lado * (tipo === 'maskable' ? 0.62 : tipo === 'apple' ? 0.78 : 0.84)
    const k = Math.min(caja / img.width, caja / img.height)
    const w = img.width * k
    const h = img.height * k
    ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h)
  } else {
    // Sin logo: iniciales sobre el color de marca, con el contraste que ya garantiza el tema.
    ctx.fillStyle = tema['--t-acento']!
    ctx.fillRect(0, 0, lado, lado)
    await document.fonts.load(`800 ${lado}px ${FUENTE}`).catch(() => undefined)
    ctx.fillStyle = tema['--t-sobre-acento']!
    ctx.font = `800 ${Math.round(lado * (tipo === 'maskable' ? 0.3 : 0.38))}px ${FUENTE}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(iniciales(n.nombre), lado / 2, lado * 0.53)
  }
  return lienzo
}

const aBlob = (c: HTMLCanvasElement) => new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo generar el ícono'))), 'image/png'))

function huella(n: Negocio) {
  let h = 2166136261
  for (const c of JSON.stringify([n.nombre, n.color, n.modo, n.claim, n.logo?.length, n.logo?.slice(-80)])) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0).toString(36)
}

export function manifestDe(n: Negocio, base: string, v: string) {
  const fondo = generarTema(n.color, n.modo)['--t-fondo']!
  return {
    id: `/${n.slug}`,
    name: n.nombre,
    short_name: n.nombre.length <= 12 ? n.nombre : n.nombre.split(' ')[0]!.slice(0, 12),
    description: n.claim,
    lang: 'es-AR',
    dir: 'ltr',
    start_url: `/${n.slug}?origen=app`,
    scope: `/${n.slug}`,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: fondo,
    background_color: fondo,
    categories: ['lifestyle', 'health'],
    icons: [
      { src: `${base}/icon-192.png?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icon-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}/icon-maskable-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

function fijarEnHead(selector: string, crear: () => HTMLElement, attr: string, valor: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = crear()
    document.head.append(el)
  }
  const anterior = el.getAttribute(attr) ?? ''
  el.setAttribute(attr, valor)
  return () => el.setAttribute(attr, anterior)
}

const link = (rel: string) => () => Object.assign(document.createElement('link'), { rel })
const meta = (name: string) => () => Object.assign(document.createElement('meta'), { name })

/** Espera a que el service worker controle esta página (sin él, /m/… no existe). */
async function swListo(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  await navigator.serviceWorker.ready
  if (navigator.serviceWorker.controller) return true
  return new Promise((ok) => {
    const t = setTimeout(() => ok(false), 8000)
    navigator.serviceWorker.addEventListener('controllerchange', () => (clearTimeout(t), ok(true)), { once: true })
  })
}

async function publicarMarca(n: Negocio): Promise<{ manifest: string; apple: string } | null> {
  const v = huella(n)
  const base = `/m/${n.slug}`
  const [i192, i512, mask, apple] = await Promise.all([
    dibujarIcono(n, 192, 'any'),
    dibujarIcono(n, 512, 'any'),
    dibujarIcono(n, 512, 'maskable'),
    dibujarIcono(n, 180, 'apple'),
  ])
  const appleDataUrl = apple.toDataURL('image/png')
  if (!('caches' in window) || !(await swListo())) return { manifest: '', apple: appleDataUrl }

  const cache = await caches.open(CACHE)
  // Borra versiones viejas de este negocio.
  for (const req of await cache.keys()) if (new URL(req.url).pathname.startsWith(`${base}/`)) await cache.delete(req)
  const png = (b: Blob) => new Response(b, { headers: { 'Content-Type': 'image/png' } })
  const manifestUrl = `${base}/manifest.webmanifest?v=${v}`
  await Promise.all([
    cache.put(`${base}/icon-192.png?v=${v}`, png(await aBlob(i192))),
    cache.put(`${base}/icon-512.png?v=${v}`, png(await aBlob(i512))),
    cache.put(`${base}/icon-maskable-512.png?v=${v}`, png(await aBlob(mask))),
    cache.put(`${base}/icon-apple-180.png?v=${v}`, png(await aBlob(apple))),
    cache.put(manifestUrl, new Response(JSON.stringify(manifestDe(n, base, v)), { headers: { 'Content-Type': 'application/manifest+json' } })),
  ])
  return { manifest: manifestUrl, apple: appleDataUrl }
}

/** Mientras se ve la app de un negocio, la página "se presenta" como la app de ese negocio. */
export function useMarcaInstalable(n: Negocio) {
  useEffect(() => {
    let vigente = true
    const deshacer: (() => void)[] = [fijarEnHead('meta[name="apple-mobile-web-app-title"]', meta('apple-mobile-web-app-title'), 'content', n.nombre)]
    void publicarMarca(n)
      .then((r) => {
        if (!vigente || !r) return
        deshacer.push(fijarEnHead('link[rel="apple-touch-icon"]', link('apple-touch-icon'), 'href', r.apple))
        if (r.manifest) deshacer.push(fijarEnHead('link[rel="manifest"]', link('manifest'), 'href', r.manifest))
      })
      .catch((err: unknown) => console.warn('No se pudo preparar la instalación con la marca del negocio', err))
    return () => {
      vigente = false
      deshacer.forEach((f) => f())
    }
  }, [n])
}
