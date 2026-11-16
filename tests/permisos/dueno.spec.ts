// Permisos del DUEÑO del negocio A: todo lo de A, nada de B.
import { expect, test } from '@playwright/test'
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import {
  clienteDe,
  esperarBloqueado,
  esperarError,
  esperarNada,
  leer,
  ok,
  rango,
  reservar,
} from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
const turnos = { a1: '', a2: '', b1: '' }
const D = () => diaAR(2)

test.beforeAll(async () => {
  m = await prepararMundo()
  // Turnos de clientes en los dos negocios.
  const r1 = await reservar(m.usuarios.cliente1.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D(), hora: '10:00', profesional: m.profesionales.p1 })
  const r2 = await reservar(m.usuarios.cliente2.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D(), hora: '10:00', profesional: m.profesionales.p2 })
  const r3 = await reservar(m.usuarios.cliente1.db, { negocio: m.negocioB.id, servicio: m.servicios.corteB, dia: D(), hora: '10:00' })
  for (const r of [r1, r2, r3]) expect(r.error).toBeNull()
  Object.assign(turnos, { a1: r1.data!, a2: r2.data!, b1: r3.data! })
  await ok(servicio().from('bloqueos').insert({ negocio_id: m.negocioB.id, rango: rango(aISO(D(), '18:00'), aISO(D(), '19:00')), motivo: 'Privado de B' }))
})
test.afterAll(async () => {
  await limpiarMundo(m)
})

const db = () => m.usuarios.duenoA.db

test.describe('dueño: qué ve', () => {
  test('ve todos los turnos de A y ninguno de B', async () => {
    const vistos = await ok(db().from('turnos').select('id, negocio_id'))
    expect(vistos.every((t) => t.negocio_id === m.negocioA.id)).toBe(true)
    expect(vistos.map((t) => t.id)).toEqual(expect.arrayContaining([turnos.a1, turnos.a2]))
    esperarNada(await db().from('turnos').select('id').eq('id', turnos.b1))
  })

  test('ve todos los clientes de A y ninguno de B', async () => {
    const vistos = await ok(db().from('clientes').select('id, negocio_id, user_id'))
    expect(vistos.every((c) => c.negocio_id === m.negocioA.id)).toBe(true)
    expect(vistos.map((c) => c.user_id)).toEqual(expect.arrayContaining([m.usuarios.cliente1.id, m.usuarios.cliente2.id]))
    esperarNada(await db().from('clientes').select('id').eq('negocio_id', m.negocioB.id))
  })

  test('ve los miembros de A y no los de B', async () => {
    const vistos = await ok(db().from('miembros').select('negocio_id, user_id, rol'))
    expect(vistos.every((x) => x.negocio_id === m.negocioA.id)).toBe(true)
    expect(vistos.map((x) => x.user_id).sort()).toEqual([m.usuarios.duenoA.id, m.usuarios.profesionalA.id].sort())
  })

  test('no ve los bloqueos de B ni la tabla de superadmins', async () => {
    esperarNada(await db().from('bloqueos').select('id').eq('negocio_id', m.negocioB.id))
    esperarNada(await db().from('superadmins').select('*'))
  })
})

