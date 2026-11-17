import { StrictMode, lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router'
import './estilos.css'
import { registerSW } from 'virtual:pwa-register'

const InicioPublico = lazy(() => import('@/pantallas/publico/Inicio'))
const Legal = lazy(() => import('@/pantallas/publico/Legal'))
const MisTurnosGlobal = lazy(() => import('@/pantallas/cuenta/MisTurnos'))
const Portada = lazy(() => import('@/pantallas/Portada'))
const NoEncontrado = lazy(() => import('@/pantallas/NoEncontrado').then((m) => ({ default: m.NoEncontrado })))
const AppCliente = lazy(() => import('@/pantallas/cliente/AppCliente'))
const Panel = lazy(() => import('@/pantallas/panel/Panel'))
const Escenario = lazy(() => import('@/pantallas/escenario/Escenario'))
const Admin = lazy(() => import('@/pantallas/admin/Admin'))

const consultas = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })

// Raíz común: cada pantalla nueva arranca arriba (y "atrás" vuelve a donde estaba).
function Raiz() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <Raiz />,
    children: [
  // Público
  { path: '/', element: <InicioPublico /> },
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

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <QueryClientProvider client={consultas}>
      <Suspense fallback={<div className="min-h-dvh bg-fondo" />}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
)

// Service worker: modo sin conexión, instalación y el manifest de cada negocio (/m/…).
registerSW({
  immediate: true,
  // Sin service worker la app funciona igual (solo sin modo offline ni instalación con la marca del negocio).
  onRegisterError: (err: unknown) => console.warn('No se pudo registrar el service worker', err),
})
