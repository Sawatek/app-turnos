// Notificaciones push (fase 4). Lo importa el service worker de Workbox (vite.config.ts → workbox.importScripts).
// El servidor (Edge Function enviar-mensajes) manda: { titulo, cuerpo, url, tag }.
/* eslint-env serviceworker */

self.addEventListener('push', (event) => {
  let datos = {}
  try {
    datos = event.data ? event.data.json() : {}
  } catch {
    datos = { cuerpo: event.data ? event.data.text() : '' }
  }
  const titulo = typeof datos.titulo === 'string' && datos.titulo ? datos.titulo : 'Tu turno'
  // Solo rutas de esta misma app (nunca un sitio externo).
  const url = typeof datos.url === 'string' && datos.url.startsWith('/') && !datos.url.startsWith('//') ? datos.url : '/'
  const tag = typeof datos.tag === 'string' ? datos.tag : undefined

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: typeof datos.cuerpo === 'string' ? datos.cuerpo : '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      lang: 'es-AR',
      tag,
      renotify: Boolean(tag),
      data: { url },
    }),
  )
})

// Tocar la notificación: si la app ya está abierta, se enfoca (y va al link); si no, se abre.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const igual = ventanas.find((v) => v.url === destino)
      if (igual) return igual.focus()
      const propia = ventanas.find((v) => new URL(v.url).origin === self.location.origin)
      if (propia) {
        await propia.focus()
        return 'navigate' in propia ? propia.navigate(destino) : undefined
      }
      return self.clients.openWindow(destino)
    })(),
  )
})
