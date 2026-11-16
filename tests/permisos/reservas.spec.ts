// Reservas: concurrencia, cálculo de horarios libres y la garantía de "nunca dos turnos superpuestos".
import { expect, test } from '@playwright/test'
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import {
  cambiarNegocio,
  contieneHora,
  esperarError,
  libres,
  ok,
  rango,
  reservar,
  vaciarAgenda,
} from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  await limpiarMundo(m)
})
test.beforeEach(async () => {
  await vaciarAgenda(m)
})

const D = () => diaAR(3)
const corte = (hora: string, extra: { profesional?: string; dia?: string } = {}) => ({
  negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: extra.dia ?? D(), hora, profesional: extra.profesional,
})
const turnosActivos = async (filtro: { inicio?: string; profesional?: string } = {}) => {
  let q = servicio().from('turnos').select('id, profesional_id, cliente_id').eq('negocio_id', m.negocioA.id).neq('estado', 'cancelado')
  if (filtro.inicio) q = q.eq('inicio', filtro.inicio)
  if (filtro.profesional) q = q.eq('profesional_id', filtro.profesional)
  return ok(q)
}

test.describe('reservas en paralelo', () => {
  test('dos clientes, mismo horario y mismo profesional a la vez: gana exactamente uno', async () => {
    // Se repite varias veces para que la carrera ocurra de verdad.
    for (let i = 0; i < 6; i++) {
      await vaciarAgenda(m)
      const [r1, r2] = await Promise.all([
        reservar(m.usuarios.cliente1.db, corte('10:00', { profesional: m.profesionales.p1 })),
        reservar(m.usuarios.cliente2.db, corte('10:00', { profesional: m.profesionales.p1 })),
      ])
      expect([r1, r2].filter((r) => r.error === null), `vuelta ${i}`).toHaveLength(1)
      expect(await turnosActivos({ inicio: aISO(D(), '10:00') })).toHaveLength(1)
    }
  })

  test('con "cualquiera" a la vez: el segundo queda con el otro profesional', async () => {
    let ambos = 0
    for (let i = 0; i < 6; i++) {
      await vaciarAgenda(m)
      const rs = await Promise.all([reservar(m.usuarios.cliente1.db, corte('11:00')), reservar(m.usuarios.cliente2.db, corte('11:00'))])
      const filas = await turnosActivos({ inicio: aISO(D(), '11:00') })
      // Nunca dos turnos con el mismo profesional.
      expect(new Set(filas.map((f) => f.profesional_id)).size).toBe(filas.length)
      expect(filas.length).toBe(rs.filter((r) => r.error === null).length)
      if (filas.length === 2) {
        ambos++
        expect(filas.map((f) => f.profesional_id).sort()).toEqual([m.profesionales.p1, m.profesionales.p2].sort())
      }
    }
    expect(ambos).toBeGreaterThan(0)
    // Un tercero a la misma hora ya no tiene lugar (si quedaron los dos ocupados).
    await vaciarAgenda(m)
    expect((await reservar(m.usuarios.cliente1.db, corte('11:00'))).error).toBeNull()
    expect((await reservar(m.usuarios.cliente2.db, corte('11:00'))).error).toBeNull()
    esperarError(await reservar(m.usuarios.duenoB.db, corte('11:00')), 'horario_no_disponible')
  })

  test('reservas simultáneas: nunca devuelven "deadlock detected" (el que pierde recibe horario_no_disponible o el otro profesional)', async () => {
    // Corregido (lo encontró este test): dos inserts que chocan en el exclusion constraint al mismo tiempo pueden trabarse entre sí
    // (cada uno espera al otro) y Postgres aborta uno con 40P01 "deadlock detected" después de ~1 s.
    // reservar_turno solo atrapa exclusion_violation, así que ese error le llega crudo al cliente y, con
    // "cualquiera", no se le asigna el otro profesional aunque esté libre. Pasa en ~10–30 % de las carreras.
    test.setTimeout(90_000)
    // Cuatro usuarios distintos a la vez sobre el mismo horario con "cualquiera": lo correcto es que dos
    // queden (uno con P1 y otro con P2) y los otros dos reciban horario_no_disponible.
    const quienes = [m.usuarios.cliente1, m.usuarios.cliente2, m.usuarios.duenoB, m.usuarios.superadmin]
    const errores: string[] = []
    for (let i = 0; i < 60 && errores.length === 0; i++) {
      await vaciarAgenda(m)
      const rs = await Promise.all(quienes.map((u) => reservar(u.db, corte('15:00'))))
      for (const r of rs) if (r.error && !r.error.message.includes('horario_no_disponible')) errores.push(r.error.message)
      if (errores.length === 0) expect(rs.filter((r) => r.error === null)).toHaveLength(2)
    }
    expect(errores).toEqual([])
  })

  test('el límite de 3 turnos activos se respeta aunque reserve varias veces a la vez', async () => {
    // Corregido (lo encontró este test): reservar_turno cuenta los turnos activos y recién después inserta, sin ningún bloqueo en el medio.
    // Si el mismo cliente manda varias reservas a la vez, todas cuentan "1 turno" y pasan: termina con 9.
    const db = m.usuarios.cliente1.db
    expect((await reservar(db, corte('09:00'))).error).toBeNull() // crea la fila de cliente
    const horas = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30']
    await Promise.all(horas.map((h) => reservar(db, corte(h, { profesional: m.profesionales.p2 }))))
    expect(await turnosActivos()).not.toHaveLength(0)
    expect((await turnosActivos()).length).toBeLessThanOrEqual(3)
  })
})

