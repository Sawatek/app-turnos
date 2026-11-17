// Bloqueo de un negocio por falta de pago (estado 'suspendido'): solo SawaTek bloquea; mientras dura, el
// dueño y su equipo pierden todo permiso sobre ese negocio (y solo sobre ese), la app de los clientes no
// toma turnos y los mensajes esperan en la cola hasta que se desbloquee.
import { expect, test } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { aISO, anonimo, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { cambiarNegocio, esperarBloqueado, esperarError, esperarNada, leer, libres, ok, vaciarAgenda } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  if (!m) return
  await cambiarNegocio(m, m.negocioA.id, { estado: 'activo' })
  await limpiarMundo(m)
})

const bloquear = () => cambiarNegocio(m, m.negocioA.id, { estado: 'suspendido' })
const desbloquear = () => cambiarNegocio(m, m.negocioA.id, { estado: 'activo' })
const rpc = async (db: SupabaseClient, fn: string, args: Record<string, unknown>) => ok(db.rpc(fn, args))

test.describe('quién bloquea', () => {
  test('nadie del negocio ni de afuera puede bloquearlo o desbloquearlo; SawaTek sí', async () => {
    const { duenoA, profesionalA, cliente1 } = m.usuarios
    for (const db of [duenoA.db, profesionalA.db, cliente1.db, anonimo()]) {
      esperarBloqueado(await db.from('negocios').update({ estado: 'suspendido' }).eq('id', m.negocioA.id).select('id'))
      esperarError(await db.rpc('admin_actualizar_negocio', { p_negocio: m.negocioA.id, p_cambios: { estado: 'suspendido' } }))
    }
    expect((await leer<{ estado: string }>('negocios', m.negocioA.id, 'estado')).estado).toBe('activo')

    await ok(m.usuarios.superadmin.db.rpc('admin_actualizar_negocio', { p_negocio: m.negocioA.id, p_cambios: { estado: 'suspendido' } }))
    try {
      expect((await leer<{ estado: string }>('negocios', m.negocioA.id, 'estado')).estado).toBe('suspendido')
      // Bloqueado, el dueño tampoco puede desbloquearlo.
      esperarBloqueado(await duenoA.db.from('negocios').update({ estado: 'activo' }).eq('id', m.negocioA.id).select('id'))
      esperarError(await duenoA.db.rpc('admin_actualizar_negocio', { p_negocio: m.negocioA.id, p_cambios: { estado: 'activo' } }))
      expect((await leer<{ estado: string }>('negocios', m.negocioA.id, 'estado')).estado).toBe('suspendido')
    } finally {
      await desbloquear()
    }
  })
})

