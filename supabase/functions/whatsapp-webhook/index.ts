// Edge Function `whatsapp-webhook`: lo que WhatsApp (Meta) nos avisa.
//   GET  → verificación del webhook (hub.mode=subscribe, hub.verify_token, hub.challenge).
//   POST → respuestas de los clientes y estados de entrega. Firmado por Meta con X-Hub-Signature-256
//          (HMAC SHA-256 del cuerpo con el app secret): si la firma no coincide, 401.
// Se despliega SIN verificación de JWT (Meta no manda JWT): `supabase functions deploy whatsapp-webhook --no-verify-jwt`.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0'
import { procesarCola } from '../_compartido/cola.ts'
import { clienteServicio, env, igualesSeguro, json } from '../_compartido/entorno.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

/** Firma de Meta: "sha256=" + hex(HMAC-SHA256(cuerpo crudo, app secret)). */
async function firmaValida(cuerpo: Uint8Array, cabecera: string | null, secreto: string): Promise<boolean> {
  if (!cabecera?.startsWith('sha256=')) return false
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, cuerpo))
  const hex = Array.from(firma, (b) => b.toString(16).padStart(2, '0')).join('')
  return igualesSeguro(cabecera.slice(7).toLowerCase(), hex)
}

const BOTON = /^(CONFIRMAR|CAMBIAR):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

interface MensajeEntrante {
  id: string
  from: string
  type: string
  button?: { payload?: string; text?: string }
  interactive?: { button_reply?: { id?: string } }
}
interface EstadoEntrega {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp?: string
  errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[]
}
interface Aviso {
  entry?: { changes?: { field?: string; value?: { messages?: MensajeEntrante[]; statuses?: EstadoEntrega[] } }[] }[]
}

async function responderBoton(db: SupabaseClient, m: MensajeEntrante) {
  const payload = m.button?.payload ?? m.interactive?.button_reply?.id ?? ''
  const boton = BOTON.exec(payload.trim())
  if (!boton) return { mensaje: m.id, accion: 'ignorado' }
  const [, accion, turno] = boton
  const funcion = accion!.toUpperCase() === 'CONFIRMAR' ? 'confirmar_por_whatsapp' : 'pedir_cambio_por_whatsapp'
  const { data, error } = await db.rpc(funcion, { p_turno: turno, p_telefono: m.from })
  if (error) throw new Error(`${funcion}: ${error.message}`)
  return { mensaje: m.id, accion: accion!.toLowerCase(), turno, resultado: data as string }
}

/** Negocio de un turno (para mandar la respuesta enseguida, solo de ese negocio). */
async function negocioDe(db: SupabaseClient, turno: string): Promise<string | null> {
  const { data } = await db.from('turnos').select('negocio_id').eq('id', turno).maybeSingle()
  return (data as { negocio_id: string } | null)?.negocio_id ?? null
}

async function actualizarEstado(db: SupabaseClient, s: EstadoEntrega) {
  const cuando = s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : new Date().toISOString()
  if (s.status === 'delivered') {
    await db.from('mensajes').update({ entregado: cuando }).eq('proveedor_id', s.id).is('entregado', null)
  } else if (s.status === 'read') {
    await db.from('mensajes').update({ leido: cuando }).eq('proveedor_id', s.id).is('leido', null)
    await db.from('mensajes').update({ entregado: cuando }).eq('proveedor_id', s.id).is('entregado', null)
  } else if (s.status === 'failed') {
    const e = s.errors?.[0]
    const detalle = `WhatsApp ${e?.code ?? ''}: ${e?.title ?? e?.message ?? 'falló la entrega'}${e?.error_data?.details ? ` (${e.error_data.details})` : ''}`
    await db.from('mensajes').update({ estado: 'error', error: detalle.slice(0, 500) }).eq('proveedor_id', s.id)
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const token = env('WHATSAPP_VERIFY_TOKEN')
    const modo = url.searchParams.get('hub.mode')
    const recibido = url.searchParams.get('hub.verify_token') ?? ''
    const desafio = url.searchParams.get('hub.challenge') ?? ''
    if (token && modo === 'subscribe' && igualesSeguro(recibido, token)) {
      return new Response(desafio, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }
    return new Response('Prohibido', { status: 403 })
  }

  if (req.method !== 'POST') return json({ error: 'metodo_no_permitido' }, 405)

  const secreto = env('WHATSAPP_APP_SECRET')
  if (!secreto) return json({ error: 'sin_configurar', detalle: 'Falta WHATSAPP_APP_SECRET' }, 500)
  const crudo = new Uint8Array(await req.arrayBuffer())
  if (!(await firmaValida(crudo, req.headers.get('x-hub-signature-256'), secreto))) {
    return json({ error: 'firma_invalida' }, 401)
  }

  let aviso: Aviso
  try {
    aviso = JSON.parse(new TextDecoder().decode(crudo)) as Aviso
  } catch {
    return json({ error: 'json_invalido' }, 400)
  }

  const db = clienteServicio()
  const resultados: unknown[] = []
  try {
    for (const entrada of aviso.entry ?? []) {
      for (const cambio of entrada.changes ?? []) {
        for (const m of cambio.value?.messages ?? []) {
          if (m.type === 'button' || m.type === 'interactive') resultados.push(await responderBoton(db, m))
        }
        for (const s of cambio.value?.statuses ?? []) await actualizarEstado(db, s)
      }
    }
  } catch (e) {
    // 500: Meta reintenta el aviso más tarde (las funciones de la base son idempotentes).
    console.error('whatsapp-webhook:', e)
    return json({ error: 'fallo', detalle: (e as Error).message }, 500)
  }

  // Si se encoló una respuesta (gracias / link para cambiar), sale ya, sin esperar al cron.
  const turnos = new Set<string>()
  for (const r of resultados as { turno?: string; resultado?: string }[]) {
    if (r.turno && ['confirmado', 'no_confirmable', 'aviso_encolado'].includes(r.resultado ?? '')) turnos.add(r.turno)
  }
  if (turnos.size) {
    const envio = (async () => {
      const negocios = new Set<string>()
      for (const t of turnos) {
        const n = await negocioDe(db, t)
        if (n) negocios.add(n)
      }
      for (const n of negocios) await procesarCola(db, { negocio: n, limite: 10, tiempoMaxMs: 20_000 })
    })().catch((e) => console.error('envío inmediato:', e))
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(envio)
    else await envio
  }

  return json({ ok: true, resultados })
})
