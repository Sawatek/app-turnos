// Ayudas compartidas por los tests de permisos (no es un archivo de tests).
// Todo lo que use servicio() es SOLO para preparar datos o verificar: saltea las reglas RLS.
import { expect } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { aISO, servicio, type Mundo } from '../soporte/mundo'

/** Corre una consulta y falla si devuelve error. */
export async function ok<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await p
  if (error) throw new Error(`Error inesperado: ${JSON.stringify(error)}`)
  return data as NonNullable<T>
}

type Resultado = { data: unknown; error: { message?: string; code?: string } | null }

/** Espera que la operación haya fallado; si se pasa `texto`, que el mensaje lo contenga. */
export function esperarError(r: Resultado, texto?: string) {
  expect(r.error, `se esperaba un error${texto ? ` "${texto}"` : ''} y no lo hubo`).not.toBeNull()
  if (texto) expect(r.error!.message).toContain(texto)
}

/** Para lecturas prohibidas: o da error, o vuelve vacía. Nunca trae filas. */
export function esperarNada(r: Resultado) {
  if (r.error) return
  expect(r.data as unknown[]).toEqual([])
}

/** Escritura bloqueada por RLS: o da error, o no afecta ninguna fila (pedir con .select()). */
export function esperarBloqueado(r: Resultado) {
  if (r.error) return
  expect(r.data as unknown[]).toEqual([])
}

/** Reserva un turno como el usuario dado. */
export function reservar(
  db: SupabaseClient,
  p: { negocio: string; servicio: string; dia: string; hora: string; profesional?: string; nombre?: string | null },
) {
  return db.rpc('reservar_turno', {
    p_negocio: p.negocio,
    p_servicio: p.servicio,
    p_inicio: aISO(p.dia, p.hora),
    ...(p.profesional ? { p_profesional: p.profesional } : {}),
    ...(p.nombre === null ? {} : { p_nombre: p.nombre ?? 'Cliente de prueba' }),
  }) as unknown as Promise<{ data: string | null; error: { message: string; code: string } | null }>
}

/** Horarios libres de un día (lista de { inicio, profesional_id }). */
export async function libres(db: SupabaseClient, negocio: string, serv: string, dia: string, profesional?: string) {
  const r = await db.rpc('horarios_libres', {
    p_negocio: negocio,
    p_servicio: serv,
    p_dia: dia,
    ...(profesional ? { p_profesional: profesional } : {}),
  })
  expect(r.error).toBeNull()
  return (r.data ?? []) as { inicio: string; profesional_id: string }[]
}

/** Compara instantes sin depender del formato que devuelva la base. */
export const mismoInstante = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime()
export const contieneHora = (lista: { inicio: string }[], iso: string) => lista.some((l) => mismoInstante(l.inicio, iso))

/** Crea un cliente cargado a mano (o ligado a un usuario) y devuelve su id. */
export async function crearCliente(negocio: string, nombre: string, userId: string | null = null) {
  const fila = await ok(
    servicio().from('clientes').insert({ negocio_id: negocio, nombre, user_id: userId }).select('id').single(),
  )
  return (fila as { id: string }).id
}

/** Id de la fila de cliente de un usuario en un negocio (o null). */
export async function clienteDe(negocio: string, userId: string) {
  const fila = await ok(
    servicio().from('clientes').select('id').eq('negocio_id', negocio).eq('user_id', userId).maybeSingle(),
  )
  return (fila as { id: string } | null)?.id ?? null
}

/** Inserta un turno directo con la clave secreta (saltea validaciones de reservar_turno). */
export async function crearTurno(t: {
  negocio: string
  cliente: string
  profesional: string
  servicio: string
  inicio: string
  minutos?: number
  estado?: string
}) {
  const fin = new Date(new Date(t.inicio).getTime() + (t.minutos ?? 30) * 60_000).toISOString()
  const fila = await ok(
    servicio()
      .from('turnos')
      .insert({
        negocio_id: t.negocio,
        cliente_id: t.cliente,
        profesional_id: t.profesional,
        servicio_id: t.servicio,
        inicio: t.inicio,
        fin,
        estado: t.estado ?? 'pendiente',
      })
      .select('id')
      .single(),
  )
  return (fila as { id: string }).id
}

/** Lee una fila con la clave secreta (para verificar que nada cambió). */
export async function leer<T = Record<string, unknown>>(tabla: string, id: string, columnas = '*') {
  return (await ok(servicio().from(tabla).select(columnas).eq('id', id).single())) as T
}

/** Borra turnos y bloqueos de los dos negocios del mundo (cada test arranca con la agenda vacía). */
export async function vaciarAgenda(m: Mundo) {
  const adm = servicio()
  const ids = [m.negocioA.id, m.negocioB.id]
  await ok(adm.from('turnos').delete().in('negocio_id', ids))
  await ok(adm.from('bloqueos').delete().in('negocio_id', ids))
}

/** Rango de bloqueo en formato tstzrange. */
export const rango = (desde: string, hasta: string) => `[${desde},${hasta})`

/** Instante dentro de `minutos` minutos, redondeado al minuto. */
export const dentroDe = (minutos: number) => {
  const d = new Date(Date.now() + minutos * 60_000)
  d.setSeconds(0, 0)
  return d.toISOString()
}

/**
 * Cambia columnas de un negocio usando la sesión del super admin del mundo.
 * (Con servicio() no se puede: el trigger proteger_negocio también frena a la clave secreta; ver superadmin.spec.ts.)
 */
export async function cambiarNegocio(m: Mundo, id: string, cambios: Record<string, unknown>) {
  const filas = await ok(m.usuarios.superadmin.db.from('negocios').update(cambios).eq('id', id).select('id'))
  expect(filas).toHaveLength(1)
}
