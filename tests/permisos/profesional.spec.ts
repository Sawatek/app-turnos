// Permisos del PROFESIONAL de A (P1, con usuario): solo su agenda.
import { expect, test } from '@playwright/test'
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import {
  clienteDe,
  crearCliente,
  crearTurno,
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
const t = { p1: '', p1b: '', p2: '', b: '' }
const D = () => diaAR(2)

test.beforeAll(async () => {
  m = await prepararMundo()
  const c = m.usuarios.cliente1.db
  const r = await Promise.all([
    reservar(c, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D(), hora: '10:00', profesional: m.profesionales.p1 }),
    reservar(m.usuarios.cliente2.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D(), hora: '10:00', profesional: m.profesionales.p2 }),
    reservar(m.usuarios.cliente2.db, { negocio: m.negocioB.id, servicio: m.servicios.corteB, dia: D(), hora: '10:00' }),
  ])
  for (const x of r) expect(x.error).toBeNull()
  t.p1 = r[0].data!
  t.p2 = r[1].data!
  t.b = r[2].data!
  const r2 = await reservar(c, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D(), hora: '11:00', profesional: m.profesionales.p1 })
  expect(r2.error).toBeNull()
  t.p1b = r2.data!
})
test.afterAll(async () => {
  await limpiarMundo(m)
})

const db = () => m.usuarios.profesionalA.db

test.describe('profesional: qué ve', () => {
  test('ve SOLO sus turnos (no los de P2 ni los de B)', async () => {
    const vistos = await ok(db().from('turnos').select('id, profesional_id'))
    expect(vistos.map((x) => x.id).sort()).toEqual([t.p1, t.p1b].sort())
    esperarNada(await db().from('turnos').select('id').in('id', [t.p2, t.b]))
  })

  test('ve los clientes de A y no los de B', async () => {
    const vistos = await ok(db().from('clientes').select('negocio_id, user_id'))
    expect(vistos.every((c) => c.negocio_id === m.negocioA.id)).toBe(true)
    expect(vistos.map((c) => c.user_id)).toEqual(expect.arrayContaining([m.usuarios.cliente1.id, m.usuarios.cliente2.id]))
    esperarNada(await db().from('clientes').select('id').eq('negocio_id', m.negocioB.id))
  })

  test('ve solo su propia membresía (no la lista de miembros)', async () => {
    const vistos = await ok(db().from('miembros').select('user_id, rol'))
    expect(vistos).toEqual([{ user_id: m.usuarios.profesionalA.id, rol: 'profesional' }])
  })
})

test.describe('profesional: sus turnos', () => {
  test('puede marcar asistió / faltó y anotar en los suyos', async () => {
    const r1 = await db().from('turnos').update({ estado: 'asistio', notas: 'Todo bien' }).eq('id', t.p1).select('estado')
    expect(r1.error).toBeNull()
    expect(r1.data).toEqual([{ estado: 'asistio' }])
    const r2 = await db().from('turnos').update({ estado: 'falto' }).eq('id', t.p1b).select('estado')
    expect(r2.data).toEqual([{ estado: 'falto' }])
    expect(await leer('turnos', t.p1, 'estado, notas')).toEqual({ estado: 'asistio', notas: 'Todo bien' })
  })

  test('NO puede mover el inicio, reasignar, cambiar servicio ni seña (solo_estado)', async () => {
    const antes = await leer('turnos', t.p1)
    const intentos = [
      { inicio: aISO(D(), '15:00'), fin: aISO(D(), '15:30') },
      { profesional_id: m.profesionales.p2 },
      { servicio_id: m.servicios.colorA },
      { sena: 5000 },
      { origen: 'manual' },
    ]
    for (const cambio of intentos) {
      esperarError(await db().from('turnos').update(cambio).eq('id', t.p1), 'solo_estado')
    }
    const despues = await leer('turnos', t.p1)
    expect(despues).toEqual(antes)
  })

  test('NO puede tocar turnos de P2 ni de B', async () => {
    esperarBloqueado(await db().from('turnos').update({ estado: 'falto' }).eq('id', t.p2).select('id'))
    esperarBloqueado(await db().from('turnos').update({ estado: 'falto' }).eq('id', t.b).select('id'))
    expect(await leer('turnos', t.p2, 'estado')).toEqual({ estado: 'pendiente' })
    expect(await leer('turnos', t.b, 'estado')).toEqual({ estado: 'pendiente' })
    esperarBloqueado(await db().from('turnos').delete().in('id', [t.p1, t.p2]).select('id'))
  })

  test('puede cargar un turno para sí, pero no para P2', async () => {
    const cli = (await clienteDe(m.negocioA.id, m.usuarios.cliente1.id))!
    const base = { negocio_id: m.negocioA.id, cliente_id: cli, servicio_id: m.servicios.corteA, origen: 'manual' }
    const propio = await db().from('turnos').insert({ ...base, profesional_id: m.profesionales.p1, inicio: aISO(D(), '16:00'), fin: aISO(D(), '16:30') })
    expect(propio.error).toBeNull()
    esperarError(await db().from('turnos').insert({ ...base, profesional_id: m.profesionales.p2, inicio: aISO(D(), '16:00'), fin: aISO(D(), '16:30') }))
    esperarNada(await servicio().from('turnos').select('id').eq('profesional_id', m.profesionales.p2).eq('inicio', aISO(D(), '16:00')))
  })
})

