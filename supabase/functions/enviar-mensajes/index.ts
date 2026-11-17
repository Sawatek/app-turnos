// Edge Function `enviar-mensajes`: el despachador de la cola de mensajes.
// La llama pg_cron cada minuto (ver migración fase4) con "Authorization: Bearer <MENSAJES_SECRETO>".
// Se despliega SIN verificación de JWT: `supabase functions deploy enviar-mensajes --no-verify-jwt`
// (el secreto lo controla esta función).
//
// Cuerpo opcional (JSON): { "negocio_id": "<uuid>" } procesa solo ese negocio (para pruebas).
import { clienteServicio, env, igualesSeguro, json } from '../_compartido/entorno.ts'
import { procesarCola } from '../_compartido/cola.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'metodo_no_permitido' }, 405)

  const secreto = env('MENSAJES_SECRETO')
  if (!secreto) return json({ error: 'sin_configurar', detalle: 'Falta MENSAJES_SECRETO' }, 500)
  const auth = req.headers.get('authorization') ?? ''
  if (!igualesSeguro(auth, `Bearer ${secreto}`)) return json({ error: 'no_autorizado' }, 401)

  const cuerpo = (await req.json().catch(() => ({}))) as { negocio_id?: unknown }
  const negocio = typeof cuerpo.negocio_id === 'string' && UUID.test(cuerpo.negocio_id) ? cuerpo.negocio_id : null

  try {
    const resumen = await procesarCola(clienteServicio(), { negocio })
    return json(resumen)
  } catch (e) {
    console.error('enviar-mensajes:', e)
    return json({ error: 'fallo', detalle: (e as Error).message }, 500)
  }
})