test.describe('con el negocio A bloqueado', () => {
  test.beforeAll(bloquear)
  test.afterAll(desbloquear)

  test('el dueño de A pierde su rol y no ve ni toca nada de A', async () => {
    const db = m.usuarios.duenoA.db
    expect(await db.rpc('rol_en', { p_negocio: m.negocioA.id }).then((r) => r.data)).toBeNull()
    expect(await rpc(db, 'es_dueno', { p_negocio: m.negocioA.id })).toBe(false)
    expect(await rpc(db, 'es_staff', { p_negocio: m.negocioA.id })).toBe(false)
    // Pero el panel sabe que es el dueño, bloqueado, para mostrarle el cartel de pago.
    expect(await rpc(db, 'rol_en_bloqueado', { p_negocio: m.negocioA.id })).toBe('dueno')

    // (Servicios, profesionales y horarios son catálogo público para cualquiera: lo privado es esto.)
    for (const tabla of ['negocios', 'clientes', 'turnos', 'bloqueos', 'notas_clientes', 'invitaciones', 'mensajes']) {
      const col = tabla === 'negocios' ? 'id' : 'negocio_id'
      esperarNada(await db.from(tabla).select('*').eq(col, m.negocioA.id))
    }
    esperarBloqueado(await db.from('servicios').update({ precio: 1 }).eq('id', m.servicios.corteA).select('id'))
    esperarError(await db.from('servicios').insert({ negocio_id: m.negocioA.id, nombre: 'Colado', minutos: 30, precio: 0 }))
    esperarError(await db.rpc('panel_resumen', { p_negocio: m.negocioA.id, p_dia: diaAR(1) }))
    esperarError(await db.rpc('panel_miembros', { p_negocio: m.negocioA.id }))
  })

  test('el profesional de A tampoco: ni su agenda', async () => {
    const db = m.usuarios.profesionalA.db
    expect(await db.rpc('mi_profesional', { p_negocio: m.negocioA.id }).then((r) => r.data)).toBeNull()
    expect(await rpc(db, 'es_staff', { p_negocio: m.negocioA.id })).toBe(false)
    expect(await rpc(db, 'rol_en_bloqueado', { p_negocio: m.negocioA.id })).toBe('profesional')
    esperarNada(await db.from('turnos').select('id').eq('negocio_id', m.negocioA.id))
    esperarError(await db.rpc('panel_resumen', { p_negocio: m.negocioA.id, p_dia: diaAR(1), p_profesional: m.profesionales.p1 }))
  })

  test('el dueño de B sigue igual en su negocio, y nadie de afuera figura como bloqueado en A', async () => {
    const db = m.usuarios.duenoB.db
    expect(await rpc(db, 'rol_en', { p_negocio: m.negocioB.id })).toBe('dueno')
    expect(await db.rpc('rol_en_bloqueado', { p_negocio: m.negocioB.id }).then((r) => r.data)).toBeNull()
    expect(await db.rpc('rol_en_bloqueado', { p_negocio: m.negocioA.id }).then((r) => r.data)).toBeNull()
    expect(await ok(db.from('servicios').select('id').eq('negocio_id', m.negocioB.id))).toHaveLength(1)
    expect(await m.usuarios.cliente1.db.rpc('rol_en_bloqueado', { p_negocio: m.negocioA.id }).then((r) => r.data)).toBeNull()
  })

  test('SawaTek sigue viendo y manejando A', async () => {
    const db = m.usuarios.superadmin.db
    expect(await rpc(db, 'es_dueno', { p_negocio: m.negocioA.id })).toBe(true)
    expect((await ok(db.from('servicios').select('id').eq('negocio_id', m.negocioA.id))).length).toBeGreaterThan(0)
    expect(await db.rpc('rol_en_bloqueado', { p_negocio: m.negocioA.id }).then((r) => r.data)).toBeNull()
  })

  test('la app de los clientes: no hay horarios ni negocio visible, solo su marca para avisar que no está disponible', async () => {
    expect(await libres(anonimo(), m.negocioA.id, m.servicios.corteA, diaAR(3))).toEqual([])
    expect(await libres(m.usuarios.cliente1.db, m.negocioA.id, m.servicios.corteA, diaAR(3))).toEqual([])
    esperarNada(await anonimo().from('negocios').select('id').eq('id', m.negocioA.id))

    const b = (await rpc(anonimo(), 'negocio_bloqueado', { p_slug: m.negocioA.slug })) as { id: string; config: { nombre: string } }
    expect(b.id).toBe(m.negocioA.id)
    expect(b.config.nombre).toBeTruthy()
    // Un negocio activo, uno que no existe o una demo: nada.
    expect(await anonimo().rpc('negocio_bloqueado', { p_slug: m.negocioB.slug }).then((r) => r.data)).toBeNull()
    expect(await anonimo().rpc('negocio_bloqueado', { p_slug: 'no-existe-nunca' }).then((r) => r.data)).toBeNull()
  })
})

test.describe('mensajes de un negocio bloqueado', () => {
  test.beforeEach(() => vaciarAgenda(m))

  test('esperan en la cola mientras está bloqueado y salen al desbloquear', async () => {
    // Cuenta con celular verificado: sin teléfono no se encola ningún WhatsApp.
    const cel = await servicio().auth.admin.updateUserById(m.usuarios.cliente1.id, { phone: '5491112345670' })
    if (cel.error) throw cel.error
    await ok(servicio().from('clientes').insert({ negocio_id: m.negocioA.id, user_id: m.usuarios.cliente1.id, nombre: 'Ana Pérez' }))
    const r = await m.usuarios.cliente1.db.rpc('reservar_turno', {
      p_negocio: m.negocioA.id,
      p_servicio: m.servicios.corteA,
      p_inicio: aISO(diaAR(3), '10:00'),
      p_profesional: m.profesionales.p1,
      p_nombre: 'Cliente',
    })
    expect(r.error).toBeNull()
    const adm = servicio()
    await bloquear()
    try {
      expect(await ok(adm.rpc('tomar_mensajes', { p_limite: 50, p_negocio: m.negocioA.id }))).toEqual([])
      const pendientes = await ok(adm.from('mensajes').select('tipo, estado').eq('turno_id', r.data as string).eq('tipo', 'confirmacion'))
      expect(pendientes).toEqual([{ tipo: 'confirmacion', estado: 'pendiente' }])
    } finally {
      await desbloquear()
    }
    const tomados = (await ok(adm.rpc('tomar_mensajes', { p_limite: 50, p_negocio: m.negocioA.id }))) as { tipo: string }[]
    expect(tomados.map((t) => t.tipo)).toEqual(['confirmacion'])
  })
})
