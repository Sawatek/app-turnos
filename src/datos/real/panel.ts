// Datos del panel REAL (fase 2): dueño y profesional de un negocio que no es demo.
// Todo pasa por la base: los permisos los hacen cumplir las reglas RLS y las funciones panel_*.
// Las consultas usan react-query; las claves empiezan con ['panel', negocioId, ...] para refrescar por negocio.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { enHora, sumarDias } from '@/dominio/tiempo'
import type { EstadoTurno } from '@/dominio/tipos'
import { supabase } from '../supabase'
import type { Json, Tables } from '../tipos-db'

export type RolPanel = 'dueno' | 'profesional'

export interface Acceso {
  /** null = no es miembro de este negocio. El superadmin entra como dueño. */
  rol: RolPanel | null
  superadmin: boolean
  /** Ficha de profesional del usuario en este negocio (si tiene). */
  profesionalId: string | null
}

export type Servicio = Tables<'servicios'>
export type Profesional = Tables<'profesionales'> & { servicios: string[] }
export type Cliente = Tables<'clientes'>
export type Horario = Tables<'horarios'>
export type Invitacion = Tables<'invitaciones'>

export interface Bloqueo {
  id: string
  profesionalId: string | null
  desde: string
  hasta: string
  motivo: string | null
}

export interface TurnoPanel {
  id: string
  inicio: string
  fin: string
  estado: EstadoTurno
  sena: number
  origen: 'app' | 'manual'
  notas: string | null
  clienteId: string
  clienteNombre: string
  clienteTelefono: string | null
  servicioId: string
  servicioNombre: string
  precio: number
  profesionalId: string
  profesionalNombre: string
}

export interface Resumen {
  turnosDia: number
  confirmados: number
  faltasMes: number
  facturacion: number
}

export interface Miembro {
  userId: string
  email: string
  /** Nombre de la cuenta (o el de su ficha de profesional). */
  nombre: string | null
  rol: RolPanel
  profesionalId: string | null
  profesional: string | null
}

export interface Franja {
  dia: number
  desde: string
  hasta: string
}

/** Error con un mensaje listo para mostrar. */
export class ErrorPanel extends Error {}

interface ErrorDb {
  message?: string
  code?: string
  details?: string
}

const MENSAJES: Record<string, string> = {
  sin_permiso: 'No tenés permiso para hacer esto.',
  franjas_invalidas: 'Revisá los horarios: cada franja tiene que terminar después de empezar.',
  franjas_superpuestas: 'Hay franjas que se pisan en un mismo día.',
  servicio_invalido: 'Alguno de los servicios no es de este negocio.',
  no_se_puede_quitar: 'Desde el panel solo se pueden quitar profesionales.',
  miembro_no_encontrado: 'Esa persona ya no es parte del equipo.',
  solo_superadmin: 'El link, el estado y si es demo solo los cambia SawaTek.',
  solo_estado: 'Solo podés cambiar el estado de tus turnos.',
  carga_invalida: 'Un profesional carga turnos sin seña, pendientes o confirmados.',
  usuario_no_es_miembro: 'Esa persona todavía no es parte del equipo. Primero invitala.',
  recuperar_reciente: 'A este cliente ya le mandaste el mensaje en los últimos 30 días.',
  sin_telefono: 'Este cliente no tiene un celular cargado.',
  negocio_demo: 'En una demo no se mandan mensajes de verdad.',
  rango_invalido: 'Revisá las fechas: "hasta" tiene que ser después de "desde" y el período, de un año como máximo.',
  profesional_no_encontrado: 'Esa ficha de profesional ya no existe.',
  profesional_con_usuario: 'Esa ficha ya es la agenda de otra persona del equipo.',
  profesional_invitado: 'Esa ficha tiene una invitación pendiente. Cancelala primero en "Con acceso al panel".',
  config_muy_grande: 'La configuración quedó muy pesada. Probá con un logo más liviano.',
}

/** Traduce un error de la base a un mensaje entendible. */
export function mensajeDe(e: unknown): string {
  if (e instanceof ErrorPanel) return e.message
  const err = (e ?? {}) as ErrorDb
  const msg = err.message ?? ''
  if (MENSAJES[msg]) return MENSAJES[msg]
  if (err.code === '23P01') return 'Ese horario se superpone con otro turno del mismo profesional. Elegí otro horario.'
  if (err.code === '23505') return 'Ya existe un registro igual.'
  if (err.code === '23514') return 'Revisá los datos: hay un valor fuera de rango.'
  if (err.code === '42501') return 'No tenés permiso para hacer esto.'
  if (/fetch|network/i.test(msg)) return 'No hay conexión. Revisá internet y probá de nuevo.'
  return msg || 'Algo salió mal. Probá de nuevo.'
}

