// Notificaciones push (Web Push con claves VAPID). destino del mensaje = user_id del cliente:
// se manda a todos sus celulares/navegadores suscriptos a ese negocio.
import webpush from 'npm:web-push@3.6.7'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0'
import { env } from './entorno.ts'
import type { Mensaje, Resultado } from './tipos.ts'

// Solo se le hacen pedidos a los servicios de push conocidos (el endpoint lo manda el navegador del
// usuario: sin esta lista, alguien podría hacer que el servidor le pegue a cualquier URL).
const HOSTS_PUSH = ['fcm.googleapis.com', 'android.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com']

export function endpointPermitido(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  const hosts = env('PUSH_HOSTS') ? env('PUSH_HOSTS').split(',').map((h) => h.trim()).filter(Boolean) : HOSTS_PUSH
  return url.protocol === 'https:' && hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
}

export const pushConfigurado = () => Boolean(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY'))

let vapidListo = false

export async function enviarPush(db: SupabaseClient, m: Mensaje, texto: string): Promise<Resultado> {
  if (!pushConfigurado()) return { resultado: 'reintentar', error: 'Push sin configurar (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)' }
  if (!vapidListo) {
    webpush.setVapidDetails(env('VAPID_SUBJECT', 'mailto:hola@sawatek.com'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
    vapidListo = true
  }

  const { data: subs, error } = await db
    .from('push_suscripciones')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', m.destino)
    .eq('negocio_id', m.negocio_id ?? '')
  if (error) return { resultado: 'reintentar', error: `base: ${error.message}` }
  if (!subs?.length) return { resultado: 'cancelado', error: 'sin suscripciones push' }

  const c = m.contenido ?? {}
  const payload = JSON.stringify({
    titulo: String(c.negocio ?? 'Tu turno'),
    cuerpo: texto,
    url: c.slug ? `/${c.slug}` : '/',
    tag: m.turno_id ? `turno-${m.turno_id}` : m.id,
  })

  let enviados = 0
  let vencidas = 0
  let rechazadas = 0
  const fallas: string[] = []
  for (const s of subs) {
    if (!endpointPermitido(s.endpoint)) {
      rechazadas++
      continue
    }
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
        TTL: 2 * 3600,
        urgency: 'high',
        timeout: 15_000,
      })
      enviados++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        // La suscripción ya no existe (desinstaló la app o revocó el permiso): se borra.
        vencidas++
        await db.from('push_suscripciones').delete().eq('id', s.id)
      } else {
        fallas.push(`${status ?? 'red'}: ${(e as Error).message}`)
      }
    }
  }
  if (enviados > 0) return { resultado: 'enviado' }
  if (vencidas === subs.length) return { resultado: 'cancelado', error: 'suscripciones vencidas' }
  if (!fallas.length) return { resultado: 'error', error: `${rechazadas} endpoint(s) de push no permitidos (ver PUSH_HOSTS)` }
  return { resultado: 'reintentar', error: `push: ${fallas.join(' | ').slice(0, 400)}` }
}
