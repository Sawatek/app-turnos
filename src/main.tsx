import { StrictMode, lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './estilos.css'
import { registerSW } from 'virtual:pwa-register'

const Portada = lazy(() => import('@/pantallas/Portada'))
const AppCliente = lazy(() => import('@/pantallas/cliente/AppCliente'))
const Panel = lazy(() => import('@/pantallas/panel/Panel'))
const Escenario = lazy(() => import('@/pantallas/escenario/Escenario'))
const Admin = lazy(() => import('@/pantallas/admin/Admin'))

const consultas = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })

const router = createBrowserRouter([
  { path: '/', element: <Portada /> },
  { path: '/admin', element: <Admin /> },
  { path: '/:slug', element: <AppCliente /> },
  { path: '/:slug/panel', element: <Panel /> },
  { path: '/:slug/escenario', element: <Escenario /> },
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
