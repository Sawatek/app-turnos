// Permisos de la fase 3 (app del cliente real): disponibilidad_dias, mi_resumen y aislamiento entre clientes
// que entran con el celular.
import { expect, test } from '@playwright/test'
import { aISO, anonimo, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { crearClienteCelular, type ClienteCelular } from '../e2e/cliente-real/ayuda'
import { cambiarNegocio, crearTurno, esperarBloqueado, esperarError, esperarNada, libres, ok, reservar, vaciarAgenda } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
let x: ClienteCelular
let y: ClienteCelular

test.beforeAll(async () => {
  m = await prepararMundo()
  ;[x, y] = await Promise.all([crearClienteCelular(), crearClienteCelular()])
})
test.afterAll(async () => {
  await limpiarMundo(m)
  await Promise.all([x, y].filter(Boolean).map((c) => servicio().auth.admin.deleteUser(c.id)))
})
test.beforeEach(async () => {
  await vaciarAgenda(m)
  await servicio().from('clientes').delete().in('user_id', [x.id, y.id])
})

type Dia = { dia: string; libres: number; capacidad: number }
async function dias(db = anonimo(), p: { servicio?: string; profesional?: string; desde?: string; dias?: number; negocio?: string } = {}) {
  const r = await db.rpc('disponibilidad_dias', {
    p_negocio: p.negocio ?? m.negocioA.id,
    p_servicio: p.servicio ?? m.servicios.corteA,
    ...(p.profesional ? { p_profesional: p.profesional } : {}),
    ...(p.desde ? { p_desde: p.desde } : {}),
    ...(p.dias !== undefined ? { p_dias: p.dias } : {}),
  })
  expect(r.error, JSON.stringify(r.error)).toBeNull()
  return r.data as Dia[]
}

test.describe('disponibilidad_dias', () => {
  test('el visitante sin sesión la puede usar: 14 días desde hoy, solo cantidades', async () => {
    const d = await dias()
    expect(d).toHaveLength(14)
    expect(d[0]!.dia).toBe(diaAR(0))
    expect(d[13]!.dia).toBe(diaAR(13))
    // No expone nada más que el día y dos números.
    expect(Object.keys(d[0]!).sort()).toEqual(['capacidad', 'dia', 'libres'])
  })

  test('libres coincide con horarios_libres, y capacidad con la grilla de cada profesional', async () => {
    const db = anonimo()
    const D = diaAR(2)
    const fila = (lista: Dia[]) => lista.find((f) => f.dia === D)!
    // Corte con cualquiera: de 9:00 a 19:30 cada 15 min = 43 inicios. Solo P1 (descanso 13–14): 15 + 23 = 38.
    const cualquiera = fila(await dias(db))
    expect(cualquiera).toEqual({ dia: D, libres: (await libres(db, m.negocioA.id, m.servicios.corteA, D)).length, capacidad: 43 })
    const p1 = fila(await dias(db, { profesional: m.profesionales.p1 }))
    expect(p1.capacidad).toBe(38)
    expect(p1.libres).toBe((await libres(db, m.negocioA.id, m.servicios.corteA, D, m.profesionales.p1)).length)
    // Color (60 min, solo P1): 13 + 21 = 34. P2 no lo hace: el día queda "cerrado" para él.
    expect(fila(await dias(db, { servicio: m.servicios.colorA })).capacidad).toBe(34)
    expect((await dias(db, { servicio: m.servicios.colorA, profesional: m.profesionales.p2 })).every((f) => f.capacidad === 0 && f.libres === 0)).toBe(true)
  })

  test('una reserva descuenta el horario del día', async () => {
    const D = diaAR(3)
    const antes = (await dias(undefined, { profesional: m.profesionales.p1 })).find((f) => f.dia === D)!
    const r = await reservar(x.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D, hora: '10:00', profesional: m.profesionales.p1 })
    expect(r.error).toBeNull()
    const despues = (await dias(undefined, { profesional: m.profesionales.p1 })).find((f) => f.dia === D)!
    // Un corte de 30 min a las 10:00 ocupa los inicios 9:45, 10:00 y 10:15.
    expect(despues.libres).toBe(antes.libres - 3)
    expect(despues.capacidad).toBe(antes.capacidad)
  })

  test('limita el rango: nunca antes de hoy y como mucho 31 días', async () => {
    expect(await dias(undefined, { dias: 500 })).toHaveLength(31)
    expect(await dias(undefined, { dias: 0 })).toHaveLength(1)
    const pasado = await dias(undefined, { desde: diaAR(-30), dias: 3 })
    expect(pasado.map((f) => f.dia)).toEqual([diaAR(0), diaAR(1), diaAR(2)])
  })

  test('nada para servicios de otro negocio, inactivos, demos o negocios que no están activos', async () => {
    // Servicio de B pedido en A.
    expect(await dias(undefined, { servicio: m.servicios.corteB })).toEqual([])
    // Servicio inactivo.
    await ok(servicio().from('servicios').update({ activo: false }).eq('id', m.servicios.colorA).select('id'))
    try {
      expect(await dias(undefined, { servicio: m.servicios.colorA })).toEqual([])
    } finally {
      await ok(servicio().from('servicios').update({ activo: true }).eq('id', m.servicios.colorA).select('id'))
    }
    // Negocio en prueba o suspendido.
    for (const estado of ['prueba', 'suspendido']) {
      await cambiarNegocio(m, m.negocioB.id, { estado })
      try {
        expect(await dias(undefined, { negocio: m.negocioB.id, servicio: m.servicios.corteB })).toEqual([])
      } finally {
        await cambiarNegocio(m, m.negocioB.id, { estado: 'activo' })
      }
    }
    // Una demo.
    const { data: demo } = await servicio().from('negocios').select('id').eq('es_demo', true).limit(1).maybeSingle()
    if (demo) expect(await dias(undefined, { negocio: demo.id })).toEqual([])
  })
})

