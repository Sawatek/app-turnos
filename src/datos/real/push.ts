// Notificaciones push del celular (fase 4). Contrato que usa la app del cliente (fase 3):
//   pushSoportado()            → si este navegador puede recibir push (y la app tiene clave VAPID configurada)
//   activarPush(negocioId)     → pide permiso, suscribe el celular y guarda la suscripción en la base
// El service worker que muestra la notificación es public/push-sw.js (lo importa el de Workbox).
// Las manda la Edge Function `enviar-mensajes` (recordatorio de 2 h). Ver docs/WHATSAPP.md.
import { supabase } from '../supabase'

export type ResultadoPush = 'activado' | 'denegado' | 'no-soportado'

/** Clave pública VAPID (la privada vive solo en las Edge Functions). */
const clavePublica = (): string => String(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '').trim()

export function pushSoportado(): boolean {
  return (
    typeof window !== 'undefined' &&
    clavePublica() !== '' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** base64url → bytes (formato que pide pushManager.subscribe). */
function deBase64Url(b64: string): Uint8Array<ArrayBuffer> {
  const normal = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(normal)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const mismaClave = (a: ArrayBuffer | null, b: Uint8Array) => {
  if (!a || a.byteLength !== b.byteLength) return false
  const x = new Uint8Array(a)
  return x.every((v, i) => v === b[i])
}

/** Service worker activo, sin quedarse colgado si nunca se registró (ej.: modo privado de algunos navegadores). */
async function serviceWorkerListo(ms = 10_000): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), ms))])
}

export async function activarPush(negocioId: string): Promise<ResultadoPush> {
  if (!pushSoportado() || !supabase) return 'no-soportado'

  const permiso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permiso !== 'granted') return 'denegado'

  const registro = await serviceWorkerListo()
  if (!registro) return 'no-soportado'

  const clave = deBase64Url(clavePublica())
  let sus = await registro.pushManager.getSubscription()
  // Si la suscripción es de otra clave VAPID (se cambiaron las claves), se rehace.
  if (sus && !mismaClave(sus.options.applicationServerKey, clave)) {
    await sus.unsubscribe()
    sus = null
  }
  sus ??= await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave })

  const datos = sus.toJSON()
  if (!datos.endpoint || !datos.keys?.p256dh || !datos.keys.auth) throw new Error('Suscripción push incompleta')
  const { error } = await supabase.rpc('guardar_push', {
    p_negocio: negocioId,
    p_endpoint: datos.endpoint,
    p_p256dh: datos.keys.p256dh,
    p_auth: datos.keys.auth,
  })
  if (error) throw new Error(`No se pudo guardar la suscripción: ${error.message}`)
  return 'activado'
}
