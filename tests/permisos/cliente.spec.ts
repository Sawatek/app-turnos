// Permisos del CLIENTE (usuario logueado que reserva desde la app).
import { expect, test } from '@playwright/test'
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import {
  cambiarNegocio,
  clienteDe,
  crearCliente,
  crearTurno,
  dentroDe,
  esperarBloqueado,
  esperarError,
  esperarNada,
  leer,
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

const D = () => diaAR(2)

/** Reserva y devuelve el id del turno (falla si no puede). */
async function reservarOk(quien: 'cliente1' | 'cliente2', p: Partial<Parameters<typeof reservar>[1]> & { hora: string }) {
  const r = await reservar(m.usuarios[quien].db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D(), ...p })
  expect(r.error, JSON.stringify(r.error)).toBeNull()
  return r.data!
}

/** Garantiza que el usuario tenga su fila de cliente en el negocio y devuelve el id. */
async function asegurarCliente(negocio: string, quien: 'cliente1' | 'cliente2') {
  const u = m.usuarios[quien]
  return (await clienteDe(negocio, u.id)) ?? (await crearCliente(negocio, quien, u.id))
}

test.describe('cliente: reservar', () => {
  test('reserva con reservar_turno y se crea su fila de cliente', async () => {
    const id = await reservarOk('cliente1', { hora: '10:00', nombre: '  Cliente Uno  ' })
    const t = await leer<{ estado: string; origen: string; cliente_id: string; inicio: string; fin: string }>('turnos', id)
    expect(t.estado).toBe('pendiente')
    expect(t.origen).toBe('app')
    expect(new Date(t.fin).getTime() - new Date(t.inicio).getTime()).toBe(30 * 60_000)
    const cli = await leer<{ user_id: string; negocio_id: string; nombre: string }>('clientes', t.cliente_id)
    expect(cli).toMatchObject({ user_id: m.usuarios.cliente1.id, negocio_id: m.negocioA.id, nombre: 'Cliente Uno' })
    // Y el cliente ve su turno.
    const propios = await ok(m.usuarios.cliente1.db.from('turnos').select('id'))
    expect(propios.map((x) => x.id)).toEqual([id])
  })

  test('la primera vez sin nombre da falta_nombre (y no crea nada)', async () => {
    const db = m.usuarios.cliente1.db
    expect(await clienteDe(m.negocioB.id, m.usuarios.cliente1.id)).toBeNull()
    const sin = await reservar(db, { negocio: m.negocioB.id, servicio: m.servicios.corteB, dia: D(), hora: '10:00', nombre: null })
    esperarError(sin, 'falta_nombre')
    const blanco = await reservar(db, { negocio: m.negocioB.id, servicio: m.servicios.corteB, dia: D(), hora: '10:00', nombre: '   ' })
    esperarError(blanco, 'falta_nombre')
    expect(await clienteDe(m.negocioB.id, m.usuarios.cliente1.id)).toBeNull()
    // Con nombre sí; y la segunda vez ya no hace falta.
    const con = await reservar(db, { negocio: m.negocioB.id, servicio: m.servicios.corteB, dia: D(), hora: '10:00', nombre: 'Uno' })
    expect(con.error).toBeNull()
    const otra = await reservar(db, { negocio: m.negocioB.id, servicio: m.servicios.corteB, dia: D(), hora: '11:00', nombre: null })
    expect(otra.error).toBeNull()
  })

  test('no reserva en el pasado', async () => {
    esperarError(await reservar(m.usuarios.cliente1.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: diaAR(-1), hora: '10:00' }), 'horario_no_disponible')
  })

  test('no reserva fuera de horario: descanso de P1 (13:15) ni a las 22:00', async () => {
    const db = m.usuarios.cliente1.db
    const base = { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D() }
    esperarError(await reservar(db, { ...base, hora: '13:15', profesional: m.profesionales.p1 }), 'horario_no_disponible')
    esperarError(await reservar(db, { ...base, hora: '22:00' }), 'horario_no_disponible')
    esperarError(await reservar(db, { ...base, hora: '08:30' }), 'horario_no_disponible')
    // Un horario que no cae en la grilla de 15 minutos tampoco.
    esperarError(await reservar(db, { ...base, hora: '10:07' }), 'horario_no_disponible')
    // A las 13:15 con "cualquiera" sí: la toma P2, que no descansa.
    const r = await reservar(db, { ...base, hora: '13:15' })
    expect(r.error).toBeNull()
    expect(await leer('turnos', r.data!, 'profesional_id')).toEqual({ profesional_id: m.profesionales.p2 })
  })

  test('no reserva sobre un bloqueo', async () => {
    await ok(
      servicio().from('bloqueos').insert({
        negocio_id: m.negocioA.id, profesional_id: m.profesionales.p1, rango: rango(aISO(D(), '10:00'), aISO(D(), '12:00')),
      }),
    )
    const db = m.usuarios.cliente1.db
    esperarError(await reservar(db, { hora: '10:30', profesional: m.profesionales.p1, negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D() }), 'horario_no_disponible')
    // Un turno que empieza antes pero se mete en el bloqueo, tampoco.
    esperarError(await reservar(db, { hora: '09:45', profesional: m.profesionales.p1, negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D() }), 'horario_no_disponible')
    // Bloqueo de todo el negocio: nadie atiende.
    await ok(servicio().from('bloqueos').insert({ negocio_id: m.negocioA.id, rango: rango(aISO(D(), '16:00'), aISO(D(), '17:00')) }))
    esperarError(await reservar(db, { hora: '16:00', negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D() }), 'horario_no_disponible')
  })

  test('no reserva un servicio que el profesional no hace (color con P2)', async () => {
    const db = m.usuarios.cliente1.db
    const base = { negocio: m.negocioA.id, servicio: m.servicios.colorA, dia: D(), hora: '10:00' }
    esperarError(await reservar(db, { ...base, profesional: m.profesionales.p2 }), 'horario_no_disponible')
    // Sin elegir profesional, color lo hace P1.
    const r = await reservar(db, base)
    expect(r.error).toBeNull()
    expect(await leer('turnos', r.data!, 'profesional_id')).toEqual({ profesional_id: m.profesionales.p1 })
  })

  test('no reserva un servicio de otro negocio', async () => {
    const r = await reservar(m.usuarios.cliente1.db, { negocio: m.negocioA.id, servicio: m.servicios.corteB, dia: D(), hora: '10:00' })
    esperarError(r, 'servicio_no_disponible')
  })

  test('máximo 3 turnos activos a futuro (demasiados_turnos)', async () => {
    const t1 = await reservarOk('cliente1', { hora: '10:00' })
    await reservarOk('cliente1', { hora: '11:00' })
    await reservarOk('cliente1', { hora: '12:00' })
    const cuarto = await reservar(m.usuarios.cliente1.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D(), hora: '15:00' })
    esperarError(cuarto, 'demasiados_turnos')
    // Otro cliente no se ve afectado.
    await reservarOk('cliente2', { hora: '15:00' })
    // Si cancela uno, puede volver a reservar.
    expect((await m.usuarios.cliente1.db.rpc('cancelar_turno', { p_turno: t1 })).error).toBeNull()
    await reservarOk('cliente1', { hora: '16:00' })
  })

  test('no puede reservar en un negocio suspendido ni en una demo', async () => {
    const db = m.usuarios.cliente2.db
    const base = { negocio: m.negocioB.id, servicio: m.servicios.corteB, dia: D(), hora: '10:00' }
    await cambiarNegocio(m, m.negocioB.id, { estado: 'suspendido' })
    try {
      esperarError(await reservar(db, base), 'negocio_no_disponible')
    } finally {
      await cambiarNegocio(m, m.negocioB.id, { estado: 'activo' })
    }
    await cambiarNegocio(m, m.negocioB.id, { es_demo: true })
    try {
      esperarError(await reservar(db, base), 'negocio_no_disponible')
    } finally {
      await cambiarNegocio(m, m.negocioB.id, { es_demo: false })
    }
    esperarNada(await servicio().from('turnos').select('id').eq('negocio_id', m.negocioB.id))
  })
})

