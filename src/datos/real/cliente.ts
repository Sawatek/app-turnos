// Datos de la app del cliente para un negocio REAL (fase 3).
// Todo pasa por las reglas de la base (RLS + funciones): acá solo se piden datos y se traducen los errores.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useEffectEvent } from 'react'
import { supabase } from '../supabase'

function db() {
  if (!supabase) throw new Error('La app no está conectada a la base.')
  return supabase
}

// ---------- Tipos ----------

export interface ServicioReal {
  id: string
  nombre: string
  minutos: number
  precio: number
  detalle: string | null
  etiqueta: string | null
}

export interface ProfesionalReal {
  id: string
  nombre: string
  rol: string | null
}

export interface Catalogo {
  servicios: ServicioReal[]
  profesionales: ProfesionalReal[]
  /** profesional → servicios que hace. Sin entrada = hace todos. */
  hace: Map<string, Set<string>>
}

export type EstadoTurnoReal = 'pendiente' | 'confirmado' | 'cancelado' | 'asistio' | 'falto'

export interface TurnoReal {
  id: string
  inicio: string
  fin: string
  minutos: number
  estado: EstadoTurnoReal
  servicioId: string
  servicio: string
  profesionalId: string
  profesional: string
}

export interface Resumen {
  clienteId: string | null
  nombre: string | null
  telefono: string | null
  sellos: number
  activos: number
  cancelacionHoras: number
}

export interface DiaDisponible {
  dia: string
  libres: number
  capacidad: number
}

export interface Horario {
  inicio: string
  profesionalId: string
}

// ---------- Errores ----------

/** Error con un código conocido de la base (ej.: 'horario_no_disponible') y el texto para mostrar. */
export class ErrorCliente extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

const CODIGOS = [
  'sin_sesion',
  'negocio_no_disponible',
  'servicio_no_disponible',
  'falta_nombre',
  'demasiados_turnos',
  'horario_no_disponible',
  'turno_no_encontrado',
  'turno_no_cancelable',
  'turno_no_confirmable',
  'fuera_de_plazo',
] as const

const TEXTOS: Record<string, string> = {
  sin_sesion: 'Se cerró tu sesión. Volvé a entrar con tu celular.',
  negocio_no_disponible: 'Por ahora este negocio no está tomando turnos por la app.',
  servicio_no_disponible: 'Ese servicio ya no está disponible. Elegí otro.',
  falta_nombre: 'Poné tu nombre así te reconocen en el local.',
  demasiados_turnos: 'Ya tenés 3 turnos por delante, que es el máximo. Cancelá o esperá a que pase alguno para sacar otro.',
  horario_no_disponible: 'Ese horario se acaba de ocupar. Te mostramos los que quedan: elegí otro.',
  turno_no_encontrado: 'No encontramos ese turno. Puede que ya se haya cancelado.',
  turno_no_cancelable: 'Ese turno ya no se puede cancelar.',
  turno_no_confirmable: 'Ese turno ya no se puede confirmar.',
  fuera_de_plazo: 'Ya no se puede cancelar desde la app.',
}

/** Traduce el error de Supabase a uno con código y texto claro. */
function traducir(error: { message?: string } | null | undefined): ErrorCliente {
  const msj = error?.message ?? ''
  const codigo = CODIGOS.find((c) => msj.includes(c))
  if (codigo) return new ErrorCliente(codigo, TEXTOS[codigo]!)
  if (/fetch|network|Failed to/i.test(msj)) return new ErrorCliente('red', 'No hay conexión. Revisá internet y probá de nuevo.')
  return new ErrorCliente('desconocido', 'Algo salió mal. Probá de nuevo en un momento.')
}

// ---------- Ingreso con el celular ----------

/** Pide el código de ingreso (llega por WhatsApp). */
export async function pedirCodigo(e164: string) {
  const { error } = await db().auth.signInWithOtp({ phone: e164 })
  if (!error) return
  if (error.status === 429 || /rate|seconds|segundos/i.test(error.message)) {
    throw new ErrorCliente('espera', 'Ya te mandamos un código hace instantes. Esperá unos segundos para pedir otro.')
  }
  throw new ErrorCliente('codigo', 'No pudimos mandarte el código. Revisá el número y probá de nuevo.')
}

/** Verifica el código. Si está bien, Supabase guarda la sesión y la app pasa sola al inicio. */
export async function verificarCodigo(e164: string, codigo: string) {
  const { error } = await db().auth.verifyOtp({ phone: e164, token: codigo, type: 'sms' })
  if (!error) return
  if (error.status === 429) throw new ErrorCliente('espera', 'Demasiados intentos. Esperá un minuto y probá de nuevo.')
  throw new ErrorCliente('codigo', 'El código no coincide o ya venció. Fijate el último mensaje, o pedí uno nuevo.')
}

export async function salirCliente() {
  await db().auth.signOut()
}

// ---------- Consultas ----------

