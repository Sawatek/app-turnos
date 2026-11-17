// Datos de la consola de plataforma (/admin, solo SawaTek).
// Todo pasa por funciones admin_* de la base (security definer, chequean es_superadmin adentro) y por la
// Edge Function `admin-usuarios` (crear cuentas y resetear contraseñas con la clave secreta, del lado del servidor).
// Las claves de react-query empiezan con ['admin', ...].
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import type { Negocio } from '@/dominio/tipos'
import { supabase } from './supabase'
import type { Json } from './tipos-db'

export type EstadoNegocio = 'prueba' | 'activo' | 'suspendido'
export type RolStaff = 'dueno' | 'profesional'

export const ESTADOS: { id: EstadoNegocio; texto: string; detalle: string }[] = [
  { id: 'prueba', texto: 'En prueba', detalle: 'Configurando: todavía no toma turnos de clientes.' },
  { id: 'activo', texto: 'Activo', detalle: 'Toma turnos y manda mensajes.' },
  { id: 'suspendido', texto: 'Suspendido', detalle: 'No toma turnos y su app no abre para los clientes.' },
]

export const PLANES = ['Sin definir', 'Prueba gratis', 'Básico', 'Pro', 'A medida'] as const

export const TIPOS_MENSAJE: Record<string, string> = {
  codigo: 'Código de ingreso',
  confirmacion: 'Confirmación',
  recordatorio24: 'Recordatorio 24 h',
  recordatorio2: 'Recordatorio 2 h',
  cancelacion: 'Cancelación',
  recuperar: 'Recuperar cliente',
  aviso: 'Aviso',
}
export const ESTADOS_MENSAJE: Record<string, string> = {
  pendiente: 'Pendiente',
  enviando: 'Enviando',
  enviado: 'Enviado',
  error: 'Con error',
  cancelado: 'Cancelado',
}

// ---------- Errores ----------

const MENSAJES: Record<string, string> = {
  solo_superadmin: 'Solo SawaTek puede hacer esto.',
  negocio_no_encontrado: 'Ese negocio ya no existe.',
  estado_invalido: 'Elegí un estado válido.',
  plan_invalido: 'El plan tiene que ser un texto corto.',
  notas_largas: 'Las notas son muy largas (hasta 4000 letras).',
  nombre_invalido: 'El nombre tiene que tener entre 2 y 80 letras.',
  color_invalido: 'El color tiene que ser del tipo #1a2b3c.',
  claim_largo: 'La frase es muy larga (hasta 160 letras).',
  logo_invalido: 'El logo no es una imagen válida o es muy pesado.',
  mail_invalido: 'Revisá el mail.',
  rol_invalido: 'Elegí el rol en el negocio.',
  ya_existe: 'Ya hay una cuenta con ese mail. Buscala en la lista y reseteale la contraseña.',
  cuenta_protegida: 'Las cuentas de SawaTek no se resetean desde acá.',
  cuenta_no_encontrada: 'Esa cuenta ya no existe.',
  profesional_con_cuenta: 'Ese profesional ya tiene otra cuenta vinculada.',
  sin_sesion: 'Tu sesión venció. Volvé a entrar.',
}

export function mensajeAdmin(e: unknown): string {
  const msg = (e as { message?: string } | null)?.message ?? ''
  for (const [codigo, texto] of Object.entries(MENSAJES)) if (msg.includes(codigo)) return texto
  if (/fetch|network/i.test(msg)) return 'No hay conexión. Revisá internet y probá de nuevo.'
  return msg || 'Algo salió mal. Probá de nuevo.'
}

function db() {
  if (!supabase) throw new Error('La app no está conectada a la base.')
  return supabase
}

async function ok<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p
  if (error) throw new Error(mensajeAdmin(error))
  return data as NonNullable<T>
}

// ---------- Acceso ----------

/** ¿La cuenta logueada es de SawaTek? */
export function useEsSuperadmin(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'soy-superadmin', userId],
    enabled: !!userId && !!supabase,
    staleTime: Infinity,
    queryFn: async () => (await ok(db().rpc('es_superadmin'))) === true,
  })
}

// ---------- Resumen ----------

export interface Resumen {
  mes: string
  negocios: { prueba: number; activo: number; suspendido: number; nuevos: number; demos: number }
  turnos: {
    total: number
    pendiente: number
    confirmado: number
    asistio: number
    falto: number
    cancelado: number
    cancelados_con_aviso: number
    desde_la_app: number
  }
  mensajes: { total: number; pendiente: number; enviando: number; enviado: number; error: number; cancelado: number; enviados_por_tipo: Record<string, number> }
  clientes_nuevos: number
}

export function useResumen() {
  return useQuery({
    queryKey: ['admin', 'resumen'],
    queryFn: async () => (await ok(db().rpc('admin_resumen'))) as unknown as Resumen,
  })
}

// ---------- Negocios ----------

export interface PersonaCorta {
  nombre: string | null
  email: string
}

export interface FilaNegocio {
  id: string
  slug: string
  nombre: string
  estado: EstadoNegocio
  plan: string | null
  color: string | null
  creado: string
  duenos: PersonaCorta[]
  equipo: number
  invitaciones_pendientes: number
  turnos_mes: number
  clientes: number
}

export function useNegociosAdmin() {
  return useQuery({
    queryKey: ['admin', 'negocios'],
    queryFn: async () =>
      (await ok(db().rpc('admin_negocios'))).map((f) => ({ ...f, estado: f.estado as EstadoNegocio, duenos: (f.duenos ?? []) as unknown as PersonaCorta[] })) as FilaNegocio[],
  })
}