test.describe('cliente: qué ve', () => {
  test('ve solo SUS turnos y su propia fila de cliente', async () => {
    const mio = await reservarOk('cliente1', { hora: '10:00', nombre: 'Uno' })
    const ajenoA = await reservarOk('cliente2', { hora: '11:00', nombre: 'Dos' })
    const ajenoB = (await reservar(m.usuarios.cliente2.db, { negocio: m.negocioB.id, servicio: m.servicios.corteB, dia: D(), hora: '10:00', nombre: 'Dos' })).data!
    expect(ajenoB).toBeTruthy()

    const db = m.usuarios.cliente1.db
    const turnos = await ok(db.from('turnos').select('id, cliente_id'))
    expect(turnos.map((t) => t.id)).toEqual([mio])
    esperarNada(await db.from('turnos').select('id').in('id', [ajenoA, ajenoB]))

    const clientes = await ok(db.from('clientes').select('id, user_id, negocio_id'))
    expect(clientes.length).toBeGreaterThan(0)
    expect(clientes.every((c) => c.user_id === m.usuarios.cliente1.id)).toBe(true)
    esperarNada(await db.from('clientes').select('id').eq('user_id', m.usuarios.cliente2.id))
    esperarNada(await db.from('clientes').select('id').eq('negocio_id', m.negocioB.id).neq('user_id', m.usuarios.cliente1.id))
  })

  test('no ve miembros, bloqueos ni superadmins', async () => {
    await ok(servicio().from('bloqueos').insert({ negocio_id: m.negocioA.id, rango: rango(aISO(D(), '16:00'), aISO(D(), '17:00')), motivo: 'Feriado' }))
    const db = m.usuarios.cliente1.db
    esperarNada(await db.from('miembros').select('*'))
    esperarNada(await db.from('bloqueos').select('*'))
    esperarNada(await db.from('superadmins').select('*'))
  })

  test('puede editar su nombre y teléfono, pero no los datos de otro cliente', async () => {
    await reservarOk('cliente2', { hora: '11:00', nombre: 'Dos' })
    const mio = await asegurarCliente(m.negocioA.id, 'cliente1')
    const ajeno = (await clienteDe(m.negocioA.id, m.usuarios.cliente2.id))!
    const nombreAjeno = await leer('clientes', ajeno, 'nombre')
    const db = m.usuarios.cliente1.db
    const r = await db.from('clientes').update({ nombre: 'Uno Editado', telefono: '11 1234-5678' }).eq('id', mio).select('id')
    expect(r.error).toBeNull()
    expect(r.data).toHaveLength(1)
    esperarBloqueado(await db.from('clientes').update({ nombre: 'Hackeado' }).eq('id', ajeno).select('id'))
    expect(await leer('clientes', ajeno, 'nombre')).toEqual(nombreAjeno)
    // Tampoco puede "adueñarse" de la fila de otro poniéndole su usuario.
    esperarBloqueado(await db.from('clientes').update({ user_id: m.usuarios.cliente1.id }).eq('id', ajeno).select('id'))
    expect(await leer('clientes', ajeno, 'user_id')).toEqual({ user_id: m.usuarios.cliente2.id })
    // Ni crear clientes.
    esperarError(await db.from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Trucho' }))
  })

  test('no puede mover su fila de cliente a otro negocio', async () => {
    // Corregido (lo encontró este test): la regla "Editar clientes" deja al cliente cambiar cualquier columna de su fila, incluida negocio_id
    // (el with check solo pide user_id = auth.uid()). Así un cliente se mete solo en la lista de clientes de
    // cualquier negocio (incluso uno suspendido o una demo) sin haber reservado nunca. Ver informe.
    const mio = await asegurarCliente(m.negocioA.id, 'cliente1')
    await ok(servicio().from('clientes').delete().eq('negocio_id', m.negocioB.id).eq('user_id', m.usuarios.cliente1.id))
    esperarBloqueado(await m.usuarios.cliente1.db.from('clientes').update({ negocio_id: m.negocioB.id }).eq('id', mio).select('id'))
    expect(await leer('clientes', mio, 'negocio_id')).toEqual({ negocio_id: m.negocioA.id })
  })
})

test.describe('cliente: tocar turnos', () => {
  test('no puede insertar turnos directo (tiene que usar reservar_turno)', async () => {
    const cli = await asegurarCliente(m.negocioA.id, 'cliente1')
    const r = await m.usuarios.cliente1.db.from('turnos').insert({
      negocio_id: m.negocioA.id, cliente_id: cli, profesional_id: m.profesionales.p1, servicio_id: m.servicios.corteA,
      inicio: aISO(D(), '10:00'), fin: aISO(D(), '10:30'),
    })
    esperarError(r)
    esperarNada(await servicio().from('turnos').select('id').eq('cliente_id', cli))
  })

  test('no puede actualizar ni borrar turnos directo (ni los suyos)', async () => {
    const mio = await reservarOk('cliente1', { hora: '10:00', nombre: 'Uno' })
    const ajeno = await reservarOk('cliente2', { hora: '11:00', nombre: 'Dos' })
    const db = m.usuarios.cliente1.db
    const antes = await leer('turnos', mio, 'estado, inicio, sena, profesional_id')
    esperarBloqueado(await db.from('turnos').update({ estado: 'confirmado' }).eq('id', mio).select('id'))
    esperarBloqueado(await db.from('turnos').update({ inicio: aISO(D(), '09:00'), fin: aISO(D(), '09:30') }).eq('id', mio).select('id'))
    esperarBloqueado(await db.from('turnos').update({ estado: 'cancelado' }).eq('id', ajeno).select('id'))
    esperarBloqueado(await db.from('turnos').delete().in('id', [mio, ajeno]).select('id'))
    expect(await leer('turnos', mio, 'estado, inicio, sena, profesional_id')).toEqual(antes)
    expect(await leer('turnos', ajeno, 'estado')).toEqual({ estado: 'pendiente' })
  })

  test('confirmar_turno y cancelar_turno funcionan sobre los suyos', async () => {
    const db = m.usuarios.cliente1.db
    const t1 = await reservarOk('cliente1', { hora: '10:00', nombre: 'Uno' })
    const t2 = await reservarOk('cliente1', { hora: '11:00' })
    expect((await db.rpc('confirmar_turno', { p_turno: t1 })).error).toBeNull()
    expect(await leer('turnos', t1, 'estado')).toEqual({ estado: 'confirmado' })
    // Confirmar dos veces no se puede (ya no está pendiente).
    esperarError(await db.rpc('confirmar_turno', { p_turno: t1 }), 'turno_no_confirmable')
    // Se puede cancelar uno confirmado y uno pendiente.
    expect((await db.rpc('cancelar_turno', { p_turno: t1 })).error).toBeNull()
    expect((await db.rpc('cancelar_turno', { p_turno: t2 })).error).toBeNull()
    expect(await leer('turnos', t1, 'estado')).toEqual({ estado: 'cancelado' })
    expect(await leer('turnos', t2, 'estado')).toEqual({ estado: 'cancelado' })
    // Ya cancelado no se vuelve a cancelar.
    esperarError(await db.rpc('cancelar_turno', { p_turno: t1 }), 'turno_no_cancelable')
  })

  test('confirmar_turno y cancelar_turno NO funcionan sobre turnos de otro', async () => {
    const ajeno = await reservarOk('cliente2', { hora: '11:00', nombre: 'Dos' })
    const db = m.usuarios.cliente1.db
    esperarError(await db.rpc('confirmar_turno', { p_turno: ajeno }), 'turno_no_confirmable')
    esperarError(await db.rpc('cancelar_turno', { p_turno: ajeno }), 'turno_no_encontrado')
    expect(await leer('turnos', ajeno, 'estado')).toEqual({ estado: 'pendiente' })
  })

  test('no puede cancelar fuera de plazo (turno dentro de 1 hora) ni un turno pasado', async () => {
    const cli = await asegurarCliente(m.negocioA.id, 'cliente1')
    const pronto = await crearTurno({ negocio: m.negocioA.id, cliente: cli, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: dentroDe(60) })
    const pasado = await crearTurno({ negocio: m.negocioA.id, cliente: cli, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: dentroDe(-180) })
    const db = m.usuarios.cliente1.db
    esperarError(await db.rpc('cancelar_turno', { p_turno: pronto }), 'fuera_de_plazo')
    esperarError(await db.rpc('cancelar_turno', { p_turno: pasado }), 'turno_no_cancelable')
    esperarError(await db.rpc('confirmar_turno', { p_turno: pasado }), 'turno_no_confirmable')
    expect(await leer('turnos', pronto, 'estado')).toEqual({ estado: 'pendiente' })
    expect(await leer('turnos', pasado, 'estado')).toEqual({ estado: 'pendiente' })
    // Confirmar uno próximo sí se puede.
    expect((await db.rpc('confirmar_turno', { p_turno: pronto })).error).toBeNull()
  })
})
