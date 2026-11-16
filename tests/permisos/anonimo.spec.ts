// Permisos del visitante SIN sesión (la app pública que abre cualquiera con el link).
import { expect, test } from '@playwright/test'
import { aISO, anonimo, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import {
  cambiarNegocio,
  clienteDe,
  crearTurno,
  esperarBloqueado,
  esperarError,
  esperarNada,
  leer,
  libres,
  ok,
  rango,
  reservar,
} from './ayuda'

// Los tests de este archivo comparten un mundo: van uno detrás del otro.
test.describe.configure({ mode: 'default' })

let m: Mundo
test.beforeAll(async () => {
  m = await prepararMundo()
  // Datos privados que el anónimo NO debe ver: un cliente con turno y un bloqueo.
  const dia = diaAR(2)
  const r = await reservar(m.usuarios.cliente1.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia, hora: '10:00' })
  expect(r.error).toBeNull()
  const cli = (await clienteDe(m.negocioA.id, m.usuarios.cliente1.id))!
  await crearTurno({ negocio: m.negocioA.id, cliente: cli, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: aISO(dia, '11:00') })
  await ok(
    servicio()
      .from('bloqueos')
      .insert({ negocio_id: m.negocioA.id, profesional_id: m.profesionales.p1, rango: rango(aISO(dia, '15:00'), aISO(dia, '16:00')), motivo: 'Médico' }),
  )
})
test.afterAll(async () => {
  await limpiarMundo(m)
})

test.describe('anónimo: lo que SÍ puede ver', () => {
  test('ve los negocios activos', async () => {
    const { data, error } = await anonimo().from('negocios').select('id, slug, estado').in('id', [m.negocioA.id, m.negocioB.id])
    expect(error).toBeNull()
    expect(data!.map((n) => n.id).sort()).toEqual([m.negocioA.id, m.negocioB.id].sort())
  })

  test('ve servicios, profesionales, qué hace cada uno y horarios', async () => {
    const db = anonimo()
    const serv = await ok(db.from('servicios').select('id').eq('negocio_id', m.negocioA.id))
    expect(serv.map((s) => s.id).sort()).toEqual([m.servicios.corteA, m.servicios.colorA].sort())
    const profs = await ok(db.from('profesionales').select('id').eq('negocio_id', m.negocioA.id))
    expect(profs.map((p) => p.id).sort()).toEqual([m.profesionales.p1, m.profesionales.p2].sort())
    const ps = await ok(db.from('profesional_servicios').select('servicio_id').eq('profesional_id', m.profesionales.p2))
    expect(ps).toEqual([{ servicio_id: m.servicios.corteA }])
    const hs = await ok(db.from('horarios').select('id').eq('negocio_id', m.negocioA.id))
    expect(hs.length).toBe(21) // P1: 2 franjas × 7 días; P2: 1 × 7
  })

  test('puede consultar horarios_libres', async () => {
    const lista = await libres(anonimo(), m.negocioA.id, m.servicios.corteA, diaAR(3))
    expect(lista.length).toBeGreaterThan(10)
  })
})

test.describe('anónimo: lo que NO puede ver', () => {
  for (const tabla of ['clientes', 'turnos', 'miembros', 'bloqueos', 'superadmins']) {
    test(`no ve ${tabla}`, async () => {
      // Hay datos (los crea el beforeAll y el mundo); con la clave secreta se ven.
      const conClave = await ok(servicio().from(tabla).select('*').limit(1))
      expect(conClave.length).toBe(1)
      esperarNada(await anonimo().from(tabla).select('*'))
    })
  }

  test('no ve un negocio suspendido (ni le ofrece horarios)', async () => {
    await cambiarNegocio(m, m.negocioB.id, { estado: 'suspendido' })
    try {
      esperarNada(await anonimo().from('negocios').select('id').eq('id', m.negocioB.id))
      expect(await libres(anonimo(), m.negocioB.id, m.servicios.corteB, diaAR(3))).toEqual([])
    } finally {
      await cambiarNegocio(m, m.negocioB.id, { estado: 'activo' })
    }
  })
})

test.describe('anónimo: lo que NO puede hacer', () => {
  test('no puede crear negocios', async () => {
    const slug = `x-${m.sufijo}`
    esperarError(await anonimo().from('negocios').insert({ slug, config: { slug }, es_demo: false }))
    expect(await ok(servicio().from('negocios').select('id').eq('slug', slug))).toEqual([])
  })

  test('no puede editar negocios', async () => {
    const antes = await leer('negocios', m.negocioA.id, 'config, estado')
    esperarBloqueado(await anonimo().from('negocios').update({ estado: 'suspendido' }).eq('id', m.negocioA.id).select())
    expect(await leer('negocios', m.negocioA.id, 'config, estado')).toEqual(antes)
  })

  test('no puede borrar negocios', async () => {
    esperarBloqueado(await anonimo().from('negocios').delete().eq('id', m.negocioA.id).select())
    expect(await leer('negocios', m.negocioA.id, 'id')).toEqual({ id: m.negocioA.id })
  })

  test('no puede crear servicios', async () => {
    esperarError(await anonimo().from('servicios').insert({ negocio_id: m.negocioA.id, nombre: 'Gratis', minutos: 30, precio: 0 }))
    expect(await ok(servicio().from('servicios').select('id').eq('nombre', 'Gratis').eq('negocio_id', m.negocioA.id))).toEqual([])
  })

  test('no puede editar precios ni horarios', async () => {
    esperarBloqueado(await anonimo().from('servicios').update({ precio: 1 }).eq('id', m.servicios.corteA).select())
    expect(await leer('servicios', m.servicios.corteA, 'precio')).toEqual({ precio: 12000 })
    esperarBloqueado(await anonimo().from('horarios').delete().eq('negocio_id', m.negocioA.id).select())
    expect((await ok(servicio().from('horarios').select('id').eq('negocio_id', m.negocioA.id))).length).toBe(21)
  })

  test('no puede insertar turnos ni clientes directo', async () => {
    const cli = (await clienteDe(m.negocioA.id, m.usuarios.cliente1.id))!
    esperarError(await anonimo().from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Intruso' }))
    esperarError(
      await anonimo().from('turnos').insert({
        negocio_id: m.negocioA.id, cliente_id: cli, profesional_id: m.profesionales.p1, servicio_id: m.servicios.corteA,
        inicio: aISO(diaAR(4), '10:00'), fin: aISO(diaAR(4), '10:30'),
      }),
    )
  })

  test('no puede llamar reservar_turno sin sesión', async () => {
    const r = await reservar(anonimo(), { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: diaAR(4), hora: '12:00' })
    esperarError(r)
    expect(r.data).toBeNull()
    const turnos = await ok(servicio().from('turnos').select('id').eq('inicio', aISO(diaAR(4), '12:00')).eq('negocio_id', m.negocioA.id))
    expect(turnos).toEqual([])
  })

  test('no puede cancelar ni confirmar turnos', async () => {
    const [t] = await ok(servicio().from('turnos').select('id').eq('negocio_id', m.negocioA.id).limit(1))
    esperarError(await anonimo().rpc('cancelar_turno', { p_turno: t!.id }))
    esperarError(await anonimo().rpc('confirmar_turno', { p_turno: t!.id }))
    expect(await leer('turnos', t!.id, 'estado')).toEqual({ estado: 'pendiente' })
  })
})