const clave = {
  catalogo: (negocio: string) => ['cliente-real', negocio, 'catalogo'] as const,
  resumen: (negocio: string, uid: string) => ['cliente-real', negocio, 'resumen', uid] as const,
  turnos: (negocio: string, uid: string) => ['cliente-real', negocio, 'turnos', uid] as const,
  agenda: (negocio: string) => ['cliente-real', negocio, 'agenda'] as const,
}

async function traerCatalogo(negocio: string): Promise<Catalogo> {
  const [s, p, ps] = await Promise.all([
    db().from('servicios').select('id, nombre, minutos, precio, detalle, etiqueta').eq('negocio_id', negocio).eq('activo', true).order('orden').order('nombre'),
    db().from('profesionales').select('id, nombre, rol').eq('negocio_id', negocio).eq('activo', true).order('orden').order('nombre'),
    db().from('profesional_servicios').select('profesional_id, servicio_id').eq('negocio_id', negocio),
  ])
  const error = s.error ?? p.error ?? ps.error
  if (error) throw traducir(error)
  const hace = new Map<string, Set<string>>()
  for (const f of ps.data ?? []) {
    if (!hace.has(f.profesional_id)) hace.set(f.profesional_id, new Set())
    hace.get(f.profesional_id)!.add(f.servicio_id)
  }
  return { servicios: s.data ?? [], profesionales: p.data ?? [], hace }
}

export function useCatalogo(negocio: string) {
  return useQuery({ queryKey: clave.catalogo(negocio), queryFn: () => traerCatalogo(negocio), staleTime: 5 * 60_000 })
}

/** Profesionales que hacen un servicio (sin filas en profesional_servicios = hace todos). */
export const profesionalesPara = (c: Catalogo, servicioId: string) =>
  c.profesionales.filter((p) => !c.hace.has(p.id) || c.hace.get(p.id)!.has(servicioId))

export function useResumen(negocio: string, uid: string) {
  return useQuery({
    queryKey: clave.resumen(negocio, uid),
    queryFn: async (): Promise<Resumen> => {
      const { data, error } = await db().rpc('mi_resumen', { p_negocio: negocio })
      if (error) throw traducir(error)
      const f = data?.[0]
      return {
        clienteId: f?.cliente_id ?? null,
        nombre: f?.nombre ?? null,
        telefono: f?.telefono ?? null,
        sellos: f?.sellos ?? 0,
        activos: f?.activos ?? 0,
        cancelacionHoras: f?.cancelacion_horas ?? 2,
      }
    },
  })
}

export function useMisTurnos(negocio: string, uid: string) {
  return useQuery({
    queryKey: clave.turnos(negocio, uid),
    queryFn: async (): Promise<TurnoReal[]> => {
      // RLS: el cliente solo ve sus turnos.
      const { data, error } = await db()
        .from('turnos')
        .select('id, inicio, fin, estado, servicio_id, profesional_id, servicios(nombre), profesionales(nombre)')
        .eq('negocio_id', negocio)
        .order('inicio', { ascending: false })
        .limit(100)
      if (error) throw traducir(error)
      return (data ?? []).map((t) => ({
        id: t.id,
        inicio: t.inicio,
        fin: t.fin,
        minutos: Math.round((Date.parse(t.fin) - Date.parse(t.inicio)) / 60_000),
        estado: t.estado as EstadoTurnoReal,
        servicioId: t.servicio_id,
        servicio: (t.servicios as { nombre: string } | null)?.nombre ?? 'Turno',
        profesionalId: t.profesional_id,
        profesional: (t.profesionales as { nombre: string } | null)?.nombre ?? '',
      }))
    },
  })
}

export const vigente = (t: TurnoReal, ahora = Date.now()) => (t.estado === 'pendiente' || t.estado === 'confirmado') && Date.parse(t.fin) > ahora

/** Disponibilidad de los próximos días (cuántos horarios libres tiene cada uno). */
export function useDisponibilidad(negocio: string, servicioId: string | undefined, profesionalId: string | null | undefined, dias = 14) {
  return useQuery({
    queryKey: [...clave.agenda(negocio), 'dias', servicioId, profesionalId ?? 'cualquiera', dias],
    enabled: !!servicioId && profesionalId !== undefined,
    staleTime: 30_000,
    queryFn: async (): Promise<DiaDisponible[]> => {
      const { data, error } = await db().rpc('disponibilidad_dias', {
        p_negocio: negocio,
        p_servicio: servicioId!,
        ...(profesionalId ? { p_profesional: profesionalId } : {}),
        p_dias: dias,
      })
      if (error) throw traducir(error)
      return data ?? []
    },
  })
}

async function traerHorarios(negocio: string, servicioId: string, dia: string, profesionalId: string | null): Promise<Horario[]> {
  const { data, error } = await db().rpc('horarios_libres', {
    p_negocio: negocio,
    p_servicio: servicioId,
    p_dia: dia,
    ...(profesionalId ? { p_profesional: profesionalId } : {}),
  })
  if (error) throw traducir(error)
  return (data ?? []).map((h) => ({ inicio: new Date(h.inicio).toISOString(), profesionalId: h.profesional_id }))
}

