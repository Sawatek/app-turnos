import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { build, defineConfig, type Plugin, type Rollup } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Páginas públicas que van al sitemap (el resto de la app es por negocio o interna). */
const PAGINAS_PUBLICAS = ['/', '/terminos', '/privacidad']

/**
 * SEO que depende del dominio (variable VITE_URL_SITIO, ej. https://confirmo.com.ar).
 * - Con dominio: og:url y og:image / twitter:image absolutas (WhatsApp y Facebook las prefieren), sitemap.xml y la
 *   línea Sitemap en robots.txt. El canonical lo pone src/main.tsx por ruta.
 * - Sin dominio (local, vistas previas): imágenes relativas como antes, sin og:url ni sitemap.
 * robots.txt sale siempre de acá (no está en public/) para no tener dos fuentes.
 */
function seoDelSitio(): Plugin {
  let sitio = ''
  return {
    name: 'seo-del-sitio',
    configResolved(config) {
      sitio = String(config.env.VITE_URL_SITIO ?? '').trim().replace(/\/+$/, '')
    },
    transformIndexHtml(html) {
      if (!sitio) return html
      return {
        html: html.replaceAll('content="/compartir.jpg"', `content="${sitio}/compartir.jpg"`),
        tags: [{ tag: 'meta', attrs: { property: 'og:url', content: `${sitio}/` }, injectTo: 'head' }],
      }
    },
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /admin', ...(sitio ? ['', `Sitemap: ${sitio}/sitemap.xml`] : [])]
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' })
      if (!sitio) return
      const urls = PAGINAS_PUBLICAS.map((p) => `  <url><loc>${sitio}${p}</loc></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
  }
}


/** Carpeta temporal del build del servidor (se borra al terminar; está en .gitignore por si un build se corta). */
const SALIDA_SERVIDOR = 'dist-servidor'

/**
 * HTML pre-generado de la portada (`/`): el título y el contenido llegan en el HTML, sin esperar el JS (LCP y SEO).
 * - dist/app.html: el shell vacío de siempre, para el resto de las rutas (vercel.json y el service worker lo usan).
 * - dist/index.html: la portada ya dibujada (src/estatico.tsx con renderToString), con el tema de la marca en <html>,
 *   modulepreload del chunk de Inicio, preload de la fuente de títulos (latin) y el JSON-LD.
 * Corre adentro de `vite build`: hace un build del servidor aparte (sin este plugin ni la PWA), lo importa y lo borra.
 * Lo hace en generateBundle, antes de que vite-plugin-pwa arme el precache: así la revisión de index.html es la final.
 * En el navegador no se hidrata: src/main.tsx carga Inicio y dibuja encima con createRoot (ver ahí por qué).
 */
function portadaPreGenerada(): Plugin {
  let raiz = ''
  let modo = 'production'
  let base = '/'
  let sitio = ''
  let archivoConfig: string | undefined
  return {
    // Sin `apply: 'build'`: `vite preview` también lo usa (configurePreviewServer); en `vite` (dev) no hace nada.
    name: 'portada-pre-generada',
    configResolved(config) {
      raiz = config.root
      modo = config.mode
      base = config.base
      archivoConfig = config.configFile
      sitio = String(config.env.VITE_URL_SITIO ?? '').trim().replace(/\/+$/, '')
    },
    // `vite preview` igual que vercel.json: las rutas de la app (sin extensión, que no sean /) van a app.html.
    configurePreviewServer(servidor) {
      servidor.middlewares.use((req, _res, seguir) => {
        const ruta = (req.url ?? '/').split(/[?#]/)[0]!
        if (req.method === 'GET' && ruta !== '/' && !ruta.includes('.') && req.headers.accept?.includes('text/html')) req.url = '/app.html'
        seguir()
      })
    },
    generateBundle: {
      order: 'post',
      async handler(_opciones, bundle) {
        const shell = bundle['index.html']
        if (shell?.type !== 'asset' || typeof shell.source !== 'string') return this.error('No encontré dist/index.html para pre-generar la portada.')
        const original = shell.source
        if (!original.includes('<div id="raiz"></div>')) return this.error('index.html tiene que tener <div id="raiz"></div> vacío.')
        this.emitFile({ type: 'asset', fileName: 'app.html', source: original })

        // Build del servidor: mismo vite.config.ts (con isSsrBuild = true deja afuera este plugin, la PWA y el SEO).
        const salida = join(raiz, SALIDA_SERVIDOR)
        await build({
          configFile: archivoConfig,
          mode: modo,
          logLevel: 'warn',
          build: { ssr: 'src/estatico.tsx', outDir: salida, emptyOutDir: true, copyPublicDir: false, minify: false },
        })
        let portada: string, tema: { css: string; personalidad: string; colorBarra: string }, jsonLd: string
        try {
          const m = (await import(`${pathToFileURL(join(salida, 'estatico.js')).href}?v=${Date.now()}`)) as typeof import('./src/estatico')
          portada = m.htmlDeLaPortada()
          tema = m.temaDeLaPortada()
          jsonLd = m.jsonLdDeLaPortada(sitio)
        } finally {
          await rm(salida, { recursive: true, force: true })
        }

        // Lo que pide la portada apenas arranca: el chunk de Inicio (y lo que importa, si el shell no lo trae ya),
        // su CSS (las @font-face de Bricolage) y la fuente de los titulares, solo el subset latin.
        const chunks = Object.values(bundle).filter((c): c is Rollup.OutputChunk => c.type === 'chunk')
        const inicio = chunks.find((c) => c.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/pantallas/publico/Inicio.tsx'))
        if (!inicio) return this.error('No encontré el chunk de src/pantallas/publico/Inicio.tsx.')
        const js = new Set<string>()
        const css = new Set<string>()
        const juntar = (c: Rollup.OutputChunk) => {
          if (js.has(c.fileName)) return
          js.add(c.fileName)
          for (const archivo of c.viteMetadata?.importedCss ?? []) css.add(archivo)
          for (const i of c.imports) {
            const dep = bundle[i]
            if (dep?.type === 'chunk') juntar(dep)
          }
        }
        juntar(inicio)
        const fuente = Object.keys(bundle).find((f) => /bricolage-grotesque-latin-standard-normal-[\w-]+\.woff2$/.test(f))
        if (!fuente) this.warn('No encontré la fuente latin de Bricolage: la portada sale sin preload de la fuente.')
        const url = (archivo: string) => base + archivo
        const enShell = (archivo: string) => original.includes(`"${url(archivo)}"`)
        const etiquetas = [
          ...[...js].filter((f) => !enShell(f)).map((f) => `<link rel="modulepreload" crossorigin href="${url(f)}">`),
          ...[...css].filter((f) => !enShell(f)).map((f) => `<link rel="stylesheet" crossorigin href="${url(f)}">`),
          ...(fuente ? [`<link rel="preload" as="font" type="font/woff2" crossorigin href="${url(fuente)}">`] : []),
          // data-pre-generado: src/main.tsx lo saca al arrancar (React pone el suyo por ruta).
          ...(sitio ? [`<link rel="canonical" href="${sitio}/" data-pre-generado>`] : []),
          `<script type="application/ld+json">${jsonLd}</script>`,
          // El tema del sitio (claro u oscuro según <meta name="color-scheme">), igual al que pone useMarcaSitio.
          `<style id="tema-sitio">${tema.css}</style>`,
        ]

        const escaparAtributo = (v: string) => v.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
        let html = original
          .replace('<html lang="es-AR">', `<html lang="es-AR" data-sitio data-personalidad="${escaparAtributo(tema.personalidad)}">`)
          .replace(/(<meta name="theme-color" content=")[^"]*"/, `$1${escaparAtributo(tema.colorBarra)}"`)
          .replace('</head>', `    ${etiquetas.join('\n    ')}\n  </head>`)
        if (html === original || !html.includes('data-personalidad')) return this.error('No pude poner el tema en <html lang="es-AR">.')
        html = html.replace('<div id="raiz"></div>', () => `<div id="raiz">${portada}</div>`)
        shell.source = html
      },
    },
  }
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    // El build del servidor (solo para pre-generar la portada) no lleva SEO, portada ni PWA.
    ...(isSsrBuild ? [] : [seoDelSitio(), portadaPreGenerada()]),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    !isSsrBuild && VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // se registra en src/main.tsx
      // El manifest NO es uno solo: cada negocio tiene el suyo (nombre, ícono, inicio).
      // public/manifest.webmanifest es el de SawaTek; el de cada negocio lo arma src/instalacion/marca.ts.
      manifest: false,
      includeAssets: ['icono.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'],
      workbox: {
        // Las rutas de la app (cada negocio, panel, /mis-turnos…) usan el shell vacío. La portada (/) no: la sirve el
        // precache tal cual (index.html ya dibujada), también sin conexión.
        navigateFallback: '/app.html',
        navigateFallbackDenylist: [/^\/$/, /^\/m\//, /^\/(robots\.txt|sitemap\.xml)$/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // Fuera del precache: la consola de SawaTek (solo en la compu, con conexión) y subsets de fuentes que no usamos
        // (latin-ext de los títulos casi no aparece). Las fuentes que falten se guardan al usarse ("fuentes", abajo).
        // Ojo: la app del cliente y el panel SÍ van (son lo que se instala y tiene que andar sin conexión), con sus fuentes
        // de títulos (Bricolage) y de datos (Martian Mono): son parte del dibujo de la app.
        globIgnores: ['**/Admin-*', '**/*-vietnamese-*', '**/*-cyrillic*', '**/*-greek*', '**/bricolage-*-latin-ext-*'],
        skipWaiting: true,
        clientsClaim: true,
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            // Manifest e íconos de cada negocio: los guarda la página en la caché "marcas" y el service worker
            // los sirve desde una URL real (Chrome no instala con manifests blob:/data:).
            // Si algún día /m/* lo responde el servidor, cambiar a NetworkFirst.
            urlPattern: ({ url }) => url.pathname.startsWith('/m/'),
            handler: 'CacheOnly',
            options: { cacheName: 'marcas' },
          },
          {
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fuentes', expiration: { maxEntries: 20 } },
          },
        ],
      },
      devOptions: { enabled: true, navigateFallback: 'index.html', suppressWarnings: true },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Solo variables públicas: VITE_* y las NEXT_PUBLIC_SUPABASE_* de la integración con Vercel.
  // Nunca exponer SUPABASE_SECRET_KEY ni SUPABASE_SERVICE_ROLE_KEY (no tienen estos prefijos).
  envPrefix: ['VITE_', 'NEXT_PUBLIC_SUPABASE_'],
  server: {
    port: 5180,
    host: true,
    // Pre-compila las pantallas apenas arranca: la primera carga no espera a transformar todo (en los e2e, varios
    // navegadores piden la app a la vez con el servidor recién levantado y la primera página tardaba más de 5 s).
    warmup: { clientFiles: ['./src/main.tsx', './src/pantallas/**/*.tsx', './src/ui/*.tsx'] },
  },
}))
