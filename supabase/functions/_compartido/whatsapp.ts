// Envío por la API oficial de WhatsApp (WhatsApp Cloud API de Meta).
// Los mensajes que inicia el negocio TIENEN que ser plantillas aprobadas por Meta (ver docs/WHATSAPP.md).
// El 'aviso' es texto libre: solo se manda como respuesta, dentro de las 24 h desde que el cliente nos escribió
// (ej.: tocó "Cambiar horario").
import { env } from './entorno.ts'
import type { Mensaje, Resultado } from './tipos.ts'


type Datos = Record<string, unknown>

interface Plantilla {
  /** Variable de entorno con el nombre de la plantilla en Meta, y nombre por defecto. */
  variable: string
  porDefecto: string
  /** Campos del contenido, en el orden de {{1}}, {{2}}... del cuerpo. */
  parametros: string[]
  /** Botones de respuesta rápida "Confirmo" / "Cambiar horario". */
  botones?: boolean
}

const TURNO = ['nombre', 'negocio', 'servicio', 'profesional', 'dia', 'hora', 'direccion']

export const PLANTILLAS: Record<string, Plantilla> = {
  confirmacion: { variable: 'WHATSAPP_PLANTILLA_CONFIRMACION', porDefecto: 'turno_confirmacion', parametros: TURNO, botones: true },
  recordatorio24: { variable: 'WHATSAPP_PLANTILLA_RECORDATORIO24', porDefecto: 'turno_recordatorio_24', parametros: TURNO, botones: true },
  recordatorio2: { variable: 'WHATSAPP_PLANTILLA_RECORDATORIO2', porDefecto: 'turno_recordatorio_2', parametros: TURNO, botones: true },
  cancelacion: { variable: 'WHATSAPP_PLANTILLA_CANCELACION', porDefecto: 'turno_cancelado', parametros: ['nombre', 'servicio', 'dia', 'hora', 'negocio'] },
  recuperar: { variable: 'WHATSAPP_PLANTILLA_RECUPERAR', porDefecto: 'cliente_recuperar', parametros: ['nombre', 'negocio'] },
}

/** Meta no acepta parámetros vacíos, con saltos de línea ni con más de 4 espacios seguidos. */
const limpiar = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 900) || '-'

/** Arma el cuerpo del pedido a /messages para un mensaje de la cola (sin mandarlo). */
export function armarPedido(m: Mensaje, texto: string): Datos {
  const c = (m.contenido ?? {}) as Datos
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to: m.destino }
  const idioma = { code: env('WHATSAPP_IDIOMA', 'es_AR') }

  if (m.tipo === 'aviso') {
    return { ...base, type: 'text', text: { preview_url: true, body: texto } }
  }

  if (m.tipo === 'codigo') {
    // Plantilla de autenticación con botón "Copiar código": el código va en el cuerpo y en el botón.
    const codigo = limpiar(c.codigo)
    return {
      ...base,
      type: 'template',
      template: {
        name: env('WHATSAPP_PLANTILLA_CODIGO', 'codigo_ingreso'),
        language: idioma,
        components: [
          { type: 'body', parameters: [{ type: 'text', text: codigo }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: codigo }] },
        ],
      },
    }
  }

  const p = PLANTILLAS[m.tipo]
  if (!p) throw new Error(`Tipo de mensaje sin plantilla de WhatsApp: ${m.tipo}`)
  const components: Datos[] = [{ type: 'body', parameters: p.parametros.map((k) => ({ type: 'text', text: limpiar(c[k]) })) }]
  if (p.botones && m.turno_id) {
    components.push(
      { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: `CONFIRMAR:${m.turno_id}` }] },
      { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: `CAMBIAR:${m.turno_id}` }] },
    )
  }
  return { ...base, type: 'template', template: { name: env(p.variable, p.porDefecto), language: idioma, components } }
}

// Errores de Meta que se arreglan solos con el tiempo (límites, caídas): se reintenta. El resto es definitivo
// (número sin WhatsApp, plantilla inexistente o no aprobada, parámetros mal, fuera de la ventana de 24 h...).
const TRANSITORIOS = new Set([4, 80007, 130429, 131000, 131016, 131048, 131056, 133004])

export async function enviarWhatsApp(m: Mensaje, texto: string): Promise<Resultado> {
  const token = env('WHATSAPP_TOKEN')
  const telefonoId = env('WHATSAPP_PHONE_NUMBER_ID')
  if (!token || !telefonoId) return { resultado: 'reintentar', error: 'WhatsApp sin configurar (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)' }

  let pedido: Datos
  try {
    pedido = armarPedido(m, texto)
  } catch (e) {
    return { resultado: 'error', error: (e as Error).message }
  }

  const version = env('WHATSAPP_GRAPH_VERSION', 'v26.0')
  let r: Response
  try {
    // WHATSAPP_GRAPH_URL solo se cambia para probar contra un servidor de mentira.
    const graph = env('WHATSAPP_GRAPH_URL', 'https://graph.facebook.com').replace(/\/+$/, '')
    r = await fetch(`${graph}/${version}/${telefonoId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (e) {
    return { resultado: 'reintentar', error: `red: ${(e as Error).message}` }
  }

  const cuerpo = (await r.json().catch(() => ({}))) as {
    messages?: { id: string }[]
    error?: { code?: number; message?: string; error_data?: { details?: string } }
  }
  const id = cuerpo.messages?.[0]?.id
  if (r.ok && id) return { resultado: 'enviado', proveedorId: id }

  const e = cuerpo.error ?? {}
  const detalle = `WhatsApp ${r.status} ${e.code ?? ''}: ${e.message ?? 'sin detalle'}${e.error_data?.details ? ` (${e.error_data.details})` : ''}`
  const transitorio = r.status === 429 || r.status >= 500 || (e.code !== undefined && TRANSITORIOS.has(e.code))
  return { resultado: transitorio ? 'reintentar' : 'error', error: detalle }
}