/** Horarios libres de un día. */
export function useHorarios(negocio: string, servicioId: string | undefined, dia: string | undefined, profesionalId: string | null | undefined) {
  return useQuery({
    queryKey: [...clave.agenda(negocio), 'horas', servicioId, dia, profesionalId ?? 'cualquiera'],
    enabled: !!servicioId && !!dia && profesionalId !== undefined,
    staleTime: 30_000,
    queryFn: () => traerHorarios(negocio, servicioId!, dia!, profesionalId ?? null),
  })
}

/** "Próximo libre": el primer horario libre de un servicio en los próximos 14 días (con cualquier profesional). */
export function useProximoLibre(negocio: string, servicioId: string | undefined) {
  return useQuery({
    queryKey: [...clave.agenda(negocio), 'proximo', servicioId],
    enabled: !!servicioId,
    staleTime: 30_000,
    queryFn: async (): Promise<Horario | null> => {
      const { data, error } = await db().rpc('disponibilidad_dias', { p_negocio: negocio, p_servicio: servicioId!, p_dias: 14 })
      if (error) throw traducir(error)
      const dia = (data ?? []).find((d) => d.libres > 0)?.dia
      if (!dia) return null
      return (await traerHorarios(negocio, servicioId!, dia, null))[0] ?? null
    },
  })
}

// ---------- Acciones ----------

export interface DatosReserva {
  servicioId: string
  inicio: string
  /** null = cualquiera (la base asigna al primero libre). */
  profesionalId: string | null
  /** Solo hace falta la primera vez (cuando todavía no es cliente del negocio). */
  nombre?: string
  telefono?: string
}

export async function reservar(negocio: string, d: DatosReserva): Promise<string> {
  const { data, error } = await db().rpc('reservar_turno', {
    p_negocio: negocio,
    p_servicio: d.servicioId,
    p_inicio: d.inicio,
    ...(d.profesionalId ? { p_profesional: d.profesionalId } : {}),
    ...(d.nombre ? { p_nombre: d.nombre } : {}),
    ...(d.telefono ? { p_telefono: d.telefono } : {}),
  })
  if (error) throw traducir(error)
  return data
}

export async function confirmarTurno(id: string) {
  const { error } = await db().rpc('confirmar_turno', { p_turno: id })
  if (error) throw traducir(error)
}

export async function cancelarTurno(id: string) {
  const { error } = await db().rpc('cancelar_turno', { p_turno: id })
  if (error) throw traducir(error)
}

/**
 * Cambiar de horario: primero se reserva el nuevo y recién después se cancela el viejo
 * (así nunca se queda sin turno). Si el viejo no se puede cancelar, el nuevo queda igual y se avisa.
 */
export async function reprogramar(negocio: string, viejo: string, d: DatosReserva): Promise<{ id: string; viejoCancelado: boolean }> {
  const id = await reservar(negocio, d)
  try {
    await cancelarTurno(viejo)
    return { id, viejoCancelado: true }
  } catch {
    return { id, viejoCancelado: false }
  }
}

/** Cambia el nombre de la ficha propia (RLS: cada cliente edita solo la suya). */
export async function guardarNombre(clienteId: string, nombre: string) {
  const limpio = nombre.trim()
  if (limpio.length < 2) throw new ErrorCliente('falta_nombre', 'Poné tu nombre (al menos 2 letras).')
  if (limpio.length > 80) throw new ErrorCliente('nombre_largo', 'El nombre es muy largo (hasta 80 letras).')
  const { data, error } = await db().from('clientes').update({ nombre: limpio }).eq('id', clienteId).select('id')
  if (error || !data?.length) throw traducir(error)
}

/** Refresca todo lo del cliente (después de reservar, cancelar, etc.). */
export function useRefrescar(negocio: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['cliente-real', negocio] })
}

/** Turnos en vivo: si cambia uno propio (por ejemplo, se confirmó desde WhatsApp), se refresca la lista. */
export function useTurnosEnVivo(negocio: string, clienteId: string | null, alCambiar: (nuevo: { id: string; estado: string } | null) => void) {
  const qc = useQueryClient()
  const avisar = useEffectEvent(alCambiar)
  useEffect(() => {
    if (!supabase || !clienteId) return
    const canal = supabase
      .channel(`turnos-cliente-${clienteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos', filter: `cliente_id=eq.${clienteId}` }, (cambio) => {
        void qc.invalidateQueries({ queryKey: ['cliente-real', negocio] })
        const nuevo = cambio.new as { id?: string; estado?: string } | undefined
        avisar(nuevo?.id && nuevo.estado ? { id: nuevo.id, estado: nuevo.estado } : null)
      })
      .subscribe()
    return () => {
      void supabase?.removeChannel(canal)
    }
  }, [negocio, clienteId, qc])
}
