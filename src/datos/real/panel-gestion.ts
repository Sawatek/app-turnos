// Datos de las herramientas de gestión del panel REAL: marca, mensajes enviados, clientes para recuperar,
// reportes y "yo también atiendo". Mismas reglas que panel.ts: los permisos los hace cumplir la base.
import { useQuery } from '@tanstack/react-query'
import type { Negocio } from '@/dominio/tipos'
import type { Json } from '../tipos-db'
import { db, ErrorPanel, ok } from './panel'

// ---------- Marca ----------

/** Lo que el dueño puede cambiar de su marca (vive en negocios.config). */
export type Marca = Pick<
  Negocio,
  'logo' | 'color' | 'modo' | 'personalidad' | 'bajada' | 'claim' | 'promosTitulo' | 'promos' | 'avisos' | 'fidelidad' | 'mensajes' | 'recuperarDias'
>

/** Guarda la marca. La configuración se relee justo antes para no pisar otros cambios (ajustes, nombre, etc.). */
export async function guardarMarca(negocioId: string, marca: Marca) {
  const s = db()
  const actual = await ok(s.from('negocios').select('config').eq('id', negocioId).single())
  const config = { ...(actual.config as Record<string, Json>), ...(marca as unknown as Record<string, Json>) }
  if (!marca.logo) delete config.logo
  const filas = await ok(s.from('negocios').update({ config }).eq('id', negocioId).select('id'))
  if (!filas.length) throw new ErrorPanel('No tenés permiso para cambiar la marca.')
}

// ---------- Mensajes enviados ----------

export type TipoMensaje = 'confirmacion' | 'recordatorio24' | 'recordatorio2' | 'cancelacion' | 'recuperar' | 'aviso'
export type CanalMensaje = 'whatsapp' | 'sms' | 'email' | 'push'
/** Estado para mostrar (enviado → entregado → leído; o error / cancelado / todavía en cola). */
export type EstadoMensaje = 'pendiente' | 'enviando' | 'enviado' | 'entregado' | 'leido' | 'error' | 'cancelado'

export interface MensajeEnviado {
  id: string
  tipo: TipoMensaje
  canal: CanalMensaje
  estado: EstadoMensaje
  /** El momento que importa: cuándo salió (o cuándo sale, si está en cola). */
  cuando: string
  error: string | null
  texto: string | null
  turnoId: string | null
}

const estadoDe = (estado: string, entregado: string | null, leido: string | null): EstadoMensaje =>
  estado === 'enviado' ? (leido ? 'leido' : entregado ? 'entregado' : 'enviado') : (estado as EstadoMensaje)

/** Lo que se le mandó a un cliente, o por un turno (los códigos de ingreso nunca llegan: la regla los oculta). */
export function useMensajes(negocioId: string, filtro: { clienteId?: string; turnoId?: string }) {
  const { clienteId, turnoId } = filtro
  return useQuery({
    queryKey: ['panel', negocioId, 'mensajes', clienteId ?? null, turnoId ?? null],
    enabled: !!(clienteId || turnoId),
    queryFn: async (): Promise<MensajeEnviado[]> => {
      let q = db()
        .from('mensajes')
        .select('id, tipo, canal, estado, programado, enviado, entregado, leido, error, creado, turno_id, texto:contenido->>texto')
        .eq('negocio_id', negocioId)
        .neq('tipo', 'codigo')
      if (clienteId) q = q.eq('cliente_id', clienteId)
      if (turnoId) q = q.eq('turno_id', turnoId)
      const filas = await ok(q.order('creado', { ascending: false }).limit(60))
      return filas.map((f) => ({
        id: f.id,
        tipo: f.tipo as TipoMensaje,
        canal: f.canal as CanalMensaje,
        estado: estadoDe(f.estado, f.entregado, f.leido),
        cuando: f.leido ?? f.entregado ?? f.enviado ?? f.programado ?? f.creado,
        error: f.error,
        texto: typeof f.texto === 'string' ? f.texto : null,
        turnoId: f.turno_id,
      }))
    },
  })
}

// ---------- Clientes para recuperar ----------

/** Ficha completa de un cliente (para abrirla desde otra lista). */
export const traerCliente = (id: string) => ok(db().from('clientes').select('*').eq('id', id).single())

export interface ParaRecuperar {
  clienteId: string
  nombre: string
  telefono: string | null
  conCelular: boolean
  ultimaVisita: string
  ultimoServicio: string
  visitas: number
  /** Último "te extrañamos" (si hubo) y su estado. */
  enviado: string | null
  estadoEnvio: EstadoMensaje | null
}

export function useParaRecuperar(negocioId: string, dias: number) {
  return useQuery({
    queryKey: ['panel', negocioId, 'recuperar', dias],
    queryFn: async (): Promise<ParaRecuperar[]> => {
      const filas = await ok(db().rpc('panel_para_recuperar', { p_negocio: negocioId, p_dias: dias }))
      return filas.map((f) => ({
        clienteId: f.cliente_id,
        nombre: f.nombre,
        telefono: f.telefono ?? null,
        conCelular: f.con_celular,
        ultimaVisita: f.ultima_visita,
        ultimoServicio: f.ultimo_servicio,
        visitas: f.visitas,
        enviado: f.recuperar_enviado ?? null,
        estadoEnvio: (f.recuperar_estado as EstadoMensaje | null) ?? null,
      }))
    },
    placeholderData: (previo) => previo,
  })
}