test.describe('profesional: catálogo y bloqueos', () => {
  test('NO edita servicios ni precios', async () => {
    esperarBloqueado(await db().from('servicios').update({ precio: 1 }).eq('id', m.servicios.corteA).select('id'))
    expect(await leer('servicios', m.servicios.corteA, 'precio')).toEqual({ precio: 12000 })
    esperarError(await db().from('servicios').insert({ negocio_id: m.negocioA.id, nombre: 'Propio', minutos: 15 }))
    esperarBloqueado(await db().from('servicios').delete().eq('id', m.servicios.colorA).select('id'))
  })

  test('NO edita horarios (ni los propios) ni profesionales', async () => {
    const [h] = await ok(servicio().from('horarios').select('id, hasta').eq('profesional_id', m.profesionales.p1).eq('dia', 1).order('desde').limit(1))
    esperarBloqueado(await db().from('horarios').update({ hasta: '12:00' }).eq('id', h!.id).select('id'))
    expect(await leer('horarios', h!.id, 'hasta')).toEqual({ hasta: h!.hasta })
    esperarError(await db().from('horarios').insert({ negocio_id: m.negocioA.id, profesional_id: m.profesionales.p1, dia: 0, desde: '21:00', hasta: '23:00' }))
    esperarBloqueado(await db().from('horarios').delete().eq('profesional_id', m.profesionales.p1).select('id'))
    esperarBloqueado(await db().from('profesionales').update({ nombre: 'P1 Jefe' }).eq('id', m.profesionales.p1).select('id'))
    esperarBloqueado(await db().from('profesional_servicios').delete().eq('profesional_id', m.profesionales.p2).select('servicio_id'))
  })

  test('NO puede editar el negocio ni sumar miembros', async () => {
    esperarBloqueado(await db().from('negocios').update({ cancelacion_horas: 0 }).eq('id', m.negocioA.id).select('id'))
    expect(await leer('negocios', m.negocioA.id, 'cancelacion_horas')).toEqual({ cancelacion_horas: 2 })
    esperarError(await db().from('miembros').insert({ negocio_id: m.negocioA.id, user_id: m.usuarios.cliente2.id, rol: 'profesional' }))
  })

  test('crea bloqueos solo para sí mismo', async () => {
    const r = rango(aISO(diaAR(4), '10:00'), aISO(diaAR(4), '12:00'))
    const propio = await db().from('bloqueos').insert({ negocio_id: m.negocioA.id, profesional_id: m.profesionales.p1, rango: r, motivo: 'Dentista' }).select('id').single()
    expect(propio.error).toBeNull()
    esperarError(await db().from('bloqueos').insert({ negocio_id: m.negocioA.id, profesional_id: m.profesionales.p2, rango: r }))
    esperarError(await db().from('bloqueos').insert({ negocio_id: m.negocioA.id, profesional_id: null, rango: r }))
    esperarError(await db().from('bloqueos').insert({ negocio_id: m.negocioB.id, profesional_id: null, rango: r }))
    // No puede pasarle su bloqueo a P2.
    esperarError(await db().from('bloqueos').update({ profesional_id: m.profesionales.p2 }).eq('id', propio.data!.id).select('id'))
    // Ve los bloqueos del negocio (es staff), pero no puede borrar los de otro.
    const deP2 = (await ok(servicio().from('bloqueos').insert({ negocio_id: m.negocioA.id, profesional_id: m.profesionales.p2, rango: r }).select('id').single())).id
    expect((await ok(db().from('bloqueos').select('id').eq('negocio_id', m.negocioA.id))).length).toBe(2)
    esperarBloqueado(await db().from('bloqueos').delete().eq('id', deP2).select('id'))
    expect(await leer('bloqueos', deP2, 'id')).toEqual({ id: deP2 })
    expect((await db().from('bloqueos').delete().eq('id', propio.data!.id).select('id')).data).toHaveLength(1)
  })
})