test.describe('dueño: catálogo (servicios, horarios, profesionales)', () => {
  test('edita y crea servicios de A', async () => {
    const r = await db().from('servicios').update({ precio: 13000 }).eq('id', m.servicios.corteA).select('precio')
    expect(r.error).toBeNull()
    expect(r.data).toEqual([{ precio: 13000 }])
    const nuevo = await db().from('servicios').insert({ negocio_id: m.negocioA.id, nombre: 'Barba', minutos: 15, precio: 5000 }).select('id').single()
    expect(nuevo.error).toBeNull()
    expect((await db().from('servicios').delete().eq('id', nuevo.data!.id).select('id')).data).toHaveLength(1)
  })

  test('NO edita, crea ni borra servicios de B', async () => {
    esperarBloqueado(await db().from('servicios').update({ precio: 1 }).eq('id', m.servicios.corteB).select('id'))
    expect(await leer('servicios', m.servicios.corteB, 'precio')).toEqual({ precio: 10000 })
    esperarError(await db().from('servicios').insert({ negocio_id: m.negocioB.id, nombre: 'Trucho', minutos: 15 }))
    esperarBloqueado(await db().from('servicios').delete().eq('id', m.servicios.corteB).select('id'))
    // Tampoco puede "llevarse" un servicio propio a B.
    esperarError(await db().from('servicios').update({ negocio_id: m.negocioB.id }).eq('id', m.servicios.colorA).select('id'))
    expect(await leer('servicios', m.servicios.colorA, 'negocio_id')).toEqual({ negocio_id: m.negocioA.id })
  })

  test('edita horarios de A y NO los de B', async () => {
    const [hA] = await ok(servicio().from('horarios').select('id').eq('profesional_id', m.profesionales.p2).eq('dia', 1))
    const [hB] = await ok(servicio().from('horarios').select('id, hasta').eq('profesional_id', m.profesionales.pB).eq('dia', 1))
    const r = await db().from('horarios').update({ hasta: '19:00' }).eq('id', hA!.id).select('hasta')
    expect(r.data).toEqual([{ hasta: '19:00:00' }])
    await ok(servicio().from('horarios').update({ hasta: '20:00' }).eq('id', hA!.id))
    esperarBloqueado(await db().from('horarios').update({ hasta: '10:00' }).eq('id', hB!.id).select('id'))
    expect(await leer('horarios', hB!.id, 'hasta')).toEqual({ hasta: hB!.hasta })
    esperarError(await db().from('horarios').insert({ negocio_id: m.negocioB.id, profesional_id: m.profesionales.pB, dia: 0, desde: '21:00', hasta: '22:00' }))
    // Ni colgarle un horario de A a un profesional de B.
    esperarError(await db().from('horarios').insert({ negocio_id: m.negocioA.id, profesional_id: m.profesionales.pB, dia: 0, desde: '21:00', hasta: '22:00' }))
  })

  test('maneja profesionales de A (y qué servicios hacen) y NO los de B', async () => {
    const r = await db().from('profesionales').update({ rol: 'Barbero senior' }).eq('id', m.profesionales.p2).select('rol')
    expect(r.data).toEqual([{ rol: 'Barbero senior' }])
    const nuevo = await db().from('profesionales').insert({ negocio_id: m.negocioA.id, nombre: 'P3' }).select('id').single()
    expect(nuevo.error).toBeNull()
    expect((await db().from('profesional_servicios').insert({ negocio_id: m.negocioA.id, profesional_id: nuevo.data!.id, servicio_id: m.servicios.corteA })).error).toBeNull()
    expect((await db().from('profesionales').delete().eq('id', nuevo.data!.id).select('id')).data).toHaveLength(1)

    esperarBloqueado(await db().from('profesionales').update({ nombre: 'Hackeado' }).eq('id', m.profesionales.pB).select('id'))
    expect(await leer('profesionales', m.profesionales.pB, 'nombre')).toEqual({ nombre: 'PB' })
    esperarError(await db().from('profesionales').insert({ negocio_id: m.negocioB.id, nombre: 'Infiltrado' }))
    esperarBloqueado(await db().from('profesionales').delete().eq('id', m.profesionales.pB).select('id'))
    esperarError(await db().from('profesional_servicios').insert({ negocio_id: m.negocioB.id, profesional_id: m.profesionales.pB, servicio_id: m.servicios.corteB }))
  })
})

