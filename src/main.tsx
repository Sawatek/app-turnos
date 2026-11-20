import { StrictMode, lazy, Suspense } from 'react'
import { MotionConfig } from 'motion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration, useLocation } from 'react-router'
import './estilos.css'
import { registerSW } from 'virtual:pwa-register'

const Legal = lazy(() => import('@/pantallas/publico/Legal'))
const MisTurnosGlobal = lazy(() => import('@/pantallas/cuenta/MisTurnos'))
const Portada = lazy(() => import('@/pantallas/Portada'))
const NoEncontrado = lazy(() => import('@/pantallas/NoEncontrado').then((m) => ({ default: m.NoEncontrado })))
const AppCliente = lazy(() => import('@/pantallas/cliente/AppCliente'))
const Panel = lazy(() => import('@/pantallas/panel/Panel'))
const Escenario = lazy(() => import('@/pantallas/escenario/Escenario'))
const Admin = lazy(() => import('@/pantallas/admin/Admin'))

const consultas = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })

// Dominio público del sitio (ej. https://confirmo.com.ar), sin barra final. Sin la variable no hay canonical.
const URL_SITIO = ((import.meta.env.VITE_URL_SITIO as string | undefined) ?? '').trim().replace(/\/+$/, '')

// Raíz común: cada pantalla nueva arranca arriba, "atrás" vuelve a donde estaba y un #ancla (/#precios) salta a su
// sección, también entrando directo. Lo resuelve <ScrollRestoration>: espera a que la ruta perezosa esté cargada
// (mientras tanto se ve HydrateFallback) y un hash que no se puede decodificar (/#%) lo ignora sin romper.
// El canonical va por ruta (React lo sube al <head>): uno fijo en index.html marcaría todo como copia de la portada.
function Raiz() {
  const { pathname } = useLocation()
  return (
    <>
      {URL_SITIO && <link rel="canonical" href={URL_SITIO + pathname} />}
      {/* Cada entrada directa (recargar, pegar un link) tiene la clave "default": sin esto, en una pestaña ya usada
          la posición guardada de otra página le ganaría al #ancla. Las navegaciones internas usan su clave de siempre. */}
      <ScrollRestoration getKey={(l) => (l.key === 'default' ? `entrada:${l.pathname}${l.hash}` : l.key)} />
      <Outlet />
    </>
  )
}

// Portada pre-generada en el build (vite.config.ts, plugin portadaPreGenerada): #raiz ya trae el HTML de `/`.
// Se carga Inicio ANTES del primer render y la ruta usa el componente directo (no `lazy`): si no, el router mostraría
// HydrateFallback (un fondo vacío) encima de la portada ya dibujada. Se dibuja con createRoot, NO con hydrateRoot:
// la hora del celular y la semilla usan new Date() y darían errores de hidratación (y los e2e fallan con cualquier
// error de consola). Dibuja lo mismo encima, así que no se nota. En `pnpm dev` #raiz llega vacío y sigue como siempre.
const raiz = document.getElementById('raiz')!
const portadaPreGenerada = location.pathname === '/' && raiz.hasChildNodes()
const Inicio = portadaPreGenerada ? (await import('@/pantallas/publico/Inicio')).default : null
// El canonical pre-generado lo reemplaza el de <Raiz> (uno por ruta).
for (const l of document.querySelectorAll('link[data-pre-generado]')) l.remove()

const router = createBrowserRouter([
  {
    element: <Raiz />,
    // Mientras carga la portada (ruta perezosa del router) en la primera visita.
    HydrateFallback: () => <div className="min-h-dvh bg-fondo" />,
    children: [
  // Público
  // Perezosa del router (no React.lazy): así la página ya está dibujada cuando <ScrollRestoration> busca el #ancla.
  Inicio
    ? { path: '/', Component: Inicio }
    : { path: '/', lazy: async () => ({ Component: (await import('@/pantallas/publico/Inicio')).default }) },
  { path: '/terminos', element: <Legal tipo="terminos" /> },
  { path: '/privacidad', element: <Legal tipo="privacidad" /> },
  // Cuenta del cliente en todos los negocios
  { path: '/mis-turnos', element: <MisTurnosGlobal /> },
  // SawaTek
  { path: '/demos', element: <Portada /> },
  { path: '/admin', element: <Admin /> },
  { path: '/admin/:seccion', element: <Admin /> },
  { path: '/:slug', element: <AppCliente /> },
  { path: '/:slug/panel', element: <Panel /> },
  { path: '/:slug/panel/:seccion', element: <Panel /> },
  { path: '/:slug/escenario', element: <Escenario /> },
  { path: '*', element: <NoEncontrado /> },
    ],
  },
])

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={consultas}>
      {/* Con "reducir movimiento" en el sistema, las animaciones de motion dejan de desplazar y escalar (solo funden). */}
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<div className="min-h-dvh bg-fondo" />}>
          <RouterProvider router={router} />
        </Suspense>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
)

// Service worker: modo sin conexión, instalación y el manifest de cada negocio (/m/…).
const registrar = () =>
  registerSW({
    immediate: true,
    // Sin service worker la app funciona igual (solo sin modo offline ni instalación con la marca del negocio).
    onRegisterError: (err: unknown) => console.warn('No se pudo registrar el service worker', err),
  })
// En la portada (un dueño que todavía no es cliente) el precache no compite con la carga: espera a que el navegador
// esté ocioso. En la app de cada negocio se registra enseguida (instalación y modo sin conexión).
if (location.pathname === '/') {
  const cuandoEsteOcioso = () => (window.requestIdleCallback ?? setTimeout)(registrar)
  if (document.readyState === 'complete') cuandoEsteOcioso()
  else addEventListener('load', cuandoEsteOcioso, { once: true })
} else registrar()