test.describe('profesional: huecos', () => {
  test('NO puede ver los turnos de P2 "adueñándose" de la ficha de un cliente', async () => {
    // Corregido (lo encontró este test): "Editar clientes" deja al staff (incluido un profesional) cambiar clientes.user_id. Si P1 se pone
    // como usuario de la ficha de cliente2, es_mi_cliente() pasa a ser verdadero y ve (y puede cancelar)
    // los turnos de cliente2 con P2. Además cliente2 pierde el acceso a sus propios turnos.
    const fichaCliente2 = (await clienteDe(m.negocioA.id, m.usuarios.cliente2.id))!
    try {
      esperarBloqueado(await db().from('clientes').update({ user_id: m.usuarios.profesionalA.id }).eq('id', fichaCliente2).select('id'))
      esperarNada(await db().from('turnos').select('id').eq('id', t.p2))
    } finally {
      await ok(servicio().from('clientes').update({ user_id: m.usuarios.cliente2.id }).eq('id', fichaCliente2))
    }
  })

  test('si el dueño lo quita del negocio, deja de ver y tocar su agenda', async () => {
    // Corregido (lo encontró este test): mi_profesional() solo mira profesionales.user_id, no que siga siendo miembro. Al borrar la fila de
    // miembros, el ex profesional sigue viendo los turnos de P1 (con sus clientes), cambiándoles el estado,
    // cargando turnos y bloqueos. Pasa lo mismo si el dueño pone en profesionales.user_id a alguien que no es miembro.
    const quitado = await m.usuarios.duenoA.db.from('miembros').delete().eq('negocio_id', m.negocioA.id).eq('user_id', m.usuarios.profesionalA.id).select('user_id')
    expect(quitado.data).toHaveLength(1)
    try {
      esperarNada(await db().from('clientes').select('id').eq('negocio_id', m.negocioA.id)) // esto sí lo corta (es_staff)
      esperarNada(await db().from('turnos').select('id'))
      esperarBloqueado(await db().from('turnos').update({ estado: 'falto' }).eq('id', t.p1).select('id'))
    } finally {
      await ok(servicio().from('miembros').upsert({ negocio_id: m.negocioA.id, user_id: m.usuarios.profesionalA.id, rol: 'profesional' }))
    }
  })

  test('una ficha de cliente cargada a mano no le da acceso a nadie', async () => {
    // Control: un cliente manual (sin usuario) no lo ve ningún cliente logueado.
    const manual = await crearCliente(m.negocioA.id, 'Sin usuario')
    await crearTurno({ negocio: m.negocioA.id, cliente: manual, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: aISO(D(), '18:00') })
    esperarNada(await m.usuarios.cliente1.db.from('clientes').select('id').eq('id', manual))
    esperarNada(await m.usuarios.cliente1.db.from('turnos').select('id').eq('cliente_id', manual))
  })
})