test.describe('horarios_libres', () => {
  test('deja de ofrecer los horarios ocupados (y vuelve a ofrecerlos si se cancela)', async () => {
    const r = await reservar(m.usuarios.cliente1.db, corte('10:00', { profesional: m.profesionales.p1 }))
    expect(r.error).toBeNull()
    const db = m.usuarios.cliente2.db
    const deP1 = await libres(db, m.negocioA.id, m.servicios.corteA, D(), m.profesionales.p1)
    for (const h of ['09:45', '10:00', '10:15']) expect(contieneHora(deP1, aISO(D(), h)), h).toBe(false)
    for (const h of ['09:30', '10:30']) expect(contieneHora(deP1, aISO(D(), h)), h).toBe(true)
    // Color (60 min) con P1: 09:00–10:00 entra justo; 09:15 ya se superpone.
    const colorP1 = await libres(db, m.negocioA.id, m.servicios.colorA, D(), m.profesionales.p1)
    expect(contieneHora(colorP1, aISO(D(), '09:00'))).toBe(true)
    expect(contieneHora(colorP1, aISO(D(), '09:15'))).toBe(false)
    // Con "cualquiera", las 10:00 se siguen ofreciendo, pero con P2.
    const todos = await libres(db, m.negocioA.id, m.servicios.corteA, D())
    expect(todos.find((l) => new Date(l.inicio).getTime() === new Date(aISO(D(), '10:00')).getTime())?.profesional_id).toBe(m.profesionales.p2)
    // Cancelado, vuelve a estar libre.
    expect((await m.usuarios.cliente1.db.rpc('cancelar_turno', { p_turno: r.data })).error).toBeNull()
    const otraVez = await libres(db, m.negocioA.id, m.servicios.corteA, D(), m.profesionales.p1)
    expect(contieneHora(otraVez, aISO(D(), '10:00'))).toBe(true)
  })

  test('respeta el descanso de P1 (13 a 14) y el cierre (20:00)', async () => {
    const db = m.usuarios.cliente1.db
    const corteP1 = await libres(db, m.negocioA.id, m.servicios.corteA, D(), m.profesionales.p1)
    for (const h of ['09:00', '12:30', '14:00', '19:30']) expect(contieneHora(corteP1, aISO(D(), h)), h).toBe(true)
    for (const h of ['12:45', '13:00', '13:15', '13:45', '19:45', '20:00']) expect(contieneHora(corteP1, aISO(D(), h)), h).toBe(false)
    const colorP1 = await libres(db, m.negocioA.id, m.servicios.colorA, D(), m.profesionales.p1)
    expect(contieneHora(colorP1, aISO(D(), '12:00'))).toBe(true)
    expect(contieneHora(colorP1, aISO(D(), '12:15'))).toBe(false)
    expect(contieneHora(colorP1, aISO(D(), '19:00'))).toBe(true)
    expect(contieneHora(colorP1, aISO(D(), '19:15'))).toBe(false)
    // P2 no descansa: 13:15 sí está.
    const corteP2 = await libres(db, m.negocioA.id, m.servicios.corteA, D(), m.profesionales.p2)
    expect(contieneHora(corteP2, aISO(D(), '13:15'))).toBe(true)
    // Y P2 no hace color: no tiene horarios para ese servicio.
    expect(await libres(db, m.negocioA.id, m.servicios.colorA, D(), m.profesionales.p2)).toEqual([])
  })

  test('respeta la anticipación mínima del negocio', async () => {
    // Hoy: nada que empiece antes de ahora + 30 min (puede estar vacío si ya es tarde).
    const hoy = await libres(m.usuarios.cliente1.db, m.negocioA.id, m.servicios.corteA, diaAR(0))
    const limite = Date.now() + 30 * 60_000 - 5_000
    expect(hoy.every((l) => new Date(l.inicio).getTime() >= limite)).toBe(true)
    // Con 3 días de anticipación, mañana ya no se ofrece nada y no se puede reservar.
    await ok(servicio().from('negocios').update({ anticipacion_min: 3 * 24 * 60 }).eq('id', m.negocioA.id))
    try {
      expect(await libres(m.usuarios.cliente1.db, m.negocioA.id, m.servicios.corteA, diaAR(1))).toEqual([])
      expect((await libres(m.usuarios.cliente1.db, m.negocioA.id, m.servicios.corteA, diaAR(5))).length).toBeGreaterThan(10)
      esperarError(await reservar(m.usuarios.cliente1.db, corte('10:00', { dia: diaAR(1) })), 'horario_no_disponible')
    } finally {
      await ok(servicio().from('negocios').update({ anticipacion_min: 30 }).eq('id', m.negocioA.id))
    }
  })

  test('respeta los bloqueos (del profesional y de todo el negocio)', async () => {
    const adm = servicio()
    await ok(adm.from('bloqueos').insert({ negocio_id: m.negocioA.id, profesional_id: m.profesionales.p1, rango: rango(aISO(D(), '10:00'), aISO(D(), '12:00')) }))
    const db = m.usuarios.cliente1.db
    const deP1 = await libres(db, m.negocioA.id, m.servicios.corteA, D(), m.profesionales.p1)
    for (const h of ['09:45', '10:00', '11:00', '11:45']) expect(contieneHora(deP1, aISO(D(), h)), h).toBe(false)
    for (const h of ['09:30', '12:00']) expect(contieneHora(deP1, aISO(D(), h)), h).toBe(true)
    // El bloqueo de P1 no afecta a P2.
    const deP2 = await libres(db, m.negocioA.id, m.servicios.corteA, D(), m.profesionales.p2)
    expect(contieneHora(deP2, aISO(D(), '10:00'))).toBe(true)
    // Cierre de todo el negocio ese día: no queda nada.
    await ok(adm.from('bloqueos').insert({ negocio_id: m.negocioA.id, rango: rango(aISO(D(), '00:00'), aISO(diaAR(4), '00:00')), motivo: 'Feriado' }))
    expect(await libres(db, m.negocioA.id, m.servicios.corteA, D())).toEqual([])
    // Un bloqueo de A no toca a B.
    expect((await libres(db, m.negocioB.id, m.servicios.corteB, D())).length).toBeGreaterThan(10)
  })

  test('no ofrece nada para una demo, ni mezclando negocios', async () => {
    const db = m.usuarios.cliente1.db
    // Servicio o profesional de otro negocio.
    expect(await libres(db, m.negocioA.id, m.servicios.corteB, D())).toEqual([])
    expect(await libres(db, m.negocioA.id, m.servicios.corteA, D(), m.profesionales.pB)).toEqual([])
    await cambiarNegocio(m, m.negocioB.id, { es_demo: true })
    try {
      expect(await libres(db, m.negocioB.id, m.servicios.corteB, D())).toEqual([])
    } finally {
      await cambiarNegocio(m, m.negocioB.id, { es_demo: false })
    }
  })
})