test.describe('dueño: su negocio', () => {
  test('puede editar la configuración y las reglas de su negocio', async () => {
    const r = await db().from('negocios').update({ cancelacion_horas: 3 }).eq('id', m.negocioA.id).select('cancelacion_horas')
    expect(r.data).toEqual([{ cancelacion_horas: 3 }])
    await ok(servicio().from('negocios').update({ cancelacion_horas: 2 }).eq('id', m.negocioA.id))
  })

  test('NO puede cambiar slug, estado ni es_demo (solo_superadmin)', async () => {
    const antes = await leer('negocios', m.negocioA.id, 'slug, estado, es_demo')
    const slug = `otro-${m.sufijo}`
    const intentos = [
      { slug, config: { ...((await leer<{ config: object }>('negocios', m.negocioA.id, 'config')).config), slug } },
      { estado: 'suspendido' },
      { estado: 'prueba' },
      { es_demo: true },
    ]
    for (const cambio of intentos) {
      esperarError(await db().from('negocios').update(cambio).eq('id', m.negocioA.id), 'solo_superadmin')
    }
    expect(await leer('negocios', m.negocioA.id, 'slug, estado, es_demo')).toEqual(antes)
  })

  test('NO puede editar ni borrar el negocio B, ni crear negocios', async () => {
    esperarBloqueado(await db().from('negocios').update({ cancelacion_horas: 100 }).eq('id', m.negocioB.id).select('id'))
    expect(await leer('negocios', m.negocioB.id, 'cancelacion_horas')).toEqual({ cancelacion_horas: 2 })
    esperarBloqueado(await db().from('negocios').delete().eq('id', m.negocioB.id).select('id'))
    esperarBloqueado(await db().from('negocios').delete().eq('id', m.negocioA.id).select('id'))
    const nuevo = `nuevo-${m.sufijo}`
    esperarError(await db().from('negocios').insert({ slug: nuevo, config: { slug: nuevo }, es_demo: false }))
  })
})

test.describe('dueño: miembros', () => {
  test('suma y quita profesionales en A', async () => {
    const nuevo = { negocio_id: m.negocioA.id, user_id: m.usuarios.cliente2.id, rol: 'profesional' }
    expect((await db().from('miembros').insert(nuevo)).error).toBeNull()
    expect(await ok(servicio().from('miembros').select('rol').eq('negocio_id', m.negocioA.id).eq('user_id', m.usuarios.cliente2.id))).toEqual([{ rol: 'profesional' }])
    const borrado = await db().from('miembros').delete().eq('negocio_id', m.negocioA.id).eq('user_id', m.usuarios.cliente2.id).select('user_id')
    expect(borrado.data).toHaveLength(1)
  })

  test('NO puede crear otro dueño, ni ascender a un profesional, ni quitar al dueño', async () => {
    esperarError(await db().from('miembros').insert({ negocio_id: m.negocioA.id, user_id: m.usuarios.cliente2.id, rol: 'dueno' }))
    esperarBloqueado(await db().from('miembros').update({ rol: 'dueno' }).eq('negocio_id', m.negocioA.id).eq('user_id', m.usuarios.profesionalA.id).select('rol'))
    esperarBloqueado(await db().from('miembros').delete().eq('negocio_id', m.negocioA.id).eq('user_id', m.usuarios.duenoA.id).select('rol'))
    const filas = await ok(servicio().from('miembros').select('user_id, rol').eq('negocio_id', m.negocioA.id))
    expect(filas).toHaveLength(2)
    expect(filas.find((f) => f.user_id === m.usuarios.profesionalA.id)?.rol).toBe('profesional')
  })

  test('NO toca miembros de B', async () => {
    esperarError(await db().from('miembros').insert({ negocio_id: m.negocioB.id, user_id: m.usuarios.cliente2.id, rol: 'profesional' }))
    esperarBloqueado(await db().from('miembros').delete().eq('negocio_id', m.negocioB.id).select('user_id'))
    esperarNada(await db().from('miembros').select('*').eq('negocio_id', m.negocioB.id))
    expect(await ok(servicio().from('miembros').select('user_id').eq('negocio_id', m.negocioB.id))).toEqual([{ user_id: m.usuarios.duenoB.id }])
  })
})

