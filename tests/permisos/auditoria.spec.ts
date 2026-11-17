// Regresiones de la auditoría de seguridad (17/11/2026): destino de WhatsApp verificado,
// tope de cancelaciones, enfriamiento de la lista de espera y push de un solo usuario por navegador.
// (Miembros solo por invitación está en dueno.spec.ts.)
import { expect, test } from '@playwright/test'
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { crearClienteCelular, type ClienteCelular } from '../e2e/cliente-real/ayuda'
import { crearCliente, crearTurno, esperarError, ok, vaciarAgenda } from './ayuda'

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
  const adm = servicio()
  await adm.from('mensajes').delete().in('negocio_id', [m.negocioA.id, m.negocioB.id])
  await adm.from('clientes').delete().in('negocio_id', [m.negocioA.id, m.negocioB.id])
  await adm.from('push_suscripciones').delete().in('negocio_id', [m.negocioA.id, m.negocioB.id])
})

const turnoA = (cliente: string, dia: string, hora: string) =>
  crearTurno({ negocio: m.negocioA.id, cliente, profesional: m.profesionales.p1, servicio: m.servicios.corteA, inicio: aISO(dia, hora) })
const whatsappsDe = async (negocio: string) =>
  (await ok(servicio().from('mensajes').select('tipo, destino, cliente_id').eq('negocio_id', negocio).eq('canal', 'whatsapp'))) as {
    tipo: string
    destino: string
    cliente_id: string
  }[]

test.describe('destino de WhatsApp', () => {
  test('una cuenta sin celular verificado no elige a qué número salen los mensajes', async () => {
    // cliente1 es una cuenta de mail: reserva escribiendo un teléfono cualquiera.
    const r = await m.usuarios.cliente1.db.rpc('reservar_turno', {
      p_negocio: m.negocioA.id,
      p_servicio: m.servicios.corteA,
      p_inicio: aISO(diaAR(3), '10:00'),
      p_profesional: m.profesionales.p1,
      p_nombre: 'Cuenta de mail',
      p_telefono: '11 5555-1234',
    })
    expect(r.error).toBeNull()
    expect(await whatsappsDe(m.negocioA.id)).toEqual([])
  })

  test('si el staff le edita el teléfono a una ficha con cuenta, los mensajes siguen yendo al celular verificado', async () => {
    const xa = await crearCliente(m.negocioA.id, 'Xime', x.id)
    await ok(m.usuarios.duenoA.db.from('clientes').update({ telefono: '11 4444-0000' }).eq('id', xa).select('id'))
    await turnoA(xa, diaAR(3), '11:00')
    const filas = await whatsappsDe(m.negocioA.id)
    expect(filas.length).toBeGreaterThan(0)
    expect(new Set(filas.map((f) => f.destino))).toEqual(new Set([x.tel.slice(1)]))
  })

  test('una ficha cargada por el staff (sin cuenta) usa el teléfono de la ficha', async () => {
    const sinCuenta = (await ok(
      servicio().from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Sin cuenta', telefono: '11 3333-2222' }).select('id').single(),
    )) as { id: string }
    await turnoA(sinCuenta.id, diaAR(3), '12:00')
    expect(new Set((await whatsappsDe(m.negocioA.id)).map((f) => f.destino))).toEqual(new Set(['5491133332222']))
  })
})

test.describe('tope de cancelaciones', () => {
  test('el cliente cancela hasta 3 turnos por día en un negocio; el 4.º falla', async () => {
    const xa = await crearCliente(m.negocioA.id, 'Xime', x.id)
    const turnos = []
    for (const hora of ['10:00', '10:30', '11:00', '11:30']) turnos.push(await turnoA(xa, diaAR(3), hora))
    for (const t of turnos.slice(0, 3)) await ok(x.db.rpc('cancelar_turno', { p_turno: t }))
    esperarError(await x.db.rpc('cancelar_turno', { p_turno: turnos[3]! }), 'demasiadas_cancelaciones')
    const cuarto = await ok(servicio().from('turnos').select('estado').eq('id', turnos[3]!).single())
    expect(cuarto.estado).toBe('pendiente')
  })
})

test.describe('lista de espera', () => {
  test('a quien ya se le avisó, no se le vuelve a avisar enseguida (aunque se cancelen varios turnos)', async () => {
    const D = diaAR(3)
    await ok(y.db.rpc('anotarme_lista_espera', { p_negocio: m.negocioA.id, p_servicio: m.servicios.corteA, p_dia: D, p_nombre: 'Yago' }))
    const xa = await crearCliente(m.negocioA.id, 'Xime', x.id)
    for (const hora of ['10:00', '10:30']) await ok(x.db.rpc('cancelar_turno', { p_turno: await turnoA(xa, D, hora) }))
    const avisos = (await whatsappsDe(m.negocioA.id)).filter((f) => f.tipo === 'aviso')
    expect(avisos).toHaveLength(1)
    expect(avisos[0]!.destino).toBe(y.tel.slice(1))
  })
})

test.describe('push', () => {
  const claves = {
    p_p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
    p_auth: 'tBHItJI5svbpez7KI4CCXg',
  }
  test('si otra cuenta registra el mismo navegador, la anterior deja de recibir sus avisos (en cualquier negocio)', async () => {
    const sus = { p_endpoint: `https://fcm.googleapis.com/fcm/send/auditoria-${m.sufijo}`, ...claves }
    await ok(x.db.rpc('guardar_push', { p_negocio: m.negocioA.id, ...sus }))
    await ok(y.db.rpc('guardar_push', { p_negocio: m.negocioB.id, ...sus }))
    const filas = await ok(servicio().from('push_suscripciones').select('user_id, negocio_id').eq('endpoint', sus.p_endpoint))
    expect(filas).toEqual([{ user_id: y.id, negocio_id: m.negocioB.id }])
  })

  test('al salir, el cliente puede borrar las suscripciones de su navegador', async () => {
    const endpoint = `https://fcm.googleapis.com/fcm/send/salir-${m.sufijo}`
    await ok(x.db.rpc('guardar_push', { p_negocio: m.negocioA.id, p_endpoint: endpoint, ...claves }))
    expect(await ok(x.db.from('push_suscripciones').delete().eq('endpoint', endpoint).select('id'))).toHaveLength(1)
    expect(await ok(servicio().from('push_suscripciones').select('id').eq('endpoint', endpoint))).toEqual([])
  })
})