test.describe('no superposición en la base', () => {
  test('el constraint también frena inserts directos del dueño', async () => {
    const db = m.usuarios.duenoA.db
    const cli = (await ok(db.from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Manual' }).select('id').single())).id
    const turno = (desde: string, hasta: string, estado = 'pendiente') => ({
      negocio_id: m.negocioA.id, cliente_id: cli, profesional_id: m.profesionales.p2, servicio_id: m.servicios.corteA,
      inicio: aISO(D(), desde), fin: aISO(D(), hasta), origen: 'manual', estado,
    })
    expect((await db.from('turnos').insert(turno('10:00', '10:30'))).error).toBeNull()
    const pisado = await db.from('turnos').insert(turno('10:15', '10:45'))
    esperarError(pisado)
    expect(pisado.error!.code).toBe('23P01') // exclusion_violation
    // Pegado (10:30–11:00) sí entra; uno cancelado encima, también.
    expect((await db.from('turnos').insert(turno('10:30', '11:00'))).error).toBeNull()
    expect((await db.from('turnos').insert(turno('10:00', '10:30', 'cancelado'))).error).toBeNull()
    // Y el dueño no puede "descancelar" uno encima de otro.
    const [cancelado] = await ok(servicio().from('turnos').select('id').eq('cliente_id', cli).eq('estado', 'cancelado'))
    esperarError(await db.from('turnos').update({ estado: 'pendiente' }).eq('id', cancelado!.id))
    expect(await turnosActivos({ profesional: m.profesionales.p2 })).toHaveLength(2)
  })

  test('y le gana a reservar_turno: el cliente no puede reservar sobre un turno manual', async () => {
    const db = m.usuarios.duenoA.db
    const cli = (await ok(db.from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Manual 2' }).select('id').single())).id
    expect(
      (await db.from('turnos').insert({
        negocio_id: m.negocioA.id, cliente_id: cli, profesional_id: m.profesionales.p1, servicio_id: m.servicios.colorA,
        inicio: aISO(D(), '15:00'), fin: aISO(D(), '16:00'), origen: 'manual',
      })).error,
    ).toBeNull()
    esperarError(await reservar(m.usuarios.cliente1.db, corte('15:30', { profesional: m.profesionales.p1 })), 'horario_no_disponible')
  })
})
