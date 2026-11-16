// Procesa la cola public.mensajes: toma lotes con tomar_mensajes(), manda cada uno por su canal
// y anota el resultado con registrar_envio(). Lo usan `enviar-mensajes` (cron) y `whatsapp-webhook`
// (para que la respuesta a un botón salga enseguida, sin esperar al próximo minuto).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0'
import { env } from './entorno.ts'
import { enviarPush, pushConfigurado } from './push.ts'
import type { Mensaje, Resultado } from './tipos.ts'
import { enviarWhatsApp } from './whatsapp.ts'

export type Proveedor = 'consola' | 'whatsapp'

export function proveedor(): Proveedor {
  const p = env('MENSAJES_PROVEEDOR', 'consola')
  if (p !== 'consola' && p !== 'whatsapp') throw new Error(`MENSAJES_PROVEEDOR inválido: ${p} (usar consola o whatsapp)`)
  return p
}

/** Link a la app del negocio (APP_URL + /slug). */
export function linkApp(m: Mensaje): string {
  const base = env('APP_URL').replace(/\/+$/, '')
  const slug = m.contenido?.slug
  return `${base}/${typeof slug === 'string' ? slug : ''}`
}

/** Texto legible del mensaje (push, consola, aviso de WhatsApp). La base ya lo arma; acá se completa {link}. */
export function textoDe(m: Mensaje): string {
  const c = m.contenido ?? {}
  const texto = typeof c.texto === 'string' && c.texto ? c.texto : m.tipo === 'codigo' ? `Tu código es ${c.codigo}` : ''
  return texto.replaceAll('{link}', linkApp(m))
}

async function enviarUno(db: SupabaseClient, m: Mensaje, prov: Proveedor): Promise<Resultado> {
  const texto = textoDe(m)
  // Push: con claves VAPID se manda de verdad; sin claves, en modo consola se registra y listo.
  if (m.canal === 'push' && (pushConfigurado() || prov !== 'consola')) return enviarPush(db, m, texto)
  if (prov === 'consola') {
    console.log(`[consola] ${m.canal} → ${m.destino} · ${m.tipo}: ${texto}`)
    return { resultado: 'enviado', proveedorId: `consola-${m.id}` }
  }
  if (m.canal === 'whatsapp') return enviarWhatsApp(m, texto)
  return { resultado: 'error', error: `canal ${m.canal} sin proveedor` }
}

export interface Resumen {
  tomados: number
  enviados: number
  reintentos: number
  errores: number
  cancelados: number
}

/**
 * Procesa la cola hasta vaciarla o hasta que se agote el tiempo.
 * `negocio` (opcional) limita a un negocio (lo usan los tests).
 */
export async function procesarCola(
  db: SupabaseClient,
  opciones: { limite?: number; negocio?: string | null; tiempoMaxMs?: number; paralelos?: number } = {},
): Promise<Resumen> {
  const prov = proveedor()
  const limite = opciones.limite ?? (Number(env('MENSAJES_LOTE', '50')) || 50)
  const tiempoMax = opciones.tiempoMaxMs ?? 40_000
  const paralelos = opciones.paralelos ?? 5
  const inicio = Date.now()
  const resumen: Resumen = { tomados: 0, enviados: 0, reintentos: 0, errores: 0, cancelados: 0 }

  while (Date.now() - inicio < tiempoMax) {
    const { data, error } = await db.rpc('tomar_mensajes', { p_limite: limite, p_negocio: opciones.negocio ?? null })
    if (error) throw new Error(`tomar_mensajes: ${error.message}`)
    const lote = (data ?? []) as Mensaje[]
    if (!lote.length) break
    resumen.tomados += lote.length

    // De a `paralelos` por vez (respeta los límites del proveedor y no satura la función).
    for (let i = 0; i < lote.length; i += paralelos) {
      await Promise.all(
        lote.slice(i, i + paralelos).map(async (m) => {
          let r: Resultado
          try {
            r = await enviarUno(db, m, prov)
          } catch (e) {
            r = { resultado: 'reintentar', error: (e as Error).message }
          }
          const { error: e2 } = await db.rpc('registrar_envio', {
            p_id: m.id,
            p_resultado: r.resultado,
            p_proveedor_id: r.proveedorId ?? null,
            p_error: r.error ?? null,
          })
          if (e2) console.error(`registrar_envio ${m.id}: ${e2.message}`)
          if (r.resultado === 'enviado') resumen.enviados++
          else if (r.resultado === 'reintentar') resumen.reintentos++
          else if (r.resultado === 'error') resumen.errores++
          else resumen.cancelados++
          if (r.resultado !== 'enviado') console.warn(`mensaje ${m.id} (${m.tipo}/${m.canal}): ${r.resultado} · ${r.error ?? ''}`)
        }),
      )
    }
    if (lote.length < limite) break
  }
  return resumen
}