export interface FichaNegocio {
  id: string
  slug: string
  es_demo: boolean
  estado: EstadoNegocio
  plan: string | null
  notas_internas: string
  creado: string
  actualizado: string
  config: Negocio
  equipo: { user_id: string; email: string; nombre: string | null; rol: RolStaff; profesional: string | null; ultimo_ingreso: string | null }[]
  invitaciones: { id: string; email: string; nombre: string | null; rol: RolStaff; creado: string }[]
  profesionales: { id: string; nombre: string; con_cuenta: boolean }[]
  metricas: { turnos_mes: number; proximos: number; clientes: number; mensajes_con_error: number }
}

export function useFichaNegocio(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'negocio', id],
    enabled: !!id,
    retry: 1,
    queryFn: async () => (await ok(db().rpc('admin_negocio', { p_negocio: id! }))) as unknown as FichaNegocio,
  })
}

export interface CambiosNegocio {
  estado?: EstadoNegocio
  plan?: string | null
  notas_internas?: string
  nombre?: string
  color?: string
  logo?: string | null
  claim?: string
}

export async function actualizarNegocio(id: string, cambios: CambiosNegocio) {
  await ok(db().rpc('admin_actualizar_negocio', { p_negocio: id, p_cambios: cambios as unknown as Json }))
}

export async function borrarInvitacion(id: string) {
  await ok(db().from('invitaciones').delete().eq('id', id))
}

/** Profesionales de un negocio (para vincular una cuenta nueva a su ficha). */
export function useProfesionalesDe(negocioId: string | null) {
  return useQuery({
    queryKey: ['admin', 'profesionales', negocioId],
    enabled: !!negocioId,
    queryFn: () => ok(db().from('profesionales').select('id, nombre, user_id').eq('negocio_id', negocioId!).eq('activo', true).order('orden')),
  })
}

// ---------- Cuentas ----------

export interface Cuenta {
  user_id: string
  email: string
  nombre: string | null
  creado: string
  ultimo_ingreso: string | null
  confirmada: boolean
  es_superadmin: boolean
  negocios: { id: string; slug: string; nombre: string; rol: RolStaff }[]
}

export function useCuentas() {
  return useQuery({
    queryKey: ['admin', 'cuentas'],
    queryFn: async () => (await ok(db().rpc('admin_cuentas'))).map((c) => ({ ...c, negocios: (c.negocios ?? []) as unknown as Cuenta['negocios'] })) as Cuenta[],
  })
}

export interface CuentaCreada {
  user_id: string
  email: string
  /** Se muestra UNA vez: no queda guardada en ningún lado. */
  contrasena: string
}

async function llamarAdminUsuarios(cuerpo: Record<string, unknown>): Promise<CuentaCreada> {
  const { data, error } = await db().functions.invoke('admin-usuarios', { body: cuerpo })
  if (error) {
    let codigo = error.message
    if (error instanceof FunctionsHttpError) {
      const r = (await (error.context as Response).json().catch(() => null)) as { error?: string; detalle?: string } | null
      codigo = [r?.error, r?.detalle].filter(Boolean).join(': ') || codigo
    }
    throw new Error(mensajeAdmin({ message: codigo }))
  }
  return data as CuentaCreada
}

export function crearCuenta(p: { email: string; nombre: string; negocioId?: string | null; rol?: RolStaff | null; profesionalId?: string | null }) {
  return llamarAdminUsuarios({
    accion: 'crear',
    email: p.email.trim().toLowerCase(),
    nombre: p.nombre.trim(),
    ...(p.negocioId ? { negocio_id: p.negocioId, rol: p.rol } : {}),
    ...(p.negocioId && p.profesionalId ? { profesional_id: p.profesionalId } : {}),
  })
}

export const resetearContrasena = (userId: string) => llamarAdminUsuarios({ accion: 'resetear', user_id: userId })

// ---------- Mensajes ----------

export interface FiltroMensajes {
  negocio: string
  tipo: string
  estado: string
}

export interface FilaMensaje {
  id: string
  creado: string
  programado: string
  enviado: string | null
  tipo: string
  canal: string
  destino: string
  negocio_id: string | null
  negocio: string | null
  estado: string
  intentos: number
  error: string | null
  /** null en los mensajes 'codigo': el código nunca sale de la base. */
  texto: string | null
}

export const TAMANO_PAGINA = 50

/** Registro de la cola, de a páginas (más nuevos primero). */
export function useMensajesAdmin(f: FiltroMensajes) {
  return useInfiniteQuery({
    queryKey: ['admin', 'mensajes', f],
    initialPageParam: null as string | null,
    getNextPageParam: (ultima: FilaMensaje[]) => (ultima.length < TAMANO_PAGINA ? null : ultima.at(-1)!.creado),
    queryFn: async ({ pageParam }) =>
      (await ok(
        db().rpc('admin_mensajes', {
          ...(f.negocio ? { p_negocio: f.negocio } : {}),
          ...(f.tipo ? { p_tipo: f.tipo } : {}),
          ...(f.estado ? { p_estado: f.estado } : {}),
          ...(pageParam ? { p_antes: pageParam } : {}),
          p_limite: TAMANO_PAGINA,
        }),
      )) as FilaMensaje[],
  })
}

// ---------- Refrescar ----------

export function useRefrescarAdmin() {
  const qc = useQueryClient()
  /** `sinFicha`: no volver a pedir la ficha de un negocio (ej.: recién borrado). */
  return (opciones?: { sinFicha?: boolean }) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['admin'], predicate: (q) => !(opciones?.sinFicha && q.queryKey[1] === 'negocio') }),
      qc.invalidateQueries({ queryKey: ['negocios-reales'] }),
      qc.invalidateQueries({ queryKey: ['negocio'] }),
    ])
}