export function db() {
  if (!supabase) throw new ErrorPanel('La app no está conectada a la base.')
  return supabase
}

/** Corre una operación y tira ErrorPanel si falla. */
export async function ok<T>(p: PromiseLike<{ data: T; error: ErrorDb | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p
  if (error) throw new ErrorPanel(mensajeDe(error))
  return data as NonNullable<T>
}

/** Igual que ok, pero el resultado puede ser null (maybeSingle, funciones que devuelven null). */
export async function okNulo<T>(p: PromiseLike<{ data: T; error: ErrorDb | null }>): Promise<T | null> {
  const { data, error } = await p
  if (error) throw new ErrorPanel(mensajeDe(error))
  return data ?? null
}

// ---------- Fechas ----------

/** Rango [inicio, fin) de un día argentino ('2026-11-16'), en ISO. */
export const rangoDia = (dia: string) => ({ desde: enHora(dia, '00:00').toISOString(), hasta: enHora(sumarDias(dia, 1), '00:00').toISOString() })

/** Texto de un tstzrange de Postgres → instantes ISO. Ej.: ["2026-11-18 21:00:00+00","2026-11-18 22:00:00+00") */
const isoDePostgres = (x: string) => new Date(x.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')).toISOString()
export function leerRango(r: unknown): { desde: string; hasta: string } {
  const [a, b] = String(r).slice(1, -1).split(',').map((x) => x.replace(/"/g, '').trim()) as [string, string]
  return { desde: isoDePostgres(a), hasta: isoDePostgres(b) }
}
const comoRango = (desde: string, hasta: string) => `[${desde},${hasta})`

// ---------- Acceso ----------

/** Acepta las invitaciones pendientes del usuario y averigua su rol en el negocio. */
async function traerAcceso(negocioId: string): Promise<Acceso> {
  const s = db()
  await ok(s.rpc('aceptar_invitaciones'))
  const [rol, superadmin, prof] = await Promise.all([
    okNulo(s.rpc('rol_en', { p_negocio: negocioId })),
    okNulo(s.rpc('es_superadmin')),
    okNulo(s.rpc('mi_profesional', { p_negocio: negocioId })),
  ])
  const r = superadmin ? 'dueno' : rol === 'dueno' || rol === 'profesional' ? rol : null
  return { rol: r, superadmin: !!superadmin, profesionalId: prof }
}

export function useAcceso(negocioId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ['panel', negocioId, 'acceso', userId],
    queryFn: () => traerAcceso(negocioId),
    enabled: !!userId,
    staleTime: Infinity,
    retry: 1,
  })
}

// ---------- Catálogo ----------

export function useServicios(negocioId: string) {
  return useQuery({
    queryKey: ['panel', negocioId, 'servicios'],
    queryFn: () => ok(db().from('servicios').select('*').eq('negocio_id', negocioId).order('orden').order('nombre')),
  })
}

export function useProfesionales(negocioId: string) {
  return useQuery({
    queryKey: ['panel', negocioId, 'profesionales'],
    queryFn: async (): Promise<Profesional[]> => {
      const s = db()
      const [profs, asignados] = await Promise.all([
        ok(s.from('profesionales').select('*').eq('negocio_id', negocioId).order('orden').order('nombre')),
        ok(s.from('profesional_servicios').select('profesional_id, servicio_id').eq('negocio_id', negocioId)),
      ])
      return profs.map((p) => ({ ...p, servicios: asignados.filter((a) => a.profesional_id === p.id).map((a) => a.servicio_id) }))
    },
  })
}

export async function guardarServicio(negocioId: string, id: string | null, datos: Omit<Servicio, 'id' | 'negocio_id'>) {
  const s = db()
  if (id) await ok(s.from('servicios').update(datos).eq('id', id).select('id').single())
  else await ok(s.from('servicios').insert({ ...datos, negocio_id: negocioId }).select('id').single())
}

export async function guardarProfesional(
  negocioId: string,
  id: string | null,
  datos: Pick<Profesional, 'nombre' | 'rol' | 'activo' | 'orden'>,
  servicios: string[],
) {
  const s = db()
  const fila = id
    ? await ok(s.from('profesionales').update(datos).eq('id', id).select('id').single())
    : await ok(s.from('profesionales').insert({ ...datos, negocio_id: negocioId }).select('id').single())
  await ok(s.rpc('panel_guardar_servicios_profesional', { p_profesional: fila.id, p_servicios: servicios }))
  return fila.id
}

// ---------- Horarios y bloqueos ----------

export function useHorarios(negocioId: string) {
  return useQuery({
    queryKey: ['panel', negocioId, 'horarios'],
    queryFn: () => ok(db().from('horarios').select('*').eq('negocio_id', negocioId).order('dia').order('desde')),
  })
}

export async function guardarHorarios(profesionalId: string, franjas: Franja[]) {
  await ok(db().rpc('panel_guardar_horarios', { p_profesional: profesionalId, p_franjas: franjas as unknown as Json }))
}

/** Bloqueos que se cruzan con [desde, hasta). */
export function useBloqueos(negocioId: string, desde: string, hasta: string) {
  return useQuery({
    queryKey: ['panel', negocioId, 'bloqueos', desde, hasta],
    queryFn: async (): Promise<Bloqueo[]> => {
      const filas = await ok(db().from('bloqueos').select('*').eq('negocio_id', negocioId).filter('rango', 'ov', comoRango(desde, hasta)))
      return filas
        .map((b) => ({ id: b.id, profesionalId: b.profesional_id, motivo: b.motivo, ...leerRango(b.rango) }))
        .toSorted((a, b) => Date.parse(a.desde) - Date.parse(b.desde))
    },
  })
}

export async function crearBloqueo(negocioId: string, b: Omit<Bloqueo, 'id'>) {
  await ok(
    db()
      .from('bloqueos')
      .insert({ negocio_id: negocioId, profesional_id: b.profesionalId, rango: comoRango(b.desde, b.hasta), motivo: b.motivo || null })
      .select('id')
      .single(),
  )
}

export async function borrarBloqueo(id: string) {
  const filas = await ok(db().from('bloqueos').delete().eq('id', id).select('id'))
  if (!filas.length) throw new ErrorPanel('No tenés permiso para borrar este bloqueo.')
}

// ---------- Turnos ----------

export const SELECT_TURNO = 'id, inicio, fin, estado, sena, origen, notas, cliente_id, servicio_id, profesional_id, clientes(nombre, telefono), servicios(nombre, precio), profesionales(nombre)'

export interface FilaTurno {
  id: string
  inicio: string
  fin: string
  estado: string
  sena: number
  origen: string
  notas: string | null
  cliente_id: string
  servicio_id: string
  profesional_id: string
  clientes: { nombre: string; telefono: string | null } | null
  servicios: { nombre: string; precio: number } | null
  profesionales: { nombre: string } | null
}

export const aTurno = (f: FilaTurno): TurnoPanel => ({
  id: f.id,
  inicio: f.inicio,
  fin: f.fin,
  estado: f.estado as EstadoTurno,
  sena: f.sena,
  origen: f.origen as TurnoPanel['origen'],
  notas: f.notas,
  clienteId: f.cliente_id,
  clienteNombre: f.clientes?.nombre ?? 'Cliente',
  clienteTelefono: f.clientes?.telefono ?? null,
  servicioId: f.servicio_id,
  servicioNombre: f.servicios?.nombre ?? 'Servicio',
  precio: f.servicios?.precio ?? 0,
  profesionalId: f.profesional_id,
  profesionalNombre: f.profesionales?.nombre ?? '',
})

/** Turnos de un día. El profesional recibe solo los suyos (lo filtra la base). */
export function useAgenda(negocioId: string, dia: string, profesionalId: string | null) {
  return useQuery({
    queryKey: ['panel', negocioId, 'turnos', 'agenda', dia, profesionalId],
    queryFn: async () => {
      const { desde, hasta } = rangoDia(dia)
      let q = db().from('turnos').select(SELECT_TURNO).eq('negocio_id', negocioId).gte('inicio', desde).lt('inicio', hasta)
      if (profesionalId) q = q.eq('profesional_id', profesionalId)
      const filas = await ok(q.order('inicio'))
      return (filas as unknown as FilaTurno[]).map(aTurno)
    },
  })
}

export function useResumen(negocioId: string, dia: string, profesionalId: string | null) {
  return useQuery({
    queryKey: ['panel', negocioId, 'turnos', 'resumen', dia, profesionalId],
    queryFn: async (): Promise<Resumen> => {
      const filas = await ok(db().rpc('panel_resumen', { p_negocio: negocioId, p_dia: dia, ...(profesionalId ? { p_profesional: profesionalId } : {}) }))
      const r = filas[0]
      return { turnosDia: r?.turnos_dia ?? 0, confirmados: r?.confirmados ?? 0, faltasMes: r?.faltas_mes ?? 0, facturacion: Number(r?.facturacion ?? 0) }
    },
  })
}

export async function cambiarEstadoTurno(id: string, estado: EstadoTurno) {
  const filas = await ok(db().from('turnos').update({ estado }).eq('id', id).select('id'))
  if (!filas.length) throw new ErrorPanel('No tenés permiso para cambiar este turno.')
}

export interface TurnoNuevo {
  clienteId: string
  servicioId: string
  profesionalId: string
  inicio: string
  minutos: number
  sena: number
  notas: string
}

export async function crearTurnoManual(negocioId: string, t: TurnoNuevo) {
  const fin = new Date(Date.parse(t.inicio) + t.minutos * 60_000).toISOString()
  const { error } = await db()
    .from('turnos')
    .insert({
      negocio_id: negocioId,
      cliente_id: t.clienteId,
      servicio_id: t.servicioId,
      profesional_id: t.profesionalId,
      inicio: t.inicio,
      fin,
      estado: 'confirmado',
      origen: 'manual',
      sena: t.sena,
      notas: t.notas.trim() || null,
    })
  if (error) throw new ErrorPanel(mensajeDe(error))
}

/** Horarios libres (los mismos que ve el cliente en la app). */
export function useLibres(negocioId: string, servicioId: string, dia: string, profesionalId: string) {
  return useQuery({
    queryKey: ['panel', negocioId, 'turnos', 'libres', servicioId, dia, profesionalId],
    queryFn: async () => {
      const filas = await ok(db().rpc('horarios_libres', { p_negocio: negocioId, p_servicio: servicioId, p_dia: dia, p_profesional: profesionalId }))
      return filas.map((f) => f.inicio)
    },
    enabled: !!servicioId && !!dia && !!profesionalId,
  })
}

// ---------- Clientes ----------

/** Busca clientes por nombre o teléfono (hasta 100). */
export function useClientes(negocioId: string, busqueda: string) {
  const q = busqueda.replace(/[,()*%\\]/g, ' ').trim()
  return useQuery({
    queryKey: ['panel', negocioId, 'clientes', q],
    queryFn: () => {
      let c = db().from('clientes').select('*').eq('negocio_id', negocioId)
      if (q) c = c.or(`nombre.ilike.*${q}*,telefono.ilike.*${q}*`)
      return ok(c.order('nombre').limit(100))
    },
    placeholderData: (previo) => previo,
  })
}

export async function crearCliente(negocioId: string, nombre: string, telefono: string) {
  return ok(
    db()
      .from('clientes')
      .insert({ negocio_id: negocioId, nombre: nombre.trim(), telefono: telefono.trim() || null })
      .select('*')
      .single(),
  )
}

export async function editarCliente(id: string, nombre: string, telefono: string) {
  await ok(db().from('clientes').update({ nombre: nombre.trim(), telefono: telefono.trim() || null }).eq('id', id).select('id').single())
}

export function useHistorial(negocioId: string, clienteId: string | undefined) {
  return useQuery({
    queryKey: ['panel', negocioId, 'turnos', 'cliente', clienteId],
    queryFn: async () => {
      const filas = await ok(db().from('turnos').select(SELECT_TURNO).eq('cliente_id', clienteId!).order('inicio', { ascending: false }).limit(50))
      return (filas as unknown as FilaTurno[]).map(aTurno)
    },
    enabled: !!clienteId,
  })
}

export function useNota(negocioId: string, clienteId: string | undefined) {
  return useQuery({
    queryKey: ['panel', negocioId, 'nota', clienteId],
    queryFn: async () => {
      return okNulo(db().from('notas_clientes').select('texto, actualizado').eq('cliente_id', clienteId!).maybeSingle())
    },
    enabled: !!clienteId,
  })
}

export async function guardarNota(negocioId: string, clienteId: string, texto: string) {
  const s = db()
  if (!texto.trim()) {
    await ok(s.from('notas_clientes').delete().eq('cliente_id', clienteId))
    return
  }
  await ok(
    s.from('notas_clientes').upsert({ cliente_id: clienteId, negocio_id: negocioId, texto: texto.trim(), actualizado: new Date().toISOString() }).select('cliente_id'),
  )
}

// ---------- Equipo ----------

export function useMiembros(negocioId: string) {
  return useQuery({
    queryKey: ['panel', negocioId, 'miembros'],
    queryFn: async (): Promise<Miembro[]> => {
      const filas = await ok(db().rpc('panel_miembros', { p_negocio: negocioId }))
      return filas.map((f) => ({
        userId: f.user_id,
        email: f.email,
        nombre: f.nombre ?? null,
        rol: f.rol as RolPanel,
        profesionalId: f.profesional_id ?? null,
        profesional: f.profesional ?? null,
      }))
    },
  })
}

export function useInvitaciones(negocioId: string) {
  return useQuery({
    queryKey: ['panel', negocioId, 'invitaciones'],
    queryFn: () => ok(db().from('invitaciones').select('*').eq('negocio_id', negocioId).is('aceptada', null).order('creado', { ascending: false })),
  })
}

export async function invitar(negocioId: string, email: string, profesionalId: string) {
  const { error } = await db().from('invitaciones').insert({ negocio_id: negocioId, email: email.trim().toLowerCase(), rol: 'profesional', profesional_id: profesionalId })
  if (error?.code === '23505') throw new ErrorPanel('Ese mail ya fue invitado a este negocio.')
  if (error) throw new ErrorPanel(mensajeDe(error))
}

export async function cancelarInvitacion(id: string) {
  await ok(db().from('invitaciones').delete().eq('id', id).select('id'))
}

export async function quitarMiembro(negocioId: string, userId: string) {
  await ok(db().rpc('panel_quitar_miembro', { p_negocio: negocioId, p_user: userId }))
}

// ---------- Ajustes ----------

export function useAjustes(negocioId: string) {
  return useQuery({
    queryKey: ['panel', negocioId, 'ajustes'],
    queryFn: () => ok(db().from('negocios').select('intervalo_min, anticipacion_min, cancelacion_horas, config').eq('id', negocioId).single()),
  })
}

export interface Ajustes {
  intervalo_min: number
  anticipacion_min: number
  cancelacion_horas: number
  direccion: string
  whatsapp: string
}

/** Guarda los ajustes. La configuración se relee justo antes para no pisar otros cambios. */
export async function guardarAjustes(negocioId: string, a: Ajustes) {
  const s = db()
  const actual = await ok(s.from('negocios').select('config').eq('id', negocioId).single())
  const config = { ...(actual.config as Record<string, Json>), direccion: a.direccion.trim(), whatsapp: a.whatsapp.trim() }
  const filas = await ok(
    s
      .from('negocios')
      .update({ intervalo_min: a.intervalo_min, anticipacion_min: a.anticipacion_min, cancelacion_horas: a.cancelacion_horas, config })
      .eq('id', negocioId)
      .select('id'),
  )
  if (!filas.length) throw new ErrorPanel('No tenés permiso para cambiar los ajustes.')
}

// ---------- En vivo ----------

/**
 * Escucha los cambios de turnos del negocio y refresca la agenda y el resumen.
 * `onNuevo`: se llama con cada turno que ENTRA mientras el panel está abierto, salvo los que cargó
 * el propio usuario (`userId`) o los que ya pasaron.
 */
export function useTurnosEnVivo(negocioId: string, userId?: string, onNuevo?: (t: TurnoPanel) => void) {
  const qc = useQueryClient()
  const aviso = useRef(onNuevo)
  useEffect(() => {
    aviso.current = onNuevo
  })
  useEffect(() => {
    const s = supabase
    if (!s) return
    // Nombre único por montaje: en modo estricto React monta dos veces y no hay que reusar un canal cerrado.
    const canal = s
      .channel(`panel-turnos-${negocioId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos', filter: `negocio_id=eq.${negocioId}` }, (cambio) => {
        void qc.invalidateQueries({ queryKey: ['panel', negocioId, 'turnos'] })
        if (cambio.eventType !== 'INSERT' || !aviso.current) return
        const nuevo = cambio.new as { id?: string; creado_por?: string | null; estado?: string; inicio?: string }
        if (!nuevo.id || (userId && nuevo.creado_por === userId) || nuevo.estado === 'cancelado') return
        if (nuevo.inicio && Date.parse(nuevo.inicio) < Date.now()) return
        void s
          .from('turnos')
          .select(SELECT_TURNO)
          .eq('id', nuevo.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) aviso.current?.(aTurno(data as unknown as FilaTurno))
          })
      })
      .subscribe()
    return () => {
      void s.removeChannel(canal)
    }
  }, [negocioId, userId, qc])
}

/** Refresca todo lo de un negocio que empiece con la clave dada. */
export function useRefrescar(negocioId: string) {
  const qc = useQueryClient()
  return (...clave: string[]) => qc.invalidateQueries({ queryKey: ['panel', negocioId, ...clave] })
}