test.describe('mi_resumen', () => {
  const resumen = (db: ClienteCelular['db'], negocio = m.negocioA.id) => db.rpc('mi_resumen', { p_negocio: negocio })

  test('el visitante sin sesión no la puede usar', async () => {
    esperarError(await resumen(anonimo()))
  })

  test('sin ficha todavía: una fila vacía con el plazo de cancelación del negocio', async () => {
    const r = await resumen(x.db)
    expect(r.error).toBeNull()
    expect(r.data).toEqual([{ cliente_id: null, nombre: null, telefono: null, sellos: 0, activos: 0, cancelacion_horas: 2 }])
  })

  test('sellos = turnos con "asistio"; activos = pendientes o confirmados a futuro', async () => {
    const r0 = await reservar(x.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: diaAR(2), hora: '10:00', nombre: 'Xime' })
    expect(r0.error).toBeNull()
    const { cliente_id } = await ok(servicio().from('turnos').select('cliente_id').eq('id', r0.data!).single())
    const pasado = (n: number, estado: string) =>
      crearTurno({ negocio: m.negocioA.id, cliente: cliente_id, profesional: m.profesionales.p1, servicio: m.servicios.corteA, inicio: aISO(diaAR(-n), '10:00'), estado })
    await pasado(10, 'asistio')
    await pasado(8, 'asistio')
    await pasado(6, 'falto')
    await pasado(4, 'cancelado')

    const r = await resumen(x.db)
    expect(r.data).toEqual([{ cliente_id, nombre: 'Xime', telefono: null, sellos: 2, activos: 1, cancelacion_horas: 2 }])
  })

  test('cada cliente ve solo lo suyo: el otro cliente no ve la ficha ni los sellos ajenos', async () => {
    const r0 = await reservar(x.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: diaAR(2), hora: '10:00', nombre: 'Xime' })
    expect(r0.error).toBeNull()
    const r = await resumen(y.db)
    expect(r.data).toEqual([{ cliente_id: null, nombre: null, telefono: null, sellos: 0, activos: 0, cancelacion_horas: 2 }])
    // Un cliente cargado por mail (otro usuario) tampoco.
    const r2 = await resumen(m.usuarios.cliente1.db)
    expect((r2.data as { cliente_id: string | null }[])[0]!.cliente_id).not.toBe(
      (await ok(servicio().from('turnos').select('cliente_id').eq('id', r0.data!).single())).cliente_id,
    )
  })

  test('negocio suspendido: nada para el cliente (ni para su dueño, que queda bloqueado); negocio inexistente: nada', async () => {
    await cambiarNegocio(m, m.negocioA.id, { estado: 'suspendido' })
    try {
      expect((await resumen(x.db)).data).toEqual([])
      expect((await resumen(m.usuarios.duenoA.db)).data).toEqual([])
      expect((await resumen(m.usuarios.superadmin.db)).data).toHaveLength(1)
    } finally {
      await cambiarNegocio(m, m.negocioA.id, { estado: 'activo' })
    }
    expect((await resumen(x.db, '00000000-0000-0000-0000-000000000000')).data).toEqual([])
  })
})