/** Encola el "te extrañamos" por WhatsApp. La base no deja mandar más de uno cada 30 días por cliente. */
export async function recuperarCliente(clienteId: string) {
  return ok(db().rpc('panel_recuperar_cliente', { p_cliente: clienteId }))
}

// ---------- Reportes ----------

export interface Totales {
  reservados: number
  turnos: number
  cancelados: number
  confirmados: number
  asistio: number
  falto: number
  sin_marcar: number
  facturacion: number
  facturacion_asistidos: number
}

export interface Resena {
  puntaje: number
  comentario: string | null
  creado: string
  cliente: string | null
  servicio: string | null
  profesional: string | null
}

export interface Reporte {
  desde: string
  hasta: string
  profesional_id: string | null
  totales: Totales
  clientes: { total: number; nuevos: number; recurrentes: number }
  por_profesional: { id: string; nombre: string; turnos: number; asistio: number; falto: number; cancelados: number; facturacion: number }[]
  por_servicio: { id: string; nombre: string; turnos: number; asistio: number; facturacion: number }[]
  por_hora: { hora: number; turnos: number }[]
  por_dia_semana: { dia: number; turnos: number }[]
  /** null = las calificaciones no están disponibles (la tabla no existe o la consulta falló). */
  resenas: { cantidad: number; promedio: number | null; distribucion: Record<'1' | '2' | '3' | '4' | '5', number>; ultimas: Resena[] } | null
}

/** Reporte de [desde, hasta] (días 'AAAA-MM-DD', ambos incluidos). El profesional recibe solo lo suyo. */
export function useReporte(negocioId: string, desde: string, hasta: string, profesionalId: string | null) {
  return useQuery({
    queryKey: ['panel', negocioId, 'turnos', 'reporte', desde, hasta, profesionalId],
    enabled: !!desde && !!hasta && desde <= hasta,
    queryFn: async () => {
      const r = await ok(db().rpc('panel_reporte', { p_negocio: negocioId, p_desde: desde, p_hasta: hasta, ...(profesionalId ? { p_profesional: profesionalId } : {}) }))
      return r as unknown as Reporte
    },
    placeholderData: (previo) => previo,
  })
}

/** Porcentaje entero (o null si no hay base para calcularlo). */
export const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : null)

const DIAS_CSV = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const celda = (v: unknown) => {
  const t = v === null || v === undefined ? '' : String(v)
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}
const pct = (x: number | null) => (x === null ? '' : `${x}%`)

/** El reporte como CSV (separado por ";", como lo abre Excel en Argentina). */
export function reporteACsv(r: Reporte, negocio: string, profesional: string | null): string {
  const filas: unknown[][] = []
  const t = r.totales
  filas.push(['Reporte', negocio], ['Desde', r.desde], ['Hasta', r.hasta], ['Profesional', profesional ?? 'Todos'], [])
  filas.push(
    ['Resumen', 'Valor'],
    ['Turnos (sin cancelados)', t.turnos],
    ['Reservados (con cancelados)', t.reservados],
    ['Vinieron', t.asistio],
    ['No vinieron', t.falto],
    ['Cancelados', t.cancelados],
    ['Sin marcar', t.sin_marcar],
    ['Asistencia', pct(porcentaje(t.asistio, t.asistio + t.falto))],
    ['Tasa de confirmación', pct(porcentaje(t.confirmados, t.turnos))],
    ['Facturación estimada ($)', t.facturacion],
    ['Facturación de los que vinieron ($)', t.facturacion_asistidos],
    ['Clientes', r.clientes.total],
    ['Clientes nuevos', r.clientes.nuevos],
    ['Clientes recurrentes', r.clientes.recurrentes],
    [],
  )
  filas.push(['Profesional', 'Turnos', 'Vinieron', 'No vinieron', 'Cancelados', 'Facturación ($)'])
  for (const p of r.por_profesional) filas.push([p.nombre, p.turnos, p.asistio, p.falto, p.cancelados, p.facturacion])
  filas.push([], ['Servicio', 'Turnos', 'Vinieron', 'Facturación ($)'])
  for (const s of r.por_servicio) filas.push([s.nombre, s.turnos, s.asistio, s.facturacion])
  filas.push([], ['Hora', 'Turnos'])
  for (const h of r.por_hora) filas.push([`${String(h.hora).padStart(2, '0')}:00`, h.turnos])
  filas.push([], ['Día', 'Turnos'])
  for (const d of r.por_dia_semana) filas.push([DIAS_CSV[d.dia], d.turnos])
  if (r.resenas) {
    filas.push([], ['Calificaciones', r.resenas.cantidad], ['Promedio', r.resenas.promedio === null ? '' : String(r.resenas.promedio).replace('.', ',')])
  }
  return filas.map((f) => f.map(celda).join(';')).join('\r\n')
}

// ---------- "Yo también atiendo" ----------

/** Vincula la cuenta del dueño a una ficha de profesional (null = desvincular). */
export async function atiendoYo(negocioId: string, profesionalId: string | null) {
  await ok(db().rpc('panel_atiendo_yo', { p_negocio: negocioId, ...(profesionalId ? { p_profesional: profesionalId } : {}) }))
}