test.describe('dueño: agenda', () => {
  test('carga clientes y turnos manuales en A', async () => {
    const cli = await db().from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Doña Rosa', telefono: '11 5555-5555' }).select('id').single()
    expect(cli.error).toBeNull()
    const t = await db()
      .from('turnos')
      .insert({
        negocio_id: m.negocioA.id, cliente_id: cli.data!.id, profesional_id: m.profesionales.p2, servicio_id: m.servicios.corteA,
        inicio: aISO(D(), '12:00'), fin: aISO(D(), '12:30'), origen: 'manual', sena: 3000,
      })
      .select('id, creado_por')
      .single()
    expect(t.error).toBeNull()
    expect(t.data!.creado_por).toBe(m.usuarios.duenoA.id)
    // Y puede moverlo, cambiarle la seña o el estado.
    const mov = await db().from('turnos').update({ inicio: aISO(D(), '12:30'), fin: aISO(D(), '13:00'), sena: 0, estado: 'confirmado' }).eq('id', t.data!.id).select('estado')
    expect(mov.data).toEqual([{ estado: 'confirmado' }])
  })

  test('NO carga clientes ni turnos en B, ni usa clientes de B en A', async () => {
    esperarError(await db().from('clientes').insert({ negocio_id: m.negocioB.id, nombre: 'Infiltrado' }))
    const cliB = (await clienteDe(m.negocioB.id, m.usuarios.cliente1.id))!
    const base = { profesional_id: m.profesionales.pB, servicio_id: m.servicios.corteB, inicio: aISO(D(), '15:00'), fin: aISO(D(), '15:30'), origen: 'manual' }
    esperarError(await db().from('turnos').insert({ ...base, negocio_id: m.negocioB.id, cliente_id: cliB }))
    // Turno en A con cliente/profesional de B: lo frena la clave compuesta (mismo negocio).
    esperarError(await db().from('turnos').insert({ ...base, negocio_id: m.negocioA.id, cliente_id: cliB, profesional_id: m.profesionales.p2, servicio_id: m.servicios.corteA }))
    esperarNada(await servicio().from('turnos').select('id').eq('inicio', aISO(D(), '15:00')))
  })

  test('NO modifica ni borra turnos de B', async () => {
    esperarBloqueado(await db().from('turnos').update({ estado: 'cancelado' }).eq('id', turnos.b1).select('id'))
    expect(await leer('turnos', turnos.b1, 'estado')).toEqual({ estado: 'pendiente' })
    esperarBloqueado(await db().from('turnos').delete().eq('id', turnos.b1).select('id'))
    // Borrar turnos es solo de SawaTek, ni siquiera los de A.
    esperarBloqueado(await db().from('turnos').delete().eq('id', turnos.a1).select('id'))
    expect(await leer('turnos', turnos.a1, 'id')).toEqual({ id: turnos.a1 })
  })

  test('crea bloqueos en A (de un profesional o de todo el negocio) y NO en B', async () => {
    const deP1 = await db().from('bloqueos').insert({ negocio_id: m.negocioA.id, profesional_id: m.profesionales.p1, rango: rango(aISO(D(), '16:00'), aISO(D(), '17:00')), motivo: 'Turno médico' }).select('id').single()
    expect(deP1.error).toBeNull()
    const todo = await db().from('bloqueos').insert({ negocio_id: m.negocioA.id, rango: rango(aISO(diaAR(5), '00:00'), aISO(diaAR(6), '00:00')), motivo: 'Feriado' }).select('id').single()
    expect(todo.error).toBeNull()
    expect((await ok(db().from('bloqueos').select('id').eq('negocio_id', m.negocioA.id))).length).toBe(2)
    esperarError(await db().from('bloqueos').insert({ negocio_id: m.negocioB.id, rango: rango(aISO(D(), '16:00'), aISO(D(), '17:00')) }))
    esperarBloqueado(await db().from('bloqueos').delete().eq('negocio_id', m.negocioB.id).select('id'))
    expect((await ok(servicio().from('bloqueos').select('id').eq('negocio_id', m.negocioB.id))).length).toBe(1)
  })
})