test.describe('clientes que entran con el celular: cada uno solo lo suyo', () => {
  async function turnoDeX() {
    const r = await reservar(x.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: diaAR(4), hora: '11:00', nombre: 'Xime' })
    expect(r.error).toBeNull()
    const t = await ok(servicio().from('turnos').select('id, cliente_id').eq('id', r.data!).single())
    return t as { id: string; cliente_id: string }
  }

  test('ve sus turnos y su ficha; no los del otro', async () => {
    const t = await turnoDeX()
    expect((await ok(x.db.from('turnos').select('id'))).map((f: { id: string }) => f.id)).toEqual([t.id])
    expect((await ok(x.db.from('clientes').select('id'))).map((f: { id: string }) => f.id)).toEqual([t.cliente_id])
    esperarNada(await y.db.from('turnos').select('id').eq('id', t.id))
    esperarNada(await y.db.from('clientes').select('id').eq('id', t.cliente_id))
    // Tampoco con la consulta embebida que usa la app (turnos con servicio y profesional).
    esperarNada(await y.db.from('turnos').select('id, servicios(nombre), profesionales(nombre)').eq('negocio_id', m.negocioA.id))
  })

  test('no confirma, cancela ni edita lo ajeno', async () => {
    const t = await turnoDeX()
    esperarError(await y.db.rpc('confirmar_turno', { p_turno: t.id }), 'turno_no_confirmable')
    esperarError(await y.db.rpc('cancelar_turno', { p_turno: t.id }), 'turno_no_encontrado')
    esperarBloqueado(await y.db.from('clientes').update({ nombre: 'Hackeado' }).eq('id', t.cliente_id).select('id'))
    const ficha = await ok(servicio().from('clientes').select('nombre').eq('id', t.cliente_id).single())
    expect(ficha).toEqual({ nombre: 'Xime' })
    expect(await ok(servicio().from('turnos').select('estado').eq('id', t.id).single())).toEqual({ estado: 'pendiente' })
  })

  test('edita su nombre, pero no puede pasarse la ficha a otro usuario ni a otro negocio', async () => {
    const t = await turnoDeX()
    const r = await x.db.from('clientes').update({ nombre: 'Ximena' }).eq('id', t.cliente_id).select('nombre')
    expect(r.error).toBeNull()
    expect(r.data).toEqual([{ nombre: 'Ximena' }])
    esperarError(await x.db.from('clientes').update({ user_id: y.id }).eq('id', t.cliente_id).select('id'))
    esperarError(await x.db.from('clientes').update({ negocio_id: m.negocioB.id }).eq('id', t.cliente_id).select('id'))
    // Ni crearse fichas a mano (solo nace al reservar).
    esperarError(await x.db.from('clientes').insert({ negocio_id: m.negocioB.id, user_id: x.id, nombre: 'Otra' }))
  })

  test('no ve los códigos de ingreso (ni el suyo ni los ajenos)', async () => {
    await ok(servicio().from('mensajes').insert({ tipo: 'codigo', destino: x.tel.slice(1), contenido: { codigo: '123456' } }).select('id'))
    try {
      esperarNada(await x.db.from('mensajes').select('id').eq('destino', x.tel.slice(1)))
      esperarNada(await y.db.from('mensajes').select('id').eq('tipo', 'codigo'))
    } finally {
      await servicio().from('mensajes').delete().eq('destino', x.tel.slice(1))
    }
  })
})
